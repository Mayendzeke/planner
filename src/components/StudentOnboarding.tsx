import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, GraduationCap, Plus, Sparkles, Trash2 } from "lucide-react";

export type OnboardingTimetableEntry = { subject_name: string; title: string; day_of_week: number; starts_at: string; ends_at: string; location: string; notes: string; timetable_kind?: "school" | "personal" };

export type StudentProfile = {
  fullName: string;
  preferredName: string;
  country: string;
  institution: string;
  course: string;
  level: string;
  grade: string;
  curriculum: string;
  academicYear: string;
  termCount: string;
  goals: string;
  targetMark: string;
  weeklyHours: string;
  preferredDays: string[];
  subjects: string[];
  timetableEntries?: OnboardingTimetableEntry[];
};

const emptyProfile: StudentProfile = {
  fullName: "", preferredName: "", country: "", institution: "", course: "", level: "Secondary school",
  grade: "", curriculum: "", academicYear: String(new Date().getFullYear()), termCount: "3",
  goals: "Improve my marks", targetMark: "75", weeklyHours: "6", preferredDays: ["Saturday", "Sunday"], subjects: []
};

const levels = ["Primary school", "Secondary school", "High school / Sixth form", "College", "University", "Other"];
const curricula = ["National curriculum", "IGCSE / Cambridge", "A-Level", "IB", "CAPS", "Other / Not sure"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const subjectCatalog: Record<string, string[]> = {
  primary: ["English", "Siswati", "Mathematics", "Science", "Social Studies", "Environmental Studies", "Agriculture", "ICT / Computer Studies", "Religious Education", "Creative Arts", "Physical Education", "French", "Portuguese"],
  secondary: ["English Language", "English Literature", "Siswati", "Mathematics", "Additional Mathematics", "Biology", "Chemistry", "Physics", "Combined Science", "Agriculture", "Geography", "History", "Business Studies", "Accounting", "Economics", "Commerce", "Computer Science", "ICT", "French", "Portuguese", "Development Studies", "Design and Technology", "Food and Nutrition", "Art and Design", "Physical Education"],
  college: ["Accounting", "Business Management", "Marketing", "Economics", "Finance", "Human Resource Management", "Hospitality Management", "Tourism Management", "Computer Science", "Information Technology", "Software Development", "Education", "Law", "Nursing", "Engineering", "Agriculture", "Communications", "Project Management", "Research Methods"],
  university: ["Accounting", "Business Administration", "Marketing", "Economics", "Finance", "Human Resource Management", "Hospitality Management", "Tourism Management", "Computer Science", "Information Technology", "Software Engineering", "Education", "Law", "Nursing", "Medicine", "Engineering", "Agriculture", "Communications", "Psychology", "Research Methods"]
};
function catalogFor(level: string, curriculum: string) {
  if (level === "Primary school") return subjectCatalog.primary;
  if (level === "College") return subjectCatalog.college;
  if (level === "University") return subjectCatalog.university;
  const core = subjectCatalog.secondary;
  if (curriculum === "IB") return [...core, "Theory of Knowledge", "Extended Essay", "Creativity, Activity and Service"];
  if (curriculum === "CAPS") return [...core, "Life Orientation", "isiZulu", "isiXhosa"];
  if (curriculum === "A-Level") return [...core, "General Paper", "Thinking Skills"];
  return core;
}

export default function StudentOnboarding({ onComplete }: { onComplete: (profile: StudentProfile) => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [error, setError] = useState("");
  const [timetableEntries, setTimetableEntries] = useState<OnboardingTimetableEntry[]>([]);
  const [timetableDraft, setTimetableDraft] = useState<OnboardingTimetableEntry>({ subject_name: "", title: "", day_of_week: 1, starts_at: "08:00", ends_at: "09:00", location: "", notes: "" });

  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setProfile(current => ({ ...current, [key]: value }));
  }

  const availableSubjects = useMemo(() => catalogFor(profile.level, profile.curriculum), [profile.level, profile.curriculum]);
  const filteredSubjects = availableSubjects.filter(name => name.toLocaleLowerCase().includes(subjectSearch.trim().toLocaleLowerCase()));

  function toggleSubject(name: string) {
    setProfile(current => ({ ...current, subjects: current.subjects.includes(name) ? current.subjects.filter(item => item !== name) : [...current.subjects, name] }));
  }

  function addCustomSubject() {
    const name = customSubject.trim();
    if (!name) return;
    if (!profile.subjects.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase())) update("subjects", [...profile.subjects, name]);
    setCustomSubject(""); setSubjectSearch(""); setError("");
  }

  function toggleDay(day: string) {
    setProfile(current => ({
      ...current,
      preferredDays: current.preferredDays.includes(day)
        ? current.preferredDays.filter(item => item !== day)
        : [...current.preferredDays, day]
    }));
  }

  function next() {
    setError("");
    if (step === 0 && !profile.fullName.trim()) { setError("Please enter the student's name."); return; }
    if (step === 1 && (!profile.grade.trim() || !profile.academicYear.trim())) { setError("Please enter a grade or year and academic year."); return; }
    if (step === 1 && (profile.level === "University" || profile.level === "College") && !profile.course.trim()) { setError("Please enter your course or programme."); return; }
    if (step === 2) {
      if (!profile.subjects.length) { setError("Select at least one subject or course to continue."); return; }
      setStep(3);
      return;
    }
    if (step === 3) {
      const preferred = profile.preferredDays.length ? profile.preferredDays : ["Saturday", "Sunday"];
      const hours = Math.max(1, Math.min(80, Number(profile.weeklyHours) || 6));
      const slotsPerDay = Math.ceil(hours / preferred.length);
      const generatedStudyEntries: OnboardingTimetableEntry[] = preferred.flatMap(dayName => {
        const dayIndex = days.indexOf(dayName);
        const dayOfWeek = (dayIndex + 1) % 7;
        const weekend = dayName === "Saturday" || dayName === "Sunday";
        const startMinutes = weekend ? 10 * 60 : 16 * 60;
        return Array.from({ length: slotsPerDay }, (_, slot) => {
          const start = startMinutes + slot * 75;
          const end = start + 60;
          const format = (value: number) => String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
          const subject = profile.subjects[(dayIndex + slot) % Math.max(1, profile.subjects.length)] || "General study";
          return {
            subject_name: subject,
            title: "Available study session",
            day_of_week: dayOfWeek,
            starts_at: format(start),
            ends_at: format(end),
            location: "",
            notes: "Autogenerated from signup preferences. Edit this slot any time to confirm or change availability.",
            timetable_kind: "personal" as const
          };
        });
      });
      onComplete({
        ...profile,
        subjects: [...new Set(profile.subjects)],
        timetableEntries: [
          ...timetableEntries.map(entry => ({ ...entry, timetable_kind: "school" as const })),
          ...generatedStudyEntries
        ]
      });
      return;
    }
    setStep(current => Math.min(3, current + 1));
  }

  return <main className="onboarding-shell">
    <div className="onboarding-glow onboarding-glow-one" />
    <div className="onboarding-glow onboarding-glow-two" />
    <section className="onboarding-card glass-panel">
      <div className="onboarding-brand"><span className="onboarding-mark"><GraduationCap size={24}/></span><span>studyspace<span className="brand-dot">.</span></span></div>
      <div className="onboarding-progress"><span style={{ width: ((step + 1) / 4 * 100) + "%" }} /></div>
      <div className="onboarding-step-label"><span>GETTING STARTED</span><span>STEP {step + 1} OF 4</span></div>
      <div className="onboarding-heading"><span className="eyebrow"><Sparkles size={14}/> YOUR LEARNING JOURNEY</span>
        <h1>{step === 0 ? "Let's set up your study space." : step === 1 ? "Tell us about your studies." : step === 2 ? "Build your study plan." : "Add your timetable (optional)."}</h1>
        <p>{step === 0 ? "First, let's get to know the student who will use this planner." : step === 1 ? "This helps us organise the academic year around the right school system." : step === 2 ? "Choose the subjects and study routine you want to work towards." : "Add your school lessons now, or skip this and complete it later from My Timetable."}</p>
      </div>

      {step === 0 && <div className="onboarding-fields">
        <label className="field-label">Student's full name<input autoFocus value={profile.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Enter full name" maxLength={100}/></label>
        <label className="field-label">Preferred name <span className="field-optional">OPTIONAL</span><input value={profile.preferredName} onChange={e => update("preferredName", e.target.value)} placeholder="What should we call you?" maxLength={60}/></label>
        <label className="field-label">Country<input value={profile.country} onChange={e => update("country", e.target.value)} placeholder="e.g. Eswatini" maxLength={80}/></label>
        <label className="field-label">School or institution <span className="field-optional">OPTIONAL</span><input value={profile.institution} onChange={e => update("institution", e.target.value)} placeholder="Enter school or institution" maxLength={120}/></label>
      </div>}

      {step === 1 && <div className="onboarding-fields">
        <label className="field-label">Education level<select value={profile.level} onChange={e => update("level", e.target.value)}>{levels.map(item => <option key={item}>{item}</option>)}</select></label>
        {(profile.level === "University" || profile.level === "College") && <label className="field-label">Course / programme<input value={profile.course} onChange={e => update("course", e.target.value)} placeholder="Enter your course or programme" maxLength={160}/></label>}
        <div className="onboarding-two-col">
          <label className="field-label">{(profile.level === "University" || profile.level === "College") ? "Year of study" : "Grade / year"}<input value={profile.grade} onChange={e => update("grade", e.target.value)} placeholder={(profile.level === "University" || profile.level === "College") ? "e.g. Year 1, Year 2, Final year" : "e.g. Form 3, Grade 10"} maxLength={60}/></label>
          <label className="field-label">Academic year<input value={profile.academicYear} onChange={e => update("academicYear", e.target.value)} placeholder="2026" maxLength={20}/></label>
        </div>
        <label className="field-label">Curriculum<select value={profile.curriculum} onChange={e => update("curriculum", e.target.value)}><option value="">Choose curriculum</option>{curricula.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">Number of school terms<select value={profile.termCount} onChange={e => update("termCount", e.target.value)}><option value="2">2 terms / semesters</option><option value="3">3 terms</option><option value="4">4 terms</option><option value="1">One continuous academic year</option><option value="custom">Other / Not sure</option></select></label>
      </div>}

      {step === 2 && <div className="onboarding-fields">
        <div className="subject-picker">
          <div className="subject-picker-heading"><div><strong>Choose your subjects or courses</strong><span>Tap each item to select it. You can choose more than one.</span></div><b>{profile.subjects.length} selected</b></div>
          <label className="subject-picker-search"><BookOpen size={16}/><input value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} placeholder="Search subjects or courses…" aria-label="Search subjects and courses"/></label>
          <div className="subject-picker-list" role="group" aria-label="Available subjects">
            {filteredSubjects.map(name => <label className="subject-picker-option" key={name}><input type="checkbox" checked={profile.subjects.includes(name)} onChange={() => toggleSubject(name)}/><span>{name}</span><i>{profile.subjects.includes(name) ? "Selected" : "Add"}</i></label>)}
            {!filteredSubjects.length && <p className="subject-picker-empty">No matching subject in this list. Add it below.</p>}
          </div>
          <div className="subject-picker-custom"><input value={customSubject} onChange={e => setCustomSubject(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSubject(); } }} placeholder="Add a subject or course not listed…" maxLength={80}/><button type="button" className="secondary-button" onClick={addCustomSubject} disabled={!customSubject.trim()}>Add</button></div>
          {!!profile.subjects.length && <div className="subject-picker-selected"><span>YOUR SELECTION</span><div>{profile.subjects.map(name => <button type="button" key={name} onClick={() => toggleSubject(name)} title={"Remove "+name}>{name}<b>×</b></button>)}</div></div>}
        </div>
        <label className="field-label">Main academic goal<select value={profile.goals} onChange={e => update("goals", e.target.value)}><option>Improve my marks</option><option>Prepare for examinations</option><option>Stay organised and meet deadlines</option><option>Build consistent study habits</option><option>Maintain strong academic performance</option></select></label>
        <div className="onboarding-two-col">
          <label className="field-label">Target mark (%)<input type="number" min="0" max="100" value={profile.targetMark} onChange={e => update("targetMark", e.target.value)}/></label>
          <label className="field-label">Study hours per week<input type="number" min="1" max="80" value={profile.weeklyHours} onChange={e => update("weeklyHours", e.target.value)}/></label>
        </div>
        <div className="field-label">Preferred study days <span className="field-optional">SELECT ALL THAT APPLY</span><div className="onboarding-days">{days.map(day => <button type="button" key={day} className={profile.preferredDays.includes(day) ? "day-chip day-chip-selected" : "day-chip"} onClick={() => toggleDay(day)}>{day.slice(0, 3)}</button>)}</div></div>
      </div>}

      {step === 3 && <div className="onboarding-fields onboarding-timetable-step">
        <div className="onboarding-timetable-intro"><CalendarDays size={18}/><span><strong>School timetable</strong><small>This is optional. Your entries are saved to your student profile and can be edited any time.</small></span></div>
        <div className="onboarding-two-col">
          <label className="field-label">Subject / activity<select value={timetableDraft.subject_name} onChange={e=>setTimetableDraft(current=>({...current,subject_name:e.target.value,title:current.title||e.target.value}))}><option value="">General / other</option>{profile.subjects.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
          <label className="field-label">Day<select value={timetableDraft.day_of_week} onChange={e=>setTimetableDraft(current=>({...current,day_of_week:Number(e.target.value)}))}>{days.map((day,index)=><option key={day} value={(index+1)%7}>{day}</option>)}</select></label>
          <label className="field-label">Start time<input type="time" value={timetableDraft.starts_at} onChange={e=>setTimetableDraft(current=>({...current,starts_at:e.target.value}))}/></label>
          <label className="field-label">End time<input type="time" value={timetableDraft.ends_at} onChange={e=>setTimetableDraft(current=>({...current,ends_at:e.target.value}))}/></label>
        </div>
        <button type="button" className="secondary-button onboarding-add-slot" onClick={()=>{if(!timetableDraft.starts_at||!timetableDraft.ends_at||timetableDraft.ends_at<=timetableDraft.starts_at){setError("End time must be later than start time.");return;}const subject=timetableDraft.subject_name.trim();setTimetableEntries(current=>[...current,{...timetableDraft,subject_name:subject,title:timetableDraft.title.trim()||subject||"School activity"}]);setTimetableDraft(current=>({...current,starts_at:current.ends_at,ends_at:"10:00",title:""}));setError("");}}><Plus size={15}/> Add timetable slot</button>
        {timetableEntries.length>0 && <div className="onboarding-timetable-list"><strong>{timetableEntries.length} slots added</strong>{timetableEntries.map((entry,index)=><div key={index}><span><b>{entry.subject_name||entry.title}</b><small>{days[(entry.day_of_week+6)%7]} · {entry.starts_at}–{entry.ends_at}</small></span><button type="button" onClick={()=>setTimetableEntries(current=>current.filter((_,i)=>i!==index))} aria-label="Remove timetable slot"><Trash2 size={14}/></button></div>)}</div>}
        <p className="onboarding-privacy">You can skip this step and add your full school and personal study timetable after signing in.</p>
      </div>}
      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <div className="onboarding-actions">
        {step > 0 && <button className="secondary-button" onClick={() => { setError(""); setStep(current => current - 1); }}><ArrowLeft size={15}/> Back</button>}
        <button className="primary-button onboarding-next" onClick={next}>{step === 3 ? <><BookOpen size={16}/> Create my study space</> : <>Continue <ArrowRight size={15}/></>}</button>
      </div>
      <p className="onboarding-privacy">Your account profile is saved securely to Studyspace. Planner activity is stored on this device in this release.</p>
    </section>
  </main>;
}
