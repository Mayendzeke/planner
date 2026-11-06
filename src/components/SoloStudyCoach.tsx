import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, Pause, Play, RefreshCw, Target } from "lucide-react";
import type { Subject } from "../data/db";
import { plannerDb } from "../data/db";

const stages = [
  { title: "Set your goal", time: "2 minutes", instruction: "Choose one small result you want by the end of this session. Be specific: a method you can use, a definition you can explain, or a question type you can solve." },
  { title: "Learn one idea", time: "10–20 minutes", instruction: "Use one textbook section, teacher note or saved resource. Read a small section, then pause and explain the idea in your own words. Do not copy whole paragraphs." },
  { title: "Recall from memory", time: "5–10 minutes", instruction: "Close your notes. Write the key facts, steps or definitions you remember. Then reopen your source and correct anything missing or inaccurate." },
  { title: "Practise independently", time: "10–20 minutes", instruction: "Attempt a question without looking at the worked answer. Show your steps. For a written subject, plan your response before writing it." },
  { title: "Review and reflect", time: "3–5 minutes", instruction: "Mark your attempt, correct mistakes in a different colour, and identify one thing to practise next. A mistake you understand is useful progress." },
];

const formatTime = (seconds: number) => {
  const value = Math.max(0, seconds);
  return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
};

export default function SoloStudyCoach({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState(45);
  const [stage, setStage] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [ticker, setTicker] = useState(Date.now());
  const [reflection, setReflection] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [completedMinutes, setCompletedMinutes] = useState(0);

  useEffect(() => {
    if (subjectId === "" && subjects.length) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);

  useEffect(() => {
    if (runningSince === null) return;
    const timer = window.setInterval(() => setTicker(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [runningSince]);

  const elapsed = elapsedSeconds + (runningSince === null ? 0 : Math.max(0, Math.floor((ticker - runningSince) / 1000)));
  const remaining = Math.max(0, duration * 60 - elapsed);
  const progress = Math.min(100, Math.round((stage / (stages.length - 1)) * 100));
  const selectedSubject = useMemo(() => subjects.find(subject => subject.id === subjectId), [subjects, subjectId]);

  function begin() {
    if (!selectedSubject) { setNotice("Add a subject in Subjects before starting a study session."); return; }
    if (!topic.trim()) { setNotice("Enter the topic you are studying."); return; }
    if (!goal.trim()) { setNotice("Write one clear learning goal."); return; }
    setComplete(false);
    setNotice("Your independent study session has started. Work through each step in order.");
    if (runningSince === null) setRunningSince(Date.now());
  }

  function pause() {
    if (runningSince === null) return;
    setElapsedSeconds(elapsed);
    setRunningSince(null);
    setNotice("Paused. Your time so far is retained on this screen.");
  }

  function nextStep() {
    setStage(current => Math.min(stages.length - 1, current + 1));
  }

  async function finish() {
    if (!selectedSubject || saving || elapsed < 60) {
      setNotice("Study for at least one minute before saving a completed session.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const minutes = Math.max(1, Math.round(elapsed / 60));
      setCompletedMinutes(minutes);
      const notes = [
        "Independent study · " + topic.trim(),
        "Goal: " + goal.trim(),
        "Reflection: " + (reflection.trim() || "No reflection added."),
        "Completed steps: " + (stage + 1) + " of " + stages.length,
      ].join("\n");
      await plannerDb.sessions.add({
        id: Date.now(),
        subjectId: selectedSubject.id,
        date: new Date().toISOString(),
        minutes,
        notes,
      });
      setElapsedSeconds(0);
      setRunningSince(null);
      setTicker(Date.now());
      setComplete(true);
      setNotice("Study session saved to your progress. Well done for working independently.");
    } catch {
      setNotice("Your study session could not be saved. Your work is still on this screen; try saving again.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStage(0);
    setElapsedSeconds(0);
    setRunningSince(null);
    setTicker(Date.now());
    setReflection("");
    setNotice("");
    setComplete(false);
    setTopic("");
    setGoal("");
  }

  if (complete) {
    return <div className="glass-panel solo-study-panel solo-study-complete">
      <div className="solo-study-success"><CheckCircle2 size={30}/><div><h3>Session complete</h3><p>Your independent study time has been added to Progress.</p></div></div>
      <div className="solo-study-summary"><span><strong>{selectedSubject?.name || "Subject"}</strong> · {topic}</span><span>{completedMinutes} minutes recorded</span><span>Goal: {goal}</span></div>
      <button type="button" className="primary-button" onClick={reset}><RefreshCw size={15}/> Start another study session</button>
    </div>;
  }

  return <div className="glass-panel solo-study-panel">
    <div className="session-section-heading">
      <div><h3>Study independently</h3><p>A clear routine for learning when your teacher is not online.</p></div>
      <Target size={21}/>
    </div>
    {!runningSince && elapsedSeconds === 0 && <div className="solo-study-setup">
      {subjects.length ? <label className="session-field">Subject
        <select value={subjectId} onChange={event => setSubjectId(Number(event.target.value))}>
          {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </label> : <p className="session-inline-error">You have not added any subjects yet. Add your subjects first, then return here to start studying.</p>}
      <label className="session-field">Topic or chapter<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={120} placeholder="e.g. Linear equations, photosynthesis, essay structure"/></label>
      <label className="session-field">What should you be able to do?
        <textarea rows={2} value={goal} onChange={event => setGoal(event.target.value)} maxLength={400} placeholder="e.g. Solve linear equations and check my answers independently."/>
      </label>
      <label className="session-field">Study time
        <select value={duration} onChange={event => setDuration(Number(event.target.value))}>
          <option value={25}>25 minutes · Focus session</option>
          <option value={45}>45 minutes · Standard session</option>
          <option value={60}>60 minutes · Deep study</option>
          <option value={90}>90 minutes · Extended revision</option>
        </select>
      </label>
      <button type="button" className="primary-button" onClick={begin} disabled={!subjects.length}><Play size={15}/> Start studying</button>
    </div>}
    {(runningSince !== null || elapsedSeconds > 0) && <div className="solo-study-active">
      <div className="solo-study-active-head"><div><span className="eyebrow">YOUR FOCUS SESSION</span><h3>{topic}</h3><p>{selectedSubject?.name} · {goal}</p></div><div className="solo-study-clock"><Clock3 size={15}/><strong>{formatTime(remaining)}</strong><small>remaining</small></div></div>
      <div className="solo-study-progress"><span style={{ width: progress + "%" }}/></div>
      <div className="solo-study-steps" aria-label="Study steps">
        {stages.map((item, index) => <button type="button" key={item.title} onClick={() => setStage(index)} className={index === stage ? "active" : index < stage ? "completed" : ""} aria-current={index === stage ? "step" : undefined}>
          <span>{index < stage ? "✓" : index + 1}</span><small>{item.title}</small>
        </button>)}
      </div>
      <article className="solo-study-instruction"><span>{stages[stage].time}</span><h4>{stages[stage].title}</h4><p>{stages[stage].instruction}</p></article>
      {stage === stages.length - 1 && <label className="session-field">What did you understand? What needs more practice?
        <textarea rows={3} value={reflection} onChange={event => setReflection(event.target.value)} maxLength={1200} placeholder="Record one thing you learned and one thing to revisit."/>
      </label>}
      <div className="solo-study-actions">
        {runningSince === null ? <button type="button" className="secondary-button" onClick={begin}><Play size={15}/> Resume timer</button> : <button type="button" className="secondary-button" onClick={pause}><Pause size={15}/> Pause</button>}
        {stage < stages.length - 1 ? <button type="button" className="primary-button" onClick={nextStep}>Next step</button> : <button type="button" className="primary-button" onClick={() => void finish()} disabled={saving}>{saving ? "Saving…" : "Finish and save session"}</button>}
      </div>
    </div>}
    {notice && <p className="inline-message" role="status">{notice}</p>}
    <div className="solo-study-principle"><BookOpen size={16}/><span>Study tip: understanding comes from explaining, recalling and practising—not just rereading. Use your teacher's notes or your own saved resources as your source.</span></div>
  </div>;
}
