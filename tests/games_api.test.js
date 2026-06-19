const supertest = require("supertest");
const {describe, before, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel, videogamesModel, tournamentsModel, gamesModel} = require("../models")
const db = require("../utils/db");
const testHelper = require("./helper");

const api = supertest(app);

describe('simple interactions with games of a Tournament', () => {
    before(async () => {
        db.exec('DELETE FROM users')
        db.exec('DELETE FROM videogames')
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.adminData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.organizerData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userPlayer1Data))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userPlayer2Data))
        videogamesModel.addVideogame(testHelper.videogameData)
    });

    beforeEach(async () => {
        db.exec('DELETE FROM tournaments')
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        await api
            .post('/api/tournaments')
            .set('Authorization', `Bearer ${token}`)
            .send(testHelper.tournamentData)
    });

    test('See all games of the Tournament', async () => {
        const tournament = tournamentsModel.getTournamentByName(testHelper.tournamentData.name)
        const result = await api
            .get(`/api/tournaments/${tournament.id}/games`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        const all = gamesModel.getAllGamesFromTournament(tournament.id)
        assert.strictEqual(result.body.length, all.length)
    })

    test('See one game of a Tournament', async () => {
        const tournament = tournamentsModel.getTournamentByName(testHelper.tournamentData.name)
        const games = gamesModel.getAllGamesFromTournament(tournament.id)
        const gameId = games[0].id
        const result = await api
            .get(`/api/tournaments/${tournament.id}/games/${gameId}`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        const game = gamesModel.getGameById(gameId)
        assert.strictEqual(result.body.id, game.id)
    })

    test('See one game', async () => {
        const tournament = tournamentsModel.getTournamentByName(testHelper.tournamentData.name)
        const games = gamesModel.getAllGamesFromTournament(tournament.id)
        const gameId = games[0].id
        const result = await api
            .get(`/api/tournaments/games/${gameId}`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        const game = gamesModel.getGameById(gameId)
        assert.strictEqual(result.body.id, game.id)
    })

    test('Define a game of a Tournament', async () => {
        const tournament = tournamentsModel.getTournamentByName(testHelper.tournamentData.name)
        const games = gamesModel.getAllGamesFromTournament(tournament.id)
        const gameId = games[0].id

        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        
        const user1 = usersModel.getUserByUsername(testHelper.userPlayer1Data.username);
        const user2 = usersModel.getUserByUsername(testHelper.userPlayer2Data.username);

        const toModify = {
            state: "ToPlay",
            player1: user1.id,
            player2: user2.id,
        }

        const result = await api
            .patch(`/api/tournaments/games/${gameId}`)
            .set('Authorization', `Bearer ${token}`)
            .send(toModify)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        assert.strictEqual(result.body.message, "Tournament game updated successfully")
        assert.strictEqual(games[0].state, "ToDefinePlayers")
        const game = gamesModel.getGameById(gameId)
        assert.strictEqual(game.state, "ToPlay")
    })
})