export async function sha256(uint8Array) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

// Creates a cmi value object from an manifest as an XML doc
export function manifest2cmi(manifest) {
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

// Given a manifest as an XML doc, returns the main resource href, and the href of all items
export function manifest2hrefs(manifest) {
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

export function initialEntryValue(cmi, suspendAll=false) {
    if (!cmi) return "ab-initio"
    if (cmi.exit === "suspend") return "resume"
    if (cmi.exit === "logout") return "ab-initio"
    if (suspendAll) return "resume"
    return ""
}
