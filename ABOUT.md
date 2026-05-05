# About Pokedex Full Stack App

A full stack Pokedex application that fetches Pokemon data from the [PokeAPI](https://pokeapi.co/) and displays it in a browser. The app runs entirely with Docker Compose — one command starts the database, seeds it with data, serves the API, and hosts the frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (nginx static server) |
| API | Node.js, Express |
| Database | MySQL 8.4 |
| Container runtime | Docker Compose |
| External data source | PokeAPI |

---

## Infrastructure Design

```mermaid
flowchart TD
    Browser(["🌐 Browser\nlocalhost:8080"])

    subgraph Compose Network ["Docker Compose Network"]
        Frontend["frontend\nnginx:1.27-alpine\nport 80 → 8080"]
        API["api\nnode:20-alpine\nport 5000"]
        Seed["seed\nnode:20-alpine\none-shot container"]
        MySQL["mysql\nmysql:8.4\nport 3306"]
        Volume[("mysql_data\nnamed volume")]
    end

    PokeAPI(["🌍 PokeAPI\npokeapi.co"])

    Browser -->|"GET /\nGET /api/pokedex"| Frontend
    Frontend -->|"proxy /api/ →\nhttp://api:5000/"| API
    API -->|"SELECT pokemon, types,\npoke_type"| MySQL
    Seed -->|"INSERT pokemon,\ntypes, poke_type"| MySQL
    Seed -->|"fetch pokemon 1–300"| PokeAPI
    MySQL --- Volume

    style Seed stroke-dasharray: 5 5
```

> The `seed` service (dashed) is a one-shot container. It runs after MySQL is healthy, loads data from PokeAPI, then exits. On subsequent startups it skips if the `pokemon` table already has rows.

---

## Startup Sequence

```mermaid
sequenceDiagram
    participant D as Docker Compose
    participant M as mysql
    participant S as seed
    participant A as api
    participant F as frontend

    D->>M: start mysql container
    M-->>D: healthcheck passes
    D->>S: start seed (depends on mysql healthy)
    S->>M: wait for DB connection
    S->>PokeAPI: fetch 300 pokemon
    S->>M: INSERT pokemon / types / poke_type
    S-->>D: exit 0
    D->>A: start api (depends on seed completed)
    D->>F: start frontend (depends on api started)
```

---

## Data Model

```mermaid
erDiagram
    pokemon {
        INT id PK
        VARCHAR name
        VARCHAR img
    }
    types {
        INT id PK
        VARCHAR name
    }
    poke_type {
        INT id PK
        INT pokeId FK
        INT typeId FK
    }

    pokemon ||--o{ poke_type : "has"
    types ||--o{ poke_type : "tagged by"
```

---

## API

| Method | Path | Response |
|---|---|---|
| GET | `/pokedex` | `{ id, name, type, img }[]` |

---

## Running the App

```bash
# First run (builds images, seeds DB automatically)
docker compose up --build

# Subsequent runs
docker compose up

# Manual reseed
docker compose exec api npm run db:reseed

# Full reset (wipes DB volume)
docker compose down -v && docker compose up --build
```

---

## Environment Variables

Defaults are defined in `.env.example`. Copy to `.env` to override:

| Variable | Default | Description |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | MySQL root password |
| `MYSQL_DATABASE` | `pokedex` | Database name |
| `MYSQL_USER` | `pokedex_user` | App DB user |
| `MYSQL_PASSWORD` | `pokedex_password` | App DB password |
| `POKEDEX_POKEMON_LIMIT` | `300` | Number of Pokemon to seed |
