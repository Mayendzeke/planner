import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardList, MessageCircle, PenLine, Eraser, Send, Clock3, Sparkles, Users, CheckCircle2, RefreshCw, CalendarDays } from "lucide-react";
import type { Subject } from "../data/db";
import { supabase } from "../lib/supabase";
import { studentStorageKey } from "../lib/studentStorage";
import LiveClassroomCall from "./LiveClassroomCall";
import SoloStudyCoach from "./SoloStudyCoach";

type Tab = "Solo study" | "Lesson guide" | "Worksheet" | "Class chat" | "Homework";
type ClassroomSession = {
  id: string;
  title: string;
  subject_name: string;
  objectives: string | null;
  starts_at: string;
  status: "scheduled" | "live" | "ended" | "cancelled";
  duration_minutes: number;
  meeting_url: string | null;
};
type ChatMessage = { id: string; text: string; sender: "You" | "Teacher"; time: string };
type Homework = { id: string; title: string; details: string; due: string; done: boolean };
type LessonGuide = { summary: string; keyPoints: string[]; workedExample: string; exitQuestion: string };
type PracticeQuestion = { prompt: string; options: string[]; answer: string; explanation: string; topic?: string; difficulty?: string };
const LEGACY_KEY = "studyspace-current-session-v1";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function sessionLabel(session: ClassroomSession) {
  const label = session.status === "live" ? "LIVE NOW" : session.status.toUpperCase();
  return session.title + " · " + session.subject_name + " · " + label;
}
function defaultSession(rows: ClassroomSession[]): ClassroomSession | null {
  const now = Date.now();
  return rows.find(row => row.status === "live")
    || rows.filter(row => row.status === "scheduled" && new Date(row.starts_at).getTime() >= now).sort((a,b) => Date.parse(a.starts_at)-Date.parse(b.starts_at))[0]
    || rows.filter(row => row.status === "scheduled").sort((a,b) => Date.parse(b.starts_at)-Date.parse(a.starts_at))[0]
    || rows.filter(row => row.status === "ended").sort((a,b) => Date.parse(b.starts_at)-Date.parse(a.starts_at))[0]
    || rows[0]
    || null;
}
function readStoredNotes(key: string): string {
  try {
    const value = localStorage.getItem(studentStorageKey(key));
    if (value !== null) return value;
    const legacy = JSON.parse(localStorage.getItem(studentStorageKey(LEGACY_KEY)) || "null");
    return typeof legacy?.notes === "string" ? legacy.notes : "";
  } catch { return ""; }
}

export default function TodaySession({ subjects }: { subjects: Subject[] }) {
  const [tab, setTab] = useState<Tab>("Solo study");
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [activeSession, setActiveSession] = useState<ClassroomSession | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connection, setConnection] = useState("Checking classroom connection…");
  const [sessionError, setSessionError] = useState("");
  const [lessonGuide, setLessonGuide] = useState<LessonGuide>({ summary: "", keyPoints: [], workedExample: "", exitQuestion: "" });
  const [personalNotes, setPersonalNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotice, setChatNotice] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [homeworkBusy, setHomeworkBusy] = useState("");
  const [boardNotice, setBoardNotice] = useState("");
  const [ink, setInk] = useState("#27324a");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const tabRef = useRef<Tab>(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  async function refreshAssignedSessions(preserveSelection = true) {
    if (!supabase) {
      setConnection("Cloud classroom unavailable");
      setSessionLoading(false);
      return;
    }
    setRefreshing(true);
    setSessionError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in again to load your teacher's lessons.");
      setUserId(auth.user.id);
      const { data: memberships, error: memberError } = await supabase
        .from("class_session_members").select("session_id").eq("learner_id", auth.user.id);
      if (memberError) throw memberError;
      const ids = (memberships ?? []).map(row => row.session_id).filter(Boolean);
      if (!ids.length) {
        setSessions([]);
        setActiveSessionId("");
        setActiveSession(null);
        setConnection("No lesson assigned yet");
        return;
      }
      const { data, error } = await supabase.from("class_sessions")
        .select("id,title,subject_name,objectives,starts_at,status,duration_minutes,meeting_url")
        .in("id", ids).order("starts_at", { ascending: false }).limit(25);
      if (error) throw error;
      const rows = (data ?? []) as ClassroomSession[];
      setSessions(rows);
      setActiveSessionId(current => preserveSelection && current && rows.some(row => row.id === current)
        ? current : (defaultSession(rows)?.id ?? ""));
      setConnection(rows.some(row => row.status === "live") ? "A live lesson is available" : "Classroom connected");
    } catch (reason) {
      setSessionError(reason instanceof Error ? reason.message : "Your assigned lessons could not be loaded.");
      setConnection("Connection needs attention");
    } finally {
      setSessionLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setConnection("Cloud classroom unavailable");
      setSessionLoading(false);
      return;
    }
    const client = supabase;
    let alive = true;
    let channel: ReturnType<typeof client.channel> | null = null;
    let interval = 0;
    const start = async () => {
      await refreshAssignedSessions(false);
      if (!alive) return;
      const { data: auth } = await client.auth.getUser();
      if (!auth.user || !alive) return;
      channel = client.channel("studyspace-learner-classroom-" + auth.user.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "class_session_members", filter: "learner_id=eq." + auth.user.id }, () => {
          if (alive) void refreshAssignedSessions(true);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "class_sessions" }, payload => {
          const row = payload.new as ClassroomSession;
          if (!alive) return;
          setSessions(current => current.map(item => item.id === row.id ? { ...item, ...row } : item));
          setActiveSession(current => current?.id === row.id ? { ...current, ...row } : current);
          if (row.status === "live") setConnection("Your teacher has started the live lesson");
          if (row.status === "ended") setConnection("This lesson has ended");
        })
        .subscribe((status) => {
          if (!alive) return;
          if (status === "SUBSCRIBED") setConnection("Live classroom connected");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("Live updates reconnecting…");
        });
      interval = window.setInterval(() => {
        if (document.visibilityState === "visible") void refreshAssignedSessions(true);
      }, 30000);
    };
    void start();
    const onVisible = () => { if (document.visibilityState === "visible") void refreshAssignedSessions(true); };
    window.addEventListener("focus", onVisible);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      if (channel) void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId || !userId || !supabase) {
      setActiveSession(null);
      setLessonGuide({ summary: "", keyPoints: [], workedExample: "", exitQuestion: "" });
      setChat([]);
       setUnreadChatCount(0);
       setChatNotice("");
       setPracticeQuestions([]);
       setPracticeAnswers({});
       setPracticeComplete(false);
      setHomework([]);
      return;
    }
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const loadDetails = async () => {
      setSessionError("");
      const [{ data: session, error: sessionError }, messagesResult, notesResult, homeworkResult, boardResult, submissionsResult] = await Promise.all([
        supabase!.from("class_sessions").select("id,title,subject_name,objectives,starts_at,status,duration_minutes,meeting_url").eq("id", activeSessionId).single(),
        supabase!.from("session_messages").select("id,sender_id,message,created_at").eq("session_id", activeSessionId).order("created_at"),
        supabase!.from("session_lesson_notes").select("summary,key_points,worked_example,exit_question").eq("session_id", activeSessionId).maybeSingle(),
        supabase!.from("session_homework").select("id,title,instructions,due_at").eq("session_id", activeSessionId).order("created_at"),
        supabase!.from("session_whiteboards").select("board_state").eq("session_id", activeSessionId).maybeSingle(),
        supabase!.from("session_homework_submissions").select("homework_id,completed_at").eq("learner_id", userId),
      ]);
      if (!alive) return;
      if (sessionError || !session) {
        setSessionError("This lesson is no longer available. Refresh your assigned lessons.");
        return;
      }
      setActiveSession(session as ClassroomSession);
      setLessonGuide({
        summary: notesResult.data?.summary || "",
        keyPoints: Array.isArray(notesResult.data?.key_points) ? notesResult.data.key_points.slice(0, 5) : [],
        workedExample: notesResult.data?.worked_example || "",
        exitQuestion: notesResult.data?.exit_question || "",
      });
      setChat((messagesResult.data ?? []).map(item => ({
        id: item.id,
        text: item.message,
        sender: item.sender_id === userId ? "You" : "Teacher",
        time: new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })));
      const completed = new Set((submissionsResult.data ?? []).filter(item => item.completed_at).map(item => item.homework_id));
      setHomework((homeworkResult.data ?? []).map(item => ({
        id: item.id, title: item.title, details: item.instructions || "",
        due: item.due_at || "", done: completed.has(item.id),
      })));
      const imageData = (boardResult.data?.board_state as { imageData?: string } | null)?.imageData;
      if (imageData && canvasRef.current) {
        const image = new Image();
        image.onload = () => {
          if (alive && canvasRef.current && !drawing.current) {
            const context = canvasRef.current.getContext("2d");
            context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            context?.drawImage(image, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        };
        image.src = imageData;
      }
      channel = supabase!.channel("studyspace-session-detail-" + activeSessionId)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_messages", filter: "session_id=eq." + activeSessionId }, payload => {
          const row = payload.new as { id: string; sender_id: string; message: string; created_at: string };
          if (!alive) return;
          setChat(current => current.some(item => item.id === row.id) ? current : [...current, {
            id: row.id, text: row.message, sender: row.sender_id === userId ? "You" : "Teacher",
            time: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }]);
           if (row.sender_id !== userId && tabRef.current !== "Class chat") {
             setUnreadChatCount(count => count + 1);
             setChatNotice("New message from your teacher.");
             if ("Notification" in window && Notification.permission === "granted") new Notification("Studyspace class chat", { body: "Your teacher sent a lesson message." });
           }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "class_sessions", filter: "id=eq." + activeSessionId }, payload => {
          const row = payload.new as ClassroomSession;
          if (alive) {
            setActiveSession(current => current ? { ...current, ...row } : row);
            setSessions(current => current.map(item => item.id === row.id ? { ...item, ...row } : item));
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "session_whiteboards", filter: "session_id=eq." + activeSessionId }, payload => {
          const data = (payload.new as { board_state?: { imageData?: string } }).board_state?.imageData;
          if (!alive || !data || !canvasRef.current || drawing.current) return;
          const image = new Image();
          image.onload = () => {
            if (alive && canvasRef.current && !drawing.current) {
              const context = canvasRef.current.getContext("2d");
              context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              context?.drawImage(image, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          };
          image.src = data;
        })
        .subscribe();
    };
    void loadDetails().catch(reason => { if (alive) setSessionError(reason instanceof Error ? "Lesson details could not be loaded: " + reason.message : "Lesson details could not be loaded. Check your connection and refresh."); });
    return () => { alive = false; if (channel && supabase) void supabase.removeChannel(channel); };
  }, [activeSessionId, userId]);

  useEffect(() => {
    const key = "studyspace-personal-session-notes:" + (activeSessionId || "personal");
    setPersonalNotes(readStoredNotes(key));
    setNotesSaved(false);
  }, [activeSessionId, userId]);

  useEffect(() => {
    const key = "studyspace-personal-session-notes:" + (activeSessionId || "personal");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(studentStorageKey(key), personalNotes);
        setNotesSaved(true);
      } catch {
        setNotesSaved(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [personalNotes, activeSessionId, userId]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.strokeStyle = tool === "eraser" ? "#ffffff" : ink;
    context.lineWidth = tool === "eraser" ? 24 : 3;
    context.lineCap = "round";
    context.lineJoin = "round";
  }
  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.stroke();
  }
  async function saveBoard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL("image/jpeg", 0.55);
    if (activeSessionId && userId && supabase) {
      setBoardNotice("Saving shared board…");
      try {
        const { error } = await supabase.from("session_whiteboards").upsert({
          session_id: activeSessionId, board_state: { version: 1, imageData },
          updated_by: userId, updated_at: new Date().toISOString(),
        }, { onConflict: "session_id" });
        if (error) throw error;
        setBoardNotice("Shared board saved.");
      } catch {
        setBoardNotice("The shared board could not be saved. Your drawing remains on this screen; reconnect and save again.");
      }
    } else {
      try {
        localStorage.setItem(studentStorageKey("studyspace-personal-worksheet"), imageData);
        setBoardNotice("Saved on this device. Your teacher will see it when a lesson is assigned.");
      } catch {
        setBoardNotice("Browser storage is full. Export important work before continuing.");
      }
    }
  }
  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    void saveBoard();
  }
  async function clearBoard() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await saveBoard();
  }

  async function startLessonPractice() {
    if (!supabase || practiceBusy) return;
    const notesText = [
      activeSession?.objectives || "",
      lessonGuide.summary,
      ...lessonGuide.keyPoints,
      lessonGuide.workedExample,
      lessonGuide.exitQuestion,
    ].filter(Boolean).join("\n\n");
    if (notesText.trim().length < 50) {
      setPracticeError("Your teacher's lesson guide does not contain enough material to build a reliable practice set yet.");
      return;
    }
    setPracticeBusy(true); setPracticeError("");
    try {
      const { data, error } = await supabase.functions.invoke("mia-assistant", {
        body: { action: "generate_topic_test", notesText, subject: activeSession?.subject_name || subjects[0]?.name || "General studies", topic: activeSession?.title || "Lesson understanding", fileName: "Teacher lesson guide" },
      });
      if (error) throw error;
      if (!data?.success || !Array.isArray(data.questions) || data.questions.length < 3) {
        throw new Error(data?.error || "The practice questions could not be prepared. Try again.");
      }
      setPracticeQuestions(data.questions as PracticeQuestion[]);
      setPracticeIndex(0); setPracticeAnswers({}); setPracticeComplete(false);
    } catch (reason) {
      setPracticeError(reason instanceof Error ? reason.message : "The practice questions could not be prepared.");
    } finally { setPracticeBusy(false); }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || !activeSessionId || !userId || !supabase || sending) return;
    setSending(true);
    setSessionError("");
    try {
      const { error } = await supabase.from("session_messages").insert({ session_id: activeSessionId, sender_id: userId, message: text });
      if (error) throw error;
      setMessage("");
    } catch {
      setSessionError("Message not sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function toggleHomework(item: Homework, done: boolean) {
    if (!userId || !supabase || homeworkBusy) return;
    setHomeworkBusy(item.id);
    setHomework(current => current.map(row => row.id === item.id ? { ...row, done } : row));
    try {
      const { error } = await supabase.from("session_homework_submissions").upsert({
        homework_id: item.id, learner_id: userId, completed_at: done ? new Date().toISOString() : null,
      }, { onConflict: "homework_id,learner_id" });
      if (error) throw error;
      setSessionError("");
    } catch {
      setHomework(current => current.map(row => row.id === item.id ? { ...row, done: item.done } : row));
      setSessionError("Homework progress could not be saved. Your previous completion status has been restored. Try again when connected.");
    } finally {
      setHomeworkBusy("");
    }
  }

  const tabs: { name: Tab; icon: typeof PenLine; hint: string }[] = [
    { name: "Solo study", icon: Sparkles, hint: "A step-by-step routine for studying alone" },
    { name: "Lesson guide", icon: BookOpen, hint: "Teacher's lesson and revision notes" },
    { name: "Worksheet", icon: PenLine, hint: "Work through examples" },
    { name: "Class chat", icon: MessageCircle, hint: "Ask your teacher" },
    { name: "Homework", icon: ClipboardList, hint: "Assigned follow-up work" },
  ];

  return (
    <section className="today-session">
      <div className="session-hero glass-panel">
        <div className="session-hero-top"><span className={activeSession?.status === "live" ? "session-live-dot" : "session-idle-dot"} /><span>YOUR CLASSROOM</span><span className="session-date">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</span></div>
        <div className="session-hero-main">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> LEARN TOGETHER</div>
            <h2>{activeSession?.title || "Today's learning space"}</h2>
            <p>{activeSession ? activeSession.subject_name + " · " + formatDate(activeSession.starts_at) : "Study independently with a guided routine, or choose one of your teacher's assigned lessons."}</p>
          </div>
          <div className="session-status"><Clock3 size={16} /> {activeSession?.status === "live" ? "Live class" : activeSession?.status === "ended" ? "Lesson completed" : activeSession?.status === "cancelled" ? "Cancelled" : activeSession ? "Assigned lesson" : connection}</div>
        </div>
        <div className="session-meta">
          <label>Assigned lesson
            <select value={activeSessionId} onChange={event => setActiveSessionId(event.target.value)} disabled={sessionLoading || !sessions.length}>
              {!sessions.length && <option value="">No assigned lessons yet</option>}
              {sessions.map(session => <option key={session.id} value={session.id}>{sessionLabel(session)}</option>)}
            </select>
          </label>
          <span className="session-save-state">{notesSaved ? "Personal notes saved" : "Your notes stay private to you"}</span>
          <button type="button" className="secondary-button" onClick={() => void refreshAssignedSessions(true)} disabled={refreshing}><RefreshCw size={14} /> {refreshing ? "Refreshing…" : "Refresh lessons"}</button>
        </div>
      </div>

      {sessionError && <div className="session-inline-error" role="alert">{sessionError}</div>}
      {activeSession?.id && activeSession.status === "live" && activeSession.meeting_url && (
        <LiveClassroomCall sessionId={activeSession.id} audience="student" />
      )}
      {activeSession?.status === "scheduled" && activeSession.meeting_url && (
        <div className="session-call-waiting"><Clock3 size={16} /><span>Your teacher has scheduled this lesson. The video room will be available here when the teacher starts the class.</span></div>
      )}
      {activeSession?.status === "ended" && <div className="session-call-waiting"><CheckCircle2 size={16} /><span>This lesson has ended. You can still review its lesson guide, discussion and homework.</span></div>}

      <div className="session-tabs" role="tablist" aria-label="Classroom workspaces">
        {tabs.map(item => (
          <button type="button" key={item.name} role="tab" aria-selected={tab === item.name} className={tab === item.name ? "active" : ""} onClick={() => { setTab(item.name); if (item.name === "Class chat") { setUnreadChatCount(0); setChatNotice(""); try { localStorage.setItem(studentStorageKey("studyspace-class-chat-read:" + activeSessionId), new Date().toISOString()); } catch { /* The in-session unread badge still clears. */ } } }}>
            <item.icon size={17} /><span>{item.name}{item.name === "Class chat" && unreadChatCount > 0 ? " (" + unreadChatCount + ")" : ""}</span><small>{item.hint}</small>
          </button>
        ))}
      </div>

      {tab === "Solo study" && <SoloStudyCoach subjects={subjects} />}

      {tab === "Lesson guide" && (
        <div className="glass-panel session-workspace">
          <div className="session-section-heading"><div><h3>Teacher's lesson guide</h3><p>Read the explanation first. Then use your private notes to record what you have learned.</p></div><BookOpen size={20} /></div>
          <div className="session-teacher-guide">
            {activeSession?.objectives && <div><strong>What you should learn</strong><p>{activeSession.objectives}</p></div>}
            {lessonGuide.summary && <div><strong>Lesson summary</strong><p>{lessonGuide.summary}</p></div>}
            {lessonGuide.keyPoints.length > 0 && <div><strong>Key points</strong><ol>{lessonGuide.keyPoints.map((point,index) => <li key={index}>{point}</li>)}</ol></div>}
            {lessonGuide.workedExample && <div><strong>Worked example</strong><p>{lessonGuide.workedExample}</p></div>}
            {lessonGuide.exitQuestion && <button type="button" className="session-exit-question session-exit-question-button" onClick={() => void startLessonPractice()} disabled={practiceBusy}><strong>Check your understanding</strong><p>{lessonGuide.exitQuestion}</p><span>{practiceBusy ? "Preparing your questions…" : "Tap to practise with multiple-choice questions →"}</span></button>}
            {(lessonGuide.summary || lessonGuide.keyPoints.length > 0 || lessonGuide.workedExample) && !lessonGuide.exitQuestion && <button type="button" className="session-practice-launch" onClick={() => void startLessonPractice()} disabled={practiceBusy}>{practiceBusy ? "Preparing practice…" : "Test your understanding · Multiple choice"}</button>}
            {practiceError && <p className="session-inline-error" role="alert">{practiceError}</p>}
            {practiceQuestions.length > 0 && <section className="session-practice-panel">
              <div className="session-section-heading"><div><h3>Lesson practice</h3><p>Choose the best answer. You will get feedback as you go.</p></div><Sparkles size={19}/></div>
              {practiceComplete ? <div className="session-practice-result"><strong>{practiceQuestions.filter((question,index)=>practiceAnswers[index]===question.answer).length} / {practiceQuestions.length} correct</strong><p>Review any missed answers in your lesson guide, then try again.</p><button type="button" className="secondary-button" onClick={()=>{setPracticeIndex(0);setPracticeAnswers({});setPracticeComplete(false);}}>Try again</button></div> : <>
                <div className="session-practice-progress"><span>Question {practiceIndex+1} of {practiceQuestions.length}</span><span>{practiceQuestions.filter((question,index)=>practiceAnswers[index]===question.answer).length} correct so far</span></div>
                <strong className="session-practice-prompt">{practiceQuestions[practiceIndex].prompt}</strong>
                <div className="session-practice-options">{practiceQuestions[practiceIndex].options.map(option=><button type="button" key={option} disabled={practiceAnswers[practiceIndex] !== undefined} className={practiceAnswers[practiceIndex]===option ? (option===practiceQuestions[practiceIndex].answer ? "is-correct" : "is-wrong") : practiceAnswers[practiceIndex]!==undefined && option===practiceQuestions[practiceIndex].answer ? "is-correct" : ""} onClick={()=>setPracticeAnswers(current=>({...current,[practiceIndex]:option}))}>{option}</button>)}</div>
                {practiceAnswers[practiceIndex] !== undefined && <div className="session-practice-feedback"><strong>{practiceAnswers[practiceIndex]===practiceQuestions[practiceIndex].answer ? "Correct!" : "Not quite — the correct answer is " + practiceQuestions[practiceIndex].answer + "."}</strong><p>{practiceQuestions[practiceIndex].explanation}</p><button type="button" className="primary-button" onClick={()=>{if(practiceIndex+1>=practiceQuestions.length)setPracticeComplete(true);else setPracticeIndex(index=>index+1);}}>{practiceIndex+1>=practiceQuestions.length ? "See my result" : "Next question"}</button></div>}
              </>}
            </section>}
            {!activeSession && <div className="session-guide-empty"><CalendarDays size={23} /><strong>No assigned lesson yet</strong><span>Your teacher's published lesson will appear here automatically.</span></div>}
            {activeSession && !lessonGuide.summary && lessonGuide.keyPoints.length === 0 && !lessonGuide.workedExample && (
              <div className="session-guide-empty"><BookOpen size={23} /><strong>Your teacher is preparing the lesson guide</strong><span>Check back after the lesson notes have been published.</span></div>
            )}
          </div>
          <label className="session-field session-personal-notes">My private revision notes
            <small className="session-field-hint">Only you can see these notes. They are saved on this device and are not sent to your teacher.</small>
            <textarea value={personalNotes} onChange={event => { setPersonalNotes(event.target.value); setNotesSaved(false); }} rows={9} placeholder={"Write definitions, examples, questions to revisit and your own summary…"} />
          </label>
          <div className="session-note-footer"><span>{notesSaved ? "Saved on this device" : "Saving your private notes…"}</span><button type="button" className="secondary-button" onClick={() => setPersonalNotes("")}>Clear my notes</button></div>
        </div>
      )}

      {tab === "Worksheet" && (
        <div className="glass-panel session-workspace">
          <div className="session-section-heading">
            <div><h3>Shared worksheet</h3><p>Use this board for calculations, diagrams and rough work. Your latest saved board is shared with your teacher and assigned classmates.</p></div>
            <div className="board-tools"><button type="button" className={tool === "pen" ? "selected" : ""} onClick={() => setTool("pen")}><PenLine size={15} /> Pen</button><button type="button" className={tool === "eraser" ? "selected" : ""} onClick={() => setTool("eraser")}><Eraser size={15} /> Eraser</button><input aria-label="Pen colour" type="color" value={ink} onChange={event => setInk(event.target.value)} /><button type="button" onClick={() => void clearBoard()}>Clear board</button></div>
          </div>
          <div className="worksheet-paper"><canvas ref={canvasRef} width={1200} height={680} onPointerDown={startDraw} onPointerMove={draw} onPointerUp={stopDraw} onPointerCancel={stopDraw} onPointerLeave={stopDraw} aria-label="Shared classroom worksheet" /></div>
          <p className="session-footnote">{activeSessionId ? "One shared board is saved for this lesson. Coordinate before editing at the same time because the latest saved image replaces the previous one." : "You can practise here before a teacher assigns a lesson. Work is saved only on this device."}</p>
          {boardNotice && <p className="inline-message" role="status">{boardNotice}</p>}
        </div>
      )}

      {tab === "Class chat" && (
        <div className="glass-panel session-workspace session-chat">
          <div className="session-section-heading"><div><h3>Ask your teacher</h3><p>Keep questions connected to the lesson so you can find the answer later.</p></div><MessageCircle size={20} /></div>
          <div className="session-chat-notice"><Users size={16} /><span>{activeSessionId ? "Messages in this room are shared with your teacher and the learners assigned to this lesson." : "Class chat becomes available when a lesson is assigned to you."}</span></div>
          {chatNotice && tab === "Class chat" && <p className="session-chat-new-notice" role="status">{chatNotice}</p>}<div className="session-chat-list">{chat.length ? chat.map(item => <article key={item.id} className="session-chat-message"><div><strong>{item.sender}</strong><time>{item.time}</time></div><p>{item.text}</p></article>) : <div className="session-chat-empty"><MessageCircle size={25} /><strong>No messages yet</strong><span>Ask a question when your lesson is assigned.</span></div>}</div>
          <form className="session-chat-compose" onSubmit={sendMessage}><input value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} placeholder="Write a question or message…" aria-label="Message" disabled={!activeSessionId || sending} /><button className="primary-button" type="submit" disabled={!message.trim() || !activeSessionId || sending}><Send size={16} /> {sending ? "Sending…" : "Send"}</button></form>
        </div>
      )}

      {tab === "Homework" && (
        <div className="glass-panel session-workspace">
          <div className="session-section-heading"><div><h3>Teacher-assigned homework</h3><p>Complete each task and tick it off. Your teacher can see your completion status.</p></div><ClipboardList size={20} /></div>
          <div className="session-homework-list">{homework.length ? homework.map(item => (
            <article key={item.id} className={item.done ? "homework-done" : ""}>
              <label><input type="checkbox" checked={item.done} disabled={homeworkBusy === item.id || !activeSessionId} onChange={event => void toggleHomework(item, event.target.checked)} />
                <span><strong>{item.title}</strong><small>{item.due ? "Due " + new Date(item.due).toLocaleDateString() : "No due date"}</small>{item.details && <p>{item.details}</p>}</span>
              </label>
              {item.done && <span className="homework-complete-label"><CheckCircle2 size={14} /> Completed</span>}
            </article>
          )) : <div className="session-chat-empty"><ClipboardList size={25} /><strong>{activeSession ? "No homework assigned yet" : "No homework to show"}</strong><span>When your teacher assigns follow-up work, it will appear here.</span></div>}</div>
        </div>
      )}

      <div className="session-classroom-guide">
        <strong>Make every study session count</strong>
        <span><b>1</b> Understand one idea</span><span><b>2</b> Recall it without looking</span><span><b>3</b> Practise a real question</span><span><b>4</b> Correct mistakes and plan what to revisit</span>
      </div>
    </section>
  );
}
