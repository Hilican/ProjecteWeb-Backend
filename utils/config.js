require('dotenv').config()

const PORT = process.env.PORT
const SQLITE_URL = process.env.NODE_ENV === "test"
    ? ":memory:"
    : process.env.SQLITE_URL

module.exports = { PORT, SQLITE_URL };