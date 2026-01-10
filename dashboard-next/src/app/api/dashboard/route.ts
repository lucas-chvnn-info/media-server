import { NextResponse } from 'next/server';
import { 
    fetchRadarrData, 
    fetchSonarrData, 
    fetchSystemStats, 
    fetchJellyfinSessions,
    fetchNetworkStats,
    fetchCalendar,
    fetchRecents,
    fetchDetailedDisks,
    fetchJellyfinResume,
    fetchQbitData
} from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
    const [radarr, sonarr, system, jellyfin, network, calendar, recents, disks, resume, qbit] = await Promise.all([
        fetchRadarrData(),
        fetchSonarrData(),
        fetchSystemStats(),
        fetchJellyfinSessions(),
        fetchNetworkStats(),
        fetchCalendar(),
        fetchRecents(),
        fetchDetailedDisks(),
        fetchJellyfinResume(),
        fetchQbitData()
    ]);

    return NextResponse.json({
        radarr,
        sonarr,
        system: { ...system, network, disks },
        jellyfin: { ...jellyfin, resume },
        calendar,
        recents,
        qbit,
        timestamp: new Date().toISOString()
    });
}
