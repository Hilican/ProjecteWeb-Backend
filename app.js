const express = require("express");

const app = express();

app.get("/", (request, response) => {
    response.send(`<html><head></head><body><h1>P1 REST API</h1></body></html>`)
})
