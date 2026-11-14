import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp, Target, Award, BookOpen, Sparkles, ShieldCheck, Clock3 } from "lucide-react";
import { supabase } from "../lib/supabase";

type Assessment = {
  assignment_id:string; exercise_title:string; subject_name:string; score_percent:number;
  cohort_average:number|null; cohort_size:number|null; submitted_at:string; teacher_feedback:string;
};
type Memory = { strengths:unknown; difficulties:unknown; goals:unknown; recent_topics:unknown; updated_at:string };
type EventRow = { event_type:string; score:number|null; max_score:number|null; duration_minutes:number|null; created_at:string; metadata:unknown };
type GamificationSummary = {
  total_xp:number|string; level:number; level_title:string; xp_into_level:number|string;
  xp_for_next_level:number|string; current_streak:number; longest_streak:number;
  active_days:number; study_minutes:number|string; completed_assessments:number;
  flashcards_reviewed:number; referrals_qualified:number; last_activity_date:string|null;
};
type ActivityDay = { activity_date:string; study_minutes:number; completed_assessments:number; flashcards_reviewed:number };
type XpRow = { event_type:string; points:number; metadata:Record<string,unknown>; created_at:string };
type ReferralRow = { id:string; status:string; created_at:string; qualified_at:string|null };

function strings(value:unknown):string[]{
  if(!Array.isArray(value))return [];
  return value.map(item=>{
    if(typeof item==="string")return item;
    if(item&&typeof item==="object"){
      const row=item as Record<string,unknown>;
      return String(row.title||row.name||row.topic||row.description||"").trim();
    }
    return "";
  }).filter(Boolean).slice(0,8);
}
function average(rows:Assessment[]){return rows.length?Math.round(rows.reduce((n,x)=>n+Number(x.score_percent||0),0)/rows.length):null;}
function Sparkline({rows}:{rows:Assessment[]}){
  if(!rows.length)return <div className="student-progress-chart-empty">Complete an assigned test to start your score history.</div>;
  const width=620,height=210,pad=26;
  const values=rows.slice().reverse().map(x=>Math.max(0,Math.min(100,Number(x.score_percent)||0)));
  const x=(i:number)=>pad+(values.length===1?(width-pad*2)/2:i*(width-pad*2)/(values.length-1));
  const y=(v:number)=>height-pad-(v/100)*(height-pad*2);
  const points=values.map((v,i)=>x(i)+","+y(v)).join(" ");
  return <div className="student-progress-chart-wrap"><svg viewBox={"0 0 "+width+" "+height} role="img" aria-label="Assessment results over time from zero to one hundred percent">
    {[0,25,50,75,100].map(v=><g key={v}><line x1={pad} x2={width-pad} y1={y(v)} y2={y(v)} className="student-progress-gridline"/><text x="3" y={y(v)+4} className="student-progress-axis-label">{v}%</text></g>)}
    <polyline points={points} className="student-progress-line" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {values.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r="4.5" className="student-progress-dot"><title>{v}%</title></circle>)}
  </svg><div className="student-progress-chart-caption"><span>Oldest result</span><span>Most recent</span></div></div>;
}

export default function StudentProgressPage(){
  const [assessments,setAssessments]=useState<Assessment[]>([]);
  const [memory,setMemory]=useState<Memory|null>(null);
  const [events,setEvents]=useState<EventRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [updatedAt,setUpdatedAt]=useState<string|null>(null);
  const [gamification,setGamification]=useState<GamificationSummary|null>(null);
  const [activityDays,setActivityDays]=useState<ActivityDay[]>([]);
  const [xpHistory,setXpHistory]=useState<XpRow[]>([]);
  const [referrals,setReferrals]=useState<ReferralRow[]>([]);
  const [referralCode,setReferralCode]=useState("");
  const [completedTaskRewards,setCompletedTaskRewards]=useState(0);
  const [profileSetupEarned,setProfileSetupEarned]=useState(false);
  const [referralInput,setReferralInput]=useState(()=>{try{return localStorage.getItem("studyspace-pending-referral-code")||"";}catch{return "";}});
  const [claimingReferral,setClaimingReferral]=useState(false);
  const [referralNotice,setReferralNotice]=useState("");

  const refresh=useCallback(async()=>{
    if(!supabase){setError("Studyspace is not connected. Sign in again to load your academic records.");setLoading(false);return;}
    setLoading(true);setError("");
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user)throw new Error("Your student session has expired. Sign in again.");
      const id=auth.user.id;
      const [results,mia,eventRows,growth,code,activity,xp,referralRows,taskRewards,profileReward]=await Promise.all([
        supabase.rpc("get_student_assessment_progress"),
        supabase.from("mia_learning_memory").select("strengths,difficulties,goals,recent_topics,updated_at").eq("learner_id",id).maybeSingle(),
        supabase.from("progress_events").select("event_type,score,max_score,duration_minutes,created_at,metadata").eq("learner_id",id).order("created_at",{ascending:false}).limit(40),
        supabase.rpc("get_studyspace_gamification_summary"),
        supabase.rpc("get_or_create_studyspace_referral_code"),
        supabase.from("student_daily_activity").select("activity_date,study_minutes,completed_assessments,flashcards_reviewed").eq("learner_id",id).order("activity_date",{ascending:false}).limit(35),
        supabase.from("student_xp_events").select("event_type,points,metadata,created_at").eq("learner_id",id).order("created_at",{ascending:false}).limit(12),
        supabase.from("student_referrals").select("id,status,created_at,qualified_at").eq("referrer_id",id).order("created_at",{ascending:false}).limit(100),
        supabase.from("student_xp_events").select("id",{count:"exact",head:true}).eq("learner_id",id).eq("event_type","task_completed"),
        supabase.from("student_xp_events").select("id",{count:"exact",head:true}).eq("learner_id",id).eq("event_type","profile_completed")
      ]);
      const failed=[results.error,mia.error,eventRows.error,growth.error,code.error,activity.error,xp.error,referralRows.error,taskRewards.error,profileReward.error].find(Boolean);
      if(failed)throw failed;
      setAssessments((results.data??[]) as Assessment[]);
      setMemory(mia.data as Memory|null);
      setEvents((eventRows.data??[]) as EventRow[]);
      setGamification((growth.data?.[0]??null) as GamificationSummary|null);
      setReferralCode(String(code.data||""));
      setActivityDays((activity.data??[]) as ActivityDay[]);
      setXpHistory((xp.data??[]) as XpRow[]);
      setReferrals((referralRows.data??[]) as ReferralRow[]);
      setCompletedTaskRewards(taskRewards.count??0);
      setProfileSetupEarned((profileReward.count??0)>0);
      setUpdatedAt(new Date().toISOString());
    }catch(reason){setError(reason instanceof Error?reason.message:"Academic progress could not be refreshed.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    void refresh();
    if(!supabase)return;
    let alive=true;
    let channel:ReturnType<NonNullable<typeof supabase>["channel"]>|null=null;
    const setup=async()=>{
      const {data:{user}}=await supabase!.auth.getUser();
      if(!alive||!user)return;
      channel=supabase!.channel("student-progress-live-"+user.id)
        .on("postgres_changes",{event:"*",schema:"public",table:"progress_events",filter:"learner_id=eq."+user.id},()=>{
          if(alive)void refresh();
        })
        .subscribe();
    };
    void setup();
    const onFocus=()=>{if(document.visibilityState==="visible")void refresh();};
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},60000);
    window.addEventListener("focus",onFocus);
    return()=>{
      alive=false;
      window.clearInterval(timer);
      window.removeEventListener("focus",onFocus);
      if(channel)void supabase!.removeChannel(channel);
    };
  },[refresh]);

  const claimReferral=async()=>{
    if(!supabase||claimingReferral)return;
    const code=referralInput.trim().toUpperCase();
    if(!/^[A-Z0-9]{10}$/.test(code)){setReferralNotice("Enter a 10-character referral code.");return;}
    setClaimingReferral(true);setReferralNotice("");
    const {data,error:claimError}=await supabase.rpc("claim_studyspace_referral_code",{p_code:code});
    if(claimError)setReferralNotice(claimError.message);
    else{
      setReferralNotice(data==="already_claimed"?"This referral has already been linked to your account.":"Referral linked. Rewards are released when your academic profile is complete.");
      setReferralInput("");
      try{localStorage.removeItem("studyspace-pending-referral-code");}catch{/* The referral is already recorded on the server. */}
      await refresh();
    }
    setClaimingReferral(false);
  };

  const mean=average(assessments);
  const first=assessments.length>1?Number(assessments[assessments.length-1].score_percent):null;
  const latest=assessments.length?Number(assessments[0].score_percent):null;
  const change=first!==null&&latest!==null?Math.round((latest-first)*10)/10:null;
  const strengths=strings(memory?.strengths);
  const focus=strings(memory?.difficulties);
  const goals=strings(memory?.goals);
  const topics=strings(memory?.recent_topics);
  const studyMinutes=events.reduce((n,x)=>n+Math.max(0,Number(x.duration_minutes)||0),0);
  const subjectSummary=useMemo(()=>{
    const map=new Map<string,{sum:number;count:number}>();
    assessments.forEach(x=>{const name=x.subject_name||"General";const row=map.get(name)||{sum:0,count:0};row.sum+=Number(x.score_percent)||0;row.count++;map.set(name,row);});
    return [...map.entries()].map(([subject,v])=>({subject,average:Math.round(v.sum/v.count),count:v.count})).sort((a,b)=>a.average-b.average);
  },[assessments]);

  return <div className="student-cloud-progress">
    <section className="student-progress-head"><div><span className="eyebrow"><TrendingUp size={14}/> YOUR ACADEMIC RECORD</span><h2>Progress and achievements</h2><p>Your assessment history, learning patterns and MIΛ study guidance. This page is read-only; your teacher manages official records.</p></div><button type="button" className="secondary-button" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/>{loading?"Refreshing…":"Refresh records"}</button></section>
    {error&&<p className="inline-message error-message" role="alert">{error}</p>}
    {gamification&&<section className="student-gamification-panel glass-panel">
      <div className="student-gamification-head">
        <div><span className="eyebrow"><Award size={14}/> YOUR STUDYSPACE JOURNEY</span><h3>{gamification.level_title} · Level {gamification.level}</h3><p>XP is earned through real learning: completing your setup, reviewing flashcards, studying and completing assessments.</p></div>
        <div className="student-xp-total"><strong>{Number(gamification.total_xp).toLocaleString()}</strong><span>XP POINTS</span></div>
      </div>
      <div className="student-xp-progress"><div><span>Level progress</span><strong>{Number(gamification.xp_into_level).toLocaleString()} / {Number(gamification.xp_for_next_level).toLocaleString()} XP</strong></div><div className="student-xp-track"><i style={{width:Math.max(0,Math.min(100,Number(gamification.xp_into_level)/Math.max(1,Number(gamification.xp_for_next_level))*100))+"%"}}/></div></div>
      <div className="student-gamification-stats">
        <article><span>🔥 CURRENT STREAK</span><strong>{gamification.current_streak} days</strong><small>Best: {gamification.longest_streak} days</small></article>
        <article><span>📅 ACTIVE DAYS</span><strong>{gamification.active_days}</strong><small>Days with meaningful study activity</small></article>
        <article><span>📚 FLASHCARDS</span><strong>{Number(gamification.flashcards_reviewed).toLocaleString()}</strong><small>Cards reviewed</small></article>
        <article><span>🎯 TESTS COMPLETED</span><strong>{gamification.completed_assessments}</strong><small>Assigned assessments submitted</small></article>
      </div>
      <div className="student-achievements"><div><strong>Your learning badges</strong><small>Earn these by building real study habits and completing learning milestones.</small></div><div className="student-achievement-grid">
        <article className={profileSetupEarned?"is-earned":""}><Award size={17}/><strong>Setup complete</strong><small>{profileSetupEarned?"Earned":"Complete your academic profile"}</small></article>
        <article className={Number(gamification.flashcards_reviewed)>=1?"is-earned":""}><Award size={17}/><strong>First flashcard</strong><small>{Number(gamification.flashcards_reviewed)>=1?"Earned":"Review your first card"}</small></article>
        <article className={gamification.completed_assessments>=1?"is-earned":""}><Award size={17}/><strong>First assessment</strong><small>{gamification.completed_assessments>=1?"Earned":"Submit your first assigned test"}</small></article>
        <article className={Number(gamification.flashcards_reviewed)>=25?"is-earned":""}><Award size={17}/><strong>Flashcard learner</strong><small>{Number(gamification.flashcards_reviewed)>=25?"Earned":"Review 25 flashcards"}</small></article>
        <article className={completedTaskRewards>=5?"is-earned":""}><Award size={17}/><strong>Plan finisher</strong><small>{completedTaskRewards>=5?"Earned":completedTaskRewards+" of 5 tasks completed"}</small></article>
        <article className={gamification.longest_streak>=7?"is-earned":""}><Award size={17}/><strong>Steady scholar</strong><small>{gamification.longest_streak>=7?"Earned":"Reach a 7-day learning streak"}</small></article>
        <article className={gamification.referrals_qualified>=1?"is-earned":""}><Award size={17}/><strong>Study ambassador</strong><small>{gamification.referrals_qualified>=1?"Earned":"Refer a learner who completes setup"}</small></article>
      </div></div>
      <div className="student-streak-calendar"><div><strong>Consistency calendar</strong><small>Your recent study days. A day counts through a completed study session, assessment, flashcard review or planner task.</small></div><div className="student-streak-days">{Array.from({length:28},(_,i)=>{const date=new Date();date.setDate(date.getDate()-(27-i));const key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");const active=activityDays.some(day=>day.activity_date===key);return <span key={key} className={active?"is-active":""} title={key+(active?" · Study activity":" · No recorded activity")}>{date.getDate()}</span>;})}</div></div>
      <div className="student-xp-milestones"><strong>Streak milestones</strong><div>{[3,7,14,30,60,100].map(days=><span key={days} className={gamification.longest_streak>=days?"is-earned":""}><Award size={14}/>{days} days</span>)}</div></div>
      <div className="student-referral-panel"><div><strong>Invite a study partner</strong><small>Share your referral code. You earn 100 XP when a new learner finishes setting up an active academic profile; they receive 50 welcome XP.</small></div><div className="student-referral-code"><code>{referralCode||"Loading…"}</code><button type="button" className="secondary-button" onClick={()=>{if(referralCode&&navigator.clipboard?.writeText)void navigator.clipboard.writeText(referralCode);}} disabled={!referralCode}>Copy code</button></div><div className="student-referral-counts"><span>{referrals.filter(x=>x.status==="qualified").length} qualified</span><span>{referrals.filter(x=>x.status==="pending").length} pending</span></div><div className="student-referral-claim"><label htmlFor="student-referral-claim-code">Have a friend’s referral code?</label><div><input id="student-referral-claim-code" value={referralInput} onChange={e=>setReferralInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10))} placeholder="10-character code" maxLength={10}/><button type="button" className="secondary-button" onClick={()=>void claimReferral()} disabled={claimingReferral||referralInput.trim().length!==10}>{claimingReferral?"Claiming…":"Claim code"}</button></div>{referralNotice&&<small role="status">{referralNotice}</small>}</div></div>
      <div className="student-xp-history"><strong>Recent rewards</strong>{xpHistory.length?xpHistory.slice(0,6).map((item,i)=><article key={item.event_type+item.created_at+i}><span>{item.event_type.replaceAll("_"," ")}</span><strong className={item.points>=0?"":"is-negative"}>{item.points>0?"+":""}{item.points} XP</strong><small>{new Date(item.created_at).toLocaleDateString()}</small></article>):<p>Complete your first learning activity to see rewards here.</p>}</div>
      <p className="student-gamification-note"><ShieldCheck size={13}/> Streaks do not require daily app opening. Take a rest day when needed; there are no XP penalties for breaks.</p>
    </section>}
    <section className="student-progress-stat-grid">
      <article><span>RECORDED TESTS</span><strong>{assessments.length}</strong><small>Published assessments submitted</small></article>
      <article><span>AVERAGE RESULT</span><strong>{mean===null?"—":mean+"%"}</strong><small>Across your recorded tests</small></article>
      <article><span>RECENT CHANGE</span><strong>{change===null?"—":(change>0?"+":"")+change+"%"}</strong><small>{change===null?"More results are needed":change>0?"Compared with your earliest shown test":change<0?"Compared with your earliest shown test":"No change across shown results"}</small></article>
      <article><span>RECORDED STUDY</span><strong>{(studyMinutes/60).toFixed(1)}h</strong><small>Study time recorded in progress events</small></article>
    </section>
    <section className="glass-panel student-progress-record-panel">
      <div className="section-heading"><div><h3>Assessment performance</h3><p>Your latest published test results, in chronological order.</p></div><TrendingUp size={20}/></div>
      <Sparkline rows={assessments}/>
      {assessments.length>0&&<div className="student-progress-assessment-list">{assessments.map(item=><article key={item.assignment_id}><div><strong>{item.exercise_title||"Assessment"}</strong><span>{item.subject_name||"General"} · {new Date(item.submitted_at).toLocaleDateString()}</span>{item.teacher_feedback&&<small>Teacher note: {item.teacher_feedback}</small>}</div><strong className="student-progress-score">{Math.round(Number(item.score_percent)||0)}%</strong>{item.cohort_average!==null&&<div className="student-cohort-compare"><span>Shared-assessment group average</span><strong>{Math.round(item.cohort_average)}%</strong><small>Anonymous aggregate · {item.cohort_size} or more learners</small><div className="student-cohort-track"><i style={{width:Math.max(0,Math.min(100,item.cohort_average))+"%"}}/></div></div>}</article>)}</div>}
      {!assessments.length&&!loading&&<p className="student-progress-empty">No marked assessment records are available yet. Your results will appear here after you submit an assigned test and it is marked.</p>}
    </section>
    {subjectSummary.length>0&&<section className="glass-panel student-progress-record-panel"><div className="section-heading"><div><h3>Subject-by-subject view</h3><p>Calculated from the assessment records shown above.</p></div><BookOpen size={19}/></div><div className="student-progress-subjects">{subjectSummary.map(x=><article key={x.subject}><div><strong>{x.subject}</strong><span>{x.count} recorded result{x.count===1?"":"s"}</span></div><strong>{x.average}%</strong><div className="student-progress-subject-track"><i style={{width:x.average+"%"}}/></div></article>)}</div></section>}
    <section className="glass-panel student-progress-record-panel">
      <div className="section-heading"><div><h3>MIΛ learning notes</h3><p>Study guidance based on information currently recorded for your learning profile.</p></div><Sparkles size={20}/></div>
      <div className="student-mia-progress-grid">
        <article className="student-mia-strengths"><div><Award size={17}/><strong>What is going well</strong></div>{strengths.length?<ul>{strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>MIΛ has not recorded strengths for you yet.</p>}</article>
        <article className="student-mia-focus"><div><Target size={17}/><strong>Areas to focus on</strong></div>{focus.length?<ul>{focus.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>MIΛ has not recorded focus areas for you yet.</p>}</article>
      </div>
      {goals.length>0&&<div className="student-mia-goals"><strong>Your learning goals</strong><ul>{goals.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {topics.length>0&&<div className="student-mia-goals"><strong>Recently practised</strong><p>{topics.join(" · ")}</p></div>}
      <p className="student-progress-privacy"><ShieldCheck size={14}/> Your individual results are private to your account and authorised Monitor staff. Group averages are shown only when at least three learners have a comparable published assessment.</p>
    </section>
    <div className="student-progress-footer"><span><Clock3 size={13}/> {updatedAt?"Updated "+new Date(updatedAt).toLocaleString():"Records not refreshed yet"}</span><span>Student view · Read only</span></div>
  </div>;
}
