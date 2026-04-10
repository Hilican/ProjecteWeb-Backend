const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel } = require("../models")
const db = require("../utils/db");

const api = supertest(app);

describe('LogIn', () => {
    beforeEach(async () => {
        db.exec('DELETE FROM users')

        const userUser = {
            username: "user",
            passwordHash: await bcrypt.hash("user1", 10),
            email: "user@example.com",
            role: "user"
        }
        usersModel.createUser(userUser)
    });

    test('login succeeds with correct credentials', async () => {
        const logInData = {
            username: 'user',
            password: 'user1'
        }
        
        const result = await api
            .post('/api/login')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        // Comprobamos que nos devuelve un token
        assert(result.body.token !== undefined)
        assert.strictEqual(result.body.username, 'user')
    })

    test('login fails with wrong credentials', async () => {
        const logInData = {
            username: 'user',
            password: 'user2'
        }

        const logInData1 = {
            username: 'Siempre mandara el mismo mensaje',
            password: 'porque no comprueba si existe usuario'
        }
        
        const result = await api
            .post('/api/login')
            .send(logInData)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        const result1 = await api
            .post('/api/login')
            .send(logInData1)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        assert(result.body.error.includes('invalid username or password'))
        assert(result1.body.error.includes('invalid username or password'))
    })
})