import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, LoaderCircle, Send, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "../lib/supabase";

type Question = {
  id: string;
  question_type: string;
  prompt: string;
  points: number;
  content: { options?: string[]; pairs?: { left: string; right: string }[]; topic?: string; difficulty?: string };
};
type Assignment = {
  id: string;
  due_at: string | null;
  available_at: string;
  set: { id: string; title: string; subject_name: string; instructions: string; duration_minutes: number; grade: string; curriculum: string };
  questions: Question[];
};
type Submission = { score: number; totalPoints: number; percentage: number; manualReview: number; results: Record<string,{correct:boolean|null;points:number;awarded:number;explanation?:string}> };
type StoredAttempt = { score:number; total_points:number; submitted_at:string; marked_at:string|null; teacher_feedback:string };

export default function AssignedAssessments() {
  const [assignments,setAssignments] = useState<Assignment[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [activeId,setActiveId] = useState("");
  const [answers,setAnswers] = useState<Record<string,unknown>>({});
  const [busy,setBusy] = useState(false);
  const [submission,setSubmission] = useState<Submission|null>(null);
  const [attemptsByAssignment,setAttemptsByAssignment] = useState<Record<string,StoredAttempt>>({});

  const refresh = useCallback(async () => {
    if(!supabase){setError("Studyspace cloud access is not configured.");setLoading(false);return;}
    setLoading(true);setError("");
    try {
      const {data:authState,error:authError}=await supabase.auth.getUser();
      if(authError||!authState.user) throw new Error("Sign in again to load your assigned assessments.");
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
        supabase.from("exercise_attempts").select("assignment_id,score,total_points,submitted_at,marked_at,teacher_feedback")
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
    const onFocus=()=>void refresh();
    window.addEventListener("focus",onFocus);
    return()=>window.removeEventListener("focus",onFocus);
  },[refresh]);

  const active=assignments.find(item=>item.id===activeId);
  const setAnswer=(id:string,value:unknown)=>setAnswers(current=>({...current,[id]:value}));
  const begin=(item:Assignment)=>{
    setActiveId(item.id);setAnswers({});setSubmission(null);
  };
  const back=()=>{
    setActiveId("");setAnswers({});setSubmission(null);
  };
  const submit=async()=>{
    if(!active||!supabase||busy||submission)return;
    setBusy(true);setError("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("submit-exercise-attempt",{body:{assignmentId:active.id,answers}});
      if(invokeError) throw invokeError;
      if(!data?.success) throw new Error(data?.error||"Your answers could not be submitted.");
      setSubmission({score:Number(data.score||0),totalPoints:Number(data.totalPoints||0),percentage:Number(data.percentage||0),manualReview:Number(data.manualReview||0),results:data.results||{}});
      setAttemptsByAssignment(current=>({...current,[active.id]:{
        score:Number(data.score||0),total_points:Number(data.totalPoints||0),
        submitted_at:String(data.submittedAt||new Date().toISOString()),marked_at:null,teacher_feedback:""
      }}));
    }catch(reason){setError(reason instanceof Error?reason.message:"Your answers could not be submitted. Try again.");}
    finally{setBusy(false);}
  };

  return <section className="assigned-assessments glass-panel">
    <div className="section-heading">
      <div><span className="eyebrow">FROM YOUR TEACHER</span><h2>Assigned assessments</h2><p>Tests and assignments published to your Studyspace account.</p></div>
      <div className="assigned-assessment-actions"><button type="button" className="icon-button" title="Refresh assignments" aria-label="Refresh assignments" onClick={()=>void refresh()} disabled={loading}><LoaderCircle size={17}/></button><ClipboardCheck size={21}/></div>
    </div>
    {error&&<div className="assigned-assessment-error" role="alert"><AlertCircle size={16}/>{error}</div>}
    {loading?<div className="assigned-assessment-empty"><LoaderCircle className="assigned-spinner" size={22}/><span>Loading your assignments…</span></div>:
      active?<div className="assigned-assessment-detail">
        <div className="assigned-assessment-detail-heading"><button type="button" className="subtle-button" onClick={back}><ChevronLeft size={15}/> Back to assignments</button><span className="assigned-assessment-subject">{active.set.subject_name}</span></div>
        <h3>{active.set.title}</h3>
        <p>{active.set.instructions}</p>
        <div className="assigned-assessment-meta"><span><Clock3 size={14}/>{active.set.duration_minutes} minutes</span><span>{active.questions.length} questions</span>{active.due_at&&<span>Due {new Date(active.due_at).toLocaleDateString()}</span>}</div>
        {active.questions.map((question,index)=>{
          const value=answers[question.id];
          const result=submission?.results?.[question.id];
          return <article className="assigned-question" key={question.id}>
            <div className="assigned-question-top"><strong>Question {index+1}</strong><span>{question.points} marks</span></div>
            {question.content?.topic&&<small className="assigned-question-topic">{question.content.topic}</small>}
            <p>{question.prompt}</p>
            {question.question_type==="multiple_choice"||question.question_type==="true_false"?
              <div className="assigned-question-options">{(question.content?.options?.length?question.content.options:question.question_type==="true_false"?["True","False"]:[]).map(option=><button type="button" key={option} disabled={!!submission} className={value===option?"selected":""} onClick={()=>setAnswer(question.id,option)}>{option}</button>)}</div>:
              question.question_type==="matching"?
                <div className="assigned-matching-list">{(question.content?.pairs||[]).map((pair,i)=><label key={i}><span>{pair.left}</span><select disabled={!!submission} value={String((value as Record<string,unknown>|undefined)?.[pair.left]||"")} onChange={e=>setAnswer(question.id,{...(value as Record<string,unknown>||{}),[pair.left]:e.target.value})}><option value="">Choose a match</option>{(question.content?.pairs||[]).map(item=><option key={item.right} value={item.right}>{item.right}</option>)}</select></label>)}</div>:
                <label className="assigned-answer-field"><span>{question.question_type==="short_answer"?"Your written answer":"Your answer"}</span><textarea rows={question.question_type==="short_answer"?4:2} disabled={!!submission} value={String(value??"")} onChange={e=>setAnswer(question.id,e.target.value)} placeholder="Type your answer here…"/></label>}
            {submission&&<div className={result?.correct===true?"assigned-result correct":result?.correct===false?"assigned-result incorrect":"assigned-result review"}>
              {result?.correct===true?<CheckCircle2 size={15}/>:result?.correct===false?<AlertCircle size={15}/>:<Clock3 size={15}/>}
              <span>{result?.correct===true?"Correct · "+result.awarded+"/"+result.points+" marks":result?.correct===false?"Not correct · 0/"+result.points+" marks":"Sent to your teacher for review"}</span>
            </div>}
            {submission&&result?.explanation&&<p className="assigned-explanation">{result.explanation}</p>}
          </article>;
        })}
        {submission?<div className="assigned-submission-result"><Trophy size={24}/><div><strong>{submission.score} / {submission.totalPoints} marks · {submission.percentage}%</strong><span>{submission.manualReview?submission.manualReview+" written response(s) require teacher marking.":"Your result has been saved to Studyspace."}</span></div><button type="button" className="secondary-button" onClick={back}>Close</button></div>:
          <div className="assigned-submit-row"><span>Your answers are marked securely by Studyspace.</span><button type="button" className="primary-button" onClick={()=>void submit()} disabled={busy}>{busy?"Submitting…":"Submit assessment"} <Send size={15}/></button></div>}
      </div>:
      assignments.length?<div className="assigned-assessment-list">{assignments.map(item=><article className="assigned-assessment-card" key={item.id}>
        <div className="assigned-assessment-icon"><BookOpen size={19}/></div>
        <div className="assigned-assessment-copy"><strong>{item.set.title}</strong><span>{item.set.subject_name} · {item.questions.length} questions · {item.set.duration_minutes} min</span><small>{item.due_at?"Due "+new Date(item.due_at).toLocaleDateString():"No due date"}</small>{attemptsByAssignment[item.id]&&<small>Last submitted: {Number(attemptsByAssignment[item.id].score)} / {Number(attemptsByAssignment[item.id].total_points)} · {attemptsByAssignment[item.id].marked_at?"Teacher marked":"Awaiting teacher marking"}</small>}{attemptsByAssignment[item.id]?.teacher_feedback&&<small>Teacher feedback: {attemptsByAssignment[item.id].teacher_feedback}</small>}</div>
        {item.due_at&&new Date(item.due_at).getTime()<Date.now()?<button type="button" className="secondary-button" disabled>Deadline passed</button>:<button type="button" className="primary-button" onClick={()=>begin(item)}>Open <ChevronRight size={15}/></button>}
      </article>)}</div>:
      <div className="assigned-assessment-empty"><ShieldCheck size={27}/><strong>No assigned assessments</strong><span>When your teacher publishes a test or assignment to your account, it will appear here.</span></div>}
  </section>;
}
