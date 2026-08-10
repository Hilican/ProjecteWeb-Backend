const { gamesModel } = require("../models")

class KnockoutTournamentStrategy {
  createGames(tournamentId, rounds) {
    for (let round = 1; round <= rounds; round++) {
      const gamesInRound = Math.pow(2, round - 1);
      for (let i = 1; i <= gamesInRound; i++) {
        gamesModel.createGame(tournamentId, round);
      }
    }
  }
}

//IF THIS IS DELETED OR MOVED, UPDATE dbConstants.js
const TOURNAMENT_TYPES = {
  SINGLE_ELIMINATION: new KnockoutTournamentStrategy(),
};

const VALID_T_TYPES = Object.keys(TOURNAMENT_TYPES);

const createGames = (type, tournamentId, rounds) => {
  const strategy = TOURNAMENT_TYPES[type];

  if (!strategy) {
    throw new Error(`Estrategia no implementada para el tipo: ${type}`);
  }

  strategy.createGames(tournamentId, rounds);
  return 0;
}

module.exports = { 
  VALID_T_TYPES, createGames
};