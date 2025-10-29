import { Server } from "socket.io";
import http from "http";

let io: Server | null = null;

// ✅ Initialize Socket.IO
export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  console.log("✅ Socket.io initialized for real-time notifications");
  return io;
};

// ✅ Get the current Socket.IO instance safely
export const getIO = (): Server => {
  if (!io) {
    console.warn("⚠️ Socket not initialized yet");
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
};

// ✅ Convenience: broadcast to a channel/topic with payload
export function broadcast(channel: string, payload: unknown) {
  try {
    const socket = getIO();
    socket.emit(channel, payload);
  } catch (e) {
    console.warn("[socket] broadcast skipped:", (e as any)?.message || e);
  }
}