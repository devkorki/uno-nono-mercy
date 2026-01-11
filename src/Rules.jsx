export default function Rules({ onBack }) {
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
          width: "min(860px, 100%)",
          background: "#0f0f10",
          border: "1px solid #2a2a2a",
          borderRadius: 18,
          padding: 18,
          lineHeight: 1.55,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 900 }}>Rules</div>

        <hr style={{ border: 0, borderTop: "1px solid #222", margin: "14px 0" }} />

        <div style={{ display: "grid", gap: 12 }}>
          <section>
            <div style={{ fontWeight: 900 }}>Goal</div>
            <div>Get rid of all your cards, or be the last player not eliminated.</div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Playable cards</div>
            <div>
              Match by <b>color</b> or <b>number</b>. Action cards can match by the same action type.
              <b> Wild cards are always playable.</b>
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Action cards</div>
            <ul style={{ margin: "6px 0 0 18px" }}>
              <li><b>Skip</b>: next player loses their turn.</li>
              <li><b>Reverse</b>: reverses direction of play.</li>
              <li><b>Discard All</b>: discard all cards in your hand that match the card’s color.</li>
              <li><b>Skip Everyone</b>: everyone is skipped — you play again.</li>
              <li><b>7</b>: when you play a 7, you must choose a player to swap hands with.</li>
            </ul>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Draw cards & stacking</div>
            <div>
              Draw cards can be stacked with other draw cards. When a draw stack exists, you must either:
              <ul style={{ margin: "6px 0 0 18px" }}>
                <li><b>Stack</b> another draw card of <b>equal or higher</b> value (minimum rule), or</li>
                <li><b>Draw</b> the full stacked amount and lose your turn.</li>
              </ul>

              <div style={{ marginTop: 8, opacity: 0.9 }}>
                Supported draw cards: <b>+2</b>, <b>+4</b>, <b>+6</b>, <b>+10</b>, and wild draw cards.
              </div>
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Wild cards</div>
            <ul style={{ margin: "6px 0 0 18px" }}>
              <li><b>Wild</b>: choose a color.</li>
              <li><b>Wild +6</b> / <b>Wild +10</b>: choose a color and add to the draw stack.</li>
              <li>
                <b>Wild Reverse +4</b>: reverses direction, adds <b>+4</b> to the draw stack, then you choose a color.
                <ul style={{ margin: "6px 0 0 18px" }}>
                  <li><b>3+ players</b>: the “player before you” (after the reverse) is the one who must respond to the draw stack.</li>
                  <li><b>2 players</b>: the player who played it becomes the target (must respond to +4 unless they stack).</li>
                </ul>
              </li>
              <li>
                <b>Wild Color Roulette</b>: you play it, and the <b>next player chooses a color</b>.
                They then draw cards until they draw a card of that chosen color.
                <b> Wild cards don’t count as a match.</b>
                All drawn cards go to their hand and they <b>lose their turn</b>.
              </li>
            </ul>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Drawing</div>
            <div>
              If you have <b>no playable card</b>, you must keep drawing until you get a playable card.
              The first playable card you draw is immediately played.
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>UNO rule</div>
            <div>
              If you end your play with exactly <b>1 card</b> and didn’t press <b>UNO</b> that turn,
              you immediately draw <b>2</b> penalty cards.
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Elimination</div>
            <div>
              If you ever reach <b>25+ cards</b>, you are <b>eliminated</b>. Eliminated players are skipped in turn order.
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Reverse in 2 players</div>
            <div>Reverse acts like Skip (you get another turn).</div>
          </section>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onBack}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #3a3a3a",
              background: "#171717",
              color: "white",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
