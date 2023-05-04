<template>
    <div class="h-screen flex">
        <div class="flex flex-col max-w-sm">
            <form
                class="p-4 flex gap-2"
                @submit.prevent="onSubmit"
            >
                <input
                    ref="inputFile"
                    type="file"
                />

                <button class="border border-black px-2 py-1">
                    Upload
                </button>
                <button
                    type="button"
                    class="border border-black px-2 py-1"
                    @click="unload"
                >
                    Unload
                </button>
            </form>

            <div class="overflow-x-auto">
                <template v-for="event in eventLog">
                    <api-call-event
                        v-if="event.type === 'api-call'"
                        :key="event.key"
                        :event="event"
                        :recent="now - event.timestamp < 3000"
                    />

                    <scorm-load-event
                        v-else-if="event.type === 'scorm-load'"
                        :key="event.key"
                        :event="event"
                    />

                    <persist-event
                        v-else-if="event.type === 'persist'"
                        :key="event.key"
                    />
                </template>
            </div>
        </div>

        <iframe
            v-if="iframeSrc"
            :key="iframeKey"
            class="grow"
            :src="iframeSrc"
        />
    </div>
</template>

<script>
import uniqueId from "lodash/uniqueId"
import * as zip from "@zip.js/zip.js"

import ApiCallEvent from "./ApiCallEvent.vue"
import ScormLoadEvent from "./ScormLoadEvent.vue"
import PersistEvent from "./PersistEvent.vue"
import CmiHistoryLocalStore from "./CmiHistoryLocalStore.js"

import API from "./API.js"
import {
    sha256,
    manifest2cmi,
    manifest2hrefs,
    initialEntryValue,
} from "./utils.js"

export default {
    data() {
        return {
            iframeSrc: "",
            iframeKey: uniqueId(),
            eventLog: [],
            now: Date.now(),
        }
    },

    mounted() {
        this.interval = window.setInterval(() => {
            this.now = Date.now()
        }, 1000)
    },

    unmounted() {
        window.clearInterval(this.interval)
    },

    methods: {
        unload() {
            this.iframeSrc = ""
        },

        async onSubmit() {
            const file = this.$refs.inputFile.files[0]
            if (!file) return

            {
                // Unmount previous iframe and wait for it to do its things
                this.iframeSrc = ""
                this.iframeKey = uniqueId()
                await this.$nextTick()
            }

            this.eventLog = []

            const data = await file.arrayBuffer()
            const reader = new zip.ZipReader(new zip.BlobReader(file))
            const entries = await reader.getEntries()

            const imsManifestEntry = entries.find(e => e.filename === "imsmanifest.xml")
            if (!imsManifestEntry) throw new Error(`Couldn't find imsmanifest.xml`)

            const imsManifestText = await imsManifestEntry.getData(new zip.TextWriter())

            const parser = new DOMParser()
            const imsManifest = parser.parseFromString(imsManifestText, "text/xml")

            const [href, hrefs] = manifest2hrefs(imsManifest)
            // TODO isEazy SCORMs don't list all files on the manifest,
            // so we just put everything in the zip in the SW cache...
            /*
            await Promise.all(hrefs.map(async href => {
                const entry = entries.find(e => e.filename === href)
                const data = await entry.getData(new zip.Uint8ArrayWriter)

                await navigator.serviceWorker.ready.then(registration => {
                    registration.active.postMessage({
                        type: "put",
                        url: href,
                        body: data
                    }, [data.buffer])
                })
            }))
            */
            await Promise.all(entries.map(async entry => {
                if (entry.directory) return

                const data = await entry.getData(new zip.Uint8ArrayWriter)

                await navigator.serviceWorker.ready.then(registration => {
                    registration.active.postMessage({
                        type: "put",
                        url: entry.filename,
                        body: data
                    }, [data.buffer])
                })
            }))
            await reader.close()

            // Retrieve CMI from the last entry on the history, or create a new one from the manifest
            const store = new CmiHistoryLocalStore(await sha256(data))
            const lastEntry = await store.last()
            const cmi = lastEntry?.cmi ?? manifest2cmi(imsManifest)

            const api = new API({
                ...cmi,
                entry: initialEntryValue(lastEntry?.cmi)
            })

            api.on("call", async (functionName, args, returnValue) => {
                this.eventLog.unshift({
                    key: uniqueId(),
                    timestamp: Date.now(),
                    type: "api-call",

                    functionName,
                    args,
                    returnValue,
                })

                if (["Terminate", "Commit"].includes(functionName)) {
                    const timestamp = Date.now()
                    const cmi = api.cmi.export()
                    await store.append({ timestamp, cmi })
                    this.eventLog.unshift({
                        key: uniqueId(), timestamp, type: "persist"
                    })
                }
            })

            // Set API and iframe source
            window.API_1484_11 = api
            this.iframeSrc = href
            this.iframeKey = uniqueId()
            this.eventLog.unshift({
                key: uniqueId(),
                timestamp: Date.now(),
                type: "scorm-load",

                name: file.name,
            })
        }
    },

    components: {
        ApiCallEvent,
        ScormLoadEvent,
        PersistEvent,
    }
}
</script>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
