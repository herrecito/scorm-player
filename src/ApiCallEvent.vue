<template>
    <div
        class="text-xs font-mono px-1 truncate transition-colors duration-1000 ease-out hover:bg-gray-200"
        :class="eventClass"
    >
        {{ event.functionName }}
        {{ event.args.map(a => a.toString()).join(" ") }}
        <div class="pl-2 truncate">
            {{ event.returnValue !== "" ? event.returnValue : "&nbsp;" }}
        </div>
    </div>
</template>

<script>
export default {
    props: {
        event: Object,
        recent: Boolean,
    },

    computed: {
        eventClass() {
            if (this.recent) {
                return "text-blue-700"
            } else {
                return "text-gray-700"
            }
        }
    }
}
</script>
