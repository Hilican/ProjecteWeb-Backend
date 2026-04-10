const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const usersModel = require('../models/users')

const loginRouter = require('express').Router()

loginRouter.post("/", async (request, response) => {
    const {username, password} = request.body;

    const user = usersModel.getUserByUsername(username);
    const passwordCorrect = user
        ? await bcrypt.compare(password, user.passwordHash)
        : false;
    
    if(!passwordCorrect) {
        return response.status(401).json({
            error: "invalid username or password"
        });
    }

    const userForToken = {
        username: user.username,
        id: user.id,
        role: user.role,
    };

    const token = jwt.sign(
        userForToken,
        process.env.SECRET,
        { expiresIn: '20m' }
    );

    response
        .status(200)
        .send({ token, username: user.username, role: user.role });
})


module.exports = loginRouter;