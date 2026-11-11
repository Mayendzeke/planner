import { useCallback, useEffect, useState } from "react";
import { Award, Flame, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

type Summary = {
  total_xp: number | string;
  level: number;
  level_title: string;
  xp_into_level: number | string;
  xp_for_next_level: number | string;
  current_streak: number;
  longest_streak: number;
  active_days: number;
};

export default function StudentProfileEngagementCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase) { setError("StudySpace is not connected."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error: resultError } = await supabase.rpc("get_studyspace_gamification_summary");
    if (resultError) {
      setError("Your XP could not be loaded right now. Try refreshing.");
      setSummary(null);
    } else {
      setSummary((Array.isArray(data) ? data[0] : data) as Summary | null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const totalXp = Number(summary?.total_xp ?? 0);
  const level = Number(summary?.level ?? 1);
  const levelXp = Number(summary?.xp_into_level ?? 0);
  const nextLevelXp = Math.max(1, Number(summary?.xp_for_next_level ?? 100));
  const progress = Math.max(0, Math.min(100, levelXp / nextLevelXp * 100));

  return <section className="student-profile-engagement glass-panel" aria-labelledby="profile-engagement-title">
    <div className="student-profile-engagement-head">
      <div><span className="eyebrow"><Sparkles size={14}/> YOUR LEARNING JOURNEY</span><h2 id="profile-engagement-title">StudySpace XP</h2><p>Your experience points grow as you study, practise and complete learning goals.</p></div>
      <button type="button" className="icon-button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh XP"><RefreshCw size={15}/></button>
    </div>
    {loading ? <div className="student-profile-xp-loading"><span className="loader"/><span>Loading your XP…</span></div> :
      error ? <div className="student-profile-xp-error" role="status"><span>{error}</span><button type="button" className="secondary-button" onClick={() => void refresh()}>Try again</button></div> :
      summary ? <>
        <div className="student-profile-xp-main">
          <div><strong>{totalXp.toLocaleString()}</strong><span>XP POINTS</span></div>
          <div className="student-profile-level"><span>LEVEL {level}</span><strong>{summary.level_title}</strong></div>
        </div>
        <div className="student-profile-xp-progress"><div><span>Progress to level {level + 1}</span><strong>{levelXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</strong></div><div className="student-xp-track" role="progressbar" aria-label="XP progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{width: progress + "%"}}/></div></div>
        <div className="student-profile-streaks">
          <article><Flame size={16}/><span><strong>{summary.current_streak} days</strong><small>Current streak</small></span></article>
          <article><Award size={16}/><span><strong>{summary.longest_streak} days</strong><small>Personal best</small></span></article>
          <article><Sparkles size={16}/><span><strong>{summary.active_days}</strong><small>Active study days</small></span></article>
        </div>
      </> : <p className="student-profile-xp-error">Your learning XP will appear here once your account is ready.</p>}
  </section>;
}
