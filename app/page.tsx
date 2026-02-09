"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import confetti from 'canvas-confetti'; // WIR NUTZEN JETZT KONFETTI

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 10 Spieler IDs
  const playerIds = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      if (initialData) setData(initialData);
      setLoading(false);

      const channel = supabase.channel('duell-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, (payload) => {
            // Wenn sich Meetings ändern (jemand hat Termin gemacht), checken wir wer es war für Konfetti
            const newData = payload.new;
            const oldData = data; // Zugriff auf alten State ist hier tricky, wir machen Konfetti einfach immer beim Update wenn meeting > 0
            
            // Einfacherer Weg: Wir triggern Konfetti einfach lokal beim Klick, 
            // und bei den anderen Spielern passiert es (noch) nicht, 
            // um "Sound-Spam" zu vermeiden. Erstmal nur für den, der drückt.
            setData(newData);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    loadAndSubscribe();
  }, []);

  const updateDB = async (updates: any) => {
    setData((prev: any) => ({ ...prev, ...updates }));
    if (data?.id) {
        await supabase.from('duell').update(updates).eq('id', data.id);
    }
  };

  const handleSettingChange = (playerIdx: number, field: string, value: any) => {
    updateDB({ [`p${playerIdx}_${field}`]: value });
  };

  const handleAnwahl = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_streak`]: (data[`p${playerIdx}_streak`] || 0) + 1
    });
  };

  const handleEntscheider = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_deciders`]: (data[`p${playerIdx}_deciders`] || 0) + 1,
      [`p${playerIdx}_streak`]: (data[`p${playerIdx}_streak`] || 0) + 1
    });
  };

  // MIT KONFETTI 🎊
  const handleTermin = (playerIdx: number) => {
    if (!data) return;
    
    // 1. Konfetti abfeuern!
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#34d399', '#facc15', '#a855f7'] // Grün, Gold, Lila
    });

    // 2. Datenbank Update
    updateDB({
      [`p${playerIdx}_meetings`]: (data[`p${playerIdx}_meetings`] || 0) + 1,
      [`p${playerIdx}_deciders`]: (data[`p${playerIdx}_deciders`] || 0) + 1,
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_streak`]: 0 
    });
  };

  const handleReset = async () => {
    if (confirm("Wirklich ALLES für alle 10 Spieler zurücksetzen?")) {
      const resetObj: any = {};
      playerIds.forEach(i => {
        resetObj[`p${i}_calls`] = 0;
        resetObj[`p${i}_deciders`] = 0;
        resetObj[`p${i}_streak`] = 0;
        resetObj[`p${i}_meetings`] = 0;
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

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500 animate-pulse">Lade Arena...</div>;
  if (!data) return <div className="h-screen bg-slate-950 flex items-center justify-center text-red-500">Keine Daten.</div>;

  const currentLeaderId = getLeaderId();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 font-sans selection:bg-yellow-500/30">
      <div className="max-w-[1800px] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 px-2">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tracking-tighter">
              KALTAKQUISE DUELL
            </h1>
            <p className="text-slate-400 text-sm">Top 10 Leaderboard 👑</p>
          </div>
          <button onClick={handleReset} className="text-xs text-slate-600 hover:text-red-400 border border-slate-800 hover:border-red-900 px-3 py-1 rounded">
            Reset All
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {playerIds.map((i) => {
            const name = data[`p${i}_name`];
            const terminWert = data[`p${i}_val`] || 0;
            const zielQuote = data[`p${i}_goal`] || 1;
            const callsTotal = data[`p${i}_calls`] || 0;
            const deciders = data[`p${i}_deciders`] || 0;
            const streak = data[`p${i}_streak`] || 0;
            const termine = data[`p${i}_meetings`] || 0;

            const wertProAnwahlZiel = zielQuote > 0 ? terminWert / zielQuote : 0;
            const realerWertProAnwahl = callsTotal > 0 && termine > 0 ? (termine * terminWert) / callsTotal : 0;
            let vorschuss = streak * wertProAnwahlZiel;
            if (vorschuss >= terminWert) vorschuss = terminWert - 1;
            const aktuellerUmsatz = (termine * terminWert) + vorschuss;
            const isProfitable = realerWertProAnwahl >= wertProAnwahlZiel;
            const durchstellQuote = callsTotal > 0 ? Math.round((deciders / callsTotal) * 100) : 0;
            const isLeader = currentLeaderId === i;

            return (
              <div key={i} className={`
                relative rounded-2xl p-3 flex flex-col group transition-all duration-500
                ${isLeader 
                    ? 'bg-slate-900 border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] z-10' 
                    : 'bg-slate-900 border border-slate-800 shadow-xl hover:border-slate-700'
                }
              `}>
                {isLeader && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-3 py-0.5 rounded-full shadow-lg text-xs animate-pulse">👑 #1</div>
                )}

                <div className="mb-2 bg-black/20 p-2 rounded-lg border border-white/5 space-y-1 mt-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleSettingChange(i, "name", e.target.value)}
                    className={`w-full bg-transparent text-lg font-bold text-center border-b outline-none pb-1 ${isLeader ? 'text-yellow-400 border-yellow-500/50' : 'text-white border-white/10 focus:border-purple-500'}`}
                    placeholder={`Spieler ${i}`}
                  />
                  <div className="flex gap-1 text-[10px]">
                     <div className="flex-1">
                       <label className="text-slate-500 block">Wert (Deal/Fee)</label>
                       <input type="number" value={terminWert} onChange={(e) => handleSettingChange(i, "val", Number(e.target.value))} className="bg-slate-800 text-white w-full rounded px-1 text-center font-bold"/>
                     </div>
                     <div className="flex-1">
                       <label className="text-slate-500 block">Ziel (Calls)</label>
                       <input type="number" value={zielQuote} onChange={(e) => handleSettingChange(i, "goal", Number(e.target.value))} className="bg-slate-800 text-purple-400 w-full rounded px-1 text-center font-bold"/>
                     </div>
                  </div>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center mb-4">
                  <div className={`text-4xl font-black tabular-nums tracking-tight ${isLeader ? 'text-yellow-400' : 'text-white'}`}>
                    {Math.floor(aktuellerUmsatz)}<span className="text-sm font-normal text-slate-600">€</span>
                  </div>
                  <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded border mt-1 ${isProfitable && termine > 0 ? 'text-green-400 border-green-900 bg-green-900/20' : 'text-slate-500 border-slate-800'}`}>
                    Real: {realerWertProAnwahl.toFixed(2)}€ / Call
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-auto">
                    <button onClick={() => handleAnwahl(i)} className="col-span-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-2 rounded-lg border border-slate-700 active:scale-95 transition-all">
                        📞 <span className="text-[10px] block font-normal">Niete</span>
                    </button>
                    <button onClick={() => handleEntscheider(i)} className="col-span-1 bg-purple-900/40 hover:bg-purple-800 text-purple-300 font-bold py-2 rounded-lg border border-purple-700/50 active:scale-95 transition-all relative overflow-hidden">
                        🗣️ <span className="text-[10px] block font-normal">Entsch.</span>
                        {callsTotal > 0 && <div className="absolute top-0.5 right-0.5 text-[8px] bg-purple-950 px-1 rounded opacity-70">{durchstellQuote}%</div>}
                    </button>
                    <button onClick={() => handleTermin(i)} className="col-span-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-3 rounded-lg shadow-lg active:scale-95 transition-all">
                        💰 TERMIN!
                    </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-0.5 text-[9px] text-slate-500 uppercase text-center bg-black/20 rounded-md p-1">
                    <div><div className="text-slate-400 font-bold">{callsTotal}</div><div>Calls</div></div>
                    <div><div className="text-purple-400 font-bold">{deciders}</div><div>Ents.</div></div>
                    <div><div className="text-emerald-400 font-bold">{termine}</div><div>Fix</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
