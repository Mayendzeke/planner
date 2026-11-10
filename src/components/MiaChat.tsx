import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, Plus, LoaderCircle, CalendarDays, CheckCircle2, BookOpen, ChevronLeft, ChevronRight, RotateCw, Brain, Sparkles, MessageCircle, FileText } from "lucide-react";
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
  sources?: { title: string; uri: string; kind?: "studyspace_material"; subject?: string; topic?: string }[];
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
const createWelcome = (profile: StudentProfile, subjects: Subject[]): string => {
  const name = profile.preferredName?.trim() || profile.fullName?.trim().split(/\s+/)[0] || "";
  const subjectNames = subjects.map(subject => subject.name).filter(Boolean).slice(0, 5);
  const context = [profile.level, profile.grade].filter(Boolean).join(" · ") || "your studies";
  return "Hello" + (name ? " " + name : "") + ". I’m MIΛ, your personal learning companion. I’m ready to help with " + context + (subjectNames.length ? " in " + subjectNames.join(", ") : "") + ". Choose the kind of help you need below, or ask me anything related to your learning.";
};
type HelpOption = { id: string; title: string; description: string; icon: typeof BookOpen; prompt: string; tertiaryOnly?: boolean };
const helpOptions: HelpOption[] = [
  { id: "topic", title: "Understand a topic", description: "Step-by-step explanations at your level.", icon: BookOpen, prompt: "Help me understand a topic in one of my registered subjects. Use my grade, curriculum and learning history to explain it at the right level. Ask me for the subject and exact topic if needed, use a clear example, and finish with one short understanding check." },
  { id: "homework", title: "Homework help", description: "Work through a question without skipping the learning.", icon: CheckCircle2, prompt: "Help me understand and work through my homework. I will paste or attach the question. Explain what it is asking, guide me through the steps, and help me produce my own answer rather than simply doing the work for me." },
  { id: "revision", title: "Exam revision", description: "Focus on topics and skills that need practice.", icon: Brain, prompt: "Help me prepare for an upcoming test or exam. Use my registered subjects, grade, curriculum and recorded learning difficulties to suggest relevant revision. Ask for the subject, topic and exam date only if needed, then make a focused revision sequence." },
  { id: "practice", title: "Practice questions", description: "Try questions and get feedback as you go.", icon: Sparkles, prompt: "Give me a short adaptive practice quiz in one of my registered subjects. Start with five age-appropriate curriculum-aligned questions, one at a time. Let me attempt each answer before showing feedback, explain mistakes, and adjust the difficulty." },
  { id: "materials", title: "My study materials", description: "Find resources assigned to you in StudySpace.", icon: Paperclip, prompt: "Find the StudySpace learning materials assigned to me that are relevant to the subject or topic I want to study. Show me the exact resource titles and links available to my account, then help me decide which one to use. Ask for the subject or topic if it is not clear." },
  { id: "plan", title: "Plan my study week", description: "Build a realistic plan around your study goals.", icon: CalendarDays, prompt: "Help me organise my study week using my saved goal, target mark, weekly study hours, preferred days, registered subjects and recent learning needs. Suggest a balanced plan with realistic blocks and breaks." },
  { id: "research", title: "Research & references", description: "Learn to find, assess and cite academic sources.", icon: BookOpen, prompt: "Coach me through academic research for my college or university work. Help refine my question, develop search terms, evaluate source quality, structure an outline and format citations using sources I provide. Do not invent references or claim to have searched the live web. Do not write an assignment for submission. Ask for my course, question and referencing style only when essential.", tertiaryOnly: true },
  { id: "flashcards", title: "Create flashcards", description: "Turn a topic into active-recall cards.", icon: Brain, prompt: "Create 8 concise study flashcards about a topic from my registered subjects, matched to my grade and curriculum. Use exactly this format for every card, with one pair per card: Front: [short question or term]\nBack: [clear answer, definition or worked step]\nVisual cue: [short memory clue]. Do not add an introduction or conclusion." },
  { id: "notes", title: "Make revision notes", description: "Organise key ideas, definitions and examples.", icon: FileText, prompt: "Create clear, exam-ready revision notes for the topic I name. Match my grade, curriculum and registered subject. Include a short overview, key definitions, essential facts or formulas, one worked example, common mistakes and a 5-point self-check with answers. Use headings and concise language. Do not invent syllabus requirements." },
  { id: "language", title: "Language practice", description: "Build vocabulary, grammar and writing skills.", icon: MessageCircle, prompt: "Act as my language-learning tutor. Help me practise vocabulary, grammar, reading comprehension, translation or writing in the language and at the level I choose. Start with one short exercise, let me answer, then correct my work and explain the correction clearly. Ask which language or skill only if I have not specified it." },
  { id: "writing", title: "Improve my writing", description: "Get feedback on structure, clarity and grammar.", icon: BookOpen, prompt: "Help me improve my own school or academic writing. Review the text I provide for clarity, structure, grammar, argument and evidence. Show specific suggested edits and explain why they help. Preserve my ideas and voice; do not write a complete assignment for submission. If I have not attached or pasted my writing, ask me to provide it." },
  { id: "coding", title: "Coding & ICT help", description: "Understand code and solve learning exercises.", icon: Sparkles, prompt: "Help me learn a computing or coding concept. Explain it at my level, inspect any code or error I provide, identify the cause, show a corrected example and explain each important change. Use safe educational examples and do not ask for passwords, API keys or private credentials." },
];

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TimetableEntry[]>([]);
  const [timetableKind, setTimetableKind] = useState<"school" | "personal" | "">("");
  const [saved, setSaved] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const keepTranscriptAtBottomRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFloating = variant === "floating";
  const isTertiaryLearner = /college|university|tertiary/i.test(profile.level || "");
  const welcomeText = createWelcome(profile, subjects);
  const [learningNoticeVisible, setLearningNoticeVisible] = useState(true);
  const [learningNoticeFading, setLearningNoticeFading] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [welcomeFading, setWelcomeFading] = useState(false);
  const welcomeFadeTimer = useRef<number | null>(null);
  const welcomeDismissTimer = useRef<number | null>(null);

  function dismissWelcome() {
    if (welcomeFadeTimer.current !== null) {
      window.clearTimeout(welcomeFadeTimer.current);
      welcomeFadeTimer.current = null;
    }
    setWelcomeFading(true);
    if (welcomeDismissTimer.current !== null) window.clearTimeout(welcomeDismissTimer.current);
    welcomeDismissTimer.current = window.setTimeout(() => {
      setWelcomeVisible(false);
      welcomeDismissTimer.current = null;
    }, 420);
  }

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
    const fadeTimer = window.setTimeout(() => setLearningNoticeFading(true), 4200);
    const removeTimer = window.setTimeout(() => setLearningNoticeVisible(false), 4620);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(removeTimer); };
  }, []);

  useEffect(() => {
    welcomeFadeTimer.current = window.setTimeout(dismissWelcome, 4200);
    return () => {
      if (welcomeFadeTimer.current !== null) window.clearTimeout(welcomeFadeTimer.current);
      if (welcomeDismissTimer.current !== null) window.clearTimeout(welcomeDismissTimer.current);
    };
  }, []);

  const handleTranscriptScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    keepTranscriptAtBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 88;
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !keepTranscriptAtBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, busy, draft]);

  async function sendMessage(overrideText?: string) {
    const value = (overrideText ?? text).trim();
    if ((!value && !attachment) || busy || !supabase) return;
    setError("");
    setBusy(true);
    setText("");
    const file = attachment;
    const displayMessage = value || (file ? "Please review the attached file: " + file.name : "");
    const outgoingId = crypto.randomUUID();
    keepTranscriptAtBottomRef.current = true;
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
      const providerNotice = typeof data.providerNotice === "string" && data.providerNotice.trim() ? [{ id: crypto.randomUUID(), role: "assistant" as const, content: data.providerNotice }] : [];
      const cards = extractFlashcards(data.reply);
      const groundingSources = Array.isArray(data.sources)
        ? data.sources.filter((source: any) => source && typeof source.title === "string"
          && typeof source.uri === "string" && source.uri.startsWith("https://"))
          .slice(0, 6)
          .map((source: any) => ({ title: source.title.slice(0, 160), uri: source.uri, kind: source.kind === "studyspace_material" ? "studyspace_material" as const : undefined, subject: typeof source.subject === "string" ? source.subject.slice(0, 100) : undefined, topic: typeof source.topic === "string" ? source.topic.slice(0, 120) : undefined }))
        : [];
      const searchSuggestionsHtml = typeof data.searchSuggestionsHtml === "string"
        && data.searchSuggestionsHtml.length <= 30000 ? data.searchSuggestionsHtml : undefined;
      if (cards.length) {
        setFlashcards(cards);
        setFlashcardIndex(0);
        setFlashcardFlipped(false);
        if (groundingSources.length || searchSuggestionsHtml) {
          setMessages(current => [...current, ...providerNotice, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I checked current sources for this syllabus-related request.",
            sources: groundingSources,
            searchSuggestionsHtml,
          }]);
        } else if (providerNotice.length) {
          setMessages(current => [...current, ...providerNotice]);
        }
      } else {
        setMessages(current => [...current, ...providerNotice, {
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
      setDraft(Array.isArray(data.timetableDraft) ? data.timetableDraft : []);
      setMessages(current => [...current, ...(typeof data.providerNotice === "string" && data.providerNotice.trim() ? [{ id: crypto.randomUUID(), role: "assistant" as const, content: data.providerNotice }] : []), { id: crypto.randomUUID(), role: "assistant", content: data.reply }]);
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
    keepTranscriptAtBottomRef.current = false;
    setConversationId(null); setMessages([]); setDraft([]); setError(""); setSaved(false); setFlashcards([]); setFlashcardIndex(0); setFlashcardFlipped(false);
  }

  return <section className={"mia-shell " + (isFloating ? "mia-floating-shell" : "mia-studio-shell")} aria-label="MIΛ learning assistant">
    <header className="mia-header">
      <div className="mia-brand-mark">Λ</div>
      <div className="mia-brand-copy"><strong>MIΛ</strong><span>YOUR LEARNING COMPANION · GEMMA 4</span></div>
      <div className="mia-header-actions">
        <button className="mia-icon-button" onClick={newChat} title="New chat" aria-label="Start a new chat"><Plus size={17}/></button>
        {onClose && <button className="mia-icon-button" onClick={onClose} aria-label="Close MIΛ"><X size={18}/></button>}
      </div>
    </header>
    <div className="mia-context-strip"><BookOpen size={14}/><span>{profile.level} · {profile.grade} · {profile.curriculum || "Curriculum not set"}</span><span className="mia-context-dot"/> <span>{subjects.length} subjects</span></div>
    {learningNoticeVisible && <div className={"mia-learning-only-notice" + (learningNoticeFading ? " is-fading" : "")} role="note"><strong>Educational use only.</strong> Use MIΛ for learning, subjects, homework understanding, revision, exam preparation and study planning. Do not enter names, Student IDs, contact details or other personal information, or use MIΛ for unrelated personal advice.</div>}
    {welcomeVisible && <div className={"mia-welcome-toast" + (welcomeFading ? " is-fading" : "")} role="status" aria-live="polite">
      <span className="mia-welcome-toast-mark"><Sparkles size={16}/></span>
      <span className="mia-welcome-toast-copy">{welcomeText}</span>
      <button type="button" className="mia-icon-button" onClick={dismissWelcome} aria-label="Dismiss welcome message"><X size={15}/></button>
    </div>}
    {messages.length > 0 && <nav className="mia-quick-actions" aria-label="MIΛ learning actions">
      {helpOptions.filter(option => !option.tertiaryOnly || isTertiaryLearner).map(option => (
        <button type="button" key={option.id} disabled={busy} title={option.description} onClick={() => { void sendMessage(option.prompt); }}>{option.title}</button>
      ))}
    </nav>}
    <div className="mia-messages" ref={scrollRef} onScroll={handleTranscriptScroll} tabIndex={0} aria-label="MIΛ conversation history">
      {messages.map(message => <article key={message.id} className={"mia-message-row " + (message.role === "user" ? "is-user" : "is-assistant")}>
        {message.role === "assistant" && <div className="mia-message-avatar">Λ</div>}
        <div className="mia-message-bubble">
          {message.content}
          {message.role === "assistant" && !!message.sources?.length && <div className="mia-grounding-sources">
            <strong>{message.sources.some(source => source.kind === "studyspace_material") ? "Your assigned StudySpace materials" : "Sources checked"}</strong>
            {message.sources.map((source, index) => <a key={source.uri + index} href={source.uri} target="_blank" rel="noopener noreferrer"><span>{source.title}</span>{(source.subject || source.topic) && <small>{[source.subject, source.topic].filter(Boolean).join(" · ")}</small>}</a>)}
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
    {messages.length === 0 && draft.length === 0 && <section className="mia-help-options" aria-label="Choose MIΛ learning support">
      <div className="mia-help-options-heading"><div><span className="eyebrow">YOUR LEARNING, YOUR WAY</span><strong>What would you like help with?</strong><small>Choose a starting point. MIΛ will use your registered subjects, curriculum and learning progress to tailor the support.</small></div><span className="mia-help-options-context">{subjects.length} subjects</span></div>
      <div className="mia-help-options-grid">
        {helpOptions.filter(option => !option.tertiaryOnly || isTertiaryLearner).map(option=>{
          const Icon=option.icon;
          return <button type="button" className="mia-help-option" key={option.id} disabled={busy} aria-busy={busy} onClick={()=>{void sendMessage(option.prompt);}}>
            <span className={"mia-help-option-icon "+option.id}><Icon size={18}/></span>
            <span className="mia-help-option-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
            <span className="mia-help-option-arrow" aria-hidden="true">↗</span>
          </button>;
        })}
      </div>
      {subjects.length>0&&<p className="mia-help-options-subjects">Ready to support: {subjects.map(subject=>subject.name).join(" · ")}</p>}
    </section>}
    </div>
    {attachment && <div className="mia-attachment-preview"><Paperclip size={15}/><span>{attachment.name}</span>{attachment.type.startsWith("image/") && <button type="button" onClick={()=>void reviewTimetable()} title="Import this image as a timetable">Read timetable</button>}<button type="button" onClick={()=>setAttachment(null)} aria-label="Remove attachment"><X size={14}/></button></div>}
    <form className="mia-composer" onSubmit={event=>{event.preventDefault(); void sendMessage();}}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,.txt,.md,.csv,.json,.xml,.html,.pdf,.docx,.pptx,.xlsx" hidden onChange={event=>{const file=event.target.files?.[0];if(file){const ext=file.name.split(".").pop()?.toLowerCase()||"";const allowed=file.type.startsWith("image/")&&["image/jpeg","image/png","image/webp"].includes(file.type)||["pdf","txt","md","csv","json","xml","html","docx","pptx","xlsx"].includes(ext);if(!allowed){setError("Attach an image, PDF, DOCX, PPTX, XLSX, TXT, Markdown, CSV, JSON or XML file.");}else if(file.size>4*1024*1024){setError("Choose a file smaller than 4 MB.");}else{setError("");setAttachment(file);}}event.currentTarget.value="";}}/>
      <button type="button" className="mia-attach-button" onClick={()=>fileRef.current?.click()} title="Attach an image, PDF or text file" aria-label="Attach a file"><Paperclip size={19}/></button>
      <textarea ref={inputRef} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void sendMessage();}}} placeholder="Message MIΛ about your studies…" rows={1} maxLength={3000}/>
      <button type="submit" className="mia-send-button" disabled={busy || (!text.trim() && !attachment)} title={attachment ? "Send attachment" : "Send message"} aria-label={attachment ? "Send attachment" : "Send message"}>{busy?<LoaderCircle size={18} className="mia-spin"/>:<Send size={18}/>}</button>
    </form>
    <div className="mia-footnote">Study-focused · Short answers · Gemma 4 with Qwen backup · Provider quotas apply</div>
  </section>;
}
