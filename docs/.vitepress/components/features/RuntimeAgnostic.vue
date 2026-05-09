<template>
  <section
    class="terminal-frame"
    aria-label="Runtime agnostic architecture diagram"
  >
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>

      <div class="prompt">
        <span class="user">sudo@arkstack</span><span>:~$</span>
        <span class="cursor"></span>
      </div>
    </header>

    <main class="terminal-body">
      <section class="diagram">
        <p class="hint">// Your application code lives here</p>

        <div class="center-row">
          <div class="adapter-group left">
            <span class="adapter-label">// Express adapter</span>
            <div class="adapter-box">express</div>
          </div>

          <div class="arrow arrow-left"></div>

          <div class="app-box">
            <span class="app-title">src/</span>
            <span class="app-subtitle">(app logic)</span>
          </div>

          <div class="arrow arrow-right"></div>

          <div class="adapter-group right">
            <span class="adapter-label">// H3 adapter</span>
            <div class="adapter-box">h3</div>
          </div>
        </div>

        <div class="down-line"></div>
        <span class="down-arrow">v</span>

        <div class="future-row">
          <div class="future-box">...</div>
          <span class="future-label">Future adapters</span>
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
  border: 1.5px solid #c9960c;
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 50% 45%,
      rgba(255, 255, 255, 0.055),
      transparent 34%
    ),
    radial-gradient(
      circle at 78% 78%,
      rgba(201, 150, 12, 0.06),
      transparent 28%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: #eeeeee;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;
}

.terminal-bar {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 21px;
  border-bottom: 1px solid rgba(201, 150, 12, 0.25);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.035),
    rgba(0, 0, 0, 0.16)
  );
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.dot-red {
  background: #ff4f4f;
}
.dot-yellow {
  background: #ffc129;
}
.dot-green {
  background: #11c843;
}

.prompt {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: 30px;
  font-size: 16px;
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

.hint {
  margin: 0 0 15px !important;
  text-align: center;
  color: #9d9d9d !important;
  font-size: 10px !important;
}

.center-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.adapter-group {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.adapter-label,
.future-label {
  color: #009dff;
  font-size: 10px;
}

.adapter-box,
.app-box,
.future-box {
  border: 1px dashed #c9960c;
  display: flex;
  align-items: center;
  justify-content: center;
}

.adapter-box {
  width: 163px;
  height: 56px;
  color: #009dff;
  font-size: 15px;
}

.app-box {
  width: 236px;
  height: 80px;
  flex-direction: column;
  gap: 5px;
}

.app-title {
  color: #ffc400;
  font-size: 15px;
  font-weight: 600;
}

.app-subtitle {
  color: #eeeeee;
  font-size: 15px;
}

.arrow {
  position: relative;
  width: 96px;
  height: 1px;
  border-top: 1px dashed #c9960c;
  margin-top: 32px;
}

.arrow::after {
  content: '';
  position: absolute;
  top: -4px;
  right: -1px;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 8px solid #c9960c;
}

.arrow-left {
  transform: rotate(180deg);
}

.down-line {
  width: 1px;
  height: 47px;
  margin: 0 auto;
  border-left: 1px dashed #c9960c;
}

.down-arrow {
  display: block;
  margin-top: -3px;
  text-align: center;
  color: #ffc400;
  font-size: 16px;
  line-height: 1;
}

.future-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 0;
}

.future-box {
  width: 142px;
  height: 56px;
  color: #009dff;
  font-size: 15px;
}

@media (max-width: 900px) {
  .terminal-frame {
    width: 100%;
    height: auto;
    min-height: 479px;
  }

  .terminal-body {
    overflow-x: auto;
  }

  .diagram {
    width: max-content;
    min-width: 790px;
  }
}
</style>
