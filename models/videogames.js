const db = require("../utils/db");

const getAllvideogames = () => {
    const q = db.prepare(`
        SELECT *
        FROM videogames
    `);
    const videogames = q.all()
    return videogames;
}

const getVideogameByName = name => {
    const q = db.prepare(`
        SELECT *
        FROM videogames
        WHERE name=?
    `);

    const videogame = q.get(name)
    return videogame;
}

const getVideogameById = id => {
    const q = db.prepare(`
        SELECT *
        FROM videogames
        WHERE id=?
    `);

    const videogame = q.get(id)
    return videogame;
}

const addVideogame = (videogame) => {
    const {name, description} = videogame;
    const q = db.prepare(`
        INSERT INTO videogames
        (name, description)
        VALUES (?,?)
    `);

    const info = q.run(name, description);

    return {
        id: info.lastInsertRowid,
        name: name,
        description: description
    }
}

const deleteVideogame = (id) => {
    const q = db.prepare(`
        DELETE FROM videogames
        WHERE id = ?
    `);
    q.run(id);
}

module.exports = { addVideogame, getVideogameById, getVideogameByName, getAllvideogames, deleteVideogame};