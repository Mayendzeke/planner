import { useCallback, useEffect, useState } from "react";
import { Camera, CheckCircle2, Clock3, Image, MessageCircle, Send } from "lucide-react";
import { supabase } from "../lib/supabase";
type HelpRow={id:string;question_text:string;image_path:string|null;status:string;created_at:string;fallback_due_at:string;mia_response:string|null;teacher_response:string|null;image_url?:string};
const bucket="studyspace-homework-help";
const labels:Record<string,string>={waiting_for_teacher:"Sent to your teacher · waiting for a reply",mia_generating:"MIΛ is preparing an explanation",mia_replied:"MIΛ has replied · your teacher can still follow up",teacher_replied:"Your teacher has replied",teacher_replied_after_mia:"Your teacher has also sent a follow-up",mia_failed:"MIΛ could not prepare an answer · your teacher can still help"};
export default function SchoolHomeworkHelp(){
 const [question,setQuestion]=useState(""),[file,setFile]=useState<File|null>(null),[rows,setRows]=useState<HelpRow[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("StudySpace cloud access is unavailable.");setLoading(false);return;}
  const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||!auth.user){setError("Sign in again to view homework help.");setLoading(false);return;}
  const {data,error:queryError}=await supabase.from("homework_help_requests").select("id,question_text,image_path,status,created_at,fallback_due_at,mia_response,teacher_response").eq("learner_id",auth.user.id).order("created_at",{ascending:false}).limit(20);
  if(queryError){setError("Your homework requests could not be loaded: "+queryError.message);setLoading(false);return;}
  const next=await Promise.all((data||[]).map(async item=>{let image_url:string|undefined;if(item.image_path){const {data:signed}=await supabase!.storage.from(bucket).createSignedUrl(item.image_path,600);image_url=signed?.signedUrl;}return {...item,image_url} as HelpRow;}));
  setRows(next);setError("");setLoading(false);
 },[]);
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),10000);return()=>window.clearInterval(timer);},[load]);
 const submit=async()=>{
  if(!supabase||busy)return;
  if(question.trim().length>5000){setError("Your question must be 5,000 characters or fewer.");return;}
  if(!question.trim()&&!file){setError("Type your question or attach a clear photo of the homework.");return;}
  if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)){setError("Upload a JPG, PNG or WebP photo up to 5 MB.");return;}
  setBusy(true);setError("");setNotice("");let path:string|null=null;
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||!auth.user)throw new Error("Sign in again before sending homework.");
   if(file){const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";path=auth.user.id+"/"+crypto.randomUUID()+"."+ext;const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});if(uploadError)throw new Error("The homework photo could not be uploaded: "+uploadError.message);}
   const {error:insertError}=await supabase.from("homework_help_requests").insert({learner_id:auth.user.id,question_text:question.trim(),image_path:path,status:"waiting_for_teacher"});
   if(insertError)throw insertError;setQuestion("");setFile(null);const input=document.getElementById("studyspace-homework-photo") as HTMLInputElement|null;if(input)input.value="";
   setNotice("Your question has been sent to your teacher. MIΛ is scheduled to prepare an explanation if there is no teacher reply after two minutes.");await load();
  }catch(reason){if(path)await supabase.storage.from(bucket).remove([path]);setError(reason instanceof Error?reason.message:"Your homework question could not be sent.");}
  finally{setBusy(false);}
 };
 return <section className="assigned-assessments school-homework-help"><div className="section-heading"><div><span className="eyebrow">ASK YOUR TEACHER</span><h2>Homework from my school</h2><p>Ask for help with a question. Type it or attach a clear photo of the page.</p></div><MessageCircle size={21}/></div>
  {error&&<div className="assigned-assessment-error" role="alert">{error}</div>}{notice&&<div className="assigned-draft-saved" role="status">{notice}</div>}
  <label className="school-homework-question">Your question<textarea rows={4} maxLength={5000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Type the question and tell us which part you are finding difficult…"/></label>
  <label className="school-homework-photo"><Camera size={17}/><span>{file?file.name:"Attach a homework photo (JPG, PNG or WebP, up to 5 MB)"}</span><input id="studyspace-homework-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
  <button type="button" className="primary-button" onClick={()=>void submit()} disabled={busy}>{busy?"Sending…":"Send homework question"} <Send size={15}/></button>
  <div className="school-homework-history"><div className="section-heading"><div><h3>My requests</h3><p>New replies appear here automatically.</p></div><Image size={18}/></div>
   {loading?<p>Loading your homework requests…</p>:rows.length===0?<p>No homework questions sent yet.</p>:rows.map(row=><article className="school-homework-request" key={row.id}>
    <div className="school-homework-status"><strong>{labels[row.status]||row.status}</strong><small>{new Date(row.created_at).toLocaleString()}</small></div>
    {row.question_text&&<p>{row.question_text}</p>}{row.image_url&&<a href={row.image_url} target="_blank" rel="noreferrer">View your uploaded photo</a>}
    {row.mia_response&&<div className="school-homework-answer mia"><strong><MessageCircle size={14}/> MIΛ explanation</strong><p>{row.mia_response}</p></div>}
    {row.teacher_response&&<div className="school-homework-answer teacher"><strong><CheckCircle2 size={14}/> Teacher response</strong><p>{row.teacher_response}</p></div>}
    {!row.mia_response&&!row.teacher_response&&<small className="school-homework-wait"><Clock3 size={13}/> MIΛ fallback scheduled for {new Date(row.fallback_due_at).toLocaleTimeString()}.</small>}
   </article>)}
  </div>
 </section>;
}