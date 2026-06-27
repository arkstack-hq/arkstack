<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({ greeting: String, count: Number })
</script>

<template>
    <div>
        <h1 id="page">Home</h1>
        <p id="greeting">{{ greeting }}</p>
        <p id="count">{{ count }}</p>
        <Link id="to-about" href="/about">Go to About</Link>
    </div>
</template>
