<template>
  <main class="landing-page">
    <nav class="topbar" aria-label="Landing navigation">
      <a class="brand" href="/">
        <span class="logo-wrap">
          <span class="halo"></span>
          <img :src="theme.logo ?? '/logo.png'" alt="Arkstack logo" />
        </span>
        <span class="brand-text">
          <span class="wordmark">Ark<span>stack</span></span>
          <span class="tagline">Runtime Agnostic Node.js Framework</span>
        </span>
      </a>

      <div class="top-actions">
        <a href="/guide/getting-started">Docs</a>
        <a href="/api">API</a>
        <DarkToggle />
        <a
          target="_blank"
          :key="link.link"
          :href="link.link"
          v-for="link in theme.socialLinks"
          class="social-icon"
          :aria-label="link.icon"
        >
          <span
            :class="`vpi-social-${link.icon}`"
            :style="`--icon: url('https://api.iconify.design/simple-icons/${link.icon}.svg');`"
          ></span>
        </a>
      </div>
    </nav>

    <section class="hero-shell" v-if="!frontmatter.hideHero">
      <div class="hero-copy">
        <div class="status-row">
          <span class="dot"></span>
          {{ frontmatter.hero?.tagline ?? site.description }}
        </div>

        <h1>
          {{
            frontmatter.heroTitle ??
            'Modular structure for runtime-flexible Node.js apps.'
          }}
        </h1>
        <p>
          Build TypeScript backends with familiar conventions, shared packages,
          and drivers that let Express and H3 feel like one stack.
        </p>

        <div class="cta-buttons" v-if="frontmatter.hero?.actions?.length">
          <a
            :key="action.link"
            :href="action.link"
            :class="[
              'btn',
              action.theme === 'brand' ? 'btn-primary' : 'btn-secondary',
            ]"
            v-for="action in frontmatter.hero.actions"
          >
            {{ action.text }}
          </a>
        </div>
      </div>

      <div class="hero-panel" aria-label="Arkstack route preview">
        <div class="panel-top">
          <span></span>
          <span></span>
          <span></span>
          <strong>{{ activeRuntime.name }}</strong>
        </div>
        <div class="runtime-tabs" role="tablist">
          <button
            :class="{ active: activeRuntime.id === runtime.id }"
            :key="runtime.id"
            @click="activeRuntimeId = runtime.id"
            role="tab"
            type="button"
            v-for="runtime in runtimeTabs"
          >
            {{ runtime.name }}
          </button>
        </div>
        <pre><code><span class="kw">import</span> { Router } <span class="kw">from</span> <span class="str">'@arkstack/driver-{{ activeRuntime.id }}'</span>
<span class="kw">import</span> { view } <span class="kw">from</span> <span class="str">'@arkstack/view'</span>

Router.<span class="fn">get</span>(<span class="str">'/'</span>, <span class="kw">async</span> () =&gt; {
  <span class="kw">return await</span> view(<span class="str">'welcome'</span>).with({
    runtime: <span class="str">'{{ activeRuntime.name }}'</span>,
  })
})</code></pre>
        <p class="runtime-note">{{ activeRuntime.note }}</p>
      </div>
    </section>

    <section class="interactive-section" v-if="features.length">
      <div class="section-heading">
        <span>Core surface</span>
        <h2>Improve development speed without losing product quality.</h2>
      </div>

      <div class="feature-workbench">
        <div class="feature-list">
          <button
            :class="{ active: selectedFeatureIndex === index }"
            :key="feature.title"
            @click="selectedFeatureIndex = index"
            type="button"
            v-for="(feature, index) in features"
          >
            <span class="feature-icon">
              <img
                v-if="typeof feature.icon === 'object' && feature.icon?.src"
                :src="feature.icon.src"
                :alt="feature.icon.alt ?? feature.title"
              />
              <span v-else>{{ feature.icon ?? '•' }}</span>
            </span>
            <span>{{ feature.title }}</span>
          </button>
        </div>

        <article class="feature-detail">
          <div class="feature-icon large">
            <img
              v-if="
                typeof selectedFeature.icon === 'object' &&
                selectedFeature.icon?.src
              "
              :src="selectedFeature.icon.src"
              :alt="selectedFeature.icon.alt ?? selectedFeature.title"
            />
            <span v-else>{{ selectedFeature.icon ?? '•' }}</span>
          </div>
          <h3>{{ selectedFeature.title }}</h3>
          <p>{{ selectedFeature.details }}</p>
          <FeatureCards
            style="margin-top: 15px"
            :src="selectedFeature?.banner?.src"
            :alt="selectedFeature.banner.alt ?? selectedFeature.title"
          />
        </article>
      </div>
    </section>

    <section class="package-section">
      <div class="section-heading">
        <span>Ecosystem and Packages</span>
        <h2>
          Arcstack is not just a framework, our ecosystem powers your stack
        </h2>
      </div>

      <div class="package-grid">
        <PackageCard :key="pkg.name" :pkg="pkg" v-for="pkg in packages" />
      </div>
    </section>

    <Content />

    <footer class="footer">
      <p>
        <a href="/guide/getting-started">Docs</a> &middot;
        <a href="https://github.com/arkstack-tmp/arkstack" target="_blank"
          >GitHub</a
        >
        &middot;
        <a href="https://discord.gg/jmQybxKQ7R" target="_blank">Discord</a>
      </p>
      <p>
        Arkstack &copy; {{ new Date().getFullYear() }} - By Toneflix
        Technologies
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import '../theme/landing.scss';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import DarkToggle from './DarkToggle.vue';
import PackageCard from './PackageCard.vue';
import { abbreviateNumber, fitText } from '../data';
import FeatureCards from './features/FeatureCards.vue';

const { theme, site, frontmatter } = useData();

const features = computed(() => frontmatter.value.features ?? []);
const selectedFeatureIndex = ref(0);
const selectedFeature = computed(
  () => features.value[selectedFeatureIndex.value] ?? features.value[0] ?? {},
);

const runtimeTabs = [
  {
    id: 'express',
    name: 'Express',
    note: 'Drop into the ecosystem standard with Arkstack conventions already in place.',
  },
  {
    id: 'h3',
    name: 'H3',
    note: 'Run lightweight, fetch-native applications with the same app surface.',
  },
];

const activeRuntimeId = ref(runtimeTabs[0].id);
const activeRuntime = computed(
  () =>
    runtimeTabs.find((runtime) => runtime.id === activeRuntimeId.value) ??
    runtimeTabs[0],
);

const packages = ref<
  {
    name: string;
    links: { homepage: string; npm: string; repository: string };
    detail: string;
    downloads: string;
  }[]
>([]);

fetch('https://registry.npmjs.org/-/v1/search?text=@arkstack')
  .then((e) => e.json())
  .then(({ objects }) => {
    return Promise.all(
      objects.map(async ({ package: pkg, downloads }: any) => {
        downloads =
          downloads.monthly > 0 ? downloads.monthly : downloads.weekly;
        const dls = downloads;
        // const dls = (await getTotalDownloads(pkg.sanitized_name)) || downloads;
        return {
          name: pkg.sanitized_name,
          detail: fitText(pkg.description),
          links: pkg.links,
          downloads: abbreviateNumber(dls),
        };
      }),
    );
  })
  .then((e) => {
    packages.value = e;
  });
</script>
