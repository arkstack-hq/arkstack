<template>
  <section
    class="terminal-frame"
    aria-label="Extensible drivers architecture diagram"
  >
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>

      <div class="prompt">
        <span class="user">sudo@arkstack:~$</span>
        <span class="cursor"></span>
      </div>
    </header>

    <main class="terminal-body">
      <section class="diagram">
        <div class="top-contract">
          <span>driver contract</span>
          <span class="arrow">|</span>
          <span class="arrow">|</span>
          <span class="arrow">v</span>
        </div>

        <div class="diagram-row center-row">
          <div class="driver-box cyan">
            <span class="title">express driver</span>
          </div>

          <div class="horizontal-arrow left-arrow"></div>

          <div class="core-box">
            <span class="title">app architecture</span>
            <span class="subtitle">stable application core</span>
          </div>

          <div class="horizontal-arrow right-arrow"></div>

          <div class="driver-box cyan">
            <span class="title">h3 driver</span>
          </div>
        </div>

        <div class="notes-row top-notes">
          <span>// plug in new runtimes</span>
          <span>// keep app logic unchanged</span>
        </div>

        <div class="vertical-line"></div>

        <div class="bottom-connectors">
          <div class="branch">
            <div class="branch-line"></div>
            <span class="arrow">v</span>
          </div>

          <div class="branch">
            <div class="branch-line"></div>
            <span class="arrow">v</span>
          </div>
        </div>

        <div class="diagram-row bottom-row">
          <div class="driver-box cyan small">
            <span class="title">custom driver</span>
          </div>

          <div class="driver-box cyan small">
            <span class="title">future drivers</span>
          </div>
        </div>

        <div class="notes-row bottom-notes">
          <span>// extend without rewrites</span>
          <span>// plug in tomorrow's runtimes</span>
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
      circle at 25% 40%,
      rgba(185, 200, 214, 0.12),
      transparent 30%
    ),
    radial-gradient(
      circle at 75% 80%,
      rgba(218, 210, 187, 0.05),
      transparent 28%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: var(--muted);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;
}

.terminal-bar {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(201, 150, 12, 0.22);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04),
    rgba(0, 0, 0, 0.12)
  );
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.dot-red {
  background: #ff5b52;
}
.dot-yellow {
  background: #ffc341;
}
.dot-green {
  background: #39c759;
}

.prompt {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 14px;
  font-size: 14px;
}

.user {
  color: var(--gold);
}

.cursor {
  width: 8px;
  height: 18px;
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
  position: relative;
  margin-top: 10px;
}

.top-contract {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  color: var(--gold);
  font-size: 10px;
  line-height: 1;
  margin-bottom: 2px;
}

.arrow {
  color: var(--gold);
}

.diagram-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-row {
  gap: 12px;
}

.bottom-row {
  justify-content: center;
  gap: 148px;
  margin-top: 0;
}

.driver-box,
.core-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--blue);
  min-width: 160px;
  height: 56px;
  padding: 6px 10px;
}

.driver-box.small {
  width: 166px;
}

.driver-box .title {
  color: var(--blue);
  font-size: 13px;
}

.core-box {
  border-color: var(--gold);
  width: 236px;
}

.core-box .title {
  color: var(--gold);
  font-size: 13px;
}

.core-box .subtitle {
  margin-top: 5px;
  color: var(--text);
  font-size: 10px;
}

.horizontal-arrow {
  position: relative;
  width: 74px;
  height: 1px;
  border-top: 1px dashed var(--gold);
}

.horizontal-arrow::after {
  content: '';
  position: absolute;
  top: -4px;
  right: -1px;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 7px solid var(--gold);
}

.right-arrow {
  transform: rotate(180deg);
}

.notes-row {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 7px;
}

.top-notes {
  padding: 4px 30px 0;
}

.bottom-notes {
  margin-top: 1px;
  padding: 0 41px;
}

.vertical-line {
  width: 1px;
  height: 25px;
  border-left: 1px dashed var(--gold);
  margin: 0 auto;
}

.bottom-connectors {
  display: flex;
  justify-content: center;
  gap: 335px;
  margin-top: -1px;
}

.branch {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.branch-line {
  width: 1px;
  height: 28px;
  border-left: 1px dashed var(--gold);
}

@media (max-width: 900px) {
  .terminal-frame {
    width: 100%;
    height: auto;
  }

  .diagram {
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .center-row,
  .bottom-row,
  .bottom-connectors {
    width: max-content;
  }
}
</style>
