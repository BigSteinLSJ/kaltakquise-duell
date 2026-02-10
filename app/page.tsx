"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 1. LOOTBOX KOMPONENTE 🎁 ---
const LootboxModal = ({ onOpen, onClose }: any) => {
  const [stage, setStage] = useState('closed'); // closed, shaking, opening, revealed
  const [reward, setReward] = useState('');

  // Die Wahrscheinlichkeiten (Gacha Logik)
  const rewards = [
    { icon: '🐭', name: 'Maus', chance: 30 },
    { icon: '🦊', name: 'Fuchs', chance: 25 },
    { icon: '🐺', name: 'Wolf', chance: 20 },
    { icon: '🦁', name: 'Löwe', chance: 15 },
    { icon: '🦖', name: 'T-REX', chance: 8 },
    { icon: '🐲', name: 'DRAGON', chance: 2 },
  ];

  const openBox = () => {
    setStage('shaking');
    setTimeout(() => {
        setStage('opening');
        const rand = Math.random() * 100;
        let sum = 0;
        let selected = rewards[0];
        for (let r of rewards) {
            sum += r.chance;
            if (rand <= sum) { selected = r; break; }
        }
        setReward(selected.icon);
        setTimeout(() => {
            setStage('revealed');
            onOpen(selected.icon);
        }, 500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center backdrop-blur-sm">
      <div className="text-center">
        {stage !== 'revealed' ? (
            <div 
                onClick={stage === 'closed' ? openBox : undefined}
                className={`text-9xl cursor-pointer transition-all ${stage === 'shaking' ? 'animate-bounce' : 'hover:scale-110'}`}
            >
                🎁
            </div>
        ) : (
            <div className="animate-bounceIn">
                <div className="text-9xl mb-4 animate-pulse">{reward}</div>
                <h2 className="text-3xl font-black text-yellow-500 uppercase tracking-widest">NEW BADGE!</h2>
            </div>
        )}
        <div className="mt-8 text-white font-mono">
            {stage === 'closed' && "CLICK TO OPEN LOOTBOX"}
            {stage === 'shaking' && "UNLOCKING..."}
            {stage === 'revealed' && <button onClick={onClose} className="bg-white text-black px-6 py-2 font-bold rounded mt-4 hover:bg-yellow-400">CLAIM</button>}
        </div>
      </div>
    </div>
  );
};

// --- 2. GOD MODE WALKOUT OVERLAY ⚡️ ---
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

// --- 3. MONEY RAIN EFFEKT 💸 ---
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
  const [activeLootboxPlayer, setActiveLootboxPlayer] = useState<number | null>(null);

  const playerIds = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      if (initialData) setData(initialData);
      setLoading(false);

      const channel = supabase.channel('duell-v4')
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

  const saveBadge = (icon: string) => {
    if (activeLootboxPlayer) {
        updateDB({ [`p${activeLootboxPlayer}_badge`]: icon });
        setActiveLootboxPlayer(null);
    }
  };

  const handleReset = async () => {
    if (confirm("Kompletten Reset (inkl. Badges)?")) {
      const resetObj: any = {};
      playerIds.forEach(i => {
        resetObj[`p${i}_calls`] = 0;
        resetObj[`p${i}_deciders`] = 0;
        resetObj[`p${i}_streak`] = 0;
        resetObj[`p${i}_meetings`] = 0;
        resetObj[`p${i}_badge`] = '🥚'; 
      });
      await updateDB(resetObj);
    }
  };

  const getLeaderId = () => {
    if (!data) return -1;
    let maxUmsatz = -1;
    let leaderId = -1;
    playerIds.forEach(i => {
        const val = data[`p${i}_val`] || 0;
        const streak = data[`p${i}_streak`] || 0;
        const meetings = data[`p${i}_meetings`] || 0;
        const goal = data[`p${i}_goal`] || 1;
        const wpa = goal > 0 ? val / goal : 0;
        let vorschuss = streak * wpa;
        if (vorschuss >= val) vorschuss = val - 1;
        const umsatz = (meetings * val) + vorschuss;
        if (umsatz > maxUmsatz && umsatz > 0) { maxUmsatz = umsatz; leaderId = i; }
    });
    return leaderId;
  };

  if (loading || !data) return <div className="h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse font-mono">LOADING SALES ENGINE...</div>;

  const currentLeaderId = getLeaderId();

  // BOSS FIGHT LOGIK
  let teamTotal = 0;
  playerIds.forEach(i => {
      const val = data[`p${i}_val`] || 0;
      const meetings = data[`p${i}_meetings`] || 0;
      teamTotal += (meetings * val);
  });
  
  const BOSS_HP_PER_LEVEL = 20000;
  const currentLevel = Math.floor(teamTotal / BOSS_HP_PER_LEVEL) + 1;
  const currentBossHP = BOSS_HP_PER_LEVEL;
  const currentDamage = teamTotal % BOSS_HP_PER_LEVEL;
  const bossProgress = (currentDamage / currentBossHP) * 100;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-2 font-sans overflow-x-hidden pb-10">
      
      {godModeData && <GodModeOverlay winnerName={godModeData.name} value={godModeData.val} />}
      {activeLootboxPlayer && <LootboxModal onOpen={saveBadge} onClose={() => setActiveLootboxPlayer(null)} />}

      <div className="max-w-[1900px] mx-auto">
        
        {/* BOSS BAR (Oben) */}
        <div className="mb-6 sticky top-0 bg-slate-950/95 backdrop-blur z-40 py-2 border-b border-white/10">
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
            <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden relative shadow-inner border border-slate-700 mx-2 mb-2">
                <div className="absolute inset-0 bg-red-900/20"></div>
                <div 
                    className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-1000 ease-out relative"
                    style={{ width: `${bossProgress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_white]"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-widest text-white mix-blend-overlay">
                    BOSS HEALTH
                </div>
            </div>
        </div>

        {/* PLAYER GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
          {playerIds.map((i) => {
            const name = data[`p${i}_name`];
            const terminWert = data[`p${i}_val`] || 0;
            const streak = data[`p${i}_streak`] || 0;
            const meetings = data[`p${i}_meetings`] || 0;
            const calls = data[`p${i}_calls`] || 0;
            const badge = data[`p${i}_badge`] || '🥚';
            const goal = data[`p${i}_goal`] || 1;
            
            // Score
            const wpa = goal > 0 ? terminWert / goal : 0;
            let vorschuss = streak * wpa;
            if (vorschuss >= terminWert) vorschuss = terminWert - 1;
            const umsatz = (meetings * terminWert) + vorschuss;

            // Lootbox verfügbar? (Alle 25 Calls)
            const lootboxAvailable = calls > 0 && calls % 25 === 0;

            // --- PRESSURE (Orange/Rot) ---
            let borderColor = 'border-slate-800';
            let shadowColor = '';
            let pressureText = '';
            
            if (streak > 15 && streak <= 30) {
                borderColor = 'border-orange-500';
                shadowColor = 'shadow-[0_0_20px_rgba(249,115,22,0.3)]';
                pressureText = '🔥 HEATING UP';
            } else if (streak > 30) {
                borderColor = 'border-red-600';
                shadowColor = 'shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse';
                pressureText = '🚨 CRITICAL';
            }

            // --- ICE BUCKET (Einfrieren) ❄️ ---
            // Wer 0 Anrufe hat, gilt als "kalt/inaktiv" und wird eingefroren (blass + grayscale)
            // Sobald 1 Anruf getätigt wurde, taut er auf.
            const isFrozen = calls === 0;

            const isLeader = currentLeaderId === i;

            return (
              <div key={i} className={`
                relative rounded-xl p-3 flex flex-col transition-all duration-300
                bg-slate-900 border-2
                ${isLeader ? 'border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)] z-10 scale-[1.02]' : borderColor}
                ${shadowColor}
                ${isFrozen ? 'opacity-50 grayscale contrast-125' : 'opacity-100'} 
              `}>
                
                {/* FROST OVERLAY (Wenn gefroren) */}
                {isFrozen && !isLeader && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden rounded-xl border border-blue-300/30 shadow-[inset_0_0_20px_rgba(147,197,253,0.3)]">
                        <div className="bg-blue-900/80 px-2 py-1 rounded text-[10px] text-blue-200 font-bold uppercase tracking-widest backdrop-blur-md">
                            ❄️ FROZEN
                        </div>
                    </div>
                )}

                {/* BADGE (Oben Rechts) */}
                <div className="absolute top-2 right-2 text-2xl filter drop-shadow-lg z-30" title="Dein Rang">
                    {badge}
                </div>

                {isLeader && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-3 py-0.5 rounded shadow text-xs z-30">
                        👑 MVP
                    </div>
                )}
                
                {pressureText && !isLeader && !isFrozen && (
                    <div className="absolute top-0 inset-x-0 bg-orange-500 text-black text-[9px] font-black text-center uppercase z-20">{pressureText}</div>
                )}

                {/* HEADER */}
                <div className="mt-4 mb-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleSettingChange(i, "name", e.target.value)}
                    className={`w-full bg-transparent text-lg font-black text-center uppercase border-none focus:ring-0 outline-none ${isLeader ? 'text-yellow-400' : 'text-slate-200'}`}
                    placeholder={`PLAYER ${i}`}
                  />
                  <div className="flex justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity text-[9px]">
                       <input type="number" value={terminWert} onChange={(e) => handleSettingChange(i, "val", Number(e.target.value))} className="bg-transparent w-8 text-center text-white"/>
                       <input type="number" value={goal} onChange={(e) => handleSettingChange(i, "goal", Number(e.target.value))} className="bg-transparent w-6 text-center text-white"/>
                  </div>
                </div>

                {/* BIG NUMBER */}
                <div className="flex-grow flex flex-col items-center justify-center my-1 relative">
                  <div className={`text-4xl lg:text-5xl font-black tracking-tighter ${isLeader ? 'text-white' : 'text-slate-400'}`}>
                    {Math.floor(umsatz)}<span className="text-sm text-slate-600">€</span>
                  </div>
                  {/* XP / PROGRESS ZUR LOOTBOX */}
                  <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${(calls % 25) * 4}%` }}></div>
                  </div>
                  <div className="text-[8px] text-purple-400 mt-0.5 font-mono">{25 - (calls % 25)} calls to Lootbox</div>
                </div>

                {/* LOOTBOX BUTTON (Erscheint nur wenn verfügbar) */}
                {lootboxAvailable && (
                    <button 
                        onClick={() => setActiveLootboxPlayer(i)}
                        className="mb-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-2 rounded animate-bounce text-xs uppercase tracking-widest border border-white/20 shadow-lg hover:scale-105 transition-transform z-30 relative"
                    >
                        🎁 OPEN BOX!
                    </button>
                )}

                {/* CONTROLS */}
                <div className="grid grid-cols-4 gap-1 mt-auto">
                    <button onClick={() => handleAnwahl(i)} className="col-span-1 bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white font-bold py-3 rounded text-xs transition-colors">
                        ❌
                    </button>
                    <button onClick={() => handleEntscheider(i)} className="col-span-1 bg-slate-800 text-purple-400 hover:bg-purple-900/50 font-bold py-3 rounded text-xs transition-colors">
                        🗣️
                    </button>
                    <button onClick={() => handleTermin(i)} className="col-span-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black italic tracking-wider py-3 rounded shadow-lg active:scale-95 transition-all text-sm z-10">
                        TERMIN
                    </button>
                </div>

              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 opacity-30 hover:opacity-100 transition-opacity">
            <button onClick={handleReset} className="text-[10px] text-red-500 border border-red-900 px-3 py-1 rounded uppercase tracking-widest">
                Factory Reset
            </button>
        </div>

      </div>
    </main>
  );
}
