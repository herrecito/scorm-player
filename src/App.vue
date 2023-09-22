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

<script setup>
import { ref, nextTick, onBeforeUnmount } from "vue"
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

const inputFile = ref(null)
const iframeSrc = ref("")
const iframeKey = ref(uniqueId("iframe"))
const eventLog = ref([])
const now = ref(Date.now())
let fileHash = null
let reader = null

navigator.serviceWorker.register(new URL("./sw.js", import.meta.url))
// TODO different message types
navigator.serviceWorker.addEventListener("message", async event => {
    const message = event.data
    const { callbackId, filename } = message
    const entries = await reader.getEntries()
    const entry = entries.find(e => e.filename === filename)
    const cache = await caches.open(fileHash)
    try {
        const data = await entry.getData(new zip.Uint8ArrayWriter)
        cache.put(`/zip/${fileHash}/${entry.filename}`, new Response(data))
        await swPostMessage({ type: "response", callbackId, data }, [data.buffer])
    } catch (error) {
        await swPostMessage({ type: "not-found", callbackId })
        throw error
    }
})

let interval = window.setInterval(() => {
    now.value = Date.now()
}, 1000)

onBeforeUnmount(() => {
    window.clearInterval(interval)
})

async function unload() {
    iframeSrc.value = ""
    iframeKey.value = uniqueId()
    await nextTick()
    eventLog.value = []
    await reader?.close()
}

async function onSubmit() {
    const file = inputFile.value.files[0]
    if (!file) return

    await unload()

    // Read Zip
    const data = await file.arrayBuffer()
    fileHash = await sha256(data)
    reader = new zip.ZipReader(new zip.BlobReader(file))
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
        eventLog.value.unshift({
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
            eventLog.value.unshift({
                key: uniqueId(), timestamp, type: "persist"
            })
        }
    })

    // Set API and iframe source
    const resource = manifest.resources.find(r => r.identifier === item.identifierref)
    window.API_1484_11 = api
    iframeSrc.value = `/zip/${fileHash}/${resource.href}`
    iframeKey.value = uniqueId()
    eventLog.value.unshift({
        key: uniqueId(),
        timestamp: Date.now(),
        type: "scorm-load",

        name: file.name,
    })
}
</script>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
