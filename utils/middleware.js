const { VALID_ROLES : ROLES } = require("./dbConstants")
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
        if(!decodedToken.id || !ROLES.includes(decodedToken.role) || !decodedToken.username ) {
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

const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
        const campoConError = result.error.issues[0]?.path[0] || 'desconocido';
        return res.status(400).json({
            error: `Valor inválido en el parámetro: ${campoConError}`,
            detalles: result.error.issues
        });
    }
    req.params = result.data;
    next();
};

module.exports = { decryptToken, validateParams};