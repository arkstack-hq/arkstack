<template>
  <section
    class="terminal-frame"
    aria-label="Arkstack dependencies code preview"
  >
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
    </header>

    <main class="terminal-body">
      <pre
        class="code-block"
      ><code><span class="key">"dependencies"</span><span class="punctuation">: {</span>
  <span v-for="dependency in dependencies" :key="dependency.name" class="line">
  <span class="key">"{{ dependency.name }}"</span><span class="punctuation">: </span><span class="value">"{{ dependency.version }}"</span><span class="punctuation">{{ dependency.comma ? ',' : '' }}</span></span>
<span class="punctuation">}</span></code></pre>
    </main>
  </section>
</template>

<script setup>
const dependencies = [
  { name: '@arkstack/auth', version: '^0.4.0', comma: true },
  { name: '@arkstack/common', version: '^0.4.0', comma: true },
  { name: '@arkstack/console', version: '^0.4.0', comma: true },
  { name: '@arkstack/contract', version: '^0.4.0', comma: true },
  { name: '@arkstack/driver-express', version: '^0.4.0', comma: true },
  { name: '@arkstack/filesystem', version: '^0.4.0', comma: true },
  { name: '@arkstack/http', version: '^0.4.0', comma: true },
  { name: '@arkstack/notifications', version: '^0.4.0', comma: true },
  { name: '@arkstack/view', version: '^0.4.0', comma: false },
];
</script>

<style scoped lang="scss">
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
  border: 1px solid var(--gold);
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 26% 56%,
      rgba(52, 110, 135, 0.16),
      transparent 28%
    ),
    radial-gradient(
      circle at 80% 76%,
      rgba(201, 150, 12, 0.07),
      transparent 30%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: var(--muted);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;

  .terminal-bar {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.045);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.045),
      rgba(0, 0, 0, 0.18)
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
    background: #ff514f;
  }
  .dot-yellow {
    background: #ffc34a;
  }
  .dot-green {
    background: #45c84f;
  }

  .terminal-body {
    height: calc(100% - 105px);
    display: flex;
    align-items: center;
    padding: 5px 15px 5px;
  }

  .code-block {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    letter-spacing: -0.04em;
    font-weight: 500;
    white-space: pre;
  }

  .key {
    color: var(--blue);
  }

  .value {
    color: var(--text);
  }

  .punctuation {
    color: var(--gold);
  }

  .line {
    display: contents;
  }
}

@media (max-width: 900px) {
  .terminal-frame {
    width: 100%;
    height: auto;
    min-height: 560px;
    border-radius: 14px;
  }

  .terminal-bar {
    height: 64px;
    gap: 14px;
    padding: 0 24px;
  }

  .dot {
    width: 20px;
    height: 20px;
  }

  .terminal-body {
    height: auto;
    overflow-x: auto;
    padding: 28px 24px;
  }

  .code-block {
    font-size: 22px;
  }
}
</style>
