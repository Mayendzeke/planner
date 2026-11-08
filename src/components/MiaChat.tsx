import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, Plus, LoaderCircle, CalendarDays, CheckCircle2, BookOpen, ChevronLeft, ChevronRight, RotateCw, Brain, Sparkles } from "lucide-react";
import { strFromU8, unzipSync } from "fflate";
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
import { supabase } from "../lib/supabase";
import type { StudentProfile } from "./StudentOnboarding";
import type { Subject } from "../data/db";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; uri: string }[];
  searchSuggestionsHtml?: string;
};
type Flashcard = { front: string; back: string; visualCue?: string };
type MiaAttachment = { name: string; mimeType: string; data?: string; textContent?: string };
function extractFlashcards(reply: string): Flashcard[] {
  const cards: Flashcard[] = [];
  let front = "";
  let back = "";
  let visualCue = "";
  let side: "front" | "back" | null = null;
  const clean = (value: string) => value.replace(/\*\*/g, "").replace(/^[-*]\s*/, "").trim();
  for (const rawLine of reply.split(/\r?\n/)) {
    const line = rawLine.trim();
    const frontMatch = line.match(/^(?:[-*]\s*)?(?:\*\*)?(?:card\s+)?(?:front|question)(?:\*\*)?\s*[:：]\s*(?:\*\*)?(.*)$/i);
    const backMatch = line.match(/^(?:[-*]\s*)?(?:\*\*)?(?:card\s+)?(?:back|answer)(?:\*\*)?\s*[:：]\s*(?:\*\*)?(.*)$/i);
    const cueMatch = line.match(/^(?:[-*]\s*)?(?:\*\*)?(?:visual cue|memory cue)(?:\*\*)?\s*[:：]\s*(.*)$/i);
    if (cueMatch) { visualCue = clean(cueMatch[1]); continue; }
    if (frontMatch) {
      if (front && back) cards.push({ front: clean(front), back: clean(back), visualCue });
      front = frontMatch[1]; back = ""; visualCue = ""; side = "front";
    } else if (backMatch && front) {
      back = backMatch[1]; side = "back";
    } else if (side === "front" && line) {
      front += " " + line;
    } else if (side === "back" && line) {
      back += " " + line;
    }
  }
  if (front && back) cards.push({ front: clean(front), back: clean(back), visualCue });
  return cards.filter(card => card.front && card.back).slice(0, 40);
}
type TimetableEntry = { day_of_week: number; subject_name: string; title: string; starts_at: string; ends_at: string; location: string; notes: string };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const welcome: ChatMessage = { id: "mia-welcome", role: "assistant", content: "Hi! I'm MIΛ, your personal learning companion. I know your subjects and study goals, and I can help you understand lessons, practise questions, prepare for exams and organise your study. What shall we work on?" };

function extractOfficeText(buffer: ArrayBuffer, extension: string): string {
  const archive = unzipSync(new Uint8Array(buffer));
  const readXml = (path: string) => {
    const bytes = archive[path];
    if (!bytes) return null;
    const document = new DOMParser().parseFromString(strFromU8(bytes), "application/xml");
    if (document.getElementsByTagName("parsererror").length) throw new Error("This office document contains invalid XML.");
    return document;
  };
  if (extension === "docx") {
    const document = readXml("word/document.xml");
    if (!document) throw new Error("The Word document could not be read.");
    return Array.from(document.getElementsByTagName("w:p")).map(paragraph =>
      Array.from(paragraph.getElementsByTagName("w:t")).map(node => node.textContent || "").join("")
    ).filter(Boolean).join("\n");
  }
  if (extension === "pptx") {
    const slides = Object.keys(archive).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a,b) =>
      Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0)
    );
    return slides.map(path => {
      const document = readXml(path);
      return document ? Array.from(document.getElementsByTagName("a:p")).map(paragraph =>
        Array.from(paragraph.getElementsByTagName("a:t")).map(node => node.textContent || "").join("")
      ).filter(Boolean).join(" ") : "";
    }).filter(Boolean).join("\n");
  }
  const sharedDocument = readXml("xl/sharedStrings.xml");
  const shared = sharedDocument ? Array.from(sharedDocument.getElementsByTagName("si")).map(item =>
    Array.from(item.getElementsByTagName("t")).map(node => node.textContent || "").join("")
  ) : [];
  const sheets = Object.keys(archive).filter(path => /^xl\/worksheets\/sheet\d+\.xml$/.test(path)).sort((a,b) =>
    Number(a.match(/sheet(\d+)/)?.[1] || 0) - Number(b.match(/sheet(\d+)/)?.[1] || 0)
  );
  return sheets.map(path => {
    const document = readXml(path);
    if (!document) return "";
    return Array.from(document.getElementsByTagName("row")).map(row =>
      Array.from(row.getElementsByTagName("c")).map(cell => {
        const value = cell.getElementsByTagName("v")[0]?.textContent || "";
        if (cell.getAttribute("t") === "s") return shared[Number(value)] || "";
        if (cell.getAttribute("t") === "inlineStr") return Array.from(cell.getElementsByTagName("t")).map(node => node.textContent || "").join("");
        return value;
      }).join("\t")
    ).join("\n");
  }).filter(Boolean).join("\n");
}

async function filePayload(file: File): Promise<MiaAttachment> {
  const buffer = await file.arrayBuffer();
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type || ({
    pdf: "application/pdf", txt: "text/plain", md: "text/markdown", csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  }[extension] ?? "application/octet-stream");

  if (["docx", "pptx", "xlsx"].includes(extension)) {
    const textContent = extractOfficeText(buffer, extension).trim();
    if (!textContent) throw new Error("No readable text was found in this office document.");
    return { name: file.name, mimeType: "text/plain", textContent: textContent.slice(0, 50000) };
  }

  if (extension === "pdf" || mimeType === "application/pdf") {
    const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    try {
      const pages: string[] = [];
      for (let number = 1; number <= Math.min(document.numPages, 30); number += 1) {
        const page = await document.getPage(number);
        const text = await page.getTextContent();
        const extracted = text.items.map((item: unknown) => {
          if (!item || typeof item !== "object" || !("str" in item)) return "";
          const value = (item as { str?: unknown }).str;
          return typeof value === "string" ? value : "";
        }).filter(Boolean);
        pages.push(extracted.join(" "));
        if (pages.join("\n").length >= 48000) break;
      }
      const textContent = pages.join("\n").slice(0, 50000).trim();
      if (textContent.length < 30) {
        throw new Error("This PDF has no selectable text. Scanned PDFs are not readable here yet; use a text-based PDF or paste the relevant text.");
      }
      return { name: file.name, mimeType: "text/plain", textContent };
    } finally {
      await document.destroy();
    }
  }

  if (mimeType.startsWith("text/") || ["text/plain", "text/markdown", "text/csv", "application/json", "application/xml"].includes(mimeType)) {
    return { name: file.name, mimeType, textContent: (await file.text()).slice(0, 50000) };
  }

  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { name: file.name, mimeType, data: btoa(binary) };
  }

  throw new Error("This attachment format is not supported by MIΛ.");
}

async function functionErrorMessage(error: unknown): Promise<string> {
  const value = error as { message?: string; context?: Response };
  const context = value?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
      if (typeof body?.message === "string" && body.message.trim()) return body.message;
    } catch {
      try {
        const body = await context.clone().text();
        if (body.trim()) return body.trim().slice(0, 500);
      } catch { /* Use the original client error below. */ }
    }
    return "MIΛ returned HTTP " + context.status + ". Please try again.";
  }
  return typeof value?.message === "string" && value.message.trim()
    ? value.message
    : "MIΛ could not complete the request. Check your connection and retry.";
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
  const [usageChecked, setUsageChecked] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFloating = variant === "floating";
  const isTertiaryLearner = /college|university|tertiary/i.test(profile.level || "");

  useEffect(() => {
    let alive = true;
    async function restore() {
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      try {
        const { data: usage, error: usageError } = await supabase.functions.invoke("mia-assistant", { body: { action: "usage_status" } });
        if (alive) {
          setUsageChecked(true);
          if (!usageError && typeof usage?.remainingDailyRequests === "number") setRemaining(usage.remainingDailyRequests);
        }
      } catch { if (alive) setUsageChecked(true); }
      const { data: conv } = await supabase.from("mia_conversations").select("id")
        .eq("learner_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (!alive || !conv?.id) return;
      const { data } = await supabase.from("mia_messages").select("id,role,content")
        .eq("conversation_id", conv.id).eq("learner_id", userId)
        .order("created_at", { ascending: true }).limit(20);
      if (!alive) return;
      setConversationId(conv.id);
      if (data?.length) {
        const restored = data.map(row => ({ id: String(row.id), role: row.role as "user" | "assistant", content: row.content }));
        const latestCardReply = [...restored].reverse().find(row => row.role === "assistant" && extractFlashcards(row.content).length);
        if (latestCardReply) {
          setFlashcards(extractFlashcards(latestCardReply.content));
          setFlashcardIndex(0);
          setFlashcardFlipped(false);
        }
        setMessages(restored.filter(row => !(row.role === "assistant" && extractFlashcards(row.content).length)));
      }
    }
    void restore();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, draft]);

  async function sendMessage() {
    const value = text.trim();
    if ((!value && !attachment) || busy || !supabase) return;
    setError("");
    setBusy(true);
    setText("");
    const file = attachment;
    const displayMessage = value || (file ? "Please review the attached file: " + file.name : "");
    const outgoingId = crypto.randomUUID();
    setMessages(current => [...current, { id: outgoingId, role: "user", content: displayMessage + (file ? " · " + file.name : "") }]);
    try {
      const uploaded = file ? await filePayload(file) : null;
      if (uploaded?.textContent && !value) setText("");
      const { data, error: invokeError } = await supabase.functions.invoke("mia-assistant", {
        body: { action: "chat", message: displayMessage + (uploaded?.textContent ? "\n\nATTACHED FILE (" + uploaded.name + "):\n" + uploaded.textContent : ""), attachment: uploaded?.data ? uploaded : null, conversationId },
      });
      if (invokeError) throw new Error(await functionErrorMessage(invokeError));
      if (!data?.success || typeof data.reply !== "string") throw new Error(data?.error || "MIΛ could not reply. Please try again.");
      setConversationId(data.conversationId);
      setRemaining(typeof data.remainingDailyRequests === "number" ? data.remainingDailyRequests : null);
      const cards = extractFlashcards(data.reply);
      const groundingSources = Array.isArray(data.sources)
        ? data.sources.filter((source: any) => source && typeof source.title === "string"
          && typeof source.uri === "string" && source.uri.startsWith("https://"))
          .slice(0, 6)
          .map((source: any) => ({ title: source.title.slice(0, 160), uri: source.uri }))
        : [];
      const searchSuggestionsHtml = typeof data.searchSuggestionsHtml === "string"
        && data.searchSuggestionsHtml.length <= 30000 ? data.searchSuggestionsHtml : undefined;
      if (cards.length) {
        setFlashcards(cards);
        setFlashcardIndex(0);
        setFlashcardFlipped(false);
        if (groundingSources.length || searchSuggestionsHtml) {
          setMessages(current => [...current, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I checked current sources for this syllabus-related request.",
            sources: groundingSources,
            searchSuggestionsHtml,
          }]);
        }
      } else {
        setMessages(current => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          sources: groundingSources,
          searchSuggestionsHtml,
        }]);
      }
      setAttachment(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "MIΛ could not reply. Check your connection.");
      setMessages(current => current.filter(item => item.id !== outgoingId));
      setText(value);
      setAttachment(file);
    } finally { setBusy(false); inputRef.current?.focus(); }
  }

  async function reviewTimetable() {
    if (!attachment || busy || !supabase) return;
    setError(""); setBusy(true); setDraft([]); setSaved(false); setTimetableKind("");
    try {
      if (!attachment.type.startsWith("image/")) throw new Error("Timetable import currently needs a photo or image file.");
      const image = await filePayload(attachment);
      const { data, error: invokeError } = await supabase.functions.invoke("mia-assistant", {
        body: { action: "parse_timetable", image: { mimeType: image.mimeType, data: image.data }, conversationId, message: text.trim() },
      });
      if (invokeError) throw new Error(await functionErrorMessage(invokeError));
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
    setConversationId(null); setMessages([welcome]); setDraft([]); setError(""); setSaved(false); setFlashcards([]); setFlashcardIndex(0); setFlashcardFlipped(false);
  }

  return <section className={"mia-shell " + (isFloating ? "mia-floating-shell" : "mia-studio-shell")} aria-label="MIΛ learning assistant">
    <header className="mia-header">
      <div className="mia-brand-mark">Λ</div>
      <div className="mia-brand-copy"><strong>MIΛ</strong><span>YOUR LEARNING COMPANION · GEMMA 4</span></div>
      <div className="mia-header-actions">
        <span className="mia-remaining">{remaining === null ? (usageChecked ? "Limit unavailable" : "Checking daily limit…") : remaining + " left · 24h"}</span>
        <button className="mia-icon-button" onClick={newChat} title="New chat" aria-label="Start a new chat"><Plus size={17}/></button>
        {onClose && <button className="mia-icon-button" onClick={onClose} aria-label="Close MIΛ"><X size={18}/></button>}
      </div>
    </header>
    <div className="mia-context-strip"><BookOpen size={14}/><span>{profile.level} · {profile.grade} · {profile.curriculum || "Curriculum not set"}</span><span className="mia-context-dot"/> <span>{subjects.length} subjects</span></div>
    <div className="mia-messages" ref={scrollRef}>
      {messages.map(message => <article key={message.id} className={"mia-message-row " + (message.role === "user" ? "is-user" : "is-assistant")}>
        {message.role === "assistant" && <div className="mia-message-avatar">Λ</div>}
        <div className="mia-message-bubble">
          {message.content}
          {message.role === "assistant" && !!message.sources?.length && <div className="mia-grounding-sources">
            <strong>Sources checked</strong>
            {message.sources.map((source, index) => <a key={source.uri + index} href={source.uri} target="_blank" rel="noopener noreferrer">{source.title}</a>)}
          </div>}
          {message.role === "assistant" && message.searchSuggestionsHtml && <iframe
            className="mia-search-suggestions-frame"
            title="Google Search suggestions"
            srcDoc={message.searchSuggestionsHtml}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            loading="lazy"
          />}
        </div>
      </article>)}
      {busy && <div className="mia-message-row is-assistant"><div className="mia-message-avatar">Λ</div><div className="mia-message-bubble mia-thinking"><LoaderCircle size={15}/> MIΛ is thinking…</div></div>}
      {draft.length > 0 && <section className="mia-timetable-review">
        <div className="mia-review-heading"><CalendarDays size={17}/><div><strong>Review extracted timetable</strong><span>{draft.length} entries detected · Nothing saved yet</span></div></div>
        <div className="mia-table-scroll"><table><thead><tr><th>Day</th><th>Subject / activity</th><th>Time</th></tr></thead><tbody>{draft.map((entry,i)=><tr key={i}>
          <td><select aria-label="Edit timetable day" value={entry.day_of_week} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,day_of_week:Number(e.target.value)}:row))}>{days.map((day,index)=><option key={day} value={index}>{day}</option>)}</select></td>
          <td><select aria-label="Edit timetable subject" value={entry.subject_name || entry.title} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,subject_name:e.target.value,title:e.target.value}:row))}><option value={entry.subject_name || entry.title}>{entry.subject_name || entry.title || "Choose subject"}</option>{subjects.filter(subject=>subject.name!==(entry.subject_name||entry.title)).map(subject=><option key={subject.id} value={subject.name}>{subject.name}</option>)}</select></td>
          <td><div className="mia-time-edit"><input aria-label="Start time" type="time" value={entry.starts_at} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,starts_at:e.target.value}:row))}/><input aria-label="End time" type="time" value={entry.ends_at} onChange={e=>setDraft(current=>current.map((row,index)=>index===i?{...row,ends_at:e.target.value}:row))}/></div></td>
          <td><button type="button" className="mia-remove-entry" onClick={()=>setDraft(current=>current.filter((_,index)=>index!==i))} aria-label="Remove timetable entry">×</button></td>
        </tr>)}</tbody></table></div>
        <p>Before saving, tell MIΛ which timetable this is. School lessons and your own study sessions will be stored separately.</p>
        <div className="mia-kind-options"><button className={timetableKind === "school" ? "selected" : ""} onClick={()=>setTimetableKind("school")}><BookOpen size={15}/> School timetable</button><button className={timetableKind === "personal" ? "selected" : ""} onClick={()=>setTimetableKind("personal")}><CalendarDays size={15}/> Personal study timetable</button></div>
        <button className="mia-confirm-button" disabled={!timetableKind || busy} onClick={()=>void saveTimetable()}><CheckCircle2 size={16}/> Confirm and save timetable</button>
      </section>}
      {flashcards.length > 0 && <section className="mia-visual-flashcards" aria-label="Interactive flashcards">
        <div className="mia-flashcard-heading"><div><span><Brain size={15}/> ACTIVE RECALL</span><strong>Visual flashcards</strong><small>Tap the card to reveal the answer</small></div><span className="mia-flashcard-count">{flashcardIndex+1} / {flashcards.length}</span></div>
        <button type="button" className={"mia-flashcard "+(flashcardFlipped?"flipped":"")} onClick={()=>setFlashcardFlipped(value=>!value)} aria-label="Flip flashcard">
          <span className="mia-flashcard-decoration"><Sparkles size={19}/><i/><i/><i/></span>
          <span className="mia-flashcard-cue">{flashcards[flashcardIndex].visualCue || "🧠"} <small>VISUAL MEMORY CUE</small></span>
          <span className="mia-flashcard-side">{flashcardFlipped?"REMEMBER THIS":"THINK ABOUT IT"}</span>
          <strong>{flashcardFlipped?flashcards[flashcardIndex].back:flashcards[flashcardIndex].front}</strong>
          <small>{flashcardFlipped?"Answer · Tap to see question":"Question · Tap to reveal"}</small>
        </button>
        <div className="mia-flashcard-controls">
          <button type="button" onClick={()=>{setFlashcardIndex(value=>(value-1+flashcards.length)%flashcards.length);setFlashcardFlipped(false);}}><ChevronLeft size={16}/> Previous</button>
          <button type="button" onClick={()=>setFlashcardFlipped(value=>!value)}><RotateCw size={15}/> Flip</button>
          <button type="button" onClick={()=>{setFlashcardIndex(value=>(value+1)%flashcards.length);setFlashcardFlipped(false);}}>Next <ChevronRight size={16}/></button>
        </div>
      </section>}
      {saved && <div className="mia-saved-note"><CheckCircle2 size={15}/> Timetable saved successfully.</div>}
      {error && <div className="mia-error" role="alert">{error}</div>}
    </div>
    {messages.length === 1 && draft.length === 0 && <div className="mia-quick-actions" aria-label="MIΛ study tools">
      <button type="button" onClick={()=>setText("Help me understand a difficult topic in one of my subjects. Ask me which topic if needed.")}>Explain a topic</button>
      <button type="button" onClick={()=>setText("Quiz me on one of my current subjects. Start with five questions and adapt to my answers.")}>Quiz me</button>
      <button type="button" onClick={()=>setText("Turn my lesson notes into concise revision notes with key definitions and examples. I will attach or paste the lesson.")}>Summarise notes</button>
      <button type="button" onClick={()=>setText("Help me create a realistic revision plan using my subjects, goals and available study time.")}>Plan revision</button>
      {isTertiaryLearner && <button type="button" onClick={()=>setText("Help me research my college or university assignment. Start with credible academic references and source details, explain the evidence, help me develop my own argument and outline, and guide me through correct in-text citations and a reference list. Do not write the assignment for me. Ask for the assignment brief, subject and required referencing style if missing.")}>Research & references</button>}
      <button type="button" onClick={()=>setText("Create a set of useful flashcards for a topic I am revising. Ask me for the subject and topic.")}>Flashcards</button>
    </div>}
    {attachment && <div className="mia-attachment-preview"><Paperclip size={15}/><span>{attachment.name}</span>{attachment.type.startsWith("image/") && <button type="button" onClick={()=>void reviewTimetable()} title="Import this image as a timetable">Read timetable</button>}<button type="button" onClick={()=>setAttachment(null)} aria-label="Remove attachment"><X size={14}/></button></div>}
    <div className="mia-usage-note">{remaining === null ? (usageChecked ? "Daily usage limit unavailable" : "Checking your daily allowance…") : remaining + " requests remaining"} · rolling 24-hour limit</div>
    <form className="mia-composer" onSubmit={event=>{event.preventDefault(); void sendMessage();}}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,.txt,.md,.csv,.json,.xml,.html,.pdf,.docx,.pptx,.xlsx" hidden onChange={event=>{const file=event.target.files?.[0];if(file){const ext=file.name.split(".").pop()?.toLowerCase()||"";const allowed=file.type.startsWith("image/")&&["image/jpeg","image/png","image/webp"].includes(file.type)||["pdf","txt","md","csv","json","xml","html","docx","pptx","xlsx"].includes(ext);if(!allowed){setError("Attach an image, PDF, DOCX, PPTX, XLSX, TXT, Markdown, CSV, JSON or XML file.");}else if(file.size>4*1024*1024){setError("Choose a file smaller than 4 MB.");}else{setError("");setAttachment(file);}}event.currentTarget.value="";}}/>
      <button type="button" className="mia-attach-button" onClick={()=>fileRef.current?.click()} title="Attach an image, PDF or text file" aria-label="Attach a file"><Paperclip size={19}/></button>
      <textarea ref={inputRef} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void sendMessage();}}} placeholder="Message MIΛ about your studies…" rows={1} maxLength={3000}/>
      <button type="submit" className="mia-send-button" disabled={busy || (!text.trim() && !attachment)} title={attachment ? "Send attachment" : "Send message"} aria-label={attachment ? "Send attachment" : "Send message"}>{busy?<LoaderCircle size={18} className="mia-spin"/>:<Send size={18}/>}</button>
    </form>
    <div className="mia-footnote">Study-focused · Short answers · Cloudflare Workers AI processes prompts; avoid sharing personal details</div>
  </section>;
}
