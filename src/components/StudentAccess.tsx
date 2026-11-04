import { useState } from "react";
import { BookOpen, GraduationCap, LockKeyhole, ShieldCheck, Sparkles, UserRound } from "lucide-react";

export default function StudentAccess({ onContinueOffline }: { onContinueOffline: () => void }) {
  const [mode, setMode] = useState<"signin" | "enrol">("signin");
  return <main className="student-access-shell">
    <div className="student-access-glow" />
    <section className="student-access-card">
      <div className="student-access-brand"><span><GraduationCap size={23}/></span><div><strong>studyspace<span>.</span></strong><small>YOUR LEARNING COMPANION</small></div></div>
      <div className="student-access-icon"><BookOpen size={25}/></div>
      <div className="student-access-heading"><div className="eyebrow"><Sparkles size={14}/> YOUR STUDY SPACE</div><h1>{mode === "signin" ? "Welcome back." : "Join your class."}</h1><p>{mode === "signin" ? "Sign in with your Studyspace student ID and password." : "Enter the one-time PIN issued by your administrator, then create your password."}</p></div>
      <div className="student-access-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button type="button" className={mode === "enrol" ? "active" : ""} onClick={() => setMode("enrol")}>First-time enrolment</button></div>
      <form className="student-access-form" onSubmit={e => e.preventDefault()}>
        {mode === "enrol" ? <>
          <label>One-time enrolment PIN<input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Enter your 8-digit PIN" disabled/><small>This PIN is issued for your account, can only be redeemed once and cannot be reused.</small></label>
          <label>Create password<span className="student-access-input"><LockKeyhole size={16}/><input type="password" placeholder="Create a password" autoComplete="new-password" disabled/></span></label>
          <label>Confirm password<span className="student-access-input"><LockKeyhole size={16}/><input type="password" placeholder="Confirm your password" autoComplete="new-password" disabled/></span></label>
        </> : <>
          <label>Student ID<span className="student-access-input"><UserRound size={16}/><input type="text" placeholder="Enter your Studyspace student ID" autoComplete="username" disabled/></span></label>
          <label>Password<span className="student-access-input"><LockKeyhole size={16}/><input type="password" placeholder="Enter your password" autoComplete="current-password" disabled/></span></label>
        </>}
        <button className="student-access-submit" type="button" disabled>{mode === "signin" ? "Sign in" : "Create student account"}</button>
      </form>
      <div className="student-access-notice"><ShieldCheck size={17}/><p><strong>Student ID access — no email required.</strong><br/>Your student ID will be assigned to your account during enrolment. PIN redemption and password sign-in will activate when the shared backend is connected.</p></div>
      <button className="student-access-offline" type="button" onClick={onContinueOffline}>Continue in offline mode <span>→</span></button>
      <p className="student-access-foot">Offline mode keeps your planner data on this device only.</p>
    </section>
  </main>;
}
