import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import OnlineGame from "./OnlineGame";


//const SERVER_URL = "http://localhost:5174";

//const SERVER_URL = "  https://d9eb3953d17e.ngrok-free.app";
// const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

//const SERVER_URL = import.meta.env.VITE_SERVER_URL

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:5174" : "");


//const [game, setGame] = useState(null);

const NAME_REGEX = /^[a-zA-Z0-9]{2,16}$/;

function isValidName(name) {
  return NAME_REGEX.test(name.trim());
}

export default function OnlineLobby({ onBack }) {
  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(null);


  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  const isHost = useMemo(() => room && me && room.hostId === me, [room, me]);

  useEffect(() => {
    if (!SERVER_URL) {
      setError("Missing VITE_SERVER_URL (set it in Vercel env vars).");
      return;
    }
    const s = io(SERVER_URL, { transports: ["websocket"] });
    setSocket(s);

    s.on("game:stopped", ({ reason }) => {
      setGame(null);
      setError(reason);
    });

    s.on("connect", () => setError(""));
    s.on("connect_error", () => setError("Cannot connect to server. Is it running?"));

    s.on("room:update", (snap) => {
      setRoom(snap);
      setError("");
    });

    s.on("game:state", (g) => setGame(g));


    return () => {
      s.disconnect();
    };
  }, []);

  async function createRoom() {
    if (!socket) return;

    const cleanName = name.trim();
    if (!isValidName(cleanName)) {
      setError("Name must be 2–16 characters (letters & numbers only).");
      return;
    }

    setError("");
    socket.emit("room:create", { name: cleanName }, (res) => {
      if (!res?.ok) return setError(res?.error || "Create failed");
      setCode(res.code);
      setMe(res.me);
    });
  }
  if (room && game && me) {
    return (
      <OnlineGame
        socket={socket}
        roomCode={room.code}
        me={me}
        game={game}
        onLeaveToLobby={() => setGame(null)}
      />
    );
  }


  async function joinRoom() {
    if (!socket) return;

    const cleanName = name.trim();
    if (!isValidName(cleanName)) {
      setError("Name must be 2–16 characters (letters & numbers only).");
      return;
    }

    setError("");
    socket.emit("room:join", { code, name: cleanName }, (res) => {
      if (!res?.ok) return setError(res?.error || "Join failed");
      setCode(res.code);
      setMe(res.me);
    });
  }


  async function leaveRoom() {
    if (!socket || !room) return;
    socket.emit("room:leave", { code: room.code }, () => { });
    setRoom(null);
    setCode("");
    setMe(null);
    setGame(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0c",
        color: "white",
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(820px, 100%)",
          background: "#0f0f10",
          border: "1px solid #2a2a2a",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Online Lobby</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              Server: <b>{SERVER_URL}</b>
            </div>
          </div>

          <button
            onClick={() => (room ? leaveRoom() : onBack())}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #3a3a3a",
              background: "#171717",
              color: "white",
              cursor: "pointer",
              height: 42,
            }}
          >
            {room ? "Leave room" : "← Back"}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #522",
              background: "#1a0f0f",
              color: "#ffb3b3",
            }}
          >
            {error}
          </div>
        )}

        {!room ? (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#121212",
                  color: "white",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={createRoom}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #3a3a3a",
                  background: "#171717",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Create room
              </button>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#121212",
                  color: "white",
                  width: 160,
                  letterSpacing: 2,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              />

              <button
                onClick={joinRoom}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #3a3a3a",
                  background: "#171717",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Join room
              </button>
            </div>


          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid #2a2a2a",
                background: "#101011",
              }}
            >
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  Room code:{" "}
                  <span style={{ fontWeight: 900, letterSpacing: 2, fontSize: 18 }}>{room.code}</span>
                </div>
                <div style={{ opacity: 0.8 }}>
                  You: <b>{name.trim() || me}</b> {isHost ? "(host)" : ""}

                </div>
              </div>

              <div style={{ marginTop: 12, fontWeight: 900 }}>Players</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {room.players.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #242424",
                      background: "#0f0f10",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <b>{p.name}</b> <span style={{ opacity: 0.7, fontSize: 12 }}>({p.id})</span>
                    </div>
                    <div style={{ opacity: 0.8 }}>
                      {p.id === room.hostId ? "HOST" : ""}
                      {p.id === me ? "  (YOU)" : ""}
                    </div>
                  </div>
                ))}
              </div>

              {isHost && (
                <button
                  onClick={() => socket.emit("game:start", { code: room.code }, (res) => {
                    if (!res?.ok) setError(res?.error || "Could not start");
                  })}
                >
                  Start Game
                </button>
              )}


              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
