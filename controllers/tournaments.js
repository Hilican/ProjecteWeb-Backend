const router = require("express").Router()
const { tournamentsModel, videogamesModel, gamesModel, usersModel} = require("../models")

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

const getTokenFrom = request => {
    const authorization = request.get("authorization")
    if (authorization && authorization.startsWith("Bearer ")) {
        return authorization.replace("Bearer ", "")
    }
    return null
}

const jwt = require("jsonwebtoken");

router.post("/", (request, response) => {
    try {
        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
    
        if(!decodedToken.id || !decodedToken.role) {
            return response.status(401).json({error: "invalid token"});
        }
        
        if(decodedToken.role !== "organizer") {
            return response.status(401).json({error: "invalid token"});
        }
    
        if (Object.keys(request.body).length !== 7) {
            return response.status(400).json({ error: "All fields are required" });
        }
    
        const videogame = videogamesModel.getVideogameByName(request.body.videogame)  
        if (!videogame) {
            return response.status(404).json({ error: "Video game not found" });
        }
    
        //No se especifica pero lo añado porque me parece mas logico que este
        const tempTournament = tournamentsModel.getTournamentByName(request.body.name)  
        if (tempTournament) {
            return response.status(400).json({ 
                error: 'tournament name must be unique' 
            });
        }
    
        const allowedStates = ["torneig"];
        if (!allowedStates.includes(request.body.type)) {
            return response.status(400).json({ error: "This type of tournament isn't supported" });
        }
    
        if (request.body.rounds < 0) {
            return response.status(400).json({ error: "Rounds must be a positive number" });
        }
    
        if (request.body.type > 30) {
            return response.status(400).json({ error: "Tournament type must be a number between 1 and 30" });
        }
    
        const tournament = { 
            name: request.body.name,
            description: request.body.description,
            videogame: videogame.id,
            type: request.body.type,
            rounds: request.body.rounds,
            tournament_start_date: request.body.tournament_start_date,
            tournament_end_date: request.body.tournament_end_date,
            organizer: decodedToken.id
        }

        const createdTournament = tournamentsModel.createTournament(tournament)

        if(createdTournament.type === "torneig")
        {
            const totalRounds = createdTournament.rounds;
            // Recorremos desde la ronda 1 hasta la N
            for (let round = 1; round <= totalRounds; round++) {
                // Calculamos cuántos partidos hay en esta ronda (2 elevado a la ronda-1)
                // Ejemplo: Ronda 1 = 1 partido, Ronda 2 = 2, Ronda 3 = 4...
                const gamesInRound = Math.pow(2, round - 1);

                for (let i = 1; i <= gamesInRound; i++) {
                    // Creamos el partido en la base de datos
                    gamesModel.createGame(createdTournament.id, round);
                }
            }
        }
        response.status(201).json({createdTournament, 
            message: "Tournament and brackets generated successfully"
        })
    } catch (err) {
        response.status(500).json({err: err.message})
    }
})

router.delete("/:id", (request, response) => {
    const id = request.params.id

    const tournament = tournamentsModel.getTournamentById(id)
    if (!tournament) {
        return response.status(404).json({ error: "tournament not found" });
    }

    const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

    if(!decodedToken.id || decodedToken.id !== tournament.orgnitzador) {
        return response.status(401).json({error: "invalid token"});
    }

    try {
        tournamentsModel.deleteTournamentById(id)
        response.status(204).end()
    }catch(err) {
        response.status(500).json({error: err.message})
    } 
})


router.patch("/:id", (request, response) => {
    try {
        const {id} = request.params

        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
        if(!decodedToken.id || !decodedToken.role || decodedToken.role !== "organizer") {
            return response.status(401).json({error: "invalid token"});
        }

        if (decodedToken.id !== tournament.organizer) {
            return response.status(403).json({ error: "Only the creator can modify this tournament" });
        }
        const { 
            description, 
            videogame, 
            type, 
            tournament_start_date, 
            tournament_end_date, 
            stateRegistration,
            stateTournament,
        } = request.body;
        
        if (Object.keys(request.body).length === 0) {
            return response.status(400).json({ error: "At least one field is required" });
        }

        if (stateRegistration !== undefined) {
            const allowedStates = ["PerObrir", "Oberta", "Tancada"];
            if (!allowedStates.includes(stateRegistration)) {
                return response.status(400).json({ error: "New state registration not allowed" });
            }
        }


        if (stateTournament !== undefined) {
            const allowedStates = ["Anunciat", "inscripcions obertes", "en curs", "finalitzat"];
            if (!allowedStates.includes(stateTournament)) {
                return response.status(400).json({ error: "New state tournament not allowed" });
            }
        }

        const body = {
            description: description || tournament.description,
            videogame: videogame || tournament.videogame,
            type: type || tournament.type,
            tournament_start_date: tournament_start_date || tournament.tournament_start_date,
            tournament_end_date: tournament_end_date || tournament.tournament_end_date,
            stateRegistration: stateRegistration || tournament.stateRegistration,
            stateTournament: stateTournament || tournament.stateTournament
        }

        const result = tournamentsModel.changeTournamentState(id, body)
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

router.patch("/:id/games/:gameId", (request, response) => {
    try {
        const {id, gameId} = request.params
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
        
        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
        if(!decodedToken.id || !decodedToken.role || decodedToken.role !== "organizer") {
            return response.status(401).json({error: "invalid token"});
        }

        if (decodedToken.id !== tournament.organizer) {
            return response.status(403).json({ error: "Only the creator can modify this tournament" });
        }

        if (Object.keys(request.body).length === 0) {
            return response.status(400).json({ error: "At least one field is required" });
        }

        const { 
            state,
            player1, 
            player2, 
            result,
        } = request.body;

        if (state !== undefined) {
            const allowedStates = ["pendiente", "confirmado", "finalizado"];
            if (!allowedStates.includes(state)) {
                return response.status(400).json({ error: "New state not allowed" });
            }
        }

        if (result !== undefined) {
            const allowedStates = [tournamentGame.player1, tournamentGame.player2, null];
            if (!allowedStates.includes(result)) {
                return response.status(400).json({ error: "New result not allowed" });
            }
        }

        if (player1 !== undefined) {
            const userPlayer1 = usersModel.getUserById(player1)
            if (!userPlayer1) {
                return response.status(400).json({ error: "Player 1 not found" });
            }
        }

        if (player2 !== undefined) {
            const userPlayer2 = usersModel.getUserById(player2)
            if (!userPlayer2) {
                return response.status(400).json({ error: "Player 2 not found" });
            }
        }

        const body = {
            state: state || tournamentGame.state,
            player1: player1 || tournamentGame.player1,
            player2: player2 || tournamentGame.player2,
            result: result || tournamentGame.result,
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

router.post("/:id/register", (request, response) => {
    try {
        const id = request.params.id

        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }

        if(tournament.stateRegistration !== "Oberta") {
            return response.status(400).json({ error: "registration is not open" });
        }

        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

        if(!decodedToken.id || !decodedToken.role) {
            return response.status(401).json({error: "invalid token"});
        }

        if (decodedToken.role !== "user") {
            return response.status(403).json({ error: "only users can register to tournaments" });
        }

        tournamentsModel.registerOnTournament(id, decodedToken.id)
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

router.delete('/:id/participants/:userId', (request, response) => {
    try {
        const id = request.params.id
        const userId = request.params.userId
        const tournament = tournamentsModel.getTournamentById(id)
        if (!tournament) {
            return response.status(404).json({ error: "tournament not found" });
        }
        
        const exists = tournamentsModel.isRegistered(id, userId)
        if (!exists) {
            return response.status(404).json({ error: "user not registered in tournament" });
        }

        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
        if(!decodedToken.id || !decodedToken.role) {
            return response.status(401).json({error: "invalid token"});
        }

        // Convertimos todo a Number para comparar con seguridad
        const userIdNum = Number(userId);
        const organizerId = Number(tournament.organizer);

        if (decodedToken.id !== organizerId && decodedToken.id !== userIdNum) {
            return response.status(403).json({ error: "You can't unregister this user" });
        }

        tournamentsModel.unregisterOnTournament(id, userId)
        response.json("User unregistered successfully");
    } catch (err) {
        response.status(500).json({error: err.message})
    }
})

module.exports = router