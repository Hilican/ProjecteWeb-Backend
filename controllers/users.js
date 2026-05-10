require('dotenv').config();

const bcrypt = require('bcrypt')
const usersRouter = require("express").Router()
const { usersModel } = require("../models")
const { hasAll, getExistingParameters, getIntParams } = require("../utils/helper");
const { decryptToken } = require("../utils/middleware")

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
    //Check if all fields are in the body of the request
    const allowedFields = [
        "username",
        "password",
        "email"
    ];

    if (!hasAll(allowedFields, request)) {
        return response.status(400).json({ 
            error: "All fields are required",
            fields: allowedFields
        });
    }

    const { username, password, email } = request.body

    //Check unique variables aren't taken
    const existsUsername = usersModel.getUserByUsername(username);
    if (existsUsername) {
        return response.status(400).json({ 
            error: 'username already on use' 
        });
    }

    const existsEmail = usersModel.getUserByEmail(email);
    if (existsEmail) {
        return response.status(400).json({ 
            error: 'email already on use' 
        });
    }
    
    // Create password hash
    const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create the user
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
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }

    try {
        const user = usersModel.getUserById(toTakeList.id)
        if(!user) {
            return response.status(404).end()
        }
        response.json(user);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

// --- REQUIRE AUTHENTICATION FOR THE ROUTES BELOW ---
usersRouter.post("/createSpecialUser", decryptToken, async (request, response) => {
    //Check who is doing this is an admin
    if(request.user.role !== "admin") {
        return response.status(401).json({error: "invalid token"});
    }

    //Check if all fields are in the body of the request
    const allowedFields = [
        "username",
        "password",
        "email",
        "role"
    ];

    if (!hasAll(allowedFields, request)) {
        return response.status(400).json({ 
            error: "All fields are required",
            fields: allowedFields
        });
    }

    const { username, password, email, role } = request.body

    //Check unique variables aren't taken
    let exists = usersModel.getUserByUsername(username);
    if (exists) {
        return response.status(400).json({ 
            error: 'username already on use' 
        });
    }

    exists = usersModel.getUserByEmail(email);
    if (exists) {
        return response.status(400).json({ 
            error: 'email already on use' 
        });
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    //Create user
    const user = {
        username: username,
        passwordHash: passwordHash,
        email: email,
        role: role
    };

    try {
        const savedUser = await usersModel.createUser(user);
        return response.status(201).json(savedUser);
    } catch (error) {
        console.error("Error al crear usuario:", error);
        if (err.message.includes('UNIQUE')) {
            return response.status(400).json({ error: 'user already registered' });
        }

        return response.status(500).send("Error interno del servidor.");
    }
})

usersRouter.patch("/:id", decryptToken, async (request, response) => {
    try {
        const toTake = [
            'id',
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        //Check if all fields are in the body of the request
        const allowedFields = ['newPassword', 'newEmail'];
        const existingParameters = getExistingParameters(allowedFields, request);
        if (!existingParameters) {
            return response.status(400).json({ 
                error: "Missing data", 
                message: `At least one of these fields is required`,
                validFields: allowedFields
            });
        }

        const user = usersModel.getUserById(toTakeList.id)
        if (!user) {
            return response.status(404).json({ error: "user not found" });
        }

        if(request.user.role !== "admin" && request.user.id !== user.id) {
            return response.status(401).json({error: "you can't update this user"});
        }

        let passwordHash = null
        if(existingParameters.newPassword)
        {
            const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
            const passwordHash = await bcrypt.hash(existingParameters.newPassword, saltRounds);
        }

        if(existingParameters.newEmail) {
            const existEmail = usersModel.getUserByEmail(existingParameters.newEmail);
            if (existEmail) {
                return response.status(400).json({ 
                    error: 'email already on use' 
                });
            }
        }
        
        usersModel.updateUser(toTakeList.id, existingParameters.newEmail, passwordHash)
        return response.status(200).json({ message: "User updated successfully" })
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: err.message });
    }
})

module.exports = usersRouter
