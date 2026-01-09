import { useEffect, useMemo, useState } from "react";
import { COLORS, canPlay, cardLabel } from "../shared/rules.js";

function colorStyles(color) {
    switch (color) {
        case "red": return { background: "#3a1212", border: "#a94444" };
        case "yellow": return { background: "#3a2f10", border: "#caa64a" };
        case "green": return { background: "#12311b", border: "#4aa56a" };
        case "blue": return { background: "#10243a", border: "#4a86ca" };
        default: return { background: "#1f1f1f", border: "#666" };
    }
}

export default function OnlineGame({ socket, roomCode, me, game, onLeaveToLobby }) {
    const topCard = useMemo(() => game?.discard?.[game.discard.length - 1], [game]);
    const myHand = game?.hands?.[me] || [];
    const currentPid = game.playerOrder[game.turnIndex];

    const myName = game.namesById?.[me] || me;
    const currentName = game.namesById?.[currentPid] || currentPid;

    const [chooseWild, setChooseWild] = useState(null); // { cardId }
    const [chat, setChat] = useState([]);
    const [chatText, setChatText] = useState("");
    const winnerPid = game?.winnerId;
    const winnerName = winnerPid ? (game.namesById?.[winnerPid] || winnerPid) : null;

    function endToLobby() {
        if (!socket) return;
        socket.emit("game:end", { code: roomCode }, () => { });
    }

    useEffect(() => {
        if (!socket) return;

        socket.on("chat:update", setChat);

        return () => {
            socket.off("chat:update", setChat);
        };
    }, [socket]);

    function sendChat() {
        const text = chatText.trim();
        if (!text || !socket) return;

        socket.emit("chat:send", { code: roomCode, text });
        setChatText("");
    }



    function send(action) {
        socket.emit("game:action", { code: roomCode, action }, () => { });
    }

    function playCard(card) {
        if (card.kind === "wild" || card.kind === "wild_draw4") {
            setChooseWild({ cardId: card.id });
        } else {
            send({ type: "play", cardId: card.id });
        }
    }

    function confirmWild(color) {
        send({ type: "play", cardId: chooseWild.cardId, chosenColor: color });
        setChooseWild(null);
    }

    // function Card({ card, playable }) {
    //     const { background, border } = colorStyles(card.color === "wild" ? "wild" : card.color);
    //     return (
    //         <button
    //             onClick={() => playable && playCard(card)}
    //             disabled={!playable}
    //             style={{
    //                 width: 76, height: 110, borderRadius: 14,
    //                 border: `2px solid ${border}`, background, color: "white",
    //                 opacity: playable ? 1 : 0.45,
    //                 cursor: playable ? "pointer" : "not-allowed",
    //                 fontWeight: 800,
    //             }}
    //         >
    //             <div style={{ textAlign: "center" }}>
    //                 <div style={{ fontSize: 20 }}>{cardLabel(card)}</div>
    //                 <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>
    //                     {card.color === "wild" ? "WILD" : card.color.toUpperCase()}
    //                 </div>
    //             </div>
    //         </button>
    //     );
    // }

    function Card({ card, playable, size = "small" }) {
        const isBig = size === "big";
        const w = isBig ? 180 : 96;
        const h = isBig ? 260 : 130;
        const visualPlayable = isBig ? true : playable;

        const labelSize = isBig ? 44 : 20;
        const subSize = isBig ? 16 : 11;

        const { background, border } = colorStyles(card.color === "wild" ? "wild" : card.color);
        return (
            <button
                onClick={() => visualPlayable && playCard(card)}
                disabled={!visualPlayable}

                style={{
                    width: w,
                    height: h,
                    borderRadius: isBig ? 24 : 14,
                    border: `3px solid ${border}`,
                    background,
                    color: "white",
                    opacity: visualPlayable ? 1 : 0.45,
                    cursor: visualPlayable ? "pointer" : "not-allowed",

                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: labelSize, lineHeight: 1 }}>{cardLabel(card)}</div>
                    <div style={{ fontSize: subSize, opacity: 0.85, marginTop: isBig ? 12 : 6 }}>
                        {card.color === "wild" ? "WILD" : card.color.toUpperCase()}
                    </div>
                </div>
            </button>
        );
    }
    function handleQuit() {
        if (!socket) return;

        socket.emit("room:leave", { code: roomCode }, () => {
            onLeaveToLobby(); // reset client state
        });
    }


    {
        game.gameOver && (
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.75)",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 9999,
                    padding: 16,
                }}
            >
                <div
                    style={{
                        width: "min(520px, 100%)",
                        background: "#0f0f10",
                        border: "1px solid #2a2a2a",
                        borderRadius: 18,
                        padding: 18,
                        textAlign: "center",
                    }}
                >
                    <div style={{ fontSize: 26, fontWeight: 1000 }}>Game Over</div>

                    <div style={{ marginTop: 10, fontSize: 16, opacity: 0.9 }}>
                        {winnerName ? (
                            <>
                                Winner: <b>{winnerName}</b>
                            </>
                        ) : (
                            "Winner: —"
                        )}
                    </div>

                    <div style={{ marginTop: 10, opacity: 0.85 }}>
                        {game.message}
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                        <button
                            onClick={endToLobby}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 12,
                                border: "1px solid #3a3a3a",
                                background: "#171717",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 900,
                            }}
                        >
                            Back to Lobby
                        </button>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                        (This will return everyone to the lobby.)
                    </div>
                </div>
            </div>
        )
    }



    return (
        <div style={{ padding: 16, color: "white", fontFamily: "system-ui", maxWidth: 1300, margin: "0 auto" }}>
            <div style={{ background: "#0f0f10", border: "1px solid #2a2a2a", borderRadius: 16, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>Online Game</div>
                        <div style={{ opacity: 0.85, marginTop: 4 }}>
                            {/* Room: <b>{roomCode}</b> · You: <b>{me}</b> */}
                            Room: <b>{roomCode}</b> · You: <b>{myName}</b>

                        </div>
                        <div style={{ opacity: 0.85, marginTop: 4 }}>
                            Turn: <b>{currentPid === me ? "YOU" : currentName}</b>
                            · Color: <b>{game.currentColor}</b> · Stack:{" "}
                            <b>{game.pendingDraw.amount > 0 ? `+${game.pendingDraw.amount} (${game.pendingDraw.kind})` : "None"}</b>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            onClick={handleQuit}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 12,
                                border: "1px solid #3a3a3a",
                                background: "#171717",
                                color: "white",
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            Leave Game
                        </button>


                    </div>
                </div>

                <div style={{ marginTop: 10, opacity: 0.9 }}>{game.message}</div>
            </div>
            <div
                style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 14,
                    gridTemplateRows: "auto auto",
                }}
            >
                {/* MIDDLE: players | big top card | (future column) */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "360px 1fr 360px",
                        gap: 14,
                        alignItems: "start",
                    }}
                >
                    {/* LEFT: Players */}
                    <div
                        style={{
                            background: "#0f0f10",
                            border: "1px solid #2a2a2a",
                            borderRadius: 16,
                            padding: 14,
                            minHeight: 240,
                        }}
                    >
                        <div style={{ fontWeight: 900, marginBottom: 10 }}>Players</div>

                        {game.playerOrder.map((pid) => {
                            const name = game.namesById?.[pid] || pid;
                            return (
                                <div key={pid} style={{ marginBottom: 6, opacity: game.eliminated[pid] ? 0.6 : 1 }}>
                                    <b>{name}</b> {pid === me ? <span style={{ opacity: 0.8 }}>(YOU)</span> : null} —{" "}
                                    <b>{game.hands[pid].length}</b> cards{" "}
                                    {game.eliminated[pid] ? <span style={{ color: "#ff6a6a" }}>ELIMINATED</span> : null}
                                    {pid === currentPid ? <span style={{ color: "#9ad1ff", marginLeft: 8 }}>TURN</span> : null}
                                </div>
                            );
                        })}
                    </div>

                    {/* CENTER: Big Top Card */}
                    <div
                        style={{
                            background: "#0f0f10",
                            border: "1px solid #2a2a2a",
                            borderRadius: 16,
                            padding: 14,
                            display: "grid",
                            placeItems: "center",
                            minHeight: 320,
                        }}
                    >
                        <div style={{ fontWeight: 900, marginBottom: 12 }}>Top Card</div>
                        {topCard ? <Card card={topCard} playable={false} size="big" /> : <div>None</div>}

                    </div>

                    {/* RIGHT: Placeholder (draw pile / chat / stats later) */}
                    <div
                        style={{
                            background: "#0f0f10",
                            border: "1px solid #2a2a2a",
                            borderRadius: 16,
                            padding: 14,
                            minHeight: 240,
                            opacity: 0.8,
                        }}
                    >
                        <div
                            style={{
                                background: "#0f0f10",
                                border: "1px solid #2a2a2a",
                                borderRadius: 16,
                                padding: 14,
                                display: "flex",
                                flexDirection: "column",
                                minHeight: 320,
                            }}
                        >
                            <div style={{ fontWeight: 900, marginBottom: 8 }}>Chat</div>

                            {/* Messages */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                    marginBottom: 8,
                                }}
                            >
                                {chat.map((m) => (
                                    <div key={m.id} style={{ fontSize: 13 }}>
                                        <b>{m.name}</b>:{" "}
                                        <span style={{ opacity: 0.9 }}>{m.text}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div style={{ display: "flex", gap: 6 }}>
                                <input
                                    value={chatText}
                                    onChange={(e) => setChatText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                                    placeholder="Type a message…"
                                    style={{
                                        flex: 1,
                                        padding: 8,
                                        borderRadius: 10,
                                        border: "1px solid #333",
                                        background: "#121212",
                                        color: "white",
                                    }}
                                />
                                <button
                                    onClick={sendChat}
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #3a3a3a",
                                        background: "#171717",
                                        color: "white",
                                        cursor: "pointer",
                                        fontWeight: 700,
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </div>


                    </div>
                </div>

                {/* BOTTOM: Your hand centered */}
                <div
                    style={{
                        background: "#0f0f10",
                        border: "1px solid #2a2a2a",
                        borderRadius: 16,
                        padding: 14,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                            flexWrap: "wrap",
                            gap: 10,
                        }}
                    >
                        <div style={{ fontWeight: 900 }}>
                            Your Hand ({myHand.length})
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => send({ type: "draw" })}
                                disabled={currentPid !== me}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #3a3a3a",
                                    background: "#171717",
                                    color: "white",
                                    cursor: currentPid === me ? "pointer" : "not-allowed",
                                    opacity: currentPid === me ? 1 : 0.5,
                                    fontWeight: 800,
                                }}
                            >
                                {game.pendingDraw.amount > 0
                                    ? `Draw ${game.pendingDraw.amount}`
                                    : "Draw"}
                            </button>

                            <button
                                onClick={() => send({ type: "uno" })}
                                disabled={currentPid !== me}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #3a3a3a",
                                    background: "#171717",
                                    color: "white",
                                    cursor: currentPid === me ? "pointer" : "not-allowed",
                                    opacity: currentPid === me ? 1 : 0.5,
                                    fontWeight: 800,
                                }}
                            >
                                UNO
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                            {myHand.map((c) => {
                                const playable =
                                    currentPid === me &&
                                    canPlay(c, topCard, game.currentColor, game.pendingDraw);

                                return (
                                    <Card
                                        key={c.id}
                                        card={c}
                                        playable={playable}
                                        size="medium"
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>

            {/* Wild modal */}
            {chooseWild && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center" }}>
                    <div style={{ background: "#0f0f10", border: "1px solid #2a2a2a", borderRadius: 16, padding: 14, width: 360 }}>
                        <div style={{ fontWeight: 900, marginBottom: 10 }}>Choose a color</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => confirmWild(c)}
                                    style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #3a3a3a", background: "#171717", color: "white" }}
                                >
                                    {c.toUpperCase()}
                                </button>
                            ))}
                            <button
                                onClick={() => setChooseWild(null)}
                                style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #3a3a3a", background: "#171717", color: "white" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
