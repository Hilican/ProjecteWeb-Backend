const db = require("../utils/db")
const tournamentsModel = require("./tournaments")
const usersModel = require("./users")
const videogamesModel = require("./videogames")
const gamesModel = require("./games")

const initDb = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            passwordHash TEXT,
            email TEXT UNIQUE,
            role TEX
            )
            `)
            
    db.exec(`
        CREATE TABLE IF NOT EXISTS tournaments(
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            description TEXT,
            videogame INTEGER,
            type TEXT,
            rounds INTEGER,             -- número de rondas del torneo, 0 si el torneo no tiene rondas
            tournament_start_date TEXT,
            tournament_end_date TEXT,
            organizer INTEGER,
            stateTournament TEXT,
            FOREIGN KEY(organizer) REFERENCES users(id),
            FOREIGN KEY(videogame) REFERENCES videogames(id)
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS tournament_registrations(
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            tournament_id INTEGER,
            status TEXT DEFAULT 'PENDING',
            
            -- Relaciones con las otras tablas
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            
            -- Evita que un usuario se apunte dos veces al mismo torneo
            -- Se supone que cada usuario que se ponga ya se comprobara que es un user
            UNIQUE(user_id, tournament_id)
        )
    `)


    //Modificar para que sea una tabla donde se guarden los organizadores se añaden a cada torneo
    db.exec(`
        CREATE TABLE IF NOT EXISTS tournament_organizers(
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            tournament_id INTEGER,
            
            -- Relaciones con las otras tablas
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            
            -- Evita que un organizer se apunte dos veces al mismo torneo
            -- Se supone que cada usuario que se ponga ya se comprobara que es un organizer
            UNIQUE(user_id, tournament_id)
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS videogames(
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            description TEXT
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY,
            tournamentId INTEGER,
            state TEXT,         -- "ToDefinePlayers", "ToPlay", "Played"
            player1 INTEGER,
            player2 INTEGER,
            result INTEGER,      -- 0 = empate, 1 = player1 gana, 2 = player2 gana
            round INTEGER,       -- round of the tournament, 0 if the tournament has no rounds
            FOREIGN KEY(tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE,
            FOREIGN KEY(player1) REFERENCES users(id),
            FOREIGN KEY(player2) REFERENCES users(id)
        )
    `)

}

module.exports = { initDb, tournamentsModel, usersModel, videogamesModel, gamesModel}