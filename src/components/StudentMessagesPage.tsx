import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Paperclip, Search, RefreshCw, FileText, CheckCheck, UserPlus, ShieldCheck, X, AlertCircle, Camera } from "lucide-react";
import { supabase } from "../lib/supabase";
import StudyspaceGroupsPanel from "./StudyspaceGroupsPanel";

type Contact={contact_id:string;display_name:string;grade:string;contact_type:"teacher"|"student"};
type Message={id:string;sender_id:string;recipient_id:string;body:string;attachment_path:string|null;attachment_name:string;attachment_mime:string;attachment_size:number;created_at:string;read_at:string|null};
type SearchLearner={learner_id:string;display_name:string;grade:string;can_invite:boolean};
type Invite={request_id:string;requester_id:string;display_name:string;grade:string;created_at:string};
type Connection={id:string;requester_id:string;addressee_id:string;status:string};

const allowed=["image/jpeg","image/png","image/webp","application/pdf","text/plain"];
const ext=(file:File)=>({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf","text/plain":"txt"} as Record<string,string>)[file.type]||"";

export default function StudentMessagesPage(){
  const [userId,setUserId]=useState("");
  const [mailbox,setMailbox]=useState<"inbox"|"sent"|"groups">("inbox");
  const [contacts,setContacts]=useState<Contact[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [selected,setSelected]=useState("");
  const [pending,setPending]=useState<Invite[]>([]);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [search,setSearch]=useState("");
  const [results,setResults]=useState<SearchLearner[]>([]);
  const [searching,setSearching]=useState(false);
  const [draft,setDraft]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [signedUrls,setSignedUrls]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [requestBusy,setRequestBusy]=useState("");
  const [homeworkHelpOpen,setHomeworkHelpOpen]=useState(false);
  const [helpQuestion,setHelpQuestion]=useState("");
  const [helpFile,setHelpFile]=useState<File|null>(null);
  const [helpBusy,setHelpBusy]=useState(false);
  const bottomRef=useRef<HTMLDivElement>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  const refresh=async()=>{
    if(!supabase){setError("Studyspace is not connected.");setLoading(false);return;}
    setLoading(true);setError("");
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user)throw new Error("Your student session has expired. Sign in again.");
      const id=auth.user.id;setUserId(id);
      const [c,m,p,co]=await Promise.all([
        supabase.rpc("get_studyspace_message_contacts"),
        supabase.from("direct_messages").select("id,sender_id,recipient_id,body,attachment_path,attachment_name,attachment_mime,attachment_size,created_at,read_at").or("sender_id.eq."+id+",recipient_id.eq."+id).order("created_at",{ascending:true}).limit(400),
        supabase.rpc("get_studyspace_pending_friend_requests"),
        supabase.from("student_connections").select("id,requester_id,addressee_id,status").or("requester_id.eq."+id+",addressee_id.eq."+id)
      ]);
      const failure=[c.error,m.error,p.error,co.error].find(Boolean);if(failure)throw failure;
      const contactRows=(c.data??[]) as Contact[];
      setContacts(contactRows);setSelected(current=>current&&contactRows.some(x=>x.contact_id===current)?current:(contactRows[0]?.contact_id??""));
      setMessages((m.data??[]) as Message[]);setPending((p.data??[]) as Invite[]);setConnections((co.data??[]) as Connection[]);
    }catch(reason){setError(reason instanceof Error?reason.message:"Your messages could not be loaded.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{
    if(!supabase||!userId)return;
    const channel=supabase.channel("student-direct-messages-"+userId)
      .on("postgres_changes",{event:"*",schema:"public",table:"direct_messages"},()=>void refreshMessages())
      .on("postgres_changes",{event:"*",schema:"public",table:"student_connections"},()=>void refreshRequests())
      .subscribe();
    return()=>{void supabase?.removeChannel(channel);};
  },[userId]);
  async function refreshMessages(){
    if(!supabase||!userId)return;
    const {data,error:e}=await supabase.from("direct_messages").select("id,sender_id,recipient_id,body,attachment_path,attachment_name,attachment_mime,attachment_size,created_at,read_at").or("sender_id.eq."+userId+",recipient_id.eq."+userId).order("created_at",{ascending:true}).limit(400);
    if(e)setError(e.message);else setMessages((data??[]) as Message[]);
  }
  async function refreshRequests(){
    if(!supabase)return;
    const [p,c,co]=await Promise.all([
      supabase.rpc("get_studyspace_pending_friend_requests"),
      supabase.rpc("get_studyspace_message_contacts"),
      supabase.from("student_connections").select("id,requester_id,addressee_id,status").or("requester_id.eq."+userId+",addressee_id.eq."+userId)
    ]);
    if(p.error||c.error||co.error){setError(p.error?.message||c.error?.message||co.error?.message||"Friend list could not be updated.");return;}
    setPending((p.data??[]) as Invite[]);setContacts((c.data??[]) as Contact[]);setConnections((co.data??[]) as Connection[]);
  }
  const draftWords=draft.trim()?draft.trim().split(/\s+/).length:0;
  const thread=messages.filter(m=>(m.sender_id===userId&&m.recipient_id===selected)||(m.sender_id===selected&&m.recipient_id===userId));
  const selectedContact=contacts.find(c=>c.contact_id===selected);
  const visibleContacts=useMemo(()=>contacts.filter(c=>(mailbox!=="sent"||messages.some(m=>m.sender_id===userId&&m.recipient_id===c.contact_id))&&(c.display_name+" "+c.grade).toLowerCase().includes(search.toLowerCase())),[contacts,search,messages,mailbox,userId]);
  const unread=new Map<string,number>();messages.filter(m=>m.recipient_id===userId&&!m.read_at).forEach(m=>unread.set(m.sender_id,(unread.get(m.sender_id)||0)+1));
  useEffect(()=>{
    if(!selected||!userId||!supabase)return;
    if(messages.some(m=>m.sender_id===selected&&m.recipient_id===userId&&!m.read_at)){
      void supabase.from("direct_messages").update({read_at:new Date().toISOString()}).eq("sender_id",selected).eq("recipient_id",userId).is("read_at",null);
    }
  },[selected,userId,messages.length]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[thread.length,selected]);
  useEffect(()=>{
    let alive=true;
    const fetchFiles=async()=>{
      if(!supabase)return;
      const missing=thread.filter(m=>m.attachment_path&&!signedUrls[m.id]);
      const rows=await Promise.all(missing.map(async m=>{
        const {data,error:e}=await supabase!.storage.from("studyspace-direct-messages").createSignedUrl(m.attachment_path!,1800);
        return [m.id,e?"":data.signedUrl] as const;
      }));
      if(alive)setSignedUrls(v=>({...v,...Object.fromEntries(rows.filter(x=>x[1]))}));
    };
    void fetchFiles();return()=>{alive=false;};
  },[thread.map(m=>m.id+":"+(m.attachment_path||"")).join("|")]);

  useEffect(()=>{
    let alive=true;
    const searchLearners=async()=>{
      if(!supabase||search.trim().length<2){setResults([]);return;}
      setSearching(true);
      const {data,error:e}=await supabase.rpc("search_studyspace_learners",{p_query:search.trim()});
      if(alive){if(e)setError(e.message);else setResults((data??[]) as SearchLearner[]);setSearching(false);}
    };
    const id=window.setTimeout(()=>void searchLearners(),250);
    return()=>{alive=false;window.clearTimeout(id);};
  },[search]);

  const sendInvite=async(learner:SearchLearner)=>{
    if(!supabase||!userId||!learner.can_invite||requestBusy)return;
    setRequestBusy(learner.learner_id);setError("");setNotice("");
    const {error:e}=await supabase.from("student_connections").insert({requester_id:userId,addressee_id:learner.learner_id,status:"pending"});
    if(e)setError(e.message);else{setNotice("Invitation sent. Messaging opens after they accept.");await refreshRequests();}
    setRequestBusy("");
  };
  const respond=async(invite:Invite,accept:boolean)=>{
    if(!supabase||requestBusy)return;
    setRequestBusy(invite.request_id);setError("");setNotice("");
    const {error:e}=await supabase.from("student_connections").update({status:accept?"accepted":"rejected",updated_at:new Date().toISOString()}).eq("id",invite.request_id).eq("status","pending");
    if(e)setError(e.message);else{setNotice(accept?"Friend request accepted. You can now message each other.":"Friend request declined.");await refreshRequests();}
    setRequestBusy("");
  };
  const send=async(event:React.FormEvent)=>{
    event.preventDefault();if(!supabase||!userId||!selected||sending)return;
    const body=draft.trim();if(!body&&!file)return;
    if(body.length>2000){setError("Messages are limited to 2,000 characters.");return;}
    if(body&&body.split(/\s+/).length>350){setError("Messages are limited to 350 words.");return;}
    if(file&&(file.size>5*1024*1024||!allowed.includes(file.type))){setError("Attachments must be a PDF, JPG, PNG, WebP or TXT file up to 5 MB.");return;}
    setSending(true);setError("");setNotice("");let path:string|null=null;
    try{
      if(file){
        const suffix=ext(file);if(!suffix)throw new Error("This attachment type is not supported.");
        path=userId+"/"+crypto.randomUUID()+"."+suffix;
        const {error:uploadError}=await supabase.storage.from("studyspace-direct-messages").upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError)throw uploadError;
      }
      const {error:e}=await supabase.from("direct_messages").insert({sender_id:userId,recipient_id:selected,body,attachment_path:path,attachment_name:file?.name||"",attachment_mime:file?.type||"",attachment_size:file?.size||0});
      if(e)throw e;
      setDraft("");setFile(null);if(fileRef.current)fileRef.current.value="";
      await refreshMessages();
    }catch(reason){if(path)await supabase.storage.from("studyspace-direct-messages").remove([path]);setError(reason instanceof Error?reason.message:"Message could not be sent.");}
    finally{setSending(false);}
  };
  const byteLabel=(n:number)=>n<1024*1024?Math.max(1,Math.round(n/1024))+" KB":(n/1024/1024).toFixed(1)+" MB";
  const submitHomeworkHelp=async()=>{
    if(!supabase||!userId||helpBusy)return;
    const question=helpQuestion.trim();
    if(!question&&!helpFile){setError("Write your homework question or attach a photo.");return;}
    if(question.length>5000){setError("Homework questions are limited to 5,000 characters.");return;}
    if(helpFile&&(!["image/jpeg","image/png","image/webp"].includes(helpFile.type)||helpFile.size>5*1024*1024)){setError("Use a JPG, PNG or WebP photo up to 5 MB.");return;}
    setHelpBusy(true);setError("");setNotice("");
    let path:string|null=null;
    try{
      if(helpFile){
        const suffix=helpFile.type==="image/png"?"png":helpFile.type==="image/webp"?"webp":"jpg";
        path=userId+"/"+crypto.randomUUID()+"."+suffix;
        const {error:uploadError}=await supabase.storage.from("studyspace-homework-help").upload(path,helpFile,{contentType:helpFile.type,upsert:false,cacheControl:"3600"});
        if(uploadError)throw uploadError;
      }
      const {error:insertError}=await supabase.from("homework_help_requests").insert({learner_id:userId,question_text:question,image_path:path,status:"waiting_for_teacher"});
      if(insertError)throw insertError;
      setHelpQuestion("");setHelpFile(null);setHomeworkHelpOpen(false);
      setNotice("Homework help request sent to your teacher. You can continue chatting while they prepare a reply.");
    }catch(reason){
      if(path)await supabase.storage.from("studyspace-homework-help").remove([path]);
      setError(reason instanceof Error?reason.message:"Homework help request could not be sent.");
    }finally{setHelpBusy(false);}
  };
  const existingConnection=(id:string)=>connections.find(c=>c.requester_id===id&&c.addressee_id===userId||c.addressee_id===id&&c.requester_id===userId);

  return <div className="subpage student-messages-page">
    <div className="student-messages-intro"><div><div className="eyebrow"><MessageCircle size={14}/> STUDYSPACE MESSAGES</div><h2>Your conversations</h2><p>Message your teacher privately. You can also connect with other students after they accept your invitation.</p></div><div className="student-message-head-actions"><button className="secondary-button" type="button" onClick={()=>setHomeworkHelpOpen(v=>!v)}><MessageCircle size={14}/>{homeworkHelpOpen?"Close help request":"Request homework help"}</button><button className="secondary-button" type="button" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/>{loading?"Refreshing…":"Refresh"}</button></div></div>
    {homeworkHelpOpen&&<section className="glass-panel student-homework-quick-request">
      <div><strong>Ask your teacher about homework</strong><p>This creates a school homework-help request in the Monitor inbox. MIA may prepare an explanation while you wait for your teacher.</p></div>
      <textarea rows={3} maxLength={5000} value={helpQuestion} onChange={e=>setHelpQuestion(e.target.value)} placeholder="Describe the question and which part you find difficult…"/>
      <label className="student-homework-attach"><Camera size={15}/><span>{helpFile?helpFile.name:"Attach a homework photo · JPG, PNG or WebP · 5 MB max"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setHelpFile(e.target.files?.[0]||null)}/></label>
      <div><button type="button" className="secondary-button" onClick={()=>setHomeworkHelpOpen(false)} disabled={helpBusy}>Cancel</button><button type="button" className="primary-button" onClick={()=>void submitHomeworkHelp()} disabled={helpBusy||(!helpQuestion.trim()&&!helpFile)}>{helpBusy?"Sending…":"Send request"} <Send size={14}/></button></div>
    </section>}
    {error&&<p className="inline-message error-message" role="alert"><AlertCircle size={15}/>{error}</p>}{notice&&<p className="inline-message" role="status">{notice}</p>}
    <nav className="ss-mailbox-tabs" aria-label="Message folders">
      <button className={mailbox==="inbox"?"is-active":""} onClick={()=>setMailbox("inbox")}><MessageCircle size={14}/> Inbox</button>
      <button className={mailbox==="sent"?"is-active":""} onClick={()=>setMailbox("sent")}><Send size={14}/> Sent</button>
      <button className={mailbox==="groups"?"is-active":""} onClick={()=>setMailbox("groups")}><Users size={14}/> Groups</button>
    </nav>
    {mailbox==="groups"?<StudyspaceGroupsPanel/>:<div className="student-message-layout">
      <aside className="student-message-contacts">
        <div className="student-message-contact-head"><strong>Conversations</strong><span>{contacts.length}</span></div>
        <label className="monitor-contact-search"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find or add a student"/></label>
        {search.trim().length>=2&&<div className="student-peer-search"><strong>Student directory</strong>{searching?<p>Searching…</p>:results.length?results.map(r=>{
          const connection=existingConnection(r.learner_id);
          const status=connection?.status;
          return <article key={r.learner_id}><div><strong>{r.display_name}</strong><small>{r.grade||"Student"}{!r.can_invite?" · Guardian approval needed":""}</small></div>{status==="accepted"?<span className="student-peer-status">Connected</span>:status==="pending"?<span className="student-peer-status">Invite pending</span>:status==="rejected"?<span className="student-peer-status">Closed</span>:<button type="button" className="secondary-button" disabled={!r.can_invite||requestBusy===r.learner_id} onClick={()=>void sendInvite(r)}><UserPlus size={13}/>{requestBusy===r.learner_id?"Sending…":"Invite"}</button>}</article>;
        }):<p>No active learners match that search.</p>}</div>}
        {pending.length>0&&<div className="student-peer-invites"><strong>Friend requests <span>{pending.length}</span></strong>{pending.map(r=><article key={r.request_id}><div><strong>{r.display_name}</strong><small>{r.grade||"Student"} · wants to connect</small></div><div><button type="button" className="secondary-button" disabled={requestBusy===r.request_id} onClick={()=>void respond(r,true)}>Accept</button><button type="button" className="text-button" disabled={requestBusy===r.request_id} onClick={()=>void respond(r,false)}>Decline</button></div></article>)}</div>}
        <div className="student-message-contact-list">{visibleContacts.map(c=>{const last=messages.filter(m=>m.sender_id===c.contact_id||m.recipient_id===c.contact_id);const lastMessage=last[last.length-1];const count=unread.get(c.contact_id)||0;return <button type="button" key={c.contact_id} className={"monitor-contact-item"+(selected===c.contact_id?" is-active":"")} onClick={()=>setSelected(c.contact_id)}><span className="monitor-contact-avatar">{c.display_name.slice(0,1).toUpperCase()}</span><span className="monitor-contact-copy"><strong>{c.display_name}</strong><small>{lastMessage?.body||lastMessage?.attachment_name||(c.contact_type==="teacher"?"Teacher · Studyspace Monitor":"Student connection")}</small></span>{count>0&&<i className="monitor-contact-unread">{count}</i>}</button>;})}{!loading&&!visibleContacts.length&&<p className="monitor-message-empty">Your teacher and accepted student connections will appear here.</p>}</div>
      </aside>
      <section className="monitor-conversation">
        {selectedContact?<><header className="monitor-conversation-head"><div><span className="monitor-contact-avatar">{selectedContact.display_name.slice(0,1).toUpperCase()}</span><div><strong>{selectedContact.display_name}</strong><small>{selectedContact.contact_type==="teacher"?"Teacher · Studyspace Monitor":selectedContact.grade||"Student connection"}</small></div></div><span className="monitor-secure-label"><ShieldCheck size={13}/> Private</span></header>
          <div className="monitor-message-list">{thread.length?thread.map(m=><article key={m.id} className={"monitor-message-bubble"+(m.sender_id===userId?" is-outgoing":"")}><div>{m.body&&<p>{m.body}</p>}{m.attachment_path&&<a className="monitor-message-attachment" href={signedUrls[m.id]||"#"} target="_blank" rel="noreferrer" onClick={e=>{if(!signedUrls[m.id])e.preventDefault();}}><FileText size={16}/><span>{m.attachment_name||"Attachment"}<small>{byteLabel(m.attachment_size)}</small></span></a>}</div><time>{new Date(m.created_at).toLocaleString([], {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}{m.sender_id===userId&&<CheckCheck size={13}/>}</time></article>):<div className="monitor-message-empty"><MessageCircle size={24}/><strong>No messages yet</strong><span>Send your first message to {selectedContact.display_name}.</span></div>}<div ref={bottomRef}/></div>
          <form className="monitor-message-composer" onSubmit={send}>{file&&<div className="monitor-message-file"><FileText size={14}/><span>{file.name} · {byteLabel(file.size)}</span><button type="button" onClick={()=>{setFile(null);if(fileRef.current)fileRef.current.value="";}} aria-label="Remove attachment"><X size={13}/></button></div>}<div className="monitor-message-compose-row"><button className="icon-button" type="button" aria-label="Attach file" onClick={()=>fileRef.current?.click()}><Paperclip size={17}/></button><input ref={fileRef} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" onChange={e=>setFile(e.target.files?.[0]||null)}/><textarea value={draft} maxLength={2000} rows={2} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" aria-label="Message text"/><button className="primary-button" type="submit" disabled={sending||(!draft.trim()&&!file)||draftWords>350||draft.length>2000}><Send size={15}/>{sending?"Sending…":"Send"}</button></div><div className="monitor-message-limits"><span>350 words / 2,000 characters max · Attachments up to 5 MB</span><span>{draftWords}/350 words · {draft.length}/2,000</span></div></form>
        </>:<div className="monitor-message-empty"><MessageCircle size={28}/><strong>{loading?"Opening your messages…":"Choose a conversation"}</strong><span>Start with your teacher or connect with another learner after an accepted invitation.</span></div>}
      </section>
    </div>
    }
    <p className="student-peer-safety-note"><ShieldCheck size={14}/> Peer chat is only enabled when both students are adults or have verified guardian consent. Teacher messages remain available. Use messages for learning and keep personal information private.</p>
  </div>;
}
