import { Server } from 'socket.io'

let io: Server | null = null

// Initialize Socket.io server
export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all for now (you can restrict later)
    },
  })

  io.on('connection', (socket) => {
    console.log('🟢 A user connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('🔴 A user disconnected:', socket.id)
    })
  })

  return io
}

// Send notification to all clients
export const sendNotification = (message: string, data?: any) => {
  if (io) {
    io.emit('notification', { message, data })
  } else {
    console.error('❌ Socket.io not initialized')
  }
}
