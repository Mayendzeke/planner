import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import type { Subject } from "../data/db";
import { supabase } from "../lib/supabase";
import { prepareAssessmentProgramme } from "../lib/cloudSync";

type PracticeRequest = {
  id: string;
  subject_name: string;
  topic: string;
  question_count: number;
  status: string;
  exercise_assignment_id: string | null;
  error_message: string | null;
  created_at: string;
  language?: string;
};

const statusLabel: Record<string,string> = {
  queued: "Queued for preparation",
  waiting_for_material: "Awaiting Monitor approval",
  waiting_for_study_pack: "Preparing study material",
  ready: "Stored practice test ready",
  failed: "Could not be prepared",
  cancelled: "Cancelled",
};

export default function PracticeRequestBuilder({
  subjects,
  onRefreshAssignments,
}: {
  subjects: Subject[];
  onRefreshAssignments: () => void;
}) {
  const [subjectName,setSubjectName] = useState(subjects[0]?.name || "");
  const [topic,setTopic] = useState("");
  const [questionCount,setQuestionCount] = useState("10");
  const [difficulty,setDifficulty] = useState("adaptive");
  const [language,setLanguage] = useState("English");
  const [requests,setRequests] = useState<PracticeRequest[]>([]);
  const [loading,setLoading] = useState(true);
  const [submitting,setSubmitting] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");

  async function loadRequests() {
    if (!supabase) { setRequests([]); setLoading(false); return; }
    try {
      const {data:authState,error:authError} = await supabase.auth.getUser();
      if (authError || !authState.user) { setRequests([]); return; }
      const {data,error:queryError} = await supabase.from("learner_practice_requests")
        .select("id,subject_name,topic,question_count,language,status,exercise_assignment_id,error_message,created_at")
        .eq("learner_id",authState.user.id).order("created_at",{ascending:false}).limit(12);
      if (queryError) throw queryError;
      setRequests((data || []) as PracticeRequest[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Practice requests could not be refreshed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!subjects.some(item=>item.name===subjectName)) setSubjectName(subjects[0]?.name || "");
  },[subjects,subjectName]);

  useEffect(() => {
    if (!supabase) return;
    void (async()=>{
      const {data:authState}=await supabase.auth.getUser();
      if (!authState.user) return;
      const {data:preferences}=await supabase.from("assessment_schedule_preferences").select("language").eq("learner_id",authState.user.id).maybeSingle();
      if (preferences?.language) setLanguage(String(preferences.language));
    })();
  },[]);

  useEffect(() => {
    void loadRequests();
    const timer=window.setInterval(()=>void loadRequests(),20000);
    const onFocus=()=>{if(document.visibilityState==="visible")void loadRequests();};
    window.addEventListener("focus",onFocus);
    return ()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);};
  },[]);

  async function requestPractice(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase||!subjectName||submitting)return;
    setSubmitting(true);setError("");setNotice("");
    try {
      const {data,error:invokeError}=await supabase.functions.invoke("assessment-scheduler",{
        body:{
          action:"request_practice",
          subjectName,
          topic:topic.trim(),
          questionCount:Number(questionCount),
          difficulty,
          language,
        },
      });
      if(invokeError) {
        const context=(invokeError as {context?:Response}).context;
        if(context instanceof Response) {
          try {
            const payload=await context.clone().json();
            throw new Error(payload.error||payload.message||"The practice request could not be saved.");
          } catch(reason) {
            if(reason instanceof Error&&reason.message!=="Unexpected end of JSON input")throw reason;
          }
        }
        throw invokeError;
      }
      if(!data?.success)throw new Error(data?.error||"The practice request could not be saved.");
      setTopic("");
      setNotice(String(data.message||"Your practice request has been saved."));
      await prepareAssessmentProgramme();
      await loadRequests();
      onRefreshAssignments();
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"The practice request could not be saved. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate=(value:string)=>new Date(value).toLocaleString(undefined,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  return <section className="practice-request-workspace">
    <section className="practice-request-card">
      <div className="practice-request-heading">
        <span className="practice-request-icon"><Sparkles size={19}/></span>
        <div><span className="eyebrow">PERSONALISED PRACTICE</span><h3>Request a stored practice test</h3>
          <p>Choose a registered subject and topic. Study Space prepares a saved test from your approved learning material. When material is missing, it is requested through Monitor review.</p>
        </div>
      </div>
      <form className="practice-request-form" onSubmit={requestPractice}>
        <label>Subject
          <select value={subjectName} onChange={event=>setSubjectName(event.target.value)} required disabled={!subjects.length}>
            {subjects.map(item=><option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>Topic (optional)
          <input value={topic} onChange={event=>setTopic(event.target.value)} maxLength={180} placeholder="e.g. Linear equations, poetry analysis"/>
        </label>
        <label>Questions
          <select value={questionCount} onChange={event=>setQuestionCount(event.target.value)}>
            <option value="5">5 questions</option><option value="10">10 questions</option><option value="15">15 questions</option><option value="20">20 questions</option>
          </select>
        </label>
        <label>Difficulty
          <select value={difficulty} onChange={event=>setDifficulty(event.target.value)}>
            <option value="adaptive">Adapt to my progress</option><option value="foundation">Foundation</option><option value="standard">Standard</option><option value="challenge">Challenge</option>
          </select>
        </label>
        <label>Questions &amp; instructions language
          <select value={language} onChange={event=>setLanguage(event.target.value)}>
            <option>English</option><option>SiSwati</option><option>French</option><option>Portuguese</option><option>Afrikaans</option><option>Arabic</option><option>Mandarin Chinese</option><option>Spanish</option>
          </select>
        </label>
        <button className="primary-button practice-request-submit" type="submit" disabled={submitting||!subjects.length}>
          {submitting?<><LoaderCircle size={15} className="practice-request-spin"/> Preparing request…</>:<><BookOpen size={15}/> Prepare practice test</>}
        </button>
      </form>
      {notice&&<p className="practice-request-message success" role="status"><CheckCircle2 size={15}/>{notice}</p>}
      {error&&<p className="practice-request-message error" role="alert">{error}</p>}
    </section>
    <section className="practice-request-history">
      <div className="practice-request-history-heading"><div><span className="eyebrow">YOUR SAVED REQUESTS</span><h3>Practice test queue</h3></div><button className="text-button" type="button" onClick={()=>void loadRequests()}><RefreshCw size={14}/> Refresh</button></div>
      {loading?<div className="practice-request-empty"><LoaderCircle size={17}/> Loading your practice requests…</div>
      :requests.length?<div className="practice-request-list">{requests.map(item=><article key={item.id} className="practice-request-row">
        <div><strong>{item.subject_name}{item.topic?" · "+item.topic:""}</strong><p>{item.question_count} questions · {item.language||"English"} · {formatDate(item.created_at)}</p>{item.error_message&&item.status==="failed"&&<small>{item.error_message}</small>}</div>
        <span className={"practice-request-status status-"+item.status}><i/>{statusLabel[item.status]||item.status}</span>
      </article>)}</div>
      :<div className="practice-request-empty"><Clock3 size={18}/><span>Your requested practice tests will appear here after you submit one.</span></div>}
      <p className="practice-request-footnote">Tests are saved in your account and remain available independently of your MIΛ chat history.</p>
    </section>
  </section>;
}
