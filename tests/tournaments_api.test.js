const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, before, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel, videogamesModel, tournamentsModel } = require("../models")
const db = require("../utils/db");
const testHelper = require("./helper");


const api = supertest(app);

describe('simple interactions with tournament list', () => {
    before(async () => {
        db.exec('DELETE FROM users')
        db.exec('DELETE FROM videogames')
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.adminData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.organizerData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userData))
        videogamesModel.addVideogame(testHelper.videogameData)
    });

    beforeEach(async () => {
        db.exec('DELETE FROM tournaments')
        const organizer = await usersModel.getUserByUsername(testHelper.organizerData.username)
        const videogame = await videogamesModel.getVideogameByName(testHelper.videogameData.name)
        const tournament = { 
            name: "tournament1",
            description: "description1",
            videogame: videogame.id,
            type: "torneig",
            rounds: 3,
            tournament_start_date: "2023-01-01",
            tournament_end_date: "2023-01-02",
            organizer: organizer.id
        }
        const tournamentOpen = { 
            name: "ToRegister",
            description: "description1",
            videogame: videogame.id,
            type: "torneig",
            rounds: 3,
            tournament_start_date: "2023-01-01",
            tournament_end_date: "2023-01-02",
            organizer: organizer.id
        }
        tournamentsModel.createTournament(tournament)
        tournamentsModel.createTournament(tournamentOpen)
        db.exec(`UPDATE tournaments SET stateRegistration = 'Oberta' WHERE name = 'ToRegister'`)
    });

    test('See one tournaments', async () => {
        const tournamentInfo = tournamentsModel.getTournamentByName("tournament1");
        const result = await api
            .get(`/api/tournaments/${tournamentInfo.id}`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
            
        const responseKeys = Object.keys(result.body);
        assert.strictEqual(responseKeys.length, 11);
        assert.strictEqual(result.body.id, tournamentInfo.id);
        assert.strictEqual(result.body.name, tournamentInfo.name);
        assert.strictEqual(result.body.description, tournamentInfo.description);
    })

    test('See all tournaments', async () => {
        const result = await api
            .get(`/api/tournaments`)
            .expect(200)
            .expect('Content-Type', /application\/json/);

        assert.strictEqual(result.body.length, 2)
        const responseKeys = Object.keys(result.body[0]);
        assert.strictEqual(responseKeys.length, 11);
    })

    test('Organizer creates one tournaments', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token

        const newTournament = testHelper.tournamentData
    
        const result =await api
            .post('/api/tournaments')
            .set('Authorization', `Bearer ${token}`)
            .send(newTournament)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        const tournament = tournamentsModel.getTournamentByName(newTournament.name)
        assert.strictEqual(result.body.message, "Tournament and brackets generated successfully")
        assert.strictEqual(result.body.createdTournament.description, tournament.description)
    })

    test('Non organizer fails to create one tournament', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.adminData))
        const token = temp.body.token

        const newTournament = testHelper.tournamentData
        
        await api
            .post('/api/tournaments')
            .set('Authorization', `Bearer ${token}`)
            .send(newTournament)
            .expect(401)
    })

    test('Organizer changes his tournament registration state successfully', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        
        let tournament = tournamentsModel.getTournamentByName('tournament1')

        const toModify = {
            stateRegistration: "Oberta"
        }
        
        const result = await api
            .patch(`/api/tournaments/${tournament.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(toModify)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        //Without token
        await api
            .patch(`/api/tournaments/${tournament.id}`)
            .send(toModify)
            .expect(401)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.message, "Tournament updated successfully")
        assert.strictEqual(tournament.stateRegistration, "PerObrir")
        //Actualizar el torneo para que tenga el nuevo estado
        tournament = tournamentsModel.getTournamentByName('tournament1')
        assert.strictEqual(tournament.stateRegistration, "Oberta")
    })

    test('User registers and unregisters from a tournament', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.userData))
        const token = temp.body.token
        
        let tournament = tournamentsModel.getTournamentByName('ToRegister')
        
        const result = await api
            .post(`/api/tournaments/${tournament.id}/register`)
            .set('Authorization', `Bearer ${token}`)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.message, "User registered to tournament successfully")

        await api
            .post(`/api/tournaments/${tournament.id}/register`)
            .set('Authorization', `Bearer ${token}`)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        //Without token
        await api
            .post(`/api/tournaments/${tournament.id}/register`)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        const user = usersModel.getUserByUsername('user')

        //Unregister from tournament
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        //Unregister again
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect('Content-Type', /application\/json/)

        tournament = tournamentsModel.getTournamentByName('tournament1')
        //Registration is not open
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect('Content-Type', /application\/json/)
    })
})