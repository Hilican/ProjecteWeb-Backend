const router = require("express").Router()
const { tournamentsModel, videogamesModel, gamesModel, usersModel} = require("../models")
const { decryptToken } = require("../utils/middleware")
const { getExistingParameters, hasAll, supportedTypes, createGames } = require("../utils/helper");

router.get("/", (request, response) => {
    try {
        const tournaments = tournamentsModel.getAllTournaments()
        response.json(tournaments);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id', (request, response) => {
    const id = request.params.id

    try {
        const tournament = tournamentsModel.getTournamentById(id)

        if(!tournament) return response.status(404).end()

        response.json(tournament);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id/participants', (request, response) => {
    const id = request.params.id

    try {
        const tournamentParticipants = tournamentsModel.getTournamentParticipants(id)
        if(!tournament) return response.status(404).end()
        response.json(tournament);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id/games', (request, response) => {
    const id = request.params.id

    try {
        const tournamentGames = gamesModel.getAllGamesFromTournament(id)
        if(!tournamentGames) return response.status(404).end()
        response.json(tournamentGames);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id/games/:gameId', (request, response) => {
    
    try {
        const id = request.params.id
        const gameId = request.params.gameId
    
        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        const tournamentGame = gamesModel.getGameById(gameId)
        
        if (!tournamentGame) {
            return response.status(404).json({ error: "Game not found" });
        }

        if (Number(tournamentGame.tournamentId) !== Number(id)) {
            return response.status(404).json({ error: "game not found in this tournament" });
        }
        response.json(tournamentGame);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

// --- REQUIRE AUTHENTICATION FOR THE ROUTES BELOW ---

router.post("/", decryptToken, (request, response) => {
    try { 
        //Check if the user is an organizer, only organizers can create tournaments
        if(request.user.role !== "organizer") {
            return response.status(401).json({error: "Only organizers can create a tournaments"});
        }
        
        //Check if all fields are in the body of the request
        const allowedFields = [
            "name", 
            "description", 
            "videogame", 
            "type", 
            "rounds", 
            "tournament_start_date", 
            "tournament_end_date"
        ];
        
        if (!hasAll(allowedFields, request)) {
            return response.status(400).json({ error: "All fields are required" });
        }
        
        //Checking if game exists
        const videogame = videogamesModel.getVideogameByName(request.body.videogame)
        if (!videogame) {
            return response.status(400).json({ 
                error: 'videogame not found' 
            });
        }
        // Making sure special fields obey the rules
        //No se pide pero lo añado porque me parece mas logico que el nombre del torneo sea unico
        const tempTournament = tournamentsModel.getTournamentByName(request.body.name)  
        if (tempTournament) {
            return response.status(400).json({ 
                error: 'tournament name must be unique' 
            });
        }
        
        //Por ahora solo se puede crear el tipo "torneig"
        if (!supportedTypes.includes(request.body.type)) {
            return response.status(400).json({ 
                error: 'This type of tournament isn\'t supported' 
            });
        }
    
        if (request.body.rounds < 0) {
            return response.status(400).json({ error: "Rounds must be a positive number" });
        }

        if (request.body.rounds > 30) {
            return response.status(400).json({ error: "Rounds must be less than 30" });
        }
    
        const tournament = { 
            name: request.body.name,
            description: request.body.description,
            videogame: videogame.id,
            type: request.body.type,
            rounds: request.body.rounds,
            tournament_start_date: request.body.tournament_start_date,
            tournament_end_date: request.body.tournament_end_date,
            organizer: request.user.id
        }

        const createdTournament = tournamentsModel.createTournament(tournament)
        createGames(createdTournament.type, createdTournament.rounds, createdTournament.id);
        response.status(201).json({createdTournament, 
            message: "Tournament and brackets generated successfully"
        })
    } catch (err) {
        response.status(500).json({err: err.message})
    }
})

router.delete("/:id", decryptToken, (request, response) => {
    const id = request.params.id

    const tournament = tournamentsModel.getTournamentById(id)
    if (!tournament) {
        return response.status(404).json({ error: "tournament not found" });
    }

    if(request.user.id !== tournament.orgnitzador) {
        return response.status(401).json({error: "Only the organizer can delete this tournament"});
    }

    try {
        tournamentsModel.deleteTournamentById(id)
        response.status(204).end()
    }catch(err) {
        response.status(500).json({error: err.message})
    } 
})


router.patch("/:id", decryptToken, (request, response) => {
    try {
        // Check tournament existence
        const {id} = request.params
        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }

        //Check that the user is the owner
        if (request.user.id !== tournament.organizer) {
            return response.status(403).json({ error: "Only the creator can modify this tournament" });
        }

        // Check if at least one field is provided, so the change needs to be made
        const allowedFields = [
            'description', 'videogame', 'type', 
            'tournament_start_date', 'tournament_end_date', 
            'stateRegistration', 'stateTournament'
        ];

        const existingParameters = getExistingParameters(allowedFields, request);

        if (!existingParameters) {
            return response.status(400).json({ 
                error: "Missing data", 
                message: `At least one of these fields is required`,
                validFields: allowedFields
            });
        }

        // Making sure special fields obey the rules
        if (existingParameters.stateRegistration !== undefined) {
            const allowedStates = ["PerObrir", "Oberta", "Tancada"];
            if (!allowedStates.includes(existingParameters.stateRegistration)) {
                return response.status(400).json({ error: "New 'state registration' not allowed" });
            }
        }

        if (existingParameters.stateTournament !== undefined) {
            const allowedStates = ["Anunciat", "inscripcions obertes", "en curs", "finalitzat"];
            if (!allowedStates.includes(existingParameters.stateTournament)) {
                return response.status(400).json({ error: "New 'state tournament' not allowed" });
            }
        }

        // With the torunament from database as a base, we update the fields that are in the body of the request
        // And make the change in the database
        allowedFields.forEach(field => {
            if (request.body[field] !== undefined) {
                tournament[field] = request.body[field];
            }
        });

        const result = tournamentsModel.changeTournamentState(id, tournament)
        if (!result) {
            return response.status(404).json({ error: "Could not update: Tournament not found" });
        }

        response.status(200).json({ message: "Tournament updated successfully" });
    }catch(err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return response.status(401).json({ error: 'token missing or invalid' });
        }

        console.error(err);
        response.status(500).json({ error: err.message });
    } 
})

router.patch("/:id/games/:gameId", decryptToken, (request, response) => {
    try {
        const {id, gameId} = request.params
        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "Tournament not found" });
        }
        const tournamentGame = gamesModel.getGameById(gameId)
        if (!tournamentGame) {
            return response.status(404).json({ error: "Game not found" });
        }
        
        if (Number(tournamentGame.tournamentId) !== Number(id)) {
            return response.status(404).json({ error: "game not found in this tournament" });
        }
        
        if (request.user.role !== "organizer" || request.user.id !== tournament.organizer) {
            return response.status(403).json({ error: "Only the creator can modify this tournament" });
        }

        if (Object.keys(request.body).length === 0) {
            return response.status(400).json({ error: "At least one field is required" });
        }

        //Check that fields exist
        const allowedFields = [
            'state', 
            'player1', 
            'player2', 
            'result',
        ];

        const existingParameters = getExistingParameters(allowedFields, request);
        if (!existingParameters) {
            return response.status(400).json({ 
                error: "Missing data", 
                message: `At least one of these fields is required`,
                validFields: allowedFields
            });
        }

        if (existingParameters.state) {
            const allowedStates = ["pendiente", "confirmado", "finalizado"];
            if (!allowedStates.includes(existingParameters.state)) {
                return response.status(400).json({ error: "New state not allowed" });
            }
        }

        if (existingParameters.result) {
            const allowedStates = [tournamentGame.player1, tournamentGame.player2, null];
            if (!allowedStates.includes(existingParameters.result)) {
                return response.status(400).json({ error: "New result not allowed" });
            }
        }

        if (existingParameters.player1) {
            const userPlayer1 = usersModel.getUserById(existingParameters.player1)
            if (!userPlayer1) {
                return response.status(400).json({ error: "Player 1 not found" });
            }
        }

        if (existingParameters.player2) {
            const userPlayer2 = usersModel.getUserById(existingParameters.player2)
            if (!userPlayer2) {
                return response.status(400).json({ error: "Player 2 not found" });
            }
        }

        const body = {
            state: existingParameters.state || tournamentGame.state,
            player1: existingParameters.player1 || tournamentGame.player1,
            player2: existingParameters.player2 || tournamentGame.player2,
            result: existingParameters.result || tournamentGame.result,
        }

        const resultSQL = gamesModel.modifyGame(gameId, body)
        if (!resultSQL) {
            return response.status(400).json({ error: "Could not update" });
        }

        response.status(200).json({ message: "Tournament game updated successfully" });
    }catch(err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return response.status(401).json({ error: 'token missing or invalid' });
        }

        console.error(err);
        response.status(500).json({ error: err.message });
    } 
})

router.post("/:id/register", decryptToken, (request, response) => {
    try {
        const id = request.params.id

        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }

        if(tournament.stateRegistration !== "Oberta") {
            return response.status(400).json({ error: "registration is not open" });
        }

        if (request.user.role !== "user") {
            return response.status(403).json({ error: "only users can register to tournaments" });
        }

        tournamentsModel.registerOnTournament(id, request.user.id)
        response.status(201).json({ message: "User registered to tournament successfully" })
    }catch(err) {
        // Si el error viene de JWT, es un problema de autenticación (401)
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return response.status(401).json({ error: 'token missing or invalid' });
        }

        // Si el error es de SQLite por intentar apuntarse dos veces (UNIQUE constraint)
        if (err.message.includes('UNIQUE')) {
            return response.status(400).json({ error: 'user already registered' });
        }

        console.error(err);
        response.status(500).json({ error: err.message });
    } 
})

router.delete('/:id/participants/:userId', decryptToken, (request, response) => {
    try {
        const {id, userId} = request.params
        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        const exists = tournamentsModel.isRegistered(id, userId)
        if (!exists) {
            return response.status(404).json({ error: "user not registered in tournament" });
        }

        if(!request.user.id || !request.user.role) {
            return response.status(401).json({error: "invalid token"});
        }

        // Convertimos todo a Number para comparar con seguridad
        const userIdNum = Number(userId);
        const organizerId = Number(tournament.organizer);

        if (request.user.id !== organizerId && request.user.id !== userIdNum) {
            return response.status(403).json({ error: "You can't unregister this user" });
        }

        tournamentsModel.unregisterOnTournament(id, userId)
        response.json("User unregistered successfully");
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

module.exports = router