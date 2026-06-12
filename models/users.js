const db = require("../utils/db");

const createUser = (user) => {
    const {username, passwordHash, email, role} = user;
    const q = db.prepare(`
        INSERT INTO users
        (username, passwordHash, email, role)
        VALUES (?,?,?,?)
    `);

    const info = q.run(username, passwordHash, email, role);

    return {
        id: info.lastInsertRowid,
        username: username,
        email: email,
        role: role
    }
};

const getUserByUsername = username => {
    const q = db.prepare(`
        SELECT id, username, email, role
        FROM users
        WHERE username=?
    `);

    const user = q.get(username)
    return user;
}

const getUserByEmail = email => {
    const q = db.prepare(`
        SELECT id, username, email, role
        FROM users
        WHERE email=?
    `);

    const user = q.get(email)
    return user;
}

//No password for safety
const getUserById = id => {
    const q = db.prepare(`
        SELECT id, username, email, role
        FROM users
        WHERE id=?
    `);

    const user = q.get(id)
    return user;
}

const getAllUserById = id => {
    const q = db.prepare(`
        SELECT *
        FROM users
        WHERE id=?
    `);

    const user = q.get(id)
    return user;
}

const getAllUserByUsername = username => {
    const q = db.prepare(`
        SELECT *
        FROM users
        WHERE username=?
    `);

    const user = q.get(username)
    return user;
}

const getAllUsers = () => {
    const q = db.prepare(`
        SELECT username
        FROM users
    `);
    const users = q.all()
    return users;
}

const updateUser = (id, email, passwordHash) => {
    // Solo actualizamos el email si viene, y el password si viene
    if (email && passwordHash) {
        db.prepare(`UPDATE users SET email = ?, passwordHash = ? WHERE id = ?`).run(email, passwordHash, id);
    } else if (email) {
        db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(email, id);
    } else if (passwordHash) {
        db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`).run(passwordHash, id);
    }
}
module.exports = { 
    createUser, updateUser,
    getUserByUsername, getUserById, getUserByEmail,
    getAllUserById, getAllUserByUsername, getAllUsers
};