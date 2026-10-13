// Liens vers les interfaces des services.
// Par défaut : même adresse que le dashboard (IP locale, Tailscale…) + port du service.
// Pour un domaine public, définir NEXT_PUBLIC_<SERVICE>_URL dans .env (lu au build).

export type ServiceName = 'jellyfin' | 'seerr' | 'radarr' | 'sonarr' | 'qbittorrent' | 'prowlarr' | 'bazarr';

const SERVICES: Record<ServiceName, { port: number; override?: string }> = {
    jellyfin: { port: 8096, override: process.env.NEXT_PUBLIC_JELLYFIN_URL },
    seerr: { port: 5055, override: process.env.NEXT_PUBLIC_SEERR_URL },
    radarr: { port: 7878, override: process.env.NEXT_PUBLIC_RADARR_URL },
    sonarr: { port: 8989, override: process.env.NEXT_PUBLIC_SONARR_URL },
    qbittorrent: { port: 8085, override: process.env.NEXT_PUBLIC_QBITTORRENT_URL },
    prowlarr: { port: 9696, override: process.env.NEXT_PUBLIC_PROWLARR_URL },
    bazarr: { port: 6767, override: process.env.NEXT_PUBLIC_BAZARR_URL },
};

export function serviceLinks(hostname?: string): Record<ServiceName, string> {
    const links = {} as Record<ServiceName, string>;
    for (const [name, { port, override }] of Object.entries(SERVICES) as [ServiceName, { port: number; override?: string }][]) {
        links[name] = override || (hostname ? `http://${hostname}:${port}` : '#');
    }
    return links;
}
