// --- CHECK IF PARAMETRES EXIST ---
const isValid = value => value !== undefined && value !== null && value !== "";

const getIntParams = (fields, request, response) => {
    const result = {};
    let temp;
    for (const field of fields) {
        const value = request.params[field];
        const temp = Number(value);

        if (!Number.isInteger(temp) || temp <= 0) {
            response.status(400).json({ error: `${field} must be a positive integer` });
            return null; 
        }
        result[field] = temp;
    }
    return result;
};

/*
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }
*/

const getExistingParameters = (allowedFields, request) => {
    const filters = {};

    allowedFields.forEach(field => {
        const value = request.body[field];
        if (isValid(value)) {
            filters[field] = value;
        }
    });

    //This to be able to use if as i was doing, so i don't need to change all the code i had
    if (Object.keys(filters).length === 0) {
        return null;
    }
    return filters;
}

/**
if (!hasAll(allowedFields, request)) {
    return response.status(400).json({ 
        error: "All fields are required",
        fields: allowedFields
    });
}
 */


const hasAll = (allowedFields, request) => {
    return allowedFields.every(field => isValid(request.body[field]));
}

/**
if (!hasAll(allowedFields, request)) {
    return response.status(400).json({ 
    error: "All fields are required",
    fields: allowedFields
}
 */

// --- TOURNAMENTS HELPERS ---
const supportedTypes = ["torneig"];

const { gamesModel } = require("../models")

const createGames = (type, rounds, tournamentId) => {
    switch (type) {
        case "torneig":
            for (let round = 1; round <= rounds; round++) {
            // Calculamos cuántos partidos hay en esta ronda (2 elevado a la ronda-1)
            // Ejemplo: Ronda 1 = 1 partido, Ronda 2 = 2, Ronda 3 = 4...
            const gamesInRound = Math.pow(2, round - 1);

            for (let i = 1; i <= gamesInRound; i++) {
                // Creamos el partido en la base de datos
                gamesModel.createGame(tournamentId, round);
            }
        }
        break;
    }
}

module.exports = { 
    getIntParams, getExistingParameters, hasAll, 
    // --- TOURNAMENTS HELPERS ---
    supportedTypes, createGames
};