import { CONFIG } from './config';

// Global variable to cache the result of the login (cookie) for qBittorrent
let qbitCookie: string | null = null;

// Jellyfin >= 10.11 rejects the legacy ?api_key= query param: send the key in the Authorization header
const jellyfinHeaders = (): HeadersInit => {
    const apiKey = CONFIG.API_KEYS.jellyfin;
    return apiKey ? { Authorization: `MediaBrowser Token="${apiKey}"` } : {};
};

export const fetchRadarrData = async () => {
    const defaultData = {
        moviesCount: 0,
        stats: { downloaded: 0, missing: 0 },
        disks: [],
        upcoming: "Indisponible",
        history: Array(7).fill(0),
        fanart: null,
        isOnline: false
    };

    try {
        const apiKey = CONFIG.API_KEYS.radarr;
        const baseUrl = CONFIG.ENDPOINTS.radarr;

        const [moviesRes, disksRes, historyRes] = await Promise.all([
            fetch(`${baseUrl}/api/v3/movie?apiKey=${apiKey}`).catch(() => null),
            fetch(`${baseUrl}/api/v3/diskspace?apiKey=${apiKey}`).catch(() => null),
            fetch(`${baseUrl}/api/v3/history?pageSize=100&sortKey=date&sortDirection=descending&apiKey=${apiKey}`).catch(() => null)
        ]);

        if (!moviesRes || !moviesRes.ok) return defaultData;

        const movies = await moviesRes.json().catch(() => []);
        const disks = disksRes && disksRes.ok ? await disksRes.json().catch(() => []) : [];
        const history = historyRes && historyRes.ok ? await historyRes.json().catch(() => ({ records: [] })) : { records: [] };

        if (!Array.isArray(movies)) return defaultData;

        let stats = { downloaded: 0, missing: 0 };
        movies.forEach((m: any) => {
            if (m.hasFile) stats.downloaded++;
            else if (m.monitored && m.status === 'released') stats.missing++;
        });

        const wanted = movies.filter((m: any) => m.monitored && !m.hasFile && (m.status === 'announced' || m.status === 'inCinemas' || m.status === 'released'));
        wanted.sort((a: any, b: any) => new Date(a.inCinemas || a.digitalRelease || '2099-01-01').getTime() - new Date(b.inCinemas || b.digitalRelease || '2099-01-01').getTime());
        
        const targetMovie = wanted.length > 0 ? wanted[0] : movies[movies.length - 1];
        let upcoming = "Aucun film attendu";
        let fanart = null;

        if (targetMovie) {
            if (wanted.length > 0) upcoming = targetMovie.title;
            const imgObj = targetMovie.images?.find((i: any) => i.coverType === 'fanart') || targetMovie.images?.find((i: any) => i.coverType === 'poster');
            if (imgObj) {
                // Use internal proxy
                const fullUrl = `${baseUrl}${imgObj.url}?apiKey=${apiKey}`;
                fanart = `/api/image?url=${encodeURIComponent(fullUrl)}`;
            }
        }

        const historyDays = Array(7).fill(0);
        const today = new Date();
        (history.records || []).forEach((rec: any) => {
            if (!rec.date) return;
            const date = new Date(rec.date);
            const diffDays = Math.floor(Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) historyDays[6 - diffDays]++;
        });

        return {
            moviesCount: movies.length,
            stats,
            disks,
            upcoming,
            history: historyDays,
            fanart,
            isOnline: true
        };
    } catch (e) {
        console.error("Radarr Fetch Error:", e);
        return defaultData;
    }
};

export const fetchSonarrData = async () => {
    const defaultData = {
        seriesCount: 0,
        stats: { downloaded: 0, total: 0 },
        upcoming: "Indisponible",
        history: Array(7).fill(0),
        fanart: null,
        isOnline: false
    };

    try {
        const apiKey = CONFIG.API_KEYS.sonarr;
        const baseUrl = CONFIG.ENDPOINTS.sonarr;

        const [seriesRes, historyRes] = await Promise.all([
            fetch(`${baseUrl}/api/v3/series?apiKey=${apiKey}`).catch(() => null),
            fetch(`${baseUrl}/api/v3/history?pageSize=100&sortKey=date&sortDirection=descending&apiKey=${apiKey}`).catch(() => null)
        ]);

        if (!seriesRes || !seriesRes.ok) return defaultData;

        const series = await seriesRes.json().catch(() => []);
        const history = historyRes && historyRes.ok ? await historyRes.json().catch(() => ({ records: [] })) : { records: [] };

        if (!Array.isArray(series)) return defaultData;

        let stats = { downloaded: 0, total: 0 };
        series.forEach((s: any) => {
            if (s.statistics) {
                stats.total += s.statistics.episodeCount || 0;
                stats.downloaded += s.statistics.episodeFileCount || 0;
            }
        });

        // Calendar for upcoming
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const calRes = await fetch(`${baseUrl}/api/v3/calendar?apiKey=${apiKey}&start=${start}&end=${end}`).catch(() => null);
        const calendar = calRes && calRes.ok ? await calRes.json().catch(() => []) : [];

        let upcoming = "Rien cette semaine";
        let fanart = null;

        if (calendar.length > 0) {
            const next = calendar.find((ep: any) => !ep.hasFile) || calendar[0];
            if (next && next.series) {
                upcoming = `${next.series.title} - S${next.seasonNumber}E${next.episodeNumber}`;
                const imgObj = next.series.images?.find((i: any) => i.coverType === 'fanart') || next.series.images?.find((i: any) => i.coverType === 'poster');
                if (imgObj) {
                     // Use internal proxy
                     const fullUrl = `${baseUrl}${imgObj.url}?apiKey=${apiKey}`;
                     fanart = `/api/image?url=${encodeURIComponent(fullUrl)}`;
                }
            }
        } else if (series.length > 0) {
            const rand = series[Math.floor(Math.random() * series.length)];
            const imgObj = rand.images?.find((i: any) => i.coverType === 'fanart');
            if (imgObj) {
                const fullUrl = `${baseUrl}${imgObj.url}?apiKey=${apiKey}`;
                fanart = `/api/image?url=${encodeURIComponent(fullUrl)}`;
            }
        }

        const historyDays = Array(7).fill(0);
        const today = new Date();
        (history.records || []).forEach((rec: any) => {
            if (!rec.date) return;
            const date = new Date(rec.date);
            const diffDays = Math.floor(Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) historyDays[6 - diffDays]++;
        });

        return {
            seriesCount: series.length,
            stats,
            upcoming,
            history: historyDays,
            fanart,
            isOnline: true
        };
    } catch (e) {
        console.error("Sonarr Fetch Error:", e);
        return defaultData;
    }
};

export const fetchSystemStats = async () => {
    try {
        // Try v4 first
        let res = await fetch(`${CONFIG.ENDPOINTS.glances}/api/4/quicklook`).catch(() => null);
        
        // Try v3 as fallback
        if (!res || !res.ok) {
            res = await fetch(`${CONFIG.ENDPOINTS.glances}/api/3/quicklook`).catch(() => null);
        }

        if (res && res.ok) {
            const data = await res.json().catch(() => null);
            
            if (!data) return { cpu: 0, ram: 0, isOnline: false };

            // Format can vary between v3/v4
            let cpu = 0;
            if (typeof data.cpu === 'number') cpu = data.cpu;
            else if (data.cpu && typeof data.cpu.total === 'number') cpu = data.cpu.total;

            let ram = 0;
            if (typeof data.mem === 'number') ram = data.mem;
            else if (data.mem && typeof data.mem.percent === 'number') ram = data.mem.percent;

            return {
                cpu: Math.round(cpu * 10) / 10,
                ram: Math.round(ram * 10) / 10,
                isOnline: true
            };
        }
        return { cpu: 0, ram: 0, isOnline: false };
    } catch (e) {
        return { cpu: 0, ram: 0, isOnline: false };
    }
};

export const fetchJellyfinSessions = async () => {
    try {
        const baseUrl = CONFIG.ENDPOINTS.jellyfin;

        const res = await fetch(`${baseUrl}/Sessions`, { headers: jellyfinHeaders() }).catch(() => null);
        
        if (!res || !res.ok) return { activeStreams: [], count: 0 };

        const sessions = await res.json().catch(() => []);
        if (!Array.isArray(sessions)) return { activeStreams: [], count: 0 };

        const activeStreams = sessions
            .filter((s: any) => s.NowPlayingItem) // Only playing sessions
            .map((s: any) => ({
                user: s.UserName,
                device: s.DeviceName,
                item: {
                    title: s.NowPlayingItem.Name,
                    type: s.NowPlayingItem.Type,
                    episode: s.NowPlayingItem.IndexNumber ? `S${s.NowPlayingItem.ParentIndexNumber}E${s.NowPlayingItem.IndexNumber}` : '',
                    thumb: s.NowPlayingItem.ImageTags?.Primary ? `${baseUrl}/Items/${s.NowPlayingItem.Id}/Images/Primary?fillWidth=400&quality=90` : null,
                    backdrop: s.NowPlayingItem.ImageTags?.Backdrop ? `${baseUrl}/Items/${s.NowPlayingItem.Id}/Images/Backdrop?fillWidth=800&quality=90` : null
                },
                progress: s.PlayState ? Math.round((s.PlayState.PositionTicks / s.NowPlayingItem.RunTimeTicks) * 100) : 0,
                isPaused: s.PlayState?.IsPaused || false
            }));

        return {
            activeStreams,
            count: activeStreams.length
        };
    } catch (e) {
        return { activeStreams: [], count: 0 };
    }
};

export const fetchNetworkStats = async () => {
    try {
         // Use Glances for network speed
         const res = await fetch(`${CONFIG.ENDPOINTS.glances}/api/3/network`).catch(() => null);
         if (!res || !res.ok) return { up: 0, down: 0 };
         
         const nets = await res.json().catch(() => []);
         // Sum up all interfaces (usually eth0/docker0 are main ones)
         let up = 0; // bits/s
         let down = 0;

         if (Array.isArray(nets)) {
             nets.forEach((n: any) => {
                 if (n.interface_name === 'eth0' || n.interface_name === 'enp3s0' || n.interface_name === 'bond0') {
                    up += n.tx || 0;
                    down += n.rx || 0;
                 }
             });
         }
         
         // Convert to Mbps for display
         return {
             up: Math.round((up * 8) / 1000 / 1000 * 10) / 10,
             down: Math.round((down * 8) / 1000 / 1000 * 10) / 10
         };
    } catch (e) {
        return { up: 0, down: 0 };
    }
};

export const fetchQbitData = async () => {
    try {
        const baseUrl = CONFIG.ENDPOINTS.qbittorrent;
        
        // Helper to fetch with cookie
        const getData = async (cookie: string | null) => {
            const headers: HeadersInit = {};
            if (cookie) headers['Cookie'] = cookie;
            return fetch(`${baseUrl}/api/v2/transfer/info`, { headers });
        };

        // 1. Try with existing cookie (or none)
        let res = await getData(qbitCookie).catch((e) => { console.error("Qbit initial fetch error", e); return null; });

        // 2. If 403 (Forbidden), try to login
        if (res && res.status === 403) {
            // Perform Login
            const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    // Origin/Referer might be needed for some qBit versions/configurations intra-docker
                    'Origin': baseUrl,
                    'Referer': baseUrl 
                },
                body: new URLSearchParams({
                    username: CONFIG.API_KEYS.qbit_username,
                    password: CONFIG.API_KEYS.qbit_password
                })
            }).catch((e) => { console.error("Qbit login fetch error", e); return null; });

            if (loginRes && loginRes.ok) {
                // Extract cookie
                const setCookie = loginRes.headers.get('set-cookie');
                
                if (setCookie) {
                    // Simple extraction of SID (qBit >= 5 names it QBT_SID_<port>)
                    const sidMatch = setCookie.match(/((?:QBT_)?SID(?:_\d+)?)=([^;]+)/);
                    if (sidMatch) {
                        qbitCookie = `${sidMatch[1]}=${sidMatch[2]}`;
                        // Retry request
                        res = await getData(qbitCookie).catch((e) => { console.error("Qbit retry fetch error", e); return null; });
                    }
                }
            }
        }

        if (!res || !res.ok) {
            return { 
                speed: { down: 0, up: 0 }, 
                data: { down: 0, up: 0 },
                status: 'offline' 
            };
        }

        const data = await res.json().catch(() => null);
        if (!data) return { speed: { down: 0, up: 0 }, data: { down: 0, up: 0 }, status: 'offline' };

        return {
            speed: {
                down: data.dl_info_speed || 0,
                up: data.up_info_speed || 0
            },
            data: {
                down: data.dl_info_data || 0,
                up: data.dl_info_data || 0
            },
            status: data.connection_status || 'online'
        };

    } catch (e) {
        return { speed: { down: 0, up: 0 }, data: { down: 0, up: 0 }, status: 'offline' };
    }
};

// --- AGGREGATED FEATURES ---

export const fetchCalendar = async () => {
    try {
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Next 30 days

        const [radarrRes, sonarrRes] = await Promise.all([
            fetch(`${CONFIG.ENDPOINTS.radarr}/api/v3/calendar?apiKey=${CONFIG.API_KEYS.radarr}&start=${start}&end=${end}`).catch(() => null),
            fetch(`${CONFIG.ENDPOINTS.sonarr}/api/v3/calendar?apiKey=${CONFIG.API_KEYS.sonarr}&start=${start}&end=${end}`).catch(() => null)
        ]);

        const movies = radarrRes && radarrRes.ok ? await radarrRes.json().catch(() => []) : [];
        const episodes = sonarrRes && sonarrRes.ok ? await sonarrRes.json().catch(() => []) : [];

        // Normalize and merge
        const timeline = [
            ...movies.map((m: any) => ({
                id: `m-${m.id}`,
                title: m.title,
                date: m.inCinemas || m.digitalRelease || m.physicalRelease,
                type: 'movie',
                image: m.images?.find((i: any) => i.coverType === 'poster')?.url,
                status: m.status
            })),
            ...episodes.map((e: any) => ({
                id: `e-${e.id}`,
                title: e.series?.title || "Unknown Series",
                episodeTitle: e.title,
                episode: `S${e.seasonNumber}E${e.episodeNumber}`,
                date: e.airDateUtc,
                type: 'episode',
                image: e.series?.images?.find((i: any) => i.coverType === 'poster')?.url,
                status: e.hasFile ? 'downloaded' : 'missing'
            }))
        ];

        // Sort by date
        return timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    } catch (e) {
        return [];
    }
};

export const fetchRecents = async () => {
    try {
        const [radarrRes, sonarrRes] = await Promise.all([
            fetch(`${CONFIG.ENDPOINTS.radarr}/api/v3/history?pageSize=10&sortKey=date&sortDirection=descending&eventType=grabbed&apiKey=${CONFIG.API_KEYS.radarr}`).catch(() => null),
            fetch(`${CONFIG.ENDPOINTS.sonarr}/api/v3/history?pageSize=10&sortKey=date&sortDirection=descending&eventType=grabbed&apiKey=${CONFIG.API_KEYS.sonarr}`).catch(() => null)
        ]);

        const movies = radarrRes && radarrRes.ok ? await radarrRes.json().catch(() => ({ records: [] })) : { records: [] };
        const episodes = sonarrRes && sonarrRes.ok ? await sonarrRes.json().catch(() => ({ records: [] })) : { records: [] };

        const history = [
            ...(movies.records || []).map((r: any) => ({
                id: `m-${r.id}`,
                title: r.movie?.title,
                date: r.date,
                type: 'movie',
                quality: r.quality?.quality?.name
            })),
            ...(episodes.records || []).map((r: any) => ({
                id: `e-${r.id}`,
                title: r.series?.title,
                episode: `S${r.episode?.seasonNumber}E${r.episode?.episodeNumber}`,
                date: r.date,
                type: 'episode',
                quality: r.quality?.quality?.name
            }))
        ];

        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
    } catch (e) {
        return [];
    }
};

export const fetchDetailedDisks = async () => {
    try {
        // Radarr gives good disk info
        const res = await fetch(`${CONFIG.ENDPOINTS.radarr}/api/v3/diskspace?apiKey=${CONFIG.API_KEYS.radarr}`).catch(() => null);
        if (!res || !res.ok) return [];
        
        const disks = await res.json().catch(() => []);
        return disks.map((d: any) => ({
            path: d.path,
            label: d.label,
            total: d.totalSpace,
            free: d.freeSpace,
            percent: Math.round(((d.totalSpace - d.freeSpace) / d.totalSpace) * 100)
        }));
    } catch (e) {
        return [];
    }
};

export const fetchJellyfinResume = async () => {
    try {
        const baseUrl = CONFIG.ENDPOINTS.jellyfin;
        const headers = jellyfinHeaders();

        // 1. Get Users to find "Primary" one (or just first one)
        const usersRes = await fetch(`${baseUrl}/Users`, { headers }).catch(() => null);
        const users = usersRes && usersRes.ok ? await usersRes.json().catch(() => []) : [];
        
        if (users.length === 0) return [];

        const userId = users[0].Id; // Grab first user

        // 2. Get Resume Items
        const resumeUrl = `${baseUrl}/Users/${userId}/Items/Resume?Limit=10&Recursive=true&Fields=PrimaryImageAspectRatio,CanDelete,BasicSyncInfo,MediaSourceCount`;

        const resumeRes = await fetch(resumeUrl, { headers }).catch(() => null);
        const data = resumeRes && resumeRes.ok ? await resumeRes.json().catch(() => ({ Items: [] })) : { Items: [] };

        return (data.Items || []).map((item: any) => ({
            id: item.Id,
            name: item.Name,
            seriesName: item.SeriesName,
            episode: item.IndexNumber ? `S${item.ParentIndexNumber}E${item.IndexNumber}` : '',
            type: item.Type,
            thumb: item.ImageTags?.Primary ? `${baseUrl}/Items/${item.Id}/Images/Primary?fillWidth=400&quality=90` : null,
            backdrop: item.ImageTags?.Backdrop ? `${baseUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=800&quality=90` : null,
            progress: item.UserData?.PlayedPercentage || 0
        }));

    } catch (e) {
        return [];
    }
};
