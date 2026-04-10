const config = require("./config")
const better_sqlite3 = require('better-sqlite3');

const db = better_sqlite3(
    config.SQLITE_URL
);

module.exports = db