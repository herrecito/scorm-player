<template>
    <div class="text-xs font-bold font-mono px-1">
        {{ event.name }} loaded
    </div>
</template>

<script>
export default {
    props: {
        event: Object,
    }
}
</script>
