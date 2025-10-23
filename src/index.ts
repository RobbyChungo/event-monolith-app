import express from 'express'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import userRoutes from './routes/userRoutes'
import eventRoutes from './routes/eventRoutes'



dotenv.config()

const app = express()
app.use(express.json())

// --- Register routes ---
app.use('/users', userRoutes)
app.use('/events', eventRoutes)

// --- Swagger setup ---
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Monolith API',
      version: '1.0.0',
      description: 'Simple event management API',
    },
  },
  apis: ['./src/routes/*.ts'], // paths for docs
}

const swaggerSpec = swaggerJSDoc(options)
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// --- Basic route ---
app.get('/', (_req, res) => {
  res.json({ message: 'Event Monolith App is running 🚀' })
})

// --- Start server ---
import http from 'http'
import { initSocket } from './services/notificationService'

const PORT = process.env.PORT || 3000

// Create HTTP server from Express app
const server = http.createServer(app)

// Initialize socket.io on top of it
initSocket(server)

// Start the combined server
server.listen(PORT, () => {
  console.log(`✅ Server running with Socket.io on http://localhost:${PORT}`)
})
