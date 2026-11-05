import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardList, MessageCircle, PenLine, Video, Mic, Eraser, Send, Plus, Clock3, Sparkles, Paperclip, Users } from "lucide-react";
import type { Subject } from "../data/db";
import { supabase } from "../lib/supabase";

type Tab = "Worksheet" | "Lesson notes" | "Class chat" | "Homework";
type ChatMessage = { id: string; text: string; sender: "You" | "Teacher"; time: string };
type Homework = { id: string; title: string; details: string; due: string; done: boolean };
const key = "studyspace-current-session-v1";

export default function TodaySession({ subjects }: { subjects: Subject[] }) {
  const [tab, setTab] = useState<Tab>("Worksheet");
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [lessonTitle, setLessonTitle] = useState("Today's lesson");
  const [objectives, setObjectives] = useState("");
  const [notes, setNotes] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [exitQuestion, setExitQuestion] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [homework, setHomework] = useState<Homework[]>([]);
  const [hwTitle, setHwTitle] = useState("");
  const [hwDetails, setHwDetails] = useState("");
  const [hwDue, setHwDue] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState("Offline workspace");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [ink, setInk] = useState("#27324a");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      setSubject(data.subject ?? subjects[0]?.name ?? "");
      setLessonTitle(data.lessonTitle ?? "Today's lesson");
      setObjectives(data.objectives ?? "");
      setNotes(data.notes ?? "");
      setLessonSummary(data.lessonSummary ?? "");
      setKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints.slice(0, 5) : []);
      setChat(Array.isArray(data.chat) ? data.chat : []);
      setHomework(Array.isArray(data.homework) ? data.homework : []);
      const image = data.worksheet;
      if (image && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        const img = new Image();
        img.onload = () => ctx?.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
        img.src = image;
      }
    } catch { /* Keep an empty session if stored data is invalid. */ }
  }, [subjects]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const loadSharedSession = async () => {
      const { data: auth } = await supabase!.auth.getUser();
      if (!auth.user || !alive) return;
      setUserId(auth.user.id);
      const { data: memberships, error: memberError } = await supabase!.from("class_session_members").select("session_id").eq("learner_id", auth.user.id);
      if (memberError || !memberships?.length || !alive) return;
      const ids = memberships.map(item => item.session_id);
      const { data: sessions, error: sessionError } = await supabase!.from("class_sessions")
        .select("id,title,subject_name,objectives,starts_at,status,duration_minutes")
        .in("id", ids).in("status", ["scheduled","live"]).order("starts_at", { ascending: false }).limit(1);
      if (sessionError || !sessions?.length || !alive) return;
      const session = sessions[0];
      setActiveSessionId(session.id); setLessonTitle(session.title); setSubject(session.subject_name);
      setObjectives(session.objectives || "");
      setCloudStatus(session.status === "live" ? "Live class connected" : "Assigned lesson connected");
      const [messagesResult, notesResult, homeworkResult, boardResult, submissionsResult] = await Promise.all([
        supabase!.from("session_messages").select("id,sender_id,message,created_at").eq("session_id", session.id).order("created_at"),
        supabase!.from("session_lesson_notes").select("summary,key_points,worked_example,exit_question,recap_markdown").eq("session_id", session.id).maybeSingle(),
        supabase!.from("session_homework").select("id,title,instructions,due_at").eq("session_id", session.id).order("created_at"),
        supabase!.from("session_whiteboards").select("board_state").eq("session_id", session.id).maybeSingle(),
        supabase!.from("session_homework_submissions").select("homework_id,completed_at").eq("learner_id", auth.user.id)
      ]);
      if (!alive) return;
      if (messagesResult.data) setChat(messagesResult.data.map(item => ({
        id: item.id, text: item.message, sender: item.sender_id === auth.user.id ? "You" : "Teacher",
        time: new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      })));
      if (notesResult.data) {
        setLessonSummary(notesResult.data.summary || "");
        setKeyPoints(Array.isArray(notesResult.data.key_points) ? notesResult.data.key_points.slice(0,5) : []);
        setNotes(notesResult.data.worked_example || "");
        setExitQuestion(notesResult.data.exit_question || "");
      }
      const completedIds = new Set((submissionsResult.data || []).filter(item => item.completed_at).map(item => item.homework_id));
      if (homeworkResult.data) setHomework(homeworkResult.data.map(item => ({
        id: item.id, title: item.title, details: item.instructions || "",
        due: item.due_at ? item.due_at.slice(0,10) : "", done: completedIds.has(item.id)
      })));
      const imageData = (boardResult.data?.board_state as { imageData?: string } | null)?.imageData;
      if (imageData && canvasRef.current) {
        const image = new Image();
        image.onload = () => { if (alive && canvasRef.current) canvasRef.current.getContext("2d")?.drawImage(image,0,0,canvasRef.current.width,canvasRef.current.height); };
        image.src = imageData;
      }
      channel = supabase!.channel("studyspace-session-" + session.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_messages", filter: "session_id=eq." + session.id }, payload => {
          const row = payload.new as { id:string; sender_id:string; message:string; created_at:string };
          if (!alive) return;
          setChat(current => current.some(item => item.id === row.id) ? current : [...current, {
            id: row.id, text: row.message, sender: row.sender_id === auth.user.id ? "You" : "Teacher",
            time: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }]);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "session_whiteboards", filter: "session_id=eq." + session.id }, payload => {
          const imageData = (payload.new as { board_state?: { imageData?: string } }).board_state?.imageData;
          if (!alive || !imageData || !canvasRef.current) return;
          const picture = new Image();
          picture.onload = () => { if (alive && canvasRef.current) canvasRef.current.getContext("2d")?.drawImage(picture,0,0,canvasRef.current.width,canvasRef.current.height); };
          picture.src = imageData;
        }).subscribe();
    };
    void loadSharedSession();
    return () => { alive = false; if (channel && supabase) void supabase.removeChannel(channel); };
  }, []);

  function persist(extra?: Record<string, unknown>) {
    try {
      localStorage.setItem(key, JSON.stringify({
        subject, lessonTitle, objectives, notes, lessonSummary, keyPoints, chat, homework,
        worksheet: canvasRef.current?.toDataURL("image/png") ?? "",
        ...extra
      }));
      setSaved(true);
    } catch { setSaved(false); }
  }
  useEffect(() => {
    const id = window.setTimeout(() => persist(), 450);
    return () => window.clearTimeout(id);
  }, [subject, lessonTitle, objectives, notes, lessonSummary, keyPoints, chat, homework]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true; canvas.setPointerCapture(event.pointerId);
    const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : ink; ctx.lineWidth = tool === "eraser" ? 24 : 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  }
  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false; persist();
    if (activeSessionId && userId && supabase && canvasRef.current) {
      const imageData = canvasRef.current.toDataURL("image/jpeg", 0.55);
      void supabase.from("session_whiteboards").upsert({
        session_id: activeSessionId, board_state: { version: 1, imageData }, updated_by: userId,
        updated_at: new Date().toISOString()
      }, { onConflict: "session_id" });
    }
  }
  function clearBoard() {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); persist();
      if (activeSessionId && userId && supabase) void supabase.from("session_whiteboards").upsert({
        session_id: activeSessionId, board_state: { version: 1, imageData: canvas.toDataURL("image/jpeg", 0.55) },
        updated_by: userId, updated_at: new Date().toISOString()
      }, { onConflict: "session_id" });
    }
  }
  async function sendMessage(event: React.FormEvent) {
    event.preventDefault(); const text = message.trim(); if (!text) return;
    if (activeSessionId && userId && supabase) {
      const { error } = await supabase.from("session_messages").insert({ session_id: activeSessionId, sender_id: userId, message: text });
      if (error) return;
    } else {
      setChat(current => [...current, { id: String(Date.now()), text, sender: "You", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }
    setMessage("");
  }
  function addHomework(event: React.FormEvent) {
    event.preventDefault(); if (!hwTitle.trim()) return;
    setHomework(current => [...current, { id: String(Date.now()), title: hwTitle.trim(), details: hwDetails.trim(), due: hwDue, done: false }]);
    setHwTitle(""); setHwDetails(""); setHwDue("");
  }
  const tabs: { name: Tab; icon: typeof PenLine; hint: string }[] = [
    { name: "Worksheet", icon: PenLine, hint: "Work things out" },
    { name: "Lesson notes", icon: BookOpen, hint: "Today's guide" },
    { name: "Class chat", icon: MessageCircle, hint: "Session messages" },
    { name: "Homework", icon: ClipboardList, hint: "Follow-up work" }
  ];

  return <section className="today-session">
    <div className="session-hero glass-panel">
      <div className="session-hero-top"><span className="session-live-dot"/><span>YOUR CLASSROOM</span><span className="session-date">{new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}</span></div>
      <div className="session-hero-main"><div><div className="eyebrow"><Sparkles size={14}/> LEARN TOGETHER</div><h2>Today's session</h2><p>A dedicated space for your lesson, practice, questions and follow-up work.</p></div><div className="session-status"><Clock3 size={16}/> {cloudStatus}</div></div>
      <div className="session-meta">
        <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Choose a subject</option>{subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
        <label>Lesson title<input value={lessonTitle} onChange={e=>setLessonTitle(e.target.value)} maxLength={100}/></label>
        <span className="session-save-state">{saved ? "Saved on this device" : "Storage unavailable"}</span>
      </div>
    </div>

    <div className="session-tabs" role="tablist" aria-label="Session workspaces">
      {tabs.map(item=><button key={item.name} role="tab" aria-selected={tab===item.name} className={tab===item.name?"active":""} onClick={()=>setTab(item.name)}><item.icon size={17}/><span>{item.name}</span><small>{item.hint}</small></button>)}
    </div>

    {tab === "Worksheet" && <div className="glass-panel session-workspace">
      <div className="session-section-heading"><div><h3>Interactive worksheet</h3><p>Use the board for calculations, diagrams, sketches and rough work.</p></div><div className="board-tools"><button className={tool==="pen"?"selected":""} onClick={()=>setTool("pen")}><PenLine size={15}/> Pen</button><button className={tool==="eraser"?"selected":""} onClick={()=>setTool("eraser")}><Eraser size={15}/> Eraser</button><input aria-label="Pen colour" type="color" value={ink} onChange={e=>setInk(e.target.value)}/><button onClick={clearBoard}>Clear</button></div></div>
      <div className="worksheet-paper"><canvas ref={canvasRef} width={1200} height={680} onPointerDown={startDraw} onPointerMove={draw} onPointerUp={stopDraw} onPointerCancel={stopDraw} onPointerLeave={stopDraw} aria-label="Drawing worksheet"/></div>
      <p className="session-footnote">{activeSessionId ? "Shared class board connected. Drawings sync to your teacher and assigned classmates." : "Your working is saved locally in this browser. Shared drawing appears when your teacher assigns a session."}</p>
    </div>}

    {tab === "Lesson notes" && <div className="glass-panel session-workspace">
      <div className="session-section-heading"><div><h3>Lesson guide &amp; notes</h3><p>Keep the lesson outline, key concepts and worked examples together.</p></div><BookOpen size={20}/></div>
      <label className="session-field">Lesson objectives<textarea value={objectives} onChange={e=>setObjectives(e.target.value)} rows={2} placeholder="What should the learner be able to do by the end? Keep it to 1–3 outcomes."/></label>
      <div className="session-ai-guide">
        <div><span className="eyebrow">SHORT LESSON RECAP</span><strong>AI lesson notes</strong><p>Your teacher prepares a concise recap from the lesson material. Once published, the summary, key points and understanding check appear in this session.</p></div>
        <div className="session-ai-actions"><span className="session-ai-status">Teacher-managed lesson recap</span></div>
      </div>
      <label className="session-field">Lesson summary<textarea value={lessonSummary} onChange={e=>setLessonSummary(e.target.value)} rows={3} placeholder="A short, student-friendly explanation of what today's lesson is about."/></label>
      <label className="session-field">Key points to cover <small className="session-field-hint">Keep this to a handful. One idea per line; aim for 3–5.</small><textarea value={keyPoints.join("\n")} onChange={e=>setKeyPoints(e.target.value.split("\n").map((v:string)=>v.trim()).filter(Boolean).slice(0,5))} rows={5} placeholder={"1. First essential idea\n2. Second essential idea\n3. Worked example\n4. Common mistake to avoid\n5. Quick understanding check"}/></label>
      {exitQuestion && <div className="session-exit-question"><strong>Quick understanding check</strong><p>{exitQuestion}</p></div>}
      <label className="session-field">Worked example / today's notes<textarea className="session-notes-editor" value={notes} onChange={e=>setNotes(e.target.value)} rows={9} placeholder={"One clear worked example…\n\nImportant definitions…\n\nA question to check understanding…"} /></label>
      <div className="session-note-footer"><span>Autosaved locally on this device</span><button className="secondary-button" onClick={()=>{setObjectives("");setLessonSummary("");setKeyPoints([]);setNotes("");}}>Clear lesson notes</button></div>
    </div>}

    {tab === "Class chat" && <div className="glass-panel session-workspace session-chat">
      <div className="session-section-heading"><div><h3>Class chat</h3><p>Questions and discussion attached to this session.</p></div><MessageCircle size={20}/></div>
      <div className="session-chat-notice"><Users size={16}/><span>{activeSessionId ? "Messages are shared with your teacher and classmates in this assigned session." : "This is a local session draft. Your teacher’s published class session will appear here when you are assigned."}</span></div>
      <div className="session-chat-list">{chat.length ? chat.map(item=><article key={item.id} className="session-chat-message"><div><strong>{item.sender}</strong><time>{item.time}</time></div><p>{item.text}</p></article>) : <div className="session-chat-empty"><MessageCircle size={25}/><strong>Start the conversation</strong><span>Write down a question or a point you want to discuss.</span></div>}</div>
      <form className="session-chat-compose" onSubmit={sendMessage}><input value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} placeholder="Write a message or ask a question…" aria-label="Message" /><button className="primary-button" type="submit" disabled={!message.trim()}><Send size={16}/> Send</button></form>
    </div>}

    {tab === "Homework" && <div className="glass-panel session-workspace">
      <div className="session-section-heading"><div><h3>Homework &amp; follow-up</h3><p>Keep assignments, due dates and teacher guidance in one place.</p></div><ClipboardList size={20}/></div>
      <form className="session-homework-form" onSubmit={addHomework}><label className="session-field">Homework title<input value={hwTitle} onChange={e=>setHwTitle(e.target.value)} required maxLength={140} placeholder="e.g. Complete questions 1–8"/></label><label className="session-field">Instructions<textarea value={hwDetails} onChange={e=>setHwDetails(e.target.value)} rows={3} placeholder="Add steps, pages, resources or guidance…"/></label><label className="session-field">Due date<input type="date" value={hwDue} onChange={e=>setHwDue(e.target.value)}/></label><button className="primary-button" type="submit"><Plus size={16}/> Add homework</button></form>
      <div className="session-homework-list">{homework.length ? homework.map(item=><article key={item.id} className={item.done?"homework-done":""}><label><input type="checkbox" checked={item.done} onChange={e=>{const done=e.target.checked;setHomework(current=>current.map(h=>h.id===item.id?{...h,done}:h));if(activeSessionId&&userId&&supabase){void supabase.from("session_homework_submissions").upsert({homework_id:item.id,learner_id:userId,completed_at:done?new Date().toISOString():null},{onConflict:"homework_id,learner_id"});}}}/><span><strong>{item.title}</strong><small>{item.due ? "Due "+new Date(item.due+"T00:00:00").toLocaleDateString() : "No due date"}</small>{item.details&&<p>{item.details}</p>}</span></label><button className="text-button" onClick={()=>setHomework(current=>current.filter(h=>h.id!==item.id))}>Remove</button></article>) : <div className="session-chat-empty"><ClipboardList size={25}/><strong>No homework added yet</strong><span>Follow-up tasks from this lesson will appear here.</span></div>}</div>
    </div>}

    <div className="session-tools-row"><div><span className="eyebrow">CLASSROOM TOOLS</span><strong>More ways to learn together</strong><p>These tools are prepared for the connected classroom phase.</p></div><div className="session-tool-cards"><div><Video size={18}/><span><strong>Video classroom</strong><small>Connect a live video provider</small></span><em>Backend phase</em></div><div><Mic size={18}/><span><strong>Audio room</strong><small>Voice discussion and help</small></span><em>Backend phase</em></div><div><Paperclip size={18}/><span><strong>Shared resources</strong><small>Lesson files and guided activities</small></span><em>Backend phase</em></div></div></div>
  </section>;
}
