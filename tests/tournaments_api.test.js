const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, before, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel, videogamesModel, tournamentsModel, gamesModel } = require("../models")
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
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.organizer2Data))
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
        assert.strictEqual(responseKeys.length, 13);
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
        assert.strictEqual(responseKeys.length, 13);
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

    test('Registration & Unregistration from a tournament', async () => {
        let tournament = tournamentsModel.getTournamentByName('ToRegister')

        //Without token
        await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        //User looged in
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.userData))
        const token = temp.body.token
        
        //Register
        const result = await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .set('Authorization', `Bearer ${token}`)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.message, "User registered to tournament successfully")

        //Register again (ERROR)
        await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .set('Authorization', `Bearer ${token}`)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        const user = usersModel.getUserByUsername('user')

        //Unregister
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/id/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        //Unregister again (ERROR)
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/id/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect('Content-Type', /application\/json/)

        tournament = tournamentsModel.getTournamentByName('tournament1')
        //Registration is not open (ERROR)
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/id/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect('Content-Type', /application\/json/)
    })

    test('SPECIAL USER Registration & Unregistration from a tournament', async () =>
    {
        const tournament = tournamentsModel.getTournamentByName('ToRegister')

        //admin looged in
        let temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.adminData))
        let token = temp.body.token

        let result = await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .set('Authorization', `Bearer ${token}`)
            .expect(403)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.error, "only users can register to tournaments")

        //organizator looged in
        temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        token = temp.body.token

        result = await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .set('Authorization', `Bearer ${token}`)
            .expect(403)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.error, "only users can register to tournaments")
    })

    test('See tournament registration list', async () => {
        const tournament = tournamentsModel.getTournamentByName("ToRegister");

        let result = await api
            .get(`/api/tournaments/${tournament.id}/participants`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.length, 0)
        //Register one user
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.userData))
        const token = temp.body.token
        
        await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .set('Authorization', `Bearer ${token}`)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        result = await api
            .get(`/api/tournaments/${tournament.id}/participants`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.length, 1)
        const userId = usersModel.getUserByUsername(testHelper.userData.username)
        assert.strictEqual(result.body[0].user_id, userId.id); 
        assert.strictEqual(result.body[0].username, userId.username);
    })

    test('See as organizer, my tournaments (only owner tested for now)', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        
        const result = await api
            .get(`/api/tournaments/organizer/username/${testHelper.organizerData.username}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.tournaments.length, 2)
        assert.strictEqual(result.body.supportTournaments.length, 0)     
    })

    test('See as user, tournaments where im enrolled', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.userData))
        const token = temp.body.token
        
        //before any inscription
        let result = await api
            .get(`/api/tournaments/user/username/${testHelper.userData.username}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.userTournaments.length, 0) 
        
        //after one inscription
        let tournament = tournamentsModel.getTournamentByName('ToRegister')
        const user = usersModel.getUserByUsername('user')
        
        await api
            .post(`/api/tournaments/${tournament.id}/participants`)
            .set('Authorization', `Bearer ${token}`)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        result = await api
            .get(`/api/tournaments/user/username/${testHelper.userData.username}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.userTournaments.length, 1)
        
        //after canceling inscription
        await api
            .delete(`/api/tournaments/${tournament.id}/participants/id/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        result = await api
            .get(`/api/tournaments/user/username/${testHelper.userData.username}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.userTournaments.length, 0)
    })

    //TOURNAMENTS SUPPORTS
    test('See my tournament supports', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        let tournament = tournamentsModel.getTournamentByName('tournament1')
        //before any inscription

        let result = await api
            .get(`/api/tournaments/${tournament.id}/organizers`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.organizers.length, 0) 
        
        //after one inscription
        const organizerToAdd = usersModel.getUserByUsername(testHelper.organizer2Data.username)
        await api
            .post(`/api/tournaments/${tournament.id}/organizers`)
            .set('Authorization', `Bearer ${token}`)
            .send({ organizerToAdd: organizerToAdd.id })
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        result = await api
            .get(`/api/tournaments/${tournament.id}/organizers`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.organizers.length, 1) 
        
        //after canceling inscription
        await api
            .delete(`/api/tournaments/${tournament.id}/organizers/${organizerToAdd.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        result = await api
            .get(`/api/tournaments/${tournament.id}/organizers`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.organizers.length, 0) 
    })

    test('Registration & Unregistration as a support from a tournament', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        const tournament = tournamentsModel.getTournamentByName('tournament1')
        const organizerToAdd = usersModel.getUserByUsername(testHelper.organizer2Data.username)
        //before one inscription
        let organizerList = tournamentsModel.getTournamentSupportIds(tournament.id) 
        assert.strictEqual(organizerList.length, 0)

        //after one inscription
        await api
            .post(`/api/tournaments/${tournament.id}/organizers`)
            .set('Authorization', `Bearer ${token}`)
            .send({ organizerToAdd: organizerToAdd.id })
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        organizerList = tournamentsModel.getTournamentSupportIds(tournament.id) 
        assert.strictEqual(organizerList.length, 1)

        //Trying to add same organizator
        let result = await api
            .post(`/api/tournaments/${tournament.id}/organizers`)
            .set('Authorization', `Bearer ${token}`)
            .send({ organizerToAdd: organizerToAdd.id })
            .expect(400)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.error, "User is already a support organizer of this tournament")
        organizerList = tournamentsModel.getTournamentSupportIds(tournament.id) 
        assert.strictEqual(organizerList.length, 1)
        
        //after canceling inscription
        await api
            .delete(`/api/tournaments/${tournament.id}/organizers/${organizerToAdd.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        organizerList = tournamentsModel.getTournamentSupportIds(tournament.id) 
        assert.strictEqual(organizerList.length, 0)
    })

    //GAMES
    test('Organizer changes game info/state', async () => {

        //Create tournament/games (copied from the test to create tournament)
        let temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        let token = temp.body.token
        const newTournament = testHelper.tournamentData
        let result =await api
            .post('/api/tournaments')
            .set('Authorization', `Bearer ${token}`)
            .send(newTournament)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        //End of tournament creation
        const tournament = tournamentsModel.getTournamentByName(newTournament.name)
        const games = gamesModel.getAllGamesFromTournamentExtended(tournament.id)
        let game = games[0]
        console.log(game)
        const toModify = {
            state: "ToPlay"
        }
        
        // Petición correcta con Token (Esperamos 200 OK)
        result = await api
            .patch(`/api/tournaments/games/${game.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(toModify)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        // Petición incorrecta sin Token (Esperamos 401 Unauthorized)
        await api
            .patch(`/api/tournaments/games/${game.id}`)
            .send(toModify)
            .expect(401)
            .expect('Content-Type', /application\/json/)
        


        assert.strictEqual(result.body.message, "Tournament game updated successfully")
        assert.strictEqual(game.state, "ToDefinePlayers")
        game = gamesModel.getGameById(game.id)
        assert.strictEqual(game.state, "ToPlay")
    })
})