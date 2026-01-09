// shared/rules.js
export const COLORS = ["red", "yellow", "green", "blue"];
export const ELIMINATION_HAND_SIZE = 25;
export const UNO_PENALTY_DRAW = 2;

function makeId() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function createDeck() {
    const deck = [];
    for (const color of COLORS) {
        for (let n = 0; n <= 9; n++) deck.push({ id: makeId(), color, kind: "num", value: n });
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

export function isDrawKind(kind) {
    return kind === "draw2" || kind === "draw6" || kind === "draw10" || kind === "wild_draw4";
}

export function drawAmountForKind(kind) {
    switch (kind) {
        case "draw2": return 2;
        case "draw6": return 6;
        case "draw10": return 10;
        case "wild_draw4": return 4;
        default: return 0;
    }
}

export function cardLabel(c) {
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

export function canPlay(card, topCard, currentColor, pendingDraw) {
    if (pendingDraw.amount > 0) return card.kind === pendingDraw.kind;
    if (card.kind === "wild" || card.kind === "wild_draw4") return true;
    if (!topCard) return true;
    if (card.color === currentColor) return true;
    if (card.kind === "num" && topCard.kind === "num" && card.value === topCard.value) return true;
    if (card.kind !== "num" && topCard.kind === card.kind) return true;
    return false;
}

export function drawOne(state) {
    if (state.deck.length === 0) {
        if (state.discard.length <= 1) return state;
        const top = state.discard[state.discard.length - 1];
        const rest = state.discard.slice(0, -1);
        return { ...state, deck: shuffle(rest), discard: [top] };
    }
    const [card, ...rest] = state.deck;
    return { ...state, deck: rest, _drawnCard: card };
}

export function initGameForPlayers(playerIds, namesById = {}) {

    const deck = shuffle(createDeck());
    const hands = {};
    const eliminated = {};
    const saidUNO = {};

    for (const id of playerIds) {
        hands[id] = [];
        eliminated[id] = false;
        saidUNO[id] = false;
    }

    let s = {
        deck,
        discard: [],
        hands,
        playerOrder: [...playerIds],
        turnIndex: 0,
        direction: 1,
        currentColor: "red",
        pendingDraw: { kind: null, amount: 0 },
        saidUNO,
        eliminated,
        message: "Game started!",
        gameOver: false,
        winnerId: null,
        namesById,

    };

    // deal 7 each
    for (let i = 0; i < 7; i++) {
        for (const pid of playerIds) {
            s = drawOne(s);
            hands[pid].push(s._drawnCard);
            delete s._drawnCard;
        }
    }

    // start card (avoid wilds)
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

    return s;
}

function activeCount(state) {
    return state.playerOrder.filter((pid) => !state.eliminated[pid]).length;
}

function topCard(state) {
    return state.discard[state.discard.length - 1] || null;
}

function nextIndex(state, fromIndex, steps = 1) {
    const n = state.playerOrder.length;
    const raw = (fromIndex + state.direction * steps) % n;
    return (raw + n) % n;
}

function findNextActiveIndex(state, fromIndex, steps = 1) {
    let idx = nextIndex(state, fromIndex, steps);
    for (let guard = 0; guard < state.playerOrder.length; guard++) {
        const pid = state.playerOrder[idx];
        if (!state.eliminated[pid]) return idx;
        idx = nextIndex(state, idx, 1);
    }
    return idx;
}

function applyElimination(state, pid) {
    if (!state.eliminated[pid] && state.hands[pid].length >= ELIMINATION_HAND_SIZE) {
        state.eliminated[pid] = true;
        state.message = `Player eliminated (25+ cards)!`;
    }
    if (activeCount(state) <= 1) {
        const winner = state.playerOrder.find((p) => !state.eliminated[p]) || null;
        state.gameOver = true;
        state.winnerId = winner;
        state.message = winner ? "Winner by last standing!" : "Game over.";
    }
}

function drawMany(state, pid, count) {
    for (let i = 0; i < count; i++) {
        state = drawOne(state);
        const c = state._drawnCard;
        delete state._drawnCard;
        if (!c) break;
        state.hands[pid].push(c);
    }
    applyElimination(state, pid);
    return state;
}

// The ONE function your server will call
export function applyAction(state, actorId, action) {
    if (state.gameOver) return state;

    const currentPid = state.playerOrder[state.turnIndex];
    if (actorId !== currentPid) {
        return { ...state, message: "Not your turn." };
    }
    if (state.eliminated[actorId]) return state;

    // UNO press
    if (action.type === "uno") {
        return {
            ...state,
            saidUNO: { ...state.saidUNO, [actorId]: true },
            message: "UNO pressed.",
        };
    }

    // Draw
    if (action.type === "draw") {
        const s = structuredClone(state);

        if (s.pendingDraw.amount > 0) {
            const total = s.pendingDraw.amount;
            let s2 = drawMany(s, actorId, total);
            s2.pendingDraw = { kind: null, amount: 0 };
            s2.message = `Drew ${total} (stack) and lost the turn.`;
            s2.saidUNO[actorId] = false;
            s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, 1);
            return s2;
        }

        const s2 = drawMany(s, actorId, 1);
        s2.message = "Drew a card.";
        s2.saidUNO[actorId] = false;
        s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, 1);
        return s2;
    }

    // Play card
    if (action.type === "play") {
        const s = structuredClone(state);
        const cardId = action.cardId;
        const hand = s.hands[actorId];
        const card = hand.find((c) => c.id === cardId);
        if (!card) return { ...state, message: "Card not found." };

        if (!canPlay(card, topCard(s), s.currentColor, s.pendingDraw)) {
            return { ...state, message: "You can't play that card." };
        }

        // remove from hand
        s.hands[actorId] = hand.filter((c) => c.id !== cardId);
        s.discard.push(card);

        let skipNext = false;
        let msg = `Played ${cardLabel(card)}.`;

        // set color
        if (card.kind === "wild" || card.kind === "wild_draw4") {
            if (!action.chosenColor || !COLORS.includes(action.chosenColor)) {
                return { ...state, message: "Choose a valid color for wild." };
            }

            
            card.color = action.chosenColor;
            s.currentColor = action.chosenColor;
        } else {
            s.currentColor = card.color;
        }


        // actions
        if (card.kind === "skip") {
            skipNext = true;
            msg += " (skip)";
        }

        if (card.kind === "reverse") {
            s.direction *= -1;
            // 2 players: reverse acts like skip
            if (s.playerOrder.length === 2) skipNext = true;
            msg += " (reverse)";
        }

        if (isDrawKind(card.kind)) {
            const add = drawAmountForKind(card.kind);
            s.pendingDraw = { kind: card.kind, amount: (s.pendingDraw.amount || 0) + add };
            msg += ` (stack +${s.pendingDraw.amount})`;
        }

        // win by empty hand
        if (s.hands[actorId].length === 0) {
            s.gameOver = true;
            s.winnerId = actorId;
            s.message = "Winner!";
            return s;
        }

        // UNO penalty
        if (s.hands[actorId].length === 1 && !s.saidUNO[actorId]) {
            let s2 = drawMany(s, actorId, UNO_PENALTY_DRAW);
            s2.message = `${msg} UNO not called → drew ${UNO_PENALTY_DRAW} penalty.`;
            if (s2.gameOver) return s2;
            s2.saidUNO[actorId] = false;
            s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, skipNext ? 2 : 1);
            return s2;
        }

        // normal end turn
        s.message = msg;
        s.saidUNO[actorId] = false;
        s.turnIndex = findNextActiveIndex(s, s.turnIndex, skipNext ? 2 : 1);
        return s;
    }

    return state;
}
