const mysql = require("mysql2");
const axios = require("axios");

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pokedex"
};

const POKEMON_LIMIT = Number(process.env.POKEDEX_POKEMON_LIMIT || 300);
const SHOULD_SKIP_IF_NOT_EMPTY = process.argv.includes("--if-empty");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createConnection() {
  return mysql.createConnection(DB_CONFIG);
}

function query(connection, sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

async function waitForDatabase(maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const connection = createConnection();
    try {
      await query(connection, "SELECT 1 FROM pokemon LIMIT 1");
      connection.end();
      return;
    } catch (error) {
      connection.end();
      if (attempt === maxAttempts) {
        throw error;
      }
      console.log(`DB not ready (attempt ${attempt}/${maxAttempts}), retrying...`);
      await delay(2000);
    }
  }
}

async function getFromAPI(limit) {
  const requests = [];
  for (let i = 1; i <= limit; i += 1) {
    requests.push(axios.get(`https://pokeapi.co/api/v2/pokemon/${i}`));
  }

  const responses = await Promise.all(requests);
  return responses.map((response) => response.data).map((data) => ({
    id: data.id,
    name: data.name,
    types: data.types.map((type) => type.type.name),
    img: data.sprites.other["official-artwork"].front_default
  }));
}

async function seed() {
  await waitForDatabase();

  const connection = createConnection();
  try {
    const [existing] = await Promise.all([
      query(connection, "SELECT COUNT(*) AS count FROM pokemon")
    ]);

    if (SHOULD_SKIP_IF_NOT_EMPTY && existing[0].count > 0) {
      console.log("Seed skipped because pokemon table already has rows.");
      return;
    }

    const data = await getFromAPI(POKEMON_LIMIT);

    await query(connection, "START TRANSACTION");

    for (const pokemon of data) {
      await query(
        connection,
        `INSERT INTO pokemon(id, name, img)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), img = VALUES(img)`,
        [pokemon.id, pokemon.name, pokemon.img]
      );
    }

    const uniqueTypes = [];
    const seen = new Set();
    for (const pokemon of data) {
      for (const type of pokemon.types) {
        if (!seen.has(type)) {
          seen.add(type);
          uniqueTypes.push(type);
        }
      }
    }

    for (let i = 0; i < uniqueTypes.length; i += 1) {
      await query(
        connection,
        `INSERT INTO types(id, name)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [i + 1, uniqueTypes[i]]
      );
    }

    for (const pokemon of data) {
      for (const type of pokemon.types) {
        const typeId = uniqueTypes.indexOf(type) + 1;
        await query(
          connection,
          `INSERT IGNORE INTO poke_type(pokeId, typeId) VALUES (?, ?)`,
          [pokemon.id, typeId]
        );
      }
    }

    await query(connection, "COMMIT");
    console.log(`Seed complete. Loaded ${data.length} pokemon.`);
  } catch (error) {
    try {
      await query(connection, "ROLLBACK");
    } catch (rollbackError) {
      console.error("ROLLBACK failed:", rollbackError);
    }
    throw error;
  } finally {
    connection.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
