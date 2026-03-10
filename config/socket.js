import { Server } from 'socket.io'

let io

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
        },
    })

    io.on('connection', (socket) => {
        console.log('🔌 Client connected:', socket.id)

        // Join a ride-specific room
        socket.on('join-ride', (rideId) => {
            socket.join(`ride-${rideId}`)
            console.log(`📍 Socket ${socket.id} joined ride-${rideId}`)
        })

        // Leave ride room
        socket.on('leave-ride', (rideId) => {
            socket.leave(`ride-${rideId}`)
        })

        // Driver joins the drivers room to receive new ride requests
        socket.on('join-drivers', () => {
            socket.join('drivers')
            console.log(`🚗 Driver ${socket.id} joined drivers room`)
        })

        // Driver sends live GPS location → broadcast to riders in the ride room
        socket.on('driver-location-update', ({ rideId, lat, lng }) => {
            if (rideId && lat && lng) {
                io.to(`ride-${rideId}`).emit('driver-location', { rideId, lat, lng })
            }
        })

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id)
        })
    })

    return io
}

export function getIO() {
    if (!io) throw new Error('Socket.IO not initialized')
    return io
}