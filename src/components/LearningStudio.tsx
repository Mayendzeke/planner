import { useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, CalendarClock, CheckCircle2, Clock3, Compass, FileQuestion, Layers3, Lightbulb, RefreshCw, Sparkles, Target, Trophy } from "lucide-react";
import type { Subject } from "../data/db";
import { studentStorageKey } from "../lib/studentStorage";

type Mastery = "learning" | "practised" | "mastered";
type ReviewRecord = {
  id: string;
  subjectId: number;
  subjectName: string;
  topic: string;
  notes: string;
  mastery: Mastery;
  reviewCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  updatedAt: string;
};
type Rating = "again" | "hard" | "good" | "easy";
const STORAGE_KEY = "studyspace-learning-studio-v1";
const intervals: Record<Rating, number> = {
  again: 10 * 60 * 1000,
  hard: 24 * 60 * 60 * 1000,
  good: 3 * 24 * 60 * 60 * 1000,
  easy: 7 * 24 * 60 * 60 * 1000,
};
const safeDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
};
const readRecords = (): ReviewRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(studentStorageKey(STORAGE_KEY)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReviewRecord => Boolean(item && typeof item === "object"
      && typeof item.id === "string" && typeof item.subjectName === "string"
      && typeof item.topic === "string" && typeof item.nextReviewAt === "string"
      && ["learning", "practised", "mastered"].includes(item.mastery)));
  } catch { return []; }
};
const formatDate = (value: string) => {
  const date = safeDate(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (sameDay) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const masteryLabel: Record<Mastery, string> = {
  learning: "Learning",
  practised: "Practised",
  mastered: "Confident",
};

export default function LearningStudio({
  subjects,
  learnerLevel,
  grade,
  curriculum,
  onAskMia,
  onOpenAssessments,
  onOpenMaterials,
}: {
  subjects: Subject[];
  learnerLevel?: string;
  grade?: string;
  curriculum?: string;
  onAskMia: (prompt: string) => void;
  onOpenAssessments: () => void;
  onOpenMaterials: () => void;
}) {
  const [subjectId, setSubjectId] = useState<number | "">(subjects[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [numberLineValue, setNumberLineValue] = useState(0);
  const [records, setRecords] = useState<ReviewRecord[]>(readRecords);
  const [tab, setTab] = useState<"study" | "visual" | "revision" | "mastery">("study");
  const [storageWarning, setStorageWarning] = useState("");
  const [notice, setNotice] = useState("");
  const selectedSubject = subjects.find(item => item.id === subjectId);
  const topicKey = selectedSubject && topic.trim()
    ? String(selectedSubject.id) + ":" + topic.trim().toLocaleLowerCase()
    : "";
  const activeRecord = records.find(item => item.id === topicKey) || null;
  const dueRecords = useMemo(() => records
    .filter(item => safeDate(item.nextReviewAt).getTime() <= Date.now())
    .sort((a, b) => safeDate(a.nextReviewAt).getTime() - safeDate(b.nextReviewAt).getTime()), [records]);
  const masteredCount = records.filter(item => item.mastery === "mastered").length;

  useEffect(() => {
    if (subjects.length && (subjectId === "" || !subjects.some(item => item.id === subjectId))) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  useEffect(() => {
    if (!topicKey) { setNotes(""); return; }
    const found = records.find(item => item.id === topicKey);
    setNotes(found?.notes || "");
  }, [topicKey]);

  useEffect(() => {
    try {
      localStorage.setItem(studentStorageKey(STORAGE_KEY), JSON.stringify(records));
      setStorageWarning("");
    } catch {
      setStorageWarning("This device could not save your topic review history. Free some browser storage and try again.");
    }
  }, [records]);

  const context = [
    selectedSubject?.name ? "Subject: " + selectedSubject.name : "",
    topic.trim() ? "Topic: " + topic.trim() : "",
    learnerLevel ? "Level: " + learnerLevel : "",
    grade ? "Grade/year: " + grade : "",
    curriculum ? "Curriculum: " + curriculum : "",
  ].filter(Boolean).join("\n");

  const requireTopic = () => {
    if (!selectedSubject) { setNotice("Add or select a subject in Subjects first."); return false; }
    if (!topic.trim()) { setNotice("Enter the topic you want to study first."); return false; }
    setNotice("");
    return true;
  };

  const ask = (goal: string) => {
    if (!requireTopic()) return;
    onAskMia("Use the learner context below to support learning. Teach at the learner's level, use clear language and one relevant example. Do not invent curriculum-specific facts; ask if context is missing.\n\n" + context + "\n\nLearning request: " + goal);
  };

  const saveTopic = () => {
    if (!requireTopic()) return;
    const now = new Date().toISOString();
    setRecords(current => {
      const previous = current.find(item => item.id === topicKey);
      const next: ReviewRecord = {
        id: topicKey,
        subjectId: selectedSubject!.id,
        subjectName: selectedSubject!.name,
        topic: topic.trim(),
        notes: notes.trim(),
        mastery: previous?.mastery || "learning",
        reviewCount: previous?.reviewCount || 0,
        lastReviewedAt: previous?.lastReviewedAt || now,
        nextReviewAt: previous?.nextReviewAt || now,
        updatedAt: now,
      };
      return [next, ...current.filter(item => item.id !== topicKey)].slice(0, 250);
    });
    setNotice("Topic and personal notes saved on this device.");
  };

  const rateRecall = (rating: Rating) => {
    if (!requireTopic()) return;
    const now = new Date();
    const next: Mastery = rating === "easy" ? "mastered" : rating === "again" ? "learning" : "practised";
    const previous = records.find(item => item.id === topicKey);
    const record: ReviewRecord = {
      id: topicKey,
      subjectId: selectedSubject!.id,
      subjectName: selectedSubject!.name,
      topic: topic.trim(),
      notes: notes.trim() || previous?.notes || "",
      mastery: next,
      reviewCount: (previous?.reviewCount || 0) + 1,
      lastReviewedAt: now.toISOString(),
      nextReviewAt: new Date(now.getTime() + intervals[rating]).toISOString(),
      updatedAt: now.toISOString(),
    };
    setRecords(current => [record, ...current.filter(item => item.id !== topicKey)].slice(0, 250));
    setNotice("Review recorded. Your next reminder is " + formatDate(record.nextReviewAt) + ".");
  };

  const openRecord = (record: ReviewRecord) => {
    setSubjectId(record.subjectId);
    setTopic(record.topic);
    setNotes(record.notes);
    setTab("study");
  };

  return (
    <section className="learning-studio">
      <header className="learning-studio-hero glass-panel">
        <div className="learning-studio-hero-copy">
          <span className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL LEARNING WORKSPACE</span>
          <h2>Learn it. Practise it. Remember it.</h2>
          <p>Bring explanations, active recall, revision and topic progress into one connected study routine. Your existing lessons, materials and assessments remain available alongside this workspace.</p>
          <div className="learning-studio-hero-stats">
            <span><strong>{records.length}</strong> topics tracked</span>
            <span><strong>{dueRecords.length}</strong> due for review</span>
            <span><strong>{masteredCount}</strong> confident topics</span>
          </div>
        </div>
        <div className="learning-studio-orbit" aria-hidden="true"><div><Brain size={32}/></div><i/><b/><small>LEARN · RECALL · GROW</small></div>
      </header>

      <nav className="learning-studio-tabs" aria-label="Learning Studio sections">
        <button type="button" className={tab === "study" ? "active" : ""} onClick={() => setTab("study")}><BookOpen size={15}/> Study</button>
        <button type="button" className={tab === "visual" ? "active" : ""} onClick={() => setTab("visual")}><Layers3 size={15}/> Visual learning</button>
        <button type="button" className={tab === "revision" ? "active" : ""} onClick={() => setTab("revision")}><CalendarClock size={15}/> Revision queue <span>{dueRecords.length}</span></button>
        <button type="button" className={tab === "mastery" ? "active" : ""} onClick={() => setTab("mastery")}><Trophy size={15}/> Topic mastery</button>
      </nav>

      {tab === "study" && <div className="learning-studio-grid">
        <section className="glass-panel learning-studio-card learning-studio-main">
          <div className="learning-studio-card-heading"><div><span className="eyebrow">START WITH A FOCUS</span><h3>What are you learning today?</h3><p>Choose a registered subject and one topic. MIΛ will receive the same context when you ask for help.</p></div><Target size={20}/></div>
          <div className="learning-studio-fields">
            <label>Subject
              <select value={subjectId} onChange={event => setSubjectId(event.target.value ? Number(event.target.value) : "")}>
                <option value="">Choose a subject</option>
                {subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Topic or chapter
              <input value={topic} onChange={event => setTopic(event.target.value)} maxLength={120} placeholder="e.g. Linear equations, cells, market segmentation"/>
            </label>
          </div>
          <div className="learning-studio-objectives">
            <div><CheckCircle2 size={16}/><span><strong>Understand</strong><small>Build a clear explanation in your own words.</small></span></div>
            <div><Compass size={16}/><span><strong>Apply</strong><small>Work through an example and try a question independently.</small></span></div>
            <div><RefreshCw size={16}/><span><strong>Remember</strong><small>Recall the idea again using a spaced review.</small></span></div>
          </div>
          <div className="learning-studio-actions">
            <button type="button" className="primary-button" onClick={() => ask("Explain this topic step by step, define essential terms, show one worked example, and check my understanding with one question.")}><Lightbulb size={15}/> Explain this topic</button>
            <button type="button" className="secondary-button" onClick={() => ask("Teach me step by step using guided questions. Start with what I already know, give one hint at a time, and let me attempt each step before revealing the next.")}><Brain size={15}/> Teach me step by step</button>
            <button type="button" className="secondary-button" onClick={() => ask("Create five adaptive practice questions for this topic. Ask one question at a time, wait for my answer, explain mistakes and increase difficulty only when I am ready.")}><FileQuestion size={15}/> Quiz me</button>
            <button type="button" className="secondary-button" onClick={() => ask("Create up to 12 concise revision flashcards for this topic. Format every card exactly as Front: and Back:, include a simple memory cue when useful, and cover key definitions, methods and common mistakes.")}><Layers3 size={15}/> Make flashcards</button>
            <button type="button" className="secondary-button" onClick={() => ask("Help me understand this topic visually. Describe a labelled concept map or diagram, explain how each part relates, and give a simple way to draw or interpret it. For mathematics, show the steps and relationships; for geography or science, explain the relevant process or spatial relationships.")}><Compass size={15}/> Visual explanation</button>
            <button type="button" className="secondary-button" onClick={() => ask("Build a revision plan for this topic using retrieval practice and spaced repetition. Start with a short diagnostic check, then set realistic review checkpoints and practice tasks.")}><CalendarClock size={15}/> Build revision plan</button>
          </div>
          <div className="learning-studio-answer-check">
            <label htmlFor="learning-studio-answer">Check my answer with MIΛ</label>
            <textarea id="learning-studio-answer" value={answerDraft} onChange={event => setAnswerDraft(event.target.value)} rows={3} maxLength={3000} placeholder="Write your answer or show the steps you used. MIΛ will review your reasoning and point out what to improve."/>
            <button type="button" className="secondary-button" disabled={!answerDraft.trim()} onClick={() => ask("Check my answer below. First identify what I have understood correctly, then check the reasoning and calculations carefully. Point out the first incorrect or incomplete step, give me a hint, and ask me to correct it before revealing a complete worked solution.\n\nMy answer:\n" + answerDraft.trim())}><CheckCircle2 size={15}/> Check my answer</button>
          </div>
          <div className="learning-studio-personal-notes">
            <label htmlFor="learning-studio-notes">My explanation and study notes</label>
            <textarea id="learning-studio-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={4} maxLength={5000} placeholder="Write the main idea in your own words, add a worked example, or note what you still find difficult."/>
            <div><span>Private to this browser profile · saved locally</span><button type="button" className="secondary-button" onClick={saveTopic}>Save topic notes</button></div>
          </div>
          <div className="learning-studio-recall">
            <div><span className="eyebrow">AFTER YOU HAVE STUDIED</span><h4>How well can you recall this topic without looking?</h4><p>Rate your confidence honestly. The next review date is set from your answer.</p></div>
            <div className="learning-studio-rating">
              <button type="button" onClick={() => rateRecall("again")}>Again <small>10 min</small></button>
              <button type="button" onClick={() => rateRecall("hard")}>Hard <small>1 day</small></button>
              <button type="button" onClick={() => rateRecall("good")}>Good <small>3 days</small></button>
              <button type="button" onClick={() => rateRecall("easy")}>Easy <small>7 days</small></button>
            </div>
            {activeRecord && <p className="learning-studio-saved-state">Last reviewed {formatDate(activeRecord.lastReviewedAt)} · {masteryLabel[activeRecord.mastery]} · next review {formatDate(activeRecord.nextReviewAt)}</p>}
          </div>
        </section>
        <aside className="learning-studio-side">
          <section className="glass-panel learning-studio-card">
            <span className="eyebrow">YOUR STUDY TOOLKIT</span><h3>Continue learning</h3>
            <button type="button" className="learning-studio-link" onClick={onOpenMaterials}><BookOpen size={17}/><span><strong>Open study materials</strong><small>Teacher resources and personal files</small></span></button>
            <button type="button" className="learning-studio-link" onClick={onOpenAssessments}><FileQuestion size={17}/><span><strong>Practice assigned work</strong><small>Tests, worksheets and teacher feedback</small></span></button>
            <button type="button" className="learning-studio-link" onClick={() => ask("Use my learning context to identify one useful next step. Ask me a short diagnostic question before recommending an activity.")}><Sparkles size={17}/><span><strong>Ask MIΛ for a next step</strong><small>Personalised guidance for this topic</small></span></button>
          </section>
          <section className="glass-panel learning-studio-card learning-studio-due-card">
            <div className="learning-studio-card-heading"><div><span className="eyebrow">RECALL BUILDS MEMORY</span><h3>Next up for revision</h3></div><Clock3 size={19}/></div>
            {dueRecords.length ? dueRecords.slice(0, 4).map(record => <button className="learning-studio-due-item" type="button" key={record.id} onClick={() => openRecord(record)}><span><strong>{record.topic}</strong><small>{record.subjectName}</small></span><span>{formatDate(record.nextReviewAt)}</span></button>) : <p className="learning-studio-empty">Your review queue is clear. Save a topic and rate your recall to schedule its next review.</p>}
          </section>
        </aside>
      </div>}

      {tab === "visual" && <section className="glass-panel learning-studio-card learning-studio-visual">
        <div className="learning-studio-card-heading"><div><span className="eyebrow">VISUALISE THE IDEA</span><h3>Turn a topic into a concept map</h3><p>MIΛ can create a subject-specific diagram; this map is a reusable structure for organising what you learn.</p></div><Layers3 size={20}/></div>
        <div className="learning-studio-concept-map">
          <svg viewBox="0 0 760 330" role="img" aria-label="Concept map linking the topic to key ideas, examples, practice and recall">
            <path d="M380 150 L155 65 M380 150 L605 65 M380 150 L155 260 M380 150 L605 260" className="learning-map-line"/>
            <rect x="275" y="112" width="210" height="76" rx="20" className="learning-map-centre"/>
            <text x="380" y="145" textAnchor="middle" className="learning-map-title">{(topic.trim() || "Your topic").slice(0, 25)}</text>
            <text x="380" y="165" textAnchor="middle" className="learning-map-subtitle">{selectedSubject?.name || "Select a subject"}</text>
            <g><rect x="45" y="24" width="220" height="82" rx="16" className="learning-map-node"/><text x="155" y="58" textAnchor="middle" className="learning-map-title">Key ideas</text><text x="155" y="79" textAnchor="middle" className="learning-map-subtitle">Definitions and principles</text></g>
            <g><rect x="495" y="24" width="220" height="82" rx="16" className="learning-map-node"/><text x="605" y="58" textAnchor="middle" className="learning-map-title">Examples</text><text x="605" y="79" textAnchor="middle" className="learning-map-subtitle">Worked through clearly</text></g>
            <g><rect x="45" y="220" width="220" height="82" rx="16" className="learning-map-node"/><text x="155" y="254" textAnchor="middle" className="learning-map-title">Apply</text><text x="155" y="275" textAnchor="middle" className="learning-map-subtitle">Try it without notes</text></g>
            <g><rect x="495" y="220" width="220" height="82" rx="16" className="learning-map-node"/><text x="605" y="254" textAnchor="middle" className="learning-map-title">Recall</text><text x="605" y="275" textAnchor="middle" className="learning-map-subtitle">Review at the right time</text></g>
          </svg>
        </div>
        <div className="learning-studio-number-line">
          <div><span className="eyebrow">INTERACTIVE MATHEMATICS</span><h4>Explore an integer number line</h4><p>Move the marker to a value, then ask MIΛ to explain how it relates to your topic.</p></div>
          <output htmlFor="learning-studio-number-line">{numberLineValue}</output>
          <input id="learning-studio-number-line" aria-label="Choose an integer from negative ten to ten" type="range" min={-10} max={10} step={1} value={numberLineValue} onChange={event => setNumberLineValue(Number(event.target.value))}/>
          <div className="learning-studio-number-scale" aria-hidden="true">{Array.from({length:21},(_,index)=>{const value=index-10;return <span key={value} className={value===numberLineValue?"is-selected":""}>{value}</span>;})}</div>
          <button type="button" className="secondary-button" onClick={() => ask("Explain the integer " + numberLineValue + " on a number line. Show how positive and negative direction works, compare it to zero, then give me one short question about ordering or adding integers.")}>Explain {numberLineValue} on the number line</button>
        </div>
        <div className="learning-studio-visual-actions"><button type="button" className="primary-button" onClick={() => ask("Create a labelled text diagram or concept map for this topic. Include the relationships, process flow or mathematical steps. Explain each label and give me one question that checks if I can read the diagram.")}><Compass size={15}/> Ask MIΛ to build my diagram</button><span>Use the topic-specific diagram prompt for biology, geography, business, science or mathematics.</span></div>
      </section>}

      {tab === "revision" && <section className="glass-panel learning-studio-card">
        <div className="learning-studio-card-heading"><div><span className="eyebrow">SPACED REVISION</span><h3>Your revision queue</h3><p>Topics you rated for review appear here when their next review date arrives. Records are stored on this device.</p></div><CalendarClock size={20}/></div>
        {dueRecords.length ? <div className="learning-studio-record-list">{dueRecords.map(record => <article key={record.id}><div><strong>{record.topic}</strong><span>{record.subjectName} · {record.reviewCount} review{record.reviewCount === 1 ? "" : "s"}</span></div><span className={"learning-studio-status status-" + record.mastery}>{masteryLabel[record.mastery]}</span><button type="button" className="secondary-button" onClick={() => openRecord(record)}>Study topic</button></article>)}</div> : <div className="learning-studio-empty-large"><CalendarClock size={26}/><strong>No topics are due right now.</strong><span>Study a topic, rate your recall and StudySpace will place it in this queue.</span></div>}
      </section>}

      {tab === "mastery" && <section className="glass-panel learning-studio-card">
        <div className="learning-studio-card-heading"><div><span className="eyebrow">TOPIC-LEVEL PROGRESS</span><h3>What feels confident?</h3><p>Topic mastery is based on your own recall ratings, not guessed grades. Official marks stay in Progress and teacher assessments.</p></div><Trophy size={20}/></div>
        {records.length ? <div className="learning-studio-record-list">{records.map(record => <article key={record.id}><div><strong>{record.topic}</strong><span>{record.subjectName} · Last reviewed {formatDate(record.lastReviewedAt)}</span></div><span className={"learning-studio-status status-" + record.mastery}>{masteryLabel[record.mastery]}</span><button type="button" className="secondary-button" onClick={() => openRecord(record)}>Open</button></article>)}</div> : <div className="learning-studio-empty-large"><Target size={26}/><strong>Your topic record starts with your first review.</strong><span>Choose a subject and topic in Study, then rate how well you can recall it.</span></div>}
      </section>}

      {notice && <p className="learning-studio-notice" role="status">{notice}</p>}
      {storageWarning && <p className="learning-studio-notice is-warning" role="alert">{storageWarning}</p>}
      <p className="learning-studio-footnote">MIΛ is a learning assistant and can make mistakes. Check important facts against your teacher's notes and course materials. Topic review records are saved locally on this device.</p>
    </section>
  );
}
