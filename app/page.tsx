"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SOUND ENGINE ---
const playSound = (type: 'call' | 'decider' | 'meeting' | 'undo' | 'milestone' | 'victory') => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  if (type === 'meeting') {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        const start = ctx.currentTime + (i * 0.15);
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.start(start); osc.stop(start + 0.5);
    });
  } else if (type === 'victory') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start(); osc.stop(ctx.currentTime + 1);
  } else if (type === 'milestone') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } else {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'call') {
       osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
       gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    } else if (type === 'decider') {
       osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
       gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    } else if (type === 'undo') {
       osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(50, now + 0.1);
       gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    }
    osc.start(now); osc.stop(now + 0.15);
  }
};

// --- COMPONENTS ---
const GodModeOverlay = ({ winnerName, value, type = 'single' }: { winnerName: string, value: number, type?: 'single'|'team' }) => (
  <div className="fixed inset-0 z-[9000] bg-black/95 flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-300">
    <div className="relative z-10 text-center space-y-6 px-4">
      <div className={`text-3xl font-black tracking-[0.5em] uppercase animate-pulse ${type === 'team' ? 'text-red-500' : 'text-yellow-500'}`}>
          {type === 'team' ? 'MISSION ACCOMPLISHED' : 'TERMIN SECURED'}
      </div>
      <h1 className={`text-6xl md:text-9xl font-black text-transparent bg-clip-text drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] ${type === 'team' ? 'bg-gradient-to-b from-red-500 to-red-900' : 'bg-gradient-to-b from-yellow-300 to-yellow-800'}`}>
        {winnerName}
      </h1>
      <div className="text-5xl text-white font-mono font-bold mt-8">
          {type === 'team' ? 'THE WOLF IS DEAD' : `+${value}€ PIPELINE`}
      </div>
    </div>
    <MoneyRain amount={type === 'team' ? 400 : 150} />
  </div>
);

const NewsTicker = ({ text }: { text: string }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black py-1 md:py-2 z-50 overflow-hidden whitespace-nowrap border-t-2 md:border-t-4 border-black">
    <div className="inline-block animate-marquee text-xs md:text-lg font-black uppercase tracking-widest">
      {text}
    </div>
    <style jsx>{` .animate-marquee { animation: marquee 30s linear infinite; } @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } } `}</style>
  </div>
);

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

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px) rotate(-5deg); } 75% { transform: translateX(5px) rotate(5deg); } }
    .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite; }
    @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
    @keyframes pulse-fast { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .animate-pulse-fast { animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .shadow-gold { filter: drop-shadow(0 0 10px rgba(234,179,8,0.5)); }
    .shadow-fire { filter: drop-shadow(0 0 15px rgba(239,68,68,0.8)); }
  `}</style>
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // GodMode erweitert um 'type' für Boss Kill
  const [godModeData, setGodModeData] = useState<{name: string, val: number, type?: 'single'|'team'} | null>(null);
  const [milestoneData, setMilestoneData] = useState<{id: number, text: string} | null>(null);
  
  const [bossTarget, setBossTarget] = useState(10000);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [legendsData, setLegendsData] = useState<Record<string, {calls: number, meetings: number, sales: number}>>({});

  const [timeLeft, setTimeLeft] = useState<string>("READY");
  const [isUrgent, setIsUrgent] = useState(false);
  const [customDuration, setCustomDuration] = useState<number>(60);
  const [isPaused, setIsPaused] = useState(false);

  const playerIds = Array.from({ length: 6 }, (_, i) => i + 1);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      if (initialData) {
          setData(initialData);
          playerIds.forEach(i => { if (initialData[`p${i}_name`]) fetchLegend(initialData[`p${i}_name`]); });
      }
      setLoading(false);

      const channel = supabase.channel('duell-v25-final')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, (payload) => {
            setData(payload.new);
            playerIds.forEach(i => { if (payload.new[`p${i}_name`] !== payload.old[`p${i}_name`]) fetchLegend(payload.new[`p${i}_name`]); });
        })
        .on('broadcast', { event: 'god_mode_trigger' }, (payload) => {
            setGodModeData(payload.payload);
            playSound(payload.payload.type === 'team' ? 'victory' : 'meeting');
        })
        .subscribe();
      
      setRealtimeChannel(channel);
      return () => { supabase.removeChannel(channel); };
    };
    loadAndSubscribe();
  }, []);

  // Timer
  useEffect(() => {
      const interval = setInterval(() => {
          if (!data?.timer_end) { setTimeLeft("READY"); setIsUrgent(false); setIsPaused(false); return; }
          if (data.timer_paused_at) {
              setIsPaused(true);
              const end = new Date(data.timer_end).getTime();
              const pausedAt = new Date(data.timer_paused_at).getTime();
              const remaining = end - pausedAt;
              const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((remaining % (1000 * 60)) / 1000);
              setTimeLeft(`PAUSE (${m}:${s < 10 ? '0' : ''}${s})`);
              return;
          }
          setIsPaused(false);
          const now = new Date().getTime();
          const distance = new Date(data.timer_end).getTime() - now;
          if (distance < 0) { setTimeLeft("TIME UP"); setIsUrgent(true); } 
          else {
              const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((distance % (1000 * 60)) / 1000);
              const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              setTimeLeft(`${h > 0 ? h + ':' : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
              setIsUrgent(distance < 300000);
          }
      }, 500);
      return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    if (godModeData) { const timer = setTimeout(() => setGodModeData(null), 5000); return () => clearTimeout(timer); }
  }, [godModeData]);

  useEffect(() => {
    if (milestoneData) { const timer = setTimeout(() => setMilestoneData(null), 3000); return () => clearTimeout(timer); }
  }, [milestoneData]);

  // DB Helpers
  const updateDB = async (updates: any) => {
    setData((prev: any) => ({ ...prev, ...updates }));
    if (data?.id) await supabase.from('duell').update(updates).eq('id', data.id);
  };

  const handleSettingChange = (playerIdx: number, field: string, value: any) => {
    updateDB({ [`p${playerIdx}_${field}`]: value });
    if (field === 'name') fetchLegend(value);
  };

  const fetchLegend = async (name: string) => {
      if (!name) return;
      const { data: legend } = await supabase.from('legends').select('*').eq('name', name.trim().toUpperCase()).single();
      setLegendsData(prev => ({ ...prev, [name.trim().toUpperCase()]: { sales: legend?.total_sales || 0, meetings: legend?.battles_won || 0, calls: 0 } }));
  };

  const updateLegendScore = async (name: string, sales: number, meeting: boolean) => {
      if (!name) return;
      const clean = name.trim().toUpperCase();
      await supabase.from('legends').upsert({ 
          name: clean, 
          total_sales: (legendsData[clean]?.sales || 0) + sales,
          battles_won: (legendsData[clean]?.meetings || 0) + (meeting ? 1 : 0),
          last_active: new Date().toISOString()
      });
  };

  const handleAction = async (i: number, type: 'calls' | 'deciders' | 'meetings', delta: number) => {
      if (!data) return;
      const isUndo = delta < 0;
      if (isUndo && (data[`p${i}_${type}`] || 0) <= 0) return;

      // MILESTONE CHECK (Local) - Calls & Streaks
      const currentCalls = data[`p${i}_calls`] || 0;
      const currentStreak = data[`p${i}_streak`] || 0;
      
      if (!isUndo) {
          let msg = "";
          // Call Milestones
          if (type === 'calls') {
              const next = currentCalls + 1;
              if ([25, 50, 75, 100].includes(next)) msg = `${next} CALLS! 🔥`;
          }
          // Streak Milestones (auch durch Calls/Deciders ausgelöst)
          if (type !== 'meetings') {
              const nextStreak = currentStreak + 1;
              if ([10, 20, 30, 40].includes(nextStreak)) msg = `${nextStreak}er STREAK! 🔥`;
          }

          if (msg) {
              setMilestoneData({ id: i, text: msg });
              playSound('milestone');
          } else {
              playSound(isUndo ? 'undo' : (type === 'meetings' ? 'meeting' : 'decider'));
          }
      } else {
          playSound('undo');
      }

      const updates: any = {};
      updates[`p${i}_${type}`] = (data[`p${i}_${type}`] || 0) + delta;

      // SIDE EFFECTS
      if (type === 'deciders') {
          updates[`p${i}_calls`] = (data[`p${i}_calls`] || 0) + delta;
          if (!isUndo) updates[`p${i}_streak`] = (data[`p${i}_streak`] || 0) + 1;
      }
      else if (type === 'meetings') {
          updates[`p${i}_deciders`] = (data[`p${i}_deciders`] || 0) + delta;
          updates[`p${i}_calls`] = (data[`p${i}_calls`] || 0) + delta;
          if (!isUndo) {
              updates[`p${i}_streak`] = 0;
              const val = data[`p${i}_val`] || 0;
              const name = data[`p${i}_name`] || `Player ${i}`;
              
              // CHECK TEAM VICTORY (BOSS KILL)
              let currentTotal = 0;
              playerIds.forEach(pid => {
                  // Addiere aktuellen Score + neuen Wert für aktuellen Spieler
                  const pVal = data[`p${pid}_val`] || 0;
                  const pMeetings = data[`p${pid}_meetings`] || 0;
                  // Scoring Logic Replika (vereinfacht für Summe)
                  currentTotal += (pMeetings * pVal);
              });
              currentTotal += val; // Addiere den neuen Termin dazu

              if (currentTotal >= bossTarget) {
                  // TEAM VICTORY
                  setGodModeData({ name: "TEAM", val: 0, type: 'team' });
                  if (realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'god_mode_trigger', payload: { name: "TEAM", val: 0, type: 'team' } });
              } else {
                  // NORMAL GOD MODE
                  setGodModeData({ name, val, type: 'single' });
                  if (realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'god_mode_trigger', payload: { name, val, type: 'single' } });
              }
              
              updateLegendScore(name, val, true);
          }
      }
      else if (type === 'calls') {
          if (!isUndo) updates[`p${i}_streak`] = (data[`p${i}_streak`] || 0) + 1;
      }

      setData((prev: any) => ({ ...prev, ...updates }));
      await supabase.rpc('atomic_action', { p_idx: i, action_type: type, delta: delta });
      if (!isUndo) {
          await supabase.from('events').insert({ player_id: i, player_name: data[`p${i}_name`], event_type: type, created_at: new Date().toISOString() });
      }
  };

  const calculateScore = (i: number) => {
      if (!data) return 0;
      const val = data[`p${i}_val`] || 0;
      const meetings = data[`p${i}_meetings`] || 0;
      const streak = data[`p${i}_streak`] || 0;
      const goal = data[`p${i}_goal`] || 1;
      let vorschuss = streak * (val/goal);
      if (vorschuss >= val) vorschuss = val - 1;
      return (meetings * val) + vorschuss;
  };

  const getProbabilityStats = (i: number) => {
      if (!data) return { text: "CALC...", color: "text-slate-500", percent: 0, barColor: "bg-slate-700" };
      const calls = data[`p${i}_calls`] || 0;
      const streak = data[`p${i}_streak`] || 0;
      const meetings = data[`p${i}_meetings`] || 0;
      let avg = 40; 
      if (meetings >= 3) avg = Math.ceil(calls / meetings);
      else if (meetings > 0) avg = Math.round((Math.ceil(calls / meetings) + 40) / 2);
      
      let prob = (streak / avg) * 100;
      if (prob > 99) prob = 99;
      
      let text = `CHANCE: ${Math.floor(prob)}%`;
      let color = "text-slate-400";
      let barColor = "bg-blue-600";
      let isHot = false;
      if (prob > 80) { text = "🔥 HOT"; color = "text-red-500 animate-pulse"; barColor = "bg-red-600"; isHot = true; }
      else if (prob > 50) { text = "🏗️ WARM"; color = "text-orange-400"; barColor = "bg-orange-500"; }
      return { text, color, percent: prob, barColor, isHot };
  };

  const getLevelInfo = (totalSales: number) => {
      const lvl = Math.floor(totalSales / 10000) + 1;
      let style = "text-slate-500";
      let icon = "";
      if (lvl >= 7) { style = "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-black shadow-gold"; icon = "💎"; }
      else if (lvl >= 4) { style = "text-yellow-400 font-bold"; icon = "⭐"; }
      return { lvl, style, icon };
  };

  const getStreakVisuals = (streak: number) => {
      if (streak > 40) return "shadow-fire animate-shake";
      if (streak > 20) return "shadow-gold";
      return "";
  };

  const startTimer = () => updateDB({ timer_end: new Date(new Date().getTime() + customDuration * 60000).toISOString(), timer_paused_at: null });
  const pauseTimer = () => updateDB({ timer_paused_at: new Date().toISOString() });
  const resumeTimer = () => { if (!data?.timer_end || !data?.timer_paused_at) return; const end = new Date(data.timer_end).getTime(); const pausedAt = new Date(data.timer_paused_at).getTime(); const now = new Date().getTime(); updateDB({ timer_end: new Date(now + (end - pausedAt)).toISOString(), timer_paused_at: null }); };
  const stopTimer = () => updateDB({ timer_end: null, timer_paused_at: null });
  
  const handleReset = async () => {
      if (confirm("⚠️ ALLES RESETTEN?")) {
          const reset: any = { timer_end: null, timer_paused_at: null };
          playerIds.forEach(i => { reset[`p${i}_calls`] = 0; reset[`p${i}_deciders`] = 0; reset[`p${i}_meetings`] = 0; reset[`p${i}_streak`] = 0; });
          await updateDB(reset);
      }
  };

  const copyReport = () => {
      let report = `🏆 *SALES DUELL REPORT* 🏆\n\n`;
      let total = 0;
      sortedPlayers.forEach((p, index) => {
          let medal = index === 0 ? "🥇 👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : p.meetings === 0 ? "💩" : "➖";
          report += `${medal} *${p.name}*: ${Math.floor(p.score)}€ (${p.meetings} T)\n`;
          total += p.score;
      });
      report += `\n🔥 *TOTAL: ${Math.floor(teamTotal)}€*\n🎯 *ZIEL: ${bossTarget}€*`;
      navigator.clipboard.writeText(report);
      alert("✅ Report kopiert!");
  };

  if (loading || !data) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">LOADING...</div>;

  let teamTotal = 0;
  playerIds.forEach(i => { teamTotal += calculateScore(i); });
  const bossProgress = Math.min((teamTotal / bossTarget) * 100, 100);
  const isBossDead = bossProgress >= 100;
  const isBossSweating = bossProgress >= 50 && !isBossDead;
  
  const sortedPlayers = data ? playerIds.map(id => ({ id, name: data[`p${id}_name`] || `PLAYER ${id}`, score: calculateScore(id), meetings: data[`p${id}_meetings`] || 0, emoji: data[`p${id}_emoji`] || '👤' })).sort((a, b) => b.score - a.score) : [];
  const leaderId = sortedPlayers.length > 0 ? sortedPlayers[0].id : -1;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 font-sans select-none overflow-x-hidden">
      <GlobalStyles />
      {godModeData && <GodModeOverlay winnerName={godModeData.name} value={godModeData.val} type={godModeData.type} />}
      <NewsTicker text={`+++ 🚀 MARKET LIVE: TEAM TOTAL: ${Math.floor(teamTotal)}€ +++ 👑 LEADER: ${sortedPlayers[0]?.name || 'NIEMAND'} +++ 🎯 ZIEL: ${bossTarget}€ +++ `} />

      <div className="max-w-[1900px] mx-auto">
        {/* HEADER */}
        <div className="flex gap-6 mb-6 h-48">
            <div className="w-1/4 flex flex-col justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
                <div><h1 className="text-2xl font-black italic text-white mb-2">SALES<span className="text-yellow-500">DUELL</span></h1><div className="text-[10px] text-slate-500 mb-4">HOVER FÜR UNDO (-)</div></div>
                <div className="flex gap-2 items-center">
                    <input type="number" value={customDuration} onChange={e => setCustomDuration(Number(e.target.value))} className="w-12 bg-black text-center rounded py-1 text-sm border border-slate-700"/>
                    <span className="text-[10px] font-bold text-slate-500">MIN</span>
                    {!data?.timer_end && <button onClick={startTimer} className="bg-emerald-600 px-3 py-1 rounded text-xs font-bold hover:bg-emerald-500">START</button>}
                    {data?.timer_end && !isPaused && <button onClick={pauseTimer} className="bg-yellow-600 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-500">PAUSE</button>}
                    {isPaused && <button onClick={resumeTimer} className="bg-emerald-600 px-3 py-1 rounded text-xs font-bold hover:bg-emerald-500 animate-pulse">WEITER</button>}
                    <button onClick={stopTimer} className="bg-red-900 px-3 py-1 rounded text-xs font-bold hover:bg-red-800">STOP</button>
                </div>
            </div>
            <div className={`flex-1 relative rounded-xl border-2 overflow-hidden flex items-center justify-center transition-all ${isBossDead ? 'bg-black border-red-600' : 'bg-slate-900 border-slate-700'}`}>
                <div className={`absolute inset-0 opacity-20 ${isBossDead ? 'bg-red-600 animate-pulse' : isBossSweating ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
                <div className="relative z-10 text-center">
                    <div className={`text-6xl mb-2 filter drop-shadow-lg ${isBossSweating ? 'animate-shake' : ''}`}>{isBossDead ? '💥💀💥' : isBossSweating ? '🐺💦' : '🐺👔'}</div>
                    <div className="text-3xl font-black uppercase italic">{isBossDead ? "DESTROYED" : "THE WOLF"}</div>
                    <div className="w-64 h-3 bg-slate-950 rounded-full mt-2 overflow-hidden mx-auto border border-slate-600"><div className={`h-full transition-all duration-500 ${isBossSweating ? 'bg-orange-500' : 'bg-blue-500'}`} style={{width: `${bossProgress}%`}}></div></div>
                    <div className="text-xs font-mono text-slate-400 mt-1">{Math.floor(teamTotal)}€ / {bossTarget}€</div>
                </div>
            </div>
            <div className={`w-1/4 flex items-center justify-center rounded-xl border-2 ${isUrgent ? 'bg-red-950 border-red-500 animate-pulse' : 'bg-slate-900 border-slate-700'}`}>
                <div className="text-center"><div className="text-xs font-black uppercase text-slate-500 tracking-[0.3em] mb-1">SESSION TIMER</div><div className={`text-6xl font-mono font-black ${isUrgent ? 'text-red-500' : 'text-white'}`}>{timeLeft}</div></div>
            </div>
        </div>

        {/* PLAYER GRID */}
        <div className="grid grid-cols-3 gap-6">
            {playerIds.map(i => {
                const name = data[`p${i}_name`] || '';
                const prophet = getProbabilityStats(i);
                const score = calculateScore(i);
                
                const cleanName = name.trim().toUpperCase();
                const lifetimeSales = legendsData[cleanName]?.sales || 0;
                const { lvl, style: lvlStyle, icon: lvlIcon } = getLevelInfo(lifetimeSales);
                
                const streak = data[`p${i}_streak`] || 0;
                const streakVisual = getStreakVisuals(streak);
                
                const isSlacking = data?.timer_end && !isPaused && (data[`p${i}_calls`] || 0) === 0;
                
                // LAST PLACE LOGIC
                const myRankIndex = sortedPlayers.findIndex(p => p.id === i);
                const isLastPlace = myRankIndex === sortedPlayers.length - 1 && (data[`p${i}_calls`] || 0) > 0;

                return (
                    <div key={i} className={`relative bg-slate-900 border rounded-2xl p-4 flex flex-col min-h-[350px] transition-all ${prophet.isHot ? 'border-red-500 ring-2 ring-red-500/50' : isLastPlace ? 'border-red-900/50 shadow-[inset_0_0_20px_rgba(127,29,29,0.5)]' : lvl >= 7 ? 'border-blue-500/50' : 'border-slate-800'}`}>
                        
                        {milestoneData?.id === i && (
                            <div className="absolute -top-4 left-0 right-0 flex justify-center z-50"><div className="bg-blue-600 text-white font-black px-4 py-1 rounded-full text-xs animate-bounce shadow-lg border border-blue-400">{milestoneData.text}</div></div>
                        )}

                        {isSlacking && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-40 animate-in fade-in"><div className="text-4xl mb-2">💤</div><div className="text-slate-400 font-black uppercase tracking-widest text-sm">NOCH NICHT GESTARTET</div></div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { const icons = ['🦁','🐺','🦍','🚀','💀']; updateDB({[`p${i}_emoji`]: icons[Math.floor(Math.random()*icons.length)]}) }} className={`text-4xl hover:scale-110 transition-transform cursor-pointer ${streakVisual}`}>{data[`p${i}_emoji`]}</button>
                                <div>
                                    <input type="text" value={name} onChange={e => handleSettingChange(i, 'name', e.target.value)} onBlur={e => fetchLegend(e.target.value)} className={`bg-transparent text-2xl font-black uppercase w-32 focus:outline-none placeholder-slate-700 ${lvl >= 4 ? 'text-yellow-400' : 'text-white'}`} placeholder={`PLAYER ${i}`}/>
                                    {legendsData[cleanName] && <div className={`text-[10px] font-bold tracking-widest ${lvlStyle}`}>{lvlIcon} LVL {lvl}</div>}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black text-white">{Math.floor(score)}€</div>
                                <div className={`text-[10px] font-bold ${prophet.color}`}>{prophet.text}</div>
                            </div>
                        </div>

                        <input type="text" value={data[`p${i}_status`]} onChange={e => handleSettingChange(i, 'status', e.target.value)} className="w-full bg-black/20 text-center text-xs text-slate-400 italic mb-4 border-none focus:ring-0" placeholder='"Spruch des Tages..."'/>

                        <div className="grid grid-cols-4 gap-2 flex-grow">
                            <div className="relative group col-span-1">
                                <button onClick={() => handleAction(i, 'calls', 1)} className="w-full h-full bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl flex flex-col items-center justify-center border border-white/5 transition-all">
                                    <div className="text-2xl mb-1">❌</div><div className="text-xs font-mono text-slate-500">{data[`p${i}_calls`]}</div>
                                </button>
                                <button onClick={() => handleAction(i, 'calls', -1)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center justify-center border border-white/20 active:scale-90">-</button>
                            </div>
                            <div className="relative group col-span-1">
                                <button onClick={() => handleAction(i, 'deciders', 1)} className="w-full h-full bg-slate-800 hover:bg-purple-900/30 active:scale-95 rounded-xl flex flex-col items-center justify-center border border-white/5 transition-all">
                                    <div className="text-2xl mb-1">🗣️</div><div className="text-xs font-mono text-purple-400">{data[`p${i}_deciders`]}</div>
                                </button>
                                <button onClick={() => handleAction(i, 'deciders', -1)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center justify-center border border-white/20 active:scale-90">-</button>
                            </div>
                            <div className="relative group col-span-2">
                                <button onClick={() => handleAction(i, 'meetings', 1)} className="w-full h-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:to-emerald-400 active:scale-95 rounded-xl flex flex-col items-center justify-center shadow-lg transition-all relative overflow-hidden">
                                    <div className="text-4xl mb-1 animate-bounce-slow">💰</div><div className="text-base font-black text-white uppercase tracking-widest">TERMIN</div><div className="text-[10px] text-emerald-100 font-mono mt-1 opacity-80">{data[`p${i}_meetings`]} BKD</div>
                                </button>
                                <button onClick={() => handleAction(i, 'meetings', -1)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center justify-center border border-white/20 active:scale-90 z-20">-</button>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-center gap-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                            <div className="flex flex-col items-center"><span className="text-[9px] uppercase font-bold text-slate-600">Wert</span><input type="number" value={data[`p${i}_val`]} onChange={e => handleSettingChange(i, 'val', Number(e.target.value))} className="w-12 bg-black text-center text-xs border border-slate-800 rounded"/></div>
                            <div className="flex flex-col items-center"><span className="text-[9px] uppercase font-bold text-slate-600">Ziel</span><input type="number" value={data[`p${i}_goal`]} onChange={e => handleSettingChange(i, 'goal', Number(e.target.value))} className="w-10 bg-black text-center text-xs border border-slate-800 rounded"/></div>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="mt-12 text-center flex justify-center gap-4">
            <button onClick={copyReport} className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-full text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-500 transition-all">📋 Report kopieren</button>
            <button onClick={handleReset} className="text-[10px] font-bold text-red-900 hover:text-red-500 uppercase tracking-widest border border-red-900/30 px-4 py-2 rounded hover:bg-red-950 transition-colors">⚠️ System Reset</button>
        </div>
      </div>
    </main>
  );
}
