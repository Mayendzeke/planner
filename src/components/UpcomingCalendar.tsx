import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Flag, Plus, X } from "lucide-react";
import { plannerDb, type AcademicPeriod, type CalendarEvent, type PlannerTask } from "../data/db";

type NationalDate = { date: string; title: string; note?: string; provisional?: boolean };

// Public dates are preloaded for planning. Movable and substitute dates can change by government notice.
const NATIONAL_DATES: NationalDate[] = [
  { date: "2026-12-25", title: "Christmas Day" },
  { date: "2026-12-26", title: "Boxing Day" },
  { date: "2026-12-28", title: "Incwala observance", note: "Indicative date; confirm the official announcement.", provisional: true },
  { date: "2027-01-01", title: "New Year's Day" },
  { date: "2027-03-26", title: "Good Friday" },
  { date: "2027-03-29", title: "Easter Monday" },
  { date: "2027-04-19", title: "King's Birthday" },
  { date: "2027-04-25", title: "National Flag Day" },
  { date: "2027-04-26", title: "National Flag Day observed", provisional: true },
  { date: "2027-05-01", title: "Workers' Day" },
  { date: "2027-05-03", title: "Workers' Day observed", provisional: true },
  { date: "2027-05-06", title: "Ascension Day" },
  { date: "2027-07-22", title: "Birthday of the late King Sobhuza II" },
  { date: "2027-09-06", title: "Somhlolo / Independence Day" },
  { date: "2027-12-25", title: "Christmas Day" },
  { date: "2027-12-26", title: "Boxing Day" },
  { date: "2027-12-27", title: "Boxing Day observed", provisional: true },
];

type AgendaItem = { id: string; date: string; time?: string; title: string; kind: string; detail?: string; national?: boolean; provisional?: boolean };

function dateLabel(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function UpcomingCalendar({ tasks = [], compact = false }: { tasks?: PlannerTask[]; compact?: boolean }) {
  const [monthOffset, setMonthOffset] = useState(0);\n  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<CalendarEvent["kind"]>("Test");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [savedEvents, savedPeriods] = await Promise.all([plannerDb.events.toArray(), plannerDb.academicPeriods.toArray()]);
    setEvents(savedEvents);
    setPeriods(savedPeriods);
  }
  useEffect(() => { void load(); }, []);

  const items = useMemo(() => {
    const today = new Date();
    const todayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const national: AgendaItem[] = NATIONAL_DATES.filter(item => item.date >= todayKey).map(item => ({ id: "national-" + item.date + item.title, date: item.date, title: item.title, kind: "National holiday", detail: item.note, national: true, provisional: item.provisional }));
    const personal: AgendaItem[] = events.filter(item => item.date >= todayKey).map(item => ({ id: "event-" + item.id, date: item.date, time: item.time, title: item.title, kind: item.kind, detail: item.notes }));
    const deadlines: AgendaItem[] = tasks.filter(item => !item.done && item.dueAt && item.dueAt.slice(0, 10) >= todayKey).map(item => ({ id: "task-" + item.id, date: item.dueAt.slice(0, 10), time: item.dueAt.length > 10 ? item.dueAt.slice(11, 16) : "", title: item.title, kind: item.kind + " deadline" }));
    const academic: AgendaItem[] = periods.filter(item => item.endDate >= todayKey).map(item => ({ id: "period-" + item.id, date: item.startDate < todayKey ? todayKey : item.startDate, title: item.title, kind: item.kind, detail: item.startDate === item.endDate ? undefined : "Until " + dateLabel(item.endDate) }));
    return [...national, ...personal, ...deadlines, ...academic].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));
  }, [events, periods, tasks]);

  const monthCells = useMemo(() => {
    const first = new Date();
    first.setDate(1);
    first.setMonth(first.getMonth() + monthOffset);
    const start = new Date(first);
    start.setDate(1 - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");
      return { key, day, currentMonth: day.getMonth() === first.getMonth(), items: items.filter(item => item.date === key) };
    });
  }, [items, monthOffset]);
  const monthTitle = monthCells[10]?.day.toLocaleDateString(undefined, { month: "long", year: "numeric" }) ?? "";

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean || !date) { setError("Add an event name and date."); return; }
    if (clean.length > 100 || notes.length > 600) { setError("Please shorten the event details."); return; }
    const record: CalendarEvent = { id: Date.now(), title: clean, date, time, kind, notes: notes.trim(), createdAt: new Date().toISOString() };
    try {
      await plannerDb.events.add(record);
      setTitle(""); setDate(""); setTime(""); setNotes(""); setKind("Test"); setError(""); setOpen(false);
      await load();
    } catch { setError("The event could not be saved. Please try again."); }
  }

  async function removeEvent(id: number) {
    if (!window.confirm("Remove this personal event?")) return;
    await plannerDb.events.delete(id);
    await load();
  }

  return <section className={"glass-panel upcoming-calendar " + (compact ? "upcoming-compact" : "")}>
    <div className="section-heading">
      <div><span className="eyebrow"><Flag size={13}/> ESWATINI · NATIONAL CALENDAR</span><h2>Coming up</h2><p>Public holidays, your deadlines, tests and events in one timeline.</p></div>
      <button className="primary-button compact-button" onClick={() => { setOpen(value => !value); setError(""); }}><Plus size={15}/>{open ? "Close" : "Add event"}</button>
    </div>
    {open && <form className="calendar-event-form" onSubmit={event => void save(event)}>
      <label className="field-label">Event name<input autoFocus maxLength={100} required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology mock examination"/></label>
      <div className="form-grid"><label className="field-label">Date<input type="date" required value={date} onChange={e => setDate(e.target.value)}/></label><label className="field-label">Time (optional)<input type="time" value={time} onChange={e => setTime(e.target.value)}/></label><label className="field-label">Type<select value={kind} onChange={e => setKind(e.target.value as CalendarEvent["kind"])}><option>Test</option><option>School event</option><option>Personal</option><option>Other</option></select></label></div>
      <label className="field-label">Notes (optional)<textarea rows={2} maxLength={600} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Room, subject, preparation or other details"/></label>
      {error && <p className="inline-message" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={15}/> Save event</button></div>
    </form>}
    {!open && error && <p className="inline-message" role="alert">{error}</p>}
    {items.length ? <div className="upcoming-list">{items.slice(0, compact ? 6 : 40).map(item => <article className="upcoming-item" key={item.id}>
      <div className={"upcoming-date " + (item.national ? "national-date" : "")}><strong>{new Date(item.date + "T12:00:00").getDate()}</strong><span>{new Date(item.date + "T12:00:00").toLocaleDateString(undefined, { month: "short" })}</span></div>
      <div className="upcoming-copy"><strong>{item.title}</strong><span>{dateLabel(item.date)}{item.time ? " · " + item.time : ""} <i/> {item.kind}</span>{(item.detail || item.provisional) && <small>{item.detail || "Indicative date — check the official government announcement."}</small>}</div>
      {item.id.startsWith("event-") && <button className="icon-button" title="Remove event" aria-label={"Remove " + item.title} onClick={() => void removeEvent(Number(item.id.slice(6)))}><X size={14}/></button>}
    </article>)}</div> : <div className="empty-state"><div className="empty-icon"><CalendarDays size={21}/></div><h3>Your calendar is clear</h3><p>Add tests and events whenever they are announced. National holidays will appear here automatically.</p></div>}
    <p className="calendar-source-note"><Bell size={12}/> National dates are a planning reference. Provisional dates must be confirmed against official government notices.</p>
  </section>;
}
