export async function sha256(uint8Array) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

function parseObjective(node) {
    return {
        id: node.getAttribute("objectiveID")
    }
}

function parsePrimaryObjective(node) {
    return {
        id: node.getAttribute("objectiveID")
    }
}

function parseSequencing(node) {
    const objectives = node.querySelector("objectives")
    const primaryObjective = node.querySelector("primaryObjective")

    return {
        primaryObjective: primaryObjective ? parsePrimaryObjective(primaryObjective) : null,
        objectives: Array.from(objectives?.querySelectorAll("objective") ?? []).map(parseObjective)
    }
}

function parseItem(node) {
    const sequencing = node.querySelector("sequencing")

    return {
        identifier: node.getAttribute("identifier"),
        identifierref: node.getAttribute("identifierref"),
        parameters: node.getAttribute("parameters"),
        title: node.querySelector("title").textContent,
        sequencing: parseSequencing(sequencing),
    }
}

function parseFile(node) {
    return {
        href: node.getAttribute("href"),
    }
}

function parseResource(node) {
    return {
        identifier: node.getAttribute("identifier"),
        type: node.getAttribute("type"),
        href: node.getAttribute("href"),
        files: Array.from(node.querySelectorAll("file")).map(parseFile),
    }
}

function parseOrganization(node) {
    const ogts = node.getAttribute("objectivesGlobalToSystem")
    const sdgts = node.getAttribute("sharedDataGlobalToSystem")

    return {
        identifier: node.getAttribute("identifier"),
        structure: node.getAttribute("structure") ?? "hierarchical",
        title: node.querySelector("title").textContent,
        items: Array.from(node.querySelectorAll("item")).map(parseItem),
        objectivesGlobalToSystem: ogts ? ogts === "true" : true,
        sharedDataGlobalToSystem: sdgts ? sdgts === "true" : true,
    }
}


export function parseManifest(xmldoc) {
    const manifest = xmldoc.querySelector("manifest")
    const metadata = xmldoc.querySelector("metadata")
    const organizations = xmldoc.querySelector("organizations")
    const resources = xmldoc.querySelector("resources")

    return {
        identifier: manifest.getAttribute("identifier"),
        version: manifest.getAttribute("version"),
        metadata: {
            schema: metadata.querySelector("schema").textContent,
            schemaversion: metadata.querySelector("schemaversion").textContent,
            location: metadata.querySelector("location")?.textContent,
        },
        organizations: Array.from(organizations.querySelectorAll("organization")).map(parseOrganization),
        resources: Array.from(resources.querySelectorAll("resource")).map(parseResource),
        defaultOrganizationId: organizations.getAttribute("default"),
    }
}

export function item2cmi(item) {
    const objectives = []
    if (item.sequencing.primaryObjective) {
        objectives.push({
            id: item.sequencing.primaryObjective.id
        })
    }
    for (const objective of item.sequencing.objectives) {
        objectives.push({
            id: objective.id
        })
    }

    return {
        objectives
    }
}

export function initialEntryValue(cmi, suspendAll=false) {
    if (!cmi) return "ab-initio"
    if (cmi.exit === "suspend") return "resume"
    if (cmi.exit === "logout") return "ab-initio"
    if (suspendAll) return "resume"
    return ""
}

export function parseBoolean(str) {
    if (str === "true") {
        return true
    } else if (str === "false") {
        return false
    } else {
        throw new Error(`Unknown boolean: ${str}`)
    }
}

export function parseDelimiter(str) {
    const [name, value] = str.slice(1, -1).split("=")

    return {
        name, 
        value
    }
}

export function parseCharacterString(str) {
    let delimiters = {}

    let i = 0
    while (str[i] === "{") {
        let j = i+1
        while (j < str.length) {
            if (str[j] === "}") break
            j += 1
        }
        if (str[j] !== "}") break // No closing '}' found
        const { name, value } = parseDelimiter(str.slice(i, j+1))
        delimiters[name] = value
        i = j+1        
    }

    return { str: str.slice(i), delimiters }
}
