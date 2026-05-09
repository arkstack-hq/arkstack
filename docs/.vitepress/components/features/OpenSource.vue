<template>
  <section class="terminal-frame" aria-label="Open source Arkstack diagram">
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
      <p class="prompt">sudo@arkstack:~$</p>
      <span class="cursor"></span>
    </header>

    <main class="terminal-body">
      <section class="diagram">
        <div class="top-row">
          <div class="node-group left">
            <div class="node node-blue">
              <span>source code</span>
            </div>

            <span class="note">// Public repo</span>
          </div>

          <div class="connection horizontal"></div>

          <div class="center-group">
            <div class="node node-gold center-node">
              <span>Arkstack</span>
            </div>

            <div class="vertical-link"></div>

            <div class="node-group bottom">
              <div class="node node-blue small">
                <span>governance</span>
              </div>

              <span class="note">// Transparent decisions</span>
            </div>
          </div>

          <div class="connection horizontal reverse"></div>

          <div class="node-group right">
            <div class="node node-blue">
              <span>community</span>
            </div>

            <span class="note">// Contributors &amp; users</span>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

.dark .terminal-frame {
  --bg-gr-1: #071016;
  --bg-gr-2: #020506;
  --gold: #ffc400;
  --blue: #42a5ff;
  --text: #f5f5f5;
  --muted: #9a9a9a;
}

.terminal-frame {
  --bg: #050a0d;
  --bg-gr-1: #e4f0f8;
  --bg-gr-2: #ecf2f4;
  --panel: #0b0d0f;
  --gold: #dfab00;
  --text: #575757;
  --muted: #6f6d6d;
  --blue: #0c7de4;

  overflow: hidden;
  border: 1px solid #c9960c;
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 28% 42%,
      rgba(44, 82, 112, 0.14),
      transparent 28%
    ),
    radial-gradient(
      circle at 74% 76%,
      rgba(201, 150, 12, 0.06),
      transparent 30%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: #f2f2f2;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;

  .terminal-bar {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(0, 0, 0, 0.15)
    );
  }

  .cursor {
    width: 8px;
    height: 18px;
    margin-left: 7px;
    background: var(--text);
    animation: blink 1s infinite;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .dot-red {
    background: #ff6258;
  }
  .dot-yellow {
    background: #ffd76a;
  }
  .dot-green {
    background: #4ed65d;
  }

  .terminal-body {
    padding: 10px 15px 10px;
  }

  .prompt {
    margin: 0;
    color: var(--gold);
    font-size: 15px;
    font-weight: 500;
  }

  .diagram {
    margin-top: 20px;
  }

  .top-row {
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .node-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .node {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed;
    height: 75px;
    min-width: 125px;
    padding: 0 12px;
    background: rgba(0, 0, 0, 0.12);
  }

  .node span {
    font-size: 13px;
    line-height: 1;
    font-weight: 500;
  }

  .node-blue {
    border-color: var(--blue);
  }

  .node-blue span {
    color: var(--blue);
  }

  .node-gold {
    border-color: var(--gold);
  }

  .node-gold span {
    color: var(--gold);
  }

  .center-node {
    width: 195px;
    height: 90px;
  }

  .small {
    min-width: 150px;
    height: 55px;
  }

  .note {
    margin-top: 5px;
    color: var(--muted);
    font-size: 10px;
  }

  .connection {
    position: relative;
    width: 50px;
    margin-top: 50px;
    border-top: 1px dashed var(--gold);
  }

  .connection::after {
    content: '';
    position: absolute;
    top: -10px;
    right: -2px;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-left: 16px solid var(--gold);
  }

  .connection.reverse {
    transform: rotate(180deg);
  }

  .center-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .vertical-link {
    width: 3px;
    height: 90px;
    border-left: 1px dashed var(--gold);
  }

  .bottom {
    margin-top: 0;
  }
}

@media (max-width: 1700px) {
  .terminal-frame {
    width: 100%;
    height: auto;
  }

  .terminal-body {
    overflow-x: auto;
  }

  .diagram {
    width: max-content;
  }
}
</style>
