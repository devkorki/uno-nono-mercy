import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

import { initGameForPlayers, applyAction } from "../shared/rules.js";

const app = express();
app.use(cors());
app.get("/health", (_, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

const rooms = new Map();
const NAME_REGEX = /^[a-zA-Z0-9]{2,16}$/;

function isValidName(name) {
  return typeof name === "string" && NAME_REGEX.test(name.trim());
}

function stopGame(room, reason = "A player left. Game stopped.") {
  room.game = null;
  io.to(room.code).emit("game:stopped", { reason });
  io.to(room.code).emit("room:update", getRoomSnapshot(room));
}

/**
 * rooms: roomCode -> {
 *   code: string,
 *   hostId: string,
 *   players: Map(socketId -> { id, name }),
 * }
 */

function getRoomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: Array.from(room.players.values()),
  };
}

io.on("connection", (socket) => {

  socket.on("chat:send", ({ code, text }, cb) => {
    const roomCode = (code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ ok: false });

    const player = room.players.get(socket.id);
    if (!player) return cb?.({ ok: false });

    const clean = String(text || "").trim();
    if (!clean || clean.length > 200) return cb?.({ ok: false });

    const msg = {
      id: nanoid(),
      name: player.name,
      text: clean,
      time: Date.now(),
    };

    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift(); // cap history

    io.to(roomCode).emit("chat:update", room.chat);
    cb?.({ ok: true });
  });


  socket.on("room:create", ({ name }, cb) => {



    if (!isValidName(name)) {
      return cb?.({ ok: false, error: "Invalid name" });
    }
    try {
      const code = nanoid(6).toUpperCase();
      const room = {
        code,
        hostId: socket.id,
        players: new Map(),
        game: null,
        chat: [],
      };

      room.players.set(socket.id, { id: socket.id, name: name?.trim() || "Player" });
      rooms.set(code, room);

      socket.join(code);
      socket.emit("chat:update", room.chat);

      io.to(code).emit("room:update", getRoomSnapshot(room));

      cb?.({ ok: true, code, me: socket.id });
    } catch (e) {
      cb?.({ ok: false, error: "Failed to create room" });
    }
  });

  socket.on("room:join", ({ code, name }, cb) => {



    if (!isValidName(name)) {
      return cb?.({ ok: false, error: "Invalid name" });
    }
    const roomCode = (code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (room.game) return cb?.({ ok: false, error: "Game already started" });


    room.players.set(socket.id, { id: socket.id, name: name?.trim() || "Player" });
    socket.join(roomCode);
    socket.emit("chat:update", room.chat);


    io.to(roomCode).emit("room:update", getRoomSnapshot(room));
    cb?.({ ok: true, code: roomCode, me: socket.id });



  });


  // -----------------------
  // GAME: start
  // -----------------------
  socket.on("game:start", ({ code }, cb) => {
    const roomCode = (code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ ok: false, error: "Room not found" });

    if (room.hostId !== socket.id) return cb?.({ ok: false, error: "Only host can start" });
    if (room.players.size < 2) return cb?.({ ok: false, error: "Need at least 2 players" });

    // Create a new game using the current players (socket IDs)
    const playerIds = Array.from(room.players.keys());
    const namesById = {};
    for (const [sid, p] of room.players.entries()) {
      namesById[sid] = p.name;
    }

    room.game = initGameForPlayers(playerIds, namesById);

    io.to(roomCode).emit("game:state", room.game);
    cb?.({ ok: true });
  });

  // -----------------------
  // GAME: actions
  // -----------------------
  socket.on("game:action", ({ code, action }, cb) => {
    const roomCode = (code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (!room.game) return cb?.({ ok: false, error: "Game not started" });

    room.game = applyAction(room.game, socket.id, action);

    io.to(roomCode).emit("game:state", room.game);
    cb?.({ ok: true });
  });

  socket.on("game:end", ({ code }, cb) => {
    const roomCode = (code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ ok: false, error: "Room not found" });

    // Optional: host-only end
    if (room.hostId !== socket.id) return cb?.({ ok: false, error: "Only host can end" });

    // Reuse your stopGame so everyone goes back to lobby cleanly
    stopGame(room, "Game ended.");
    cb?.({ ok: true });
  });


  socket.on("room:leave", ({ code }, cb) => {
    const roomCode = (code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ ok: true });

    room.players.delete(socket.id);
    socket.leave(roomCode);
    if (room.game) {
      stopGame(room, "A player left the game.");
    }

    // If host leaves, assign new host (first remaining)
    if (room.hostId === socket.id) {
      const first = room.players.keys().next().value;
      room.hostId = first || null;
    }

    if (room.players.size === 0) {
      rooms.delete(roomCode);
    } else {
      io.to(roomCode).emit("room:update", getRoomSnapshot(room));
    }

    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    // Remove socket from any rooms
    for (const [code, room] of rooms.entries()) {
      if (!room.players.has(socket.id)) continue;

      room.players.delete(socket.id);
      if (room.game) {
        stopGame(room, "A player disconnected.");
      }

      if (room.hostId === socket.id) {
        const first = room.players.keys().next().value;
        room.hostId = first || null;
      }

      if (room.players.size === 0) {
        rooms.delete(code);
      } else {
        io.to(code).emit("room:update", getRoomSnapshot(room));
      }
    }
  });
});

const PORT = process.env.PORT || 5174;

// Serve the built frontend

// SPA fallback
// app.get("*", (_, res) => {
//   res.sendFile(path.join(__dirname, "../dist/index.html"));
// });

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
