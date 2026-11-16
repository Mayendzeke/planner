import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft, BookOpen, Brain, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Download, FileText, Filter, Flag, Flame, Heart, Library, LoaderCircle,
  Play, Plus, RotateCcw, Search, Sparkles, Target, Timer, Trophy, X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./LabLearningHub.css";

type MaterialType =
  | "revision_notes" | "flashcards" | "practice_quiz" | "worked_examples"
  | "study_guide" | "glossary" | "concept_map" | "case_study"
  | "lab_report" | "formula_sheet" | "study_plan" | "question_bank";
type Difficulty = "foundation" | "standard" | "challenge" | "mixed";
type PracticeMode = "practice" | "timed" | "exam";
type RetakeMode = "original" | "full_retake" | "incorrect_only" | "fresh_variant";
type LabQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "fill_blank";
  prompt: string;
  options: string[];
  correctAnswer: string | string[];
  acceptedAnswers?: string[];
  explanation: string;
  points: number;
};
type LabContent = {
  title?: string;
  summary?: string;
  sections?: { heading: string; body: string; bullets?: string[] }[];
  questions?: LabQuestion[];
  flashcards?: { front: string; back: string; visualCue?: string }[];
  workedExamples?: { question: string; steps: string[]; answer: string; commonMistake?: string }[];
  keyTerms?: { term: string; definition: string }[];
  studyPlan?: { step: string; minutes: number; activity: string }[];
  durationMinutes?: number;
  [key: string]: unknown;
};
type LabMaterial = {
  id: string;
  learner_id: string;
  subject_name: string;
  topic: string;
  material_type: MaterialType;
  title: string;
  summary: string;
  content: LabContent;
  source_type: "topic" | "pasted_notes" | "assigned_material";
  source_label: string;
  difficulty: Difficulty;
  question_count: number;
  tags: string[];
  is_favourite: boolean;
  created_at: string;
  updated_at: string;
  syncStatus?: "synced" | "local";
};
type QuestionResult = {
  questionId: string;
  prompt: string;
  correct: boolean;
  given: string;
  correctAnswer: string;
  explanation: string;
  points: number;
  earnedPoints: number;
};
type LabAttempt = {
  id: string;
  learner_id: string;
  material_id: string | null;
  subject_name: string;
  topic: string;
  material_snapshot: { title: string; material_type: MaterialType; questions: LabQuestion[]; durationMinutes?: number };
  responses: Record<string, string>;
  result: { items?: QuestionResult[]; strengths?: string[]; improvement?: string[] } | Record<string, unknown>;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  duration_seconds: number;
  mode: PracticeMode;
  status: "in_progress" | "submitted";
  attempt_number: number;
  retake_mode: RetakeMode;
  retake_of: string | null;
  created_at: string;
  submitted_at: string | null;
  syncStatus?: "synced" | "local";
};
type CreateForm = {
  subjectName: string;
  topic: string;
  materialType: MaterialType;
  difficulty: Difficulty;
  questionCount: number;
  durationMinutes: number;
  sourceNotes: string;
};

const materialTypes: { value: MaterialType; label: string; description: string }[] = [
  { value: "revision_notes", label: "Revision notes", description: "Structured summaries, key ideas and exam tips" },
  { value: "flashcards", label: "Flashcards", description: "Active recall cards with memory cues" },
  { value: "practice_quiz", label: "Practice quiz", description: "Auto-marked questions with explanations" },
  { value: "worked_examples", label: "Worked examples", description: "Step-by-step solutions and methods" },
  { value: "study_guide", label: "Study guide", description: "A complete topic learning guide" },
  { value: "glossary", label: "Glossary", description: "Important terms and clear definitions" },
  { value: "concept_map", label: "Concept map", description: "How key ideas connect" },
  { value: "case_study", label: "Case study", description: "Applied scenarios and analysis questions" },
  { value: "lab_report", label: "Lab report guide", description: "Aim, method, observations and evaluation" },
  { value: "formula_sheet", label: "Formula sheet", description: "Essential formulas, units and usage" },
  { value: "study_plan", label: "Topic study plan", description: "A practical sequence of focused study blocks" },
  { value: "question_bank", label: "Question bank", description: "A reusable bank of exam-style questions" },
];
const emptyContent = (title: string): LabContent => ({ title, summary: "", sections: [], questions: [], flashcards: [], workedExamples: [], keyTerms: [], studyPlan: [] });
const localKey = (id: string) => "studyspace:labs:ecosystem:" + id;
const norm = (value: unknown) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function readLocal<T>(key: string, fallback: T): T {
  try { const parsed = JSON.parse(localStorage.getItem(key) || "null"); return parsed ?? fallback; } catch { return fallback; }
}
function saveLocal<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Indexed cloud copies remain the source of truth. */ }
}
function toMaterialPayload(item: LabMaterial) {
  const payload = { ...item };
  delete payload.syncStatus;
  return payload;
}
function toAttemptPayload(item: LabAttempt) {
  const payload = { ...item };
  delete payload.syncStatus;
  return payload;
}
function displayType(value: MaterialType) {
  return materialTypes.find(item => item.value === value)?.label ?? "Learning material";
}
function markdownFor(item: LabMaterial) {
  const content = item.content ?? emptyContent(item.title);
  const lines = ["# " + item.title, "", "**Subject:** " + item.subject_name, "**Topic:** " + item.topic, "**Type:** " + displayType(item.material_type), "", content.summary || item.summary || ""];
  for (const section of content.sections ?? []) {
    lines.push("", "## " + section.heading, "", section.body);
    for (const bullet of section.bullets ?? []) lines.push("- " + bullet);
  }
  if (content.keyTerms?.length) {
    lines.push("", "## Key terms");
    for (const term of content.keyTerms) lines.push("- **" + term.term + ":** " + term.definition);
  }
  if (content.workedExamples?.length) {
    lines.push("", "## Worked examples");
    for (const example of content.workedExamples) lines.push("", "### " + example.question, ...example.steps.map((step, index) => (index + 1) + ". " + step), "**Answer:** " + example.answer);
  }
  if (content.flashcards?.length) {
    lines.push("", "## Flashcards");
    for (const card of content.flashcards) lines.push("", "**Front:** " + card.front, "**Back:** " + card.back, card.visualCue ? "**Memory cue:** " + card.visualCue : "");
  }
  if (content.questions?.length) {
    lines.push("", "## Practice questions");
    for (const [index, question] of content.questions.entries()) {
      lines.push("", (index + 1) + ". " + question.prompt);
      for (const [optionIndex, option] of (question.options ?? []).entries()) lines.push("   " + String.fromCharCode(65 + optionIndex) + ". " + option);
      lines.push("   **Answer:** " + (Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer), "   **Why:** " + question.explanation);
    }
  }
  return lines.join("\n").trim() + "\n";
}
function canonicalAnswer(value: unknown) {
  const raw = String(value ?? "").normalize("NFKC").trim().toLowerCase()
    .replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/")
    .replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/π/g, "pi");
  const mathematical = /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(raw) || /[<>=]/.test(raw) || /[a-z]\s*[+*/^=-]/i.test(raw)
    || /\d\s*[+*/^=-]\s*\d/.test(raw) || /^[-+]?\d+\s*\/\s*[-+]?\d+$/.test(raw);
  return mathematical ? raw.replace(/\s+/g, "") : norm(raw);
}
function numericAnswer(value: unknown): number | null {
  const raw = String(value ?? "").trim().replace(/,/g, ".");
  if (/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(raw)) {
    const result = Number(raw);
    return Number.isFinite(result) ? result : null;
  }
  const fraction = raw.match(/^([-+]?\d+)\s*\/\s*([-+]?\d+)$/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  return null;
}
function compareAnswer(question: LabQuestion, value: string) {
  const answers = [question.correctAnswer, ...(question.acceptedAnswers ?? [])]
    .flatMap(answer => Array.isArray(answer) ? answer : [answer])
    .filter(answer => String(answer ?? "").trim());
  const candidate = canonicalAnswer(value);
  if (answers.some(answer => canonicalAnswer(answer) === candidate)) return true;
  const numeric = numericAnswer(value);
  return numeric !== null && answers.some(answer => {
    const expected = numericAnswer(answer);
    return expected !== null && Math.abs(expected - numeric) <= 1e-8 * Math.max(1, Math.abs(expected));
  });
}
function shortAnswer(question: LabQuestion) {
  return Array.isArray(question.correctAnswer) ? question.correctAnswer.join(" / ") : question.correctAnswer;
}

export default function LabLearningHub({
  studentId, labTitle, subjectOptions,
}: {
  studentId?: string | null;
  labTitle: string;
  subjectOptions: string[];
}) {
  const availableSubjects = useMemo(() => [...new Set(subjectOptions.map(value => value.trim()).filter(Boolean))], [subjectOptions]);
  const [tab, setTab] = useState<"home" | "create" | "practice" | "library" | "review" | "progress">("home");
  const [materials, setMaterials] = useState<LabMaterial[]>([]);
  const [attempts, setAttempts] = useState<LabAttempt[]>([]);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedMaterial, setSelectedMaterial] = useState<LabMaterial | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<LabAttempt | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const attemptRef = useRef<LabAttempt | null>(null);
  const submitRef = useRef<((auto?: boolean) => Promise<void>) | null>(null);
  const saveTimersRef = useRef(new Map<string, number>());
  const saveQueuesRef = useRef(new Map<string, Promise<void>>());
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    subjectName: availableSubjects[0] ?? "",
    topic: "",
    materialType: "practice_quiz",
    difficulty: "mixed",
    questionCount: 8,
    durationMinutes: 20,
    sourceNotes: "",
  });
  const storageKey = studentId ? localKey(studentId) : "studyspace:labs:ecosystem:guest";

  useEffect(() => {
    if (availableSubjects.length && !availableSubjects.includes(form.subjectName)) {
      setForm(current => ({ ...current, subjectName: availableSubjects[0] }));
    }
  }, [availableSubjects, form.subjectName]);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    let alive = true;
    const localMaterials = readLocal<LabMaterial[]>(storageKey + ":materials", []);
    const localAttempts = readLocal<LabAttempt[]>(storageKey + ":attempts", []);
    setMaterials(localMaterials);
    setAttempts(localAttempts);
    const load = async () => {
      if (!supabase) { setLoading(false); return; }
      try {
        const [materialResult, attemptResult] = await Promise.all([
          supabase.from("lab_generated_materials").select("*").eq("learner_id", studentId).order("updated_at", { ascending: false }).limit(100),
          supabase.from("lab_practice_attempts").select("*").eq("learner_id", studentId).order("created_at", { ascending: false }).limit(250),
        ]);
        if (materialResult.error) throw materialResult.error;
        if (attemptResult.error) throw attemptResult.error;
        if (!alive) return;
        const remoteMaterials = (materialResult.data ?? []).map(row => ({ ...row, syncStatus: "synced" as const })) as LabMaterial[];
        const remoteAttempts = (attemptResult.data ?? []).map(row => ({ ...row, syncStatus: "synced" as const })) as LabAttempt[];
        const mergedMaterials = new Map(remoteMaterials.map(item => [item.id, item]));
        const mergedAttempts = new Map(remoteAttempts.map(item => [item.id, item]));
        for (const item of localMaterials.filter(item => item.syncStatus === "local")) mergedMaterials.set(item.id, item);
        for (const item of localAttempts.filter(item => item.syncStatus === "local")) mergedAttempts.set(item.id, item);
        const nextMaterials = [...mergedMaterials.values()].sort((a,b) => b.updated_at.localeCompare(a.updated_at));
        const nextAttempts = [...mergedAttempts.values()].sort((a,b) => b.created_at.localeCompare(a.created_at));
        setMaterials(nextMaterials);
        setAttempts(nextAttempts);
        saveLocal(storageKey + ":materials", nextMaterials);
        saveLocal(storageKey + ":attempts", nextAttempts);
        // Retry local-only records when connectivity returns.
        const pendingMaterials = nextMaterials.filter(item => item.syncStatus === "local");
        const pendingAttempts = nextAttempts.filter(item => item.syncStatus === "local");
        if (pendingMaterials.length) {
          const { error: syncError } = await supabase.from("lab_generated_materials").upsert(pendingMaterials.map(toMaterialPayload));
          if (!syncError) {
            const synced = new Set(pendingMaterials.map(item => item.id));
            const updated = nextMaterials.map(item => synced.has(item.id) ? { ...item, syncStatus: "synced" as const } : item);
            if (alive) setMaterials(updated);
            saveLocal(storageKey + ":materials", updated);
          }
        }
        if (pendingAttempts.length) {
          const { error: syncError } = await supabase.from("lab_practice_attempts").upsert(pendingAttempts.map(toAttemptPayload));
          if (!syncError) {
            const synced = new Set(pendingAttempts.map(item => item.id));
            const updated = nextAttempts.map(item => synced.has(item.id) ? { ...item, syncStatus: "synced" as const } : item);
            if (alive) setAttempts(updated);
            saveLocal(storageKey + ":attempts", updated);
          }
        }
      } catch (reason) {
        if (alive) setMessage("Showing your saved Lab records from this device. Cloud sync will retry when the connection is restored.");
      } finally { if (alive) setLoading(false); }
    };
    void load();
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    const onOnline = () => { void load(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => { alive = false; window.removeEventListener("focus", onFocus); window.removeEventListener("online", onOnline); };
  }, [studentId, storageKey]);

  useEffect(() => { attemptRef.current = activeAttempt; }, [activeAttempt]);
  useEffect(() => {
    if (!activeAttempt || activeAttempt.status !== "in_progress" || activeAttempt.mode === "practice" || startedAt === null) {
      setRemainingSeconds(null);
      return;
    }
    const limit = Math.max(1, Number(activeAttempt.material_snapshot.durationMinutes || 20)) * 60;
    const tick = () => {
      const remaining = Math.max(0, limit - Math.floor((Date.now() - startedAt) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) void submitRef.current?.(true);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeAttempt?.id, activeAttempt?.status, activeAttempt?.mode, startedAt]);

  const persistMaterial = useCallback(async (item: LabMaterial) => {
    const localItem = { ...item, syncStatus: "local" as const };
    setMaterials(current => {
      const next = [localItem, ...current.filter(value => value.id !== item.id)].sort((a,b) => b.updated_at.localeCompare(a.updated_at));
      saveLocal(storageKey + ":materials", next);
      return next;
    });
    if (!supabase || !studentId || !navigator.onLine) return;
    const { error: saveError } = await supabase.from("lab_generated_materials").upsert(toMaterialPayload(item));
    if (saveError) return;
    setMaterials(current => {
      const next = current.map(value => value.id === item.id ? { ...item, syncStatus: "synced" as const } : value);
      saveLocal(storageKey + ":materials", next);
      return next;
    });
  }, [studentId, storageKey]);

  const persistAttempt = useCallback(async (item: LabAttempt, immediate = false) => {
    const localItem = { ...item, syncStatus: "local" as const };
    setAttempts(current => {
      const next = [localItem, ...current.filter(value => value.id !== item.id)].sort((a,b) => b.created_at.localeCompare(a.created_at));
      saveLocal(storageKey + ":attempts", next);
      return next;
    });
    if (!supabase || !studentId || !navigator.onLine) return;
    const sync = async () => {
      const previous = saveQueuesRef.current.get(item.id) ?? Promise.resolve();
      const queued = previous.catch(() => undefined).then(async () => {
        const { error: saveError } = await supabase.from("lab_practice_attempts").upsert(toAttemptPayload(item));
        if (saveError) return;
        setAttempts(current => {
          const next = current.map(value => value.id === item.id
            ? { ...value, syncStatus: value.status === item.status && JSON.stringify(value.responses) === JSON.stringify(item.responses) ? "synced" as const : "local" as const }
            : value);
          saveLocal(storageKey + ":attempts", next);
          return next;
        });
      });
      const safeQueued = queued.catch(() => undefined);
      saveQueuesRef.current.set(item.id, safeQueued);
      await safeQueued;
    };
    const existing = saveTimersRef.current.get(item.id);
    if (existing !== undefined) { window.clearTimeout(existing); saveTimersRef.current.delete(item.id); }
    if (!immediate) {
      const timer = window.setTimeout(() => {
        saveTimersRef.current.delete(item.id);
        void sync();
      }, 450);
      saveTimersRef.current.set(item.id, timer);
      return;
    }
    await sync();
  }, [studentId, storageKey]);

  useEffect(() => {
    const flush = () => {
      const current = attemptRef.current;
      if (current) void persistAttempt(current, true);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      for (const timer of saveTimersRef.current.values()) window.clearTimeout(timer);
      saveTimersRef.current.clear();
      const current = attemptRef.current;
      if (current?.status === "in_progress") void persistAttempt(current, true);
    };
  }, [persistAttempt]);

  const generate = async (override?: Partial<CreateForm>) => {
    if (!studentId || !supabase) { setError("Sign in to generate and save Lab materials."); return; }
    const draft = { ...form, ...override };
    if (!draft.subjectName || !draft.topic.trim()) { setError("Choose a subject and enter a topic first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("lab-learning-engine", {
        body: {
          action: "generate_material",
          subjectName: draft.subjectName,
          topic: draft.topic.trim(),
          materialType: draft.materialType,
          difficulty: draft.difficulty,
          questionCount: draft.questionCount,
          sourceNotes: draft.sourceNotes.trim(),
        },
      });
      if (invokeError) {
        const response = (invokeError as { context?: Response }).context;
        let detail = invokeError.message || "The learning engine could not complete this request.";
        if (response) { try { const payload = await response.clone().json(); detail = payload.error || detail; } catch { /* retain generic error */ } }
        throw new Error(detail);
      }
      if (!data?.success || !data.material || !Array.isArray(data.material.questions)) throw new Error(data?.error || "The learning engine returned an incomplete material. Please retry.");
      const now = new Date().toISOString();
      const material: LabMaterial = {
        id: crypto.randomUUID(),
        learner_id: studentId,
        subject_name: draft.subjectName,
        topic: draft.topic.trim(),
        material_type: draft.materialType,
        title: String(data.material.title || displayType(draft.materialType) + ": " + draft.topic.trim()).slice(0,180),
        summary: String(data.material.summary || "").slice(0,3000),
        content: { ...data.material, durationMinutes: draft.durationMinutes },
        source_type: draft.sourceNotes.trim() ? "pasted_notes" : "topic",
        source_label: draft.sourceNotes.trim() ? "Student-provided notes" : "General subject knowledge",
        difficulty: draft.difficulty,
        question_count: data.material.questions.length,
        tags: [draft.subjectName, draft.topic.trim(), draft.materialType].slice(0,12),
        is_favourite: false,
        created_at: now,
        updated_at: now,
      };
      await persistMaterial(material);
      setSelectedMaterial(material);
      setFlashcardIndex(0);
      setFlashcardFlipped(false);
      setTab("library");
      setMessage("Your " + displayType(draft.materialType).toLowerCase() + " has been created and saved to My Lab Library.");
      setForm(current => ({ ...current, sourceNotes: "" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The learning engine could not complete this request. Try again.");
    } finally { setBusy(false); }
  };

  const startAttempt = async (material: LabMaterial, mode: PracticeMode = "practice", retakeMode: RetakeMode = "original", sourceAttempt?: LabAttempt) => {
    const allQuestions = material.content.questions ?? [];
    const previousResults = sourceAttempt?.result as { items?: QuestionResult[] } | undefined;
    const missedIds = new Set((previousResults?.items ?? []).filter(item => !item.correct).map(item => item.questionId));
    const questions = retakeMode === "incorrect_only"
      ? allQuestions.filter(question => missedIds.has(question.id))
      : allQuestions;
    if (!questions.length) { setError("There are no questions to practise in this selection."); return; }
    const previousAttempts = attempts.filter(item => item.material_id === material.id);
    const now = new Date().toISOString();
    const attempt: LabAttempt = {
      id: crypto.randomUUID(),
      learner_id: studentId || "",
      material_id: material.id,
      subject_name: material.subject_name,
      topic: material.topic,
      material_snapshot: { title: material.title, material_type: material.material_type, questions, durationMinutes: Number(material.content.durationMinutes || 20) },
      responses: {},
      result: {},
      score: null,
      max_score: null,
      percentage: null,
      duration_seconds: 0,
      mode,
      status: "in_progress",
      attempt_number: previousAttempts.length + 1,
      retake_mode: retakeMode,
      retake_of: sourceAttempt?.id ?? null,
      created_at: now,
      submitted_at: null,
    };
    setSelectedMaterial(material);
    setQuestionIndex(0);
    setFlagged([]);
    setActiveAttempt(attempt);
    setStartedAt(Date.now());
    await persistAttempt(attempt, true);
    setTab("practice");
    setMessage("");
    setError("");
  };

  const submitAttempt = async (auto = false) => {
    const current = attemptRef.current;
    if (!current || current.status !== "in_progress") return;
    const questions = current.material_snapshot.questions ?? [];
    const items: QuestionResult[] = questions.map(question => {
      const given = current.responses[question.id] ?? "";
      const correct = compareAnswer(question, given);
      const points = Math.max(1, Number(question.points) || 1);
      return {
        questionId: question.id,
        prompt: question.prompt,
        correct,
        given,
        correctAnswer: shortAnswer(question),
        explanation: question.explanation,
        points,
        earnedPoints: correct ? points : 0,
      };
    });
    const score = items.reduce((total,item) => total + item.earnedPoints,0);
    const maxScore = items.reduce((total,item) => total + item.points,0);
    const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;
    const durationSeconds = startedAt ? Math.min(86400, Math.max(0, Math.floor((Date.now() - startedAt) / 1000))) : 0;
    const result = {
      items,
      strengths: items.filter(item => item.correct).map(item => item.prompt).slice(0,6),
      improvement: items.filter(item => !item.correct).map(item => item.prompt).slice(0,6),
      autoSubmitted: auto,
    };
    const completed: LabAttempt = {
      ...current, result, score, max_score: maxScore, percentage, duration_seconds: durationSeconds,
      status: "submitted", submitted_at: new Date().toISOString(),
    };
    attemptRef.current = completed;
    setActiveAttempt(completed);
    await persistAttempt(completed, true);
    setStartedAt(null);
    setMessage(auto ? "Time is up. Your attempt was submitted automatically." : "Attempt submitted. Review each explanation, then choose how to practise again.");
  };
  submitRef.current = submitAttempt;

  const updateAnswer = (questionId: string, value: string) => {
    const current = attemptRef.current;
    if (!current || current.status !== "in_progress") return;
    const updated = { ...current, responses: { ...current.responses, [questionId]: value } };
    attemptRef.current = updated;
    setActiveAttempt(updated);
    void persistAttempt(updated);
  };

  const startRetake = async (attempt: LabAttempt, mode: RetakeMode) => {
    const material = materials.find(item => item.id === attempt.material_id);
    if (!material) {
      const snapshotMaterial: LabMaterial = {
        id: attempt.material_id || crypto.randomUUID(),
        learner_id: studentId || "",
        subject_name: attempt.subject_name,
        topic: attempt.topic,
        material_type: attempt.material_snapshot.material_type,
        title: attempt.material_snapshot.title,
        summary: "",
        content: { questions: attempt.material_snapshot.questions, durationMinutes: attempt.material_snapshot.durationMinutes },
        source_type: "topic", source_label: "Saved attempt snapshot", difficulty: "mixed",
        question_count: attempt.material_snapshot.questions.length, tags: [], is_favourite: false,
        created_at: attempt.created_at, updated_at: attempt.created_at,
      };
      await startAttempt(snapshotMaterial, attempt.mode, mode, attempt);
      return;
    }
    await startAttempt(material, attempt.mode, mode, attempt);
  };

  const toggleFavourite = async (item: LabMaterial) => {
    const updated = { ...item, is_favourite: !item.is_favourite, updated_at: new Date().toISOString() };
    await persistMaterial(updated);
    setSelectedMaterial(current => current?.id === item.id ? updated : current);
  };

  const deleteMaterial = async (item: LabMaterial) => {
    if (!window.confirm("Delete this saved Lab material? Existing attempt history will remain.")) return;
    setMaterials(current => {
      const next = current.filter(value => value.id !== item.id);
      saveLocal(storageKey + ":materials", next);
      return next;
    });
    if (supabase && navigator.onLine) {
      const { error: deleteError } = await supabase.from("lab_generated_materials").delete().eq("id", item.id).eq("learner_id", studentId);
      if (deleteError) setMessage("The material was removed from this device but could not yet be removed from cloud storage.");
    }
    setSelectedMaterial(null);
  };

  const downloadMaterial = (item: LabMaterial) => {
    const blob = new Blob([markdownFor(item)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = (item.title || "StudySpace-Lab-material").replace(/[^a-z0-9-_]+/gi,"-") + ".md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const filteredMaterials = useMemo(() => materials.filter(item => {
    const matchesSearch = !search || [item.title,item.subject_name,item.topic].some(value => norm(value).includes(norm(search)));
    const matchesType = filterType === "all" || item.material_type === filterType;
    return matchesSearch && matchesType;
  }), [materials, search, filterType]);
  const submittedAttempts = attempts.filter(item => item.status === "submitted");
  const average = submittedAttempts.length ? Math.round(submittedAttempts.reduce((sum,item) => sum + Number(item.percentage || 0),0) / submittedAttempts.length) : 0;
  const best = submittedAttempts.length ? Math.max(...submittedAttempts.map(item => Number(item.percentage || 0))) : 0;
  const reviewQueue = useMemo(() => buildReviewQueue(submittedAttempts), [attempts]);

  const tabItems = [
    { value:"home", label:"Overview", icon:Sparkles },
    { value:"create", label:"Create", icon:Plus },
    { value:"practice", label:"Practice", icon:Target },
    { value:"library", label:"My Library", icon:Library },
    { value:"review", label:"Review", icon:Clock3 },
    { value:"progress", label:"Progress", icon:Trophy },
  ] as const;

  return <section className="lab-hub" aria-label={labTitle + " learning ecosystem"}>
    <header className="lab-hub-header">
      <div className="lab-hub-heading">
        <span className="lab-hub-eyebrow"><Brain size={14}/> YOUR SUBJECT LEARNING SPACE</span>
        <h2>{labTitle} <span>Learning Hub</span></h2>
        <p>Create materials, practise exam questions, retry difficult topics and track your learning — all in one place.</p>
      </div>
      <div className="lab-hub-header-stat"><strong>{materials.length}</strong><span>saved materials</span></div>
    </header>
    <nav className="lab-hub-tabs" aria-label="Lab learning sections">
      {tabItems.map(item => { const Icon = item.icon; return <button type="button" key={item.value} className={tab === item.value ? "is-active" : ""} onClick={() => { setTab(item.value); setError(""); }}><Icon size={16}/><span>{item.label}</span>{item.value === "practice" && submittedAttempts.length > 0 && <i>{submittedAttempts.length}</i>}</button>; })}
    </nav>
    {message && <div className="lab-hub-notice"><CheckCircle2 size={16}/><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {error && <div className="lab-hub-error" role="alert"><X size={15}/><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {loading && <div className="lab-hub-loading"><LoaderCircle size={17}/> Syncing your Lab library…</div>}

    {tab === "home" && <>
      <div className="lab-hub-hero">
        <div><span className="lab-hub-kicker">LEARN · CREATE · PRACTISE · IMPROVE</span><h3>Turn any topic into a complete study session.</h3><p>Build notes, flashcards, question banks and worked examples. Your practice results stay private and separate from official school assessments.</p><button type="button" className="lab-hub-primary" onClick={() => { setTab("create"); setForm(current => ({ ...current, materialType:"practice_quiz" })); }}><Sparkles size={16}/> Create learning material</button></div>
        <div className="lab-hub-hero-visual"><div className="lab-hub-orbit orbit-one"/><div className="lab-hub-orbit orbit-two"/><span><Brain size={34}/></span><i className="orbit-dot dot-one"/><i className="orbit-dot dot-two"/><i className="orbit-dot dot-three"/></div>
      </div>
      <div className="lab-hub-feature-grid">
        <button type="button" onClick={() => { setTab("create"); setForm(current => ({ ...current, materialType:"revision_notes" })); }}><span><FileText size={19}/></span><strong>Revision packs</strong><small>Summaries, definitions, examples and exam tips</small></button>
        <button type="button" onClick={() => { setTab("create"); setForm(current => ({ ...current, materialType:"flashcards" })); }}><span><Brain size={19}/></span><strong>Active recall</strong><small>Flip through flashcards and memory cues</small></button>
        <button type="button" onClick={() => { setTab("create"); setForm(current => ({ ...current, materialType:"question_bank" })); }}><span><Target size={19}/></span><strong>Question banks</strong><small>Practise different formats and difficulty levels</small></button>
        <button type="button" onClick={() => setTab("progress")}><span><Trophy size={19}/></span><strong>Progress insights</strong><small>Scores, retry history and topics to improve</small></button>
      </div>
      <div className="lab-hub-stats">
        <article><span><Target size={17}/></span><strong>{submittedAttempts.length}</strong><small>completed attempts</small></article>
        <article><span><Trophy size={17}/></span><strong>{average}%</strong><small>average score</small></article>
        <article><span><Flame size={17}/></span><strong>{best}%</strong><small>personal best</small></article>
        <article><span><Library size={17}/></span><strong>{materials.filter(item=>item.is_favourite).length}</strong><small>favourites</small></article>
      </div>
      {materials.length > 0 && <section className="lab-hub-section"><div className="lab-hub-section-head"><div><span className="lab-hub-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>Recently saved</h3></div><button type="button" className="lab-hub-text-button" onClick={() => setTab("library")}>View library <ChevronRight size={15}/></button></div><div className="lab-hub-material-grid">{materials.slice(0,3).map(item => <MaterialCard key={item.id} item={item} onOpen={() => { setSelectedMaterial(item); setFlashcardIndex(0); setFlashcardFlipped(false); setTab("library"); }} onPractice={() => void startAttempt(item)} onTimed={() => void startAttempt(item,"timed")} onExam={() => void startAttempt(item,"exam")} />)}</div></section>}
      {attempts.length > 0 && <section className="lab-hub-section"><div className="lab-hub-section-head"><div><span className="lab-hub-kicker">KEEP IMPROVING</span><h3>Continue your practice</h3></div><button type="button" className="lab-hub-text-button" onClick={() => setTab("practice")}>Practice history <ChevronRight size={15}/></button></div><div className="lab-hub-history-list">{attempts.slice(0,3).map(item => <AttemptRow key={item.id} attempt={item} onReview={() => { setActiveAttempt(item); setQuestionIndex(0); setStartedAt(item.status === "in_progress" ? (Date.parse(item.created_at) || Date.now()) : null); setTab("practice"); }} />)}</div></section>}
    </>}

    {tab === "create" && <section className="lab-hub-create">
      <div className="lab-hub-section-head"><div><span className="lab-hub-kicker">PERSONALISED MATERIAL GENERATOR</span><h3>What are you learning today?</h3><p>Generated content is matched to your profile and selected subject. Paste your own notes to ground the material in what your teacher provided.</p></div><span className="lab-hub-create-mark"><Sparkles size={22}/></span></div>
      <div className="lab-hub-form-grid">
        <label>Subject or module<select value={form.subjectName} onChange={event=>setForm(current=>({...current,subjectName:event.target.value}))}>{availableSubjects.map(subject=><option key={subject} value={subject}>{subject}</option>)}</select></label>
        <label>Topic<input value={form.topic} onChange={event=>setForm(current=>({...current,topic:event.target.value}))} placeholder="e.g. Linear equations, ecosystems, cash flow"/></label>
        <label>Material type<select value={form.materialType} onChange={event=>setForm(current=>({...current,materialType:event.target.value as MaterialType}))}>{materialTypes.map(item=><option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}</select></label>
        <label>Difficulty<select value={form.difficulty} onChange={event=>setForm(current=>({...current,difficulty:event.target.value as Difficulty}))}><option value="foundation">Foundation</option><option value="standard">Standard</option><option value="challenge">Challenge</option><option value="mixed">Mixed revision</option></select></label>
        <label>Practice questions<select value={form.questionCount} onChange={event=>setForm(current=>({...current,questionCount:Number(event.target.value)}))}>{[5,8,10,12,15,20].map(value=><option key={value} value={value}>{value} questions</option>)}</select></label>
        <label>Timed practice length<select value={form.durationMinutes} onChange={event=>setForm(current=>({...current,durationMinutes:Number(event.target.value)}))}>{[10,15,20,30,45,60].map(value=><option key={value} value={value}>{value} minutes</option>)}</select></label>
      </div>
      <label className="lab-hub-source-notes">Use my class notes or source material<textarea value={form.sourceNotes} onChange={event=>setForm(current=>({...current,sourceNotes:event.target.value}))} rows={6} maxLength={8000} placeholder="Paste your teacher's notes, definitions, worked examples or a short extract here. The generator will prioritise this material and avoid claiming unsupported syllabus details."/></label>
      <div className="lab-hub-source-foot"><span>{form.sourceNotes.length.toLocaleString()} / 8,000 characters</span><small>Do not paste names, Student IDs, contact details or private information.</small></div>
      <div className="lab-hub-form-actions"><span>Each pack includes a summary and a reusable self-check question set.</span><button type="button" className="lab-hub-primary" disabled={busy || !form.topic.trim() || !form.subjectName} onClick={()=>void generate()}>{busy?<><LoaderCircle size={16} className="lab-hub-spin"/> Creating your material…</>:<><Sparkles size={16}/> Generate and save</>}</button></div>
    </section>}

    {tab === "library" && <section className="lab-hub-library">
      {selectedMaterial ? <MaterialDetail
        item={selectedMaterial}
        flashcardIndex={flashcardIndex}
        flashcardFlipped={flashcardFlipped}
        setFlashcardIndex={setFlashcardIndex}
        setFlashcardFlipped={setFlashcardFlipped}
        onBack={()=>setSelectedMaterial(null)}
        onPractice={()=>void startAttempt(selectedMaterial)}
        onTimed={()=>void startAttempt(selectedMaterial,"timed")}
        onExam={()=>void startAttempt(selectedMaterial,"exam")}
        onFavourite={()=>void toggleFavourite(selectedMaterial)}
        onDownload={()=>downloadMaterial(selectedMaterial)}
        onDelete={()=>void deleteMaterial(selectedMaterial)}
      /> : <>
        <div className="lab-hub-section-head"><div><span className="lab-hub-kicker">YOUR PERSONAL STUDY COLLECTION</span><h3>My Lab Library</h3><p>Materials you create here are private to your account.</p></div><button type="button" className="lab-hub-primary small" onClick={()=>setTab("create")}><Plus size={15}/> Create</button></div>
        <div className="lab-hub-library-tools"><label className="lab-hub-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search topic or material"/></label><label className="lab-hub-filter"><Filter size={15}/><select value={filterType} onChange={event=>setFilterType(event.target.value)}><option value="all">All types</option>{materialTypes.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        {filteredMaterials.length ? <div className="lab-hub-material-grid">{filteredMaterials.map(item=><MaterialCard key={item.id} item={item} onOpen={()=>{setSelectedMaterial(item);setFlashcardIndex(0);setFlashcardFlipped(false);}} onPractice={()=>void startAttempt(item)} onTimed={()=>void startAttempt(item,"timed")} onExam={()=>void startAttempt(item,"exam")} onFavourite={()=>void toggleFavourite(item)}/>)}</div> : <EmptyState icon={<Library size={22}/>} title="Your library is waiting" text="Create your first revision pack, flashcard set, worked example collection or practice quiz." action="Create material" onClick={()=>setTab("create")}/>}
      </>}
    </section>}

    {tab === "practice" && <section className="lab-hub-practice">
      {activeAttempt ? <PracticeRunner
        attempt={activeAttempt}
        index={questionIndex}
        flagged={flagged}
        remainingSeconds={remainingSeconds}
        onAnswer={updateAnswer}
        onIndex={setQuestionIndex}
        onFlag={id=>setFlagged(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
        onSubmit={()=>void submitAttempt(false)}
        onBack={()=>{setActiveAttempt(null);setTab("practice");}}
        onFullRetake={()=>void startRetake(activeAttempt,"full_retake")}
        onIncorrectRetake={()=>void startRetake(activeAttempt,"incorrect_only")}
        onFreshVariant={()=>{setForm(current=>({...current,subjectName:activeAttempt.subject_name,topic:activeAttempt.topic,materialType:"practice_quiz"}));setActiveAttempt(null);setTab("create");setMessage("Create a fresh question variant for " + activeAttempt.topic + ".");}}
        onReviewMaterial={()=>{const item=materials.find(value=>value.id===activeAttempt.material_id);if(item){setSelectedMaterial(item);setFlashcardIndex(0);setFlashcardFlipped(false);setTab("library");}}}
      /> : <>
        <div className="lab-hub-section-head"><div><span className="lab-hub-kicker">RETRIEVAL PRACTICE & EXAM MODE</span><h3>Choose what to practise</h3><p>Every attempt is saved separately. Retake the full set or focus on missed questions.</p></div></div>
        {materials.filter(item=>(item.content.questions?.length ?? 0)>0).length ? <div className="lab-hub-material-grid">{materials.filter(item=>(item.content.questions?.length ?? 0)>0).map(item=><MaterialCard key={item.id} item={item} onOpen={()=>{setSelectedMaterial(item);setFlashcardIndex(0);setFlashcardFlipped(false);setTab("library");}} onPractice={()=>void startAttempt(item)} onTimed={()=>void startAttempt(item,"timed")} onExam={()=>void startAttempt(item,"exam")}/>)}</div> : <EmptyState icon={<Target size={22}/>} title="No practice sets yet" text="Generate a practice quiz, question bank or revision pack to start practising." action="Create practice set" onClick={()=>{setTab("create");setForm(current=>({...current,materialType:"practice_quiz"}));}}/>}
        {attempts.length > 0 && <section className="lab-hub-section"><div className="lab-hub-section-head"><div><span className="lab-hub-kicker">YOUR ATTEMPT HISTORY</span><h3>Past attempts</h3></div></div><div className="lab-hub-history-list">{attempts.map(item=><AttemptRow key={item.id} attempt={item} onReview={()=>{setActiveAttempt(item);setQuestionIndex(0);setStartedAt(item.status==="in_progress"?(Date.parse(item.created_at)||Date.now()):null);}}/>)}</div></section>}
      </>}
    </section>}

    {tab === "review" && <section className="lab-hub-progress">
      <div className="lab-hub-section-head"><div><span className="lab-hub-kicker">SPACED REVISION</span><h3>Your review schedule</h3><p>Topics return at sensible intervals based on your latest practice result. Stronger recall earns a longer gap; difficult topics return sooner.</p></div></div>
      {reviewQueue.length ? <div className="lab-review-queue">{reviewQueue.slice(0,12).map(item => {
        const material = materials.find(value => norm(value.subject_name) === norm(item.subject) && norm(value.topic) === norm(item.topic) && (value.content.questions?.length ?? 0) > 0);
        const days = Math.max(0, Math.ceil((Date.parse(item.nextReviewAt) - Date.now()) / 86400000));
        const due = days === 0;
        return <article className="lab-review-card" key={norm(item.subject)+":"+norm(item.topic)}>
          <div><span className={due ? "lab-review-status is-due" : "lab-review-status"}>{due ? "Review due" : "Coming up"}</span><strong>{item.topic}</strong><small>{item.subject} · {item.attempts} completed attempts · latest score {item.latest}%</small><small>{due ? "Scheduled for review now" : "Next review: " + new Date(item.nextReviewAt).toLocaleDateString() + " · " + days + " day(s)"}</small></div>
          <button type="button" className="lab-hub-primary small" onClick={() => {
            if (material) void startAttempt(material);
            else {
              setForm(current => ({ ...current, subjectName: item.subject, topic: item.topic, materialType: "practice_quiz", difficulty: item.latest < 60 ? "foundation" : "mixed" }));
              setTab("create");
              setMessage("Create a fresh review quiz for " + item.topic + ".");
            }
          }}>{material ? "Review now" : "Create review quiz"} <ChevronRight size={14}/></button>
        </article>;
      })}</div> : <EmptyState icon={<Clock3 size={22}/>} title="Your review schedule will appear here" text="Complete a practice set. StudySpace will schedule the next revision based on how well you did." action="Start practising" onClick={() => setTab("practice")}/>}
    </section>}

    {tab === "progress" && <section className="lab-hub-progress">
      <div className="lab-hub-section-head"><div><span className="lab-hub-kicker">YOUR LEARNING ANALYTICS</span><h3>Progress and improvement</h3><p>Only your personal Lab practice is included here. Official assessment grades remain elsewhere.</p></div></div>
      <div className="lab-hub-progress-metrics"><article><span>Attempts completed</span><strong>{submittedAttempts.length}</strong></article><article><span>Average score</span><strong>{average}%</strong></article><article><span>Personal best</span><strong>{best}%</strong></article><article><span>Materials created</span><strong>{materials.length}</strong></article></div>
      {submittedAttempts.length ? <>
        <div className="lab-hub-progress-panel"><h4>Recent score history</h4><div className="lab-hub-score-bars">{[...submittedAttempts].reverse().slice(-10).map((item,index)=><div key={item.id} title={item.topic + ": " + item.percentage + "%"}><span style={{height:Math.max(5,Number(item.percentage||0))+"%"}}/><small>{index+1}</small></div>)}</div></div>
        <div className="lab-hub-progress-panel"><h4>Topics to revisit</h4><div className="lab-hub-weak-list">{buildWeakTopics(submittedAttempts).map(topic=><article key={topic.topic}><div><strong>{topic.topic}</strong><small>{topic.subject} · {topic.attempts} attempts · latest {topic.latest}%</small></div><span className={topic.latest>=70?"is-strong":"is-weak"}>{topic.latest}%</span></article>)}</div></div>
      </> : <EmptyState icon={<Trophy size={22}/>} title="Your progress starts with one attempt" text="Complete a practice set to see your average, personal best and topics that deserve another look." action="Start practising" onClick={()=>setTab("practice")}/>}
    </section>}
  </section>;
}

function buildReviewQueue(attempts: LabAttempt[]) {
  const grouped = new Map<string, LabAttempt[]>();
  for (const attempt of attempts.filter(item => item.status === "submitted")) {
    const key = norm(attempt.subject_name) + ":" + norm(attempt.topic);
    grouped.set(key, [...(grouped.get(key) ?? []), attempt]);
  }
  return [...grouped.values()].map(history => {
    const ordered = [...history].sort((a,b) => b.created_at.localeCompare(a.created_at));
    const latest = ordered[0];
    const score = Number(latest.percentage ?? 0);
    let consecutiveStrong = 0;
    for (const item of ordered) {
      if (Number(item.percentage ?? 0) < 90) break;
      consecutiveStrong++;
    }
    const intervalDays = consecutiveStrong >= 3 ? 30 : score < 60 ? 1 : score < 75 ? 3 : score < 90 ? 7 : 14;
    return {
      subject: latest.subject_name,
      topic: latest.topic,
      latest: score,
      attempts: history.length,
      intervalDays,
      nextReviewAt: new Date(Date.parse(latest.submitted_at || latest.created_at) + intervalDays * 86400000).toISOString(),
    };
  }).sort((a,b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt));
}

function buildWeakTopics(attempts: LabAttempt[]) {
  const byTopic = new Map<string, { topic:string; subject:string; attempts:number; latest:number; latestAt:string }>();
  for (const attempt of attempts) {
    const key = norm(attempt.subject_name) + ":" + norm(attempt.topic);
    const current = byTopic.get(key);
    if (!current || attempt.created_at > current.latestAt) byTopic.set(key,{topic:attempt.topic,subject:attempt.subject_name,attempts:(current?.attempts??0)+1,latest:Number(attempt.percentage||0),latestAt:attempt.created_at});
    else current.attempts += 1;
  }
  return [...byTopic.values()].sort((a,b)=>a.latest-b.latest).slice(0,8);
}

function MaterialCard({ item, onOpen, onPractice, onTimed, onExam, onFavourite }: {
  item: LabMaterial; onOpen:()=>void; onPractice:()=>void; onTimed?:()=>void; onExam?:()=>void; onFavourite?:()=>void;
}) {
  return <article className="lab-hub-material-card">
    <div className="lab-hub-material-icon"><BookOpen size={19}/></div>
    <div className="lab-hub-material-copy"><span>{displayType(item.material_type)} · {item.difficulty}</span><strong>{item.title}</strong><small>{item.subject_name} · {item.topic}</small><small>{item.question_count} practice questions {item.syncStatus==="local"?"· saved on this device":"· saved to your library"}</small></div>
    <div className="lab-hub-material-actions"><button type="button" onClick={onOpen}>Open <ChevronRight size={14}/></button><button type="button" onClick={onPractice}><Play size={14}/> Practise</button>{onTimed&&<button type="button" onClick={onTimed}><Timer size={14}/> Timed</button>}{onExam&&<button type="button" onClick={onExam}><Clock3 size={14}/> Exam mode</button>}{onFavourite&&<button type="button" onClick={onFavourite} aria-label={item.is_favourite?"Remove favourite":"Add favourite"}><Heart size={15} fill={item.is_favourite?"currentColor":"none"}/></button>}</div>
  </article>;
}

function MaterialDetail({ item, flashcardIndex, flashcardFlipped, setFlashcardIndex, setFlashcardFlipped, onBack, onPractice, onTimed, onExam, onFavourite, onDownload, onDelete }: {
  item:LabMaterial; flashcardIndex:number; flashcardFlipped:boolean; setFlashcardIndex:(value:number)=>void; setFlashcardFlipped:(value:boolean)=>void;
  onBack:()=>void; onPractice:()=>void; onTimed:()=>void; onExam:()=>void; onFavourite:()=>void; onDownload:()=>void; onDelete:()=>void;
}) {
  const content = item.content ?? emptyContent(item.title);
  const cards = content.flashcards ?? [];
  return <div className="lab-hub-detail">
    <button type="button" className="lab-hub-back" onClick={onBack}><ArrowLeft size={15}/> Back to My Library</button>
    <div className="lab-hub-detail-heading"><span>{displayType(item.material_type)} · {item.subject_name}</span><h3>{item.title}</h3><p>{item.topic} · {item.difficulty} difficulty</p><p>{content.summary || item.summary}</p></div>
    <div className="lab-hub-detail-actions"><button type="button" className="lab-hub-primary" onClick={onPractice}><Play size={15}/> Practise these questions</button><button type="button" onClick={onTimed}><Timer size={15}/> Timed practice</button><button type="button" onClick={onExam}><Clock3 size={15}/> Exam simulation</button><button type="button" onClick={onFavourite}><Heart size={15} fill={item.is_favourite?"currentColor":"none"}/>{item.is_favourite?"Saved favourite":"Add favourite"}</button><button type="button" onClick={onDownload}><Download size={15}/> Download notes</button><button type="button" className="danger" onClick={onDelete}><X size={15}/> Delete</button></div>
    {(content.sections??[]).map((section,index)=><article className="lab-hub-content-section" key={index}><h4>{section.heading}</h4><p>{section.body}</p>{!!section.bullets?.length&&<ul>{section.bullets.map((bullet,i)=><li key={i}>{bullet}</li>)}</ul>}</article>)}
    {!!content.keyTerms?.length&&<section className="lab-hub-content-section"><h4>Key terms</h4><div className="lab-hub-keyterms">{content.keyTerms.map((term,index)=><article key={index}><strong>{term.term}</strong><span>{term.definition}</span></article>)}</div></section>}
    {!!content.workedExamples?.length&&<section className="lab-hub-content-section"><h4>Worked examples</h4>{content.workedExamples.map((example,index)=><article className="lab-hub-example" key={index}><strong>{example.question}</strong><ol>{example.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><p><b>Answer:</b> {example.answer}</p>{example.commonMistake&&<small>Watch out: {example.commonMistake}</small>}</article>)}</section>}
    {!!cards.length&&<section className="lab-hub-content-section"><h4>Active recall flashcards</h4><div className={"lab-hub-flashcard "+(flashcardFlipped?"is-flipped":"")} role="button" tabIndex={0} onClick={()=>setFlashcardFlipped(!flashcardFlipped)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setFlashcardFlipped(!flashcardFlipped);}}}><span>{flashcardFlipped?"ANSWER":"QUESTION"}</span><strong>{flashcardFlipped?cards[flashcardIndex]?.back:cards[flashcardIndex]?.front}</strong><small>{cards[flashcardIndex]?.visualCue || "Tap to flip and recall"}</small></div><div className="lab-hub-flash-controls"><button type="button" onClick={()=>{setFlashcardIndex(Math.max(0,flashcardIndex-1));setFlashcardFlipped(false);}} disabled={flashcardIndex===0}><ChevronLeft size={15}/> Previous</button><span>{flashcardIndex+1} / {cards.length}</span><button type="button" onClick={()=>{setFlashcardIndex(Math.min(cards.length-1,flashcardIndex+1));setFlashcardFlipped(false);}} disabled={flashcardIndex===cards.length-1}>Next <ChevronRight size={15}/></button></div></section>}
    {!!content.studyPlan?.length&&<section className="lab-hub-content-section"><h4>Suggested study sequence</h4>{content.studyPlan.map((step,index)=><article className="lab-hub-plan-step" key={index}><span>{index+1}</span><div><strong>{step.step}</strong><p>{step.activity}</p></div><small>{step.minutes} min</small></article>)}</section>}
    {!!content.questions?.length&&<p className="lab-hub-detail-foot">{content.questions.length} questions · Start a practice attempt whenever you're ready.</p>}
  </div>;
}

function PracticeRunner({ attempt, index, flagged, remainingSeconds, onAnswer, onIndex, onFlag, onSubmit, onBack, onFullRetake, onIncorrectRetake, onFreshVariant, onReviewMaterial }: {
  attempt:LabAttempt; index:number; flagged:string[]; remainingSeconds:number|null;
  onAnswer:(id:string,value:string)=>void; onIndex:(value:number)=>void; onFlag:(id:string)=>void; onSubmit:()=>void; onBack:()=>void;
  onFullRetake:()=>void; onIncorrectRetake:()=>void; onFreshVariant:()=>void; onReviewMaterial:()=>void;
}) {
  const questions=attempt.material_snapshot.questions??[];
  const question=questions[index];
  const results=((attempt.result as {items?:QuestionResult[]}).items??[]);
  const isSubmitted=attempt.status==="submitted";
  const answered=Object.keys(attempt.responses).filter(key=>attempt.responses[key]?.trim()).length;
  if(isSubmitted){
    return <div className="lab-hub-results"><button type="button" className="lab-hub-back" onClick={onBack}><ArrowLeft size={15}/> Practice workspace</button><div className="lab-hub-result-score"><span><Trophy size={25}/></span><strong>{attempt.percentage}%</strong><small>{attempt.score} / {attempt.max_score} marks · {attempt.duration_seconds}s</small><p>{Number(attempt.percentage||0)>=80?"Excellent work.":Number(attempt.percentage||0)>=50?"Good effort. Review the explanations to strengthen your understanding.":"Use the missed questions as a guide. A focused retake will help."}</p></div><div className="lab-hub-result-actions"><button type="button" className="lab-hub-primary" onClick={onFullRetake}><RotateCcw size={15}/> Retake full set</button>{results.some(item=>!item.correct)&&<button type="button" onClick={onIncorrectRetake}><Target size={15}/> Retry incorrect only</button>}<button type="button" onClick={onFreshVariant}><Sparkles size={15}/> Generate fresh variant</button><button type="button" onClick={onReviewMaterial}><BookOpen size={15}/> Review material</button></div><div className="lab-hub-result-review"><h4>Answer review</h4>{results.map((item,i)=><article className={item.correct?"is-correct":"is-incorrect"} key={item.questionId}><div><span>Question {i+1}</span><b>{item.correct?"Correct":"Review this answer"}</b></div><strong>{item.prompt}</strong><p>Your answer: {item.given || "Not answered"}</p><p>Correct answer: {item.correctAnswer}</p><small>{item.explanation}</small></article>)}</div></div>;
  }
  return <div className="lab-hub-runner">
    <div className="lab-hub-runner-head"><button type="button" className="lab-hub-back" onClick={onBack}><ArrowLeft size={15}/> Exit practice</button><div><span>{attempt.subject_name} · {attempt.topic}</span><strong>{attempt.mode==="practice"?"Practice mode":attempt.mode==="timed"?"Timed practice":"Exam simulation"}</strong></div>{remainingSeconds!==null&&<span className={"lab-hub-timer "+(remainingSeconds<60?"is-low":"")}><Clock3 size={15}/>{Math.floor(remainingSeconds/60)}:{String(remainingSeconds%60).padStart(2,"0")}</span>}</div>
    <div className="lab-hub-runner-meta"><span>Question {index+1} of {questions.length}</span><span>{answered} answered</span><span>{flagged.length} flagged</span></div>
    <div className="lab-hub-question-progress"><span style={{width:((index+1)/Math.max(1,questions.length))*100+"%"}}/></div>
    <div className="lab-hub-question-layout"><nav className="lab-hub-question-nav" aria-label="Question navigation">{questions.map((item,i)=><button type="button" key={item.id} className={(i===index?"is-current ":"")+(attempt.responses[item.id]?"is-answered ":"")+(flagged.includes(item.id)?"is-flagged":"")} onClick={()=>onIndex(i)}>{i+1}</button>)}</nav><article className="lab-hub-question-card"><div className="lab-hub-question-top"><span>{question?.type?.replace("_"," ")||"Question"} · {question?.points??1} mark(s)</span><button type="button" className={flagged.includes(question?.id||"")?"is-flagged":""} onClick={()=>question&&onFlag(question.id)}><Flag size={14}/>{flagged.includes(question?.id||"")?"Flagged":"Flag question"}</button></div><h3>{question?.prompt}</h3>{question&&(question.type==="multiple_choice"||question.type==="true_false")?<div className="lab-hub-answer-options">{(question.options?.length?question.options:["True","False"]).map(option=><button type="button" key={option} className={attempt.responses[question.id]===option?"is-selected":""} onClick={()=>onAnswer(question.id,option)}>{option}</button>)}</div>:<label className="lab-hub-answer-input"><span>Your answer</span><textarea rows={3} value={attempt.responses[question?.id||""]||""} onChange={event=>question&&onAnswer(question.id,event.target.value)} placeholder="Write your answer here…"/></label>}<div className="lab-hub-question-controls"><button type="button" onClick={()=>onIndex(Math.max(0,index-1))} disabled={index===0}><ChevronLeft size={15}/> Previous</button><button type="button" onClick={()=>onIndex(Math.min(questions.length-1,index+1))} disabled={index===questions.length-1}>Next <ChevronRight size={15}/></button></div><div className="lab-hub-submit-row"><span>{questions.length-answered} remaining</span><button type="button" className="lab-hub-primary" onClick={onSubmit}><CheckCircle2 size={16}/> Submit and mark</button></div></article></div>
  </div>;
}

function AttemptRow({ attempt, onReview }: { attempt:LabAttempt; onReview:()=>void }) {
  return <article className="lab-hub-attempt-row"><span className={attempt.status==="submitted"?"is-done":"is-draft"}>{attempt.status==="submitted"?<Check size={15}/>:<Play size={14}/>}</span><div><strong>{attempt.topic}</strong><small>{attempt.subject_name} · {attempt.attempt_number===1?"First attempt":"Attempt "+attempt.attempt_number} · {new Date(attempt.created_at).toLocaleDateString()}</small></div><b>{attempt.status==="submitted"?(attempt.percentage??0)+"%":"In progress"}</b><button type="button" onClick={onReview}>{attempt.status==="submitted"?"Review":"Continue"} <ChevronRight size={14}/></button></article>;
}

function EmptyState({ icon, title, text, action, onClick }: {icon:ReactNode;title:string;text:string;action:string;onClick:()=>void}) {
  return <div className="lab-hub-empty"><span>{icon}</span><strong>{title}</strong><p>{text}</p><button type="button" className="lab-hub-primary small" onClick={onClick}>{action}</button></div>;
}
