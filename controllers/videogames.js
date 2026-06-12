const jwt = require("jsonwebtoken");
const videogamesRouter = require('express').Router()
const { videogamesModel } = require('../models')
const { decryptToken } = require("../utils/middleware")
const { hasAll, getExistingParameters, getIntParams } = require("../utils/helper");

videogamesRouter.get("/", (request, response) => {
    try {
        const videogames = videogamesModel.getAllvideogames()
        response.json(videogames);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

videogamesRouter.get("/:id", (request, response) => {
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }
    
    try {
        const game = videogamesModel.getVideogameById(toTakeList.id)
        
        if(!game) return response.status(404).end()     
        response.json(game);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

// --- REQUIRE AUTHENTICATION FOR THE ROUTES BELOW ---
videogamesRouter.post("/", decryptToken, async (request, response) => {
    try {
        if(request.user.role !== "admin") {
            return response.status(401).json({error: "invalid token"});
        }
        
        const allowedFields = ['name', 'description'];
        if (!hasAll(allowedFields, request)) {
            return response.status(400).json({ 
                error: "Missing data", 
                message: `name and description fields are required`,
                validFields: allowedFields
            });
        }
        const { name , description} = request.body
        const existName = videogamesModel.getVideogameByName(name)
        if (existName) {
            return response.status(400).json({ 
                error: 'name already on use' 
            });
        }

        const videogame = {
            name: name,
            description: description,
        };
        
        const savedVideogame = videogamesModel.addVideogame(videogame)
        response.status(201).json(savedVideogame)
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: 'something went wrong' });
    }
})

videogamesRouter.delete("/:id", decryptToken, (request, response) => {
    try {
        const toTake = [
            'id',
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        if(!videogamesModel.getVideogameById(toTakeList.id)) {
            return response.status(404).json({ error: 'videogame not found' });
        }

        if(request.user.role !== "admin") {
            return response.status(401).json({error: "only admins can delete videogames"});
        }

        videogamesModel.deleteVideogame(toTakeList.id)
        response.status(204).end()
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: 'something went wrong' });
    }
})

module.exports = videogamesRouter