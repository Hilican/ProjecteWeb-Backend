const db = require("../utils/db")

const getAllTournaments = () => {
    const query = db.prepare("SELECT * FROM tournaments")
    const tournament = query.all();
    return tournament
}

const getAllOrganizerTournamentsById = (organizerId) => {
    const query = db.prepare("SELECT * FROM tournaments WHERE organizer = ?")
    return query.all(organizerId)
}

const getAllOrganizerTournamentsByName = (organizerName) => {
    const query = db.prepare("SELECT * FROM tournaments WHERE organizer = (SELECT id FROM users WHERE username = ?)")
    return query.all(organizerName)
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

// -- TOURNAMENT REGISTRATIONS --
const getUserRegistrationsByUsername = (username) => {
    const q = db.prepare(`
        SELECT t.* FROM tournament_registrations tr
        INNER JOIN tournaments t ON tr.tournament_id = t.id
        INNER JOIN users u ON tr.user_id = u.id
        WHERE u.username = ?
    `);
    return q.all(username);
}

const isRegisteredById = (tournamentId, userId) => {
    const q = db.prepare(`SELECT * FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?`)
    return q.get(userId, tournamentId) !== undefined;
}

const isRegisteredByUsername = (tournamentId, username) => {
    const q = db.prepare(`SELECT * FROM tournament_registrations tr JOIN users u ON tr.user_id = u.id WHERE u.username = ? AND tr.tournament_id = ?`)
    return q.get(username, tournamentId) !== undefined;
}

const getTournamentRegistrationIds = (tournamentId) => {
    const q = db.prepare(`SELECT user_id FROM tournament_registrations WHERE tournament_id = ?`)
    return q.all(tournamentId)
}

const getTournamentRegistrationUsernames = (tournamentId) => {
    const q = db.prepare(`SELECT u.username FROM tournament_registrations tr JOIN users u ON tr.user_id = u.id WHERE tr.tournament_id = ?`)
    return q.all(tournamentId)
}

const registerUserOnTournament = (tournamentId, userId) => {
    const q = db.prepare(`INSERT INTO tournament_registrations (user_id, tournament_id) VALUES (?, ?)`)
    q.run(userId, tournamentId)
}

const unregisterUserFromTournament = (tournamentId, userId) => {
    const q = db.prepare(`DELETE FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?`)
    q.run(userId, tournamentId)
}

// -- TOURNAMENT ORGANIZERS --
const getTournamentSupportIds = (tournamentId) => {
    const q = db.prepare(`SELECT user_id FROM tournament_organizers WHERE tournament_id = ?`)
    return q.all(tournamentId)
}

const getTournamentSupportUsernames = (tournamentId) => {
    const q = db.prepare(`SELECT u.username FROM tournament_organizers to JOIN users u ON to.user_id = u.id WHERE to.tournament_id = ?`)
    return q.all(tournamentId)
}

const getAllOrganizerSupportTournamentsByName = (organizerSupportName) => {
    const query = db.prepare(`
        SELECT t.* FROM tournament_organizers to_sup
        JOIN users u ON to_sup.user_id = u.id
        JOIN tournaments t ON to_sup.tournament_id = t.id
        WHERE u.username = ?
    `)
    return query.all(organizerSupportName)
}

const registerTournamentSupport = (tournamentId, userId) => {
    const q = db.prepare(`INSERT INTO tournament_organizers (user_id, tournament_id) VALUES (?, ?)`)
    q.run(userId, tournamentId)
}

const unregisterTournamentSupport = (tournamentId, userId) => {
    const q = db.prepare(`DELETE FROM tournament_organizers WHERE user_id = ? AND tournament_id = ?`)
    q.run(userId, tournamentId)
}

const isTournamentSupport = (tournamentId, userId) => {
    const q = db.prepare(`SELECT * FROM tournament_organizers WHERE user_id = ? AND tournament_id = ?`)
    return q.get(userId, tournamentId) !== undefined;
}

//--- FOR FRONTEND USE ---
const getAllTournamentsExtended = () => {
    const q = db.prepare(`
        SELECT 
            t.*, 
            v.name AS videogameName, 
            u.username AS organizerName
        FROM tournaments t
        INNER JOIN videogames v ON t.videogame = v.id
        INNER JOIN users u ON t.organizer = u.id
    `);

    return q.all();
};

const getTournamentExtendedById = id => {
    const q = db.prepare(`
        SELECT 
            t.*, 
            v.name AS videogameName, 
            u.username AS organizerName
        FROM tournaments t
        INNER JOIN videogames v ON t.videogame = v.id
        INNER JOIN users u ON t.organizer = u.id
        WHERE t.id = ?
    `);
    const tournament = q.get(id);
    return tournament
};

const getTournamentSupportsExtended = (tournamentId) => {
    const q = db.prepare(`SELECT u.username, torg.user_id FROM tournament_organizers torg JOIN users u ON torg.user_id = u.id WHERE torg.tournament_id = ?`)
    return q.all(tournamentId)
}

const getTournamentRegistrationExtended = (tournamentId) => {
    const q = db.prepare(`SELECT u.username, tr.user_id FROM tournament_registrations tr JOIN users u ON tr.user_id = u.id WHERE tr.tournament_id = ?`)
    return q.all(tournamentId)
}

module.exports = { 
    getAllTournaments, getTournamentById, getTournamentByName,
    createTournament, deleteTournamentById, changeTournamentState,
    getAllOrganizerTournamentsById, getAllOrganizerTournamentsByName,
    // -- TOURNAMENT REGISTRATIONS --
    getUserRegistrationsByUsername,
    getTournamentRegistrationIds, getTournamentRegistrationUsernames,
    registerUserOnTournament, unregisterUserFromTournament, isRegisteredById, isRegisteredByUsername,
    // -- TOURNAMENT ORGANIZERS --
    getTournamentSupportIds, getTournamentSupportUsernames,
    getAllOrganizerSupportTournamentsByName,
    registerTournamentSupport, unregisterTournamentSupport, isTournamentSupport,
    // -- EXTENDED --
    getAllTournamentsExtended, getTournamentExtendedById, getTournamentSupportsExtended,
    getTournamentRegistrationExtended,
}