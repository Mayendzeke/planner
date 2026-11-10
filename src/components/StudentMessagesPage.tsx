import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Paperclip, Search, RefreshCw, FileText, UserPlus, ShieldCheck, X, AlertCircle, Camera, Users, Pin, Archive, ArchiveRestore } from "lucide-react";
import { supabase } from "../lib/supabase";
import StudyspaceGroupsPanel from "./StudyspaceGroupsPanel";

type Contact={contact_id:string;display_name:string;grade:string;contact_type:"teacher"|"student"};
type Message={id:string;sender_id:string;recipient_id:string;body:string;attachment_path:string|null;attachment_name:string;attachment_mime:string;attachment_size:number;created_at:string;read_at:string|null;delivered_at:string|null;edited_at:string|null;unsent_at:string|null;deleted_for_everyone_at:string|null};
type SearchLearner={learner_id:string;display_name:string;grade:string;can_invite:boolean};
type Invite={request_id:string;requester_id:string;display_name:string;grade:string;created_at:string};
type Connection={id:string;requester_id:string;addressee_id:string;status:string};
type ConversationFilter="all"|"unread"|"pinned"|"archived";
const readContactIds=(key:string):string[]=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value.filter((id):id is string=>typeof id==="string"):[];}catch{return [];}};

const allowed=["image/jpeg","image/png","image/webp","application/pdf","text/plain"];
const ext=(file:File)=>({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf","text/plain":"txt"} as Record<string,string>)[file.type]||"";

export default function StudentMessagesPage(){
  const [userId,setUserId]=useState("");
  const [mailbox,setMailbox]=useState<"inbox"|"sent"|"groups">("inbox");
  const [conversationFilter,setConversationFilter]=useState<ConversationFilter>("all");
  const [pinnedIds,setPinnedIds]=useState<string[]>([]);
  const [archivedIds,setArchivedIds]=useState<string[]>([]);
  const [threadSearch,setThreadSearch]=useState("");
  const [presence,setPresence]=useState<Record<string,string>>({});
  const [contacts,setContacts]=useState<Contact[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [hiddenMessageIds,setHiddenMessageIds]=useState<string[]>([]);
  const [editingMessageId,setEditingMessageId]=useState<string|null>(null);
  const [editingMessageDraft,setEditingMessageDraft]=useState("");
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
      const [c,m,p,co,d]=await Promise.all([
        supabase.rpc("get_studyspace_message_contacts"),
        supabase.from("direct_messages").select("id,sender_id,recipient_id,body,attachment_path,attachment_name,attachment_mime,attachment_size,created_at,read_at,delivered_at,edited_at,unsent_at,deleted_for_everyone_at").or("sender_id.eq."+id+",recipient_id.eq."+id).order("created_at",{ascending:true}).limit(400),
        supabase.rpc("get_studyspace_pending_friend_requests"),
        supabase.from("student_connections").select("id,requester_id,addressee_id,status").or("requester_id.eq."+id+",addressee_id.eq."+id),
         supabase.from("direct_message_user_deletions").select("message_id").eq("user_id",id)
      ]);
      const failure=[c.error,m.error,p.error,co.error,d.error].find(Boolean);if(failure)throw failure;
      const contactRows=(c.data??[]) as Contact[];
      setContacts(contactRows);setSelected(current=>current&&contactRows.some(x=>x.contact_id===current)?current:(contactRows[0]?.contact_id??""));
      const rows=(m.data??[]) as Message[];setMessages(rows);setHiddenMessageIds((d.data??[]).map(x=>x.message_id));const undelivered=rows.filter(x=>x.recipient_id===id&&!x.delivered_at);if(undelivered.length)void supabase.from("direct_messages").update({delivered_at:new Date().toISOString()}).in("id",undelivered.map(x=>x.id));setPending((p.data??[]) as Invite[]);setConnections((co.data??[]) as Connection[]);const {data:presenceRows}=await supabase.from("studyspace_user_presence").select("user_id,last_seen_at").in("user_id",contactRows.map(x=>x.contact_id));const pmap:Record<string,string>={};(presenceRows??[]).forEach((x:any)=>pmap[x.user_id]=Date.now()-new Date(x.last_seen_at).getTime()<120000?"online":x.last_seen_at);setPresence(pmap);
    }catch(reason){setError(reason instanceof Error?reason.message:"Your messages could not be loaded.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{
    if(!userId)return;
    setPinnedIds(readContactIds("studyspace:"+userId+":messages:pinned"));
    setArchivedIds(readContactIds("studyspace:"+userId+":messages:archived"));
  },[userId]);
  const toggleContactPreference=(contactId:string,kind:"pinned"|"archived")=>{
    const current=kind==="pinned"?pinnedIds:archivedIds;
    const next=current.includes(contactId)?current.filter(id=>id!==contactId):[...current,contactId];
    if(kind==="pinned")setPinnedIds(next);else setArchivedIds(next);
    try{if(userId)localStorage.setItem("studyspace:"+userId+":messages:"+kind,JSON.stringify(next));}catch{/* Preference remains available during this session. */}
  };
  useEffect(()=>{
    if(!supabase||!userId)return;
    const channel=supabase.channel("student-direct-messages-"+userId)
      .on("postgres_changes",{event:"*",schema:"public",table:"direct_messages"},()=>void refreshMessages())
      .on("postgres_changes",{event:"*",schema:"public",table:"direct_message_user_deletions",filter:"user_id=eq."+userId},()=>void refreshMessages())
      .on("postgres_changes",{event:"*",schema:"public",table:"student_connections"},()=>void refreshRequests())
      .on("postgres_changes",{event:"*",schema:"public",table:"studyspace_user_presence"},payload=>{const row=payload.new as {user_id:string;last_seen_at:string};if(row?.user_id)setPresence(v=>({...v,[row.user_id]:Date.now()-new Date(row.last_seen_at).getTime()<120000?"online":row.last_seen_at}));})
      .subscribe();
    return()=>{void supabase?.removeChannel(channel);};
  },[userId]);
  async function refreshMessages(){
    if(!supabase||!userId)return;
    const {data,error:e}=await supabase.from("direct_messages").select("id,sender_id,recipient_id,body,attachment_path,attachment_name,attachment_mime,attachment_size,created_at,read_at,delivered_at,edited_at,unsent_at,deleted_for_everyone_at").or("sender_id.eq."+userId+",recipient_id.eq."+userId).order("created_at",{ascending:true}).limit(400);
    if(e)setError(e.message);else{const rows=(data??[]) as Message[];setMessages(rows);const {data:deleted,error:deleteError}=await supabase.from("direct_message_user_deletions").select("message_id").eq("user_id",userId);if(deleteError)setError(deleteError.message);else setHiddenMessageIds((deleted??[]).map(x=>x.message_id));const undelivered=rows.filter(x=>x.recipient_id===userId&&!x.delivered_at);if(undelivered.length)void supabase.from("direct_messages").update({delivered_at:new Date().toISOString()}).in("id",undelivered.map(x=>x.id));}
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
  const thread=messages.filter(m=>!hiddenMessageIds.includes(m.id)&&((m.sender_id===userId&&m.recipient_id===selected)||(m.sender_id===selected&&m.recipient_id===userId)));
  const selectedContact=contacts.find(c=>c.contact_id===selected);
  useEffect(()=>{
    if(!supabase||!userId||mailbox==="groups")return;
    const heartbeat=()=>{if(document.visibilityState==="visible")void supabase!.from("studyspace_user_presence").upsert({user_id:userId,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"user_id"});};
    heartbeat();
    const timer=window.setInterval(heartbeat,45000);
    window.addEventListener("focus",heartbeat);
    document.addEventListener("visibilitychange",heartbeat);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",heartbeat);document.removeEventListener("visibilitychange",heartbeat);};
  },[userId,mailbox]);
  const visibleContacts=useMemo(()=>contacts.filter(c=>{
    const sentMatch=mailbox!=="sent"||messages.some(m=>m.sender_id===userId&&m.recipient_id===c.contact_id);
    const textMatch=(c.display_name+" "+c.grade).toLowerCase().includes(search.toLowerCase());
    const pinned=pinnedIds.includes(c.contact_id),archived=archivedIds.includes(c.contact_id);
    const unread=messages.some(m=>m.sender_id===c.contact_id&&m.recipient_id===userId&&!m.read_at);
    const filterMatch=conversationFilter==="archived"?archived:conversationFilter==="unread"?unread&&!archived:conversationFilter==="pinned"?pinned&&!archived:!archived;
    return sentMatch&&textMatch&&filterMatch;
  }).sort((a,b)=>{
    const pinOrder=Number(pinnedIds.includes(b.contact_id))-Number(pinnedIds.includes(a.contact_id));
    if(pinOrder)return pinOrder;
    const last=(id:string)=>messages.reduce((latest,m)=>m.sender_id===id||m.recipient_id===id?Math.max(latest,new Date(m.created_at).getTime()):latest,0);
    return last(b.contact_id)-last(a.contact_id);
  }),[contacts,search,messages,mailbox,userId,conversationFilter,pinnedIds,archivedIds]);
  const presenceLabel=(id:string)=>presence[id]==="online"?"Online":presence[id]?"Last seen "+new Date(presence[id]).toLocaleString():"Offline";
  const unread=new Map<string,number>();messages.filter(m=>m.recipient_id===userId&&!m.read_at).forEach(m=>unread.set(m.sender_id,(unread.get(m.sender_id)||0)+1));
  const filteredThread=threadSearch.trim()?thread.filter(m=>(m.body+" "+m.attachment_name).toLowerCase().includes(threadSearch.trim().toLowerCase())):thread;
  const unreadConversationCount=contacts.filter(c=>(unread.get(c.contact_id)||0)>0).length;
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
  const canEditMessage=(m:Message)=>m.sender_id===userId&&!m.unsent_at&&!m.deleted_for_everyone_at&&Date.now()-new Date(m.created_at).getTime()<120000;
  const beginEditMessage=(m:Message)=>{if(!canEditMessage(m)){setError("Messages can only be edited by their sender within two minutes.");return;}setEditingMessageId(m.id);setEditingMessageDraft(m.body);setNotice("");setError("");};
  const saveEditedMessage=async(m:Message)=>{
    const body=editingMessageDraft.trim();
    if(!supabase||!userId||editingMessageId!==m.id)return;
    if(!body||body.length>2000||body.split(/\\s+/).filter(Boolean).length>350){setError("Edited messages must contain 1–2,000 characters and no more than 350 words.");return;}
    if(!canEditMessage(m)){setEditingMessageId(null);setError("The two-minute edit window has expired.");return;}
    const {error:e}=await supabase.from("direct_messages").update({body}).eq("id",m.id).eq("sender_id",userId);
    if(e)setError(e.message);else{setEditingMessageId(null);setNotice("Message edited.");await refreshMessages();}
  };
  const unsendMessage=async(m:Message)=>{
    if(!supabase||!userId||m.sender_id!==userId||m.unsent_at||m.deleted_for_everyone_at)return;
    if(!window.confirm("Unsend this message for everyone? The content will be replaced with a message-unsent notice."))return;
    const oldPath=m.attachment_path;
    const {error:e}=await supabase.from("direct_messages").update({body:"This message was unsent.",attachment_path:null,attachment_name:"",attachment_mime:"",attachment_size:0,unsent_at:new Date().toISOString()}).eq("id",m.id).eq("sender_id",userId);
    if(e){setError(e.message);return;}
    if(oldPath)try{await supabase.storage.from("studyspace-direct-messages").remove([oldPath]);}catch{/* The message is already unsent; keep the conversation state. */}
    setEditingMessageId(null);setNotice("Message unsent for everyone.");await refreshMessages();
  };
  const deleteMessageForEveryone=async(m:Message)=>{
    if(!supabase||!userId||m.sender_id!==userId||m.unsent_at||m.deleted_for_everyone_at)return;
    if(!window.confirm("Delete this message for everyone? Its content and attachment will be removed from all participants' conversations."))return;
    const oldPath=m.attachment_path;
    const {error:e}=await supabase.from("direct_messages").update({body:"This message was deleted.",attachment_path:null,attachment_name:"",attachment_mime:"",attachment_size:0,deleted_for_everyone_at:new Date().toISOString()}).eq("id",m.id).eq("sender_id",userId);
    if(e){setError(e.message);return;}
    if(oldPath)try{await supabase.storage.from("studyspace-direct-messages").remove([oldPath]);}catch{/* Message deletion already succeeded. */}
    setEditingMessageId(null);setNotice("Message deleted for everyone.");await refreshMessages();
  };
  const deleteMessageForMe=async(m:Message)=>{
    if(!supabase||!userId)return;
    if(!window.confirm("Delete this message from your view only? Other participants will still see it."))return;
    const {error:e}=await supabase.from("direct_message_user_deletions").upsert({message_id:m.id,user_id:userId},{onConflict:"message_id,user_id",ignoreDuplicates:true});
    if(e){setError(e.message);return;}
    setHiddenMessageIds(old=>old.includes(m.id)?old:[...old,m.id]);
    setNotice("Message deleted from your view.");
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
      <div><strong>Ask your teacher about homework</strong><p>This creates a school homework-help request in the Monitor inbox. MIΛ may prepare an explanation while you wait for your teacher.</p></div>
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
        <nav className="ss-conversation-filters" aria-label="Conversation filters">
          <button type="button" className={conversationFilter==="all"?"is-active":""} onClick={()=>setConversationFilter("all")}>All <span>{contacts.length-archivedIds.filter(id=>contacts.some(c=>c.contact_id===id)).length}</span></button>
          <button type="button" className={conversationFilter==="unread"?"is-active":""} onClick={()=>setConversationFilter("unread")}>Unread <span>{unreadConversationCount}</span></button>
          <button type="button" className={conversationFilter==="pinned"?"is-active":""} onClick={()=>setConversationFilter("pinned")}>Pinned <span>{pinnedIds.filter(id=>contacts.some(c=>c.contact_id===id)&&!archivedIds.includes(id)).length}</span></button>
          <button type="button" className={conversationFilter==="archived"?"is-active":""} onClick={()=>setConversationFilter("archived")}>Archived <span>{archivedIds.filter(id=>contacts.some(c=>c.contact_id===id)).length}</span></button>
        </nav>
        {search.trim().length>=2&&<div className="student-peer-search"><strong>Student directory</strong>{searching?<p>Searching…</p>:results.length?results.map(r=>{
          const connection=existingConnection(r.learner_id);
          const status=connection?.status;
          return <article key={r.learner_id}><div><strong>{r.display_name}</strong><small>{r.grade||"Student"}{!r.can_invite?" · Guardian approval needed":""}</small></div>{status==="accepted"?<span className="student-peer-status">Connected</span>:status==="pending"?<span className="student-peer-status">Invite pending</span>:status==="rejected"?<span className="student-peer-status">Closed</span>:<button type="button" className="secondary-button" disabled={!r.can_invite||requestBusy===r.learner_id} onClick={()=>void sendInvite(r)}><UserPlus size={13}/>{requestBusy===r.learner_id?"Sending…":"Invite"}</button>}</article>;
        }):<p>No active learners match that search.</p>}</div>}
        {pending.length>0&&<div className="student-peer-invites"><strong>Friend requests <span>{pending.length}</span></strong>{pending.map(r=><article key={r.request_id}><div><strong>{r.display_name}</strong><small>{r.grade||"Student"} · wants to connect</small></div><div><button type="button" className="secondary-button" disabled={requestBusy===r.request_id} onClick={()=>void respond(r,true)}>Accept</button><button type="button" className="text-button" disabled={requestBusy===r.request_id} onClick={()=>void respond(r,false)}>Decline</button></div></article>)}</div>}
        <div className="student-message-contact-list">{visibleContacts.map(c=>{const last=messages.filter(m=>m.sender_id===c.contact_id||m.recipient_id===c.contact_id);const lastMessage=last[last.length-1];const count=unread.get(c.contact_id)||0;const pinned=pinnedIds.includes(c.contact_id),archived=archivedIds.includes(c.contact_id);return <div className="ss-contact-row" key={c.contact_id}><button type="button" className={"monitor-contact-item"+(selected===c.contact_id?" is-active":"")} onClick={()=>{setSelected(c.contact_id);setThreadSearch("");}}><span className="monitor-contact-avatar">{c.display_name.slice(0,1).toUpperCase()}</span><span className="monitor-contact-copy"><strong>{c.display_name} <i className={presence[c.contact_id]==="online"?"ss-presence-dot is-online":"ss-presence-dot"} title={presenceLabel(c.contact_id)}/></strong><small>{lastMessage?.body||lastMessage?.attachment_name||(c.contact_type==="teacher"?"Teacher · Studyspace Monitor":"Student connection")}</small><small className="monitor-presence-meta">{lastMessage?new Date(lastMessage.created_at).toLocaleString([], {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):presenceLabel(c.contact_id)}</small></span>{count>0&&<i className="monitor-contact-unread">{count}</i>}</button><div className="ss-contact-row-actions"><button type="button" title={pinned?"Unpin conversation":"Pin conversation"} aria-label={pinned?"Unpin conversation":"Pin conversation"} onClick={()=>toggleContactPreference(c.contact_id,"pinned")}><Pin size={13}/></button><button type="button" title={archived?"Restore conversation":"Archive conversation"} aria-label={archived?"Restore conversation":"Archive conversation"} onClick={()=>toggleContactPreference(c.contact_id,"archived")}>{archived?<ArchiveRestore size={13}/>:<Archive size={13}/>}</button></div></div>;})}{!loading&&!visibleContacts.length&&<p className="monitor-message-empty">{conversationFilter==="unread"?"No unread conversations.":conversationFilter==="pinned"?"No pinned conversations yet.":conversationFilter==="archived"?"No archived conversations.":"Your teacher and accepted student connections will appear here."}</p>}</div>
      </aside>
      <section className="monitor-conversation">
        {selectedContact?<><header className="monitor-conversation-head"><div><span className="monitor-contact-avatar">{selectedContact.display_name.slice(0,1).toUpperCase()}</span><div><strong>{selectedContact.display_name}</strong><small>{selectedContact.contact_type==="teacher"?"Teacher · Studyspace Monitor":selectedContact.grade||"Student connection"} · {presenceLabel(selectedContact.contact_id)}</small></div></div><span className="monitor-secure-label"><ShieldCheck size={13}/> Private</span></header>
          <div className="ss-thread-search"><label><Search size={14}/><input value={threadSearch} onChange={e=>setThreadSearch(e.target.value)} placeholder="Search this conversation"/></label><span>{filteredThread.length} messages</span></div>
          <div className="monitor-message-list">{filteredThread.length?filteredThread.map(m=><article key={m.id} className={"monitor-message-bubble"+(m.sender_id===userId?" is-outgoing":"")}><div>{editingMessageId===m.id?<div className="ss-message-edit"><textarea value={editingMessageDraft} maxLength={2000} onChange={e=>setEditingMessageDraft(e.target.value)}/><div><button type="button" onClick={()=>void saveEditedMessage(m)}>Save edit</button><button type="button" onClick={()=>setEditingMessageId(null)}>Cancel</button></div></div>:m.unsent_at?<p className="ss-message-unsent">This message was unsent.</p>:m.deleted_for_everyone_at?<p className="ss-message-unsent">This message was deleted.</p>:m.body&&<p>{m.body}</p>}{!m.unsent_at&&!m.deleted_for_everyone_at&&m.attachment_path&&<a className="monitor-message-attachment" href={signedUrls[m.id]||"#"} target="_blank" rel="noreferrer" onClick={e=>{if(!signedUrls[m.id])e.preventDefault();}}><FileText size={16}/><span>{m.attachment_name||"Attachment"}<small>{byteLabel(m.attachment_size)}</small></span></a>}</div><time>{new Date(m.created_at).toLocaleString([], {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}{m.edited_at&&!m.unsent_at&&!m.deleted_for_everyone_at&&<small className="ss-message-edited">Edited</small>}{m.sender_id===userId&&<small className="monitor-message-status">{m.read_at?"Seen":m.delivered_at?"Delivered":"Sent"}</small>}</time><details className="ss-message-actions"><summary aria-label="Message actions">⋯</summary><div>{m.sender_id===userId&&!m.unsent_at&&canEditMessage(m)&&<button type="button" onClick={()=>beginEditMessage(m)}>Edit</button>}{m.sender_id===userId&&!m.unsent_at&&!m.deleted_for_everyone_at&&<button type="button" onClick={()=>void unsendMessage(m)}>Unsend</button>}{m.sender_id===userId&&!m.unsent_at&&!m.deleted_for_everyone_at&&<button type="button" onClick={()=>void deleteMessageForEveryone(m)}>Delete for everyone</button>}<button type="button" onClick={()=>void deleteMessageForMe(m)}>Delete for me</button></div></details></article>):thread.length>0?<div className="monitor-message-empty">No messages match your search.</div>:<div className="monitor-message-empty"><MessageCircle size={24}/><strong>No messages yet</strong><span>Send your first message to {selectedContact.display_name}.</span></div>}<div ref={bottomRef}/></div>
          <form className="monitor-message-composer" onSubmit={send}>{file&&<div className="monitor-message-file"><FileText size={14}/><span>{file.name} · {byteLabel(file.size)}</span><button type="button" onClick={()=>{setFile(null);if(fileRef.current)fileRef.current.value="";}} aria-label="Remove attachment"><X size={13}/></button></div>}<div className="monitor-message-compose-row"><button className="icon-button" type="button" aria-label="Attach file" onClick={()=>fileRef.current?.click()}><Paperclip size={17}/></button><input ref={fileRef} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" onChange={e=>setFile(e.target.files?.[0]||null)}/><textarea value={draft} maxLength={2000} rows={2} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" aria-label="Message text"/><button className="primary-button" type="submit" disabled={sending||(!draft.trim()&&!file)||draftWords>350||draft.length>2000}><Send size={15}/>{sending?"Sending…":"Send"}</button></div><div className="monitor-message-limits"><span>350 words / 2,000 characters max · Attachments up to 5 MB</span><span>{draftWords}/350 words · {draft.length}/2,000</span></div></form>
        </>:<div className="monitor-message-empty"><MessageCircle size={28}/><strong>{loading?"Opening your messages…":"Choose a conversation"}</strong><span>Start with your teacher or connect with another learner after an accepted invitation.</span></div>}
      </section>
    </div>
    }
    <p className="student-peer-safety-note"><ShieldCheck size={14}/> Peer chat is only enabled when both students are adults or have verified guardian consent. Teacher messages remain available. Use messages for learning and keep personal information private.</p>
  </div>;
}
