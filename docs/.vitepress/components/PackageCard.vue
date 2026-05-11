<template>
  <div class="package-card">
    <div>
      <h3>{{ pkg.name }}</h3>
      <p>{{ pkg.detail }}</p>
    </div>

    <div class="downloads">
      <span class="count">{{ pkg.downloads }}</span>
      <span class="label">downloads/M</span>

      <div class="links">
        <a
          :href="pkg.links.homepage"
          target="_self"
          rel="noreferrer"
          @click.prevent="() => goto(pkg.links.homepage)"
        >
          <span class="feature-icon">
            <icon :name="{ src: '/icons/link.svg', alt: 'link.svg' }" />
          </span>
        </a>

        <a
          :href="pkg.links.npm"
          target="_blank"
          rel="noreferrer"
          @click.prevent="() => goto(pkg.links.npm)"
        >
          <span class="feature-icon">
            <icon
              :name="{ src: '/icons/npmjs-fill.svg', alt: 'npmjs-fill.svg' }"
            />
          </span>
        </a>

        <a
          :href="pkg.links.repository"
          target="_blank"
          rel="noreferrer"
          @click.prevent="() => goto(pkg.links.repository)"
        >
          <span class="feature-icon">
            <icon
              :name="{ src: '/icons/github-fill.svg', alt: 'github-fill.svg' }"
            />
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  pkg: {
    name: string;
    links: { homepage: string; npm: string; repository: string };
    detail: string;
    downloads: string;
  };
}>();

const goto = (link: string): void => {
  location.href = link.replace('git+', '');
};
</script>

<style lang="scss">
.dark .package-card {
  p {
    color: rgba(244, 244, 245, 0.85);
  }
  .downloads .label {
    color: rgba(244, 244, 245, 0.45);
  }
}
.package-card {
  padding: 12px;
  min-height: 90px;
  height: 100%;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  display: flex;
  text-decoration: none;

  border: 1px solid var(--landing-border);
  border-radius: var(--landing-radius);
  background: color-mix(in srgb, var(--landing-card) 92%, transparent);
  box-shadow: var(--landing-shadow);

  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition:
    transform 0.2s,
    border-color 0.2s,
    background 0.2s;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--landing-gold-mid);
    background: var(--landing-hover);
  }

  h3 {
    margin: 0 0 10px;
    font-size: 0.82rem;
    line-height: 1.5;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: rgba(58, 58, 58, 0.849);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    line-height: 1.5;
  }

  .links {
    display: flex;
    gap: 12px;
    margin-top: 5px;
    justify-content: flex-end;
    height: 25px;
  }

  .links a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(244, 244, 245, 0.72);
    font-size: 13px;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .links a:hover {
    color: #c9960c;
    border-color: rgba(201, 150, 12, 0.48);
    opacity: 0.7;
    .feature-icon {
      width: 23.5px;
      height: 23.5px;
      transition: linear 0.07s;
    }
  }

  .downloads {
    text-align: right;
    white-space: nowrap;

    .count {
      display: block;
      color: #c9960c;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .label {
      display: block;
      color: rgba(25, 25, 25, 0.705);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  }
}
</style>
