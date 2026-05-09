<template>
  <section class="terminal-frame" aria-label="Ark commands terminal preview">
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
      <div class="prompt">
        <span class="user">sudo@arkstack</span>:~$ pnpm ark -h
        <span class="cursor"></span>
      </div>
    </header>

    <main class="terminal-body">
      <h2>Available Commands:</h2>

      <section
        v-for="group in commandGroups"
        :key="group.name"
        class="command-group"
      >
        <h3>{{ group.name }}</h3>

        <div
          v-for="item in group.commands"
          :key="item.name"
          class="command-row"
        >
          <span class="command-name">{{ item.name }}</span>
          <span class="command-description">{{ item.description }}</span>
        </div>
      </section>
    </main>
  </section>
</template>

<script setup>
const commandGroups = [
  {
    name: 'route',
    commands: [
      {
        name: 'route:list',
        description: 'List all registered routes',
      },
    ],
  },
  {
    name: 'create',
    commands: [
      {
        name: 'create:resource',
        description: 'Generates a new resource file.',
      },
      {
        name: 'create:collection',
        description: 'Create a new resource collection file.',
      },
      {
        name: 'create:all',
        description: 'Create both resource and collection files.',
      },
    ],
  },
  {
    name: 'make',
    commands: [
      {
        name: 'make:controller',
        description: 'Create a new controller file',
      },
      {
        name: 'make:full-resource',
        description:
          'Create a full new set of API resources (Controller, Resource, Collection)',
      },
      {
        name: 'make:factory',
        description: 'Create a new model factory class',
      },
      {
        name: 'make:migration',
        description: 'Create a new migration class file',
      },
      {
        name: 'make:model',
        description: 'Create a new model and optional linked resources',
      },
      {
        name: 'make:seeder',
        description: 'Create a new seeder class',
      },
      {
        name: 'make:command',
        description: 'Creates a new console command class.',
      },
    ],
  },
];
</script>

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
      circle at 52% 74%,
      rgba(80, 115, 140, 0.15),
      transparent 34%
    ),
    radial-gradient(
      circle at 84% 80%,
      rgba(201, 150, 12, 0.06),
      transparent 27%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: var(--text);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;

  .terminal-bar {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 22px;
    border-bottom: 1px solid rgba(201, 150, 12, 0.25);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(0, 0, 0, 0.14)
    );
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

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .dot-red {
    background: #ff594f;
  }
  .dot-yellow {
    background: #ffbd4f;
  }
  .dot-green {
    background: #31c65b;
  }

  .terminal-body {
    padding: 18px 22px 20px;
    font-size: 10px !important;
    line-height: 1.34;
  }

  .prompt {
    display: flex;
    gap: 8px;
    margin: 0 0 0px;
    align-items: center;
    white-space: nowrap;
  }

  .command,
  h2,
  h3,
  .command-name {
    color: var(--gold);
  }

  h2 {
    margin: 0 0 13px;
    font-size: 10px !important;
    font-weight: 700;
  }

  .command-group {
    margin-top: 14px;
  }

  .command-group:first-of-type {
    margin-top: 0;
  }

  h3 {
    margin: 0 0 1px 0;
    font-size: 10px !important;
    font-weight: 700;
  }

  .command-row {
    display: grid;
    grid-template-columns: 200px 1fr;
    column-gap: 27px;
    padding-left: 28px;
    align-items: start;
    white-space: nowrap;
  }

  .command-name {
    font-weight: 500;
  }

  .command-description {
    color: var(--text);
  }
}

@media (max-width: 900px) {
  .terminal-frame {
    width: 100%;
    height: auto;
    min-height: 499px;
  }

  .command-row {
    grid-template-columns: 1fr;
    gap: 2px;
    margin-bottom: 8px;
    white-space: normal;
  }
}
</style>
