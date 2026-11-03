import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";

export type StudentProfile = {
  fullName: string;
  preferredName: string;
  country: string;
  institution: string;
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
};

const emptyProfile: StudentProfile = {
  fullName: "", preferredName: "", country: "", institution: "", level: "Secondary school",
  grade: "", curriculum: "", academicYear: String(new Date().getFullYear()), termCount: "3",
  goals: "Improve my marks", targetMark: "75", weeklyHours: "6", preferredDays: ["Saturday", "Sunday"], subjects: []
};

const levels = ["Primary school", "Secondary school", "High school / Sixth form", "College", "University", "Other"];
const curricula = ["National curriculum", "IGCSE / Cambridge", "A-Level", "IB", "CAPS", "Other / Not sure"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentOnboarding({ onComplete }: { onComplete: (profile: StudentProfile) => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [subjectText, setSubjectText] = useState("");
  const [error, setError] = useState("");

  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setProfile(current => ({ ...current, [key]: value }));
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
    if (step === 2) {
      const subjects = subjectText.split(",").map(item => item.trim()).filter(Boolean);
      if (!subjects.length) { setError("Add at least one subject. You can add more later."); return; }
      onComplete({ ...profile, subjects: [...new Set(subjects)] });
      return;
    }
    setStep(current => Math.min(2, current + 1));
  }

  return <main className="onboarding-shell">
    <div className="onboarding-glow onboarding-glow-one" />
    <div className="onboarding-glow onboarding-glow-two" />
    <section className="onboarding-card glass-panel">
      <div className="onboarding-brand"><span className="onboarding-mark"><GraduationCap size={24}/></span><span>studyspace<span className="brand-dot">.</span></span></div>
      <div className="onboarding-progress"><span style={{ width: ((step + 1) / 3 * 100) + "%" }} /></div>
      <div className="onboarding-step-label"><span>GETTING STARTED</span><span>STEP {step + 1} OF 3</span></div>
      <div className="onboarding-heading"><span className="eyebrow"><Sparkles size={14}/> YOUR LEARNING JOURNEY</span>
        <h1>{step === 0 ? "Let's set up your study space." : step === 1 ? "Tell us about your studies." : "Build your study plan."}</h1>
        <p>{step === 0 ? "First, let's get to know the student who will use this planner." : step === 1 ? "This helps us organise the academic year around the right school system." : "Choose the subjects and study routine you want to work towards."}</p>
      </div>

      {step === 0 && <div className="onboarding-fields">
        <label className="field-label">Student's full name<input autoFocus value={profile.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Enter full name" maxLength={100}/></label>
        <label className="field-label">Preferred name <span className="field-optional">OPTIONAL</span><input value={profile.preferredName} onChange={e => update("preferredName", e.target.value)} placeholder="What should we call you?" maxLength={60}/></label>
        <label className="field-label">Country<input value={profile.country} onChange={e => update("country", e.target.value)} placeholder="e.g. Eswatini" maxLength={80}/></label>
        <label className="field-label">School or institution <span className="field-optional">OPTIONAL</span><input value={profile.institution} onChange={e => update("institution", e.target.value)} placeholder="Enter school or institution" maxLength={120}/></label>
      </div>}

      {step === 1 && <div className="onboarding-fields">
        <label className="field-label">Education level<select value={profile.level} onChange={e => update("level", e.target.value)}>{levels.map(item => <option key={item}>{item}</option>)}</select></label>
        <div className="onboarding-two-col">
          <label className="field-label">Grade / year<input value={profile.grade} onChange={e => update("grade", e.target.value)} placeholder="e.g. Form 3, Grade 10, Year 2" maxLength={60}/></label>
          <label className="field-label">Academic year<input value={profile.academicYear} onChange={e => update("academicYear", e.target.value)} placeholder="2026" maxLength={20}/></label>
        </div>
        <label className="field-label">Curriculum<select value={profile.curriculum} onChange={e => update("curriculum", e.target.value)}><option value="">Choose curriculum</option>{curricula.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">Number of school terms<select value={profile.termCount} onChange={e => update("termCount", e.target.value)}><option value="2">2 terms / semesters</option><option value="3">3 terms</option><option value="4">4 terms</option><option value="1">One continuous academic year</option><option value="custom">Other / Not sure</option></select></label>
      </div>}

      {step === 2 && <div className="onboarding-fields">
        <label className="field-label">Subjects <span className="field-optional">SEPARATE WITH COMMAS</span><textarea rows={3} value={subjectText} onChange={e => setSubjectText(e.target.value)} placeholder="Mathematics, English, Biology, Geography"/></label>
        <label className="field-label">Main academic goal<select value={profile.goals} onChange={e => update("goals", e.target.value)}><option>Improve my marks</option><option>Prepare for examinations</option><option>Stay organised and meet deadlines</option><option>Build consistent study habits</option><option>Maintain strong academic performance</option></select></label>
        <div className="onboarding-two-col">
          <label className="field-label">Target mark (%)<input type="number" min="0" max="100" value={profile.targetMark} onChange={e => update("targetMark", e.target.value)}/></label>
          <label className="field-label">Study hours per week<input type="number" min="1" max="80" value={profile.weeklyHours} onChange={e => update("weeklyHours", e.target.value)}/></label>
        </div>
        <div className="field-label">Preferred study days <span className="field-optional">SELECT ALL THAT APPLY</span><div className="onboarding-days">{days.map(day => <button type="button" key={day} className={profile.preferredDays.includes(day) ? "day-chip day-chip-selected" : "day-chip"} onClick={() => toggleDay(day)}>{day.slice(0, 3)}</button>)}</div></div>
      </div>}

      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <div className="onboarding-actions">
        {step > 0 && <button className="secondary-button" onClick={() => { setError(""); setStep(current => current - 1); }}><ArrowLeft size={15}/> Back</button>}
        <button className="primary-button onboarding-next" onClick={next}>{step === 2 ? <><BookOpen size={16}/> Create my study space</> : <>Continue <ArrowRight size={15}/></>}</button>
      </div>
      <p className="onboarding-privacy">Your profile is saved locally in this browser. No account is required.</p>
    </section>
  </main>;
}
