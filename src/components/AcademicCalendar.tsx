import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2, AlertCircle, CalendarRange } from "lucide-react";
import { plannerDb, type AcademicPeriod } from "../data/db";

const kinds: AcademicPeriod["kind"][] = ["Term", "Holiday", "Examination", "Other"];
const emptyForm = { title: "", kind: "Term" as AcademicPeriod["kind"], startDate: "", endDate: "", notes: "" };

function dateText(value: string) {
  const parsed = new Date(value + "T12:00:00");
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function overlaps(a: Pick<AcademicPeriod, "startDate" | "endDate">, b: Pick<AcademicPeriod, "startDate" | "endDate">) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export default function AcademicCalendar() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const records = await plannerDb.academicPeriods.toArray();
      setPeriods(records.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title)));
      setError("");
    } catch {
      setError("The academic calendar could not be loaded. Check that browser storage is available.");
    }
  }

  useEffect(() => { void load(); }, []);

  const grouped = useMemo(() => kinds.map(kind => ({ kind, items: periods.filter(period => period.kind === kind) })), [periods]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const title = form.title.trim();
    if (!title) { setError("Enter a name for this academic period."); return; }
    if (!form.startDate || !form.endDate) { setError("Choose both a start date and an end date."); return; }
    if (form.endDate < form.startDate) { setError("The end date cannot be earlier than the start date."); return; }
    if (title.length > 100 || form.notes.length > 1000) { setError("Please shorten the title or notes."); return; }
    const duplicate = periods.some(item => item.title.toLocaleLowerCase() === title.toLocaleLowerCase() && item.startDate === form.startDate && item.endDate === form.endDate && item.kind === form.kind);
    if (duplicate) { setError("This academic period already exists."); return; }
    const record: AcademicPeriod = { ...form, title, notes: form.notes.trim(), id: Math.max(Date.now(), ...periods.map(period => period.id + 1)), createdAt: new Date().toISOString() };
    setBusy(true);
    try {
      await plannerDb.academicPeriods.add(record);
      setForm(emptyForm);
      setOpen(false);
      await load();
    } catch {
      setError("The academic period could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(record: AcademicPeriod) {
    if (!window.confirm("Delete “" + record.title + "” from the academic calendar?")) return;
    try {
      await plannerDb.academicPeriods.delete(record.id);
      await load();
    } catch {
      setError("The academic period could not be deleted.");
    }
  }

  return <section className="academic-calendar-stack">
    <section className="glass-panel academic-calendar-intro">
      <div className="academic-calendar-icon"><CalendarRange size={21}/></div>
      <div><h2>Academic year at a glance</h2><p>Record your school terms, holidays and examination periods. Dates are saved on this device and synchronised to your Studyspace account when online.</p></div>
      <button className="primary-button" onClick={() => { setError(""); setOpen(value => !value); }}><Plus size={16}/>{open ? "Close form" : "Add period"}</button>
    </section>

    {error && <div className="alert error-alert" role="alert"><AlertCircle size={16}/>{error}</div>}

    {open && <section className="glass-panel academic-period-form">
      <div className="section-heading"><div><h2>Add an academic period</h2><p>Use the dates shown on your institution's official calendar.</p></div></div>
      <form onSubmit={event => void save(event)}>
        <label className="field-label">Period name<input autoFocus required maxLength={100} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="e.g. Term 1, Mid-year holiday"/></label>
        <div className="form-grid">
          <label className="field-label">Type<select value={form.kind} onChange={event => setForm(current => ({ ...current, kind: event.target.value as AcademicPeriod["kind"] }))}>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>
          <label className="field-label">Start date<input type="date" required value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))}/></label>
          <label className="field-label">End date<input type="date" required min={form.startDate || undefined} value={form.endDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))}/></label>
        </div>
        <label className="field-label">Notes (optional)<textarea rows={2} maxLength={1000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Add details, dates or reminders"/></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setOpen(false); setForm(emptyForm); }}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save period"}</button></div>
      </form>
    </section>}

    {periods.length === 0 ? <section className="glass-panel academic-empty"><div className="empty-icon"><CalendarDays size={22}/></div><h3>Your academic calendar is ready</h3><p>Add the dates for your terms, holidays and examinations. You can change them whenever your institution updates its calendar.</p><button className="secondary-button" onClick={() => setOpen(true)}><Plus size={15}/> Add your first period</button></section> :
      grouped.filter(group => group.items.length > 0).map(group => <section className="glass-panel academic-period-group" key={group.kind}>
        <div className="section-heading"><div><h2>{group.kind}s</h2><p>{group.items.length} period{group.items.length === 1 ? "" : "s"} recorded</p></div></div>
        <div className="academic-period-list">{group.items.map(item => {
          const hasOverlap = periods.some(other => other.id !== item.id && overlaps(item, other) && (item.kind === "Term" || other.kind === "Term"));
          return <article className="academic-period-row" key={item.id}><div className={"academic-period-marker period-"+item.kind.toLowerCase()}/><div className="academic-period-copy"><strong>{item.title}</strong><span>{dateText(item.startDate)} – {dateText(item.endDate)}</span>{item.notes && <p>{item.notes}</p>}{hasOverlap && <small className="academic-overlap-note">Overlaps another recorded term or period; check your dates.</small>}</div><button className="icon-button" aria-label={"Delete "+item.title} title="Delete period" onClick={() => void remove(item)}><Trash2 size={15}/></button></article>;
        })}</div>
      </section>)}
    <p className="academic-calendar-footnote">Calendar dates are planning records only. They do not automatically change assignment deadlines or send notifications.</p>
  </section>;
}
