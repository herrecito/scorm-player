<template>
    <div class="h-screen flex">
        <div class="flex flex-col max-w-sm">
            <form
                class="p-4 flex"
                @submit.prevent="onSubmit"
            >
                <input
                    ref="inputFile"
                    type="file"
                />

                <button class="ml-2 border border-black px-2 py-1">
                    Upload
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

import API from "./API.js"

function manifest2cmi(manifest) {
    const organizations = manifest.querySelector("organizations")
    const defaultOrganizationId = organizations.getAttribute("default")

    const defaultOrganization = organizations.querySelector(
        `organization[identifier=${defaultOrganizationId}]`)

    // TODO no multi-sco support
    const item = defaultOrganization.querySelector("item")

    const oids = []
    const imsssObjectives = item.querySelector("objectives")
    if (imsssObjectives) {
        const objectives = imsssObjectives.querySelectorAll("objective")
        for (const objective of objectives) {
            const oid = objective.getAttribute("objectiveID")
            oids.push(oid)
        }
    }

    return {
        objectives: oids.map(id => ({ id }))
    }
}

function manifest2hrefs(manifest) {
    const organizations = manifest.querySelector("organizations")
    const defaultOrganizationId = organizations.getAttribute("default")

    const defaultOrganization = organizations.querySelector(
        `organization[identifier=${defaultOrganizationId}]`)

    // TODO no multi-sco support
    const item = defaultOrganization.querySelector("item")

    const resourceId = item.getAttribute("identifierref")

    const resources = manifest.querySelector("resources")
    const resource = resources.querySelector(`resource[identifier=${resourceId}]`)

    const href = resource.getAttribute("href")
    const files = resource.querySelectorAll("file")

    return [href, Array.from(files).map(file => file.getAttribute("href"))]
}

async function sha256(uint8Array) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

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
        async onSubmit() {
            const file = this.$refs.inputFile.files[0]
            if (!file) return

            const data = await file.arrayBuffer()

            const reader = new zip.ZipReader(new zip.BlobReader(file))

            const entries = await reader.getEntries()

            const imsManifestEntry = entries.find(e => e.filename === "imsmanifest.xml")
            if (!imsManifestEntry) throw new Error(`Couldn't find imsmanifest.xml`)

            const imsManifestText = await imsManifestEntry.getData(new zip.TextWriter())

            const parser = new DOMParser()
            const imsManifest = parser.parseFromString(imsManifestText, "text/xml")

            // TODO
            const [href, hrefs] = manifest2hrefs(imsManifest)
            // TODO isEazy SCORMs don't list all files on the manifest
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

            const state = window.localStorage.getItem(`${file.name}-state`)
            const cmi = state ? JSON.parse(state) : manifest2cmi(imsManifest)

            const api = new API(cmi)

            api.on("call", (fn, args, returnValue) => {
                this.eventLog.unshift({
                    key: uniqueId(),
                    timestamp: Date.now(),
                    type: "api-call",

                    functionName: fn,
                    args,
                    returnValue,
                })
            })

            api.on("persist", cmi => {
                window.localStorage.setItem(`${file.name}-state`, JSON.stringify(cmi))
            })

            // Unmount previous iframe and wait for it to do its things
            this.iframeSrc = ""
            this.iframeKey = uniqueId()
            await this.$nextTick()

            window.API_1484_11 = api
            this.iframeSrc = href
            this.iframeKey = uniqueId()
            this.eventLog.unshift({
                key: uniqueId(),
                timestamp: Date.now(),
                type: "scorm-load",

                name: file.name,
            })

            await reader.close()
        }
    },

    components: {
        ApiCallEvent,
        ScormLoadEvent,
    }
}
</script>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
