"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- GOD MODE OVERLAY ---
const GodModeOverlay = ({ winnerName, value }: { winnerName: string, value: number }) => (
  <div className="fixed inset-0 z-[9000] bg-black/95 flex flex-col items-center justify-center overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/30 via-black to-black animate-pulse" />
    <div className="relative z-10 text-center space-y-6 animate-bounceIn">
      <div className="text-yellow-500 text-3xl font-black tracking-[1em] uppercase mb-4 animate-pulse">TERMIN SECURED</div>
      <h1 className="text-8xl md:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-800 drop-shadow-[0_0_50px_rgba(234,179,8,0.8)]">
        {winnerName}
      </h1>
      <div className="text-6xl text-white font-mono font-bold mt-8 border-t border-white/20 pt-8 inline-block">
        +{value}€ PIPELINE
      </div>
    </div>
    <MoneyRain amount={200} />
  </div>
);

// --- MONEY RAIN ---
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

// --- NEWS TICKER ---
const NewsTicker = ({ text }: { text: string }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black py-2 z-50 overflow-hidden whitespace-nowrap border-t-4 border-black">
    <div className="inline-block animate-marquee text-lg font-black uppercase tracking-widest">
      {text}
    </div>
    <style jsx>{`
      .animate-marquee { animation: marquee 30s linear infinite; }
      @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
    `}</style>
  </div>
);

// --- HAUPT APP ---

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [godModeData, setGodModeData] = useState<{name: string, val: number} | null>(null);
  const [bossTarget, setBossTarget] = useState(10000);
  
  // 6 Spieler Setup
  const playerIds = Array.from({ length: 6 }, (_, i) => i + 1);
  const randomEmojis = ['🦁', '🐺', '🦈', '🦖', '🦅', '🦍', '🤡', '🤖', '👽', '💀', '🔥', '🚀', '🐌', '🥚', '👑', '💸', '🧠'];

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      if (initialData) setData(initialData);
      setLoading(false);

      const channel = supabase.channel('duell-v11')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, (payload) => {
            setData(payload.new);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    loadAndSubscribe();
  }, []);

  useEffect(() => {
    if (godModeData) {
      const timer = setTimeout(() => setGodModeData(null), 4500);
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

  const cycleEmoji = (i: number) => {
      const current = data[`p${i}_emoji`] || '👤';
      const currentIndex = randomEmojis.indexOf(current);
      const next = randomEmojis[(currentIndex + 1) % randomEmojis.length];
      handleSettingChange(i, "emoji", next);
  }

  const handleAnwahl = (i: number) => {
    if (!data) return;
    updateDB({
      [`p${i}_calls`]: (data[`p${i}_calls`] || 0) + 1,
      [`p${i}_streak`]: (data[`p${i}_streak`] || 0) + 1, 
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
    setGodModeData({ name: playerName, val: terminWert });
    updateDB({
      [`p${i}_meetings`]: (data[`p${i}_meetings`] || 0) + 1,
      [`p${i}_deciders`]: (data[`p${i}_deciders`] || 0) + 1,
      [`p${i}_calls`]: (data[`p${i}_calls`] || 0) + 1,
      [`p${i}_streak`]: 0 
    });
  };

  const handleReset = async () => {
    if (confirm("⚠️ ACHTUNG: WIRKLICH ALLES LÖSCHEN?")) {
      const resetObj: any = {};
      playerIds.forEach(i => {
        resetObj[`p${i}_calls`] = 0;
        resetObj[`p${i}_deciders`] = 0;
        resetObj[`p${i}_streak`] = 0;
        resetObj[`p${i}_meetings`] = 0;
        resetObj[`p${i}_status`] = '';
      });
      await updateDB(resetObj);
    }
  };

  // Helper Score Berechnung
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

  // --- NEMESIS LOGIC: Rangliste berechnen ---
  // Wir erstellen ein Array aller Spieler mit Scores, sortieren es und finden dann den Nachbarn
  const getAllPlayerScores = () => {
      return playerIds.map(id => ({
          id,
          name: data ? (data[`p${id}_name`] || `PLAYER ${id}`) : `P${id}`,
          score: calculateScore(id)
      })).sort((a, b) => b.score - a.score); // Absteigend sortiert
  };

  const sortedPlayers = data ? getAllPlayerScores() : [];
  const leaderId = sortedPlayers.length > 0 ? sortedPlayers[0].id : -1;

  if (loading || !data) return <div className="h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse font-mono text-2xl">LADEN...</div>;

  let teamTotal = 0;
  playerIds.forEach(i => { teamTotal += calculateScore(i); });
  const bossProgress = Math.min((teamTotal / bossTarget) * 100, 100);
  const leaderName = sortedPlayers.length > 0 ? sortedPlayers[0].name : "NIEMAND";
  const tickerText = `+++ 🚀 MARKET LIVE: TEAM TOTAL: ${Math.floor(teamTotal)}€ +++ 👑 LEADER: ${leaderName} +++ 🎯 TAGESZIEL: ${bossTarget}€ +++ ⚔️ NEMESIS MODE ACTIVE: FIND YOUR RIVAL +++ `;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 font-sans overflow-x-hidden pb-24">
      
      {godModeData && <GodModeOverlay winnerName={godModeData.name} value={godModeData.val} />}
      <NewsTicker text={tickerText} />

      <div className="max-w-[1800px] mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 sticky top-0 bg-slate-950/95 backdrop-blur z-40 py-4 border-b border-white/10 shadow-2xl px-4">
            <div className="flex justify-between items-end mb-3">
                 <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-black italic tracking-tighter text-white">
                        SALES<span className="text-yellow-500">DUELL</span>
                    </h1>
                 </div>
                 <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tagesziel:</span>
                    <div className="flex items-center">
                        <input type="number" value={bossTarget} onChange={(e) => setBossTarget(Number(e.target.value))} className="bg-transparent text-right font-black text-xl w-24 text-yellow-500 focus:outline-none border-b border-transparent focus:border-yellow-500" />
                        <span className="text-yellow-500 font-bold ml-1">€</span>
                    </div>
                 </div>
            </div>

            <div className="h-10 w-full bg-slate-800 rounded-md overflow-hidden relative shadow-inner border border-slate-700">
                <div className="absolute inset-0 bg-red-900/10"></div>
                <div className={`h-full transition-all duration-700 ease-out relative flex items-center justify-end px-4 ${bossProgress >= 100 ? 'bg-gradient-to-r from-emerald-600 to-green-400' : 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400'}`} style={{ width: `${bossProgress}%` }}>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_15px_white]"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                    <span className="text-xs font-black tracking-[0.2em] text-white mix-blend-overlay uppercase">
                        {bossProgress >= 100 ? '✅ ZIEL ERREICHT' : 'MISSION PROGRESS'}
                    </span>
                    <span className="font-mono font-bold text-white text-lg drop-shadow-md">{Math.floor(teamTotal)}€ / {bossTarget}€</span>
                </div>
            </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
          {playerIds.map((i) => {
            const name = data[`p${i}_name`];
            const emoji = data[`p${i}_emoji`] || '👤';
            const status = data[`p${i}_status`] || '';
            const terminWert = data[`p${i}_val`] || 0;
            const streak = data[`p${i}_streak`] || 0;
            const meetings = data[`p${i}_meetings`] || 0;
            const calls = data[`p${i}_calls`] || 0;
            const deciders = data[`p${i}_deciders`] || 0;
            const goal = data[`p${i}_goal`] || 1;
            
            const umsatz = calculateScore(i);
            const realValuePerCall = calls > 0 ? (meetings * terminWert) / calls : 0;
            const deciderQuote = calls > 0 ? (deciders / calls) * 100 : 0;
            const terminQuote = deciders > 0 ? (meetings / deciders) * 100 : 0;

            // --- NEMESIS BERECHNUNG ---
            const myRankIndex = sortedPlayers.findIndex(p => p.id === i);
            let nemesisText = "";
            let nemesisClass = "text-slate-500";
            
            if (myRankIndex === 0) {
                // Leader
                const gap = sortedPlayers.length > 1 ? (umsatz - sortedPlayers[1].score) : 0;
                nemesisText = `🛡️ VERTEIDIGT FÜHRUNG (+${Math.floor(gap)}€)`;
                nemesisClass = "text-green-400 bg-green-900/30 border border-green-500/30";
            } else if (myRankIndex > 0) {
                // Jäger
                const rival = sortedPlayers[myRankIndex - 1];
                const gap = rival.score - umsatz;
                nemesisText = `🎯 JAGT: ${rival.name} (-${Math.floor(gap)}€)`;
                nemesisClass = "text-red-400 bg-red-900/30 border border-red-500/30 animate-pulse";
            }


            // Oracle Logic
            const avgCallsNeeded = meetings > 0 ? Math.ceil(calls / meetings) : 50;
            const callsSinceLastHit = streak;
            const callsLeftPrediction = avgCallsNeeded - callsSinceLastHit;
            const progressToNextHit = Math.min((callsSinceLastHit / avgCallsNeeded) * 100, 100);
            
            let oracleText = "CALCULATING...";
            let oracleColor = "text-slate-500";
            let barColor = "bg-slate-700";

            if (meetings === 0) {
                oracleText = `🏗️ GRIND MODE: ~${callsLeftPrediction} LEFT`;
                oracleColor = "text-slate-400";
                barColor = "bg-slate-600";
            } else if (callsLeftPrediction <= 0) {
                oracleText = "🚨 OVERDUE! ANY SECOND NOW...";
                oracleColor = "text-red-500 animate-pulse";
                barColor = "bg-red-500";
            } else if (callsLeftPrediction <= 5) {
                oracleText = `🔫 LOCK IN! ~${callsLeftPrediction} CALLS LEFT`;
                oracleColor = "text-yellow-400";
                barColor = "bg-yellow-500";
            } else {
                oracleText = `🔨 BUILDING... ~${callsLeftPrediction} TO HIT`;
                oracleColor = "text-blue-400";
                barColor = "bg-blue-500";
            }

            // Styles
            let cardClasses = 'bg-slate-900 border border-slate-800';
            let shadowClasses = '';
            
            if (streak > 15 && streak <= 30) {
                cardClasses = 'bg-slate-900 border-none ring-4 ring-orange-500';
                shadowClasses = 'shadow-[0_0_30px_rgba(249,115,22,0.4)]';
            } else if (streak > 30) {
                cardClasses = 'bg-slate-900 border-none ring-4 ring-red-600 animate-pulse'; 
                shadowClasses = 'shadow-[0_0_50px_rgba(220,38,38,0.7)]';
            }

            const isFrozen = calls === 0;
            const isLeader = leaderId === i;

            return (
              <div key={i} className={`relative rounded-2xl flex flex-col transition-all duration-300 overflow-hidden min-h-[500px] ${isLeader ? 'bg-slate-900 ring-4 ring-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.3)] z-10 scale-[1.03]' : cardClasses} ${shadowClasses} ${isFrozen ? 'opacity-50 grayscale contrast-125' : 'opacity-100'} `}>
                
                {isFrozen && !isLeader && (<div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center"><div className="bg-slate-950/90 border border-slate-700 px-6 py-2 rounded-lg text-sm text-slate-300 font-bold uppercase tracking-widest backdrop-blur-md shadow-2xl">💤 SCHLÄFT</div></div>)}
                {isLeader && (<div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-4 py-2 rounded-bl-xl shadow-lg text-sm z-30 uppercase tracking-wider">👑 MVP</div>)}

                {/* HEADER BEREICH */}
                <div className="mt-6 mb-2 px-4 text-center">
                  
                  {/* NEMESIS BADGE (NEU) */}
                  <div className={`mb-4 inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${nemesisClass}`}>
                      {nemesisText}
                  </div>

                  {/* EMOJI & NAME */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                     <button onClick={() => cycleEmoji(i)} className="text-5xl hover:scale-125 transition-transform">{emoji}</button>
                     <input type="text" value={name} onChange={(e) => handleSettingChange(i, "name", e.target.value)} className={`bg-transparent text-3xl font-black uppercase border-b-2 border-transparent focus:border-white/20 focus:outline-none w-full text-left ${isLeader ? 'text-yellow-400' : 'text-slate-100'}`} placeholder={`PLAYER ${i}`} />
                  </div>

                  {/* TRASH TALK STATUS */}
                  <input type="text" value={status} onChange={(e) => handleSettingChange(i, "status", e.target.value)} className="w-full bg-slate-950/50 text-slate-400 text-sm text-center border-none rounded py-1 px-2 focus:ring-1 focus:ring-yellow-500 mb-3 italic" placeholder='"Status..."' />
                  
                  {/* ORACLE MOTIVATION BAR */}
                  <div className="mb-4 bg-slate-950 p-2 rounded border border-white/5">
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-1 text-left ${oracleColor}`}>{oracleText}</div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${progressToNextHit}%` }}></div>
                      </div>
                  </div>

                  {/* SETTINGS */}
                  <div className="flex justify-center gap-6 mt-2 text-xs font-bold text-slate-400 bg-slate-800/50 py-2 rounded-lg mx-1">
                       <div className="flex flex-col items-center"><span className="text-[9px] uppercase tracking-wider mb-1">€ / Termin</span><input type="number" value={terminWert} onChange={(e) => handleSettingChange(i, "val", Number(e.target.value))} className="bg-transparent w-20 text-center border-b border-white/20 focus:border-yellow-500 outline-none text-white text-lg"/></div>
                       <div className="flex flex-col items-center"><span className="text-[9px] uppercase tracking-wider mb-1">Call Ziel</span><input type="number" value={goal} onChange={(e) => handleSettingChange(i, "goal", Number(e.target.value))} className="bg-transparent w-16 text-center text-white border-b border-white/20 focus:border-yellow-500 outline-none text-lg"/></div>
                  </div>
                </div>

                {/* UMSATZ */}
                <div className="flex-grow flex flex-col items-center justify-center py-4 relative">
                  <div className={`text-7xl lg:text-8xl font-black tracking-tighter leading-none transition-all ${isLeader ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110' : 'text-slate-500'}`}>
                    {Math.floor(umsatz)}<span className="text-3xl text-slate-700 font-medium ml-1">€</span>
                  </div>
                </div>

                {/* KPI GRID */}
                <div className="grid grid-cols-3 gap-px bg-slate-800 border-y border-white/10 text-center mb-6">
                    <div className="py-4 px-1"><div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Real/Call</div><div className={`text-base font-bold font-mono ${realValuePerCall > (goal > 0 ? terminWert/goal : 0) ? 'text-green-400' : 'text-slate-300'}`}>{realValuePerCall.toFixed(2)}€</div></div>
                    <div className="py-4 px-1 border-l border-white/10"><div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">D-Quote</div><div className="text-base font-bold font-mono text-purple-300">{deciderQuote.toFixed(0)}%</div></div>
                    <div className="py-4 px-1 border-l border-white/10"><div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">T-Quote</div><div className={`text-base font-bold font-mono ${terminQuote > 10 ? 'text-emerald-400' : 'text-slate-400'}`}>{terminQuote.toFixed(1)}%</div></div>
                </div>

                {/* BUTTONS */}
                <div className="grid grid-cols-4 gap-3 p-4 mt-auto mb-2">
                    <button onClick={() => handleAnwahl(i)} className="col-span-1 bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-white font-bold py-5 rounded-lg transition-all flex flex-col items-center justify-center group border border-white/5 active:scale-95"><span className="text-2xl mb-1 group-hover:scale-110 transition-transform">❌</span><span className="text-xs font-mono">{calls}</span></button>
                    <button onClick={() => handleEntscheider(i)} className="col-span-1 bg-slate-800 hover:bg-purple-900/20 text-purple-400 hover:text-purple-300 font-bold py-5 rounded-lg transition-all flex flex-col items-center justify-center group border border-white/5 active:scale-95"><span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🗣️</span><span className="text-xs font-mono">{deciders}</span></button>
                    <button onClick={() => handleTermin(i)} className="col-span-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black italic tracking-wider py-5 rounded-lg shadow-lg active:scale-95 transition-all text-xl z-10 border border-emerald-500/30 group relative overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div><span className="relative z-10">TERMIN</span><span className="block text-[10px] font-normal not-italic opacity-80 text-emerald-100 font-mono mt-0.5 relative z-10">{meetings} BKD</span></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* RESET */}
        <div className="mt-20 border-t-2 border-red-900/30 pt-10 text-center"><h3 className="text-red-900 font-black uppercase tracking-widest text-xs mb-4">Danger Zone</h3><button onClick={handleReset} className="group relative bg-transparent text-red-600 border-2 border-red-900/50 px-8 py-4 rounded-full uppercase tracking-[0.2em] text-xs font-bold overflow-hidden hover:text-white hover:border-red-600 transition-colors"><div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div><span className="relative z-10">💀 SEASON RESET</span></button></div>
      </div>
    </main>
  );
}
