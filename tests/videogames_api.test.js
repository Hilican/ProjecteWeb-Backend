const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, before, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel, videogamesModel } = require("../models")
const db = require("../utils/db");

const api = supertest(app);

describe('simple interactions with videogames list', () => {
    before(async () => {
        db.exec('DELETE FROM users')

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

        usersModel.createUser(rootUser)
        usersModel.createUser(organizerUser)
        usersModel.createUser(userUser)
    });

    beforeEach(async () => {
        db.exec('DELETE FROM videogames')
        const videogame1 = { 
            name: "COD:BO2", 
            description: "Patata", 
        }
        videogamesModel.addVideogame(videogame1)
    });

    test('See all videogames', async () => {
        const result = await api
            .get(`/api/videogames`)
            .expect(200)
            .expect('Content-Type', /application\/json/);

        assert.strictEqual(result.body.length, 1)
        assert.strictEqual(result.body[0].name, "COD:BO2")
    })

    test('See one videogames', async () => {
        const gameInfo = videogamesModel.getVideogameByName("COD:BO2");
        const result = await api
            .get(`/api/videogames/${gameInfo.id}`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
            
        const responseKeys = Object.keys(result.body);
        assert.strictEqual(responseKeys.length, 3);
        assert.strictEqual(result.body.id, gameInfo.id);
        assert.strictEqual(result.body.name, gameInfo.name);
        assert.strictEqual(result.body.description, gameInfo.description);
    })

    test('admin adds a game', async () => {
        const logInData = {
            username: 'root',
            password: 'root1'
        }
        
        const result = await api
            .post('/api/login')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const token = result.body.token
        
        //Same applies create another admin, since the unique thing that changes is the role String
        const newGame = {
            name: "New Game",
            description: "A new video game"
        }
        
        await api
            .post('/api/videogames')
            .set('Authorization', `Bearer ${token}`)
            .send(newGame)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        const game = videogamesModel.getVideogameByName(newGame.name)
        assert.strictEqual(game.name, 'New Game')
        assert.strictEqual(game.description, 'A new video game')
    })

    test('admin removes a game', async () => {
        const logInData = {
            username: 'root',
            password: 'root1'
        }
        
        const result = await api
            .post('/api/login/')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const token = result.body.token
        
        const gameInfo = videogamesModel.getVideogameByName("COD:BO2");
        
        await api
            .delete(`/api/videogames/${gameInfo.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(204)
        
        const videogame = videogamesModel.getVideogameByName("COD:BO2")
        assert.strictEqual(videogame, undefined)
    })

    test('non admin tries to remove a game', async () => {
        const logInData = {
            username: 'user',
            password: 'user1'
        }
        
        const result = await api
            .post('/api/login/')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const token = result.body.token
        
        const gameInfo = videogamesModel.getVideogameByName("COD:BO2");
        
        await api
            .delete(`/api/videogames/${gameInfo.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(401)
    })
})