"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client initialisieren
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Daten laden und Live-Verbindung aufbauen
  useEffect(() => {
    const loadAndSubscribe = async () => {
      // Erster Abruf: Wir holen die Zeile, die wir im SQL erstellt haben
      const { data: initialData, error } = await supabase
        .from('duell')
        .select('*')
        .single(); 

      if (error) console.error("Fehler beim Laden:", error);
      if (initialData) setData(initialData);
      setLoading(false);

      // Live-Update abonnieren
      const channel = supabase.channel('duell-updates')
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'duell' }, 
          (payload) => {
            setData(payload.new); // Wenn sich was ändert, sofort State updaten
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    loadAndSubscribe();
  }, []);

  // Funktion zum Speichern in der Datenbank
  const updateDB = async (updates: any) => {
    // Optimistic Update (damit es sich sofort schnell anfühlt)
    setData((prev: any) => ({ ...prev, ...updates }));
    
    // An Supabase senden
    if (data?.id) {
        await supabase.from('duell').update(updates).eq('id', data.id);
    }
  };

  // --- ACTIONS ---

  // Namen oder Ziele ändern
  const handleSettingChange = (playerIdx: number, field: string, value: any) => {
    // Mapping für die Input-Felder auf die Datenbank-Spalten
    // field kann sein: "name", "val" (Wert), "goal" (Wette)
    updateDB({ [`p${playerIdx}_${field}`]: value });
  };

  // Anwahl: Total hochzählen + Streak hochzählen
  const handleAnwahl = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_streak`]: (data[`p${playerIdx}_streak`] || 0) + 1
    });
  };

  // Termin: Termin +1, Total +1, aber STREAK auf 0 (Reset für Auszahlung)
  const handleTermin = (playerIdx: number) => {
    if (!data) return;
    updateDB({
      [`p${playerIdx}_meetings`]: (data[`p${playerIdx}_meetings`] || 0) + 1,
      [`p${playerIdx}_calls`]: (data[`p${playerIdx}_calls`] || 0) + 1,
      [`p${playerIdx}_streak`]: 0 // RESET! Der Vorschuss wird eingelöst.
    });
  };

  const handleReset = async () => {
    if (confirm("Alles auf 0 setzen? Sicher?")) {
      const resetObj: any = {};
      [1, 2, 3, 4].forEach(i => {
        resetObj[`p${i}_calls`] = 0;
        resetObj[`p${i}_streak`] = 0;
        resetObj[`p${i}_meetings`] = 0;
      });
      await updateDB(resetObj);
    }
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500 font-mono animate-pulse">Lade Arena...</div>;
  if (!data) return <div className="h-screen bg-slate-950 flex items-center justify-center text-red-500 font-mono">Keine Daten gefunden. SQL ausgeführt?</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-screen-2xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tighter">
              KALTAKQUISE DUELL
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Live Connected via Supabase 🟢
            </p>
          </div>
          <button onClick={handleReset} className="text-xs text-slate-600 hover:text-red-400 border border-slate-800 hover:border-red-900 px-3 py-1 rounded transition-colors">
            Reset All
          </button>
        </header>

        {/* Grid für 4 Spieler */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => {
            // Daten mapping aus der flachen DB Struktur
            const name = data[`p${i}_name`];
            const terminWert = data[`p${i}_val`] || 0; // Geld pro Termin
            const zielQuote = data[`p${i}_goal`] || 1; // Wette (vermeide div by 0)
            const callsTotal = data[`p${i}_calls`] || 0;
            const streak = data[`p${i}_streak`] || 0;
            const termine = data[`p${i}_meetings`] || 0;

            // --- BERECHNUNGEN (Client Side Logic) ---
            
            // 1. Theoretischer Wert (Soll)
            const wertProAnwahlZiel = zielQuote > 0 ? terminWert / zielQuote : 0;
            
            // 2. Realer Wert (Ist)
            const realerWertProAnwahl = callsTotal > 0 && termine > 0
                ? (termine * terminWert) / callsTotal
                : 0;

            // Capping (Vorschuss Logik)
            let vorschuss = streak * wertProAnwahlZiel;
            if (vorschuss >= terminWert) {
                vorschuss = terminWert - 1; // Cap bei 499€
            }

            const aktuellerUmsatz = (termine * terminWert) + vorschuss;
            const isProfitable = realerWertProAnwahl >= wertProAnwahlZiel;

            return (
              <div
                key={i}
                className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-2xl flex flex-col relative overflow-hidden group"
              >
                {/* Status Leiste */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isProfitable && termine > 0 ? 'from-green-500 to-emerald-400' : 'from-slate-700 to-slate-600'}`}></div>

                {/* --- Input Bereich (Live editierbar) --- */}
                <div className="mb-4 bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleSettingChange(i, "name", e.target.value)}
                    className="w-full bg-transparent text-xl font-bold text-center border-b border-white/10 focus:border-emerald-500 outline-none pb-1 text-white placeholder-slate-600"
                    placeholder={`Spieler ${i}`}
                  />
                  
                  <div className="flex gap-2 text-xs">
                     <div className="flex-1">
                       <label className="text-slate-500 block">Wert € (Termin)</label>
                       <input 
                         type="number" 
                         value={terminWert}
                         onChange={(e) => handleSettingChange(i, "val", Number(e.target.value))}
                         className="bg-slate-800 text-white w-full rounded px-2 py-1 text-center font-bold"
                       />
                     </div>
                     <div className="flex-1">
                       <label className="text-slate-500 block">Wette (Calls)</label>
                       <input 
                         type="number" 
                         value={zielQuote}
                         onChange={(e) => handleSettingChange(i, "goal", Number(e.target.value))}
                         className="bg-slate-800 text-blue-400 w-full rounded px-2 py-1 text-center font-bold"
                       />
                     </div>
                  </div>
                </div>

                {/* --- KPI Vergleich --- */}
                <div className="grid grid-cols-2 gap-2 mb-6 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                        <div className="text-[10px] uppercase text-slate-500 tracking-wider">Plan / Call</div>
                        <div className="text-slate-300 font-mono">{wertProAnwahlZiel.toFixed(2)}€</div>
                    </div>
                    <div className={`bg-slate-800/50 rounded-lg p-2 border ${isProfitable && termine > 0 ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700/50'}`}>
                        <div className="text-[10px] uppercase text-slate-500 tracking-wider">Echt / Call</div>
                        <div className={`font-mono font-bold ${isProfitable && termine > 0 ? 'text-green-400' : 'text-orange-300'}`}>
                            {realerWertProAnwahl.toFixed(2)}€
                        </div>
                    </div>
                </div>

                {/* --- Scoreboard --- */}
                <div className="flex-grow flex flex-col items-center justify-center mb-6">
                  <div className="text-slate-500 text-[10px] uppercase tracking-[0.2em] mb-1">Umsatz</div>
                  <div className="text-5xl font-black text-white tabular-nums tracking-tight drop-shadow-2xl">
                    {Math.floor(aktuellerUmsatz)} <span className="text-lg text-slate-600 font-normal">€</span>
                  </div>
                </div>

                {/* --- Buttons --- */}
                <div className="space-y-3 mt-auto">
                  <button
                    onClick={() => handleAnwahl(i)}
                    className="w-full relative bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl transition-all active:scale-[0.98] border border-slate-700 flex justify-between px-6 items-center group-hover:border-slate-600"
                  >
                    <span>📞 Anwahl</span>
                    <span className="text-xs bg-black/40 px-2 py-1 rounded text-slate-400 font-mono">Streak: {streak}</span>
                  </button>

                  <button
                    onClick={() => handleTermin(i)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20 border-t border-emerald-400/20 flex justify-center gap-2"
                  >
                    <span>💰 TERMIN!</span>
                  </button>
                </div>

                {/* Footer Stats */}
                <div className="mt-4 flex justify-between text-[10px] text-slate-500 uppercase tracking-wider px-1">
                    <div>Termine: <span className="text-white font-bold">{termine}</span></div>
                    <div>Total Calls: <span className="text-white font-bold">{callsTotal}</span></div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
