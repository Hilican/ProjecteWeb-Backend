const jwt = require("jsonwebtoken");
const videogamesRouter = require('express').Router()
const { videogamesModel } = require('../models')

videogamesRouter.get("/", (request, response) => {
    try {
        const videogames = videogamesModel.getAllvideogames()
        response.json(videogames);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

videogamesRouter.get("/:id", (request, response) => {
    const id = request.params.id
    
    try {
        const game = videogamesModel.getVideogameById(id)
        
        if(!game) return response.status(404).end()     
        response.json(game);
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

videogamesRouter.post("/", (request, response) => {
    try {
            const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
            if(!decodedToken.role || decodedToken.role !== "admin") {
                return response.status(401).json({error: "invalid token"});
            }
            
            const { name, description } = request.body
            if (!name || !description) {
                return response.status(400).json({ error: "missing name or description" });
            }
            
            const existName = videogamesModel.getVideogameByName(name)
            if (existName) {
                return response.status(400).json({ 
                    error: 'videogame name already exists' 
                });
            }

            const videogame = {
                name: name,
                description: description,
            };
            
            const savedVideogame = videogamesModel.addVideogame(videogame)
            response.status(201).json(savedVideogame)
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return response.status(401).json({ err: 'invalid token' });
            }
            console.error(err);
            response.status(500).json({ error: 'something went wrong' });
    }
})

videogamesRouter.delete("/:id", (request, response) => {
    const id = request.params.id
    try {
            const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
            if(!decodedToken.role || decodedToken.role !== "admin") {
                return response.status(401).json({error: "invalid token"});
            }
    
            videogamesModel.deleteVideogame(id)
            response.status(204).end()
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return response.status(401).json({ err: 'invalid token' });
            }
            console.error(err);
            response.status(500).json({ error: 'something went wrong' });
    }
})

module.exports = videogamesRouter