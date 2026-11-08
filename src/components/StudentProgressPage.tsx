import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp, Target, Award, BookOpen, Sparkles, TrendingUp, ShieldCheck, Clock3 } from "lucide-react";
import { supabase } from "../lib/supabase";

type Assessment = {
  assignment_id:string; exercise_title:string; subject_name:string; score_percent:number;
  cohort_average:number|null; cohort_size:number|null; submitted_at:string; teacher_feedback:string;
};
type Memory = { strengths:unknown; difficulties:unknown; goals:unknown; recent_topics:unknown; updated_at:string };
type EventRow = { event_type:string; score:number|null; max_score:number|null; duration_minutes:number|null; created_at:string; metadata:unknown };

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

  const refresh=useCallback(async()=>{
    if(!supabase){setError("Studyspace is not connected. Sign in again to load your academic records.");setLoading(false);return;}
    setLoading(true);setError("");
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user)throw new Error("Your student session has expired. Sign in again.");
      const id=auth.user.id;
      const [results,mia,eventRows]=await Promise.all([
        supabase.rpc("get_student_assessment_progress"),
        supabase.from("mia_learning_memory").select("strengths,difficulties,goals,recent_topics,updated_at").eq("learner_id",id).maybeSingle(),
        supabase.from("progress_events").select("event_type,score,max_score,duration_minutes,created_at,metadata").eq("learner_id",id).order("created_at",{ascending:false}).limit(40)
      ]);
      const failed=[results.error,mia.error,eventRows.error].find(Boolean);
      if(failed)throw failed;
      setAssessments((results.data??[]) as Assessment[]);
      setMemory(mia.data as Memory|null);
      setEvents((eventRows.data??[]) as EventRow[]);
      setUpdatedAt(new Date().toISOString());
    }catch(reason){setError(reason instanceof Error?reason.message:"Academic progress could not be refreshed.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);

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
    <section className="student-progress-head"><div><span className="eyebrow"><ChartNoAxesCombined size={14}/> YOUR ACADEMIC RECORD</span><h2>Progress and achievements</h2><p>Your assessment history, learning patterns and MIA study guidance. This page is read-only; your teacher manages official records.</p></div><button type="button" className="secondary-button" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/>{loading?"Refreshing…":"Refresh records"}</button></section>
    {error&&<p className="inline-message error-message" role="alert">{error}</p>}
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
      <div className="section-heading"><div><h3>MIA learning notes</h3><p>Study guidance based on information currently recorded for your learning profile.</p></div><Sparkles size={20}/></div>
      <div className="student-mia-progress-grid">
        <article className="student-mia-strengths"><div><Award size={17}/><strong>What is going well</strong></div>{strengths.length?<ul>{strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>MIA has not recorded strengths for you yet.</p>}</article>
        <article className="student-mia-focus"><div><Target size={17}/><strong>Areas to focus on</strong></div>{focus.length?<ul>{focus.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>MIA has not recorded focus areas for you yet.</p>}</article>
      </div>
      {goals.length>0&&<div className="student-mia-goals"><strong>Your learning goals</strong><ul>{goals.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {topics.length>0&&<div className="student-mia-goals"><strong>Recently practised</strong><p>{topics.join(" · ")}</p></div>}
      <p className="student-progress-privacy"><ShieldCheck size={14}/> Your individual results are private to your account and authorised Monitor staff. Group averages are shown only when at least three learners have a comparable published assessment.</p>
    </section>
    <div className="student-progress-footer"><span><Clock3 size={13}/> {updatedAt?"Updated "+new Date(updatedAt).toLocaleString():"Records not refreshed yet"}</span><span>Student view · Read only</span></div>
  </div>;
}
