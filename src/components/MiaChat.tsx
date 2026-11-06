import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, Plus, Image as ImageIcon, LoaderCircle, CalendarDays, CheckCircle2, BookOpen } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { StudentProfile } from "./StudentOnboarding";
import type { Subject } from "../data/db";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type TimetableEntry = { day_of_week: number; subject_name: string; title: string; starts_at: string; ends_at: string; location: string; notes: string };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const welcome: ChatMessage = { id: "mia-welcome", role: "assistant", content: "Hi! I'm MIΛ, your personal learning companion. I know your subjects and study goals, and I can help you understand lessons, practise questions, prepare for exams and organise your study. What shall we work on?" };

async function imagePayload(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { mimeType: file.type, data: btoa(binary) };
}

export default function MiaChat({ profile, subjects, variant = "studio", onClose }: {
  profile: StudentProfile;
  subjects: Subject[];
  variant?: "studio" | "floating";
  onClose?: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TimetableEntry[]>([]);
  const [timetableKind, setTimetableKind] = useState<"school" | "personal" | "">("");
  const [saved, setSaved] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFloating = variant === "floating";

  useEffect(() => {
    let alive = true;
    async function restore() {
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      const { data: conv } = await supabase.from("mia_conversations").select("id")
        .eq("learner_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (!alive || !conv?.id) return;
      const { data } = await supabase.from("mia_messages").select("id,role,content")
        .eq("conversation_id", conv.id).eq("learner_id", userId)
        .order("created_at", { ascending: true }).limit(20);
      if (!alive) return;
      setConversationId(conv.id);
      if (data?.length) setMessages(data.map(row => ({ id: String(row.id), role: row.role as "user" | "assistant", content: row.content })));
    }
    void restore();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, draft]);

  async function sendMessage() {
    const value = text.trim();
    if (!value || busy || !supabase) return;
    setError("");
    setBusy(true);
    setText("");
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", content: value }]);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("mia-assistant", {
        body: { action: "chat", message: value, conversationId },
      });
      if (invokeError) throw invokeError;
      if (!data?.success || typeof data.reply !== "string") throw new Error(data?.error || "MIΛ could not reply. Please try again.");
      setConversationId(data.conversationId);
      setRemaining(typeof data.remainingDailyRequests === "number" ? data.remainingDailyRequests : null);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: data.reply }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "MIΛ could not reply. Check your connection.");
    } finally { setBusy(false); inputRef.current?.focus(); }
  }

  async function reviewTimetable() {
    if (!attachment || busy || !supabase) return;
    setError(""); setBusy(true); setDraft([]); setSaved(false); setTimetableKind("");
    try {
      const image = await imagePayload(attachment);
      const { data, error: invokeError } = await supabase.functions.invoke("mia-assistant", {
        body: { action: "parse_timetable", image, conversationId, message: text.trim() },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || "The timetable could not be read.");
      setConversationId(data.conversationId);
      setRemaining(typeof data.remainingDailyRequests === "number" ? data.remainingDailyRequests : null);
      setDraft(Array.isArray(data.timetableDraft) ? data.timetableDraft : []);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: data.reply }]);
      setAttachment(null);
      setText("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "MIΛ could not read this timetable.");
    } finally { setBusy(false); }
  }

  async function saveTimetable() {
    if (!supabase || !draft.length || !timetableKind || busy) return;
    setBusy(true); setError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your session expired. Sign in again.");
      const rows = draft.map(item => ({
        learner_id: userData.user!.id,
        timetable_kind: timetableKind,
        subject_name: item.subject_name,
        title: item.title,
        day_of_week: item.day_of_week,
        starts_at: item.starts_at,
        ends_at: item.ends_at,
        location: item.location,
        notes: item.notes,
        source: "mia_image_import",
      }));
      const { error: insertError } = await supabase.from("student_timetable_entries").insert(rows);
      if (insertError) throw insertError;
      setSaved(true);
      setDraft([]);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: "Done. I've saved the confirmed " + (timetableKind === "school" ? "school timetable" : "personal study timetable") + " separately. You can review or edit its entries in your timetable." }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The timetable could not be saved.");
    } finally { setBusy(false); }
  }

  function newChat() {
    setConversationId(null); setMessages([welcome]); setDraft([]); setError(""); setSaved(false);
  }

  return <section className={"mia-shell " + (isFloating ? "mia-floating-shell" : "mia-studio-shell")} aria-label="MIΛ learning assistant">
    <header className="mia-header">
      <div className="mia-brand-mark">Λ</div>
      <div className="mia-brand-copy"><strong>MIΛ</strong><span>YOUR LEARNING COMPANION · GEMINI</span></div>
      <div className="mia-header-actions">
        {remaining !== null && <span className="mia-remaining">{remaining} free today</span>}
        <button className="mia-icon-button" onClick={newChat} title="New chat" aria-label="Start a new chat"><Plus size={17}/></button>
        {onClose && <button className="mia-icon-button" onClick={onClose} aria-label="Close MIΛ"><X size={18}/></button>}
      </div>
    </header>
    <div className="mia-context-strip"><BookOpen size={14}/><span>{profile.level} · {profile.grade} · {profile.curriculum || "Curriculum not set"}</span><span className="mia-context-dot"/> <span>{subjects.length} subjects</span></div>
    <div className="mia-messages" ref={scrollRef}>
      {messages.map(message => <article key={message.id} className={"mia-message-row " + (message.role === "user" ? "is-user" : "is-assistant")}>
        {message.role === "assistant" && <div className="mia-message-avatar">Λ</div>}
        <div className="mia-message-bubble">{message.content}</div>
      </article>)}
      {busy && <div className="mia-message-row is-assistant"><div className="mia-message-avatar">Λ</div><div className="mia-message-bubble mia-thinking"><LoaderCircle size={15}/> MIΛ is thinking…</div></div>}
      {draft.length > 0 && <section className="mia-timetable-review">
        <div className="mia-review-heading"><CalendarDays size={17}/><div><strong>Review extracted timetable</strong><span>{draft.length} entries detected · Nothing saved yet</span></div></div>
        <div className="mia-table-scroll"><table><thead><tr><th>Day</th><th>Subject / activity</th><th>Time</th></tr></thead><tbody>{draft.map((entry,i)=><tr key={i}>
          <td><select aria-label="Edit timetable day" value={entry.day_of_week} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,day_of_week:Number(e.target.value)}:row))}>{days.map((day,index)=><option key={day} value={index}>{day}</option>)}</select></td>
          <td><input aria-label="Edit timetable subject" value={entry.subject_name || entry.title} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,subject_name:e.target.value,title:e.target.value}:row))}/></td>
          <td><div className="mia-time-edit"><input aria-label="Start time" type="time" value={entry.starts_at} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,starts_at:e.target.value}:row))}/><input aria-label="End time" type="time" value={entry.ends_at} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,ends_at:e.target.value}:row))}/></div></td>
          <td><button type="button" className="mia-remove-entry" onClick={()=>setDraft(current=>current.filter((_,index)=>index!==i))} aria-label="Remove timetable entry">×</button></td>
        </tr>)}</tbody></table></div>
        <p>Before saving, tell MIΛ which timetable this is. School lessons and your own study sessions will be stored separately.</p>
        <div className="mia-kind-options"><button className={timetableKind === "school" ? "selected" : ""} onClick={()=>setTimetableKind("school")}><BookOpen size={15}/> School timetable</button><button className={timetableKind === "personal" ? "selected" : ""} onClick={()=>setTimetableKind("personal")}><CalendarDays size={15}/> Personal study timetable</button></div>
        <button className="mia-confirm-button" disabled={!timetableKind || busy} onClick={()=>void saveTimetable()}><CheckCircle2 size={16}/> Confirm and save timetable</button>
      </section>}
      {saved && <div className="mia-saved-note"><CheckCircle2 size={15}/> Timetable saved successfully.</div>}
      {error && <div className="mia-error" role="alert">{error}</div>}
    </div>
    {messages.length === 1 && draft.length === 0 && <div className="mia-quick-actions" aria-label="MIΛ study tools">
      <button type="button" onClick={()=>setText("Help me understand a difficult topic in one of my subjects. Ask me which topic if needed.")}>Explain a topic</button>
      <button type="button" onClick={()=>setText("Quiz me on one of my current subjects. Start with five questions and adapt to my answers.")}>Quiz me</button>
      <button type="button" onClick={()=>setText("Turn my lesson notes into concise revision notes with key definitions and examples. I will attach or paste the lesson.")}>Summarise notes</button>
      <button type="button" onClick={()=>setText("Help me create a realistic revision plan using my subjects, goals and available study time.")}>Plan revision</button>
      <button type="button" onClick={()=>setText("Create a set of useful flashcards for a topic I am revising. Ask me for the subject and topic.")}>Flashcards</button>
    </div>}
    {attachment && <div className="mia-attachment-preview"><ImageIcon size={15}/><span>{attachment.name}</span><button onClick={()=>setAttachment(null)} aria-label="Remove attachment"><X size={14}/></button></div>}
    <form className="mia-composer" onSubmit={event=>{event.preventDefault(); if (attachment) void reviewTimetable(); else void sendMessage();}}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={event=>{const file=event.target.files?.[0];if(file){if(file.size>4*1024*1024){setError("Choose an image smaller than 4 MB.");}else{setError("");setAttachment(file);}}event.currentTarget.value="";}}/>
      <button type="button" className="mia-attach-button" onClick={()=>fileRef.current?.click()} title="Attach a timetable or study image" aria-label="Attach an image"><Paperclip size={19}/></button>
      <textarea ref={inputRef} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();if(attachment)void reviewTimetable();else void sendMessage();}}} placeholder="Message MIΛ about your studies…" rows={1} maxLength={3000}/>
      <button type="submit" className="mia-send-button" disabled={busy || (!text.trim() && !attachment)} title={attachment ? "Review timetable image" : "Send message"} aria-label={attachment ? "Review timetable image" : "Send message"}>{busy?<LoaderCircle size={18} className="mia-spin"/>:<Send size={18}/>}</button>
    </form>
    <div className="mia-footnote">Study-focused · Short answers · Gemini processes prompts; avoid sharing personal details</div>
  </section>;
}
