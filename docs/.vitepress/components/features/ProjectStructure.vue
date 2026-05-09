<template>
  <section class="terminal-frame" aria-label="Project structure preview">
    <header class="terminal-bar">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
    </header>

    <main class="terminal-body">
      <section class="copy-panel">
        <h1>Project Structure</h1>
        <div class="rule"></div>
        <p>
          A clean, conventional layout that<br />
          keeps your app organized as it grows.
        </p>
      </section>

      <section class="tree-panel" aria-label="Folder tree">
        <TreeNode label="src/" :level="0" type="folder" :open="true">
          <TreeNode label="app/" type="folder">
            <TreeNode label="console/" type="folder">
              <TreeNode label="commands/" type="folder" />
            </TreeNode>
            <TreeNode label="http/" type="folder">
              <TreeNode label="middlewares/" type="folder" />
              <TreeNode label="controllers/" type="folder" />
              <TreeNode label="resources/" type="folder" />
            </TreeNode>
            <TreeNode label="models/" type="folder" />
            <TreeNode label="services/" type="folder" />
          </TreeNode>

          <TreeNode label="config/" type="folder" />

          <TreeNode label="core/" type="folder">
            <TreeNode label="utils/" type="folder">
              <TreeNode label="helpers.ts" type="file" />
            </TreeNode>
            <TreeNode label="drivers/" type="folder" />
            <TreeNode label="app.ts" type="file" />
            <TreeNode label="bootstrap.ts" type="file" />
          </TreeNode>

          <TreeNode label="database/" type="folder">
            <TreeNode label="factories/" type="folder" />
            <TreeNode label="migrations/" type="folder" />
            <TreeNode label="seeders/" type="folder" />
          </TreeNode>

          <TreeNode label="resources/" type="folder">
            <TreeNode label="views/" type="folder" />
          </TreeNode>

          <TreeNode label="routes/" type="folder">
            <TreeNode label="api/" type="folder" />
            <TreeNode label="web/" type="folder" />
          </TreeNode>

          <TreeNode label="types/" type="folder" />
          <TreeNode label="server.ts" type="file" />
        </TreeNode>
      </section>
    </main>
  </section>
</template>

<script setup>
import { defineComponent, h } from 'vue';

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'folder',
      validator: (value) => ['folder', 'file'].includes(value),
    },
    level: {
      type: Number,
      default: 1,
    },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: [
            'tree-node',
            `level-${props.level}`,
            { branch: slots.default },
          ],
        },
        [
          h(
            'div',
            {
              class: 'tree-row',
              style: { '--level': props.level },
            },
            [
              h(
                'span',
                { class: `icon icon-${props.type}` },
                props.type === 'folder' ? '▰' : '▤',
              ),
              h(
                'span',
                { class: ['label', `label-${props.type}`] },
                props.label,
              ),
            ],
          ),
          slots.default?.(),
        ],
      );
  },
});
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
  border: 1.5px solid var(--gold);
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 62% 28%,
      rgba(57, 90, 118, 0.18),
      transparent 34%
    ),
    radial-gradient(
      circle at 80% 75%,
      rgba(201, 150, 12, 0.08),
      transparent 26%
    ),
    linear-gradient(180deg, var(--bg-gr-1) 0%, var(--bg-gr-2) 100%);
  color: var(--gold);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas,
    monospace;
}

.terminal-bar {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 17px;
  border-bottom: 1px solid rgba(201, 150, 12, 0.42);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.05),
    rgba(0, 0, 0, 0.18)
  );
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.dot-red {
  background: #e8664e;
}
.dot-yellow {
  background: #f5bd4f;
}
.dot-green {
  background: #61c767;
}

.terminal-body {
  display: grid;
  grid-template-columns: 45% 55%;
  height: calc(100% - 34px);
  padding: 10px 38px 16px 31px;
}

.copy-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-bottom: 38px;
}

.copy-panel h1 {
  margin: 0;
  font-size: 25px;
  line-height: 1;
  letter-spacing: 0.02em;
  font-weight: 700;
  color: var(--gold);
}

.rule {
  width: 54px;
  height: 4px;
  margin: 23px 0 20px;
  background: var(--gold);
}

.copy-panel p {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--blue);
}

.tree-panel {
  position: relative;
  padding-top: 0;
  padding-left: 6px;
  font-size: 13px;
  line-height: 1.12;
}

.tree-node {
  position: relative;
}

.tree-node:not(.level-0) {
  margin-left: 32px;
}

.tree-node:not(.level-0)::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -18px;
  width: 18px;
  height: 15px;
  border-left: 1px solid #7891a8;
  border-bottom: 1px solid #7891a8;
}

.tree-node.branch::after {
  content: '';
  position: absolute;
  top: 14px;
  left: 14px;
  bottom: 3px;
  width: 1px;
  background: #7891a8;
}

.tree-node:not(.level-0).branch::after {
  left: -18px;
}

.tree-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 15px;
  white-space: nowrap;
}

.icon {
  display: inline-flex;
  width: 15px;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
}

.icon-folder,
.label-folder {
  color: var(--gold);
  font-weight: 700;
}

.icon-file,
.label-file {
  color: var(--blue);
}

.label {
  letter-spacing: -0.02em;
}

@media (max-width: 900px) {
  .terminal-frame {
    width: 100%;
    height: auto;
    min-height: 490px;
  }

  .terminal-body {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .copy-panel {
    padding-bottom: 0;
  }

  .tree-panel {
    padding-bottom: 24px;
  }
}
</style>
