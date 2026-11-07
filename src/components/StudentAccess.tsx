import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, LockKeyhole, ShieldCheck, Sparkles, UserRound, MessageCircle, X } from "lucide-react";
import { supabase } from "../lib/supabase";


async function describeAccessError(reason: unknown): Promise<string> {
  const context = reason && typeof reason === "object" && "context" in reason
    ? (reason as { context?: unknown }).context
    : undefined;
  if (context instanceof Response) {
    const status = context.status;
    try {
      const payload = await context.clone().json() as { error?: unknown; message?: unknown; msg?: unknown };
      const detail = [payload.error, payload.message, payload.msg].find(value => typeof value === "string") as string | undefined;
      if (detail) return detail + " (HTTP " + status + ")";
    } catch {
      try {
        const detail = (await context.clone().text()).trim().slice(0, 240);
        if (detail) return detail + " (HTTP " + status + ")";
      } catch { /* Keep the status below. */ }
    }
    return "The Studyspace server rejected the request (HTTP " + status + ").";
  }
  return reason instanceof Error ? reason.message : "Studyspace could not complete that request. Try again.";
}

export default function StudentAccess() {
  const [mode, setMode] = useState<"signin" | "enrol">("signin");
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [expiredReason, setExpiredReason] = useState("");
  const supportNumber = "26879940955";
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice(""); setExpiredReason("");
    if (!supabase) { setError("Student access is not connected to the Studyspace server. Please contact your administrator."); return; }
    if (!navigator.onLine || !online) { setError("An internet connection is required to create or access your student account. Reconnect and try again."); return; }
    if (busy) return;
    if (mode === "enrol") {
      if (password.length < 10) { setError("Choose a password with at least 10 characters."); return; }
      if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    }
    setBusy(true);
    try {
      if (mode === "enrol") {
        const { data, error: invokeError } = await supabase.functions.invoke("enrol-learner", {
          // Compatibility fields let an older deployed Edge Function accept the request;
          // the authenticated onboarding step immediately replaces these placeholders.
          body: { studentId: studentId.trim().toUpperCase(), pin, password, fullName: "Student", preferredName: "Student" }
        });
        if (invokeError) throw invokeError;
        if (!data?.success) throw new Error(data?.error || "The account could not be created.");
        setNotice("Your account is ready. Sign in with your Student ID and password.");
        setMode("signin"); setPin(""); setConfirmPassword(""); setPassword("");
      } else {
        const { data, error: invokeError } = await supabase.functions.invoke("student-sign-in", {
          body: { studentId: studentId.trim().toUpperCase(), password }
        });
        if (invokeError) throw invokeError;
        if (!data?.success || !data?.access_token || !data?.refresh_token) throw new Error(data?.error || "Student ID or password is incorrect.");
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token, refresh_token: data.refresh_token
        });
        if (sessionError) throw sessionError;
        // App-level auth state listener opens the workspace after this session is stored.
      }
    } catch (reason) {
      const context = reason && typeof reason === "object" && "context" in reason
        ? (reason as { context?: unknown }).context : undefined;
      let handledAsExpiry = false;
      if (context instanceof Response) {
        try {
          const payload = await context.clone().json() as { error?: unknown; subscription_expired?: unknown };
          if (payload.subscription_expired === true) {
            setExpiredReason(typeof payload.error === "string" ? payload.error : "Your StudySpace subscription has expired. Contact the administrator to renew access.");
            handledAsExpiry = true;
          }
        } catch { /* Fall back to the standard sign-in error. */ }
      }
      if (!handledAsExpiry) setError(await describeAccessError(reason));
    } finally { setBusy(false); }
  }

  return <main className="student-access-shell">
    <div className="student-access-glow" />
    <section className="student-access-card">
      <div className="student-access-brand"><span><GraduationCap size={23}/></span><div><strong>studyspace<span>.</span></strong><small>YOUR LEARNING COMPANION</small></div></div>
      <div className="student-access-icon"><BookOpen size={25}/></div>
      <div className="student-access-heading"><div className="eyebrow"><Sparkles size={14}/> YOUR STUDY SPACE</div><h1>{mode === "signin" ? "Welcome back." : "Join your class."}</h1><p>{mode === "signin" ? "Sign in with your Studyspace Student ID and password." : "Use the Student ID and one-time PIN issued by your administrator, then create your password."}</p></div>
      <div className="student-access-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => {setMode("signin");setError("");setNotice("");}}>Sign in</button><button type="button" className={mode === "enrol" ? "active" : ""} onClick={() => {setMode("enrol");setError("");setNotice("");}}>First-time enrolment</button></div>
      <form className="student-access-form" onSubmit={submit}>
        <label>Student ID<span className="student-access-input"><UserRound size={16}/><input value={studentId} onChange={e=>setStudentId(e.target.value.toUpperCase())} type="text" placeholder="e.g. STU-AB12CD34" autoComplete="username" required minLength={12} maxLength={12} pattern="STU-[A-Z0-9]{8}" title="Use the 12-character Student ID issued by your administrator."/></span></label>
        {mode === "enrol" && <>
          <label>One-time enrolment PIN<input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,8))} type="text" inputMode="numeric" autoComplete="one-time-code" minLength={8} maxLength={8} pattern="[0-9]{8}" placeholder="Enter your 8-digit PIN" required/><small>This invitation is assigned to your Student ID and can only be used once.</small></label>
        </>}
        <label>Password<span className="student-access-input"><LockKeyhole size={16}/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder={mode === "signin" ? "Enter your password" : "Create a password (10+ characters)"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "enrol" ? 10 : 1} maxLength={128}/></span></label>
        {mode === "enrol" && <label>Confirm password<span className="student-access-input"><LockKeyhole size={16}/><input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type="password" placeholder="Confirm your password" autoComplete="new-password" required minLength={10} maxLength={128}/></span></label>}
        <button className="student-access-submit" type="submit" disabled={busy || !supabase || !online}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create student account"}</button>
      </form>
      {notice && <div className="student-access-notice" role="status"><ShieldCheck size={17}/><p>{notice}</p></div>}
      {expiredReason && <div className="access-expiry-backdrop" role="presentation">
        <section className="access-expiry-dialog" role="alertdialog" aria-modal="true" aria-labelledby="access-expiry-title">
          <button type="button" className="access-expiry-close" onClick={()=>setExpiredReason("")} aria-label="Close message"><X size={18}/></button>
          <div className="access-expiry-symbol"><LockKeyhole size={23}/></div>
          <span className="eyebrow">SUBSCRIPTION EXPIRED</span>
          <h2 id="access-expiry-title">Your StudySpace access is paused</h2>
          <p>{expiredReason}</p>
          <p>Your Student ID and saved work are safe. Ask the administrator to renew your plan; you can continue using the same account after renewal.</p>
          <button type="button" className="student-access-submit" disabled={!supportNumber} onClick={()=>{if(supportNumber) window.location.href="https://wa.me/"+supportNumber+"?text="+encodeURIComponent("Hello, my StudySpace subscription has expired. Please help me renew my access. My Student ID is "+studentId.trim().toUpperCase()+".");}}>
            <MessageCircle size={17}/> {supportNumber ? "Message StudySpace on WhatsApp" : "WhatsApp support contact is being configured"}
          </button>
          <button type="button" className="access-expiry-secondary" onClick={()=>setExpiredReason("")}>Return to sign in</button>
        </section>
      </div>}
      {error && <div className="student-access-notice" role="alert"><ShieldCheck size={17}/><p>{error}</p></div>}
      <div className="student-access-notice"><ShieldCheck size={17}/><p><strong>Student ID access — no student email required.</strong><br/>Your one-time enrolment PIN is only needed to create your account; it does not expire your account after enrolment. If your session expires, sign in again with the same Student ID and password. If you forget your password, contact your administrator for a secure reset. Your saved work stays linked to your account. Do not share your PIN or password.</p></div>
      {!supabase && <div className="student-access-notice" role="alert"><ShieldCheck size={17}/><p>Student access is not connected to the Studyspace server. Account creation and sign-in are unavailable until the administrator fixes the app configuration.</p></div>}
      {!online && <div className="student-access-notice" role="alert"><ShieldCheck size={17}/><p>An internet connection is required for first-time enrolment and sign-in.</p></div>}
    </section>
  </main>;
}
