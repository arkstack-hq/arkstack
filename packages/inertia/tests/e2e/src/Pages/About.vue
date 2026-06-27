<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({ name: String })
</script>

<template>
    <div>
        <h1 id="page">About</h1>
        <p id="name">{{ name }}</p>
        <Link id="to-home" href="/">Back to Home</Link>
    </div>
</template>
