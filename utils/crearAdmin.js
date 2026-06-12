const bcrypt = require('bcrypt')
const usersModel = require('../models/users')

const initializeAdminUser = async () => {
    try {
        const adminUsername = 'admin'
        const existsAdmin = await usersModel.getUserByUsername(adminUsername)
        
        if (!existsAdmin) {
            const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10
            const passwordHash = await bcrypt.hash(adminUsername, saltRounds)
            const adminUser = {
                username: adminUsername,
                passwordHash: passwordHash,
                email: 'admin@app.com',
                role: 'admin'
            }
            
            await usersModel.createUser(adminUser)
            console.log(`Usuario administrador creado con éxito! (User: ${adminUsername} / Pass: ${adminUsername})`)
        } else {
            console.log('El usuario administrador ya existe. Saltando inicialización.')
        }
    } catch (error) {
        console.error('Error al inicializar el usuario administrador:', error)
    }
}

module.exports = initializeAdminUser