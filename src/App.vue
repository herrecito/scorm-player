<template>
    <div class="h-screen flex">
        <div class="flex flex-col">
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
            <div>
                <div
                    v-for="entry in log"
                    :key="entry.key"
                    class="text-xs font-mono px-1 truncate"
                    :class="entry.klass"
                    :title="entry.message"
                >
                    {{ entry.message }}
                </div>
            </div>
        </div>

        <iframe
            v-if="iframeSrc"
            class="grow"
            :src="iframeSrc"
        />
    </div>
</template>

<script>
import uniqueId from "lodash/uniqueId"
import * as zip from "@zip.js/zip.js"

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

function entryKlass(fn) {
    switch (fn) {
        case "Initialize": return "text-green-700"
        case "Terminate": return "text-purple-700"
        case "GetLastError": return "text-red-700"
        case "Commit": return "font-bold"
        default: return "text-gray-700"
    }
}

export default {
    data() {
        return {
            iframeSrc: "",
            log: []
        }
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

            const state = window.localStorage.getItem(`${file.name}-state`)
            const cmi = state ? JSON.parse(state) : manifest2cmi(imsManifest)

            const api = new API(cmi)

            api.on("call", (fn, ...args) => {
                this.log.unshift({
                    key: uniqueId(),
                    message: `${fn} ${args.map(arg => arg.toString()).join(" ")}`,
                    klass: entryKlass(fn)
                })

                if (fn === "Terminate") {
                    setTimeout(() => {
                        this.iframeSrc = null
                    })
                }
            })

            api.on("error-code", (errorCode) => {
                if (errorCode === "0") return

                console.log("error-code", errorCode, api.GetErrorString(errorCode))
            })

            api.on("persist", cmi => {
                console.log("persist", cmi)

                window.localStorage.setItem(`${file.name}-state`, JSON.stringify(cmi))
            })

            window.API_1484_11 = api

            this.iframeSrc = href

            await reader.close()
        }
    }
}
</script>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
