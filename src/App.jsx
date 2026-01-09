import { useState } from "react";
import LocalGame from "./LocalGame";
import OnlineLobby from "./OnlineLobby";
import Rules from "./Rules";


function Home({ onPick }) {
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
          width: "min(760px, 100%)",
          background: "#0f0f10",
          border: "1px solid #2a2a2a",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 900 }}>UNO Nono Mercy</div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>Choose mode:</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <button
            onClick={() => onPick("local")}
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid #3a3a3a",
              background: "#171717",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>Local</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>Play locally against yourself</div>
          </button>

          <button
            onClick={() => onPick("online")}
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid #3a3a3a",
              background: "#171717",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>Online</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>Create or Join rooms and play online</div>
          </button>
          <button
            onClick={() => onPick("rules")}
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid #3a3a3a",
              background: "#171717",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
              gridColumn: "1 / -1", // makes it full width under the two buttons
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>Rules</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>See how this prototype is played</div>
          </button>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("home"); // home | local | online

  if (mode === "local") return <LocalGame />;
  if (mode === "online") return <OnlineLobby onBack={() => setMode("home")} />;
  if (mode === "rules") return <Rules onBack={() => setMode("home")} />;


  return <Home onPick={setMode} />;
}
