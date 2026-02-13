"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// --- SOUND ENGINE ---
const playSound = (type: 'call' | 'decider' | 'meeting' | 'undo') => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext(); const now = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);

  if (type === 'meeting') {
    [523.25, 659.25, 783.99].forEach((freq, i) => { 
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + i*0.15);
        g.gain.linearRampToValueAtTime(0.3, now + i*0.15 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + i*0.15 + 0.5);
        o.start(now + i*0.15); o.stop(now + i*0.15 + 0.5);
    });
  } else {
    if (type === 'call') { osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.1); gain.gain.setValueAtTime(0.05, now); }
    else if (type === 'decider') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(600, now+0.1); gain.gain.setValueAtTime(0.05, now); }
    else { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.05, now); } 
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  }
};

const GodModeOverlay = ({ winnerName, value }: { winnerName: string, value: number }) => (
  <div className="fixed inset-0 z-[9000] bg-black/95 flex flex-col items-center justify-center overflow-hidden animate-pulse">
    <div className="text-yellow-500 text-3xl font-black tracking-[1em] uppercase mb-4">TERMIN SECURED</div>
    <h1 className="text-8xl md:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-800">{winnerName}</h1>
    <div className="text-6xl text-white font-mono font-bold mt-8">+{value}€ PIPELINE</div>
  </div>
);

const NewsTicker = ({ text }: { text: string }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black py-2 z-50 overflow-hidden whitespace-nowrap border-t-4 border-black">
    <div className="inline-block animate-marquee text-lg font-black uppercase tracking-widest">{text}</div>
    <style jsx>{` .animate-marquee { animation: marquee 30s linear infinite; } @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } } `}</style>
  </div>
);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [godModeData, setGodModeData] = useState<{name: string, val: number} | null>(null);
  const [bossTarget, setBossTarget] = useState(10000);
  const [timeLeft, setTimeLeft] = useState<string>("READY");
  const [isUrgent, setIsUrgent] = useState(false);
  const [customDuration, setCustomDuration] = useState<number>(60);
  const [isPaused, setIsPaused] = useState(false);
  const [endTimeDisplay, setEndTimeDisplay] = useState<string>("");
  const [channel, setChannel] = useState<any>(null); 

  const playerIds = Array.from({ length: 6 }, (_, i) => i + 1);
  const randomEmojis = ['🦁','🐺','🦍','🤡','🤖','👽','💀','🔥','🚀','🐌','👑','💸','🧠'];

  useEffect(() => {
    const init = async () => {
      const { data: d } = await supabase.from('duell').select('*').single();
      if (d) setData(d);
      setLoading(false);

      const ch = supabase.channel('duell-master')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, p => setData(p.new))
        .on('broadcast', { event: 'god_mode' }, p => { 
            setGodModeData(p.payload); 
            playSound('meeting'); 
        })
        .subscribe();
      setChannel(ch);

      return () => { supabase.removeChannel(ch); };
    }; 
    init();
  }, []);

  useEffect(() => {
      const interval = setInterval(() => {
          if (!data?.timer_end) { setTimeLeft("READY"); setIsUrgent(false); setIsPaused(false); setEndTimeDisplay(""); return; }
          if (data.timer_paused_at) {
              setIsPaused(true);
              const remaining = new Date(data.timer_end).getTime() - new Date(data.timer_paused_at).getTime();
              const m = Math.floor((remaining % 3600000) / 60000);
              const s = Math.floor((remaining % 60000) / 1000);
              setTimeLeft(`PAUSED (${m}:${s < 10 ? '0'+s : s})`);
              setEndTimeDisplay("PAUSIERT");
              return;
          }
          setIsPaused(false);
          const end = new Date(data.timer_end);
          const dist = end.getTime() - new Date().getTime();
          setEndTimeDisplay(`Endet: ${end.getHours()}:${end.getMinutes()<10?'0'+end.getMinutes():end.getMinutes()}`);
          if (dist < 0) { setTimeLeft("TIME UP"); setIsUrgent(true); } 
          else {
              const h = Math.floor(dist / 3600000);
              const m = Math.floor((dist % 3600000) / 60000);
              const s = Math.floor((dist % 60000) / 1000);
              setTimeLeft(`${h>0?h+':':''}${m<10?'0'+m:m}:${s<10?'0'+s:s}`);
              setIsUrgent(dist < 300000);
          }
      }, 500);
      return () => clearInterval(interval);
  }, [data]);

  useEffect(() => { if (godModeData) setTimeout(() => setGodModeData(null), 4500); }, [godModeData]);

  const updateDB = async (updates: any) => {
    setData((p:any) => ({ ...p, ...updates }));
    await supabase.from('duell').update(updates).eq('id', 1);
  };

  const handleSettingChange = (playerIdx: number, field: string, value: any) => {
    updateDB({ [`p${playerIdx}_${field}`]: value });
  };

  const cycleEmoji = (i: number) => {
      const current = data[`p${i}_emoji`] || '👤';
      const next = randomEmojis[(randomEmojis.indexOf(current) + 1) % randomEmojis.length];
      handleSettingChange(i, "emoji", next);
  }

  // --- DIE WICHTIGSTE FUNKTION: ACTION HANDLING + LOGGING ---
  const handleAction = async (i: number, type: 'calls' | 'deciders' | 'meetings', delta: number) => {
      if (!data) return;
      if (delta < 0 && (data[`p${i}_${type}`] || 0) <= 0) return;
      
      playSound(delta < 0 ? 'undo' : (type === 'meetings' ? 'meeting' : type === 'deciders' ? 'decider' : 'call'));
      
      const updates: any = {};
      updates[`p${i}_${type}`] = (data[`p${i}_${type}`] || 0) + delta;
      
      const eventsToLog = [];
      const playerName = data[`p${i}_name`] || `Player ${i}`;
      const terminWert = data[`p${i}_val`] || 0; // Hier holen wir den Umsatz-Wert

      if (type === 'meetings' && delta > 0) {
          updates[`p${i}_streak`] = 0;
          updates[`p${i}_deciders`] = (data[`p${i}_deciders`]||0) + 1;
          updates[`p${i}_calls`] = (data[`p${i}_calls`]||0) + 1;
          
          setGodModeData({ name: playerName, val: terminWert });
          channel?.send({ type: 'broadcast', event: 'god_mode', payload: { name: playerName, val: terminWert } });
          
          // LOG: Meeting MIT WERT, Rest ohne
          eventsToLog.push({ player_id: i, player_name: playerName, event_type: 'calls', event_value: 0 });
          eventsToLog.push({ player_id: i, player_name: playerName, event_type: 'deciders', event_value: 0 });
          eventsToLog.push({ player_id: i, player_name: playerName, event_type: 'meetings', event_value: terminWert });

      } else if (type === 'deciders') {
          updates[`p${i}_calls`] = (data[`p${i}_calls`]||0) + delta;
          if (delta > 0) {
              updates[`p${i}_streak`] = (data[`p${i}_streak`]||0) + 1;
              eventsToLog.push({ player_id: i, player_name: playerName, event_type: 'calls', event_value: 0 });
              eventsToLog.push({ player_id: i, player_name: playerName, event_type: 'deciders', event_value: 0 });
          }
      } else if (type === 'calls') {
          if (delta > 0) {
              updates[`p${i}_streak`] = (data[`p${i}_streak`]||0) + 1;
              eventsToLog.push({ player_id: i, player_name: playerName, event_type: 'calls', event_value: 0 });
          }
      }
      
      setData((p:any) => ({ ...p, ...updates }));
      await supabase.rpc('atomic_action', { p_idx: i, action_type: type, delta });
      
      if (eventsToLog.length > 0) await supabase.from('events').insert(eventsToLog);
  };

  const startTimer = () => updateDB({ timer_end: new Date(Date.now() + customDuration * 60000).toISOString(), timer_paused_at: null });
  const pauseTimer = () => updateDB({ timer_paused_at: new Date().toISOString() });
  const resumeTimer = () => data.timer_paused_at && updateDB({ timer_end: new Date(Date.now() + (new Date(data.timer_end).getTime() - new Date(data.timer_paused_at).getTime())).toISOString(), timer_paused_at: null });
  const stopTimer = () => updateDB({ timer_end: null, timer_paused_at: null });
  const handleReset = () => confirm("⚠️ ALLES LÖSCHEN?") && updateDB(playerIds.reduce((acc:any, i) => ({...acc, [`p${i}_calls`]:0, [`p${i}_deciders`]:0, [`p${i}_meetings`]:0, [`p${i}_streak`]:0, [`p${i}_status`]:''}), { timer_end: null, timer_paused_at: null }));

  const calculateScore = (i: number) => {
      const { [`p${i}_val`]: v=0, [`p${i}_streak`]: s=0, [`p${i}_meetings`]: m=0, [`p${i}_goal`]: g=1 } = data || {};
      let bonus = s * (g > 0 ? v/g : 0);
      return (m * v) + (bonus >= v ? v - 1 : bonus);
  };

  const sorted = data ? playerIds.map(id => ({ id, name: data[`p${id}_name`]||`PLAYER ${id}`, score: calculateScore(id), meetings: data[`p${id}_meetings`]||0, emoji: data[`p${id}_emoji`]||'👤' })).sort((a,b) => b.score - a.score) : [];
  const leaderId = sorted.length > 0 ? sorted[0].id : -1;
  const teamTotal = sorted.reduce((sum, p) => sum + p.score, 0);
  const bossProgress = Math.min((teamTotal / bossTarget) * 100, 100);

  if (loading || !data) return <div className="h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse font-mono text-2xl">LADEN...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 font-sans pb-24 overflow-x-hidden">
      {godModeData && <GodModeOverlay winnerName={godModeData.name} value={godModeData.val} />}
      <NewsTicker text={`+++ 🚀 MARKET LIVE: TEAM TOTAL: ${Math.floor(teamTotal)}€ +++ 👑 LEADER: ${sorted[0]?.name || '-'} +++ 🎯 ZIEL: ${bossTarget}€ +++`} />

      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 sticky top-0 bg-slate-950/95 backdrop-blur z-40 py-4 border-b border-white/10 shadow-2xl px-4 flex flex-col gap-4">
            <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black italic tracking-tighter text-white">SALES<span className="text-yellow-500">DUELL</span></h1>
                    <Link href="/stats"><button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">📊 Statistik & Ziele</button></Link>
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-white/10">
                        <input type="number" value={customDuration} onChange={(e) => setCustomDuration(Number(e.target.value))} className="w-12 bg-black text-white text-center font-bold rounded border border-slate-600 outline-none p-1 text-sm"/>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-2">MIN</span>
                        {!data.timer_end && <button onClick={startTimer} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">▶</button>}
                        {data.timer_end && !isPaused && <button onClick={pauseTimer} className="bg-yellow-600 text-white px-3 py-1 rounded text-xs font-bold">⏸</button>}
                        {isPaused && <button onClick={resumeTimer} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">▶</button>}
                        <button onClick={stopTimer} className="bg-red-900/50 text-red-200 px-3 py-1 rounded text-xs font-bold ml-2">⏹</button>
                    </div>
                 </div>
                 <div className={`flex flex-col items-center justify-center px-10 py-2 rounded-xl border-2 shadow-2xl ${isUrgent ? 'bg-red-950/80 border-red-500 animate-pulse' : 'bg-slate-900 border-slate-700'}`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{isPaused ? "PAUSIERT" : "TIMER"}</div>
                    <div className={`text-5xl font-mono font-black ${isUrgent ? 'text-red-500' : 'text-white'}`}>{timeLeft}</div>
                    {endTimeDisplay && !isPaused && <div className="text-[10px] text-slate-500 font-mono mt-1">{endTimeDisplay}</div>}
                 </div>
                 <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-white/10"><span className="text-slate-400 text-[10px] uppercase font-bold">Ziel:</span><input type="number" value={bossTarget} onChange={(e) => setBossTarget(Number(e.target.value))} className="bg-transparent text-right font-bold w-16 text-yellow-500 outline-none" /><span className="text-yellow-500 font-bold text-sm">€</span></div>
                 </div>
            </div>
            <div className="h-8 w-full bg-slate-800 rounded-md overflow-hidden relative shadow-inner">
                <div className={`h-full transition-all duration-700 ${bossProgress >= 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-red-600 to-yellow-400'}`} style={{ width: `${bossProgress}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none"><span className="text-xs font-black tracking-[0.2em] text-white mix-blend-overlay uppercase">{bossProgress >= 100 ? 'ZIEL ERREICHT' : 'PROGRESS'}</span><span className="font-mono font-bold text-white text-lg">{Math.floor(teamTotal)}€ / {bossTarget}€</span></div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
          {playerIds.map((i) => {
            const streak = data[`p${i}_streak`] || 0;
            const calls = data[`p${i}_calls`] || 0;
            const meetings = data[`p${i}_meetings`] || 0;
            const isFrozen = calls === 0;
            const isLeader = leaderId === i;
            const umsatz = calculateScore(i);
            const rpc = calls > 0 ? (meetings * (data[`p${i}_val`]||0)) / calls : 0;

            return (
              <div key={i} className={`relative rounded-2xl flex flex-col overflow-hidden min-h-[500px] transition-all ${isLeader ? 'bg-slate-900 ring-4 ring-yellow-400 scale-[1.02]' : streak > 15 ? 'bg-slate-900 ring-2 ring-orange-500' : 'bg-slate-900 border border-slate-800'} ${isFrozen ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                {isLeader && <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-4 py-2 rounded-bl-xl shadow-lg text-sm z-30">👑 MVP</div>}
                <div className="mt-6 mb-2 px-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                     <button onClick={() => cycleEmoji(i)} className="text-5xl hover:scale-125 transition-transform">{data[`p${i}_emoji`]||'👤'}</button>
                     <input type="text" value={data[`p${i}_name`]||''} onChange={(e) => handleSettingChange(i, 'name', e.target.value)} className={`bg-transparent text-3xl font-black uppercase border-b-2 border-transparent focus:border-white/20 outline-none w-full text-left ${isLeader ? 'text-yellow-400' : 'text-slate-100'}`} placeholder={`PLAYER ${i}`} />
                  </div>
                  <input type="text" value={data[`p${i}_status`]||''} onChange={(e) => handleSettingChange(i, 'status', e.target.value)} className="w-full bg-slate-950/50 text-slate-400 text-sm text-center border-none rounded py-1 px-2 mb-3 italic" placeholder='"Status..."' />
                  <div className="flex justify-center gap-6 mt-2 text-xs font-bold text-slate-400 bg-slate-800/50 py-2 rounded-lg mx-1">
                       <div className="flex flex-col items-center"><span>€ / Termin</span><input type="number" value={data[`p${i}_val`]||0} onChange={(e) => handleSettingChange(i, 'val', Number(e.target.value))} className="bg-transparent w-20 text-center border-b border-white/20 outline-none text-white text-lg"/></div>
                       <div className="flex flex-col items-center"><span>Ziel</span><input type="number" value={data[`p${i}_goal`]||1} onChange={(e) => handleSettingChange(i, 'goal', Number(e.target.value))} className="bg-transparent w-16 text-center text-white border-b border-white/20 outline-none text-lg"/></div>
                  </div>
                </div>
                <div className="flex-grow flex flex-col items-center justify-center py-4 relative">
                  <div className={`text-7xl lg:text-8xl font-black tracking-tighter leading-none ${isLeader ? 'text-white drop-shadow-lg' : 'text-slate-500'}`}>{Math.floor(umsatz)}<span className="text-3xl text-slate-700 ml-1">€</span></div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-slate-800 border-y border-white/10 text-center mb-6">
                    <div className="py-4 px-1"><div className="text-[10px] text-slate-500 font-bold">Real/Call</div><div className={`text-base font-bold font-mono ${rpc > 0 ? 'text-green-400' : 'text-slate-300'}`}>{rpc.toFixed(2)}€</div></div>
                    <div className="py-4 px-1 border-l border-white/10"><div className="text-[10px] text-slate-500 font-bold">D-Quote</div><div className="text-base font-bold font-mono text-purple-300">{calls>0?((data[`p${i}_deciders`]||0)/calls*100).toFixed(0):0}%</div></div>
                    <div className="py-4 px-1 border-l border-white/10"><div className="text-[10px] text-slate-500 font-bold">Streak</div><div className="text-base font-bold font-mono text-orange-400">{streak}</div></div>
                </div>
                <div className="grid grid-cols-4 gap-3 p-4 mt-auto mb-2">
                    <div className="col-span-1 relative group">
                        <button onClick={() => handleAction(i, 'calls', 1)} className="w-full h-full bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-white font-bold py-5 rounded-lg transition-all flex flex-col items-center justify-center border border-white/5 active:scale-95"><span className="text-2xl mb-1">❌</span><span className="text-xs font-mono">{calls}</span></button>
                        <button onClick={() => handleAction(i, 'calls', -1)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:scale-110">-</button>
                    </div>
                    <div className="col-span-1 relative group">
                        <button onClick={() => handleAction(i, 'deciders', 1)} className="w-full h-full bg-slate-800 hover:bg-purple-900/20 text-purple-400 hover:text-purple-300 font-bold py-5 rounded-lg transition-all flex flex-col items-center justify-center border border-white/5 active:scale-95"><span className="text-2xl mb-1">🗣️</span><span className="text-xs font-mono">{data[`p${i}_deciders`]||0}</span></button>
                        <button onClick={() => handleAction(i, 'deciders', -1)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:scale-110">-</button>
                    </div>
                    <div className="col-span-2 relative group">
                        <button onClick={() => handleAction(i, 'meetings', 1)} className="w-full h-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black italic tracking-wider py-5 rounded-lg shadow-lg active:scale-95 transition-all text-xl z-10 border border-emerald-500/30 overflow-hidden"><span className="relative z-10">TERMIN</span><span className="block text-[10px] font-normal not-italic opacity-80 text-emerald-100 font-mono mt-0.5 relative z-10">{meetings} BKD</span></button>
                        <button onClick={() => handleAction(i, 'meetings', -1)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:scale-110 z-20">-</button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-20 border-t-2 border-red-900/30 pt-10 text-center"><h3 className="text-red-900 font-black uppercase tracking-widest text-xs mb-4">Danger Zone</h3><button onClick={handleReset} className="bg-transparent text-red-600 border-2 border-red-900/50 px-8 py-4 rounded-full uppercase tracking-[0.2em] text-xs font-bold hover:text-white hover:border-red-600 transition-colors">💀 SEASON RESET</button></div>
      </div>
    </main>
  );
}
