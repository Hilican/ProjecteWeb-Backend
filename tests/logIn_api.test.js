const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel } = require("../models")
const db = require("../utils/db");
const testHelper = require("./helper");

const api = supertest(app);

describe('LogIn', () => {
    beforeEach(async () => {
        db.exec('DELETE FROM users')
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userData))
    });

    test('login succeeds with correct credentials', async () => {
        const result = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.userData), 200)

        // Comprobamos que nos devuelve un token
        assert(result.body.token !== undefined)
        assert.strictEqual(result.body.username, 'user')
    })

    test('login fails with wrong credentials', async () => {
        const BadPassword = {
            username: 'user',
            password: 'user2'
        }

        const WrongAlwaysSame = {
            username: 'Siempre mandara el mismo mensaje',
            password: 'Solo dice mal o bien'
        }
        
        const result = await testHelper.loginHelper(api, BadPassword, 401)
        const result1 = await testHelper.loginHelper(api, WrongAlwaysSame, 401)

        assert(result.body.error.includes('invalid username or password'))
        assert(result1.body.error.includes('invalid username or password'))
    })
})