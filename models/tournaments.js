const db = require("../utils/db")

const getAllTournaments = () => {
    const query = db.prepare("SELECT * FROM tournaments")
    const tournament = query.all();
    return tournament
}

const getTournamentById = id => {
    const query = db.prepare("SELECT * FROM tournaments WHERE id=?")
    const tournament = query.get(id);
    return tournament
}

const getTournamentByName = name => {
    const query = db.prepare("SELECT * FROM tournaments WHERE name=?")
    const tournament = query.get(name);
    return tournament
}

const getTournamentParticipants = tournamentId => {
    const q = db.prepare(`SELECT u.username FROM tournament_registrations tr JOIN users u ON tr.user_id = u.id WHERE tr.tournament_id = ?`)
    return q.all(tournamentId)
}

const createTournament = (tournament) => {
    const {name, description, videogame, type, rounds, tournament_start_date,
    tournament_end_date, organizer} = tournament
    const q = db.prepare(
        `INSERT INTO tournaments 
        (name, description, videogame, type, rounds, 
        tournament_start_date, tournament_end_date, 
        stateRegistration, organizer, stateTournament)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PerObrir', ?,'Anunciat')`)

    const info = q.run(name, description, videogame, type, rounds, tournament_start_date,
    tournament_end_date, organizer)
    const returnTournament = {
        id: info.lastInsertRowid,
        name,
        description,
        videogame,
        type,
        rounds,
        tournament_start_date,
        tournament_end_date,
        organizer,
    };

    return returnTournament
}

const deleteTournamentById = id => {
    const q = db.prepare(`DELETE FROM tournaments WHERE id=?`)
    q.run(id)
}

const changeTournamentState = (id, data) => {
    const { 
        description, 
        videogame,  
        tournament_start_date, 
        tournament_end_date, 
        stateRegistration, 
        stateTournament 
    } = data;

    // Preparamos la consulta SQL. 
    // IMPORTANTE: No incluimos ni "id" ni "name" en el SET para que no se puedan cambiar.
    const q = db.prepare(`
        UPDATE tournaments 
        SET description = ?, 
            videogame = ?,
            tournament_start_date = ?, 
            tournament_end_date = ?, 
            stateRegistration = ?, 
            stateTournament = ?
        WHERE id = ?
    `);

    // Ejecutamos pasando los valores en el mismo orden que los "?"
    const info = q.run(
        description, 
        videogame, 
        tournament_start_date, 
        tournament_end_date, 
        stateRegistration, 
        stateTournament, 
        id
    );

    // Retornamos true si se encontró el torneo y se actualizó, false si no.
    return info.changes > 0;
};

const registerOnTournament = (tournamentId, userId) => {
    const q = db.prepare(`INSERT INTO tournament_registrations (user_id, tournament_id) VALUES (?, ?)`)
    q.run(userId, tournamentId)
}

const unregisterOnTournament = (tournamentId, userId) => {
    const q = db.prepare(`DELETE FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?`)
    q.run(userId, tournamentId)
}

const isRegistered = (tournamentId, userId) => {
    const q = db.prepare(`SELECT * FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?`)
    return q.get(userId, tournamentId) !== undefined;
}

module.exports = { getAllTournaments, getTournamentById, getTournamentByName, getTournamentParticipants,
    createTournament, deleteTournamentById, changeTournamentState,
    registerOnTournament, unregisterOnTournament, isRegistered}