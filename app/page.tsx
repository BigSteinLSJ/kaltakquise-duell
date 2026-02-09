"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KaltakquiseDuell() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      const { data: initialData } = await supabase.from('duell').select('*').single();
      setData(initialData);
      const channel = supabase.channel('duell-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duell' }, 
        (payload) => setData(payload.new))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    loadAndSubscribe();
  }, []);

  const updateStat = async (field: string, newValue: number) => {
    await supabase.from('duell').update({ [field]: newValue }).eq('id', 1);
  };

  if (!data) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white font-sans">Lade Arena...</div>;

  const resetGame = async () => {
    if (confirm("Alles auf Null setzen?")) {
      await supabase.from('duell').update({
        player_1_calls: 0, player_1_deciders: 0, player_1_meetings: 0,
        player_2_calls: 0, player_2_deciders: 0, player_2_meetings: 0
      }).eq('id', 1);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <h1 className="text-4xl md:text-6xl font-black text-center mb-10 text-yellow-400 italic tracking-tighter">COLD CALL DUEL</h1>
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <Board name="Spieler 1" color="border-blue-500" stats={data} id={1} onUpdate={updateStat} />
        <Board name="Spieler 2" color="border-red-500" stats={data} id={2} onUpdate={updateStat} />
      </div>
      <div className="flex justify-center mt-12">
        <button onClick={resetGame} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-red-600 hover:text-white transition-all">RESET</button>
      </div>
    </main>
  );
}

function Board({ name, color, stats, id, onUpdate }: any) {
  const categories = [
    { label: '📞 Anwahlen', max: 50, field: `player_${id}_calls`, color: id === 1 ? 'bg-blue-500' : 'bg-red-500' },
    { label: '👤 Entscheider', max: 30, field: `player_${id}_deciders` , color: 'bg-purple-600' },
    { label: '🎯 Termine', max: 10, field: `player_${id}_meetings`, color: 'bg-yellow-500' }
  ];

  return (
    <div className={`bg-gray-800 border-t-8 ${color} p-6 rounded-2xl shadow-2xl`}>
      <h2 className="text-3xl font-black mb-6 italic uppercase">{name}</h2>
      {categories.map((cat) => (
        <div key={cat.field} className="mb-6">
          <p className="mb-2 font-bold uppercase text-xs text-gray-400 tracking-widest">{cat.label}: {stats[cat.field]}</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: cat.max }).map((_, i) => (
              <div 
                key={i}
                onClick={() => onUpdate(cat.field, i + 1 === stats[cat.field] ? i : i + 1)}
                className={`w-6 h-8 rounded-md cursor-pointer transition-all ${i < stats[cat.field] ? cat.color : 'bg-gray-700 hover:bg-gray-600'}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
