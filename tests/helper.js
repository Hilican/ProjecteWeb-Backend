const bcrypt = require('bcrypt');

const createHash = async (password, saltRounds = 10) => {
    return await bcrypt.hash(password, saltRounds); 
};

const adminData = {
    username: "admin",
    password: "admin1",
    email: "admin@example.com",
    role: "admin"
};

const organizerData = {
    username: "organizer",
    password: "organizer1",
    email: "organizer@example.com",
    role: "organizer"
};

const userData = {
    username: "user",
    password: "user1",
    email: "user@example.com",
    role: "user"
};

const userPlayer1Data = {
    username: "player1",
    password: "player1",
    email: "player1@example.com",
    role: "user"
};

const userPlayer2Data = {
    username: "player2",
    password: "player2",
    email: "player2@example.com",
    role: "user"
};

const getDataToCreateUser = async (userData) => {
    return {
        username: userData.username,
        passwordHash: await createHash(userData.password),
        email: userData.email,
        role: userData.role
    }
};

const getLoginData = (userData) => {
    return {
        username: userData.username,
        password: userData.password
    }
}

const videogameData = {
    name: "COD:BO2",
    description: "Patata"
};

const tournamentData = {
    name: "tournament4",
    description: "description1",
    videogame: videogameData.name,
    type: "torneig",
    rounds: 3,
    tournament_start_date: "2023-01-01",
    tournament_end_date: "2023-01-02",
};

const loginHelper = async (api, logInData, expectedStatus = 200) => {
    const result = await api
        .post('/api/login')
        .send(logInData)
        .expect(expectedStatus)
        .expect('Content-Type', /application\/json/);
    
    return result; // Devolvemos el resultado completo
};

module.exports = { 
    adminData, organizerData, userData,
    getDataToCreateUser, getLoginData,
    videogameData, tournamentData,
    userPlayer1Data, userPlayer2Data,
    loginHelper,
};