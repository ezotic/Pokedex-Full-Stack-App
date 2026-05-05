const express = require('express');
const cors = require("cors");
const mysql = require("mysql2");

const app = express()
app.use(cors())
const port = Number(process.env.PORT || 5000)

const DB_CONFIG = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pokedex"
}

app.get('/', (req, res) => {
    res.send('#FlyEaglesFly')
})

app.get("/pokedex", async (req, res) => {
    try {
        let pokemonData = await getPokemonData()
        res.send(pokemonData);
    } catch (error) {
        res.status(500).json({ error: "Unable to read pokedex data" });
    }
})
  
  app.listen(port, () => {
    console.log(`Starting Pokedex app at http://localhost:${port}`)
})

async function getPokemonData(){

        const con = mysql.createConnection(DB_CONFIG);
  
    let data =  await new Promise((resolve, reject) => {
            con.query("SELECT pokemon.ID AS id, pokemon.name, types.name AS type, pokemon.img FROM pokemon JOIN poke_type ON pokemon.id = poke_type.pokeId JOIN types ON poke_type.typeId = types.id ORDER BY poke_type.pokeId;", (err, result, fields) => {
        (err) ? reject(err): resolve(result);
      })
    })
  
    con.end();
  
    return data;
}

