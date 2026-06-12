const jwt = require("jsonwebtoken");

const getTokenFrom = request => {
    const authorization = request.get("authorization")
    if (authorization && authorization.startsWith("Bearer ")) {
        return authorization.replace("Bearer ", "")
    }
    return null
}

const decryptToken = (request, response, next) => {
    let token = null
    const authorization = request.get("authorization")
    if (authorization && authorization.startsWith("Bearer "))
    {
        token = authorization.replace("Bearer ", "")   
    }

    if(!token) {
        return response.status(401).json({ error: 'token missing' });
    }

    try {
        const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
        if(!decodedToken.id || !decodedToken.role || !decodedToken.username) {
            return response.status(401).json({error: "invalid token"});
        }
        request.user = {
            id: decodedToken.id,
            role: decodedToken.role,
            username: decodedToken.username
        }
        next();
    } catch (error) {
        // 5. Manejo de errores de JWT (expiración, firma falsa, etc.)
        return response.status(401).json({ error: 'token invalid or expired' });
    }
}

module.exports = { decryptToken };