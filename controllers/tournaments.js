const router = require("express").Router()
const { tournamentsModel, videogamesModel, gamesModel, usersModel} = require("../models")
const { decryptToken } = require("../utils/middleware")
const { getExistingParameters, hasAll, supportedTypes, createGames, getIntParams } = require("../utils/helper");

router.get("/", (request, response) => {
    try {
        const tournaments = tournamentsModel.getAllTournamentsExtended()
        response.json(tournaments);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id', (request, response) => {
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }

    try {
        const tournament = tournamentsModel.getTournamentExtendedById(toTakeList.id)

        if(!tournament) return response.status(404).end()

        response.json(tournament);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id/participants', (request, response) => {
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }

    try {
        const tournamentParticipants = tournamentsModel.getTournamentRegistrationExtended(toTakeList.id)
        if (!tournamentParticipants) {
            return response.status(404).json({ error: "tournament not found" });
        }
        return response.json(tournamentParticipants);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id/games', (request, response) => {
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }

    try {
        const tournamentGames = gamesModel.getAllGamesFromTournamentExtended(toTakeList.id)
        if(!tournamentGames) return response.status(404).end()
        response.json(tournamentGames);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/:id/games/:gameId', (request, response) => {
    try {
        const toTake = [
            'id',
            'gameId'
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }
    
        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        const tournamentGame = gamesModel.getGameById(toTakeList.gameId)
        
        if (!tournamentGame) {
            return response.status(404).json({ error: "Game not found" });
        }

        if (tournamentGame.tournamentId !== toTakeList.id) {
            return response.status(404).json({ error: "game not found in this tournament" });
        }
        response.json(tournamentGame);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

router.get('/games/:gameId', (request, response) => {
    try {
        const toTake = [
            'gameId'
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const game = gamesModel.getGameById(toTakeList.gameId)
        if (!game) {
            return response.status(404).json({ error: "Game not found" });
        }

        response.json(game);
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

// --- REQUIRE AUTHENTICATION FOR THE ROUTES BELOW ---
//POST, DELETE AND PATCH FOR TOURNAMENTS
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
    const toTake = [
        'id',
    ]; 
    
    const toTakeList = getIntParams(toTake, request, response);
    if (!toTakeList) {
        return;
    }

    const tournament = tournamentsModel.getTournamentById(toTakeList.id)
    if (!tournament) {
        return response.status(404).json({ error: "tournament not found" });
    }

    if(request.user.id !== tournament.organizer) {
        return response.status(401).json({error: "Only the organizer can delete this tournament"});
    }

    try {
        tournamentsModel.deleteTournamentById(toTakeList.id)
        response.status(204).end()
    }catch(err) {
        response.status(500).json({error: err.message})
    } 
})

router.patch("/:id", decryptToken, (request, response) => {
    try {
        // Check tournament existence
        const toTake = [ 'id' ];
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
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
        
        if (existingParameters.videogame !== undefined) {
            const videogame = videogamesModel.getVideogameByName(existingParameters.videogame);
            if (!videogame) {
                return response.status(400).json({ 
                    error: 'videogame not found' 
                });
            }
            request.body.videogame = videogame.id;
        }

        // With the torunament from database as a base, we update the fields that are in the body of the request
        // And make the change in the database
        allowedFields.forEach(field => {
            if (request.body[field] !== undefined) {
                tournament[field] = request.body[field];
            }
        });

        const result = tournamentsModel.changeTournamentState(toTakeList.id, tournament)
        if (!result) {
            return response.status(404).json({ error: "Could not update: Tournament not found" });
        }

        return response.status(200).json({ message: "Tournament updated successfully" });
    }catch(err) {
        console.error(err);
        return response.status(500).json({ error: err.message });
    } 
})

//PATCH FOR TOURNAMENT GAMES, to modify/define the result of the game
//Create/delete automatically with tournament creation/deletion
router.patch("/games/:gameId", decryptToken, (request, response) => {
    try {
        const toTake = [
            'gameId'
        ];

        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return response.status(400).json({ error: "Missing required parameters" });
        }

        const tournamentGame = gamesModel.getGameById(toTakeList.gameId)
        if (!tournamentGame) {
            return response.status(404).json({ error: "Game not found" });
        }

        const tournament = tournamentsModel.getTournamentById(tournamentGame.tournamentId)
        if (!tournament) {
            return response.status(404).json({ error: "Tournament associated with this game not found" });
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
            const allowedStates = ["ToDefinePlayers", "ToPlay", "Played"];
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

        const resultSQL = gamesModel.modifyGame(toTakeList.gameId, body)
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

//GET USER ENROLLED TOURNAMENTS
router.get("/user/username/:username", decryptToken, (request, response) => {
    try {
        if(request.params.username !== request.user.username) {
            return response.status(403).json({ error: "You can't check this user registrations" });
        }  
        const userTournaments = tournamentsModel.getUserRegistrationsByUsername(request.params.username)
        return response.status(200).json(userTournaments);  
    }catch(err) {
        console.error(err);
        return response.status(500).json({ error: err.message });
    } 
})

//NEED TO DO THE TESTS FOR SUPPORT ROLE LIST
//GET ORGANIZER TOURNAMENTS (OWNER & SUPPORT ROLE)
router.get("/organizer/username/:username", decryptToken, (request, response) => {
    try {
        const { username } = request.params;
        const user = usersModel.getUserByUsername(username)
        if (!user) {
            return response.status(404).json({ error: "user not found" });
        }

        if(request.user.role !== "admin" && request.user.username !== user.username) {
            return response.status(403).json({error: "you can't see this user tournaments"});
        }
        
        const tournaments = tournamentsModel.getAllOrganizerTournamentsByName(user.username)
        const supportTournaments = tournamentsModel.getAllOrganizerSupportTournamentsByName(user.username)
        return response.status(200).json({ tournaments, supportTournaments })
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: err.message });
    }
})

//POST, DELETE FOR TOURNAMENTS INSCRIPTIONS
//GET TOURNAMENTS PARTICIPANTS is public (above in this file)
router.get('/:id/participants/username/:username', decryptToken, (request, response) => {
    try {
        const toTake = [ 'id' ]; 
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        const user = usersModel.getUserByUsername(request.params.username)
        if(!user)
        {
            return response.status(404).json({ error: "User not found" });
        }

        const isRegistered = tournamentsModel.isRegisteredByUsername(toTakeList.id, user.username)
        if (!isRegistered) {
            return response.json({ isRegistered : false });
        }
        return response.json({isRegistered : true});
    } catch (err) {
        return response.status(500).json({error: err.message})
    }
})

router.post("/:id/participants", decryptToken, (request, response) => {
    try {
        const toTake = [
            'id',
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }

        if(tournament.stateRegistration !== "Oberta") {
            return response.status(400).json({ error: "registration is not open" });
        }

        if (request.user.role !== "user") {
            return response.status(403).json({ error: "only users can register to tournaments" });
        }

        tournamentsModel.registerUserOnTournament(toTakeList.id, request.user.id)
        response.status(201).json({ message: "User registered to tournament successfully" })
    }catch(err) {
        // Si el error es de SQLite por intentar apuntarse dos veces (UNIQUE constraint)
        // Can happen for race conditions
        if (err.message.includes('UNIQUE')) {
            return response.status(400).json({ error: 'user already registered' });
        }

        console.error(err);
        response.status(500).json({ error: err.message });
    } 
})

router.delete('/:id/participants/id/:userId', decryptToken, (request, response) => {
    try {
        const toTake = [
            'id',
            'userId'
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        const isRegistered = tournamentsModel.isRegisteredById(toTakeList.id, toTakeList.userId)
        if (!isRegistered) {
            return response.status(404).json({ error: "user not registered in tournament" });
        }

        if (request.user.id !== tournament.organizer && request.user.id !== toTakeList.userId) {
            return response.status(403).json({ error: "You can't unregister this user" });
        }

        tournamentsModel.unregisterUserFromTournament(toTakeList.id, toTakeList.userId)
        response.json("User unregistered successfully");
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

//NEED TO TEST
router.delete('/:id/participants/username/:username', decryptToken, (request, response) => {
    try {
        const toTake = [ 'id' ]; 
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        const user = usersModel.getUserByUsername(request.params.username)
        if(!user)
        {
            return response.status(404).json({ error: "User not found" });
        }

        const isRegistered = tournamentsModel.isRegisteredByUsername(toTakeList.id, user.username)
        if (!isRegistered) {
            return response.status(404).json({ error: "user not registered in tournament" });
        }

        if (request.user.id !== tournament.organizer && request.user.id !== user.id) {
            return response.status(403).json({ error: "You can't unregister this user" });
        }

        tournamentsModel.unregisterUserFromTournament(toTakeList.id, user.id)
        return response.json("User unregistered successfully");
    } catch (err) {
        return response.status(500).json({error: err.message})
    }
})

//GET, POST, DELETE FOR TOURNAMENT EXTRA ORGANIZERS
router.get("/:id/organizers", decryptToken, (request, response) => {
    try {
        const toTake = ['id'];
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }
        
        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({error : "Tournament not found."} );
        }

        if(tournament.organizer !== request.user.id || request.user.role === "admin")
        {
            return response.status(403).json({error : "Only the main organizer or admins can see this"} );
        }

        const organizers = tournamentsModel.getTournamentSupportsExtended(toTakeList.id)
        return response.status(200).json({organizers: organizers});
    }catch(err) {
        console.error(err);
        return response.status(500).json({ error: err.message });
    } 
})

router.post("/:id/organizers", decryptToken, (request, response) => {
    try {
        const toTake = [
            'id',
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }

        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }

        if (request.user.id !== tournament.organizer) {
            return response.status(403).json({ error: "only the organizer can add support organizers" });
        }

        const orgToAddId = Number(request.body.organizerToAdd)
        const userToAddInfo = usersModel.getUserById(orgToAddId)
        if(!userToAddInfo)
        {
            return response.status(404).json({ error: "organizer to add not found"});
        }

        if (userToAddInfo.role !== "organizer") {
            return response.status(403).json({ error: "only organizers can be added as support organizers"});
        }

        if(userToAddInfo.id === tournament.organizer) {
            return response.status(403).json({ error: "The organizer cannot be added as a support organizer" });
        }

        if(tournamentsModel.isTournamentSupport(toTakeList.id, orgToAddId)) {
            return response.status(400).json({ error: "User is already a support organizer of this tournament" });
        }

        tournamentsModel.registerTournamentSupport(toTakeList.id, userToAddInfo.id)
        response.status(201).json({ message: "Support organizer registered to tournament successfully" })
    }catch(err) {
        // Si el error es de SQLite por intentar apuntarse dos veces (UNIQUE constraint)
        // Can happen for race conditions
        if (err.message.includes('UNIQUE')) {
            return response.status(400).json({ error: 'user already registered' });
        }

        console.error(err);
        response.status(500).json({ error: err.message });
    } 
})

router.delete('/:id/organizers/:userId', decryptToken, (request, response) => {
    try {
        const toTake = [
            'id',
            'userId'
        ]; 
        
        const toTakeList = getIntParams(toTake, request, response);
        if (!toTakeList) {
            return;
        }
        
        const tournament = tournamentsModel.getTournamentById(toTakeList.id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        if(request.user.id !== tournament.organizer) {
            return response.status(403).json({ error: "only the organizer can manage support organizers" });
        }

        const isSupportOrganizer = tournamentsModel.isTournamentSupport(toTakeList.id, toTakeList.userId)
        if (!isSupportOrganizer) {
            return response.status(404).json({ error: "user is not registered as a support organizer in this tournament" });
        }

        tournamentsModel.unregisterTournamentSupport(toTakeList.id, toTakeList.userId)
        response.json("User unregistered successfully");
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

module.exports = router