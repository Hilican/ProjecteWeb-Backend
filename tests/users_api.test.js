const supertest = require("supertest");
const bcrypt = require("bcrypt")
const {describe, beforeEach, test} = require("node:test");
const assert = require("node:assert")
const app = require("../app");
const { usersModel } = require("../models")
const db = require("../utils/db");

const api = supertest(app);

//Tests that doesn't require the token/role
describe('Create users tests', () => {
    beforeEach(async () => {
        db.exec('DELETE FROM users')

        const userUser = {
            username: "user",
            passwordHash: await bcrypt.hash("3", 10),
            email: "user@example.com",
            role: "user"
        }
        usersModel.createUser(userUser)
    });

    test('creation succeeds with a fresh username', async () => {
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

        assert(result.body.error.includes('username must be unique'))

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

    test('admin creates SpecialUser successfully', async () => {
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
        const logInData = {
            username: 'root',
            password: 'root1'
        }
        
        const temp = await api
            .post('/api/login')
            .send(logInData)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const token = temp.body.token
        
        const user = usersModel.getUserByUsername('user')

        const toModify = {
            newPassword: "mypsswd",
            email: "newOrganizer@example.com",
        }
        
        const result = await api
            .patch(`/api/users/${user.id}/changeInfo`)
            .set('Authorization', `Bearer ${token}`)
            .send(toModify)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        //Without token
        await api
            .patch(`/api/users/${user.id}/changeInfo`)
            .send(toModify)
            .expect(401)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(result.body.message, "User updated successfully")
    })
})