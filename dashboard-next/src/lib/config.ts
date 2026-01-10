export const CONFIG = {
    API_KEYS: {
        radarr: process.env.RADARR_API_KEY || "",
        sonarr: process.env.SONARR_API_KEY || "",
        jellyfin: process.env.JELLYFIN_API_KEY || "",
        qbit_username: process.env.QBIT_USERNAME || "admin",
        qbit_password: process.env.QBIT_PASSWORD || "" 
    },
    // We'll use absolute URLs or relative if we set up a proxy in Next.js
    // For now, let's keep the internal service names for server-side fetches
    // and relative URLs for client-side (proxied via Next.js or Nginx)
    ENDPOINTS: {
        radarr: "http://radarr:7878",
        sonarr: "http://sonarr:8989",
        glances: "http://glances:61208",
        jellyfin: "http://jellyfin:8096",
        qbittorrent: "http://qbittorrent:8085"
    }
};
