const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken");
const usersRouter = require("express").Router()
const { usersModel } = require("../models")

usersRouter.get("/", (request, response) => {
    try {
        const users = usersModel.getAllUsers()
        response.json(users);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

//Podria ser el /signUp, lo dejo asi por simplificacion
usersRouter.post("/createUser", async (request, response) => {
    const { username, password, email } = request.body

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (!username || !password || !email) {
        return response.status(400).json({ error: "missing username, password or/and email" });
    }

    const existsUsername = usersModel.getUserByUsername(username);

    if (existsUsername) {
        return response.status(400).json({ 
            error: 'username must be unique' 
        });
    }

    const existsEmail = usersModel.getUserByEmail(email);

    if (existsEmail) {
        return response.status(400).json({ 
            error: 'email already on use' 
        });
    }

    const user = {
        username: username,
        passwordHash: passwordHash,
        email: email,
        role: "user"
    };

    const savedUser = usersModel.createUser(user);
    response.status(201).json(savedUser);
})

usersRouter.get("/:id", (request, response) => {
    const id = request.params.id
    
    try {
        const user = usersModel.getSimpleUserById(id)
        
        if(!user) return response.status(404).end()     
        response.json(user);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

const getTokenFrom = request => {
    const authorization = request.get("authorization")
    if (authorization && authorization.startsWith("Bearer ")) {
        return authorization.replace("Bearer ", "")
    }
    return null
}

usersRouter.post("/createSpecialUser", async (request, response) => {

    try {
        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
        if(!decodedToken.role || decodedToken.role !== "admin") {
            return response.status(401).json({error: "invalid token"});
        }

        const { username, password, email, role } = request.body
        if (!username || !password || !email || !role) {
            return response.status(400).json({ error: "missing username, password, email or/and role" });
        }

        const existsUsername = usersModel.getUserByUsername(username);

        if (existsUsername) {
            return response.status(400).json({ 
                error: 'username must be unique' 
            });
        }

        const existsEmail = usersModel.getUserByEmail(email);

        if (existsEmail) {
            return response.status(400).json({ 
                error: 'email already on use' 
            });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const user = {
            username: username,
            passwordHash: passwordHash,
            email: email,
            role: role
        };

        const savedUser = usersModel.createUser(user);
        response.status(201).json(savedUser);
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return response.status(401).json({ err: 'invalid token' });
        }
        console.error(err);
        response.status(500).json({ error: 'something went wrong' });
    }
})

usersRouter.patch("/:id/changeInfo", async (request, response) => {
    try {
        const id = request.params.id
        
        const {newPassword, newEmail} = request.body;
        
        if (!newPassword && !newEmail) {
            return response.status(400).json({ error: "Nothing to change" });
        }

        const user = usersModel.getSimpleUserById(id)
        if (!user) {
            return response.status(404).json({ error: "user not found" });
        }
        
        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
        if(!decodedToken.id || !decodedToken.role) {
            return response.status(401).json({error: "invalid token"});
        }

        if (decodedToken.role === "admin" || decodedToken.id === user.id) {
            let passwordHash = null
            if(newPassword)
            {
                const saltRounds = 10;
                passwordHash = await bcrypt.hash(newPassword, saltRounds);
            }

            usersModel.updateUser(id, newEmail, passwordHash)
            return response.status(200).json({ message: "User updated successfully" })
        }else
        {
            return response.status(401).json({error: "invalid token"});
        }
    }catch(err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return response.status(401).json({ error: 'token missing or invalid' });
        }

        console.error(err);
        response.status(500).json({ error: err.message });
    } 
})

module.exports = usersRouter
