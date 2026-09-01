const CACHE_NAME = 'rook-soundboard-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/sounds/rook1.wav',
    '/sounds/rook2.wav',
    '/sounds/rook3.wav',
    '/sounds/rook4.wav',
    '/sounds/rook5.wav',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching app shell and sounds');
            return cache.addAll(urlsToCache).catch((err) => {
                console.warn('Some resources failed to cache:', err);
                // Continue even if some resources fail to cache
                return Promise.all(
                    urlsToCache.map((url) =>
                        cache.add(url).catch((e) => {
                            console.warn(`Failed to cache ${url}:`, e);
                        })
                    )
                );
            });
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For audio files, prioritize cache but allow network updates
    if (event.request.url.includes('/sounds/')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                // Otherwise, try network
                return fetch(event.request).then((response) => {
                    // Cache successful responses
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                }).catch(() => {
                    // If network fails, return cached version
                    return caches.match(event.request);
                });
            })
        );
        return;
    }

    // For HTML/CSS/JS, use cache-first strategy
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            }).catch(() => {
                // Offline fallback - serve index.html for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline - resource not available', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            });
        })
    );
});

// Message handling for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
