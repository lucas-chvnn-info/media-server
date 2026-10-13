"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  Play, Pause, Film, Tv, Download, Search, Languages, Sun, Moon, RefreshCw, Cpu, Database, HardDrive, ExternalLink, Network, Clock, Folder, X, Calendar 
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { serviceLinks } from '@/lib/links';
import { Card } from './components/Card';
import { Clock as ClockComponent } from './components/Clock'; // Renamed to avoid conflict with lucide-react Clock

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardPage() {
    const { data, error, isLoading, mutate } = useSWR('/api/dashboard', fetcher, { 
        refreshInterval: 5000,
        revalidateOnFocus: false // Prevent too many refreshes
    });

    const [isDark, setIsDark] = useState(true);
    const [activeView, setActiveView] = useState<'none' | 'calendar' | 'recents' | 'storage'>('none');
    const [links, setLinks] = useState(() => serviceLinks());

    useEffect(() => {
        setLinks(serviceLinks(window.location.hostname));
    }, []);

    useEffect(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setIsDark(false);
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        if (!isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };

    const disk = data?.radarr?.disks?.[0];
    const diskPercent = data?.system?.ram || 0; // Fallback - This line was changed as per instruction, but might be logically incorrect for disk usage.

    // Loading Screen with Staggered Animation
    if (!data && isLoading) {
        return (
            <div className="h-dvh w-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 opacity-[0.05]"></div>
                <div className="relative z-10 flex flex-col items-center p-12">
                   <div className="relative mb-8">
                       <div className="absolute inset-0 bg-[#aa5cc3] blur-[60px] opacity-40 animate-pulse"></div>
                       <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl flex items-center justify-center shadow-2xl">
                            <RefreshCw className="w-10 h-10 text-white animate-spin duration-[3s]" />
                       </div>
                   </div>
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.2 }}
                     className="flex flex-col items-center gap-2"
                   >
                       <span className="text-2xl font-black tracking-tighter">STREAM HUB</span>
                       <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-50 text-[#aa5cc3]">Initialisation</span>
                   </motion.div>
                </div>
            </div>
        );
    }

    return (
        <main className={cn(
            "min-h-dvh md:h-dvh w-screen flex flex-col transition-colors duration-1000 bg-cover bg-center bg-fixed font-sans selection:bg-[#aa5cc3] selection:text-white overflow-x-hidden",
            isDark ? "dark text-zinc-100" : "text-zinc-900 bg-zinc-100" // Darker text for light mode contrast
        )} style={{ backgroundImage: `linear-gradient(rgba(${isDark ? '3,3,5,0.85' : '245,245,247,0.92'}), rgba(${isDark ? '5,5,7,0.95' : '230,230,235,0.95'})), url('https://images.planfixe.ch/api/random-pic')` }}>
            
            {/* OVERLAYS */}
            <AnimatePresence>
                {activeView !== 'none' && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-8"
                        onClick={() => setActiveView('none')}
                    >
                        <motion.div 
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            className={cn("w-full max-w-4xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative", isDark ? "bg-[#111] border border-white/10" : "bg-white/90 backdrop-blur-xl border border-zinc-200 shadow-xl")}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-black")}>
                                    {activeView === 'calendar' && '📅 Agenda des Sorties'}
                                    {activeView === 'recents' && '🍿 Nouveautés'}
                                    {activeView === 'storage' && '💾 Détail du Stockage'}
                                </h2>
                                <button onClick={() => setActiveView('none')} className="p-2 rounded-full hover:bg-white/10">
                                    <X className={cn("w-6 h-6", isDark ? "text-white" : "text-black")} />
                                </button>
                            </div>

                            {/* CONTENT */}
                            <div className="space-y-4">
                                {activeView === 'calendar' && data?.calendar?.map((item: any) => (
                                    <div key={item.id} className={cn("flex gap-4 items-center p-3 rounded-xl transition-colors", isDark ? "bg-white/5 hover:bg-white/10" : "bg-zinc-100 hover:bg-zinc-200")}>
                                        <div className="w-12 text-center shrink-0">
                                            <div className="text-xs opacity-50 uppercase">{new Date(item.date).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                                            <div className="text-xl font-bold">{new Date(item.date).getDate()}</div>
                                        </div>
                                        <div className="w-10 h-14 bg-black/50 rounded shrink-0 overflow-hidden relative shadow-sm">
                                            {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                                            <div className={cn("absolute top-0 right-0 p-1 text-[8px] font-bold uppercase text-white backdrop-blur-md", item.status === 'downloaded' ? "bg-green-500/80" : "bg-blue-500/80")}>
                                              {item.status === 'downloaded' ? 'Dispo' : 'Prévu'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className={cn("font-bold text-sm md:text-base", isDark ? "text-gray-200" : "text-zinc-900")}>{item.title}</div> 
                                            <div className={cn("text-xs", isDark ? "text-gray-400" : "text-zinc-500")}>
                                                {item.type === 'episode' ? `${item.episode} - ${item.episodeTitle}` : 'Film'} · {new Date(item.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {activeView === 'recents' && (
                                    <div className="space-y-8">
                                     {/* RESUME SECTION UNCHANGED... */}
                                     {data?.jellyfin?.resume?.length > 0 ? (
                                        <div className="mb-8">
                                            <h3 className={cn("text-xs font-bold opacity-50 uppercase tracking-widest mb-4 flex items-center gap-2", isDark ? "text-white" : "text-zinc-900")}>
                                                <Play className="w-3 h-3 fill-current" /> Reprendre la lecture
                                            </h3>
                                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
                                                {data.jellyfin.resume.map((item: any) => (
                                                    <div key={item.id} className="snap-start shrink-0 w-64 relative group cursor-pointer aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] shadow-lg">
                                                        {item.backdrop && <img src={item.backdrop} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                                                            <div className="text-sm font-bold text-white truncate shadow-black drop-shadow-md">{item.seriesName || item.name}</div>
                                                            {item.seriesName && <div className="text-xs text-white/70 font-medium">{item.episode} - {item.name}</div>}
                                                            <div className="w-full h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
                                                                <div className="h-full bg-[#aa5cc3] shadow-[0_0_10px_#aa5cc3]" style={{ width: `${item.progress}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/50">
                                                                <Play className="w-4 h-4 fill-current ml-0.5" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                     ) : (
                                        // Placeholder with better light mode support
                                        <div className={cn("mb-8 p-6 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-opacity", isDark ? "bg-white/5 border-white/5 opacity-60" : "bg-zinc-100 border-zinc-200 opacity-80")}>
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-1", isDark ? "bg-white/10" : "bg-zinc-200")}>
                                                <Film className="w-5 h-5 opacity-50" />
                                            </div>
                                            <h3 className="text-sm font-bold">Rien à reprendre ?</h3>
                                            <p className="text-xs max-w-[250px] opacity-70">
                                                Lancez un film sur Jellyfin ou configurez la Clé API pour voir votre progression ici.
                                            </p>
                                        </div>
                                     )}

                                     <div>
                                         <h3 className={cn("text-sm font-bold opacity-50 uppercase tracking-widest mb-4", isDark ? "text-white" : "text-zinc-900")}>Derniers Téléchargements</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {data?.recents?.map((item: any) => (
                                                <div key={item.id} className={cn("flex gap-3 items-center p-2 rounded-lg transition-colors", isDark ? "bg-white/5 hover:bg-white/10" : "bg-zinc-100 hover:bg-zinc-200")}>
                                                    <div className="flex flex-col">
                                                        <span className={cn("font-bold text-sm line-clamp-1", isDark ? "text-gray-200" : "text-zinc-900")}>{item.title}</span>
                                                        <span className={cn("text-xs opacity-60", isDark ? "text-gray-400" : "text-zinc-500")}>{item.type === 'episode' ? item.episode : item.quality}</span>
                                                    </div>
                                                    <div className="ml-auto text-[10px] opacity-40">{new Date(item.date).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                         </div>
                                     </div>
                                    </div>
                                )}

                                {activeView === 'storage' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {data?.system?.disks?.map((disk: any, i: number) => (
                                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex justify-between mb-2">
                                                    <span className={cn("font-bold", isDark ? "text-white" : "text-black")}>{disk.label || disk.path}</span>
                                                    <span className={cn("text-sm opacity-60", isDark ? "text-white" : "text-black")}>{disk.percent}% Used</span>
                                                </div>
                                                <div className="w-full h-4 bg-black/20 rounded-full overflow-hidden relative border border-white/10">
                                                    <div className={cn("h-full transition-all duration-1000", disk.percent > 90 ? "bg-red-500" : (disk.percent > 75 ? "bg-orange-500" : "bg-green-500"))} style={{ width: `${disk.percent}%` }} />
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs opacity-50">
                                                    <span>Libre: {Math.round(disk.free / 1024 / 1024 / 1024)} Go</span>
                                                    <span>Total: {Math.round(disk.total / 1024 / 1024 / 1024)} Go</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Main Content Container - Fits in viewport */}
            <div className="w-full max-w-[1600px] mx-auto p-3 md:p-8 flex flex-col h-full gap-3 md:gap-6">
                
                {/* HEADER - Compact on Mobile */}
                <header className="flex flex-row justify-between items-center gap-2 shrink-0 h-10 md:h-auto">
                    <ClockComponent />
                    <div className="flex gap-2 self-center backdrop-blur-xl p-1 rounded-xl md:p-1.5 md:rounded-2xl bg-white/10 border border-white/10 shadow-sm dark:shadow-none">
                        <button onClick={toggleTheme} className="glass-button w-8 h-8 md:w-12 md:h-12 hover:bg-black/5 dark:hover:bg-white/10">
                            {isDark ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
                        </button>
                        <button onClick={() => mutate()} className="glass-button w-8 h-8 md:w-12 md:h-12 hover:bg-black/5 dark:hover:bg-white/10">
                            <RefreshCw className={cn("w-4 h-4 md:w-5 md:h-5 transition-all text-zinc-600 dark:text-zinc-300", isLoading && "animate-spin")} />
                        </button>
                    </div>
                </header>

                {/* ROBUST FLEX LAYOUT - THE "UNBREAKABLE" BENTO */}
                <div className="flex flex-col xl:flex-row gap-4 md:gap-6 flex-grow min-h-0">
                    
                    {/* COL 1: JELLYFIN HERO (50% width on Desktop) */}
                    <div className="xl:w-2/4 flex flex-col">
                        <Card 
                            className="w-full h-full min-h-[360px] !bg-[#aa5cc3]/5 !border-[#aa5cc3]/20 relative overflow-hidden group !p-0 rounded-3xl"
                            href={links.jellyfin}
                            color="#aa5cc3"
                            isDark={isDark}
                            fanart={data?.jellyfin?.activeStreams?.[0]?.item?.backdrop} 
                        >
                             {/* ... (Keep Jellyfin Content Logic - unchanged) ... */}
                            {data?.jellyfin?.activeStreams?.length > 0 ? (
                               <div className="relative z-10 flex flex-col justify-between h-full p-6 md:p-10 bg-black/40 backdrop-blur-md">
                                    <div className="flex justify-between items-start">
                                        <div className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-red-500/20">
                                            LIVE
                                        </div>
                                    </div>
                                    <div className="mt-auto">
                                        <h2 className="text-3xl md:text-5xl font-black text-white leading-none drop-shadow-2xl line-clamp-2 mb-2">
                                            {data.jellyfin.activeStreams[0].item.title}
                                        </h2>
                                        <div className="flex items-center gap-2 text-white/90 font-medium mb-4">
                                            <div className="bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-md text-xs">
                                                {data.jellyfin.activeStreams[0].user}
                                            </div>
                                            {data.jellyfin.activeStreams[0].item.episode && (
                                               <span className="opacity-80 text-sm">• {data.jellyfin.activeStreams[0].item.episode}</span>
                                            )}
                                        </div>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                            <motion.div 
                                                className="h-full bg-[#aa5cc3] shadow-[0_0_15px_#aa5cc3]" 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${data.jellyfin.activeStreams[0].progress}%` }}
                                                transition={{ duration: 1 }}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('recents'); }} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95 group-hover:bg-[#aa5cc3] group-hover:shadow-lg">
                                        <Clock className="w-5 h-5" />
                                    </button>
                               </div>
                            ) : (
                                <div className="relative z-10 flex flex-col h-full p-6 md:p-8">
                                    <div className="flex justify-between items-start mb-auto">
                                        <div className="flex flex-col">
                                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-800 dark:text-white leading-none">Jellyfin</h2>
                                            <span className="text-sm text-zinc-500 dark:text-white/40 font-bold tracking-[0.3em] uppercase mt-1 ml-1">Media Hub</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('recents'); }} 
                                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-600 dark:text-white font-bold text-xs uppercase tracking-widest transition-colors ring-1 ring-inset ring-white/10"
                                            >
                                                <Clock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nouveautés</span>
                                            </button>
                                            <StatusBadge isOnline={data?.system?.isOnline} />
                                        </div>
                                    </div>

                                    {/* Play Button Center (Decorative) */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                        <div className="w-20 h-20 bg-[#aa5cc3]/20 rounded-full backdrop-blur-md flex items-center justify-center">
                                            <Play className="w-8 h-8 fill-white/80 text-white/80" />
                                        </div>
                                    </div>

                                    {/* System Stats Bottom */}
                                    <div className="mt-auto grid grid-cols-4 gap-2 md:gap-4">
                                        <SystemGauge label="CPU" value={data?.system?.cpu} icon={<Cpu className="w-4 h-4"/>} isDark={isDark} />
                                        <SystemGauge label="RAM" value={data?.system?.ram} icon={<Database className="w-4 h-4"/>} isDark={isDark} />
                                        <SystemGauge label="Net" value={50} customLabel={`${data?.system?.network?.down || 0} Mb/s`} icon={<Download className="w-4 h-4"/>} isDark={isDark} />
                                        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('storage'); }} className="cursor-pointer hover:bg-white/5 rounded-xl transition-colors">
                                            <SystemGauge label="HDD" value={diskPercent} icon={<HardDrive className="w-4 h-4"/>} isDark={isDark} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* COL 2: RADARR & SONARR (25% on Desktop) */}
                    <div className="xl:w-1/4 flex flex-col md:flex-row xl:flex-col gap-4 md:gap-6">
                        <div className="flex-1 min-h-[180px]">
                            <MediaCard 
                                title="Radarr"
                                count={data?.radarr?.moviesCount}
                                label="Films"
                                upcoming={data?.radarr?.upcoming}
                                history={data?.radarr?.history}
                                stats={data?.radarr?.stats}
                                color="#df9e24"
                                fanart={data?.radarr?.fanart}
                                href={links.radarr}
                                icon={<Film className="w-5 h-5 md:w-6 md:h-6" />}
                                isDark={isDark}
                                actionLabel="Agenda"
                                onClickAction={(e: any) => { e.preventDefault(); e.stopPropagation(); setActiveView('calendar'); }}
                            />
                        </div>
                        <div className="flex-1 min-h-[180px]">
                            <MediaCard 
                                title="Sonarr"
                                count={data?.sonarr?.seriesCount}
                                label="Séries"
                                upcoming={data?.sonarr?.upcoming}
                                history={data?.sonarr?.history}
                                stats={data?.sonarr?.stats}
                                color="#007AFF"
                                fanart={data?.sonarr?.fanart}
                                href={links.sonarr}
                                icon={<Tv className="w-5 h-5 md:w-6 md:h-6" />}
                                isDark={isDark}
                                actionLabel="Agenda"
                                onClickAction={(e: any) => { e.preventDefault(); e.stopPropagation(); setActiveView('calendar'); }}
                            />
                        </div>
                    </div>

                    {/* COL 3: TOOLS (25% on Desktop) */}
                    <div className="xl:w-1/4 flex flex-col md:grid md:grid-cols-2 xl:flex xl:flex-col gap-4 md:gap-6">
                        {/* Jellyseerr Featured */}
                        <ToolButton 
                            className="w-full md:col-span-2 xl:col-span-1 min-h-[100px] xl:flex-1" // Expands on desktop
                            title="Demandes" 
                            label="Jellyseerr" 
                            icon={<Search className="w-6 h-6"/>} 
                            color="#E5A00D" 
                            href={links.seerr} 
                            isDark={isDark} 
                        />
                        {/* Smaller Tools */}
                        <ToolButton 
                            title="Qbittorrent" 
                            label={data?.qbit?.status === 'online' ? `↓ ${formatBytes(data.qbit.data.down)} · ↑ ${formatBytes(data.qbit.data.up)}` : "Downloads"} 
                            icon={<Download />} 
                            color="#2f69a5" 
                            href={links.qbittorrent} 
                            isDark={isDark} 
                        />
                        <ToolButton title="Prowlarr" label="Index" icon={<Network />} color="#e63d33" href={links.prowlarr} isDark={isDark} />
                        <ToolButton className="md:col-span-2 xl:col-span-1" title="Bazarr" label="Subtitles" icon={<Languages />} color="#5856D6" href={links.bazarr} isDark={isDark} />
                    </div>

                </div>
            </div>
        </main>
    );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function StatusBadge({ isOnline }: { isOnline?: boolean }) {
  return (
    <div className={cn(
        "px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest backdrop-blur-xl transition-all shadow-lg ring-1 ring-inset",
        isOnline 
          ? "bg-green-500/10 text-green-600 dark:text-green-400 ring-green-500/20 shadow-green-900/10" 
          : "bg-red-500/10 text-red-500 ring-red-500/20"
    )}>
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}

function SystemGauge({ label, value, icon, isDark, customLabel }: { label: string, value?: number, icon: any, isDark?: boolean, customLabel?: string }) {
  const data = [{ value: value || 0 }, { value: 100 - (value || 0) }];
  const val = Math.round(value || 0);
  const color = val > 90 ? '#ef4444' : val > 75 ? '#f59e0b' : '#22c55e'; // Adaptive colors

  return (
    <div className="flex flex-col items-center gap-1.5 group">
        <div className="relative w-12 h-12 md:w-16 md:h-16 transition-transform group-hover:scale-110 duration-300">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius="75%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell fill={color} />
                        <Cell fill={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className={cn("font-bold text-xs md:text-sm", isDark ? "text-white" : "text-zinc-800", customLabel && "text-[10px] md:text-xs")}>{customLabel || `${val}%`}</span>
            </div>
        </div>
        <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
            {React.cloneElement(icon, { className: cn("w-3 h-3 md:w-4 md:h-4", isDark ? "text-white" : "text-zinc-600") })}
            <span className={cn("text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em]", isDark ? "text-white" : "text-zinc-600")}>{label}</span>
        </div>
    </div>
  );
}

function MediaCard({ title, count, label, upcoming, history, stats, color, fanart, href, icon, isDark, onClickAction, actionLabel }: any) {
  return (
    <Card href={href} fanart={fanart} color={color} isDark={isDark}>
        <div className="flex flex-col h-full justify-between relative z-10 gap-4">
            {/* Top */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 transition-transform group-hover:scale-110 duration-500 shrink-0" style={{ backgroundColor: color }}>
                        {icon}
                    </div>
                    <div>
                        <h3 className={cn("text-xl md:text-2xl font-bold tracking-tight leading-none", fanart ? "text-white drop-shadow-md" : (isDark ? "text-white" : "text-zinc-800"))}>{title}</h3>
                        <span className={cn("text-[9px] md:text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] mt-0.5 block", fanart ? "text-white/80" : (isDark ? "text-white/50" : "text-zinc-500"))}>{label}</span>
                    </div>
                </div>
                {onClickAction && (
                    <button 
                        onClick={onClickAction}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-all ring-1 ring-white/10 flex items-center gap-1.5 z-20"
                    >
                        <Calendar className="w-3 h-3" /> {actionLabel}
                    </button>
                )}
            </div>

            {/* Middle Stats */}
            <div className="flex justify-between items-end my-2">
                <div>
                    <span className={cn("text-4xl md:text-6xl font-black leading-none tracking-tighter", fanart ? "text-white drop-shadow-lg" : (isDark ? "text-white" : "text-zinc-800"))}>
                        {count ?? 0}
                    </span>
                </div>
                
                {/* Mini Pie Chart Stat */}
                {stats && (
                    <div className="w-12 h-12 md:w-16 md:h-16 opacity-80 hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={[
                                        { value: stats.downloaded }, 
                                        { value: (stats.total || count) - stats.downloaded }
                                    ]} 
                                    innerRadius="60%"
                                    outerRadius="100%"
                                    stroke="none"
                                    dataKey="value"
                                >
                                    <Cell fill={color} />
                                    <Cell fill={fanart ? "rgba(255,255,255,0.2)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")} />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Bottom Info */}
            <div className={cn("pt-3 md:pt-4 mt-auto border-t backdrop-blur-sm rounded-xl p-2 -mx-2 transition-colors", fanart ? "border-white/20 bg-black/30" : (isDark ? "border-white/5 bg-white/5" : "border-zinc-200 bg-zinc-50"))}>
                <span className={cn("text-[9px] font-black uppercase tracking-widest block mb-1 opacity-60", fanart ? "text-white" : (isDark ? "text-white" : "text-zinc-500"))}>Prochainement</span>
                <span className={cn("font-bold text-xs md:text-sm truncate block", fanart ? "text-white text-shadow-sm" : (isDark ? "text-white" : "text-zinc-700"))}>
                    {upcoming || "Aucun"}
                </span>
            </div>
        </div>

        {/* History Graph */}
        {history && (
            <div className={cn("absolute bottom-0 left-0 right-0 h-24 md:h-32 opacity-40 pointer-events-none z-0 mix-blend-screen transition-all duration-700", isDark ? "grayscale-[30%] group-hover:grayscale-0" : "grayscale-0 opacity-20")}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.map((h: any, i: number) => ({ val: h, i }))}>
                        <defs>
                            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.6}/>
                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area 
                            type="monotone" 
                            dataKey="val" 
                            stroke={color} 
                            fill={`url(#grad-${title})`} 
                            strokeWidth={3}
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )}
    </Card>
  );
}

function ToolButton({ title, label, icon, color, href, isDark }: any) {
  return (
    <Card href={href} color={color} isDark={isDark} className="!p-3 md:!p-5 flex-row items-center gap-3 md:gap-5 group/btn hover:!bg-white/5">
      <div 
        className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover/btn:rotate-12 group-hover/btn:scale-110" 
        style={{ backgroundColor: color }}
      >
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5 md:w-6 md:h-6" })}
      </div>
      <div className="flex flex-col overflow-hidden min-w-0">
        <span className={cn("font-bold text-sm md:text-lg truncate transition-colors", isDark ? "text-zinc-100 group-hover/btn:text-white" : "text-zinc-800 group-hover/btn:text-black")}>{title}</span>
        <span className={cn("text-[9px] md:text-[10px] font-bold opacity-40 uppercase tracking-widest transition-opacity text-nowrap", isDark ? "group-hover/btn:opacity-60" : "text-zinc-500")}>{label}</span>
      </div>
      <ExternalLink className={cn("ml-auto w-4 h-4 md:w-5 md:h-5 opacity-0 -translate-x-2 group-hover/btn:opacity-50 group-hover/btn:translate-x-0 transition-all", isDark ? "text-white" : "text-zinc-400")} />
    </Card>
  );
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
