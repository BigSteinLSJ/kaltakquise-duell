"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      if (initialData) setData(initialData);
      setLoading(false);

      const channel = supabase.channel('duell-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, (payload) => {
            setData(payload.new);
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

  // Anwahl: Nur Anwahl hochzählen (Niemand erreicht / Vorzimmer)
  const handleAnwahl = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_streak`]: (data[`p${playerIdx}_streak`] || 0) + 1
    });
  };

  // Entscheider: Zählt als Anwahl UND als Entscheider-Gespräch
  const handleEntscheider = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_deciders`]: (data[`p${playerIdx}_deciders`] || 0) + 1,
      [`p${playerIdx}_streak`]: (data[`p${playerIdx}_streak`] || 0) + 1
    });
  };

  // Termin: Termin +1, aber STREAK auf 0
  const handleTermin = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_meetings`]: (data[`p${playerIdx}_meetings`] || 0) + 1,
      [`p${playerIdx}_deciders`]: (data[`p${playerIdx}_deciders`] || 0) + 1, // Termin ist meist auch ein Entscheider
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_streak`]: 0 
    });
  };

  const handleReset = async () => {
    if (confirm("Alles auf 0 setzen?")) {
      const resetObj: any = {};
      [1, 2, 3, 4].forEach(i => {
        resetObj[`p${i}_calls`] = 0;
        resetObj[`p${i}_deciders`] = 0;
        resetObj[`p${i}_streak`] = 0;
        resetObj[`p${i}_meetings`] = 0;
      });
      await updateDB(resetObj);
    }
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500 animate-pulse">Lade Arena...</div>;
  if (!data) return <div className="h-screen bg-slate-950 flex items-center justify-center text-red-500">Keine Daten. SQL Update gemacht?</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-screen-2xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 tracking-tighter">
              KALTAKQUISE DUELL
            </h1>
            <p className="text-slate-400 text-sm">V2.0 • Live Sync</p>
          </div>
          <button onClick={handleReset} className="text-xs text-slate-600 hover:text-red-400 border border-slate-800 hover:border-red-900 px-3 py-1 rounded">
            Reset All
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => {
            const name = data[`p${i}_name`];
            const terminWert = data[`p${i}_val`] || 0;
            const zielQuote = data[`p${i}_goal`] || 1;
            const callsTotal = data[`p${i}_calls`] || 0;
            const deciders = data[`p${i}_deciders`] || 0;
            const streak = data[`p${i}_streak`] || 0;
            const termine = data[`p${i}_meetings`] || 0;

            // Logik
            const wertProAnwahlZiel = zielQuote > 0 ? terminWert / zielQuote : 0;
            const realerWertProAnwahl = callsTotal > 0 && termine > 0 ? (termine * terminWert) / callsTotal : 0;

            let vorschuss = streak * wertProAnwahlZiel;
            if (vorschuss >= terminWert) vorschuss = terminWert - 1;

            const aktuellerUmsatz = (termine * terminWert) + vorschuss;
            const isProfitable = realerWertProAnwahl >= wertProAnwahlZiel;

            return (
              <div key={i} className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-2xl flex flex-col relative group">
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isProfitable && termine > 0 ? 'from-green-500 to-emerald-400' : 'from-purple-500 to-blue-500'}`}></div>

                {/* Header Input */}
                <div className="mb-4 bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleSettingChange(i, "name", e.target.value)}
                    className="w-full bg-transparent text-xl font-bold text-center border-b border-white/10 focus:border-purple-500 outline-none pb-1 text-white"
                    placeholder={`Spieler ${i}`}
                  />
                  <div className="flex gap-2 text-xs">
                     <div className="flex-1">
                       <label className="text-slate-500 block">Wert €</label>
                       <input type="number" value={terminWert} onChange={(e) => handleSettingChange(i, "val", Number(e.target.value))} className="bg-slate-800 text-white w-full rounded px-2 py-1 text-center font-bold"/>
                     </div>
                     <div className="flex-1">
                       <label className="text-slate-500 block">Wette</label>
                       <input type="number" value={zielQuote} onChange={(e) => handleSettingChange(i, "goal", Number(e.target.value))} className="bg-slate-800 text-purple-400 w-full rounded px-2 py-1 text-center font-bold"/>
                     </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex-grow flex flex-col items-center justify-center mb-6">
                  <div className="text-slate-500 text-[10px] uppercase tracking-[0.2em] mb-1">Umsatz</div>
                  <div className="text-5xl font-black text-white tabular-nums tracking-tight drop-shadow-2xl">
                    {Math.floor(aktuellerUmsatz)} <span className="text-lg text-slate-600 font-normal">€</span>
                  </div>
                  <div className={`mt-2 text-xs font-mono px-2 py-0.5 rounded border ${isProfitable && termine > 0 ? 'text-green-400 border-green-900 bg-green-900/20' : 'text-slate-500 border-slate-800'}`}>
                    Real: {realerWertProAnwahl.toFixed(2)}€ / Call
                  </div>
                </div>

                {/* Buttons Grid */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                    {/* Anwahl Button */}
                    <button onClick={() => handleAnwahl(i)} className="col-span-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 active:scale-95 transition-all">
                        📞 <span className="text-sm block font-normal">Niete</span>
                    </button>
                    
                    {/* Entscheider Button */}
                    <button onClick={() => handleEntscheider(i)} className="col-span-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 font-bold py-3 rounded-xl border border-purple-700/50 active:scale-95 transition-all">
                        🗣️ <span className="text-sm block font-normal">Entscheider</span>
                    </button>

                    {/* Termin Button (Full Width) */}
                    <button onClick={() => handleTermin(i)} className="col-span-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all mt-1">
                        💰 TERMIN!
                    </button>
                </div>

                {/* Stats Footer */}
                <div className="mt-4 grid grid-cols-3 gap-1 text-[10px] text-slate-500 uppercase text-center bg-black/20 rounded-lg p-2">
                    <div>
                        <div className="text-slate-400 font-bold text-sm">{callsTotal}</div>
                        <div>Anwahlen</div>
                    </div>
                    <div>
                        <div className="text-purple-400 font-bold text-sm">{deciders}</div>
                        <div>Entsch.</div>
                    </div>
                    <div>
                        <div className="text-emerald-400 font-bold text-sm">{termine}</div>
                        <div>Termine</div>
                    </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
