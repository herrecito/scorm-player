import * as zip from "@zip.js/zip.js"
import API from "./API"

const input = document.createElement("input")
input.type = "file"
document.body.append(input)

input.addEventListener("change", async event => {
    const file = input.files[0]
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

        window.API_1484_11 = new API({
            objectives: oids.map(id => { id })
        })

        const iframe = document.createElement("iframe")
        iframe.src = href
        iframe.style.display = "block"
        iframe.style.width = "100%"
        iframe.style.minHeight = "800px"
        document.body.append(iframe)
    }

    await reader.close()
})

navigator.serviceWorker.register("sw.js")

