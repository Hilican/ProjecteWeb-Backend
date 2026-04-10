const express = require("express");

const { initDb } = require("./models")
const tournamentsRouter = require("./controllers/tournaments");
const usersRouter = require("./controllers/users");
const loginRouter = require("./controllers/login");
const videogamesRouter = require("./controllers/videogames");

initDb()

const app = express();

app.use(express.json())

app.use("/api/tournaments", tournamentsRouter);
app.use("/api/users", usersRouter);
app.use("/api/login", loginRouter);
app.use("/api/videogames", videogamesRouter);

app.get("/", (request, response) => {
    response.send(`<html><head></head><body><h1>P1 REST API</h1></body></html>`)
})

module.exports = app;