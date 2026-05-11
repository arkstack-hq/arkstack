<script setup lang="ts">
import { computed } from 'vue';
import ArkTerm from './ArkTerm.vue';
import ProjectStructure from './ProjectStructure.vue';
import UnifiedConsole from './UnifiedConsole.vue';
import ArkDependencies from './ArkDependencies.vue';
import ExtensibleDrivers from './ExtensibleDrivers.vue';
import RuntimeAgnostic from './RuntimeAgnostic.vue';
import OpenSource from './OpenSource.vue';
import FutureProof from './FutureProof.vue';
const { src = 'multi-runtime' } = defineProps<{
  src: string;
  alt: string;
  selected?: 'h3' | 'ex' | 'h3m' | 'exm';
}>();

const feature = computed(
  () => src.replace('/features/', '').split('.').at(0) ?? 'multi-runtime',
);
// /features/structure.png
</script>

<template>
  <div>
    <UnifiedConsole v-if="feature === 'console'" />
    <ProjectStructure v-else-if="feature === 'structure'" />
    <ArkTerm selected="h3" v-else-if="feature === 'multi-runtime'" />
    <ArkTerm selected="lean" group="scopes" v-else-if="feature === 'scope'" />
    <ArkDependencies v-else-if="feature === 'packages'" />
    <ExtensibleDrivers v-else-if="feature === 'drivers'" />
    <RuntimeAgnostic v-else-if="feature === 'runtime-agnostic'" />
    <OpenSource v-else-if="feature === 'open-source'" />
    <FutureProof v-else-if="feature === 'future-proof'" />
    <img v-else-if="src" :src="src" :alt="alt" />
  </div>
</template>
