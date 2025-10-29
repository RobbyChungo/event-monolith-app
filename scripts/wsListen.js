// Simple Socket.IO client to observe realtime broadcasts
// Usage: node scripts/wsListen.js http://localhost:3000

const { io } = require("socket.io-client");

const base = process.argv[2] || "http://localhost:3000";
const socket = io(base, { transports: ["websocket"], reconnection: true });

socket.on("connect", () => {
  console.log("[ws] connected", socket.id);
});

socket.on("disconnect", () => {
  console.log("[ws] disconnected");
});

socket.on("rsvps", (payload) => {
  console.log("[rsvps]", payload);
});

socket.on("events", (payload) => {
  console.log("[events]", payload);
});


