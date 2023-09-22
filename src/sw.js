self.addEventListener("install", event => {
    event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim())
})

const origins = new Map() // fileHash => clientId
const callbacks = new Map() // callbackId => { resolve: Function, reject: Function }

class TimeoutError extends Error {}

self.addEventListener("message", event => {
    const message = event.data

    switch (message.type) {
        case "origin": {
            const { fileHash } = message
            origins.set(fileHash, event.source.id)
            break
        }

        case "response": {
            if (callbacks.has(message.callbackId)) {
                const { resolve } = callbacks.get(message.callbackId)
                callbacks.delete(message.callbackId)
                resolve(message)
            }
            break
        }

        case "not-found": {
            if (callbacks.has(message.callbackId)) {
                const { reject } = callbacks.get(message.callbackId)
                callbacks.delete(message.callbackId)
                reject(new Error("not-found"))
            }
            break
        }

        default:
            throw new Error("Unknown message")
    }
})

function postMessageWaitResponse(client, message, timeout=30000) {
    return new Promise((resolve, reject) => {
        const callbackId = self.crypto.randomUUID()
        callbacks.set(callbackId, { resolve, reject })
        self.setTimeout(() => {
            callbacks.delete(callbackId)
            reject(new TimeoutError())
        }, timeout)
        client.postMessage({ ...message, callbackId })
    })
}

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url)

    const handle = async () => {
        const [_, _prefix, fileHash] = url.pathname.split("/")
        const response = await caches.match(event.request, { ignoreSearch: true })
        if (response) return response

        // request is not cached, let's the client for it
        const clientId = origins.get(fileHash)
        if (!clientId) throw new Error(`Don't know who to ask for!`)

        const client = await self.clients.get(clientId)
        const filename = url.pathname.split("/").slice(3).join("/")
        try {
            const message = await postMessageWaitResponse(client, { filename })
            return new Response(message.data)
        } catch (error) {
            if (error instanceof TimeoutError) {
                return new Response(null, {
                    status: 503,
                    statusText: "Service Unavailable",
                })
            } else {
                throw error
            }
        }
    }

    if (url.pathname.startsWith("/zip")) {
        event.respondWith(handle())
    }
})
