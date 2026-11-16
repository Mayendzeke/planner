import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, ClipboardList, Send, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./AssignedLabPracticals.css";

type LabArea = "maths" | "physics" | "chemistry" | "biology";
type Assignment = {
  id: string;
  learner_id: string;
  lab_area: LabArea;
  activity_key: string;
  title: string;
  instructions: string;
  due_at: string | null;
  required: boolean;
  status: string;
  created_at: string;
};
type WorkRecord = {
  activity_key: string;
  status: string;
  live_state: Record<string, unknown>;
  result: Record<string, unknown>;
  reviewed_at: string | null;
  score: number | null;
  feedback: string;
};
const labelFor = (area: LabArea) => area === "maths" ? "Mathematics" : area[0].toUpperCase() + area.slice(1);
const when = (value: string | null) => value ? new Date(value).toLocaleString() : "No due date";

export default function AssignedLabPracticals({ studentId, areas }: { studentId?: string | null; areas: LabArea[] }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [work, setWork] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [error, setError] = useState("");
  const [active, setActive] = useState<Assignment | null>(null);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!studentId || !supabase || !areas.length) { setAssignments([]); setWork([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [assignmentResult, workResult] = await Promise.all([
        supabase.from("lab_assignments").select("id,learner_id,lab_area,activity_key,title,instructions,due_at,required,status,created_at")
          .eq("learner_id", studentId).in("lab_area", areas).neq("status", "cancelled").order("created_at", { ascending: false }).limit(50),
        supabase.from("student_lab_work").select("activity_key,status,live_state,result,reviewed_at,score,feedback")
          .eq("learner_id", studentId).in("lab_area", areas).limit(100),
      ]);
      if (assignmentResult.error) throw assignmentResult.error;
      if (workResult.error) throw workResult.error;
      setAssignments((assignmentResult.data ?? []) as Assignment[]);
      setWork((workResult.data ?? []) as WorkRecord[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assigned practicals could not be loaded.");
    } finally { setLoading(false); }
  }, [studentId, areas.join("|")]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const workByAssignment = useMemo(() => new Map(work.map(item => [item.activity_key, item])), [work]);
  const openAssignment = (item: Assignment) => {
    const existing = workByAssignment.get("assignment:" + item.id);
    const savedReflection = existing?.live_state?.reflection;
    setReflection(typeof savedReflection === "string" ? savedReflection : "");
    setActive(item);
    setNotice("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !studentId || !supabase || saving) return;
    const text = reflection.trim();
    if (text.length < 20) { setError("Write at least 20 characters about what you did, observed or learned."); return; }
    setSaving(true); setError(""); setNotice("");
    const now = new Date().toISOString();
    const activityKey = "assignment:" + active.id;
    const payload = {
      learner_id: studentId,
      lab_area: active.lab_area,
      activity_key: activityKey,
      title: active.title,
      live_state: { assignment_id: active.id, instructions: active.instructions, reflection: text },
      result: { assignment_id: active.id, reflection: text, submitted_at: now, submission_type: "learner_reflection" },
      status: "submitted",
      last_accessed_at: now,
      reviewed_at: null,
      reviewed_by: null,
      score: null,
      feedback: "",
      updated_at: now,
    };
    try {
      const { error: saveError } = await supabase.from("student_lab_work").upsert(payload, { onConflict: "learner_id,lab_area,activity_key" });
      if (saveError) throw saveError;
      setWork(current => [...current.filter(item => item.activity_key !== activityKey), {
        activity_key: activityKey, status: "submitted", live_state: payload.live_state, result: payload.result,
        reviewed_at: null, score: null, feedback: "",
      }]);
      setActive(null);
      setReflection("");
      setNotice("Your practical reflection has been submitted to your teacher.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your submission could not be saved. Please try again.");
    } finally { setSaving(false); }
  }

  if (!studentId || !areas.length || (!assignments.length && !loading && !error)) return null;

  return <section className="assigned-lab-practicals">
    <header><span className="assigned-lab-icon"><ClipboardList size={19}/></span><div><span className="eyebrow">TEACHER-ASSIGNED WORK</span><h3>Your practicals and Lab tasks</h3><p>Complete the interactive activity, then submit a short reflection for your teacher to review.</p></div></header>
    {error && <p className="assigned-lab-error" role="alert"><AlertCircle size={14}/>{error}</p>}
    {notice && <p className="assigned-lab-notice" role="status"><CheckCircle2 size={14}/>{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={13}/></button></p>}
    {loading && <p className="assigned-lab-loading">Checking your assigned practicals…</p>}
    {!loading && assignments.map(item => {
      const record = workByAssignment.get("assignment:" + item.id);
      const submitted = record?.status === "submitted";
      const overdue = item.due_at ? Date.parse(item.due_at) < Date.now() && !submitted : false;
      return <article className="assigned-lab-card" key={item.id}>
        <div className="assigned-lab-card-copy"><div className="assigned-lab-tags"><span>{labelFor(item.lab_area)}</span><span>{item.required ? "Required" : "Practice"}</span><span className={overdue ? "is-overdue" : submitted ? "is-submitted" : ""}>{overdue ? "Overdue" : submitted ? "Submitted" : "Assigned"}</span></div><strong>{item.title}</strong><p>{item.instructions || "Explore the relevant Lab tools, record what you discover and submit a reflection."}</p><small><CalendarClock size={13}/> Due: {when(item.due_at)}</small>{record?.reviewed_at && <small><CheckCircle2 size={13}/> Teacher reviewed · {record.score == null ? "Feedback available" : "Score " + record.score + "%"}</small>}{record?.reviewed_at && record.feedback && <p className="assigned-lab-feedback"><strong>Teacher feedback:</strong> {record.feedback}</p>}</div>
        <button type="button" className="assigned-lab-action" onClick={() => openAssignment(item)}>{submitted ? "Update submission" : "Start and submit"}</button>
      </article>;
    })}
    {active && <div className="assigned-lab-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setActive(null); }}>
      <form className="assigned-lab-dialog" onSubmit={submit}>
        <button type="button" className="assigned-lab-close" onClick={() => setActive(null)} aria-label="Close"><X size={17}/></button>
        <span className="eyebrow">{labelFor(active.lab_area)} · PRACTICAL SUBMISSION</span>
        <h3>{active.title}</h3>
        <p>{active.instructions || "Use the interactive Lab tools on this page before writing your reflection."}</p>
        <label>Your observations and reflection<textarea value={reflection} onChange={event => setReflection(event.target.value)} rows={6} maxLength={3000} placeholder="What did you investigate? What did you observe? What did the results teach you? What would you improve next time?"/></label>
        <small>{reflection.length} / 3,000 characters · At least 20 characters required</small>
        {workByAssignment.get("assignment:" + active.id)?.reviewed_at && <p className="assigned-lab-notice">Your teacher has reviewed this submission. A new submission will replace your previous reflection.</p>}
        <div><button type="button" onClick={() => setActive(null)} disabled={saving}>Cancel</button><button type="submit" disabled={saving || reflection.trim().length < 20}>{saving ? "Submitting…" : "Submit to teacher"} <Send size={14}/></button></div>
      </form>
    </div>}
  </section>;
}
