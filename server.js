import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { initSocket } from './config/socket.js'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import userRoutes from './routes/userRoutes.js'
import rideRoutes from './routes/rideRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import promoRoutes from './routes/promoRoutes.js'
import supportRoutes from './routes/supportRoutes.js'

dotenv.config()

const app = express()
const server = createServer(app)

// Initialize Socket.IO
const io = initSocket(server)

// Secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}))


// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))

// Rate limiting — 500 requests per 15 min per IP
app.set('trust proxy', 1)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, try again later' },
}))


// Make io accessible in controllers via req.app
app.set('io', io)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CabBooking API is running',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
  })
})

// Routes
app.use('/api/users', userRoutes)
app.use('/api/rides', rideRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/promo', promoRoutes)
app.use('/api/support', supportRoutes)

// Start server (use server.listen, not app.listen)
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚕 CabBooking API running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔌 WebSocket: enabled`)
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})
