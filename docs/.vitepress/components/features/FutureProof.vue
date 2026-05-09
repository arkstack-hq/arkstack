<template>
  <section
    class="terminal-frame"
    aria-label="Future proof architecture diagram"
  >
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>

      <div class="prompt">
        <span class="user">sudo@arkstack</span>
        <span>:~$</span>
        <span class="cursor"></span>
      </div>
    </header>

    <main class="terminal-body">
      <section class="diagram">
        <div class="diagram-header">
          <span class="headline">built to evolve</span>
          <span class="subline">// Long-term maintainability</span>
        </div>

        <div class="main-row">
          <div class="node-group">
            <div class="node node-blue">
              <span>current runtimes</span>
            </div>

            <span class="note">// Works today</span>
          </div>

          <div class="connection left"></div>

          <div class="core-group">
            <div class="node node-gold core-node">
              <span>stable core</span>
            </div>

            <div class="vertical-link"></div>
            <span class="arrow">v</span>
          </div>

          <div class="connection right"></div>

          <div class="node-group">
            <div class="node node-blue">
              <span>new runtimes</span>
            </div>

            <span class="note">// Adapts tomorrow</span>
          </div>
        </div>

        <div class="bottom-row">
          <div class="node-group centered">
            <div class="node node-blue small">
              <span>new tools</span>
            </div>

            <span class="note">// Extensible tooling</span>
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
  border: 1.5px solid var(--gold);
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 26% 42%,
      rgba(44, 82, 112, 0.14),
      transparent 30%
    ),
    radial-gradient(
      circle at 74% 78%,
      rgba(201, 150, 12, 0.06),
      transparent 28%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: var(--text);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;
}

.terminal-bar {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 15px;
  border-bottom: 1px solid rgba(201, 150, 12, 0.24);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04),
    rgba(0, 0, 0, 0.14)
  );
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
}

.dot-red {
  background: #ff4f52;
}
.dot-yellow {
  background: #ffc63d;
}
.dot-green {
  background: #39c94e;
}

.prompt {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 28px;
  font-size: 15px;
}

.user {
  color: var(--gold);
}

.cursor {
  width: 8px;
  height: 18px;
  margin-left: 7px;
  background: var(--text);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.terminal-body {
  padding: 10px 15px 10px;
}

.diagram {
  margin-top: 14px;
}

.diagram-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 14px;
}

.headline {
  color: var(--gold);
  font-size: 14px;
  font-weight: 500;
}

.subline {
  color: var(--muted);
  font-size: 12px;
}

.main-row {
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
  min-width: 130px;
  height: 54px;
  padding: 0 18px;
}

.node span {
  font-size: 9px;
  line-height: 1;
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

.core-node {
  width: 155px;
  height: 74px;
}

.small {
  width: 164px;
  min-width: 164px;
}

.note {
  margin-top: 11px;
  color: var(--muted);
  font-size: 11px;
}

.connection {
  position: relative;
  width: 92px;
  margin-top: 27px;
  border-top: 1px dashed var(--gold);
}

.connection::after {
  content: '';
  position: absolute;
  top: -4px;
  right: -1px;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 8px solid var(--gold);
}

.connection.left {
  transform: rotate(180deg);
}

.core-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vertical-link {
  width: 1px;
  height: 42px;
  border-left: 1px dashed var(--gold);
}

.arrow {
  margin-top: -4px;
  color: var(--gold);
  font-size: 15px;
  line-height: 1;
}

.bottom-row {
  display: flex;
  justify-content: center;
  margin-top: 0;
}

.centered {
  align-items: center;
}

@media (max-width: 900px) {
  .terminal-frame {
    width: 100%;
    height: auto;
    min-height: 499px;
  }

  .terminal-body {
    overflow-x: auto;
  }

  .diagram {
    width: max-content;
    min-width: 760px;
  }
}
</style>
