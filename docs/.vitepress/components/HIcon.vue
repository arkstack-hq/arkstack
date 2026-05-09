<script lang="ts">
import { h } from 'vue';

const icons = {
  h3: `<svg width="264" height="264" viewBox="0 0 264 264" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M132 0L18 66L56 88L132 44L170 66L94 110L132 132L246 66L132 0Z" fill="currentColor"/>
        <path d="M246 198V66L132 132V176L208 132V176L132 220V264L246 198Z" fill="currentColor"/>
        <path d="M56 88L18 66V198L56 220V176L94 198V242L132 264V132L94 110V154L56 132V88Z" fill="currentColor"/>
    </svg>`,
  ts: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
        <rect width="36" height="36" x="6" y="6" fill="currentColor"/>
        <polygon fill="#fff" points="27.49,22 14.227,22 14.227,25.264 18.984,25.264 18.984,40 22.753,40 22.753,25.264 27.49,25.264"/>
        <path fill="#fff" d="M39.194,26.084c0,0-1.787-1.192-3.807-1.192s-2.747,0.96-2.747,1.986 c0,2.648,7.381,2.383,7.381,7.712c0,8.209-11.254,4.568-11.254,4.568V35.22c0,0,2.152,1.622,4.733,1.622s2.483-1.688,2.483-1.92 c0-2.449-7.315-2.449-7.315-7.878c0-7.381,10.658-4.469,10.658-4.469L39.194,26.084z"/>
    </svg>`,
};

export default {
  props: ['color', 'name'],
  setup({ color = '#fff', name }) {
    const icon = icons[name] ?? undefined;
    return () => {
      if (typeof name === 'object' && name.src) {
        console.log(name);
        return h('img', {
          src: name.src,
          alt: name.alt,
        });
      }

      return h('i', {
        style: [{ color }],
        class: !icon ? name : undefined,
        innerHTML: icon,
      });
    };
  },
};
</script>
