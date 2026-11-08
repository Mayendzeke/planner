import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function StudentAccountSecurity() {
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
    if (password !== confirm) { setError("The password confirmation does not match."); return; }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirm("");
      setNotice("Your account password has been updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your password could not be updated. Try again.");
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
    <div className="section-heading"><div><h2>Account security</h2><p>Keep your StudySpace account protected across devices.</p></div><ShieldCheck size={20}/></div>
    <form className="onboarding-fields" onSubmit={event => void updatePassword(event)}>
      <label className="field-label">New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="Use at least 12 characters"/></label>
      <label className="field-label">Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Enter the new password again"/></label>
      <div className="modal-actions"><span className="privacy-hint">Your current password is never displayed.</span><button type="submit" className="primary-button" disabled={saving || !password || !confirm}><KeyRound size={15}/>{saving ? "Updating…" : "Change password"}</button></div>
    </form>
    {error && <p className="inline-message error-message" role="alert">{error}</p>}
    {notice && <p className="inline-message" role="status">{notice}</p>}
    <div className="setting-row"><div><strong>Other signed-in devices</strong><span>Sign out other browser sessions without signing out this device.</span></div><button type="button" className="secondary-button" onClick={() => void signOutOtherDevices()} disabled={signingOutOthers}><LogOut size={15}/>{signingOutOthers ? "Signing out…" : "Sign out other devices"}</button></div>
  </section>;
}
