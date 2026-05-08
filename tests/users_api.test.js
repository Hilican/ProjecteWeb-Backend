const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel } = require("../models")
const db = require("../utils/db");
const testHelper = require("./helper");

const api = supertest(app);

//Tests that doesn't require the token/role
describe('Create users tests', () => {
    beforeEach(async () => {
        db.exec('DELETE FROM users')
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userData))
    });

    test('creation succeeds with a fresh username (only user, cant select role, no logInRequired)', async () => {
        const newUser = {
            username: "newUser",
            password: "mypsswd",
            email: "newuser@example.com",
        }

        await api
            .post('/api/users/createUser')
            .send(newUser)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        const allUsers = usersModel.getAllUsers()
        const usernames = allUsers.map(u => u.username)
        assert(usernames.includes(newUser.username))
    });

    test('creation fails if username already taken', async () => {
        const usersAtStart = usersModel.getAllUsers()
        
        //Intentar crear otro usuario pero con el mismo username
        const newUser = {
            username: "user",
            password: "mypsswd2",
            email: "newuser2@example.com",
        }

        const result = await api
            .post('/api/users/createUser')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        assert(result.body.error.includes('username already on use'))

        const usersAtEnd = usersModel.getAllUsers()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('see a existing profile', async () => {
        const userToView = usersModel.getUserByUsername("user");
        
        const result = await api
            .get(`/api/users/${userToView.id}`)
            .expect(200)
            .expect('Content-Type', /application\/json/);
        
        //Check that we are only getting the expected keys and values 
        //(id, username, email and role)
        const responseKeys = Object.keys(result.body);
        assert.strictEqual(responseKeys.length, 4);
        assert.strictEqual(result.body.id, userToView.id);
        assert.strictEqual(result.body.username, userToView.username);
        assert.strictEqual(result.body.email, userToView.email);
        assert.strictEqual(result.body.role, userToView.role);
    })

    test('see a non-existing profile', async () => { 
        const idThatDoesntExist = 23789;
        await api
            .get(`/api/users/${idThatDoesntExist}`)
            .expect(404)
    })

})


//Tests that require the token/role
describe('Create users tests (one for each role)', () => {
    beforeEach(async () => {
        db.exec('DELETE FROM users')
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.adminData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.organizerData))
        usersModel.createUser(await testHelper.getDataToCreateUser(testHelper.userData))
    });

    test('admin creates SpecialUser successfully', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.adminData))
        const token = temp.body.token
        
        //Same applies create another admin, since the unique thing that changes is the role String
        const newUser = {
            username: "newOrganizer",
            password: "mypsswd",
            email: "newOrganizer@example.com",
            role: "organizer"
        }
        
        await api
            .post('/api/users/createSpecialUser')
            .set('Authorization', `Bearer ${token}`)
            .send(newUser)
            .expect(201)
            .expect('Content-Type', /application\/json/)
        
        const user = usersModel.getUserByUsername(newUser.username)
        assert.strictEqual(user.username, 'newOrganizer')
    })

    test('No admin creates SpecialUser unsuccessfully', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.organizerData))
        const token = temp.body.token
        
        const usersAtStart = usersModel.getAllUsers()

        //Same applies create another admin, since the unique thing that changes is the role String
        const newUser = {
            username: "newOrganizer",
            password: "mypsswd",
            email: "newOrganizer@example.com",
            role: "organizer"
        }
        
        await api
            .post('/api/users/createSpecialUser')
            .set('Authorization', `Bearer ${token}`)
            .send(newUser)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        //Without token
        await api
            .post('/api/users/createSpecialUser')
            .send(newUser)
            .expect(401)
            .expect('Content-Type', /application\/json/)
        
        const usersAtEnd = usersModel.getAllUsers()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('Admin modifies user information successfully', async () => {
        const temp = await testHelper.loginHelper(api, testHelper.getLoginData(testHelper.adminData))
        const token = temp.body.token
        
        const user = usersModel.getUserByUsername('user')

        const toModify = {
            newPassword: "mypsswd",
            newEmail: "newOrganizer@example.com",
        }
        
        const result = await api
            .patch(`/api/users/${user.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(toModify)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        //Without token
        await api
            .patch(`/api/users/${user.id}`)
            .send(toModify)
            .expect(401)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.message, "User updated successfully")
    })
})