import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock, ArrowDownRight, BookOpen, CalendarDays, Check, Cloud, RefreshCw,
  ChevronRight, CircleHelp, Clock3, Download, GraduationCap, ClipboardList, LayoutDashboard, LockKeyhole,
  Menu, Moon, Plus, Search, Settings2, Sparkles, Sun, Target,
  Trash2, TrendingUp, Upload, X, Flame
} from "lucide-react";
import { plannerDb, setPlannerDbUser, type PlannerTask, type Subject, type StudySession } from "./data/db";
import { setStudentStorageOwner, studentStorageKey } from "./lib/studentStorage";
import { syncStudentWorkspace } from "./lib/cloudSync";
import StudentOnboarding, { type StudentProfile } from "./components/StudentOnboarding";
import StudentAccess from "./components/StudentAccess";
import StudentLibrary from "./components/StudentLibrary";
import AcademicCalendar from "./components/AcademicCalendar";
import UpcomingCalendar from "./components/UpcomingCalendar";
import StudyReminders from "./components/StudyReminders";
import SubjectManager from "./components/SubjectManager";
import WeeklyTest from "./components/WeeklyTest";
import TodaySession from "./components/TodaySession";
import StudentFeedback from "./components/StudentFeedback";
import MiaChat from "./components/MiaChat";
import { supabase } from "./lib/supabase";

type Page = "Overview" | "Today's Session" | "Subjects" | "Planner" | "Study & Exams" | "MIΛ Studio" | "My Library" | "Academic Calendar" | "Progress" | "Settings";
type TaskForm = { title: string; subjectId: string; dueAt: string; minutes: string; priority: PlannerTask["priority"]; kind: PlannerTask["kind"]; notes: string };
const blankTask: TaskForm = { title: "", subjectId: "", dueAt: "", minutes: "30", priority: "Medium", kind: "Study", notes: "" };
const colors = ["#7c9cff", "#6bd7bd", "#c4a4ff", "#f2bd70", "#f28ca6", "#77c8ed"];
const pages: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard }, { name: "Today's Session", icon: Sparkles }, { name: "Subjects", icon: BookOpen },
  { name: "Planner", icon: CalendarDays }, { name: "Study & Exams", icon: GraduationCap }, { name: "MIΛ Studio", icon: Sparkles }, { name: "My Library", icon: BookOpen }, { name: "Academic Calendar", icon: CalendarDays }, { name: "Progress", icon: TrendingUp }
];
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const localDay = (value: string) => { const d = new Date(value); if (Number.isNaN(d.getTime())) return ""; return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const dateLabel = (value: string) => {
  if (!value) return "No deadline";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No deadline";
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const today = todayISO();
  const day = localDay(value);
  if (day === today) return "Today" + (value.length > 10 ? " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === (() => { const x = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); })()) return "Tomorrow";
  return date + (value.length > 10 ? " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
};
const dueValue = (value: string) => value ? new Date(value).toISOString() : "";
const downloadJson = (filename: string, value: unknown) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [cloudAuthReady, setCloudAuthReady] = useState(!supabase);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const cloudAuthenticated = Boolean(cloudUserId);
  const [profileOwnerId, setProfileOwnerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return localStorage.getItem("studyspace-theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
  });
  const [goal, setGoal] = useState(8);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [plannerMode, setPlannerMode] = useState<"list" | "week">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [taskOpen, setTaskOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(blankTask);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState(colors[0]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [miaOpen, setMiaOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"checking" | "syncing" | "synced" | "offline" | "error">("checking");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncRequested, setSyncRequested] = useState(0);
  const suppressCloudSyncRef = useRef(false);
  // The fixed app shell owns its scroll position. Reset only that surface when
  // changing tabs; do not alter document scroll restoration or window scroll.
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>(".app-shell > .main-area");
    if (main) main.scrollTop = 0;
  }, [page]);


  useEffect(() => {
    if (!supabase) { setCloudAuthReady(true); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setCloudUserId(data.session?.user.id ?? null);
      setCloudAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) suppressCloudSyncRef.current = false;
      setCloudUserId(session?.user.id ?? null);
      setCloudAuthReady(true);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  // Restore the cloud profile when a student signs in on a new device.
  // The local profile remains a fast cache, not the only copy of account setup.
  useEffect(() => {
    if (!cloudUserId) {
      setProfile(null);
      setProfileOwnerId(null);
      return;
    }
    let alive = true;
    setProfileOwnerId(null);
    const loadProfile = async () => {
      const key = "studyspace-profile:" + cloudUserId;
      let cached: StudentProfile | null = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StudentProfile>;
          if (parsed && typeof parsed.fullName === "string" && typeof parsed.preferredName === "string"
            && Array.isArray(parsed.subjects) && Array.isArray(parsed.preferredDays)) {
            cached = parsed as StudentProfile;
          }
        }
      } catch {
        cached = null;
      }

      try {
        if (!supabase) throw new Error("Studyspace is not connected.");
        // Always refresh from the cloud when online. A local cache must not
        // silently overwrite profile changes made on another signed-in device.
        const [profileResult, goalResult, subjectsResult] = await Promise.all([
          supabase.from("profiles").select("full_name,preferred_name,country,institution,education_level,grade,curriculum,academic_year").eq("id", cloudUserId).single(),
          supabase.from("student_goals").select("goal_text,target_mark,weekly_hours,preferred_days").eq("learner_id", cloudUserId).maybeSingle(),
          supabase.from("student_subjects").select("name").eq("learner_id", cloudUserId).order("name"),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (goalResult.error) throw goalResult.error;
        if (subjectsResult.error) throw subjectsResult.error;
        const cloud = profileResult.data;
        const goalData = goalResult.data;
        const fullName = String(cloud.full_name || "");
        const preferredName = String(cloud.preferred_name || "");
        if (!fullName.trim() && !preferredName.trim()) {
          if (alive) {
            setProfile(null);
            setProfileOwnerId(cloudUserId);
            setError("");
          }
          return;
        }
        const restored: StudentProfile = {
          fullName,
          preferredName,
          country: String(cloud.country || ""),
          institution: String(cloud.institution || ""),
          level: String(cloud.education_level || "Secondary school"),
          grade: String(cloud.grade || ""),
          curriculum: String(cloud.curriculum || "Other / Not sure"),
          academicYear: String(cloud.academic_year || new Date().getFullYear()),
          termCount: cached?.termCount || "3",
          goals: String(goalData?.goal_text || "Improve my marks"),
          targetMark: String(goalData?.target_mark ?? 75),
          weeklyHours: String(goalData?.weekly_hours ?? 6),
          preferredDays: Array.isArray(goalData?.preferred_days) ? goalData.preferred_days.filter((day: unknown): day is string => typeof day === "string") : ["Saturday", "Sunday"],
          subjects: (subjectsResult.data || []).map(item => String(item.name)).filter(Boolean),
        };
        if (alive) {
          localStorage.setItem(key, JSON.stringify(restored));
          setProfile(restored);
          setProfileOwnerId(cloudUserId);
          setError("");
        }
      } catch (reason) {
        if (!alive) return;
        if (cached) {
          setProfile(cached);
          setProfileOwnerId(cloudUserId);
          setError(reason instanceof Error
            ? "Using your saved offline profile. Cloud refresh failed: " + reason.message
            : "Using your saved offline profile. Cloud refresh failed; your local copy is retained.");
        } else {
          setProfile(null);
          setProfileOwnerId(cloudUserId);
          setError(reason instanceof Error ? "Your cloud profile could not be restored: " + reason.message : "Your cloud profile could not be restored. Check your connection.");
        }
      }
    };
    void loadProfile();
    return () => { alive = false; };
  }, [cloudUserId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("studyspace-theme", theme); } catch { /* Theme still works for this session. */ }
  }, [theme]);

  useEffect(() => {
    if (!mobileMenu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenu(false); };
    const closeOnBack = () => setMobileMenu(false);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("popstate", closeOnBack);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("popstate", closeOnBack);
    };
  }, [mobileMenu]);

  useEffect(() => {
    const handleLocalDataUpdated = () => {
      void refresh();
      setSyncRequested(value => value + 1);
    };
    window.addEventListener("studyspace-local-data-updated", handleLocalDataUpdated);
    return () => window.removeEventListener("studyspace-local-data-updated", handleLocalDataUpdated);
  }, []);

  async function refresh() {
    try {
      const [s, t, l] = await Promise.all([plannerDb.subjects.toArray(), plannerDb.tasks.toArray(), plannerDb.sessions.toArray()]);
      setSubjects(s.sort((a,b) => a.name.localeCompare(b.name)));
      setTasks(t.sort((a,b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999")));
      setSessions(l.sort((a,b) => b.date.localeCompare(a.date)));
      setError("");
    } catch { setError("Your browser could not open local storage. Try a current browser with site storage enabled."); }
    finally { setReady(true); }
  }
  useEffect(() => {
    // Switch storage before loading records. Both IndexedDB and localStorage
    // are partitioned by the authenticated student on shared devices.
    setReady(false);
    setSubjects([]);
    setTasks([]);
    setSessions([]);
    setPlannerDbUser(cloudUserId);
    setStudentStorageOwner(cloudUserId);
    try {
      const savedGoal = Number(localStorage.getItem(studentStorageKey("studyspace-weekly-goal")));
      setGoal(Number.isFinite(savedGoal) && savedGoal >= 1 && savedGoal <= 168 ? savedGoal : 8);
    } catch {
      setGoal(8);
    }
    if (!cloudUserId) {
      setReady(true);
      return;
    }
    void refresh();
  }, [cloudUserId]);

  // Sync on workspace open, reconnect, tab return and while the app is active.
  // IndexedDB remains the offline cache; Supabase provides cross-device data.
  useEffect(() => {
    if (!cloudUserId || profileOwnerId !== cloudUserId || !profile || !ready) {
      if (!cloudUserId) setSyncStatus("checking");
      return;
    }
    let alive = true;
    let inFlight = false;
    const runSync = async () => {
      if (inFlight || !alive || suppressCloudSyncRef.current) return;
      if (!navigator.onLine) {
        setSyncStatus("offline");
        setSyncMessage("Your changes are saved on this device and will sync when you reconnect.");
        return;
      }
      inFlight = true;
      setSyncStatus("syncing");
      setSyncMessage("Synchronising subjects, tasks, study history, calendar and personal files…");
      try {
        const result = await syncStudentWorkspace(cloudUserId, profile, goal);
        if (!alive) return;
        setSyncStatus("synced");
        setSyncMessage(result.uploaded || result.downloaded || result.deleted
          ? "Studyspace is up to date. " + result.uploaded + " uploaded, " + result.downloaded + " downloaded, " + result.deleted + " deletion(s) applied."
          : "Studyspace is up to date on this device and your other signed-in devices.");
        setLastSyncAt(result.syncedAt);
        if (typeof result.weeklyHours === "number" && result.weeklyHours !== goal) setGoal(result.weeklyHours);
        if (result.reminderSettings) {
          const reminderKey = studentStorageKey("studyspace-study-reminders");
          if (localStorage.getItem(reminderKey) === null) {
            localStorage.setItem(reminderKey, JSON.stringify(result.reminderSettings));
          }
          // The sync engine may already have written the cloud value to storage.
          // Notify the mounted reminder control in either case.
          window.dispatchEvent(new Event("studyspace-cloud-preferences-updated"));
        }
        await refresh();
      } catch (reason) {
        if (!alive) return;
        setSyncStatus("error");
        setSyncMessage(reason instanceof Error ? reason.message : "Cloud synchronisation failed. Your device copy has been retained.");
      } finally {
        inFlight = false;
      }
    };
    void runSync();
    const interval = window.setInterval(() => void runSync(), 60000);
    const onOnline = () => void runSync();
    const onVisibility = () => { if (document.visibilityState === "visible") void runSync(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cloudUserId, profileOwnerId, profile, ready, goal, syncRequested]);


  async function finishOnboarding(nextProfile: StudentProfile) {
    try {
      if (!supabase) throw new Error("Studyspace is not connected. Reconnect and sign in again.");
      const { data: authState, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !authState.session) throw new Error("Your secure session has expired. Sign in again before completing setup.");
      {
          const { error: profileError } = await supabase.rpc("update_studyspace_learner_profile", {
            p_full_name: nextProfile.fullName,
            p_preferred_name: nextProfile.preferredName,
            p_country: nextProfile.country,
            p_institution: nextProfile.institution,
            p_education_level: nextProfile.level,
            p_grade: nextProfile.grade,
            p_curriculum: nextProfile.curriculum,
            p_academic_year: nextProfile.academicYear
          });
          if (profileError) throw new Error("Your cloud profile could not be saved: " + profileError.message);
          if (nextProfile.subjects.length) {
            const { error: subjectsError } = await supabase.from("student_subjects").upsert(
              nextProfile.subjects.map(name => ({ learner_id: authState.session!.user.id, name })),
              { onConflict: "learner_id,name", ignoreDuplicates: true }
            );
            if (subjectsError) throw new Error("Your cloud profile was saved, but subjects could not be synced: " + subjectsError.message);
          }
      }
      localStorage.setItem("studyspace-profile:" + authState.session.user.id, JSON.stringify(nextProfile));
      setProfile(nextProfile);
      const existing = await plannerDb.subjects.toArray();
      const names = new Set(existing.map(subject => subject.name.toLocaleLowerCase()));
      const additions = nextProfile.subjects.filter(name => !names.has(name.toLocaleLowerCase()));
      if (additions.length) await plannerDb.subjects.bulkAdd(additions.map((name, index) => ({ id: Date.now() + index, name, color: colors[index % colors.length], createdAt: new Date().toISOString() })));
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your profile could not be saved. Check your connection and try again."); }
  }

  const subjectById = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const openTasks = tasks.filter(t => !t.done);
  const completedTasks = tasks.filter(t => t.done);
  const today = todayISO();
  const dueToday = openTasks.filter(t => t.dueAt && localDay(t.dueAt) === today);
  const overdue = openTasks.filter(t => t.dueAt && localDay(t.dueAt) < today);
  const totalMinutes = sessions.reduce((n,s) => n + s.minutes, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
  const weekSessions = sessions.filter(s => new Date(s.date) >= weekStart);
  const weekMinutes = weekSessions.reduce((n,s) => n + s.minutes, 0);
  const weeklyHours = weekMinutes / 60;
  const visibleTasks = tasks.filter(t => {
    const sub = subjectById.get(t.subjectId ?? -1)?.name ?? "";
    const matches = (t.title + " " + sub + " " + t.kind + " " + t.notes).toLowerCase().includes(search.toLowerCase());
    const state = filter === "All" || (filter === "Open" && !t.done) || (filter === "Completed" && t.done) || (filter === "Overdue" && !t.done && !!t.dueAt && localDay(t.dueAt) < today);
    return matches && state;
  });

  function openNewTask(date?: string) { setEditingTask(null); setTaskForm({...blankTask, dueAt: date ? date+"T09:00" : ""}); setTaskOpen(true); }
  function openEditTask(t: PlannerTask) {
    setEditingTask(t.id);
    setTaskForm({ title:t.title, subjectId:t.subjectId == null ? "" : String(t.subjectId), dueAt:t.dueAt ? (() => { const d = new Date(t.dueAt); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); })() : "", minutes:String(t.minutes), priority:t.priority, kind:t.kind, notes:t.notes });
    setTaskOpen(true);
  }
  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    const title = taskForm.title.trim(); if (!title) return;
    const minutes = Math.max(5, Math.min(1440, Number(taskForm.minutes) || 30));
    const existing = editingTask == null ? null : tasks.find(t => t.id === editingTask);
    const task: PlannerTask = { id: editingTask ?? Date.now(), title, subjectId: taskForm.subjectId ? Number(taskForm.subjectId) : null, dueAt: dueValue(taskForm.dueAt), minutes, priority:taskForm.priority, kind:taskForm.kind, notes:taskForm.notes.trim(), done:existing?.done ?? false, createdAt:existing?.createdAt ?? new Date().toISOString(), completedAt:existing?.completedAt ?? null };
    try { await plannerDb.tasks.put(task); setTaskOpen(false); await refresh(); } catch { setError("The task could not be saved. Check available device storage."); }
  }
  async function toggleTask(t: PlannerTask) {
    const done = !t.done;
    try { await plannerDb.tasks.put({ ...t, done, completedAt: done ? new Date().toISOString() : null }); await refresh(); }
    catch { setError("The task status could not be saved."); }
  }
  async function deleteTask(id: number) {
    if (!window.confirm("Delete this task permanently from this device?")) return;
    await plannerDb.tasks.delete(id); await refresh();
  }
  async function addSubject(e: React.FormEvent) {
    e.preventDefault(); const name = subjectName.trim();
    if (!name || subjects.some(s => s.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    try { await plannerDb.subjects.add({ id:Date.now(), name, color:subjectColor, createdAt:new Date().toISOString() }); setSubjectName(""); setSubjectOpen(false); await refresh(); }
    catch { setError("The subject could not be saved."); }
  }
  async function logSession(subjectId: number | null, minutes: number) {
    try { await plannerDb.sessions.add({ id:Date.now(), subjectId, date:new Date().toISOString(), minutes, notes:"" }); await refresh(); }
    catch { setError("The study session could not be saved."); }
  }
  async function exportData() {
    try {
      const [academicPeriods, events] = await Promise.all([plannerDb.academicPeriods.toArray(), plannerDb.events.toArray()]);
      const sessionWorkspace = (() => { try { return JSON.parse(localStorage.getItem(studentStorageKey("studyspace-current-session-v1")) || "null"); } catch { return null; } })();
      const data = { format:"Studyspace backup", version:5, exportedAt:new Date().toISOString(), profile, goal, subjects, tasks, sessions, academicPeriods, events, sessionWorkspace };
      downloadJson("studyspace-backup-" + today + ".json", data);
      setImportMessage("Studyspace backup exported successfully. Personal library files are kept in your secure cloud library and are not included in this JSON file.");
    } catch (reason) {
      setImportMessage(reason instanceof Error ? "Backup export failed: " + reason.message : "Backup export failed. Check device storage and try again.");
    }
  }
  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (raw?.format !== "Studyspace backup" || ![1, 2, 3, 4, 5].includes(raw?.version) || !Array.isArray(raw.subjects) || !Array.isArray(raw.tasks) || !Array.isArray(raw.sessions) || (raw.version >= 2 && !Array.isArray(raw.academicPeriods)) || (raw.version >= 3 && !Array.isArray(raw.events))) throw new Error("This is not a valid Studyspace backup.");
      const validSubjects = raw.subjects.every((s: any) => Number.isSafeInteger(s?.id) && typeof s?.name === "string" && s.name.trim().length > 0 && typeof s?.color === "string" && typeof s?.createdAt === "string" && (s.code === undefined || (typeof s.code === "string" && s.code.length <= 20)) && (s.description === undefined || (typeof s.description === "string" && s.description.length <= 500)) && (s.category === undefined || (typeof s.category === "string" && ["Core","Elective","Language","Science","Humanities","Technical / Vocational","Other"].includes(s.category))) && (s.targetMark === undefined || (Number.isInteger(s.targetMark) && s.targetMark >= 0 && s.targetMark <= 100)) && (s.periodIds === undefined || (Array.isArray(s.periodIds) && s.periodIds.every((id: unknown) => Number.isSafeInteger(id)) && new Set(s.periodIds).size === s.periodIds.length)));
      const validTasks = raw.tasks.every((t: any) => Number.isFinite(t?.id) && typeof t?.title === "string" && (t?.subjectId === null || Number.isFinite(t?.subjectId)) && typeof t?.dueAt === "string" && Number.isFinite(t?.minutes) && ["High","Medium","Low"].includes(t?.priority) && ["Study","Assignment","Exam","Reading","Other"].includes(t?.kind) && typeof t?.notes === "string" && typeof t?.done === "boolean" && typeof t?.createdAt === "string" && (t?.completedAt === null || typeof t?.completedAt === "string"));
      const validSessions = raw.sessions.every((s: any) => Number.isFinite(s?.id) && (s?.subjectId === null || Number.isFinite(s?.subjectId)) && typeof s?.date === "string" && !Number.isNaN(Date.parse(s.date)) && Number.isFinite(s?.minutes) && s.minutes > 0 && typeof s?.notes === "string");
      const academicPeriods = raw.version >= 2 ? raw.academicPeriods : [];
      const events = raw.version >= 3 ? raw.events : [];
      const validGoal = raw.version < 5 || (Number.isInteger(raw.goal) && raw.goal >= 1 && raw.goal <= 168);
      const validProfile = raw.profile === undefined || (raw.profile && typeof raw.profile.fullName === "string" && typeof raw.profile.preferredName === "string" && typeof raw.profile.country === "string" && typeof raw.profile.institution === "string" && typeof raw.profile.level === "string" && typeof raw.profile.grade === "string" && typeof raw.profile.curriculum === "string" && typeof raw.profile.academicYear === "string" && typeof raw.profile.termCount === "string" && typeof raw.profile.goals === "string" && typeof raw.profile.targetMark === "string" && typeof raw.profile.weeklyHours === "string" && Array.isArray(raw.profile.preferredDays) && raw.profile.preferredDays.every((day: unknown) => typeof day === "string") && Array.isArray(raw.profile.subjects) && raw.profile.subjects.every((subject: unknown) => typeof subject === "string"));
      const validEvents = events.every((event: any) => Number.isSafeInteger(event?.id) && typeof event?.title === "string" && event.title.trim().length > 0 && typeof event?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeof event?.time === "string" && ["Test","School event","Personal","Other"].includes(event?.kind) && typeof event?.notes === "string" && typeof event?.createdAt === "string" && !Number.isNaN(Date.parse(event.createdAt)));
      const validAcademicPeriods = academicPeriods.every((p: any) => Number.isSafeInteger(p?.id) && typeof p?.title === "string" && p.title.trim().length > 0 && ["Term","Holiday","Examination","Other"].includes(p?.kind) && typeof p?.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.startDate) && typeof p?.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.endDate) && p.endDate >= p.startDate && typeof p?.notes === "string" && typeof p?.createdAt === "string" && !Number.isNaN(Date.parse(p.createdAt)));
      const subjectIds = new Set(raw.subjects.map((s: any) => s.id));
      const periodIds = new Set(academicPeriods.map((p: any) => p.id));
      const linkedRecordsValid = raw.tasks.every((t: any) => t.subjectId === null || subjectIds.has(t.subjectId)) && raw.sessions.every((s: any) => s.subjectId === null || subjectIds.has(s.subjectId)) && raw.subjects.every((s: any) => (s.periodIds ?? []).every((id: number) => periodIds.has(id)));
      if (!validGoal || !validProfile || !validSubjects || !validTasks || !validSessions || !validAcademicPeriods || !validEvents || !linkedRecordsValid) throw new Error("The backup contains invalid, incomplete or incorrectly linked records. Nothing was changed.");
      if (!window.confirm("Import this backup and replace all Studyspace data on this device? Export a backup first if you need the current data.")) { e.target.value = ""; return; }
      let restoreProfileKey: string | null = null;
      if (raw.profile) {
        if (!supabase) throw new Error("Studyspace is not connected. Sign in again before restoring a profile.");
        const { data: sessionState, error: sessionError } = await supabase.auth.getSession();
        const userId = sessionState.session?.user.id;
        if (sessionError || !userId) throw new Error("Your secure session has expired. Sign in again before restoring this profile.");
        restoreProfileKey = "studyspace-profile:" + userId;
      }
      const storageChanges: { key: string; value: string | null }[] = [];
      if (restoreProfileKey && raw.profile) storageChanges.push({key:restoreProfileKey,value:JSON.stringify(raw.profile)});
      if (raw.version >= 4) storageChanges.push({
        key:studentStorageKey("studyspace-current-session-v1"),
        value:raw.sessionWorkspace && typeof raw.sessionWorkspace === "object" && !Array.isArray(raw.sessionWorkspace) ? JSON.stringify(raw.sessionWorkspace) : null,
      });
      storageChanges.push({key:studentStorageKey("studyspace-weekly-goal"),value:String(raw.version >= 5 ? raw.goal : 8)});
      storageChanges.push({key:studentStorageKey("studyspace-weekly-goal-updated-at"),value:new Date().toISOString()});
      const previousStorage = new Map<string,string|null>();
      const rollbackStorage = () => {
        for (const [key,value] of previousStorage) {
          try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); } catch { /* Preserve the original restore error. */ }
        }
      };
      try {
        for (const change of storageChanges) {
          if (!previousStorage.has(change.key)) previousStorage.set(change.key,localStorage.getItem(change.key));
          if (change.value === null) localStorage.removeItem(change.key);
          else localStorage.setItem(change.key,change.value);
        }
      } catch {
        rollbackStorage();
        throw new Error("Browser storage could not save the restored settings. Nothing was imported; free space or enable site storage and try again.");
      }
      try {
        await plannerDb.transaction("rw", plannerDb.subjects, plannerDb.tasks, plannerDb.sessions, plannerDb.academicPeriods, plannerDb.events, async () => {
        await Promise.all([plannerDb.subjects.clear(), plannerDb.tasks.clear(), plannerDb.sessions.clear(), plannerDb.academicPeriods.clear(), plannerDb.events.clear()]);
        await plannerDb.subjects.bulkPut(raw.subjects);
        await plannerDb.tasks.bulkPut(raw.tasks);
        await plannerDb.sessions.bulkPut(raw.sessions);
        if (academicPeriods.length) await plannerDb.academicPeriods.bulkPut(academicPeriods);
        if (events.length) await plannerDb.events.bulkPut(events);
        });
      } catch (reason) {
        rollbackStorage();
        throw reason;
      }
      if (raw.profile && restoreProfileKey) setProfile(raw.profile as StudentProfile);
      setGoal(raw.version >= 5 ? raw.goal : 8);
      setImportMessage("Backup restored successfully."); await refresh(); setSyncRequested(value => value + 1);
    } catch (err) { setImportMessage(err instanceof Error ? err.message : "Could not read this backup."); }
    e.target.value = "";
  }
  async function clearAll() {
    if (!cloudUserId || !supabase || signOutBusy) return;
    if (syncStatus === "syncing") { setError("Wait for the current cloud synchronisation to finish before clearing this device."); return; }
    if (!window.confirm("Clear this student's offline copy from this device and sign out? Your Studyspace account and cloud records will remain safe. They will synchronise again the next time you sign in. Export a backup first if you also need a separate file copy.")) return;
    suppressCloudSyncRef.current = true;
    setSignOutBusy(true);
    try {
      setPlannerDbUser(cloudUserId);
      await Promise.all([plannerDb.subjects.clear(), plannerDb.tasks.clear(), plannerDb.sessions.clear(), plannerDb.academicPeriods.clear(), plannerDb.resources.clear(), plannerDb.events.clear()]);
      const scopedPrefix = studentStorageKey("");
      try {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
          const key = localStorage.key(index);
          if (key?.startsWith(scopedPrefix)) localStorage.removeItem(key);
        }
        localStorage.removeItem("studyspace-profile:" + cloudUserId);
        localStorage.removeItem("studyspace-profile");
        localStorage.removeItem("studyspace-current-session-v1");
      } catch {
        throw new Error("The local study database was cleared, but some browser preferences could not be removed. Sign out and clear this site's storage in your browser settings.");
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setProfile(null);
      setProfileOwnerId(null);
      setError("");
      setSyncStatus("checking");
    } catch (reason) {
      setError(reason instanceof Error ? "Device data clearing needs attention: " + reason.message : "Device data could not be cleared completely.");
    } finally {
      setSignOutBusy(false);
    }
  }
  async function signOutStudent() {
    if (!supabase || signOutBusy) return;
    if (!window.confirm("Sign out of this Studyspace account on this device? Your locally saved study data will remain here for your next sign-in.")) return;
    setSignOutBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign out. Try again.");
    } finally {
      setSignOutBusy(false);
    }
  }

  if (!supabase) return <StudentAccess />;
  if (!cloudAuthReady) return <main className="student-access-shell"><section className="student-access-card">Checking secure Studyspace access…</section></main>;
  if (!cloudAuthenticated) return <StudentAccess />;
  if (profileOwnerId !== cloudUserId) return <main className="student-access-shell"><section className="student-access-card">Loading your secure student profile…</section></main>;
  if (!profile) return <StudentOnboarding onComplete={nextProfile => void finishOnboarding(nextProfile)} />;

  return <div className="app-shell" data-theme={theme}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <aside className={"sidebar glass-panel " + (mobileMenu ? "sidebar-open" : "")}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><span className="brand-name">studyspace<span className="brand-dot">.</span></span><span className="brand-subtitle">YOUR LEARNING COMPANION</span></div><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <div className="profile-card"><div className="avatar"><GraduationCap size={18}/></div><div className="profile-copy"><strong>{profile?.preferredName || profile?.fullName || "My study space"}</strong><span>{profile?.institution || profile?.level || (subjects.length + " subjects · " + openTasks.length + " open tasks")}</span></div></div>
      <div className="nav-label">STUDY</div><nav className="main-nav" aria-label="Main navigation">{pages.map(({name,icon:Icon})=><button key={name} className={"nav-item "+(page===name?"active":"")} onClick={()=>{setPage(name);setMobileMenu(false);}}><Icon size={18}/><span>{name}</span>{name==="Planner"&&openTasks.length>0&&<span className="nav-count">{openTasks.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="streak-card"><div className="streak-icon"><Flame size={18}/></div><div><strong>Keep showing up</strong><p>Every session counts.</p></div></div><button className={"nav-item settings-link "+(page==="Settings"?"active":"")} onClick={()=>{setPage("Settings");setMobileMenu(false);}}><Settings2 size={18}/><span>Settings &amp; backup</span></button><div className="offline-status"><span className={"status-dot "+(error?"status-error":"")}/>{error?"Storage issue":syncStatus==="syncing"?"Syncing to Studyspace…":syncStatus==="synced"?"Synced to Studyspace":syncStatus==="offline"?"Offline · changes saved":syncStatus==="error"?"Sync needs attention":ready?"Opening cloud workspace":"Opening workspace"}</div></div>
    </aside>
    {mobileMenu&&<button className="mobile-scrim" aria-label="Close navigation overlay" onClick={()=>setMobileMenu(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={()=>setMobileMenu(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div><div className="topbar-actions"><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks and subjects…" aria-label="Search tasks and subjects"/><kbd>/</kbd></label><button className="icon-button theme-toggle" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={"Switch to "+(theme==="dark"?"light":"dark")+" theme"} title="Switch theme">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button><div className="top-avatar"><GraduationCap size={17}/></div></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL STUDY SPACE</div><h1>{page==="Overview"?`${new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening"}, ${profile.preferredName.trim()||profile.fullName.split(" ")[0]||"there"}.`:page==="Today's Session"?"Your classroom is ready.":page==="Subjects"?"Your subjects.":page==="Planner"?"Your study plan.":page==="Study & Exams"?"Test your knowledge.":page==="MIΛ Studio"?"Meet your learning companion.":page==="Academic Calendar"?"Your academic year.":page==="Progress"?"Progress you can measure.":"Make it yours."}</h1><p className="welcome-subtitle">{page==="Overview"?"Welcome back. Let’s make today count.":page==="Today's Session"?"Continue your lesson, work through the worksheet, review notes and manage homework.":page==="Subjects"?"Organise the subjects that shape your learning.":page==="Planner"?"Keep deadlines, assignments and study tasks together.":page==="Study & Exams"?"Practise with multiple choice, word puzzles, fill-in-the-blanks and quick checks.":page==="MIΛ Studio"?"Ask questions, understand lessons, revise and organise your learning with MIΛ.":page==="Academic Calendar"?"Keep school terms, holidays and examinations in one place.":page==="Progress"?"Your totals are calculated from your own activity.":"Control your appearance, privacy and backups."}</p></div>{(page==="Overview"||page==="Planner")&&<button className="primary-button" onClick={() => openNewTask()}><Plus size={17}/> Add a task</button>}{page==="Subjects"&&<button className="primary-button" onClick={()=>setSubjectOpen(true)}><Plus size={17}/> Add subject</button>}</section>
        {error&&<div className="alert error-alert" role="alert">{error}<button onClick={()=>setError("")} aria-label="Dismiss error"><X size={15}/></button></div>}
        {!ready?<section className="glass-panel loading-panel"><div className="loader"/><strong>Opening your study space…</strong><p>Your local records are being loaded.</p></section>:<>
        {page==="Overview"&&<><section className="stats-grid">
          <Stat label="OPEN TASKS" value={String(openTasks.length)} detail={dueToday.length+" due today"} icon={<ClipboardList size={17}/>} tone="mint"/>
          <Stat label="OVERDUE" value={String(overdue.length)} detail={overdue.length?"Needs your attention":"Nothing overdue"} icon={<AlarmClock size={17}/>} tone={overdue.length?"rose":"violet"}/>
          <Stat label="STUDY TIME THIS WEEK" value={weeklyHours.toFixed(1)+"h"} detail={"Goal: "+goal+"h per week"} icon={<Target size={17}/>} tone="blue"/>
          <Stat label="TASKS COMPLETED" value={String(completedTasks.length)} detail={tasks.length?Math.round(completedTasks.length/tasks.length*100)+"% of all tasks":"Add a task to begin"} icon={<Check size={17}/>} tone="violet"/>
        </section><section className="dashboard-grid"><div className="glass-panel focus-panel"><div className="section-heading"><div><h2>Up next</h2><p>Your nearest deadlines and priorities.</p></div><button className="icon-button" aria-label="Open planner" onClick={()=>setPage("Planner")}><ChevronRight size={19}/></button></div>{openTasks.length?<TaskList tasks={openTasks.slice(0,5)} subjects={subjectById} onToggle={toggleTask} onEdit={openEditTask} onDelete={deleteTask}/>:<Empty icon={<Check size={21}/>} title="Nothing waiting on you" text="Add a task when you have something to plan." action="Add your first task" onAction={()=>openNewTask()}/>}<button className="text-button" onClick={()=>setPage("Planner")}>Open full planner <ArrowDownRight size={15}/></button></div>
          <div className="glass-panel week-panel"><div className="section-heading"><div><h2>Study time</h2><p>Minutes you have logged this week.</p></div><Clock3 size={20}/></div><div className="week-summary"><div><strong>{Math.floor(weekMinutes/60)}h {weekMinutes%60}m</strong><span>recorded this week</span></div><span className="week-trend">{Math.min(100,Math.round(weeklyHours/Math.max(1,goal)*100))}% of goal</span></div><div className="goal-track"><span style={{width:Math.min(100,weeklyHours/Math.max(1,goal)*100)+"%"}}/></div><div className="goal-label"><span>0h</span><span>{goal}h weekly goal</span></div><div className="session-actions"><label>Log a session<select id="quick-session-subject" defaultValue=""><option value="">General study</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="secondary-button" onClick={()=>{const el=document.getElementById("quick-session-subject") as HTMLSelectElement|null;void logSession(el?.value?Number(el.value):null,25);}}>+25 min</button><button className="secondary-button" onClick={()=>{const el=document.getElementById("quick-session-subject") as HTMLSelectElement|null;void logSession(el?.value?Number(el.value):null,50);}}>+50 min</button></div><p className="subtle-note">Sessions are logged when you choose a duration. This does not run a background timer.</p></div></section>
          <UpcomingCalendar tasks={tasks} compact/>\n          <section className="bottom-note"><div className="note-icon"><Check size={15}/></div><p><strong>Your Studyspace data travels with your account.</strong> Subjects, tasks, study sessions, academic calendar records and personal files sync to your private Studyspace account when online. This device keeps an offline copy so you can continue studying without a connection.</p><span className="note-pill">CLOUD + OFFLINE</span></section></>}
        {page==="Today's Session"&&<TodaySession subjects={subjects}/>}
        {page==="Subjects"&&<SubjectManager onOpenPlanner={name=>{setPage("Planner");setSearch(name);}}/>}
        {page==="Study & Exams"&&<WeeklyTest subjects={subjects}/>}
        {page==="MIΛ Studio"&&<MiaChat profile={profile} subjects={subjects} variant="studio"/>}
        {page==="My Library"&&<StudentLibrary subjects={subjects}/>}
        {page==="Planner"&&<section className="glass-panel planner-panel"><div className="section-heading"><div><h2>Study calendar</h2><p>Plan around your deadlines. Select a day to add a task.</p></div><span className="count-chip">{visibleTasks.length} shown</span></div><div className="filter-row"><div className="filter-tabs">{["All","Open","Overdue","Completed"].map(v=><button key={v} className={filter===v?"selected":""} onClick={()=>setFilter(v)}>{v}</button>)}</div><div className="filter-tabs"><button className={plannerMode==="week"?"selected":""} onClick={()=>setPlannerMode("week")}>Week view</button><button className={plannerMode==="list"?"selected":""} onClick={()=>setPlannerMode("list")}>List view</button><button className="primary-button compact-button" onClick={()=>openNewTask()}><Plus size={15}/> Add task</button></div></div>{plannerMode==="week"&&<WeekCalendar tasks={visibleTasks} subjects={subjectById} offset={weekOffset} onOffset={setWeekOffset} onAdd={openNewTask} onEdit={openEditTask}/ >}{plannerMode==="list"&&(visibleTasks.length?<TaskList tasks={visibleTasks} subjects={subjectById} onToggle={toggleTask} onEdit={openEditTask} onDelete={deleteTask}/>:<Empty icon={<CalendarDays size={22}/>} title={search||filter!=="All"?"No tasks match this view":"Your planner is ready"} text={search||filter!=="All"?"Try changing your search or filter.":"Add a task with a deadline, subject and priority to start planning."} action="Add a task" onAction={()=>openNewTask()}/>)}</section>}
        {page==="Academic Calendar"&&<><UpcomingCalendar tasks={tasks}/><AcademicCalendar/></>}
        {page==="Progress"&&<><section className="stats-grid"><Stat label="TOTAL STUDY TIME" value={Math.floor(totalMinutes/60)+"h "+totalMinutes%60+"m"} detail={sessions.length+" sessions logged"} icon={<Clock3 size={17}/>} tone="blue"/><Stat label="TASKS COMPLETED" value={String(completedTasks.length)} detail={"of "+tasks.length+" total tasks"} icon={<Check size={17}/>} tone="mint"/><Stat label="SUBJECTS" value={String(subjects.length)} detail="In your workspace" icon={<BookOpen size={17}/>} tone="violet"/><Stat label="OVERDUE TASKS" value={String(overdue.length)} detail="Open tasks past their deadline" icon={<AlarmClock size={17}/>} tone="rose"/></section><section className="glass-panel progress-detail"><div className="section-heading"><div><h2>Subject progress</h2><p>Calculated from the tasks you have entered.</p></div><TrendingUp size={21}/></div>{subjects.length?<div className="progress-subject-list">{subjects.map(s=>{const ts=tasks.filter(t=>t.subjectId===s.id);const done=ts.filter(t=>t.done).length;const mins=sessions.filter(l=>l.subjectId===s.id).reduce((n,l)=>n+l.minutes,0);return <div className="progress-subject" key={s.id}><div className="progress-subject-heading"><span className="subject-dot" style={{background:s.color}}/><strong>{s.name}</strong><span>{done}/{ts.length} tasks · {Math.floor(mins/60)}h {mins%60}m</span></div><div className="progress-track"><span style={{width:(ts.length?done/ts.length*100:0)+"%",background:s.color}}/></div></div>})}</div>:<Empty icon={<TrendingUp size={22}/>} title="Progress starts with your data" text="Add subjects and complete tasks to see meaningful progress here." action="Add a subject" onAction={()=>setPage("Subjects")}/>}<div className="progress-total"><strong>{completedTasks.length} of {tasks.length}</strong><span>tasks completed</span><div className="progress-track"><span style={{width:(tasks.length?completedTasks.length/tasks.length*100:0)+"%"}}/></div></div></section><section className="glass-panel session-history"><div className="section-heading"><div><h2>Recent study sessions</h2><p>Sessions you explicitly logged.</p></div><Clock3 size={20}/></div>{sessions.length?<div className="session-list">{sessions.slice(0,12).map(s=><div className="session-row" key={s.id}><div className="session-icon"><Clock3 size={16}/></div><div><strong>{subjectById.get(s.subjectId??-1)?.name??"General study"}</strong><span>{new Date(s.date).toLocaleString()}</span></div><b>{s.minutes} min</b></div>)}</div>:<p className="subtle-note">No study sessions logged yet. Log one from the Overview page.</p>}</section></>}
        {page==="Settings"&&<section className="settings-stack"><div className="glass-panel settings-card"><div className="section-heading"><div><h2>Appearance</h2><p>Choose the look that works best for you.</p></div><Sun size={20}/></div><div className="setting-row"><div><strong>Colour theme</strong><span>Switch between dark and light glass styles.</span></div><div className="theme-options"><button className={theme==="dark"?"chosen":""} onClick={()=>setTheme("dark")}><Moon size={15}/> Dark</button><button className={theme==="light"?"chosen":""} onClick={()=>setTheme("light")}><Sun size={15}/> Light</button></div></div><div className="setting-row"><div><strong>Weekly study goal</strong><span>Used to calculate your progress indicator.</span></div><label className="goal-input"><input type="number" min="1" max="168" value={goal} onChange={e=>{const n=Math.max(1,Math.min(168,Number(e.target.value)||1));setGoal(n);try{localStorage.setItem(studentStorageKey("studyspace-weekly-goal"),String(n));localStorage.setItem(studentStorageKey("studyspace-weekly-goal-updated-at"),new Date().toISOString());}catch{/* Goal still works for this session. */}}}/> hours</label></div></div>
          <StudyReminders preferredDays={profile.preferredDays} showSettings={true}/>
          <div className="glass-panel settings-card"><div className="section-heading"><div><h2>Cloud synchronisation</h2><p>Keep your planner consistent across devices. Offline changes are queued on this device and uploaded when your connection returns.</p></div><Cloud size={20}/></div><div className="setting-row"><div><strong>{syncStatus==="synced"?"Connected and synchronised":syncStatus==="syncing"?"Synchronising your workspace":syncStatus==="offline"?"Offline · safe to keep studying":syncStatus==="error"?"Synchronisation needs attention":"Checking your connection"}</strong><span>{syncMessage || "Studyspace is checking your student account and available cloud records."}{lastSyncAt ? " Last successful sync: " + new Date(lastSyncAt).toLocaleString() + "." : ""}</span></div><button className="secondary-button" onClick={()=>setSyncRequested(value=>value+1)} disabled={syncStatus==="syncing" || !navigator.onLine}><RefreshCw size={15}/>{syncStatus==="syncing"?"Syncing…":"Sync now"}</button></div></div>
          <div className="glass-panel settings-card"><div className="section-heading"><div><h2>Backup &amp; restore</h2><p>Keep a copy before changing devices or clearing site data.</p></div><Download size={20}/></div><div className="setting-row"><div><strong>Export backup</strong><span>Downloads your profile, subjects, tasks, study sessions, calendar periods and personal events as a JSON file.</span></div><button className="secondary-button" onClick={()=>void exportData()}><Download size={15}/> Export data</button></div><div className="setting-row"><div><strong>Restore backup</strong><span>Replaces local data with a valid Studyspace backup file.</span></div><label className="secondary-button upload-button"><Upload size={15}/> Choose file<input type="file" accept="application/json,.json" onChange={importData}/></label></div>{importMessage&&<p className="inline-message" role="status">{importMessage}</p>}</div>
          <div className="glass-panel settings-card"><div className="section-heading"><div><h2>Studyspace account</h2><p>Your student account is authenticated by Supabase. Sign out before handing this device to another learner.</p></div><LockKeyhole size={20}/></div><div className="setting-row"><div><strong>Sign out of this device</strong><span>Your study data remains in this student's separate local workspace and will be available after signing in again.</span></div><button className="secondary-button" onClick={()=>void signOutStudent()} disabled={signOutBusy}><LockKeyhole size={15}/>{signOutBusy?"Signing out…":"Sign out"}</button></div></div>
          <div className="glass-panel settings-card"><div className="section-heading"><div><h2>Privacy &amp; local data</h2><p>Your Studyspace account is secured online. Subjects, tasks, study sessions, calendar records and personal library files synchronise to your account; this browser keeps an offline copy.</p></div><CircleHelp size={20}/></div><div className="privacy-list"><p><Check size={16}/> Subjects, tasks and sessions are synchronised to your Studyspace account and cached on this device for offline use.</p><p><Check size={16}/> Each student has a separate cloud account and a separate local offline database.</p><p><Check size={16}/> Your profile and planner records synchronise with the signed-in student account when online.</p><p><CircleHelp size={16}/> Clearing browser/site data can erase your records. Export backups regularly.</p></div><div className="danger-row"><div><strong>Clear this device's offline copy</strong><span>Clears this device's offline copy and signs you out. Your secure cloud copy remains intact and returns after your next sign-in.</span></div><button className="danger-button" onClick={()=>void clearAll()} disabled={signOutBusy}><Trash2 size={15}/>{signOutBusy?"Clearing…":"Clear device copy & sign out"}</button></div></div></section>}
        </>}
        <footer className="page-footer"><span>STUDYSPACE <span className="footer-dot">●</span> BUILT FOR YOUR NEXT STEP</span><span><span className={"status-dot "+(error?"status-error":"")}/>{error?"Storage issue":syncStatus==="synced"?"Signed in · Cloud synced":syncStatus==="offline"?"Signed in · Offline cache":syncStatus==="syncing"?"Synchronising…":syncStatus==="error"?"Signed in · Sync needs attention":"Signed in · Connecting"}</span></footer>
      </div>
    </main>
    <StudentFeedback currentPage={page} />
    {taskOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setTaskOpen(false);}}><section className="task-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-heading"><div><span className="eyebrow">YOUR NEXT STEP</span><h2 id="task-modal-title">{editingTask===null?"Add a study task":"Edit study task"}</h2></div><button className="icon-button" aria-label="Close form" onClick={()=>setTaskOpen(false)}><X size={19}/></button></div><form onSubmit={e=>void saveTask(e)}><label className="field-label">Task title<input autoFocus required maxLength={160} value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="e.g. Revise chapter 3"/></label><div className="form-grid"><label className="field-label">Subject<select value={taskForm.subjectId} onChange={e=>setTaskForm({...taskForm,subjectId:e.target.value})}><option value="">No subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field-label">Task type<select value={taskForm.kind} onChange={e=>setTaskForm({...taskForm,kind:e.target.value as PlannerTask["kind"]})}>{["Study","Assignment","Exam","Reading","Other"].map(v=><option key={v}>{v}</option>)}</select></label><label className="field-label">Deadline<input type="datetime-local" value={taskForm.dueAt} onChange={e=>setTaskForm({...taskForm,dueAt:e.target.value})}/></label><label className="field-label">Estimated minutes<input type="number" min="5" max="1440" step="5" value={taskForm.minutes} onChange={e=>setTaskForm({...taskForm,minutes:e.target.value})}/></label><label className="field-label">Priority<select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as PlannerTask["priority"]})}>{["High","Medium","Low"].map(v=><option key={v}>{v}</option>)}</select></label></div><label className="field-label">Notes (optional)<textarea rows={3} maxLength={1500} value={taskForm.notes} onChange={e=>setTaskForm({...taskForm,notes:e.target.value})} placeholder="Add instructions or details"/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setTaskOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Check size={16}/>{editingTask===null?"Save task":"Save changes"}</button></div></form><p className="privacy-hint"><span className="status-dot"/> Saved on this device and synchronised to your Studyspace account when online.</p></section></div>}
    {subjectOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSubjectOpen(false);}}><section className="task-modal glass-panel subject-modal" role="dialog" aria-modal="true" aria-labelledby="subject-modal-title"><div className="modal-heading"><div><span className="eyebrow">BUILD YOUR WORKSPACE</span><h2 id="subject-modal-title">Add a subject</h2></div><button className="icon-button" aria-label="Close form" onClick={()=>setSubjectOpen(false)}><X size={19}/></button></div><form onSubmit={e=>void addSubject(e)}><label className="field-label">Subject name<input autoFocus required maxLength={80} value={subjectName} onChange={e=>setSubjectName(e.target.value)} placeholder="e.g. Biology"/></label><div className="field-label">Choose a colour<div className="color-options">{colors.map(c=><button type="button" key={c} aria-label={"Choose "+c} aria-pressed={subjectColor===c} className={subjectColor===c?"color-choice active-color":"color-choice"} style={{background:c}} onClick={()=>setSubjectColor(c)}/>)}</div></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setSubjectOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16}/> Add subject</button></div></form></section></div>}
    <button className="mia-floating-launcher" onClick={()=>setMiaOpen(open=>!open)} aria-label={miaOpen?"Close MIΛ assistant":"Open MIΛ assistant"} title="Ask MIΛ"><span>Λ</span><small>MIΛ</small></button>
    {miaOpen&&<div className="mia-floating-panel"><MiaChat profile={profile} subjects={subjects} variant="floating" onClose={()=>setMiaOpen(false)}/></div>}
  </div>;
}


function WeekCalendar({tasks,subjects,offset,onOffset,onAdd,onEdit}:{tasks:PlannerTask[];subjects:Map<number,Subject>;offset:number;onOffset:(n:number)=>void;onAdd:(date?:string)=>void;onEdit:(t:PlannerTask)=>void}) {
  const monday = new Date(); monday.setHours(0,0,0,0); monday.setDate(monday.getDate()-((monday.getDay()+6)%7)+offset*7);
  const days = Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
  const iso = (d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const sameDay = (t:PlannerTask,d:Date)=>!!t.dueAt&&localDay(t.dueAt)===iso(d);
  const range = days[0].toLocaleDateString(undefined,{month:"short",day:"numeric"})+" – "+days[6].toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
  return <div className="calendar-wrap"><div className="calendar-toolbar"><button className="secondary-button" onClick={()=>onOffset(offset-1)} aria-label="Previous week">‹ Previous</button><strong>{range}</strong><button className="secondary-button" onClick={()=>onOffset(offset+1)} aria-label="Next week">Next ›</button><button className="text-button" onClick={()=>onOffset(0)}>Today</button></div><div className="week-grid">{days.map(d=>{const dayTasks=tasks.filter(t=>sameDay(t,d));const today=iso(d)===todayISO();return <section key={iso(d)} className={"calendar-day "+(today?"calendar-today":"")}><button className="calendar-day-heading" onClick={()=>onAdd(iso(d))}><span>{d.toLocaleDateString(undefined,{weekday:"short"})}</span><strong>{d.getDate()}</strong><small>+ Add</small></button><div className="calendar-day-tasks">{dayTasks.map(t=>{const subject=subjects.get(t.subjectId??-1);return <button key={t.id} className={"calendar-task "+(t.done?"calendar-task-done":"")} style={{"--subject-color":subject?.color??"var(--blue)"} as React.CSSProperties} onClick={()=>onEdit(t)} title={t.title}><span className="calendar-task-time">{t.dueAt.length>10?new Date(t.dueAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):t.kind}</span><strong>{t.title}</strong>{subject&&<small>{subject.name}</small>}</button>})}{dayTasks.length===0&&<button className="calendar-empty-add" onClick={()=>onAdd(iso(d))}>Add task <Plus size={12}/></button>}</div></section>})}</div><div className="calendar-unscheduled"><strong>Without a deadline</strong><span>{tasks.filter(t=>!t.dueAt).length} tasks</span><div>{tasks.filter(t=>!t.dueAt).slice(0,6).map(t=><button key={t.id} className="unscheduled-task" onClick={()=>onEdit(t)}>{t.title}<ChevronRight size={13}/></button>)}</div><p>Give these tasks a deadline to place them on the calendar.</p></div></div>;
}

function Stat({label,value,detail,icon,tone}:{label:string;value:string;detail:string;icon:React.ReactNode;tone:string}) {
  return <article className="stat-card glass-panel"><div className="stat-top"><span className="stat-label">{label}</span><span className={"stat-icon "+tone}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot"><span className="stat-caption">{detail}</span></div></article>;
}
function Empty({icon,title,text,action,onAction}:{icon:React.ReactNode;title:string;text:string;action:string;onAction:()=>void}) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button className="secondary-button" onClick={onAction}><Plus size={15}/>{action}</button></div>;
}
function TaskList({tasks,subjects,onToggle,onEdit,onDelete}:{tasks:PlannerTask[];subjects:Map<number,Subject>;onToggle:(t:PlannerTask)=>void;onEdit:(t:PlannerTask)=>void;onDelete:(id:number)=>void}) {
  return <div className="task-list">{tasks.map(t=>{const s=subjects.get(t.subjectId??-1);const isOverdue=!t.done&&!!t.dueAt&&localDay(t.dueAt)<todayISO();return <article className={"task-row "+(t.done?"task-done":"")} key={t.id}><button className={"task-check "+(t.done?"checked":"")} aria-label={t.done?"Mark incomplete":"Mark complete"} onClick={()=>onToggle(t)}>{t.done&&<Check size={13}/>}</button><button className="task-copy" onClick={()=>onEdit(t)} aria-label={"Edit "+t.title}><strong>{t.title}</strong><span>{s&&<><i className="subject-dot" style={{background:s.color}}/>{s.name} <i className="separator-dot"/></>}{t.kind} <i className="separator-dot"/><Clock3 size={12}/> {t.minutes} min</span>{t.notes&&<small>{t.notes}</small>}</button><div className="task-meta"><span className={"priority priority-"+t.priority.toLowerCase()}>{t.priority}</span><span className={"task-due "+(isOverdue?"overdue-text":"")}>{isOverdue?"Overdue · ":""}{dateLabel(t.dueAt)}</span></div><div className="task-actions"><button className="icon-button" onClick={()=>onEdit(t)} aria-label={"Edit "+t.title} title="Edit task"><Settings2 size={14}/></button><button className="icon-button" onClick={()=>onDelete(t.id)} aria-label={"Delete "+t.title} title="Delete task"><Trash2 size={14}/></button></div></article>})}</div>;
}
