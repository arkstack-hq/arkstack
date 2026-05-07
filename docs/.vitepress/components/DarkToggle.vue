<template>
  <button
    class="VPSwitch VPSwitchAppearance"
    type="button"
    role="switch"
    title="Switch to light theme"
    aria-checked="true"
    @click="isDark = !isDark"
  >
    <span class="check"
      ><span class="icon"
        ><span class="vpi-sun sun"></span
        ><span class="vpi-moon moon"></span></span
    ></span>
  </button>
</template>

<script setup lang="ts">
import { useData } from 'vitepress';

const { isDark } = useData();
</script>
<style lang="scss" scoped>
.icon [class^='vpi-'] {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  color: var(--vp-c-text-2);
}
.dark .icon [class^='vpi-'] {
  color: var(--vp-c-text-1);
  transition: opacity 0.25s !important;
}
// .dark .VPSwitchAppearance .check {
//   transform: translateX(18px);
// }
.check {
  position: relative;
  // top: 1px;
  // left: 1px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--vp-c-neutral-inverse);
  box-shadow: var(--vp-shadow-1);
  transition: transform 0.25s !important;
}
button:enabled,
[role='button']:enabled {
  cursor: pointer;
}
// .vpi-sun {
//   --icon: url(
//     data:image/svg + xml,
//     %3Csvgxmlns="http://www.w3.org/2000/svg"fill="none"stroke="currentColor"stroke-linecap="round"stroke-linejoin="round"stroke-width="2"viewBox="0 0 24 24"%3E%3Ccirclecx="12"cy="12"r="4"/%3E%3Cpathd="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/%3E%3C/svg%3E
//   );
// }
// .vpi-moon {
//   --icon: url(
//     data:image/svg + xml,
//     %3Csvgxmlns="http://www.w3.org/2000/svg"fill="none"stroke="currentColor"stroke-linecap="round"stroke-linejoin="round"stroke-width="2"viewBox="0 0 24 24"%3E%3Cpathd="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/%3E%3C/svg%3E
//   );
// }
.dark .sun {
  opacity: 0;
}
.dark .moon {
  opacity: 1;
}
.VPSwitch {
  position: relative;
  border-radius: 11px;
  display: block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  border: 1px solid var(--vp-input-border-color);
  background-color: var(--vp-input-switch-bg-color);
  transition: border-color 0.25s !important;
  .icon {
    position: relative;
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    overflow: hidden;
  }
}
</style>
