importScripts(
    "https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js"
)

workbox.precaching.precacheAndRoute(["./index.html"])
workbox.precaching.precacheAndRoute(["./sounds/new_message.mp3"])
workbox.precaching.precacheAndRoute(["./sounds/new_file.mp3"])

workbox.routing.registerRoute(
    /\.js$/,
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: "js-cache",
    })
)
workbox.routing.registerRoute(
    /\.css$/,
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: "css-cache",
    })
)
workbox.routing.registerRoute(
    /\.json$/,
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: "json-cache",
    })
)
workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    new workbox.strategies.CacheFirst({
        cacheName: "image-cache",
        plugins: [
            new workbox.expiration.Plugin({
                // Cache for a maximum of a week.
                maxAgeSeconds: 7 * 24 * 60 * 60,
            }),
        ],
    })
)
workbox.routing.registerRoute(
    /\.(?:ttf|woff)$/,
    new workbox.strategies.CacheFirst({
        cacheName: "font-cache",
        plugins: [
            new workbox.expiration.Plugin({
                maxEntries: 20,
                // Cache for a maximum of a week.
                maxAgeSeconds: 7 * 24 * 60 * 60,
            }),
        ],
    })
)
