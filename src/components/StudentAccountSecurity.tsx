import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

async function edgeFunctionError(reason: unknown, fallback: string): Promise<string> {
  if (reason && typeof reason === "object" && "context" in reason) {
    const context = (reason as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: unknown; message?: unknown };
        if (typeof payload.error === "string") return payload.error;
        if (typeof payload.message === "string") return payload.message;
      } catch {
        // Fall back to the SDK error when the response is not JSON.
      }
    }
  }
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

async function getVerifiedAccessToken(expectedUserId?: string): Promise<string> {
  if (!supabase) throw new Error("StudySpace sign-in is unavailable. Refresh the app and sign in again.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error("StudySpace could not read your sign-in session. Sign out and sign in again.");
  let session = sessionData.session;

  if (!session?.access_token) {
    throw new Error("Your secure student sign-in session is missing. Sign out, then sign in again with your Student ID and temporary password.");
  }

  let verification = await supabase.auth.getUser(session.access_token);
  if (verification.error || !verification.data.user) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error("Your student sign-in session has expired. Sign out and sign in again before changing your password.");
    }
    session = refreshed.session;
    verification = await supabase.auth.getUser(session.access_token);
  }

  if (verification.error || !verification.data.user) {
    throw new Error("StudySpace could not verify your sign-in. Sign out and sign in again before changing your password.");
  }
  if (expectedUserId && verification.data.user.id !== expectedUserId) {
    throw new Error("The signed-in account changed. Sign out and sign in again before changing this password.");
  }

  return session.access_token;
}

type Props = {
  required?: boolean;
  expectedUserId?: string;
  onPasswordChanged?: () => void;
};

export default function StudentAccountSecurity({ required = false, expectedUserId, onPasswordChanged }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || saving) return;
    setNotice("");
    setError("");
    if (password.length < 12) { setError("Use at least 12 characters for your new password."); return; }
    if (password.length > 128) { setError("Your new password must be no longer than 128 characters."); return; }
    if (password !== confirm) { setError("The password confirmation does not match."); return; }
    setSaving(true);
    try {
      // Never allow supabase-js to fall back to the public API key as the
      // Authorization bearer value. This operation requires a real learner JWT.
      const accessToken = await getVerifiedAccessToken(expectedUserId);
      const { data, error: invokeError } = await supabase.functions.invoke("change-student-password", {
        body: { password },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (invokeError) throw new Error(await edgeFunctionError(invokeError, "Your password could not be updated. Try again."));
      if (!data?.success) throw new Error(data?.error || "Your password could not be updated. Try again.");

      setPassword("");
      setConfirm("");
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session || refreshed.session.user.app_metadata?.must_change_password === true) {
        await supabase.auth.signOut();
        setNotice("Your password has been saved. Sign in again with your new password to continue.");
        return;
      }
      setNotice("Your account password has been updated.");
      onPasswordChanged?.();
    } catch (reason) {
      setError(await edgeFunctionError(reason, "Your password could not be updated. Try again."));
    } finally {
      setSaving(false);
    }
  }

  async function signOutOtherDevices() {
    if (!supabase || signingOutOthers) return;
    setSigningOutOthers(true);
    setNotice("");
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
      if (signOutError) throw signOutError;
      setNotice("Other signed-in devices have been signed out. This device remains connected.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Other sessions could not be signed out.");
    } finally {
      setSigningOutOthers(false);
    }
  }

  return <section className="glass-panel settings-card account-security-settings">
    <div className="section-heading"><div><h2>{required ? "Choose a private password" : "Account security"}</h2><p>{required ? "Your temporary password is only for getting into your account this one time. Set a password you will remember." : "Keep your StudySpace account protected across devices."}</p></div><ShieldCheck size={20}/></div>
    <form className="onboarding-fields" onSubmit={event => void updatePassword(event)}>
      <label className="field-label">New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="Use at least 12 characters" required/></label>
      <label className="field-label">Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Enter the new password again" required/></label>
      <div className="modal-actions"><span className="privacy-hint">Your password is private. StudySpace staff cannot view it.</span><button type="submit" className="primary-button" disabled={saving || !password || !confirm}><KeyRound size={15}/>{saving ? "Saving…" : required ? "Set my password" : "Change password"}</button></div>
    </form>
    {error && <p className="inline-message error-message" role="alert">{error}</p>}
    {notice && <p className="inline-message" role="status">{notice}</p>}
    {!required && <div className="setting-row"><div><strong>Other signed-in devices</strong><span>Sign out other browser sessions without signing out this device.</span></div><button type="button" className="secondary-button" onClick={() => void signOutOtherDevices()} disabled={signingOutOthers}><LogOut size={15}/>{signingOutOthers ? "Signing out…" : "Sign out other devices"}</button></div>}
  </section>;
}
