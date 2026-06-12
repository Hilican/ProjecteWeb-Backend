const db = require("../utils/db");

const getAllGames = () => {
    const q = db.prepare(`
        SELECT *
        FROM games
    `);
    const games = q.all()
    return games;
}

const getAllGamesFromTournament = (tournamentId) => {
    const q = db.prepare(`
        SELECT *
        FROM games
        WHERE tournamentId=?
    `);
    const games = q.all(tournamentId)
    return games;
}

const getAllGamesFromUser = (userId) => {
    const q = db.prepare(`
        SELECT *
        FROM games
        WHERE player1=? OR player2=?
    `);
    const games = q.all(userId, userId)
    return games;
}

const getAllGamesFromTournamentFromUser = (userId, tournamentId) => {
    const q = db.prepare(`
        SELECT *
        FROM games
        WHERE (player1=? OR player2=?) AND tournamentId=?
    `);
    const games = q.all(userId, userId, tournamentId)
    return games;
}

const getGameById = id => {
    const q = db.prepare(`
        SELECT *
        FROM games
        WHERE id=?
    `);

    const game = q.get(id)
    return game;
}

const createGame = (tournamentId, round) => {
    const q = db.prepare(`
        INSERT INTO games
        (tournamentId, state, player1, player2, result, round)
        VALUES (?, 'ToDefinePlayers', NULL, NULL, NULL, ?)
    `);

    const info = q.run(tournamentId, round);

    return {
        id: info.lastInsertRowid,
        tournamentId: tournamentId,
        round: round
    }
}

const removeGame = (id) => {
    const q = db.prepare(`
        DELETE FROM games
        WHERE id=?
    `);

    q.run(tournamentId, round);
}

const modifyGame = (id, data) => {
    const { 
        state,
        player1,
        player2,
        result,
    } = data;

    // Preparamos la consulta SQL.
    const q = db.prepare(`
        UPDATE games 
        SET state = ?, 
            player1 = ?, 
            player2 = ?, 
            result = ?
        WHERE id = ?
    `);

    // Ejecutamos pasando los valores en el mismo orden que los "?"
    const info = q.run(
        state,
        player1,
        player2,
        result,
        id
    );
    return info.changes > 0;
}

//--- FOR FRONT END USE ---
const getAllGamesFromTournamentExtended = (tournamentId) => {
    const q = db.prepare(`
        SELECT 
            g.*, 
            u1.username AS player1Name, 
            u2.username AS player2Name
        FROM games g
        LEFT JOIN users u1 ON g.player1 = u1.id
        LEFT JOIN users u2 ON g.player2 = u2.id
        WHERE g.tournamentId = ?
    `);
    const games = q.all(tournamentId)
    return games;
}

module.exports = { 
    getAllGames, getAllGamesFromTournament, getAllGamesFromUser, getGameById, getAllGamesFromTournamentFromUser,
    createGame, removeGame, modifyGame, 
    getAllGamesFromTournamentExtended,
 };