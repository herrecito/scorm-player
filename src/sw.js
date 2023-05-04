self.addEventListener("install", event => {
    event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener("message", event => {
    const message = event.data
    switch (message.type) {
        case "put": {
            const { url, body } = message
            caches.open("scorm").then(cache => {
                cache.put(url, new Response(body))
            })
            break
        }

        default:
            throw new Error("Unknown message")
    }
})

self.addEventListener("fetch", event => {
    event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(response => {
        if (response) {
            return response
        } else {
            return fetch(event.request)
        }
    }))
})
