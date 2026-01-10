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
        awaiting: null,

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

function hasAnyPlayable(state, pid) {
    const t = topCard(state);
    return state.hands[pid].some((c) => canPlay(c, t, state.currentColor, state.pendingDraw));
}


function swapHands(state, a, b) {
    const tmp = state.hands[a];
    state.hands[a] = state.hands[b];
    state.hands[b] = tmp;

    // Reset UNO state for both players
    state.saidUNO[a] = false;
    state.saidUNO[b] = false;
}


function listSwapTargets(state, actorId) {
    return state.playerOrder.filter((pid) => pid !== actorId && !state.eliminated[pid]);
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


// If we are waiting for a choice, only allow the resolver action from that actor


// The ONE function your server will call




export function applyAction(state, actorId, action) {


    if (state.awaiting) {
        const aw = state.awaiting;

        if (actorId !== aw.actorId) {
            return { ...state, message: "Waiting for another player's choice." };
        }

        // Resolve wild color
        if (aw.type === "wild") {
            if (action.type !== "resolve:wild") {
                return { ...state, message: "Choose a color for the Wild first." };
            }
            if (!action.chosenColor || !COLORS.includes(action.chosenColor)) {
                return { ...state, message: "Choose a valid color." };
            }

            const s = structuredClone(state);
            // Update top card color so it displays as chosen color
            const top = s.discard[s.discard.length - 1];
            if (top && top.id === aw.cardId) top.color = action.chosenColor;

            s.currentColor = action.chosenColor;
            s.awaiting = null;

            // Finish turn now (no extra effects besides color already applied)
            s.message = `Wild color chosen: ${action.chosenColor.toUpperCase()}.`;
            s.saidUNO[actorId] = false;
            s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
            return s;
        }

        // Resolve 7 swap
        if (aw.type === "swap7") {
            if (action.type !== "resolve:swap7") {
                return { ...state, message: "Choose a player to swap hands with." };
            }

            const target = action.swapWith;
            if (!target || !state.hands[target] || state.eliminated[target] || target === actorId) {
                return { ...state, message: "Choose a valid player to swap with." };
            }

            const s = structuredClone(state);
            swapHands(s, actorId, target);
            s.awaiting = null;

            s.message = `Swapped hands with ${s.namesById?.[target] || target}.`;
            s.saidUNO[actorId] = false;
            s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
            return s;
        }
    }

    if (state.gameOver) return state;

    const currentPid = state.playerOrder[state.turnIndex];
    if (actorId !== currentPid) return { ...state, message: "Not your turn." };
    if (state.eliminated[actorId]) return state;

    // ----------------------------
    // Awaiting choice gate
    // ----------------------------
    if (state.awaiting) {
        const aw = state.awaiting;

        if (actorId !== aw.actorId) {
            return { ...state, message: "Waiting for another player's choice." };
        }

        // Resolve wild color
        if (aw.type === "wild") {
            if (action.type !== "resolve:wild") {
                return { ...state, message: "Choose a color for the Wild first." };
            }
            if (!action.chosenColor || !COLORS.includes(action.chosenColor)) {
                return { ...state, message: "Choose a valid color." };
            }

            const s = structuredClone(state);

            // Update top card to chosen color (so UI shows it colored)
            const top = s.discard[s.discard.length - 1];
            if (top && top.id === aw.cardId) top.color = action.chosenColor;

            s.currentColor = action.chosenColor;
            s.awaiting = null;

            s.message = `Wild color chosen: ${action.chosenColor.toUpperCase()}.`;
            s.saidUNO[actorId] = false;
            s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
            return s;
        }

        // Resolve 7 swap
        if (aw.type === "swap7") {
            if (action.type !== "resolve:swap7") {
                return { ...state, message: "Choose a player to swap hands with." };
            }

            const target = action.swapWith;
            if (!target || !state.hands[target] || state.eliminated[target] || target === actorId) {
                return { ...state, message: "Choose a valid player to swap with." };
            }

            const s = structuredClone(state);
            swapHands(s, actorId, target);
            s.awaiting = null;

            s.message = `Swapped hands with ${s.namesById?.[target] || target}.`;
            s.saidUNO[actorId] = false;
            s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
            return s;
        }

        return state;
    }

    // ----------------------------
    // UNO press
    // ----------------------------
    if (action.type === "uno") {
        return {
            ...state,
            saidUNO: { ...state.saidUNO, [actorId]: true },
            message: "UNO pressed.",
        };
    }

    // ----------------------------
    // DRAW action (with new rule)
    // ----------------------------
    if (action.type === "draw") {
        let s = structuredClone(state);

        // pending draw stack: take all and lose turn (keep your old logic)
        if (s.pendingDraw.amount > 0) {
            const total = s.pendingDraw.amount;
            s = drawMany(s, actorId, total);
            s.pendingDraw = { kind: null, amount: 0 };
            s.message = `Drew ${total} (stack) and lost the turn.`;
            s.saidUNO[actorId] = false;
            s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
            return s;
        }

        // NEW RULE:
        // If you have nothing playable, keep drawing until you can play,
        // then auto-play the first playable drawn card.
        if (!hasAnyPlayable(s, actorId)) {
            while (true) {
                s = drawOne(s);
                const c = s._drawnCard;
                delete s._drawnCard;

                if (!c) {
                    s.message = "No playable cards → deck empty.";
                    s.saidUNO[actorId] = false;
                    s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
                    return s;
                }

                s.hands[actorId].push(c);
                applyElimination(s, actorId);
                if (s.gameOver) return s;

                const playableNow = canPlay(c, topCard(s), s.currentColor, s.pendingDraw);
                if (playableNow) {
                    // Auto-play, but DO NOT auto-choose wild/swap.
                    // If it's wild or 7, play() will set awaiting and UI will show modal.
                    const after = applyAction(s, actorId, { type: "play", cardId: c.id });
                    return {
                        ...after,
                        message: `No playable cards → drew until playable and played ${cardLabel(c)}. ${after.message}`,
                    };
                }
            }
        }

        // Otherwise: normal draw 1 and pass turn
        s = drawMany(s, actorId, 1);
        s.message = "Drew a card.";
        s.saidUNO[actorId] = false;
        s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
        return s;
    }

    // ----------------------------
    // PLAY action
    // ----------------------------
    if (action.type === "play") {
        const s = structuredClone(state);

        const cardId = action.cardId;
        const hand = s.hands[actorId];
        const card = hand.find((c) => c.id === cardId);
        if (!card) return { ...state, message: "Card not found." };

        if (!canPlay(card, topCard(s), s.currentColor, s.pendingDraw)) {
            return { ...state, message: "You can't play that card." };
        }

        // remove from hand + discard
        s.hands[actorId] = hand.filter((c) => c.id !== cardId);
        s.discard.push(card);

        if (card.kind !== "wild" && card.kind !== "wild_draw4") {
            s.currentColor = card.color;   
        }

        let skipNext = false;
        let msg = `Played ${cardLabel(card)}.`;

        // Wild -> pause for color choice
        // if (card.kind === "wild" || card.kind === "wild_draw4") {
        //     s.awaiting = { type: "wild", actorId, cardId: card.id };
        //     s.message = "Choose a color for the Wild.";
        //     return s; // IMPORTANT
        // } else {
        //     s.currentColor = card.color;
        // }


        if (card.kind === "wild" || card.kind === "wild_draw4") {
            // ✅ If it's a draw kind, apply the draw stack NOW
            if (isDrawKind(card.kind)) {
                const add = drawAmountForKind(card.kind);
                s.pendingDraw = {
                    kind: card.kind,
                    amount: (s.pendingDraw.amount || 0) + add,
                };
            }

            // ✅ Pause for color choice
            s.awaiting = { type: "wild", actorId, cardId: card.id };
            s.message = "Choose a color for the Wild.";
            return s; // now safe
        }

        // 7 -> pause for swap choice
        if (card.kind === "num" && card.value === 7) {
            const targets = listSwapTargets(s, actorId);
            if (targets.length > 0) {
                s.awaiting = { type: "swap7", actorId, cardId: card.id };
                s.message = "Choose a player to swap hands with.";
                return s; // IMPORTANT
            }
        }

        // skip/reverse/draw stack
        if (card.kind === "skip") {
            skipNext = true;
            msg += " (skip)";
        }

        if (card.kind === "reverse") {
            s.direction *= -1;
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
            const s2 = drawMany(s, actorId, UNO_PENALTY_DRAW);
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

// export function applyAction(state, actorId, action) {
//     if (state.gameOver) return state;

//     const currentPid = state.playerOrder[state.turnIndex];
//     if (actorId !== currentPid) {
//         return { ...state, message: "Not your turn." };
//     }
//     if (state.eliminated[actorId]) return state;

//     // UNO press
//     if (action.type === "uno") {
//         return {
//             ...state,
//             saidUNO: { ...state.saidUNO, [actorId]: true },
//             message: "UNO pressed.",
//         };
//     }

//     // Draw
//     // if (action.type === "draw") {
//     //     const s = structuredClone(state);

//     //     if (s.pendingDraw.amount > 0) {
//     //         const total = s.pendingDraw.amount;
//     //         let s2 = drawMany(s, actorId, total);
//     //         s2.pendingDraw = { kind: null, amount: 0 };
//     //         s2.message = `Drew ${total} (stack) and lost the turn.`;
//     //         s2.saidUNO[actorId] = false;
//     //         s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, 1);
//     //         return s2;
//     //     }

//     //     const s2 = drawMany(s, actorId, 1);
//     //     s2.message = "Drew a card.";
//     //     s2.saidUNO[actorId] = false;
//     //     s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, 1);
//     //     return s2;
//     // }


//     // If you have no playable cards, you must draw until you can play,
//     // then the first playable drawn card is auto-played.
//     if (!hasAnyPlayable(s, actorId)) {
//         while (true) {
//             s = drawOne(s);
//             const c = s._drawnCard;
//             delete s._drawnCard;

//             if (!c) {
//                 // No card could be drawn (deck empty edge case)
//                 s.message = "No playable cards → deck empty.";
//                 s.saidUNO[actorId] = false;
//                 s.turnIndex = findNextActiveIndex(s, s.turnIndex, 1);
//                 return s;
//             }

//             s.hands[actorId].push(c);
//             applyElimination(s, actorId);
//             if (s.gameOver) return s;

//             const playableNow = canPlay(c, topCard(s), s.currentColor, s.pendingDraw);
//             if (playableNow) {
//                 // Defaults for forced auto-play:
//                 const auto = { type: "play", cardId: c.id };

//                 // Wild: choose currentColor automatically (keeps game moving)
//                 if (c.kind === "wild" || c.kind === "wild_draw4") {
//                     auto.chosenColor = s.currentColor;
//                 }

//                 // 7 rule: must swap — choose first available opponent automatically
//                 if (c.kind === "num" && c.value === 7) {
//                     const target = s.playerOrder.find((pid) => pid !== actorId && !s.eliminated[pid]);
//                     if (target) auto.swapWith = target;
//                 }

//                 const after = applyAction(s, actorId, auto);

//                 // Nice message so you understand what happened
//                 return {
//                     ...after,
//                     message: `No playable cards → drew until playable and auto-played ${cardLabel(c)}. ${after.message}`,
//                 };
//             }
//         }
//     }

//     // Otherwise normal draw 1 and pass turn (your old behavior)
//     const s2 = drawMany(s, actorId, 1);
//     s2.message = "Drew a card.";
//     s2.saidUNO[actorId] = false;
//     s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, 1);
//     return s2;


//     // Play card
//     if (action.type === "play") {
//         const s = structuredClone(state);
//         const cardId = action.cardId;
//         const hand = s.hands[actorId];
//         const card = hand.find((c) => c.id === cardId);
//         if (!card) return { ...state, message: "Card not found." };

//         if (!canPlay(card, topCard(s), s.currentColor, s.pendingDraw)) {
//             return { ...state, message: "You can't play that card." };
//         }

//         // remove from hand
//         s.hands[actorId] = hand.filter((c) => c.id !== cardId);
//         s.discard.push(card);

//         let skipNext = false;
//         let msg = `Played ${cardLabel(card)}.`;

//         // // set color
//         // if (card.kind === "wild" || card.kind === "wild_draw4") {
//         //     if (!action.chosenColor || !COLORS.includes(action.chosenColor)) {
//         //         return { ...state, message: "Choose a valid color for wild." };
//         //     }


//         //     card.color = action.chosenColor;
//         //     s.currentColor = action.chosenColor;
//         // } else {
//         //     s.currentColor = card.color;
//         // }

//         if (card.kind === "wild" || card.kind === "wild_draw4") {
//             // We ALWAYS pause for a color choice (modal)
//             s.awaiting = { type: "wild", actorId, cardId: card.id };
//             s.message = "Choose a color for the Wild.";
//             // Keep currentColor as-is for now; color will be applied on resolve:wild
//         } else {
//             s.currentColor = card.color;
//         }



//         // actions


//         // SPECIAL RULE: 7 → swap hands
//         // if (card.kind === "num" && card.value === 7) {
//         //     const target = action.swapWith;

//         //     if (!target || !s.hands[target]) {
//         //         return { ...state, message: "You must choose a player to swap hands with." };
//         //     }
//         //     if (target === actorId) {
//         //         return { ...state, message: "You can't swap with yourself." };
//         //     }
//         //     if (s.eliminated[target]) {
//         //         return { ...state, message: "You can't swap with an eliminated player." };
//         //     }

//         //     swapHands(s, actorId, target);
//         //     msg += ` Swapped hands with ${s.namesById?.[target] || "player"}.`;
//         // }


//         if (card.kind === "num" && card.value === 7) {
//             // Pause for swap choice (modal)
//             const targets = listSwapTargets(s, actorId);
//             if (targets.length > 0) {
//                 s.awaiting = { type: "swap7", actorId, cardId: card.id };
//                 s.message = "Choose a player to swap hands with.";
//                 return s; // IMPORTANT: stop here; resolve will end the turn
//             }
//         }




//         if (card.kind === "skip") {
//             skipNext = true;
//             msg += " (skip)";
//         }

//         if (card.kind === "reverse") {
//             s.direction *= -1;
//             // 2 players: reverse acts like skip
//             if (s.playerOrder.length === 2) skipNext = true;
//             msg += " (reverse)";
//         }

//         if (isDrawKind(card.kind)) {
//             const add = drawAmountForKind(card.kind);
//             s.pendingDraw = { kind: card.kind, amount: (s.pendingDraw.amount || 0) + add };
//             msg += ` (stack +${s.pendingDraw.amount})`;
//         }

//         // win by empty hand
//         if (s.hands[actorId].length === 0) {
//             s.gameOver = true;
//             s.winnerId = actorId;
//             s.message = "Winner!";
//             return s;
//         }

//         // UNO penalty
//         if (s.hands[actorId].length === 1 && !s.saidUNO[actorId]) {
//             let s2 = drawMany(s, actorId, UNO_PENALTY_DRAW);
//             s2.message = `${msg} UNO not called → drew ${UNO_PENALTY_DRAW} penalty.`;
//             if (s2.gameOver) return s2;
//             s2.saidUNO[actorId] = false;
//             s2.turnIndex = findNextActiveIndex(s2, s2.turnIndex, skipNext ? 2 : 1);
//             return s2;
//         }

//         // normal end turn
//         s.message = msg;
//         s.saidUNO[actorId] = false;
//         s.turnIndex = findNextActiveIndex(s, s.turnIndex, skipNext ? 2 : 1);
//         return s;
//     }

//     return state;
// }
