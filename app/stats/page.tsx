"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// FIX: Komponente nach außen gezogen für sauberes React-Rendering
const ProgressBar = ({ current, target, color = "bg-blue-500", label }: any) => {
  const pct = Math.min((current / (target || 1)) * 100, 100);
  return (
      <div className="mb-3">
          <div className="flex justify-between text-xs mb-1 font-bold text-slate-400">
              <span>{label}</span>
              <span className="font-mono text-white">{current} / {target}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${color}`} style={{width: `${pct}%`}}></div>
          </div>
      </div>
  );
};

export default function StatsPage() {
  const [names, setNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState<string>("");
  
  // Default Ziele-Matrix
  const [goals, setGoals] = useState<any>({
      goal_daily_calls: 50, goal_weekly_calls: 250, goal_monthly_calls: 1000, goal_yearly_calls: 12000,
      goal_daily_deciders: 10, goal_weekly_deciders: 50, goal_monthly_deciders: 200, goal_yearly_deciders: 2400,
      goal_daily_meetings: 1, goal_weekly_meetings: 5, goal_monthly_meetings: 20, goal_yearly_meetings: 240,
      goal_daily_revenue: 500, goal_weekly_revenue: 2500, goal_monthly_revenue: 10000, goal_yearly_revenue: 120000
  });
  
  // Die "Nackte Wahrheit"
  const [stats, setStats] = useState<any>({ 
      day: { calls: 0, deciders: 0, meetings: 0, revenue: 0 },
      week: { calls: 0, deciders: 0, meetings: 0, revenue: 0 },
      month: { calls: 0, deciders: 0, meetings: 0, revenue: 0 },
      year: { calls: 0, deciders: 0, meetings: 0, revenue: 0 }
  });

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
    const { data: goalData } = await supabase.from('player_goals').select('*').eq('name', name).single();
    if (goalData) setGoals(goalData);

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
                deciders: relevant.filter(e => e.event_type === 'deciders').length,
                meetings: relevant.filter(e => e.event_type === 'meetings').length,
                revenue: relevant.reduce((sum, e) => sum + (e.event_value || 0), 0)
            };
        };
        setStats({ 
            day: calcStats(startOfDay), 
            week: calcStats(startOfWeek.toISOString()), 
            month: calcStats(startOfMonth), 
            year: calcStats(startOfYear) 
        });
    }
  };

  const saveGoals = async () => {
      if(!selectedName) return;
      await supabase.from('player_goals').upsert({ name: selectedName, ...goals });
      alert("🎯 Ziele erfolgreich gespeichert!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black italic">CAREER<span className="text-blue-500">MODE</span></h1>
            <Link href="/"><button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm font-bold border border-white/10">⬅ Zurück zur Arena</button></Link>
        </div>

        <div className="mb-10">
            <select className="w-full md:w-1/3 bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:border-blue-500 outline-none text-lg font-bold shadow-xl" onChange={(e) => setSelectedName(e.target.value)} value={selectedName}>
                <option value="">-- Spieler wählen --</option>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
        </div>

        {selectedName && (
            <>
                {/* --- DASHBOARD TILES --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* 1. CALLS (FLEISS) */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors">
                        <div className="text-4xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity">📞</div>
                        <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs mb-4">Anwahl Volumen</h3>
                        <ProgressBar label="Heute" current={stats.day.calls} target={goals.goal_daily_calls} color="bg-blue-500" />
                        <ProgressBar label="Woche" current={stats.week.calls} target={goals.goal_weekly_calls} color="bg-blue-600" />
                        <ProgressBar label="Monat" current={stats.month.calls} target={goals.goal_monthly_calls} color="bg-blue-700" />
                    </div>

                    {/* 2. ENTSCHEIDER (SKILL) */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-600/50 transition-colors">
                        <div className="text-4xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity">🗣️</div>
                        <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs mb-4">Entscheider</h3>
                        <ProgressBar label="Heute" current={stats.day.deciders} target={goals.goal_daily_deciders} color="bg-purple-500" />
                        <ProgressBar label="Woche" current={stats.week.deciders} target={goals.goal_weekly_deciders} color="bg-purple-600" />
                        <ProgressBar label="Monat" current={stats.month.deciders} target={goals.goal_monthly_deciders} color="bg-purple-700" />
                    </div>

                    {/* 3. TERMINE (CONVERSION) */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-600/50 transition-colors">
                        <div className="text-4xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity">📅</div>
                        <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs mb-4">Termine</h3>
                        <ProgressBar label="Heute" current={stats.day.meetings} target={goals.goal_daily_meetings} color="bg-emerald-500" />
                        <ProgressBar label="Woche" current={stats.week.meetings} target={goals.goal_weekly_meetings} color="bg-emerald-600" />
                        <ProgressBar label="Monat" current={stats.month.meetings} target={goals.goal_monthly_meetings} color="bg-emerald-700" />
                    </div>

                    {/* 4. UMSATZ (RESULT) */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-yellow-600/50 transition-colors">
                        <div className="text-4xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity">💰</div>
                        <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs mb-4">Pipeline Value (€)</h3>
                        <ProgressBar label="Heute" current={stats.day.revenue} target={goals.goal_daily_revenue} color="bg-yellow-500" />
                        <ProgressBar label="Woche" current={stats.week.revenue} target={goals.goal_weekly_revenue} color="bg-yellow-600" />
                        <ProgressBar label="Monat" current={stats.month.revenue} target={goals.goal_monthly_revenue} color="bg-yellow-700" />
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs text-slate-500 uppercase font-bold">Jahresziel</div>
                            <div className="text-xl font-mono font-black text-white">{stats.year.revenue}€ <span className="text-slate-600 text-sm">/ {goals.goal_yearly_revenue}€</span></div>
                        </div>
                    </div>

                </div>

                {/* --- SETTINGS MATRIX --- */}
                <div className="bg-black/30 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
                    <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">🛠 ZIELE DEFINIEREN <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-1 rounded">für {selectedName}</span></h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Spalte 1: Calls */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-blue-400 uppercase tracking-widest text-xs border-b border-blue-900/50 pb-2">Anwahl Ziele</h4>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Tag</label><input type="number" value={goals.goal_daily_calls} onChange={e => setGoals({...goals, goal_daily_calls: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Woche</label><input type="number" value={goals.goal_weekly_calls} onChange={e => setGoals({...goals, goal_weekly_calls: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Monat</label><input type="number" value={goals.goal_monthly_calls} onChange={e => setGoals({...goals, goal_monthly_calls: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Jahr</label><input type="number" value={goals.goal_yearly_calls} onChange={e => setGoals({...goals, goal_yearly_calls: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" /></div>
                        </div>

                        {/* Spalte 2: Entscheider */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-purple-400 uppercase tracking-widest text-xs border-b border-purple-900/50 pb-2">Entscheider Ziele</h4>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Tag</label><input type="number" value={goals.goal_daily_deciders} onChange={e => setGoals({...goals, goal_daily_deciders: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Woche</label><input type="number" value={goals.goal_weekly_deciders} onChange={e => setGoals({...goals, goal_weekly_deciders: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Monat</label><input type="number" value={goals.goal_monthly_deciders} onChange={e => setGoals({...goals, goal_monthly_deciders: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Jahr</label><input type="number" value={goals.goal_yearly_deciders} onChange={e => setGoals({...goals, goal_yearly_deciders: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" /></div>
                        </div>

                        {/* Spalte 3: Termine */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-xs border-b border-emerald-900/50 pb-2">Termin Ziele</h4>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Tag</label><input type="number" value={goals.goal_daily_meetings} onChange={e => setGoals({...goals, goal_daily_meetings: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Woche</label><input type="number" value={goals.goal_weekly_meetings} onChange={e => setGoals({...goals, goal_weekly_meetings: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Monat</label><input type="number" value={goals.goal_monthly_meetings} onChange={e => setGoals({...goals, goal_monthly_meetings: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Jahr</label><input type="number" value={goals.goal_yearly_meetings} onChange={e => setGoals({...goals, goal_yearly_meetings: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" /></div>
                        </div>

                        {/* Spalte 4: Umsatz */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-yellow-400 uppercase tracking-widest text-xs border-b border-yellow-900/50 pb-2">Umsatz Ziele (€)</h4>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Tag</label><input type="number" value={goals.goal_daily_revenue} onChange={e => setGoals({...goals, goal_daily_revenue: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-yellow-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Woche</label><input type="number" value={goals.goal_weekly_revenue} onChange={e => setGoals({...goals, goal_weekly_revenue: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-yellow-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Monat</label><input type="number" value={goals.goal_monthly_revenue} onChange={e => setGoals({...goals, goal_monthly_revenue: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-yellow-500 outline-none" /></div>
                            <div><label className="text-[10px] text-slate-500 uppercase font-bold">Jahr</label><input type="number" value={goals.goal_yearly_revenue} onChange={e => setGoals({...goals, goal_yearly_revenue: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-yellow-500 outline-none" /></div>
                        </div>
                    </div>

                    <button onClick={saveGoals} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 text-lg">
                        💾 ZIELE SPEICHERN
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
}
