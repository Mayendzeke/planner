import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type { Subject } from "../data/db";
import { supabase } from "../lib/supabase";

type TimetableKind = "school" | "personal";
type Entry = {
  id: string;
  learner_id: string;
  timetable_kind: TimetableKind;
  subject_name: string;
  title: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
  source: "manual" | "mia_image_import";
};
type Editor = {
  subject_name: string;
  title: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
};
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const blank = (): Editor => ({ subject_name: "", title: "", day_of_week: 1, starts_at: "08:00", ends_at: "09:00", location: "", notes: "" });
const timeValue = (value: string) => value.slice(0, 5);

export default function StudentTimetable({ subjects = [] }: { subjects?: Subject[] }) {
  const [kind, setKind] = useState<TimetableKind>("school");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Editor>(blank);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadEntries() {
    if (!supabase) { setLoading(false); setError("StudySpace is not connected. Sign in again."); return; }
    setLoading(true);
    setError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your student session has expired. Sign in again.");
      setOwnerId(userData.user.id);
      const { data, error: queryError } = await supabase.from("student_timetable_entries")
        .select("id,learner_id,timetable_kind,subject_name,title,day_of_week,starts_at,ends_at,location,notes,source")
        .eq("learner_id", userData.user.id)
        .order("day_of_week", { ascending: true })
        .order("starts_at", { ascending: true });
      if (queryError) throw queryError;
      setEntries((data ?? []) as Entry[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your timetable could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadEntries(); }, []);

  const visibleEntries = useMemo(() => entries.filter(item => item.timetable_kind === kind), [entries, kind]);
  const groupedDays = useMemo(() => days.map((label, index) => ({
    label,
    index,
    items: visibleEntries.filter(item => item.day_of_week === index).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  })), [visibleEntries]);

  function openNew(day = 1) {
    setEditingId(null);
    setDraft({ ...blank(), day_of_week: day, subject_name: subjects[0]?.name ?? "" });
    setEditorOpen(true);
    setNotice("");
    setError("");
  }

  function openEdit(entry: Entry) {
    setEditingId(entry.id);
    setDraft({
      subject_name: entry.subject_name || "",
      title: entry.title || "",
      day_of_week: entry.day_of_week,
      starts_at: timeValue(entry.starts_at),
      ends_at: timeValue(entry.ends_at),
      location: entry.location || "",
      notes: entry.notes || "",
    });
    setEditorOpen(true);
    setNotice("");
    setError("");
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !ownerId || saving) return;
    if (!draft.starts_at || !draft.ends_at || draft.ends_at <= draft.starts_at) {
      setError("The end time must be later than the start time.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const subjectName = draft.subject_name.trim();
    const row = {
      learner_id: ownerId,
      timetable_kind: kind,
      subject_name: subjectName,
      title: draft.title.trim() || subjectName || (kind === "school" ? "School lesson" : "Study session"),
      day_of_week: draft.day_of_week,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      source: "manual",
    };
    try {
      const result = editingId
        ? await supabase.from("student_timetable_entries").update(row).eq("id", editingId).eq("learner_id", ownerId)
        : await supabase.from("student_timetable_entries").insert(row);
      if (result.error) throw result.error;
      setEditorOpen(false);
      setEditingId(null);
      setNotice(editingId ? "Timetable entry updated." : "Timetable entry added.");
      await loadEntries();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The timetable entry could not be saved.");
    } finally { setSaving(false); }
  }

  async function removeEntry(entry: Entry) {
    if (!supabase || !ownerId || !window.confirm("Remove " + entry.title + " from your timetable?")) return;
    setError("");
    setNotice("");
    const { error: deleteError } = await supabase.from("student_timetable_entries")
      .delete().eq("id", entry.id).eq("learner_id", ownerId);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Timetable entry removed."); await loadEntries(); }
  }

  return <div className="student-timetable-page">
    <section className="glass-panel timetable-hero">
      <div className="timetable-hero-mark"><CalendarDays size={25}/></div>
      <div><span className="eyebrow">YOUR WEEK AT A GLANCE</span><h2>My timetable</h2><p>Keep your school lessons and personal study sessions organised. Edit this whenever your school schedule changes.</p></div>
      <button className="icon-button" type="button" onClick={() => void loadEntries()} disabled={loading} aria-label="Refresh timetable"><RefreshCw size={17}/></button>
    </section>
    <section className="glass-panel timetable-workspace">
      <div className="timetable-topline">
        <div className="filter-tabs" role="tablist" aria-label="Timetable type">
          <button type="button" className={kind === "school" ? "selected" : ""} onClick={() => setKind("school")}>School timetable</button>
          <button type="button" className={kind === "personal" ? "selected" : ""} onClick={() => setKind("personal")}>My study timetable</button>
        </div>
        <button type="button" className="primary-button compact-button" onClick={() => openNew()}><Plus size={16}/> Add entry</button>
      </div>
      {notice && <p className="inline-message" role="status">{notice}</p>}
      {error && <p className="alert error-alert" role="alert">{error}</p>}
      {editorOpen && <form className="timetable-editor" onSubmit={saveEntry}>
        <div className="section-heading"><div><h3>{editingId ? "Edit timetable entry" : "Add to your timetable"}</h3><p>Choose a subject and time. The title can be left blank.</p></div><button type="button" className="icon-button" onClick={() => setEditorOpen(false)} aria-label="Close editor"><X size={17}/></button></div>
        <div className="timetable-editor-grid">
          <label className="studio-field">Subject / activity
            <select value={draft.subject_name} onChange={event => setDraft(current => ({ ...current, subject_name: event.target.value, title: current.title || event.target.value }))}>
              <option value="">General study / other</option>
              {subjects.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="studio-field">Day
            <select value={draft.day_of_week} onChange={event => setDraft(current => ({ ...current, day_of_week: Number(event.target.value) }))}>
              {days.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label className="studio-field">Start time<input required type="time" value={draft.starts_at} onChange={event => setDraft(current => ({ ...current, starts_at: event.target.value }))}/></label>
          <label className="studio-field">End time<input required type="time" value={draft.ends_at} onChange={event => setDraft(current => ({ ...current, ends_at: event.target.value }))}/></label>
          <label className="studio-field">Title (optional)<input maxLength={120} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder={draft.subject_name || "Lesson or study activity"}/></label>
          <label className="studio-field">Room / location (optional)<input maxLength={120} value={draft.location} onChange={event => setDraft(current => ({ ...current, location: event.target.value }))} placeholder="e.g. Room 4"/></label>
          <label className="studio-field timetable-wide-field">Notes (optional)<input maxLength={300} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="Anything you need to remember"/></label>
        </div>
        <div className="timetable-form-actions"><button type="button" className="subtle-button" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}><Check size={15}/>{saving ? "Saving…" : editingId ? "Save changes" : "Add to timetable"}</button></div>
      </form>}
      {loading ? <div className="timetable-empty"><RefreshCw size={20}/> Loading your timetable…</div> : visibleEntries.length === 0 ? <div className="timetable-empty"><CalendarDays size={26}/><strong>No {kind === "school" ? "school lessons" : "study sessions"} yet</strong><span>Upload a school timetable in MIΛ Studio or add an entry here. Entries can be edited at any time.</span><button type="button" className="secondary-button" onClick={() => openNew()}><Plus size={15}/> Add the first entry</button></div> : <div className="timetable-week-grid">
        {groupedDays.filter(day => day.items.length > 0).map(day => <section className="timetable-day-card" key={day.index}>
          <div className="timetable-day-heading"><strong>{day.label}</strong><span>{day.items.length} {day.items.length === 1 ? "entry" : "entries"}</span></div>
          {day.items.map(entry => <article className="timetable-entry-card" key={entry.id}>
            <div className="timetable-entry-time"><Clock3 size={14}/><strong>{timeValue(entry.starts_at)}–{timeValue(entry.ends_at)}</strong></div>
            <div className="timetable-entry-copy"><strong>{entry.title}</strong><span>{entry.subject_name || "General study"}{entry.location ? " · " + entry.location : ""}</span>{entry.notes && <small>{entry.notes}</small>}</div>
            <div className="timetable-entry-actions"><button className="icon-button" type="button" onClick={() => openEdit(entry)} aria-label={"Edit " + entry.title}><Pencil size={14}/></button><button className="icon-button danger-text" type="button" onClick={() => void removeEntry(entry)} aria-label={"Remove " + entry.title}><Trash2 size={14}/></button></div>
          </article>)}
          <button type="button" className="timetable-add-day" onClick={() => openNew(day.index)}><Plus size={14}/> Add to {day.label}</button>
        </section>)}
      </div>}
    </section>
    <p className="timetable-footnote">Changes are saved to your StudySpace account and appear here the next time you sign in. Imported timetable entries can also be corrected after review.</p>
  </div>;
}
