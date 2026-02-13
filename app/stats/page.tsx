"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function StatsPage() {
  const [names, setNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState<string>("");
  const [goals, setGoals] = useState<any>({});
  const [stats, setStats] = useState<any>({ day: {}, week: {}, month: {}, year: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNames = async () => {
      const { data } = await supabase.from('events').select('player_name');
      if (data) {
        const uniqueNames = Array.from(new Set(data.map(d => d.player_name).filter(n => n && n.trim() !== '')));
        setNames(uniqueNames as string[]);
      }
    };
    fetchNames();
  }, []);

  useEffect(() => {
    if (!selectedName) return;
    loadPlayerData(selectedName);
  }, [selectedName]);

  const loadPlayerData = async (name: string) => {
    setLoading(true);
    const { data: goalData } = await supabase.from('player_goals').select('*').eq('name', name).single();
    if (goalData) setGoals(goalData);
    else setGoals({ goal_day_calls: 50, goal_week_meetings: 5, goal_month_revenue: 20000, goal_year_revenue: 240000 });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const { data: events } = await supabase.from('events').select('*').eq('player_name', name);

    if (events) {
        const calcStats = (startDate: string) => {
            const relevant = events.filter(e => e.created_at >= startDate);
            return {
                calls: relevant.filter(e => e.event_type === 'calls').length,
                meetings: relevant.filter(e => e.event_type === 'meetings').length,
            };
        };
        setStats({ day: calcStats(startOfDay), week: calcStats(startOfWeek.toISOString()), month: calcStats(startOfMonth), year: calcStats(startOfYear) });
    }
    setLoading(false);
  };

  const saveGoals = async () => {
      if(!selectedName) return;
      await supabase.from('player_goals').upsert({ name: selectedName, ...goals });
      alert("🎯 Ziele gespeichert!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black italic">CAREER<span className="text-blue-500">MODE</span></h1>
            <Link href="/"><button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm font-bold">⬅ Zurück zur Arena</button></Link>
        </div>

        <div className="mb-10">
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Spieler Profil wählen</label>
            <select className="w-full md:w-1/2 bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:border-blue-500 outline-none text-lg font-bold" onChange={(e) => setSelectedName(e.target.value)} value={selectedName}>
                <option value="">-- Wähle deinen Namen --</option>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
        </div>

        {selectedName && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4">📊 PERFORMANCE IST</h2>
                    <div className="mb-6"><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Heute (Calls)</span><span className="font-mono">{stats.day.calls} / {goals.goal_day_calls}</span></div><div className="h-3 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${Math.min((stats.day.calls / goals.goal_day_calls)*100, 100)}%`}}></div></div></div>
                    <div className="mb-6"><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Woche (Termine)</span><span className="font-mono text-emerald-400">{stats.week.meetings} / {goals.goal_week_meetings}</span></div><div className="h-3 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${Math.min((stats.week.meetings / goals.goal_week_meetings)*100, 100)}%`}}></div></div></div>
                    <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Jahr (Termine Total)</span><span className="font-mono text-yellow-400">{stats.year.meetings}</span></div><div className="text-xs text-slate-600 mt-1">Das entspricht ca. {stats.year.meetings * 200}€ Pipeline (bei 200€ Schnitt)</div></div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🎯</div>
                    <h2 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4">🛠 ZIELE SETZEN</h2>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tagesziel (Calls)</label><input type="number" value={goals.goal_day_calls || ''} onChange={e => setGoals({...goals, goal_day_calls: e.target.value})} className="w-full bg-black border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wochenziel (Termine)</label><input type="number" value={goals.goal_week_meetings || ''} onChange={e => setGoals({...goals, goal_week_meetings: e.target.value})} className="w-full bg-black border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jahresziel (Umsatz €)</label><input type="number" value={goals.goal_year_revenue || ''} onChange={e => setGoals({...goals, goal_year_revenue: e.target.value})} className="w-full bg-black border border-slate-700 rounded p-2 text-white font-mono focus:border-yellow-500 outline-none" /></div>
                    </div>
                    <button onClick={saveGoals} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">💾 ZIELE SPEICHERN</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
