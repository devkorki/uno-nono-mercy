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
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 900 }}>Rules</div>
        <div style={{ opacity: 0.85, marginTop: 6 }}>
          This page documents the rules currently implemented in the app.
        </div>

        <hr style={{ border: 0, borderTop: "1px solid #222", margin: "14px 0" }} />

        <div style={{ display: "grid", gap: 10 }}>
          <section>
            <div style={{ fontWeight: 900 }}>Goal</div>
            <div>Get rid of all your cards, or be the last player not eliminated.</div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Playable cards</div>
            <div>Match by color or number. Action cards can match by same action type. Wilds always playable.</div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>Draw stacking</div>
            <div>
              Draw cards stack only with the <b>same draw type</b>:
              <ul style={{ margin: "6px 0 0 18px" }}>
                <li>+2 stacks with +2</li>
                <li>+6 stacks with +6</li>
                <li>+10 stacks with +10</li>
                <li>WILD +4 stacks with WILD +4</li>
              </ul>
              If you can’t stack, you must draw the total and lose your turn.
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900 }}>UNO rule</div>
            <div>
              If you end your play with exactly 1 card and didn’t press <b>UNO</b> that turn,
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
