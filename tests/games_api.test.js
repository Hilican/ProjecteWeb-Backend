const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, before, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel, videogamesModel, tournamentsModel, gamesModel} = require("../models")
const db = require("../utils/db");

const api = supertest(app);

describe('simple interactions with games of a Tournament', () => {
    before(async () => {
        db.exec('DELETE FROM users')
        db.exec('DELETE FROM videogames')
        const rootUser = {
            username: "root",
            passwordHash: await bcrypt.hash("root1", 10),
            email: "root@example.com",
            role: "admin"
        };
        const organizerUser = {
            username: "organizer",
            passwordHash: await bcrypt.hash("organizer1", 10),
            email: "organizer@example.com",
            role: "organizer"
        }
        const userUser = {
            username: "user",
            passwordHash: await bcrypt.hash("user1", 10),
            email: "user@example.com",
            role: "user"
        }
        const userPlayer1 = {
            username: "Player1",
            passwordHash: await bcrypt.hash("user1", 10),
            email: "Player1@example.com",
            role: "user"
        }
        const userPlayer2 = {
            username: "Player2",
            passwordHash: await bcrypt.hash("user1", 10),
            email: "Player2@example.com",
            role: "user"
        }
        const videogame1 = { 
            name: "COD:BO2", 
            description: "Patata", 
        }
        usersModel.createUser(rootUser)
        usersModel.createUser(organizerUser)
        usersModel.createUser(userUser)
        usersModel.createUser(userPlayer1)
        usersModel.createUser(userPlayer2)
        videogamesModel.addVideogame(videogame1)
    });

    beforeEach(async () => {
        db.exec('DELETE FROM tournaments')
        const logInData = {
            username: 'organizer',
            password: 'organizer1'
        }
        
        const temp = await api
            .post('/api/login')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const token = temp.body.token

        const newTournament = { 
            name: "tournament4",
            description: "description1",
            videogame: "COD:BO2",
            type: "torneig",
            rounds: 3,
            tournament_start_date: "2023-01-01",
            tournament_end_date: "2023-01-02",
        }
    
        await api
            .post('/api/tournaments')
            .set('Authorization', `Bearer ${token}`)
            .send(newTournament)
    });

    test('See all games of the Tournament', async () => {

        const tournament = tournamentsModel.getTournamentByName("tournament4")
        const result = await api
            .get(`/api/tournaments/${tournament.id}/games`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
            
        gamesModel.getAllGamesFromTournament(tournament.id)
        assert.strictEqual(result.body.length, 7)
    })

    test('See one game of a Tournament', async () => {
        const tournament = tournamentsModel.getTournamentByName("tournament4")
        const games = gamesModel.getAllGamesFromTournament(tournament.id)
        const gameId = games[0].id
        const result = await api
            .get(`/api/tournaments/${tournament.id}/games/${gameId}`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        const game = gamesModel.getGameById(gameId)
        assert.strictEqual(result.body.id, game.id)
    })

    test('Define a game of a Tournament', async () => {
        const tournament = tournamentsModel.getTournamentByName("tournament4")
        const games = gamesModel.getAllGamesFromTournament(tournament.id)
        const gameId = games[0].id

        const logInData = {
            username: 'organizer',
            password: 'organizer1'
        }
        
        const temp = await api
            .post('/api/login')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const token = temp.body.token
        
        const user1 = usersModel.getUserByUsername("Player1");
        const user2 = usersModel.getUserByUsername("Player2");

        const toModify = {
            player1: user1.id,
            player2: user2.id,
        }

        const result = await api
            .patch(`/api/tournaments/${tournament.id}/games/${gameId}`)
            .set('Authorization', `Bearer ${token}`)
            .send(toModify)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        assert.strictEqual(result.body.message, "Tournament game updated successfully");
    })
})