import { useMemo, useState } from "react";

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const COLORS = ["red", "yellow", "green", "blue"];
const PLAYER_COUNT = 2;

// No Mercy elimination threshold
const ELIMINATION_HAND_SIZE = 25;

// UNO penalty (simple/strict)
const UNO_PENALTY_DRAW = 2;

// ----------------------
// Deck
// ----------------------
function createDeck() {
  const deck = [];

  // Small but spicy deck:
  // - numbers 0-9 once per color
  // - per color: Skip, Reverse, +2, +6, +10
  // - Wild x4
  // - Wild +4 x4
  //
  // NOTE: Real UNO distributions differ; this is intentionally compact for dev.
  for (const color of COLORS) {
    for (let n = 0; n <= 9; n++) {
      deck.push({ id: makeId(), color, kind: "num", value: n });
    }
    deck.push({ id: makeId(), color, kind: "skip" });
    deck.push({ id: makeId(), color, kind: "reverse" });

    deck.push({ id: makeId(), color, kind: "draw2" });
    deck.push({ id: makeId(), color, kind: "draw6" });
    deck.push({ id: makeId(), color, kind: "draw10" });
  }

  for (let i = 0; i < 4; i++) deck.push({ id: makeId(), color: "wild", kind: "wild" });
  for (let i = 0; i < 4; i++) deck.push({ id: makeId(), color: "wild", kind: "wild_draw4" });

  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----------------------
// Card helpers
// ----------------------
function isDrawKind(kind) {
  return kind === "draw2" || kind === "draw6" || kind === "draw10" || kind === "wild_draw4";
}

function drawAmountForKind(kind) {
  switch (kind) {
    case "draw2":
      return 2;
    case "draw6":
      return 6;
    case "draw10":
      return 10;
    case "wild_draw4":
      return 4;
    default:
      return 0;
  }
}

function cardLabel(c) {
  if (c.kind === "wild") return "WILD";
  if (c.kind === "wild_draw4") return "WILD +4";
  if (c.kind === "num") return `${c.value}`;
  if (c.kind === "skip") return "SKIP";
  if (c.kind === "reverse") return "REVERSE";
  if (c.kind === "draw2") return "+2";
  if (c.kind === "draw6") return "+6";
  if (c.kind === "draw10") return "+10";
  return c.kind.toUpperCase();
}

function pickColorForWild() {
  const choice = prompt("Choose color: red / yellow / green / blue", "red");
  if (!choice) return "red";
  const c = choice.toLowerCase().trim();
  return COLORS.includes(c) ? c : "red";
}

// ----------------------
// Rules
// ----------------------
function canPlay(card, topCard, currentColor, pendingDraw) {
  // If there is a pending draw stack:
  // - You may only play the SAME draw kind to stack (e.g., +6 on +6).
  // - Otherwise you must draw the stack.
  if (pendingDraw.amount > 0) {
    return card.kind === pendingDraw.kind;
  }

  // Wilds are always playable
  if (card.kind === "wild" || card.kind === "wild_draw4") return true;

  if (!topCard) return true;

  // match color
  if (card.color === currentColor) return true;

  // match number
  if (card.kind === "num" && topCard.kind === "num" && card.value === topCard.value) return true;

  // match action type (skip on skip, reverse on reverse, draw2 on draw2 etc.)
  if (card.kind !== "num" && topCard.kind === card.kind) return true;

  return false;
}

// ----------------------
// State helpers
// ----------------------
function drawOne(state) {
  // If deck empty, reshuffle discard (keep top)
  if (state.deck.length === 0) {
    if (state.discard.length <= 1) return state;
    const top = state.discard[state.discard.length - 1];
    const rest = state.discard.slice(0, -1);
    return { ...state, deck: shuffle(rest), discard: [top] };
  }

  const [card, ...rest] = state.deck;
  return { ...state, deck: rest, _drawnCard: card };
}

function initGame() {
  const deck = shuffle(createDeck());
  const hands = Array.from({ length: PLAYER_COUNT }, () => []);

  let s = {
    deck,
    discard: [],
    hands,
    turn: 0,
    direction: 1, // 1 forward, -1 backward
    currentColor: "red",

    // Generic draw stack: kind is the draw type being stacked
    pendingDraw: { kind: null, amount: 0 },

    saidUNO: Array.from({ length: PLAYER_COUNT }, () => false),
    eliminated: Array.from({ length: PLAYER_COUNT }, () => false),

    message: "",
    gameOver: false,
  };

  // Deal 7 each
  for (let i = 0; i < 7; i++) {
    for (let p = 0; p < PLAYER_COUNT; p++) {
      s = drawOne(s);
      hands[p].push(s._drawnCard);
      delete s._drawnCard;
    }
  }

  // Flip a starting card (avoid wild / wild_draw4 for simplicity)
  let startCard = null;
  while (s.deck.length > 0) {
    s = drawOne(s);
    const c = s._drawnCard;
    delete s._drawnCard;

    if (c.kind !== "wild" && c.kind !== "wild_draw4") {
      startCard = c;
      break;
    } else {
      s.deck.push(c);
    }
  }

  if (!startCard) startCard = { id: makeId(), color: "red", kind: "num", value: 0 };

  s.discard.push(startCard);
  s.currentColor = startCard.color;

  return { ...s, hands: hands.map((h) => [...h]), message: "Game started!" };
}

function colorStyles(color) {
  // Soft, readable colors (no external CSS needed)
  switch (color) {
    case "red":
      return { background: "#3a1212", border: "#a94444" };
    case "yellow":
      return { background: "#3a2f10", border: "#caa64a" };
    case "green":
      return { background: "#12311b", border: "#4aa56a" };
    case "blue":
      return { background: "#10243a", border: "#4a86ca" };
    case "wild":
    default:
      return { background: "#1f1f1f", border: "#666" };
  }
}

// ----------------------
// App
// ----------------------
export default function LocalGame() {
  const [state, setState] = useState(() => initGame());

  const topCard = useMemo(() => state.discard[state.discard.length - 1], [state.discard]);

  function activePlayersCount(eliminated) {
    return eliminated.filter((x) => !x).length;
  }

  function advanceTurnIndex(turn, direction, steps = 1) {
    const n = PLAYER_COUNT;
    const raw = (turn + direction * steps) % n;
    return (raw + n) % n;
  }

  function findNextActive(prev, fromTurn, steps = 1, directionOverride = null) {
    const dir = directionOverride ?? prev.direction;

    let next = advanceTurnIndex(fromTurn, dir, steps);
    // Skip eliminated players
    for (let guard = 0; guard < PLAYER_COUNT; guard++) {
      if (!prev.eliminated[next]) return next;
      next = advanceTurnIndex(next, dir, 1);
    }
    return next; // fallback
  }

  function checkWinOrLastStanding(prev) {
    const alive = activePlayersCount(prev.eliminated);
    if (alive <= 1) {
      const winnerIdx = prev.eliminated.findIndex((e) => !e);
      if (winnerIdx >= 0) {
        return {
          ...prev,
          gameOver: true,
          message: `Player ${winnerIdx + 1} wins (last standing)!`,
        };
      }
      return { ...prev, gameOver: true, message: "Game over." };
    }
    return prev;
  }

  function applyEliminationIfNeeded(prev, playerIndex) {
    const count = prev.hands[playerIndex].length;
    if (count >= ELIMINATION_HAND_SIZE && !prev.eliminated[playerIndex]) {
      const eliminated = [...prev.eliminated];
      eliminated[playerIndex] = true;

      let s = { ...prev, eliminated, message: `Player ${playerIndex + 1} eliminated (25+ cards)!` };
      s = checkWinOrLastStanding(s);

      // If eliminated player was the current turn, move turn to next active
      if (!s.gameOver && s.turn === playerIndex) {
        const next = findNextActive(s, playerIndex, 1);
        s = { ...s, turn: next };
      }
      return s;
    }
    return prev;
  }

  function drawMany(prev, playerIndex, count) {
    let s = prev;
    const newHands = prev.hands.map((h, idx) => (idx === playerIndex ? [...h] : h));

    for (let i = 0; i < count; i++) {
      s = drawOne(s);
      const card = s._drawnCard;
      delete s._drawnCard;
      if (!card) break;
      newHands[playerIndex].push(card);
    }

    s = { ...s, hands: newHands };
    s = applyEliminationIfNeeded(s, playerIndex);
    return s;
  }

  function endTurn(prev, { skipNext = false } = {}) {
    const p = prev.turn;

    // reset UNO press at end of your turn (fresh each turn)
    const saidUNO = [...prev.saidUNO];
    saidUNO[p] = false;

    // Determine next turn, skipping eliminated
    const step = skipNext ? 2 : 1;
    const next = findNextActive({ ...prev, saidUNO }, p, step);

    return { ...prev, saidUNO, turn: next };
  }

  function onPressUNO() {
    setState((prev) => {
      if (prev.gameOver) return prev;
      const p = prev.turn;
      if (prev.eliminated[p]) return prev;

      const saidUNO = [...prev.saidUNO];
      saidUNO[p] = true;

      return { ...prev, saidUNO, message: `Player ${p + 1} pressed UNO.` };
    });
  }

  function onDraw() {
    setState((prev) => {
      if (prev.gameOver) return prev;

      const p = prev.turn;
      if (prev.eliminated[p]) return prev;

      // Pending draw stack: draw all + lose turn
      if (prev.pendingDraw.amount > 0) {
        const total = prev.pendingDraw.amount;

        let s = drawMany(prev, p, total);
        s = {
          ...s,
          pendingDraw: { kind: null, amount: 0 },
          message: `Player ${p + 1} drew ${total} (stack) and lost the turn.`,
        };

        if (s.gameOver) return s;
        if (s.eliminated[p]) return checkWinOrLastStanding(endTurn(s));

        return endTurn(s);
      }

      // Normal draw 1
      let s = drawMany(prev, p, 1);
      s = { ...s, message: `Player ${p + 1} drew a card.` };

      if (s.gameOver) return s;
      return endTurn(s);
    });
  }

  function onPlay(cardId) {
    setState((prev) => {
      if (prev.gameOver) return prev;

      const p = prev.turn;
      if (prev.eliminated[p]) return prev;

      const hand = prev.hands[p];
      const card = hand.find((c) => c.id === cardId);
      if (!card) return prev;

      if (!canPlay(card, topCard, prev.currentColor, prev.pendingDraw)) {
        return { ...prev, message: "You can't play that card." };
      }

      // Remove from hand
      const newHands = prev.hands.map((h, idx) => (idx === p ? h.filter((c) => c.id !== cardId) : h));

      // Add to discard
      const newDiscard = [...prev.discard, card];

      let newColor = prev.currentColor;
      let newDirection = prev.direction;
      let pendingDraw = { ...prev.pendingDraw };
      let skipNext = false;

      // Resolve wild color
      if (card.kind === "wild" || card.kind === "wild_draw4") {
        newColor = pickColorForWild();
      } else {
        newColor = card.color;
      }

      // Resolve actions
      let msg = `Player ${p + 1} played ${cardLabel(card)}.`;

      if (card.kind === "skip") {
        skipNext = true;
        msg += " (Next player skipped)";
      }

      if (card.kind === "reverse") {
        newDirection = prev.direction * -1;

        // 2-player reverse acts like skip
        if (PLAYER_COUNT === 2) {
          skipNext = true;
          msg += " (Reverse acts like Skip in 2-player)";
        } else {
          msg += " (Direction reversed)";
        }
      }

      // Draw stack cards
      if (isDrawKind(card.kind)) {
        const add = drawAmountForKind(card.kind);

        // Start a new stack if none, else (by canPlay) it's same kind and stacks.
        pendingDraw = {
          kind: card.kind,
          amount: (prev.pendingDraw.amount || 0) + add,
        };

        msg += ` (Stack: +${pendingDraw.amount})`;
      }

      // Build next state so far
      let s = {
        ...prev,
        hands: newHands,
        discard: newDiscard,
        currentColor: newColor,
        direction: newDirection,
        pendingDraw,
        message: msg,
      };

      // WIN check (empty hand wins immediately)
      if (newHands[p].length === 0) {
        return { ...s, gameOver: true, message: `Player ${p + 1} wins!` };
      }

      // UNO auto-penalty:
      // If you end your play with 1 card and didn't press UNO this turn -> draw 2 now.
      if (newHands[p].length === 1 && !prev.saidUNO[p]) {
        s = drawMany(s, p, UNO_PENALTY_DRAW);
        s = {
          ...s,
          message: `${msg} UNO not called → Player ${p + 1} draws ${UNO_PENALTY_DRAW} penalty.`,
        };
      }

      // Elimination check after penalty draw (or any other draw)
      s = applyEliminationIfNeeded(s, p);
      s = checkWinOrLastStanding(s);
      if (s.gameOver) return s;

      // End turn and skip if needed
      return endTurn(s, { skipNext });
    });
  }

  function reset() {
    setState(initGame());
  }

  const drawBtnText = state.pendingDraw.amount > 0 ? `Draw ${state.pendingDraw.amount}` : "Draw";

  function CardButton({ card, playable, onClick, disabled }) {
    const { background, border } = colorStyles(card.color);
    const glow = playable ? "0 0 0 2px rgba(255,255,255,0.35)" : "none";

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={playable ? "Playable" : "Not playable"}
        style={{
          width: 76,
          height: 110,
          borderRadius: 14,
          border: `2px solid ${border}`,
          background,
          color: "white",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : playable ? 1 : 0.45,
          boxShadow: glow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          letterSpacing: 0.5,
          userSelect: "none",
        }}
      >
        <div style={{ textAlign: "center", lineHeight: 1.05 }}>
          <div style={{ fontSize: 20 }}>{cardLabel(card)}</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>
            {card.color === "wild" ? "WILD" : card.color.toUpperCase()}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
        color: "white",
      }}
    >
      <div
        style={{
          background: "#0f0f10",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 320 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>UNO No Mercy (Prototype)</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              Turn: <b>Player {state.turn + 1}</b> · Direction: <b>{state.direction === 1 ? "→" : "←"}</b>
            </div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              Current color: <b>{state.currentColor}</b> · Pending stack:{" "}
              <b>{state.pendingDraw.amount > 0 ? `+${state.pendingDraw.amount} (${state.pendingDraw.kind})` : "None"}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={onDraw}
              disabled={state.gameOver || state.eliminated[state.turn]}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #3a3a3a",
                background: "#171717",
                color: "white",
                cursor: "pointer",
              }}
            >
              {drawBtnText}
            </button>

            <button
              onClick={onPressUNO}
              disabled={state.gameOver || state.eliminated[state.turn]}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #3a3a3a",
                background: "#171717",
                color: "white",
                cursor: "pointer",
              }}
              title="Press UNO before ending your play on 1 card"
            >
              UNO
            </button>

            <button
              onClick={reset}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #3a3a3a",
                background: "#171717",
                color: "white",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.9 }}>{state.message}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        {/* Table / discard */}
        <div
          style={{
            background: "#0f0f10",
            border: "1px solid #2a2a2a",
            borderRadius: 16,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Table</div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ opacity: 0.85, marginBottom: 6 }}>Top card</div>
              {topCard ? (
                <div style={{ transform: "scale(1.03)", transformOrigin: "left top" }}>
                  <CardButton card={topCard} playable={false} disabled={true} onClick={() => {}} />
                </div>
              ) : (
                <div style={{ opacity: 0.8 }}>None</div>
              )}
            </div>

            <div style={{ opacity: 0.85 }}>
              <div style={{ marginBottom: 6, fontWeight: 700 }}>Players</div>
              {Array.from({ length: PLAYER_COUNT }).map((_, p) => (
                <div key={p} style={{ marginBottom: 6 }}>
                  Player {p + 1}:{" "}
                  <b>{state.hands[p].length}</b> cards{" "}
                  {state.eliminated[p] ? (
                    <span style={{ marginLeft: 8, color: "#ff6a6a" }}>(ELIMINATED)</span>
                  ) : state.turn === p ? (
                    <span style={{ marginLeft: 8, color: "#9ad1ff" }}>(TURN)</span>
                  ) : null}
                </div>
              ))}
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Elimination: <b>{ELIMINATION_HAND_SIZE}+</b> cards
              </div>
            </div>
          </div>
        </div>

        {/* Current player hand */}
        <div
          style={{
            background: "#0f0f10",
            border: "1px solid #2a2a2a",
            borderRadius: 16,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Hands
          </div>

          {Array.from({ length: PLAYER_COUNT }).map((_, p) => {
            const isTurn = state.turn === p;
            const isElim = state.eliminated[p];
            const hand = state.hands[p];

            return (
              <div
                key={p}
                style={{
                  border: "1px solid #232323",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 12,
                  opacity: isElim ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>
                    Player {p + 1} ({hand.length})
                    {isElim ? <span style={{ marginLeft: 10, color: "#ff6a6a" }}>ELIMINATED</span> : null}
                    {isTurn && !isElim ? <span style={{ marginLeft: 10, color: "#9ad1ff" }}>TURN</span> : null}
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    UNO pressed (this turn): <b>{state.saidUNO[p] ? "YES" : "NO"}</b>
                  </div>
                </div>

                {isTurn && !state.gameOver && !isElim && (
                  <div style={{ opacity: 0.85, marginTop: 6 }}>
                    {state.pendingDraw.amount > 0
                      ? `You are under a stack: play ${state.pendingDraw.kind} to stack, or draw.`
                      : "Play a matching card or a wild; otherwise draw."}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {hand.map((c) => {
                    const playable =
                      isTurn &&
                      !state.gameOver &&
                      !isElim &&
                      canPlay(c, topCard, state.currentColor, state.pendingDraw);

                    return (
                      <CardButton
                        key={c.id}
                        card={c}
                        playable={playable}
                        disabled={!isTurn || state.gameOver || isElim}
                        onClick={() => onPlay(c.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
        Notes: stacking is "same draw type only" (+2 with +2, +6 with +6, WILD+4 with WILD+4, etc).
        Elimination happens immediately at 25+ cards and the turn order skips eliminated players.
      </div>
    </div>
  );
}
