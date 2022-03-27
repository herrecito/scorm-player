<template>
    <div>
        <input
            type="file"
            @change="onChange"
        />

        <iframe
            v-if="iframeSrc"
            :src="iframeSrc"
            :style="iframeStyle"
        />
    </div>
</template>

<script>
import * as zip from "@zip.js/zip.js"

import API from "./API.js"

export default {
    data() {
        return {
            iframeSrc: "",
        }
    },

    computed: {
        iframeStyle() {
            return {
                display: "block",
                width: "100%",
                minHeight: "800px"
            }
        }
    },

    methods: {
        async onChange(event) {
            const file = event.target.files[0]
            const reader = new zip.ZipReader(new zip.BlobReader(file))

            const entries = await reader.getEntries()

            const imsManifestEntry = entries.find(e => e.filename === "imsmanifest.xml")
            if (!imsManifestEntry) throw new Error(`Couldn't find imsmanifest.xml`)

            const imsManifestText = await imsManifestEntry.getData(new zip.TextWriter())

            const parser = new DOMParser()
            const imsManifest = parser.parseFromString(imsManifestText, "text/xml")

            console.log(imsManifest)

            const organizations = imsManifest.querySelector("organizations")
            const defaultOrganizationId = organizations.getAttribute("default")

            console.log(defaultOrganizationId)

            const defaultOrganization = organizations.querySelector(`organization[identifier=${defaultOrganizationId}]`)
            console.log(defaultOrganization)

            // TODO no multi-sco support
            const item = defaultOrganization.querySelector("item")
            console.log(item)

            const oids = []

            const imsssObjectives = item.querySelector("objectives")
            {
                const objectives = imsssObjectives.querySelectorAll("objective")
                for (const objective of objectives) {
                    const oid = objective.getAttribute("objectiveID")
                    oids.push(oid)
                }
            }
            console.log("oids", oids)

            const resourceId = item.getAttribute("identifierref")

            const resources = imsManifest.querySelector("resources")
            const resource = resources.querySelector(`resource[identifier=${resourceId}]`)

            {
                const href = resource.getAttribute("href")
                const files = resource.querySelectorAll("file")
                for await (const file of files) {
                    const href = file.getAttribute("href")
                    const entry = entries.find(e => e.filename === href)
                    const ary = await entry.getData(new zip.Uint8ArrayWriter)

                    await navigator.serviceWorker.ready.then(registration => {
                        registration.active.postMessage({
                            type: "put",
                            url: href,
                            body: ary
                        }, [ary.buffer])
                    })
                }

                const api = new API({
                    objectives: oids.map(id => ({ id }))
                })

                api.on("call", (...args) => {
                    console.log(...args)
                })

                api.on("error-code", (errorCode) => {
                    if (errorCode === "0") return

                    console.log("error-code", errorCode, api.GetErrorString(errorCode))
                })

                window.API_1484_11 = api

                this.iframeSrc = href
            }

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
