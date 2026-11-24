import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookOpenCheck, CheckCircle2, Clock3, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import type { Subject } from "../data/db";
import { supabase } from "../lib/supabase";
import { prepareAssessmentProgramme } from "../lib/cloudSync";
import AssignedAssessments from "./AssignedAssessments";
import "./WeeklyTest.css";

type PracticeRequest={
  id:string;subject_name:string;topic:string;question_count:number;status:string;
  exercise_assignment_id:string|null;error_message:string|null;created_at:string;
};
const statusLabel:Record<string,string>={
  queued:"Queued for preparation",
  waiting_for_material:"Waiting for Monitor material approval",
  waiting_for_study_pack:"Preparing your study pack",
  ready:"Practice test ready",
  failed:"Needs attention",
  cancelled:"Cancelled",
};
const formatDate=(value:string)=>new Date(value).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});

export default function WeeklyTest({subjects}:{subjects:Subject[]}){
  const subjectOptions=useMemo(()=>subjects.filter(subject=>String(subject.name||"").trim()),[subjects]);
  const [selectedSubject,setSelectedSubject]=useState("");
  const [topic,setTopic]=useState("");
  const [questionCount,setQuestionCount]=useState(10);
  const [requests,setRequests]=useState<PracticeRequest[]>([]);
  const [loading,setLoading]=useState(false);
  const [refreshing,setRefreshing]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [refreshKey,setRefreshKey]=useState(0);
  const readySignature=useRef("");

  useEffect(()=>{
    if(!selectedSubject&&subjectOptions.length)setSelectedSubject(String(subjectOptions[0].cloudId||subjectOptions[0].name));
  },[selectedSubject,subjectOptions]);

  const refreshRequests=useCallback(async()=>{
    if(!supabase){setRefreshing(false);return;}
    try{
      const {data:authState,error:authError}=await supabase.auth.getUser();
      if(authError||!authState.user)return;
      const {data,error:queryError}=await supabase.from("learner_practice_requests")
        .select("id,subject_name,topic,question_count,status,exercise_assignment_id,error_message,created_at")
        .eq("learner_id",authState.user.id).order("created_at",{ascending:false}).limit(12);
      if(queryError)throw queryError;
      const rows=(data||[]) as PracticeRequest[];
      setRequests(rows);
      const signature=rows.filter(row=>row.status==="ready"&&row.exercise_assignment_id).map(row=>row.exercise_assignment_id).sort().join("|");
      if(signature!==readySignature.current){
        readySignature.current=signature;
        setRefreshKey(value=>value+1);
      }
    }catch(reason){setError(reason instanceof Error?reason.message:"Practice requests could not be refreshed.");}
    finally{setRefreshing(false);}
  },[]);

  useEffect(()=>{
    void refreshRequests();
    const interval=window.setInterval(()=>void refreshRequests(),15000);
    const onFocus=()=>{if(document.visibilityState==="visible")void refreshRequests();};
    window.addEventListener("focus",onFocus);
    return()=>{window.clearInterval(interval);window.removeEventListener("focus",onFocus);};
  },[refreshRequests]);

  const createPracticeTest=async()=>{
    if(!supabase||loading)return;
    const subject=subjectOptions.find(item=>String(item.cloudId||item.name)===selectedSubject);
    if(!subject){setError("Choose one of your registered subjects.");return;}
    setLoading(true);setError("");setNotice("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("assessment-scheduler",{
        body:{action:"request_practice",subjectId:subject.cloudId||undefined,subjectName:subject.name,topic:topic.trim(),questionCount},
      });
      if(invokeError)throw invokeError;
      if(!data?.success)throw new Error(String(data?.error||"Your practice test request could not be saved."));
      setNotice(String(data.message||"Your practice test request has been saved."));
      setTopic("");
      await refreshRequests();
      void prepareAssessmentProgramme();
    }catch(reason){setError(reason instanceof Error?reason.message:"Your practice test could not be prepared.");}
    finally{setLoading(false);}
  };

  return <section className="weekly-test-workspace practice-builder-workspace">
    <header className="practice-builder-heading">
      <div><span className="eyebrow">PERSONALISED PRACTICE</span><h2>Practise any subject.</h2><p>Study Space creates a saved practice test from your latest readable study materials. You can return to it later and your result is recorded in your learning history.</p></div>
      <div className="practice-builder-icon"><BookOpenCheck size={24}/></div>
    </header>

    <div className="practice-builder-card">
      <div className="practice-builder-copy"><Sparkles size={17}/><div><strong>Prepare a new practice test</strong><p>If you have no readable notes, Study Space requests a curriculum guide for Monitor approval and prepares your test automatically when the guide is ready.</p></div></div>
      <div className="practice-builder-fields">
        <label>Subject<select value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)} disabled={!subjectOptions.length}>
          {!subjectOptions.length&&<option value="">No registered subjects</option>}
          {subjectOptions.map(subject=><option key={subject.id} value={String(subject.cloudId||subject.name)}>{subject.name}</option>)}
        </select></label>
        <label>Topic (optional)<input value={topic} onChange={event=>setTopic(event.target.value)} placeholder="e.g. Algebra, photosynthesis, essay writing"/></label>
        <label>Questions<select value={questionCount} onChange={event=>setQuestionCount(Number(event.target.value))}>
          {[5,10,15,20].map(count=><option key={count} value={count}>{count} questions</option>)}
        </select></label>
      </div>
      <button className="primary-button practice-builder-submit" type="button" onClick={()=>void createPracticeTest()} disabled={loading||!subjectOptions.length}>
        {loading?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>} Prepare practice test
      </button>
      {error&&<div className="practice-builder-message error"><AlertCircle size={15}/>{error}</div>}
      {notice&&<div className="practice-builder-message success"><CheckCircle2 size={15}/>{notice}</div>}
    </div>

    <section className="practice-request-history">
      <div className="practice-section-heading"><div><span className="eyebrow">PREPARATION STATUS</span><h3>Your practice tests</h3></div><button type="button" className="secondary-button" onClick={()=>void refreshRequests()} disabled={refreshing}><RefreshCw size={14}/> Refresh</button></div>
      {refreshing&&!requests.length?<div className="practice-history-empty"><LoaderCircle className="spin" size={18}/> Loading practice requests…</div>:!requests.length?<div className="practice-history-empty"><Clock3 size={20}/><p>Your requested practice tests and their preparation status will appear here.</p></div>:<div className="practice-request-list">{requests.map(request=><article key={request.id} className="practice-request-row">
        <div><strong>{request.subject_name}{request.topic?" · "+request.topic:""}</strong><p>{request.question_count} questions · {formatDate(request.created_at)}</p>{request.error_message&&<small>{request.error_message}</small>}</div>
        <span className={"practice-request-status status-"+request.status}><i/>{statusLabel[request.status]||request.status.replace(/_/g," ")}</span>
      </article>)}</div>}
    </section>

    <section className="practice-stored-tests">
      <div className="practice-section-heading"><div><span className="eyebrow">SAVED ASSESSMENTS</span><h3>Ready to take</h3></div></div>
      <AssignedAssessments assignmentType="practice" refreshKey={refreshKey}/>
    </section>
  </section>;
}
