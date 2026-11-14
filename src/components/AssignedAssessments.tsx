import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, LoaderCircle, Send, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "../lib/supabase";
import { studentStorageKey } from "../lib/studentStorage";

type Question = {
  id: string;
  question_type: string;
  prompt: string;
  points: number;
  content: { options?: string[]; pairs?: { left: string; right: string }[]; topic?: string; difficulty?: string; clue?: string };
};
type Assignment = {
  id: string;
  due_at: string | null;
  available_at: string;
  set: { id: string; title: string; subject_name: string; instructions: string; duration_minutes: number; grade: string; curriculum: string };
  questions: Question[];
};
type Submission = { score: number; totalPoints: number; percentage: number; manualReview: number; aiMarked: number; markingStatus: string; markingNotice: string; teacherFeedback?: string; results: Record<string,{correct:boolean|null;points:number;awarded:number;explanation?:string;markingMethod?:string;confidence?:number;status?:string}> };
type StoredAttempt = { score:number; total_points:number; submitted_at:string; marked_at:string|null; teacher_feedback:string; marking_status:string; teacher_review_required:boolean; ai_marked_at:string|null; marking_details:Record<string,unknown>; manual_marks:Record<string,number> };

export default function AssignedAssessments() {
  const [assignments,setAssignments] = useState<Assignment[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [activeId,setActiveId] = useState("");
  const [answers,setAnswers] = useState<Record<string,unknown>>({});
  const [busy,setBusy] = useState(false);
  const [submission,setSubmission] = useState<Submission|null>(null);
  const [attemptsByAssignment,setAttemptsByAssignment] = useState<Record<string,StoredAttempt>>({});
  const [draftSaveError,setDraftSaveError] = useState(false);
  const [learnerId,setLearnerId] = useState("");

  const refresh = useCallback(async () => {
    if(!supabase){setError("Studyspace cloud access is not configured.");setLoading(false);return;}
    setLoading(true);setError("");
    try {
      const {data:authState,error:authError}=await supabase.auth.getUser();
      if(authError||!authState.user) throw new Error("Sign in again to load your assigned assessments.");
      setLearnerId(authState.user.id);
      const {data:assigned,error:assignmentError}=await supabase.from("exercise_assignments")
        .select("id,exercise_set_id,due_at,available_at")
        .eq("learner_id",authState.user.id)
        .order("available_at",{ascending:true});
      if(assignmentError) throw assignmentError;
      const rows=assigned||[];
      if(!rows.length){setAssignments([]);setAttemptsByAssignment({});setLoading(false);return;}
      const ids=[...new Set(rows.map(row=>row.exercise_set_id))];
      const [{data:sets,error:setError},{data:questions,error:questionError},{data:attemptRows,error:attemptError}]=await Promise.all([
        supabase.from("exercise_sets").select("id,title,subject_name,instructions,duration_minutes,grade,curriculum").in("id",ids).eq("is_published",true),
        supabase.from("exercise_questions").select("id,exercise_set_id,position,question_type,prompt,points,content").in("exercise_set_id",ids).order("position"),
        supabase.from("exercise_attempts").select("assignment_id,score,total_points,submitted_at,marked_at,teacher_feedback,marking_status,teacher_review_required,ai_marked_at,marking_details,manual_marks")
          .eq("learner_id",authState.user.id).in("assignment_id",rows.map(row=>row.id)).order("submitted_at",{ascending:false}),
      ]);
      if(setError) throw setError;
      if(questionError) throw questionError;
      if(attemptError) throw attemptError;
      const latestAttempts:Record<string,StoredAttempt>={};
      for(const attempt of attemptRows||[]) if(!latestAttempts[attempt.assignment_id]) latestAttempts[attempt.assignment_id]=attempt as StoredAttempt;
      setAttemptsByAssignment(latestAttempts);
      const setMap=new Map((sets||[]).map(set=>[set.id,set]));
      const next:Assignment[]=[];
      for(const row of rows){
        const set=setMap.get(row.exercise_set_id);
        if(!set) continue;
        next.push({
          id:row.id,due_at:row.due_at,available_at:row.available_at,
          set:set as Assignment["set"],
          questions:(questions||[]).filter(q=>q.exercise_set_id===set.id) as Question[],
        });
      }
      setAssignments(next);
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"Assigned assessments could not be loaded.");
    } finally {setLoading(false);}
  },[]);

  useEffect(()=>{
    void refresh();
    const onFocus=()=>{if(document.visibilityState==="visible")void refresh();};
    window.addEventListener("focus",onFocus);
    return()=>window.removeEventListener("focus",onFocus);
  },[refresh]);

  useEffect(()=>{
    if(!supabase||!learnerId)return;
    const channel=supabase.channel("student-assigned-assessments-"+learnerId)
      .on("postgres_changes",{event:"*",schema:"public",table:"exercise_attempts",filter:"learner_id=eq."+learnerId},()=>void refresh())
      .subscribe();
    return()=>{if(supabase)void supabase.removeChannel(channel);};
  },[learnerId,refresh]);

  useEffect(()=>{
    if(!activeId||!submission)return;
    const attempt=attemptsByAssignment[activeId];
    if(!attempt||attempt.marking_status!=="teacher_marked"||submission.manualReview===0)return;
    const total=Number(attempt.total_points)||0;
    const score=Number(attempt.score)||0;
    setSubmission(current=>current?{
      ...current,score,totalPoints:total,percentage:total>0?Math.round(score/total*10000)/100:0,
      manualReview:0,markingStatus:"teacher_marked",teacherFeedback:attempt.teacher_feedback||"",
      results:Object.fromEntries(Object.entries(current.results).map(([questionId,result])=>{
        const teacherMark=attempt.manual_marks?.[questionId];
        if(teacherMark===undefined)return [questionId,result];
        const previous=result??{correct:null,points:0,awarded:0};
        const awarded=Number(teacherMark);
        return [questionId,{...previous,awarded,correct:awarded>=previous.points?true:awarded>0?null:false,markingMethod:"teacher",status:"marked" as const,explanation:attempt.teacher_feedback||previous.explanation}];
      })),
    }:current);
  },[activeId,attemptsByAssignment,submission]);

  const active=assignments.find(item=>item.id===activeId);
  const setAnswer=(id:string,value:unknown)=>setAnswers(current=>({...current,[id]:value}));
  const begin=(item:Assignment)=>{
    const availableAt = new Date(item.available_at).getTime();
    if (Number.isFinite(availableAt) && availableAt > Date.now()) return;
    if (item.due_at && new Date(item.due_at).getTime() < Date.now()) return;
    let restored:Record<string,unknown>={};
    try {
      const parsed=JSON.parse(localStorage.getItem(studentStorageKey("studyspace-assessment-draft:"+item.id))||"{}");
      if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)) restored=parsed as Record<string,unknown>;
    } catch { restored={}; }
    setActiveId(item.id);setAnswers(restored);setSubmission(null);setDraftSaveError(false);
  };
  const back=()=>{
    setActiveId("");setAnswers({});setSubmission(null);setDraftSaveError(false);
  };

  useEffect(()=>{
    if(!activeId||submission)return;
    try{
      localStorage.setItem(studentStorageKey("studyspace-assessment-draft:"+activeId),JSON.stringify(answers));
      setDraftSaveError(false);
    }catch{
      setDraftSaveError(true);
    }
  },[activeId,answers,submission]);

  const isAnswered=(question:Question)=>{
    const value=answers[question.id];
    if(question.question_type==="matching"){
      const record=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
      return (question.content?.pairs||[]).length>0&&(question.content?.pairs||[]).every(pair=>String(record[pair.left]||"").trim().length>0);
    }
    return String(value??"").trim().length>0;
  };
  const answeredCount=active?active.questions.filter(isAnswered).length:0;
  const submit=async()=>{
    if(!active||!supabase||busy||submission)return;
    const unanswered=active.questions.length-active.questions.filter(isAnswered).length;
    if(unanswered>0&&!window.confirm("You have "+unanswered+" unanswered question(s). Submit the assessment anyway? You will not be able to change your answers after submission."))return;
    setBusy(true);setError("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("submit-exercise-attempt",{body:{assignmentId:active.id,answers}});
      if(invokeError) throw invokeError;
      if(!data?.success) throw new Error(data?.error||"Your answers could not be submitted.");
      try { localStorage.removeItem(studentStorageKey("studyspace-assessment-draft:"+active.id)); } catch { /* The submitted result is already saved securely. */ }
      setSubmission({score:Number(data.score||0),totalPoints:Number(data.totalPoints||0),percentage:Number(data.percentage||0),manualReview:Number(data.manualReview||0),aiMarked:Number(data.aiMarked||0),markingStatus:String(data.markingStatus||"not_required"),markingNotice:String(data.markingNotice||""),results:data.results||{}});
      setAttemptsByAssignment(current=>({...current,[active.id]:{
        score:Number(data.score||0),total_points:Number(data.totalPoints||0),
        submitted_at:String(data.submittedAt||new Date().toISOString()),marked_at:null,teacher_feedback:"",
        marking_status:String(data.markingStatus||"not_required"),teacher_review_required:Number(data.manualReview||0)>0,
        ai_marked_at:Number(data.aiMarked||0)>0?String(data.submittedAt||new Date().toISOString()):null,marking_details:{},manual_marks:{}
      }}));
    }catch(reason){setError(reason instanceof Error?reason.message:"Your answers could not be submitted. Try again.");}
    finally{setBusy(false);}
  };

  return <section className="assigned-assessments glass-panel">
    <div className="section-heading">
      <div><span className="eyebrow">FROM YOUR TEACHER</span><h2>Assigned by my teacher</h2><p>Interactive homework and assessments published to your StudySpace account.</p></div>
      <div className="assigned-assessment-actions"><button type="button" className="icon-button" title="Refresh assignments" aria-label="Refresh assignments" onClick={()=>void refresh()} disabled={loading}><LoaderCircle size={17}/></button><ClipboardCheck size={21}/></div>
    </div>
    {error&&<div className="assigned-assessment-error" role="alert"><AlertCircle size={16}/>{error}</div>}
    {loading?<div className="assigned-assessment-empty"><LoaderCircle className="assigned-spinner" size={22}/><span>Loading your assignments…</span></div>:
      active?<div className="assigned-assessment-detail">
        <div className="assigned-assessment-detail-heading"><button type="button" className="subtle-button" onClick={back}><ChevronLeft size={15}/> Back to assignments</button><span className="assigned-assessment-subject">{active.set.subject_name}</span></div>
        <h3>{active.set.title}</h3>
        <p>{active.set.instructions}</p>
        <div className="assigned-assessment-meta"><span><Clock3 size={14}/>{active.set.duration_minutes} suggested minutes</span><span>{active.questions.length} questions</span><span>{answeredCount} of {active.questions.length} answered</span>{active.due_at&&<span>Due {new Date(active.due_at).toLocaleDateString()}</span>}</div>
        <div className="assigned-answer-progress"><span style={{width:(active.questions.length?answeredCount/active.questions.length*100:0)+"%"}}/></div>
        {!draftSaveError&&<p className="assigned-draft-saved" role="status">Answers are saved on this device as you work. You can leave and return on this device before submitting.</p>}
        <div className="assigned-question-navigation" aria-label="Question navigation">{active.questions.map((question,index)=><button type="button" key={question.id} className={isAnswered(question)?"answered":""} onClick={()=>document.getElementById("assigned-q-"+question.id)?.scrollIntoView({behavior:"smooth",block:"start"})} aria-label={"Go to question "+(index+1)}>{index+1}</button>)}</div>
        {draftSaveError&&<p className="assigned-draft-warning" role="status">Your answers are not being saved to this device. Keep this page open until you submit.</p>}
        {active.questions.map((question,index)=>{
          const value=answers[question.id];
          const result=submission?.results?.[question.id];
          return <article className="assigned-question" id={"assigned-q-"+question.id} key={question.id}>
            <div className="assigned-question-top"><strong>Question {index+1}</strong><span>{question.points} marks</span></div>
            {question.content?.topic&&<small className="assigned-question-topic">{question.content.topic}</small>}
            <p>{question.prompt}</p>
            {question.question_type==="multiple_choice"||question.question_type==="true_false"?
              <div className="assigned-question-options">{(question.question_type==="true_false"?["True","False"]:(question.content?.options||[]).filter(option=>String(option).trim().length>0)).map(option=><button type="button" key={option} disabled={!!submission} className={value===option?"selected":""} onClick={()=>setAnswer(question.id,option)}>{option}</button>)}</div>:
              question.question_type==="matching"?
                <div className="assigned-matching-list">{(question.content?.pairs||[]).map((pair,i)=><label key={i}><span>{pair.left}</span><select disabled={!!submission} value={String((value as Record<string,unknown>|undefined)?.[pair.left]||"")} onChange={e=>setAnswer(question.id,{...(value as Record<string,unknown>||{}),[pair.left]:e.target.value})}><option value="">Choose a match</option>{(question.content?.pairs||[]).map(item=><option key={item.right} value={item.right}>{item.right}</option>)}</select></label>)}</div>:
                <>
                  {question.question_type==="word_puzzle"&&question.content?.clue&&<p className="assigned-question-clue"><strong>Clue:</strong> {question.content.clue}</p>}
                  <label className="assigned-answer-field"><span>{question.question_type==="short_answer"?"Your written answer":question.question_type==="word_puzzle"?"Your puzzle answer":"Your answer"}</span><textarea rows={question.question_type==="short_answer"?4:2} disabled={!!submission} value={String(value??"")} onChange={e=>setAnswer(question.id,e.target.value)} placeholder={question.question_type==="word_puzzle"?"Enter the word that solves the clue…":"Type your answer here…"}/></label>
                </>}
            {submission&&<div className={result?.correct===true?"assigned-result correct":result?.correct===false?"assigned-result incorrect":"assigned-result review"}>
              {result?.correct===true?<CheckCircle2 size={15}/>:result?.correct===false?<AlertCircle size={15}/>:<Clock3 size={15}/>}
              <span>{result?.status==="teacher_review"?"Teacher review pending":result?.markingMethod==="miλ"?"MIΛ marked · "+result.awarded+"/"+result.points+" marks · "+Math.round(Number(result.confidence||0)*100)+"% confidence":result?.correct===true?"Correct · "+result.awarded+"/"+result.points+" marks":result?.correct===false?"Not correct · "+result.awarded+"/"+result.points+" marks":"Marked · "+result.awarded+"/"+result.points+" marks"}</span>
            </div>}
            {submission&&result?.explanation&&<p className="assigned-explanation">{result.explanation}</p>}
          </article>;
        })}
        {submission?<div className="assigned-submission-result"><Trophy size={24}/><div><strong>{submission.score} / {submission.totalPoints} marks {submission.manualReview?"· provisional":"· "+submission.percentage+"%"}</strong><span>{submission.manualReview?submission.manualReview+" written response(s) are awaiting a final teacher mark. Your percentage will update after review.":submission.markingStatus==="teacher_marked"?"Your teacher has finalised the mark. This result is saved to your academic record.":submission.aiMarked?"MIΛ marked "+submission.aiMarked+" written response(s). Your final result is saved to your academic record.":"Your objective answers have been marked and saved to your academic record."}</span>{submission.teacherFeedback&&<small>Teacher feedback: {submission.teacherFeedback}</small>}{submission.markingNotice&&<small>{submission.markingNotice}</small>}</div><button type="button" className="secondary-button" onClick={back}>Close</button></div>:
          <div className="assigned-submit-row"><span>Your answers are marked securely by Studyspace.</span><button type="button" className="primary-button" onClick={()=>void submit()} disabled={busy}>{busy?"Submitting…":"Submit assessment"} <Send size={15}/></button></div>}
      </div>:
      assignments.length?<div className="assigned-assessment-list">{assignments.map(item=><article className="assigned-assessment-card" key={item.id}>
        <div className="assigned-assessment-icon"><BookOpen size={19}/></div>
        <div className="assigned-assessment-copy"><strong>{item.set.title}</strong><span>{item.set.subject_name} · {item.questions.length} questions · {item.set.duration_minutes} min</span><small>{new Date(item.available_at).getTime()>Date.now()?"Available "+new Date(item.available_at).toLocaleString():item.due_at?"Due "+new Date(item.due_at).toLocaleDateString():"No due date"}</small>{attemptsByAssignment[item.id]&&<small>Last submitted: {Number(attemptsByAssignment[item.id].score)} / {Number(attemptsByAssignment[item.id].total_points)} · {attemptsByAssignment[item.id].marking_status==="teacher_marked"?"Teacher marked":attemptsByAssignment[item.id].marking_status==="ai_marked"?"MIΛ marked":attemptsByAssignment[item.id].teacher_review_required?"Teacher review pending":"Auto-marked"}</small>}{attemptsByAssignment[item.id]?.teacher_feedback&&<small>Teacher feedback: {attemptsByAssignment[item.id].teacher_feedback}</small>}</div>
        {item.available_at&&new Date(item.available_at).getTime()>Date.now()?<button type="button" className="secondary-button" disabled>Not available yet</button>:item.due_at&&new Date(item.due_at).getTime()<Date.now()?<button type="button" className="secondary-button" disabled>Deadline passed</button>:<button type="button" className="primary-button" onClick={()=>begin(item)}>{attemptsByAssignment[item.id]?"New attempt":"Start"} <ChevronRight size={15}/></button>}
      </article>)}</div>:
      <div className="assigned-assessment-empty"><ShieldCheck size={27}/><strong>No assigned assessments</strong><span>When your teacher publishes a test or assignment to your account, it will appear here.</span></div>}
  </section>;
}
