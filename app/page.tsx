-- 1. Historie-Tabelle (für Statistiken)
CREATE TABLE IF NOT EXISTS events (
  id bigint generated always as identity primary key,
  player_id int not null,
  player_name text,
  event_type text not null, -- 'calls', 'deciders', 'meetings'
  session_date date default current_date,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_events_player ON events (player_name, session_date);

-- 2. Haupt-Tabelle (Falls du ganz neu bist)
CREATE TABLE IF NOT EXISTS duell (id bigint primary key generated always as identity);
INSERT INTO duell (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3. Sicherstellen, dass alle 6 Spieler-Spalten da sind (egal von welcher Version du kommst)
DO $$
BEGIN
  FOR i IN 1..6 LOOP
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_name text', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_emoji text default ''👤''', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_status text default ''''', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_calls int default 0', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_deciders int default 0', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_meetings int default 0', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_streak int default 0', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_val int default 0', i);
    EXECUTE format('ALTER TABLE duell ADD COLUMN IF NOT EXISTS p%s_goal int default 1', i);
  END LOOP;
END $$;

-- 4. Timer Spalten (die hattest du schon, aber sicher ist sicher)
ALTER TABLE duell ADD COLUMN IF NOT EXISTS timer_end timestamptz;
ALTER TABLE duell ADD COLUMN IF NOT EXISTS timer_paused_at timestamptz;

-- 5. Legends Tabelle (Lifetime Stats & Level)
CREATE TABLE IF NOT EXISTS legends (
  name text PRIMARY KEY,
  total_sales int DEFAULT 0,
  battles_won int DEFAULT 0,
  last_active timestamptz DEFAULT now()
);

-- 6. DIE REPARIERTE ATOMIC ACTION (Wichtigstes Update!)
-- Das überschreibt deine alte, fehlerhafte Funktion
CREATE OR REPLACE FUNCTION atomic_action(
  p_idx int, 
  action_type text, 
  delta int
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF action_type = 'calls' THEN
    IF delta > 0 THEN
        EXECUTE format('UPDATE duell SET p%s_calls = p%s_calls + $1, p%s_streak = p%s_streak + $1 WHERE id = 1', p_idx, p_idx, p_idx) USING delta;
    ELSE
        EXECUTE format('UPDATE duell SET p%s_calls = p%s_calls + $1 WHERE id = 1', p_idx, p_idx) USING delta;
    END IF;

  ELSIF action_type = 'deciders' THEN
    IF delta > 0 THEN
        EXECUTE format('UPDATE duell SET p%s_deciders = p%s_deciders + $1, p%s_calls = p%s_calls + $1, p%s_streak = p%s_streak + $1 WHERE id = 1', p_idx, p_idx, p_idx, p_idx, p_idx, p_idx) USING delta;
    ELSE
        EXECUTE format('UPDATE duell SET p%s_deciders = p%s_deciders + $1, p%s_calls = p%s_calls + $1 WHERE id = 1', p_idx, p_idx, p_idx, p_idx) USING delta;
    END IF;

  ELSIF action_type = 'meetings' THEN
    IF delta > 0 THEN
       -- Meeting setzt Streak auf 0 zurück
       EXECUTE format('UPDATE duell SET p%s_meetings = p%s_meetings + $1, p%s_deciders = p%s_deciders + $1, p%s_calls = p%s_calls + $1, p%s_streak = 0 WHERE id = 1', p_idx, p_idx, p_idx, p_idx, p_idx, p_idx, p_idx) USING delta;
    ELSE
       -- Undo zieht nur ab, fasst Streak nicht an
       EXECUTE format('UPDATE duell SET p%s_meetings = p%s_meetings + $1, p%s_deciders = p%s_deciders + $1, p%s_calls = p%s_calls + $1 WHERE id = 1', p_idx, p_idx, p_idx, p_idx, p_idx, p_idx) USING delta;
    END IF;
  END IF;
END;
$$;
