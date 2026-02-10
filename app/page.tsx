"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 1. GOD MODE WALKOUT OVERLAY ⚡️ ---
// Bleibt drin, weil es der beste Effekt ist
const GodModeOverlay = ({ winnerName, value }: { winnerName: string, value: number }) => (
  <div className="fixed inset-0 z-[9000] bg-black/95 flex flex-col items-center justify-center overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/30 via-black to-black animate-pulse" />
    <div className="relative z-10 text-center space-y-4 animate-bounceIn">
      <div className="text-yellow-500 text-2xl font-black tracking-[1em] uppercase mb-4 animate-pulse">TERMIN SECURED</div>
      <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-800 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]">
        {winnerName}
      </h1>
      <div className="text-4xl text-white font-mono font-bold mt-4">+{value}€ PIPELINE VALUE</div>
    </div>
    <MoneyRain amount={150} />
  </div>
);

// --- 2. MONEY RAIN EFFEKT 💸 ---
const MoneyRain = ({ amount = 50 }) => {
  const [particles, setParticles] = useState<any[]>([]);
  useEffect(() => {
    const newParticles = Array.from({ length: amount }).map((_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 0.5, duration: 2 + Math.random() * 2,
      icon: ['💸', '💰', '🎉', '🤑', '💎'][Math.floor(Math.random() * 5)]
    }));
    setParticles(newParticles);
  }, [amount]);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden h-full w-full">
      {particles.map((p) => (
        <div key={p.id} className="absolute top-[-50px] text-4xl animate-fall opacity-0"
          style={{ left: `${p.left}%`, animation: `fall ${p.duration}s linear ${p.delay}s infinite` }}>{p.icon}</div>
      ))}
      <style jsx>{` @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } } `}</style>
    </div>
  );
};

// --- HAUPT APP ---

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [godModeData, setGodModeData] = useState<{name: string, val: number} | null>(null);

  const playerIds = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      if (initialData) setData(initialData);
      setLoading(false);

      const channel = supabase.channel('duell-v6')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, (payload) => {
            setData(payload.new);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    loadAndSubscribe();
  }, []);

  // Godmode Timer (4s)
  useEffect(() => {
    if (godModeData) {
      const timer = setTimeout(() => setGodModeData(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [godModeData]);

  const updateDB = async (updates: any) => {
    setData((prev: any) => ({ ...prev, ...updates }));
    if (data?.id) await supabase.from('duell').update(updates).eq('id', data.id);
  };

  const handleSettingChange = (playerIdx: number, field: string, value: any) => {
    updateDB({ [`p${playerIdx}_${field}`]: value });
  };

  const handleAnwahl = (i: number) => {
    if (!data) return;
    updateDB({
      [`p${i}_calls`]: (data[`p${i}_calls`] || 0) + 1,
      [`p${i}_streak`]: (data[`p${i}_streak`] || 0) + 1, // Pressure steigt
    });
  };

  const handleEntscheider = (i: number) => {
    if (!data) return;
    updateDB({
      [`p${i}_calls`]: (data[`p${i}_calls`] || 0) + 1,
      [`p${i}_deciders`]: (data[`p${i}_deciders`] || 0) + 1,
      [`p${i}_streak`]: (data[`p${i}_streak`] || 0) + 1,
    });
  };

  const handleTermin = (i: number) => {
    if (!data) return;
    const terminWert = data[`p${i}_val`] || 0;
    const playerName = data[`p${i}_name`] || `Spieler ${i}`;
    
    // GOD MODE auslösen
    setGodModeData({ name: playerName, val: terminWert });
    
    updateDB({
      [`p${i}_meetings`]: (data[`p${i}_meetings`] || 0) + 1,
      [`p${i}_deciders`]: (data[`p${i}_deciders`] || 0) + 1,
      [`p${i}_calls`]: (data[`p${i}_calls`] || 0) + 1,
      [`p${i}_streak`]: 0 // Reset Pressure
    });
  };

  const handleReset = async () => {
    if (confirm("⚠️ ACHTUNG: Alles auf Null?")) {
      const resetObj: any = {};
      playerIds.forEach(i => {
        resetObj[`p${i}_calls`] = 0;
        resetObj[`p${i}_deciders`] = 0;
        resetObj[`p${i}_streak`] = 0;
        resetObj[`p${i}_meetings`] = 0;
        // Badges resetten wir nicht explizit, da wir sie eh nicht mehr anzeigen
      });
      await updateDB(resetObj);
    }
  };

  // Helper Score Berechnung (für Leaderboard & Boss)
  const calculateScore = (i: number) => {
      if (!data) return 0;
      const val = data[`p${i}_val`] || 0;
      const streak = data[`p${i}_streak`] || 0;
      const meetings = data[`p${i}_meetings`] || 0;
      const goal = data[`p${i}_goal`] || 1;
      
      const wpa = goal > 0 ? val / goal : 0;
      let vorschuss = streak * wpa;
      if (vorschuss >= val) vorschuss = val - 1;
      
      return (meetings * val) + vorschuss;
  };

  const getLeaderId = () => {
    if (!data) return -1;
    let maxUmsatz = -1;
    let leaderId = -1;
    playerIds.forEach(i => {
        const umsatz = calculateScore(i);
        if (umsatz > maxUmsatz && umsatz > 0) { maxUmsatz = umsatz; leaderId = i; }
    });
    return leaderId;
  };

  if (loading || !data) return <div className="h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse font-mono">LOADING ENGINE...</div>;

  const currentLeaderId = getLeaderId();

  // BOSS FIGHT LOGIK (NEU: Nutzt jetzt den kompletten Score inkl. Vorschuss)
  let teamTotal = 0;
  playerIds.forEach(i => {
      teamTotal += calculateScore(i);
  });
  
  const BOSS_HP_PER_LEVEL = 20000;
  const currentLevel = Math.floor(teamTotal / BOSS_HP_PER_LEVEL) + 1;
  const currentBossHP = BOSS_HP_PER_LEVEL;
  const currentDamage = teamTotal % BOSS_HP_PER_LEVEL;
  const bossProgress = (currentDamage / currentBossHP) * 100;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-2 font-sans overflow-x-hidden pb-10">
      
      {godModeData && <GodModeOverlay winnerName={godModeData.name} value={godModeData.val} />}

      <div className="max-w-[1900px] mx-auto">
        
        {/* BOSS BAR (Oben) */}
        <div className="mb-6 sticky top-0 bg-slate-950/95 backdrop-blur z-40 py-2 border-b border-white/10 shadow-2xl">
            <div className="flex justify-between items-end px-2 mb-2">
                 <div>
                    <h1 className="text-xl font-black italic tracking-tighter text-slate-400">
                        RAID LEVEL <span className="text-yellow-500 text-2xl not-italic">{currentLevel}</span>
                    </h1>
                 </div>
                 <div className="text-right text-xs font-mono text-slate-500">
                    <span className="text-white font-bold">{Math.floor(currentDamage)}</span> / {currentBossHP}€ DAMAGE
                 </div>
            </div>
            <div className="h-8 w-full bg-slate-800 rounded-sm overflow-hidden relative shadow-inner border border-slate-700 mx-2 mb-2">
                <div className="absolute inset-0 bg-red-900/20"></div>
                <div 
                    className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-700 ease-out relative"
                    style={{ width: `${bossProgress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_15px_white]"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-[0.2em] text-white mix-blend-overlay">
                    CURRENT OBJECTIVE
                </div>
            </div>
        </div>

        {/* PLAYER GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4 px-2">
          {playerIds.map((i) => {
            const name = data[`p${i}_name`];
            const terminWert = data[`p${i}_val`] || 0;
            const streak = data[`p${i}_streak`] || 0;
            const meetings = data[`p${i}_meetings`] || 0;
            const calls = data[`p${i}_calls`] || 0;
            const deciders = data[`p${i}_deciders`] || 0;
            const goal = data[`p${i}_goal`] || 1;
            
            const umsatz = calculateScore(i);

            // --- NEUE KPI BERECHNUNG ---
            const realValuePerCall = calls > 0 ? (meetings * terminWert) / calls : 0;
            const deciderQuote = calls > 0 ? (deciders / calls) * 100 : 0;
            // FIX: Terminquote = Termine / Entscheider
            const terminQuote = deciders > 0 ? (meetings / deciders) * 100 : 0;

            // --- PRESSURE LOGIK (Gefixed mit 'Ring') ---
            let cardClasses = 'bg-slate-900 border border-slate-800';
            let shadowClasses = '';
            let pressureText = '';
            
            // Ab 15 Calls: Orange Glow
            if (streak > 15 && streak <= 30) {
                cardClasses = 'bg-slate-900 border-none ring-2 ring-orange-500';
                shadowClasses = 'shadow-[0_0_30px_rgba(249,115,22,0.4)]';
                pressureText = '🔥 HEATING UP';
            } 
            // Ab 30 Calls: Red Critical
            else if (streak > 30) {
                cardClasses = 'bg-slate-900 border-none ring-4 ring-red-600 animate-pulse'; 
                shadowClasses = 'shadow-[0_0_50px_rgba(220,38,38,0.7)]';
                pressureText = '🚨 CRITICAL PRESSURE';
            }

            // --- ICE BUCKET (Einfrieren) ❄️ ---
            const isFrozen = calls === 0;
            const isLeader = currentLeaderId === i;

            return (
              <div key={i} className={`
                relative rounded-xl flex flex-col transition-all duration-300 overflow-hidden min-h-[320px]
                ${isLeader ? 'bg-slate-900 ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.3)] z-10 scale-[1.03]' : cardClasses}
                ${shadowClasses}
                ${isFrozen ? 'opacity-50 grayscale contrast-125' : 'opacity-100'} 
              `}>
                
                {/* 1. FROST OVERLAY (Wenn gefroren) */}
                {isFrozen && !isLeader && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                        <div className="bg-blue-950/80 border border-blue-500/50 px-4 py-1 rounded text-xs text-blue-200 font-bold uppercase tracking-widest backdrop-blur-md shadow-2xl">
                            ❄️ INACTIVE
                        </div>
                    </div>
                )}

                {isLeader && (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-3 py-1 rounded-bl-xl shadow-lg text-xs z-30 uppercase tracking-wider">
                        👑 MVP
                    </div>
                )}
                
                {pressureText && !isLeader && !isFrozen && (
                    <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black text-center uppercase z-20 py-1 tracking-widest">{pressureText}</div>
                )}

                {/* 3. NAME & INPUTS */}
                <div className="mt-6 mb-2 px-3 text-center">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleSettingChange(i, "name", e.target.value)}
                    className={`w-full bg-transparent text-xl font-black text-center uppercase border-none focus:ring-0 outline-none p-0 ${isLeader ? 'text-yellow-400' : 'text-slate-200'}`}
                    placeholder={`PLAYER ${i}`}
                  />
                  {/* Settings Tiny */}
                  <div className="flex justify-center gap-3 opacity-20 hover:opacity-100 transition-opacity text-[10px] mt-2 font-mono text-slate-400">
                       <div className="flex gap-1">
                         <span>VAL:</span>
                         <input type="number" value={terminWert} onChange={(e) => handleSettingChange(i, "val", Number(e.target.value))} className="bg-transparent w-10 text-center text-white border-b border-white/20"/>
                       </div>
                       <div className="flex gap-1">
                         <span>GOAL:</span>
                         <input type="number" value={goal} onChange={(e) => handleSettingChange(i, "goal", Number(e.target.value))} className="bg-transparent w-8 text-center text-white border-b border-white/20"/>
                       </div>
                  </div>
                </div>

                {/* 4. MAIN SCORE (UMSATZ) */}
                <div className="flex-grow flex flex-col items-center justify-center py-2 relative">
                  <div className={`text-5xl lg:text-6xl font-black tracking-tighter leading-none ${isLeader ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'text-slate-500'}`}>
                    {Math.floor(umsatz)}<span className="text-xl text-slate-700 font-medium ml-1">€</span>
                  </div>
                  
                  {/* Streak Anzeige statt Lootbar */}
                  {streak > 0 && (
                      <div className={`text-xs font-mono mt-2 font-bold uppercase tracking-wider ${streak > 15 ? 'text-orange-500' : 'text-slate-600'}`}>
                          Current Streak: {streak}
                      </div>
                  )}
                </div>

                {/* 5. DATA GRID (KPIs) */}
                <div className="grid grid-cols-3 gap-px bg-slate-800/80 border-y border-white/5 text-center mb-3 backdrop-blur-sm">
                    <div className="p-1.5">
                        <div className="text-[8px] text-slate-500 uppercase tracking-wider">Real/Call</div>
                        <div className={`text-xs font-bold font-mono ${realValuePerCall > (goal > 0 ? terminWert/goal : 0) ? 'text-green-400' : 'text-slate-300'}`}>
                            {realValuePerCall.toFixed(2)}€
                        </div>
                    </div>
                    <div className="p-1.5 border-l border-white/5">
                        <div className="text-[8px] text-slate-500 uppercase tracking-wider">D-Quote</div>
                        <div className="text-xs font-bold font-mono text-purple-300">{deciderQuote.toFixed(0)}%</div>
                    </div>
                    <div className="p-1.5 border-l border-white/5">
                        <div className="text-[8px] text-slate-500 uppercase tracking-wider">T-Quote</div>
                        {/* FIX: Berechnung ist jetzt Termine / Entscheider */}
                        <div className={`text-xs font-bold font-mono ${terminQuote > 10 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {terminQuote.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* 6. ACTION BUTTONS */}
                <div className="grid grid-cols-4 gap-1 p-2 mt-auto">
                    <button onClick={() => handleAnwahl(i)} className="col-span-1 bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white font-bold py-3 rounded text-xs transition-colors flex flex-col items-center justify-center group border border-white/5">
                        <span className="text-sm group-hover:scale-125 transition-transform">❌</span>
                        <span className="text-[8px] mt-0.5 font-mono">{calls}</span>
                    </button>
                    <button onClick={() => handleEntscheider(i)} className="col-span-1 bg-slate-800 text-purple-400 hover:bg-purple-900/30 hover:text-purple-300 font-bold py-3 rounded text-xs transition-colors flex flex-col items-center justify-center group border border-white/5">
                        <span className="text-sm group-hover:scale-125 transition-transform">🗣️</span>
                        <span className="text-[8px] mt-0.5 font-mono">{deciders}</span>
                    </button>
                    <button onClick={() => handleTermin(i)} className="col-span-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-black italic tracking-wider py-3 rounded shadow-lg active:scale-95 transition-all text-sm z-10 border border-emerald-500/30 group">
                        TERMIN
                        <span className="block text-[8px] font-normal not-italic opacity-70 text-emerald-100 font-mono mt-0.5">{meetings} BKD</span>
                    </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* 7. FOOTER RESET */}
        <div className="text-center py-12 opacity-20 hover:opacity-100 transition-opacity">
            <button onClick={handleReset} className="text-[9px] text-red-600 border border-red-900/30 hover:bg-red-900/10 px-4 py-2 rounded uppercase tracking-[0.2em] transition-all">
                System Reboot (Reset)
            </button>
        </div>

      </div>
    </main>
  );
}
