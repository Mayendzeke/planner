import { useState } from "react";
import { BookOpen, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";

export default function StudentAccess({ onContinueOffline }: { onContinueOffline: () => void }) {
  const [mode, setMode] = useState<"signin" | "enrol">("signin");
  return <main className="student-access-shell">
    <div className="student-access-glow" />
    <section className="student-access-card">
      <div className="student-access-brand"><span><GraduationCap size={23}/></span><div><strong>studyspace<span>.</span></strong><small>YOUR LEARNING COMPANION</small></div></div>
      <div className="student-access-icon"><BookOpen size={25}/></div>
      <div className="student-access-heading"><div className="eyebrow"><Sparkles size={14}/> YOUR STUDY SPACE</div><h1>{mode === "signin" ? "Welcome back." : "Join your class."}</h1><p>{mode === "signin" ? "Sign in to continue learning and keep your academic work together." : "Use the one-time enrolment PIN provided by your administrator to create your student account."}</p></div>
      <div className="student-access-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "enrol" ? "active" : ""} onClick={() => setMode("enrol")}>First-time enrolment</button></div>
      <form className="student-access-form" onSubmit={e => e.preventDefault()}>
        {mode === "enrol" && <label>One-time enrolment PIN<input type="text" inputMode="numeric" maxLength={8} placeholder="Enter your 8-digit PIN" disabled/><small>Your administrator creates this PIN. It can only be used once.</small></label>}
        <label>Email address<span className="student-access-input"><Mail size={16}/><input type="email" placeholder="you@example.com" autoComplete="email" disabled/></span></label>
        <label>Password<span className="student-access-input"><LockKeyhole size={16}/><input type="password" placeholder={mode === "enrol" ? "Create a password" : "Enter your password"} autoComplete={mode === "enrol" ? "new-password" : "current-password"} disabled/></span></label>
        {mode === "enrol" && <label>Confirm password<span className="student-access-input"><LockKeyhole size={16}/><input type="password" placeholder="Confirm your password" autoComplete="new-password" disabled/></span></label>}
        <button className="student-access-submit" type="button" disabled>{mode === "signin" ? "Sign in" : "Create student account"}</button>
      </form>
      <div className="student-access-notice"><ShieldCheck size={17}/><p><strong>Secure student accounts are being connected.</strong><br/>Sign-in and PIN enrolment will activate when the shared Supabase backend is configured. No password or PIN is collected on this screen yet.</p></div>
      <button className="student-access-offline" onClick={onContinueOffline}>Continue in offline mode <span>→</span></button>
      <p className="student-access-foot">Offline mode keeps your planner data on this device only.</p>
    </section>
  </main>;
}
