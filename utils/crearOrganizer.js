const bcrypt = require('bcrypt')
const usersModel = require('../models/users')

const initializeOrganizerUser = async () => {
    try {
        const organizerUsername = 'org'
        const existsOrganizer = await usersModel.getUserByUsername(organizerUsername)
        
        if (!existsOrganizer) {
            const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10
            const passwordHash = await bcrypt.hash(organizerUsername, saltRounds)
            const organizerUser = {
                username: organizerUsername,
                passwordHash: passwordHash,
                email: 'org@app.com',
                role: 'organizer'
            }
            
            await usersModel.createUser(organizerUser)
            console.log(`Usuario organizador creado con éxito! (User: ${organizerUsername} / Pass: ${organizerUsername})`)
        } else {
            console.log('El usuario organizador ya existe. Saltando inicialización.')
        }
    } catch (error) {
        console.error('Error al inicializar el usuario organizador:', error)
    }
}

module.exports = initializeOrganizerUser