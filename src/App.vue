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
import { markRaw } from "vue"
import uniqueId from "lodash/uniqueId"
import * as zip from "@zip.js/zip.js"

import ApiCallEvent from "./ApiCallEvent.vue"
import ScormLoadEvent from "./ScormLoadEvent.vue"
import PersistEvent from "./PersistEvent.vue"
import CmiHistoryLocalStore from "./CmiHistoryLocalStore.js"

import API from "./API.js"
import {
    sha256,
    item2cmi,
    parseManifest,
    initialEntryValue,
} from "./utils.js"

async function swPostMessage(...args) {
    await navigator.serviceWorker.ready.then(registration => {
        registration.active.postMessage(...args)
    })
}

export default {
    data() {
        return {
            iframeSrc: "",
            iframeKey: uniqueId("iframe"),
            eventLog: [],
            now: Date.now(),

            _fileHash: null, // TODO
            _reader: null, // TODO
        }
    },

    async created() {
        navigator.serviceWorker.register(new URL("./sw.js", import.meta.url))
        // TODO different message types
        navigator.serviceWorker.addEventListener("message", async event => {
            const message = event.data
            const { callbackId, filename } = message
            const entries = await this._reader.getEntries()
            const entry = entries.find(e => e.filename === filename)
            const cache = await caches.open(this._fileHash)
            try {
                const data = await entry.getData(new zip.Uint8ArrayWriter)
                cache.put(`/zip/${this._fileHash}/${entry.filename}`, new Response(data))
                await swPostMessage({ type: "response", callbackId, data }, [data.buffer])
            } catch (error) {
                await swPostMessage({ type: "not-found", callbackId })
                throw error
            }
        })
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
        async unload() {
            this.iframeSrc = ""
            this.iframeKey = uniqueId()
            await this.$nextTick()
            this.eventLog = []
            await this._reader?.close()
        },

        async onSubmit() {
            const file = this.$refs.inputFile.files[0]
            if (!file) return

            await this.unload()

            // Read Zip
            const data = await file.arrayBuffer()
            const fileHash = await sha256(data)
            const reader = new zip.ZipReader(new zip.BlobReader(file))
            this._reader = markRaw(reader)
            this._fileHash = fileHash
            const entries = await reader.getEntries()

            // Find manifest
            const imsManifestEntry = entries.find(e => e.filename === "imsmanifest.xml")
            if (!imsManifestEntry) throw new Error(`Couldn't find imsmanifest.xml`)
            const imsManifestText = await imsManifestEntry.getData(new zip.TextWriter())
            const imsManifest = new DOMParser().parseFromString(imsManifestText, "text/xml")
            const manifest = parseManifest(imsManifest)

            // Register package content with SW
            for (const entry of entries) {
                if (entry.directory) continue
                await swPostMessage({ type: "origin", fileHash })
            }

            // Get item to launch
            const defaultOrganization = manifest.organizations.find(organization => {
                return organization.identifier === manifest.defaultOrganizationId
            })
            const item = defaultOrganization.items[0]

            // Retrieve CMI from the last entry on the history, or create a new one from the manifest
            const store = new CmiHistoryLocalStore(fileHash)
            const lastEntry = await store.last()
            const cmi = lastEntry?.cmi ?? item2cmi(item)

            // Init API
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
            const resource = manifest.resources.find(r => r.identifier === item.identifierref)
            window.API_1484_11 = api
            this.iframeSrc = `/zip/${fileHash}/${resource.href}`
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
