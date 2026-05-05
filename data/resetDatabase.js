const mysql = require("mysql2");

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pokedex"
};

function createConnection() {
  return mysql.createConnection(DB_CONFIG);
}

function query(connection, sql) {
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

async function reset() {
  const connection = createConnection();
  try {
    await query(connection, "SET FOREIGN_KEY_CHECKS = 0");
    await query(connection, "TRUNCATE TABLE poke_type");
    await query(connection, "TRUNCATE TABLE types");
    await query(connection, "TRUNCATE TABLE pokemon");
    await query(connection, "SET FOREIGN_KEY_CHECKS = 1");
    console.log("Database tables truncated.");
  } finally {
    connection.end();
  }
}

reset().catch((error) => {
  console.error("Reset failed:", error.message);
  process.exit(1);
});
