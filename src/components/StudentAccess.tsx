import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, LockKeyhole, ShieldCheck, Sparkles, UserRound, MessageCircle, X, Users, Download } from "lucide-react";
import { supabase } from "../lib/supabase";
import TermsAndConditions, { TERMS_VERSION, type TermsAcceptanceRole } from "./TermsAndConditions";


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

function eswatiniToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Mbabane", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}
function ageOnDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > eswatiniToday()) return -1;
  const [year, month, day] = value.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = eswatiniToday().split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return -1;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return -1;
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age--;
  return age;
}
function isAdultOnDate(value: string): boolean { return ageOnDate(value) >= 18; }
const todayDate = eswatiniToday;

export default function StudentAccess({ installAvailable = false, onInstall }: { installAvailable?: boolean; onInstall?: () => void }) {
  const [mode, setMode] = useState<"signin" | "enrol">("signin");
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAcceptedByName, setTermsAcceptedByName] = useState("");
  const [termsAcceptanceRole, setTermsAcceptanceRole] = useState<TermsAcceptanceRole>("adult_learner");
  const adultRegistration = isAdultOnDate(dateOfBirth);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pendingGuardian, setPendingGuardian] = useState<{ studentId: string; guardianUrl: string | null; message: string } | null>(null);
  const [guardianLinkNotice, setGuardianLinkNotice] = useState("");
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [expiredReason, setExpiredReason] = useState("");
  const supportNumber = "26879940955";
  const publicEnrolmentEnabled = import.meta.env.VITE_STUDYSPACE_PUBLIC_ENROLMENT_ENABLED === "true";
  const inviteEnrolmentEnabled = import.meta.env.VITE_STUDYSPACE_INVITE_ENROLMENT_ENABLED === "true";
  const enrolmentEnabled = publicEnrolmentEnabled || inviteEnrolmentEnabled;
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
      if (!enrolmentEnabled) { setError("New learner enrolment is temporarily unavailable. Existing learners can continue to sign in."); return; }
      if (fullName.trim().length < 2) { setError("Enter the learner’s full legal name."); return; }
      if (preferredName.trim().length > 80) { setError("The preferred name is too long."); return; }
      if (ageOnDate(dateOfBirth) < 0) { setError("Enter a valid date of birth."); return; }
      if (ageOnDate(dateOfBirth) < 9) { setError("StudySpace registration is not available for children under 9 years old."); return; }
      if (sex !== "male" && sex !== "female") { setError("Select Male or Female to complete registration."); return; }
      if (password.length < 10) { setError("Choose a password with at least 10 characters."); return; }
      if (password !== confirmPassword) { setError("The passwords do not match."); return; }
      if (adultRegistration && !termsAccepted) { setError("Read and personally accept the Terms & Conditions and Privacy Notice before creating your account."); return; }
      if (adultRegistration && (fullName.trim() !== termsAcceptedByName.trim() || termsAcceptanceRole !== "adult_learner")) { setError("An adult learner must accept the terms personally in their own full name."); return; }
      if (!adultRegistration && termsAccepted) { setError("Guardian consent must be completed in person through StudySpace Monitor."); return; }
    }
    setBusy(true);
    try {
      if (mode === "enrol") {
        const { data, error: invokeError } = await supabase.functions.invoke("enrol-learner", {
          // Public enrolment sends no pre-issued credentials; the server generates the Student ID.
          // Invitation details are only sent when the deployment is in invitation-only mode.
          body: {
            ...(publicEnrolmentEnabled ? {} : { studentId: studentId.trim().toUpperCase(), pin }),
            password,
            fullName: fullName.trim(),
            preferredName: preferredName.trim() || fullName.trim(),
            dateOfBirth,
            sex,
            termsAccepted: adultRegistration ? termsAccepted : false,
            termsVersion: TERMS_VERSION,
            acceptedByName: adultRegistration ? fullName.trim() : "",
            acceptanceRole: adultRegistration ? "adult_learner" : "",
          }
        });
        if (invokeError) throw invokeError;
        if (!data?.success) throw new Error(data?.error || "The account could not be created.");
        const registeredStudentId = typeof data.studentId === "string" && /^STU-[A-Z0-9]{8}$/.test(data.studentId)
          ? data.studentId
          : (!publicEnrolmentEnabled ? studentId.trim().toUpperCase() : "");
        if (!registeredStudentId) throw new Error("StudySpace could not confirm your new Student ID. Please contact the administrator before trying to sign in.");
        setStudentId(registeredStudentId);
        if (data.accountStatus === "pending_guardian_verification") {
          let guardianUrl = typeof data.guardianUrl === "string" ? data.guardianUrl : null;
          let pendingMessage = data.message || "Your account is registered and waiting for guardian verification.";
          if (!guardianUrl) {
            const linkResult = await supabase.functions.invoke("guardian-consent", {
              body: { action: "issue_invite", studentId: registeredStudentId, password },
            });
            if (!linkResult.error && linkResult.data?.success && typeof linkResult.data.guardianUrl === "string") {
              guardianUrl = linkResult.data.guardianUrl;
            } else {
              pendingMessage += " A guardian link could not be prepared automatically; a StudySpace representative can create one in Monitor or record consent in person.";
            }
          }
          setPendingGuardian({
            studentId: registeredStudentId,
            guardianUrl,
            message: pendingMessage,
          });
          setGuardianLinkNotice("");
          setPin("");
          setConfirmPassword("");
          setPassword("");
          return;
        }
        setNotice("Your account is ready. Your Student ID is " + registeredStudentId + ". Save this ID; you will need it with your password whenever you sign in.");
        setMode("signin"); setPin(""); setConfirmPassword(""); setPassword("");
        setTermsAccepted(false); setTermsAcceptedByName("");
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
          const payload = await context.clone().json() as { error?: unknown; subscription_expired?: unknown; guardian_verification_pending?: unknown };
          if (payload.subscription_expired === true) {
            setExpiredReason(typeof payload.error === "string" ? payload.error : "Your StudySpace subscription has expired. Contact the administrator to renew access.");
            handledAsExpiry = true;
          } else if (payload.guardian_verification_pending === true) {
            setError(typeof payload.error === "string" ? payload.error : "Your account is pending guardian verification. Ask a StudySpace representative for help.");
            handledAsExpiry = true;
          }
        } catch { /* Fall back to the standard sign-in error. */ }
      }
      if (!handledAsExpiry) setError(await describeAccessError(reason));
    } finally { setBusy(false); }
  }

  async function copyGuardianLink() {
    if (!pendingGuardian?.guardianUrl) return;
    try {
      await navigator.clipboard.writeText(pendingGuardian.guardianUrl);
      setGuardianLinkNotice("Guardian invitation link copied. Send it privately to your parent or legal guardian.");
    } catch {
      setGuardianLinkNotice("Copy is unavailable in this browser. Press and hold the link above to select and copy it.");
    }
  }

  async function shareGuardianLink() {
    if (!pendingGuardian?.guardianUrl) return;
    const shareData = {
      title: "StudySpace guardian consent",
      text: "Please open this StudySpace link to review the terms and give consent for my learning account.",
      url: pendingGuardian.guardianUrl,
    };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        await copyGuardianLink();
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name !== "AbortError") {
        setGuardianLinkNotice("Sharing is unavailable. Copy the link and send it by WhatsApp or SMS.");
      }
    }
  }

  if (pendingGuardian) return <main className="student-access-shell">
    <div className="student-access-glow" />
    <section className="student-access-card">
      <div className="student-access-brand"><span><GraduationCap size={23}/></span><div><strong>studyspace<span>.</span></strong><small>YOUR LEARNING COMPANION</small></div></div>
      <div className="student-access-install">
        <button type="button" className="secondary-button" onClick={() => {
          if (installAvailable && onInstall) onInstall();
          else setInstallHelpOpen(value => !value);
        }}><Download size={16}/>{installAvailable ? "Install StudySpace Student" : "Add Student App to home screen"}</button>
        {installHelpOpen && <div className="student-access-install-help" role="status">
          <strong>Install StudySpace Student</strong>
          <p><b>Android:</b> open this page in Chrome, tap the three-dot menu (⋮), then choose <b>Install app</b>. <b>Add to Home screen</b> may create only a browser shortcut on some devices; do not choose <b>Create shortcut</b> when you want an installed web app.</p>
          <p><b>iPhone:</b> open in Safari, tap Share, then <b>Add to Home Screen</b>.</p>
          <p>Use the app's own icon on your home screen next time. Do not download an APK from an unofficial site.</p>
        </div>}
      </div>
      <div className="student-access-icon"><ShieldCheck size={25}/></div>
      <div className="student-access-heading"><div className="eyebrow"><ShieldCheck size={14}/> ACCOUNT PENDING VERIFICATION</div><h1>Your registration is complete.</h1><p>Your StudySpace account is safely registered, but your dashboard remains locked until a parent or legal guardian gives consent and StudySpace approves the verification.</p></div>
      <div className="student-access-notice"><ShieldCheck size={17}/><p><strong>Student ID: {pendingGuardian.studentId}</strong><br/>{pendingGuardian.message}</p></div>
      {pendingGuardian.guardianUrl ? <>
        <label className="field-label">Guardian invitation link<input type="url" readOnly value={pendingGuardian.guardianUrl} onFocus={event => event.currentTarget.select()}/><small>This private link expires after 14 days and can only be used once. Send it directly to your parent or legal guardian.</small></label>
        <div className="guardian-link-actions">
          <button type="button" className="student-access-submit" onClick={() => void copyGuardianLink()}>Copy guardian link</button>
          <button type="button" className="secondary-button" onClick={() => void shareGuardianLink()}>Share link</button>
        </div>
        {guardianLinkNotice && <p className="student-access-notice" role="status">{guardianLinkNotice}</p>}
      </> : <div className="student-access-notice"><Users size={17}/><p>A guardian link could not be generated automatically. Ask a StudySpace representative to open Monitor, select Guardian verification and record the guardian’s consent in person. They can also create a fresh link.</p></div>}
      <div className="student-access-notice"><Users size={17}/><p><strong>No smartphone or email?</strong><br/>Your parent or guardian does not need a smartphone, email address or national ID for the in-person route. You and the guardian can meet a StudySpace representative, who will record the guardian’s details and approval in the Monitor app.</p></div>
      <button type="button" className="access-expiry-secondary" onClick={() => { setPendingGuardian(null); setMode("signin"); setNotice("Student ID " + pendingGuardian.studentId + " is still waiting for guardian verification. You cannot sign in until StudySpace approves it."); }}>Return to sign in</button>
    </section>
  </main>;

  return <main className="student-access-shell">
    <div className="student-access-glow" />
    <section className="student-access-card">
      <div className="student-access-brand"><span><GraduationCap size={23}/></span><div><strong>studyspace<span>.</span></strong><small>YOUR LEARNING COMPANION</small></div></div>
      <div className="student-access-icon"><BookOpen size={25}/></div>
      <div className="student-access-heading"><div className="eyebrow"><Sparkles size={14}/> YOUR STUDY SPACE</div><h1>{mode === "signin" ? "Welcome back." : "Join your class."}</h1><p>{mode === "signin" ? "Sign in with your Studyspace Student ID and password." : publicEnrolmentEnabled ? "Create your learner account directly. StudySpace will generate your Student ID after registration." : "Use the Student ID and one-time PIN issued by your administrator, then create your password."}</p></div>
      <div className="student-access-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => {setMode("signin");setError("");setNotice("");}}>Sign in</button><button type="button" className={mode === "enrol" ? "active" : ""} disabled={!enrolmentEnabled} onClick={() => {setMode("enrol");setError("");setNotice("");}}>{!publicEnrolmentEnabled && inviteEnrolmentEnabled ? "Redeem invitation" : "First-time enrolment"}</button></div>
      {mode === "enrol" && publicEnrolmentEnabled && <div className="student-access-notice" role="status"><ShieldCheck size={17}/><p><strong>No invitation or Student ID is needed.</strong><br/>StudySpace will generate a unique Student ID for you after registration. Save it carefully; you will use it with your password whenever you sign in.</p></div>}
      {!enrolmentEnabled && <div className="student-access-notice" role="status"><ShieldCheck size={17}/><p>New learner enrolment is temporarily unavailable. Existing learners can continue to sign in.</p></div>}{!publicEnrolmentEnabled && inviteEnrolmentEnabled && <div className="student-access-notice" role="status"><ShieldCheck size={17}/><p><strong>Private invitation only.</strong><br/>Public self-registration is off. Only learners with a valid, single-use Student ID and PIN issued by the StudySpace administrator can create an account.</p></div>}
      <form className="student-access-form" onSubmit={submit}>
        {(mode === "signin" || (mode === "enrol" && !publicEnrolmentEnabled)) && <label>Student ID<span className="student-access-input"><UserRound size={16}/><input value={studentId} onChange={e=>setStudentId(e.target.value.toUpperCase())} type="text" placeholder="e.g. STU-AB12CD34" autoComplete="username" required minLength={12} maxLength={12} pattern="STU-[A-Z0-9]{8}" title="Use the 12-character Student ID issued by StudySpace."/></span></label>}
        {mode === "enrol" && <>
          {!publicEnrolmentEnabled && <label>One-time enrolment PIN<input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,8))} type="text" inputMode="numeric" autoComplete="one-time-code" minLength={8} maxLength={8} pattern="[0-9]{8}" placeholder="Enter your 8-digit PIN" required/><small>This invitation is assigned to your Student ID and can only be used once.</small></label>}
          <label>Full legal name<input value={fullName} onChange={e=>{setFullName(e.target.value);setTermsAcceptedByName(e.target.value);}} type="text" autoComplete="name" placeholder="Enter your full name as it appears on school records" minLength={2} maxLength={120} required/></label>
          <label>Preferred name <small>Optional</small><input value={preferredName} onChange={e=>setPreferredName(e.target.value)} type="text" placeholder="What should we call you?" maxLength={80}/></label>
          <label>Date of birth<input value={dateOfBirth} onChange={e=>{setDateOfBirth(e.target.value);setTermsAccepted(false);}} type="date" max={todayDate()} required/><small>We calculate your age using Eswatini local time. Date of birth is locked after registration; contact an authorised StudySpace administrator if it was entered incorrectly.</small></label>
          <fieldset className="student-access-sex-field">
            <legend>Sex <span aria-hidden="true">*</span></legend>
            <div>
              <label><input type="radio" name="student-sex" value="male" checked={sex==="male"} onChange={()=>setSex("male")} required/> Male</label>
              <label><input type="radio" name="student-sex" value="female" checked={sex==="female"} onChange={()=>setSex("female")} required/> Female</label>
            </div>
            <small>This is recorded once during enrolment and cannot be changed from the student profile.</small>
          </fieldset>
        </>}
        <label>Password<span className="student-access-input"><LockKeyhole size={16}/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder={mode === "signin" ? "Enter your password" : "Create a password (10+ characters)"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "enrol" ? 10 : 1} maxLength={128}/></span></label>
        {mode === "enrol" && <>
          <label>Confirm password<span className="student-access-input"><LockKeyhole size={16}/><input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type="password" placeholder="Confirm your password" autoComplete="new-password" required minLength={10} maxLength={128}/></span></label>
          {adultRegistration && <TermsAndConditions
            accepted={termsAccepted}
            onAcceptedChange={setTermsAccepted}
            acceptedByName={fullName}
            onAcceptedByNameChange={setFullName}
            acceptanceRole="adult_learner"
            onAcceptanceRoleChange={setTermsAcceptanceRole}
            adultLearnerOnly
            hideAcceptanceName
          />}
          {dateOfBirth && !adultRegistration && <>
            <TermsAndConditions
              accepted={false}
              onAcceptedChange={() => {}}
              acceptedByName={fullName}
              onAcceptedByNameChange={() => {}}
              acceptanceRole="adult_learner"
              onAcceptanceRoleChange={() => {}}
              readOnly
            />
            <div className="student-access-notice" role="status"><ShieldCheck size={17}/><p><strong>Parent or guardian verification required.</strong><br/>You can complete registration now, but your dashboard will remain locked until a parent or legal guardian meets a StudySpace representative, reviews these terms and gives consent in person. The representative will record the guardian’s details and approval in StudySpace Monitor.</p></div>
          </>}
        </>}
        <button className="student-access-submit" type="submit" disabled={busy || !supabase || !online || (mode === "enrol" && !enrolmentEnabled)}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : !publicEnrolmentEnabled && inviteEnrolmentEnabled ? "Redeem invitation" : "Create student account"}</button>
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
