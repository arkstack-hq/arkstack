<template>
  <div class="terminal" aria-label="Arkstack terminal mockup">
    <section class="ark-topbar">
      <div class="dots" aria-hidden="true">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <div class="prompt">
        <span class="user">sudo@arkstack</span>:~$ pnpm create arkstack
        <span class="cursor"></span>
      </div>
    </section>

    <section class="content">
      <pre class="logo">
  ___               _             _    
 / _ \             | |           | |   
/ /_\ \_ __ ___ ___| |_ __ _  ___| | __
|  _  | '__/ __/ __| __/ _' |/ __| |/ /
| | | | | | (__\__ \ || (_| | (__|   < 
\_| |_/_|  \___|___/\__\__,_|\___|_|\_\</pre
      >
      <div class="question">
        <span class="mark">?</span>Choose runtime template:
      </div>

      <ul class="choices">
        <li :class="selected === 'ex' ? 'selected' : ''">
          <span class="indicator">›</span><span>Express Runtime Template</span>
        </li>
        <li :class="selected === 'exm' ? 'selected' : ''">
          <span class="indicator">›</span
          ><span>Express Lean Runtime Template</span>
        </li>
        <li :class="selected === 'h3' ? 'selected' : ''">
          <span class="indicator">›</span><span>H3 Runtime Template</span>
        </li>
        <li :class="selected === 'h3m' ? 'selected' : ''">
          <span class="indicator">›</span><span>H3 Lean Runtime Template</span>
        </li>
      </ul>

      <div class="footer">
        <span><span class="key">↑↓</span> navigate</span>
        <span class="dot-sep">•</span>
        <span><span class="key">↵</span> select</span>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
const { selected = 'ex' } = defineProps<{
  selected?: 'h3' | 'ex' | 'h3m' | 'exm';
}>();
</script>
<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

.dark .terminal {
  --bg-gr-1: #071016;
  --bg-gr-2: #020506;
  --gold: #ffc400;
  --blue: #42a5ff;
  --text: #f5f5f5;
  --muted: #9a9a9a;
}

.terminal {
  --bg: #050a0d;
  --bg-gr-1: #e4f0f8;
  --bg-gr-2: #ecf2f4;
  --panel: #0b0d0f;
  --gold: #dfab00;
  --text: #575757;
  --muted: #6f6d6d;
  --blue: #0c7de4;

  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SFMono-Regular', Menlo,
    Monaco, Consolas, 'Liberation Mono', monospace;
  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(255, 255, 255, 0.035),
      transparent 36%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  border: 1.5px solid var(--gold);
  border-radius: 12px;
  overflow: hidden;
  color: var(--text);

  .ark-topbar {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    border-bottom: 1px solid rgba(255, 196, 0, 0.42);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.035),
      rgba(0, 0, 0, 0.08)
    );
  }

  .cursor {
    width: 8px;
    height: 18px;
    margin-left: 7px;
    background: var(--text);
    animation: blink 1s infinite;
  }

  .dots {
    display: flex;
    gap: 10px;
    margin-right: 10px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .red {
    background: #ff4b4b;
  }
  .yellow {
    background: #ffc01c;
  }
  .green {
    background: #09c841;
  }

  .prompt {
    font-size: 15px;
    line-height: 1;
    white-space: nowrap;
    display: flex;
  }

  .prompt .user,
  .prompt .cmd {
    color: var(--gold);
  }

  .content {
    padding: 20px 25px 18px;
  }

  .logo {
    margin: 0 0 22px;
    color: var(--gold);
    font-size: 15px;
    line-height: 0.89;
    letter-spacing: 1px;
    font-weight: 700;
    white-space: pre;
  }

  .question {
    font-size: 15px;
    margin-left: 2px;
    margin-bottom: 8px;
  }

  .question .mark {
    color: var(--blue);
    margin-right: 14px;
  }

  .choices {
    font-size: 15px;
    line-height: 1.45;
    padding-left: 0;
    margin: 0;
    list-style: none;
  }

  .choices li {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--text);
  }

  .choices .selected {
    color: var(--gold);
  }

  .indicator {
    width: 16px;
    color: transparent;
    text-align: center;
    font-weight: 700;
  }

  .selected .indicator {
    color: var(--gold);
  }

  .footer {
    display: flex;
    gap: 18px;
    margin-top: 10px;
    margin-left: 1px;
    font-size: 15px;
    color: var(--muted);
    align-items: center;
  }

  .footer .key {
    color: var(--gold);
    font-weight: 700;
  }

  .footer .dot-sep {
    color: var(--gold);
    font-size: 18px;
    transform: translateY(-1px);
  }
}
</style>
