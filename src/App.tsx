import { useEffect, useMemo, useState } from "react";
import { plannerDb, type PlannerTask } from "./data/db";
import {
  AlarmClock, ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays,
  Check, ChevronDown, CircleHelp, Clock3, Flame, GraduationCap,
  LayoutDashboard, Menu, MoreHorizontal, Plus, Search, Settings2,
  Sparkles, Target, TrendingUp, X
} from "lucide-react";

type Task = PlannerTask;

const initialTasks: Task[] = [
  { id: 1, title: "Revise quadratic equations", subject: "Mathematics", due: "Today · 14:00", minutes: 35, priority: "High", done: false },
  { id: 2, title: "Read chapter 4 notes", subject: "English", due: "Today · 16:30", minutes: 25, priority: "Medium", done: false },
  { id: 3, title: "Practice past paper questions", subject: "Mathematics", due: "Tomorrow", minutes: 45, priority: "High", done: false }
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My subjects", icon: BookOpen },
  { label: "Study planner", icon: CalendarDays },
  { label: "Progress", icon: TrendingUp }
];

function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("Mathematics");
  const [taskDue, setTaskDue] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");

  const completed = tasks.filter((task) => task.done).length;
  useEffect(() => {
    let cancelled = false;
    async function loadTasks() {
      try {
        const saved = await plannerDb.tasks.toArray();
        if (cancelled) return;
        if (saved.length) {
          setTasks(saved);
        } else {
          await plannerDb.tasks.bulkPut(initialTasks);
          if (!cancelled) setTasks(initialTasks);
        }
      } catch {
        if (!cancelled) setStorageError(true);
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    }
    void loadTasks();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!storageReady || storageError) return;
    void plannerDb.tasks.bulkPut(tasks).catch(() => setStorageError(true));
  }, [tasks, storageReady, storageError]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => `${task.title} ${task.subject}`.toLowerCase().includes(query.toLowerCase())),
    [tasks, query]
  );

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setTasks((current) => [...current, {
      id: Date.now(), title: taskTitle.trim(), subject: taskSubject,
      due: taskDue || "No deadline set", minutes: 30, priority: "Medium", done: false
    }]);
    setTaskTitle("");
    setTaskDue("");
    setShowTaskForm(false);
  }

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className={`sidebar glass-panel ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={22} strokeWidth={2.2} /></div>
          <div><span className="brand-name">studyspace<span className="brand-dot">.</span></span><span className="brand-subtitle">YOUR LEARNING COMPANION</span></div>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileMenu(false)}><X size={18} /></button>
        </div>
        <div className="profile-card">
          <div className="avatar">S</div>
          <div className="profile-copy"><strong>Student workspace</strong><span>Secondary school</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setMobileMenu(false); }}>
              <Icon size={18} /><span>{label}</span>{label === "Study planner" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card">
            <div className="streak-icon"><Flame size={18} /></div>
            <div><strong>Build your streak</strong><p>Study a little every day.</p></div>
            <ArrowUpRight size={15} className="muted-icon" />
          </div>
          <button className="nav-item settings-link" onClick={() => setActiveNav("Settings")}><Settings2 size={18} /><span>Settings</span></button>
          <div className="offline-status"><span className="status-dot" /> {storageError ? "Local storage unavailable" : storageReady ? "Saved on this device" : "Loading local workspace"}</div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation overlay" onClick={() => setMobileMenu(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your tasks..." aria-label="Search tasks" /><kbd>⌘ K</kbd></label>
            <button className="help-button" aria-label="Help"><CircleHelp size={18} /></button>
            <div className="top-avatar" aria-label="Student profile">S</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> YOUR PERSONAL STUDY SPACE</div>
              <h1>{activeNav === "Overview" ? "Make today count." : activeNav}</h1>
              <p className="welcome-subtitle">{activeNav === "Overview" ? "Small steps today. Big progress tomorrow." : "Keep your learning organised, one step at a time."}</p>
            </div>
            <button className="primary-button" onClick={() => setShowTaskForm(true)}><Plus size={17} /> Add a task</button>
          </section>

          {activeNav === "Settings" ? (
            <section className="glass-panel placeholder-panel"><Settings2 size={26} /><h2>Workspace settings</h2><p>Profile, preferences, backups and privacy controls will live here.</p><span className="feature-chip">Planned feature</span></section>
          ) : activeNav === "My subjects" ? (
            <section className="subject-grid">
              <div className="subject-card glass-panel math-card"><div className="subject-icon blue"><span>∑</span></div><span className="subject-tag">CORE SUBJECT</span><h3>Mathematics</h3><p>Equations, functions &amp; more</p><div className="subject-progress"><span><i style={{ width: "62%" }} /></span><b>62%</b></div></div>
              <div className="subject-card glass-panel english-card"><div className="subject-icon mint"><BookOpen size={21} /></div><span className="subject-tag">CORE SUBJECT</span><h3>English</h3><p>Reading, writing &amp; language</p><div className="subject-progress"><span><i style={{ width: "48%" }} /></span><b>48%</b></div></div>
              <button className="add-subject-card glass-panel" onClick={() => setShowTaskForm(true)}><span><Plus size={22} /></span><strong>Keep building</strong><small>Add a task to get started</small></button>
            </section>
          ) : activeNav === "Progress" ? (
            <section className="glass-panel progress-detail"><div className="section-heading"><div><h2>Your progress</h2><p>Every focused session moves you forward.</p></div><TrendingUp size={22} /></div><div className="progress-large"><strong>{completed} <span>/ {tasks.length}</span></strong><p>Tasks completed in this workspace</p><div className="progress-track"><span style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /></div></div><p className="subtle-note">Your progress will become more meaningful as you add subjects, sessions and assessment results.</p></section>
          ) : activeNav === "Study planner" ? (
            <section className="glass-panel planner-panel"><div className="section-heading"><div><h2>Your upcoming study plan</h2><p>Priority tasks stay visible, even when your week gets busy.</p></div><CalendarDays size={22} /></div><TaskList tasks={visibleTasks} onToggle={toggleTask} /></section>
          ) : (
            <>
              <section className="stats-grid">
                <div className="stat-card glass-panel"><div className="stat-top"><span className="stat-label">WEEKLY STUDY GOAL</span><span className="stat-icon mint-icon"><Target size={17} /></span></div><div className="stat-value">6.0 <span>/ 8 hrs</span></div><div className="stat-foot"><div className="mini-track"><span style={{ width: "75%" }} /></div><span className="positive-text">75%</span></div><p className="stat-note">You're building momentum</p></div>
                <div className="stat-card glass-panel"><div className="stat-top"><span className="stat-label">TASKS TO FOCUS ON</span><span className="stat-icon violet-icon"><AlarmClock size={17} /></span></div><div className="stat-value">{tasks.filter((task) => !task.done).length.toString().padStart(2, "0")} <span>remaining</span></div><div className="stat-foot"><span className="priority-dot" /> <span className="stat-caption">Prioritise what matters most</span></div><p className="stat-note">Your next step is ready</p></div>
                <div className="stat-card glass-panel"><div className="stat-top"><span className="stat-label">TOPIC MASTERY</span><span className="stat-icon blue-icon"><BookOpen size={17} /></span></div><div className="stat-value">4 <span>of 7 topics</span></div><div className="stat-foot"><div className="mini-track"><span style={{ width: "57%" }} /></div><span className="positive-text">57%</span></div><p className="stat-note">Keep your revision consistent</p></div>
              </section>

              <section className="dashboard-grid">
                <div className="glass-panel focus-panel">
                  <div className="section-heading"><div><h2>Today's focus</h2><p>A clear plan beats a perfect plan.</p></div><button className="icon-button" aria-label="More focus options"><MoreHorizontal size={20} /></button></div>
                  <div className="focus-banner"><div className="focus-banner-icon"><Sparkles size={19} /></div><div><strong>Start with your highest priority</strong><p>One focused session at a time. You've got this.</p></div></div>
                  <TaskList tasks={visibleTasks.slice(0, 3)} onToggle={toggleTask} />
                  <button className="text-button" onClick={() => setActiveNav("Study planner")}>View full study plan <ArrowDownRight size={15} /></button>
                </div>
                <div className="glass-panel week-panel">
                  <div className="section-heading"><div><h2>This week</h2><p>Your study rhythm at a glance</p></div><button className="icon-button" aria-label="Weekly options"><MoreHorizontal size={20} /></button></div>
                  <div className="week-summary"><div><strong>6h 00m</strong><span>study time logged</span></div><span className="week-trend"><ArrowUpRight size={14} /> 12%</span></div>
                  <div className="chart" role="img" aria-label="Illustrative weekly study activity chart"><div className="chart-grid"><span /><span /><span /><span /></div>{[{d:"M",h:35},{d:"T",h:54},{d:"W",h:28},{d:"T",h:75},{d:"F",h:43},{d:"S",h:92},{d:"S",h:62}].map((day, index) => <div className="bar-column" key={index}><div className={`bar ${index === 5 ? "bar-highlight" : ""}`} style={{ height: `${day.h}%` }} /><span>{day.d}</span></div>)}</div>
                  <div className="next-session"><div className="session-icon"><Clock3 size={17} /></div><div><span>NEXT STUDY SESSION</span><strong>Mathematics · Algebra</strong><small>Saturday · 09:00–09:45</small></div><span className="session-arrow">↗</span></div>
                </div>
              </section>
              <section className="bottom-note"><div className="note-icon"><Check size={15} /></div><p><strong>Your space, your pace.</strong> This preview uses sample information. Your own subjects, deadlines and progress will be stored locally as features are built.</p><span className="note-pill">FOUNDATION PREVIEW</span></section>
            </>
          )}
          <footer className="page-footer"><span>STUDYSPACE <span className="footer-dot">●</span> BUILT FOR YOUR NEXT STEP</span><span><span className="status-dot" /> Local-first by design</span></footer>
        </div>
      </main>

      {showTaskForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTaskForm(false); }}><section className="task-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-heading"><div><span className="eyebrow">MAKE IT HAPPEN</span><h2 id="task-modal-title">Add a study task</h2></div><button className="icon-button" aria-label="Close form" onClick={() => setShowTaskForm(false)}><X size={19} /></button></div><form onSubmit={addTask}><label className="field-label">What do you need to work on?<input autoFocus required value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Revise linear equations" /></label><label className="field-label">Subject<select value={taskSubject} onChange={(event) => setTaskSubject(event.target.value)}><option>Mathematics</option><option>English</option><option>Science</option><option>History</option><option>Other</option></select></label><label className="field-label">Deadline (optional)<input type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value ? new Date(event.target.value).toLocaleString() : "")} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowTaskForm(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Add task</button></div></form><p className="privacy-hint"><span className="status-dot" /> Tasks are saved in this browser on this device. Backups will be added before release.</p></section></div>}
    </div>
  );
}

function TaskList({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: number) => void }) {
  if (!tasks.length) return <div className="empty-state"><Search size={19} /><span>No matching tasks. Try another search.</span></div>;
  return <div className="task-list">{tasks.map((task) => <div className={`task-row ${task.done ? "task-done" : ""}`} key={task.id}><button className={`task-check ${task.done ? "checked" : ""}`} aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} onClick={() => onToggle(task.id)}>{task.done && <Check size={13} />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.subject} <i /> <Clock3 size={12} /> {task.minutes} min</span></div><div className="task-meta"><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><span className="task-due">{task.due}</span></div></div>)}</div>;
}

export default App;
