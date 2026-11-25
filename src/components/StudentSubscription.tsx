import { useEffect, useState } from "react";
import { Clock3, CreditCard, ShieldCheck, MessageCircle, LockKeyhole } from "lucide-react";
import { supabase } from "../lib/supabase";

type Plan = { id: string; name: string; duration: string; price: number; days: number; description: string };
const plans: Plan[] = [
  { id: "weekly", name: "Weekly", duration: "7 days", price: 100, days: 7, description: "Seven consecutive days of full learner access." },
  { id: "two_weeks", name: "2 Weeks", duration: "14 days", price: 180, days: 14, description: "Fourteen consecutive days of uninterrupted learning." },
  { id: "monthly", name: "Monthly", duration: "28 days", price: 350, days: 28, description: "Twenty-eight days of full learning access." },
];

const STUDYSPACE_SUPPORT_NUMBER = "26879940955";
const MOMO_PAYMENT_NUMBER = "+268 7824 0679";

export default function StudentSubscription({ onAccessRestored }: { onAccessRestored?: () => void }) {
  const [tier, setTier] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessPin, setAccessPin] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemNotice, setRedeemNotice] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { if (alive) { setLoading(false); setError("Subscription details are unavailable because StudySpace is not connected."); } return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setLoading(false); return; }
      const { data, error: queryError } = await supabase.from("profiles")
        .select("student_id,subscription_tier,subscription_expires_at,trial_expires_at")
        .eq("id", user.id).single();
      if (!alive) return;
      if (queryError) setError("We could not load your subscription details. Please reconnect and try again.");
      else {
        setStudentId(String(data?.student_id || ""));
        setTier(String(data?.subscription_tier || ""));
        setExpiresAt(data?.subscription_expires_at || null);
        setTrialExpiresAt(data?.trial_expires_at || null);
      }
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  const paidExpiry = expiresAt ? new Date(expiresAt) : null;
  const trialExpiry = trialExpiresAt ? new Date(trialExpiresAt) : null;
  const currentExpiry = tier ? paidExpiry : trialExpiry;
  const currentExpired = currentExpiry ? currentExpiry.getTime() <= Date.now() : true;
  const formatDate = (date: Date) => date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  async function redeemAccessPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || accessPin.length !== 8 || redeeming) return;
    setRedeeming(true);
    setRedeemError("");
    setRedeemNotice("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("redeem-access-pin", { body: { pin: accessPin } });
      if (invokeError) throw invokeError;
      if (data?.success !== true || !data?.expiresAt || !data?.planTier) throw new Error(data?.error || "The access PIN could not be redeemed.");
      setTier(String(data.planTier));
      setExpiresAt(String(data.expiresAt));
      setTrialExpiresAt(null);
      setAccessPin("");
      setRedeemNotice("Your access has been restored. Your " + String(data.planTier).replace("_", " ") + " plan is now active.");
      onAccessRestored?.();
    } catch (reason) {
      setRedeemError(reason instanceof Error ? reason.message : "That PIN could not be redeemed. Check it and try again.");
    } finally {
      setRedeeming(false);
    }
  }

  function requestPlan(plan: Plan) {
    if (!studentId) { setError("Your Student ID could not be loaded. Please sign out and sign in again, or contact StudySpace support."); return; }
    const message = [
      "Hello StudySpace, I would like to request the " + plan.name + " plan.",
      "Plan duration: " + plan.duration,
      "Amount: E" + plan.price,
      "My Student ID: " + studentId,
      "",
      "I will pay by MTN MoMo to " + MOMO_PAYMENT_NUMBER + ", using my Student ID as the payment reference, then send the payment confirmation to StudySpace on WhatsApp.",
      "I understand that my learning access will be restored only after payment is verified and the plan is activated. Thank you."
    ].join("\n");
    window.location.href = "https://wa.me/" + STUDYSPACE_SUPPORT_NUMBER + "?text=" + encodeURIComponent(message);
  }

  return <div className="settings-stack subscription-stack">
    <section className="glass-panel settings-card subscription-current">
      <div className="section-heading"><div><h2>StudySpace access</h2><p>Your Student ID stays the same when you renew or change plans.</p></div><CreditCard size={21}/></div>
      {loading ? <p className="subtle-note">Loading your subscription…</p> : <>
        <div className="subscription-current-grid">
          <div><span className="subscription-label">STUDENT ID</span><strong>{studentId || "Unavailable"}</strong></div>
          <div><span className="subscription-label">CURRENT PLAN</span><strong>{tier || (trialExpiry ? "Free 48-hour trial" : "No active plan")}</strong></div>
          <div><span className="subscription-label">ACCESS STATUS</span><strong className={currentExpired ? "subscription-expired" : "subscription-active"}>{currentExpired ? "Paused / expired" : "Active"}</strong></div>
          <div><span className="subscription-label">ACCESS ENDS</span><strong>{currentExpiry ? formatDate(currentExpiry) : "Not available"}</strong></div>
        </div>
        <p className="subscription-note"><ShieldCheck size={16}/> Selecting a plan opens WhatsApp with your Student ID and plan details. It does not charge you or activate access automatically.</p>
      </>}
    </section>

    {!loading && currentExpired && <section className="glass-panel settings-card access-pin-card">
      <div className="section-heading"><div><h2>Restore access with a PIN</h2><p>Your trial or current plan has ended. Enter the eight-digit access PIN issued to your Student ID.</p></div><LockKeyhole size={20}/></div>
      <form className="access-pin-form" onSubmit={event => void redeemAccessPin(event)}>
        <label htmlFor="student-access-pin">Eight-digit access PIN</label>
        <div><input id="student-access-pin" inputMode="numeric" autoComplete="one-time-code" value={accessPin} onChange={event => setAccessPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter PIN" maxLength={8} pattern="[0-9]{8}" required/><button type="submit" className="primary-button" disabled={redeeming || accessPin.length !== 8}>{redeeming ? "Verifying…" : "Redeem PIN"}</button></div>
      </form>
      <p className="subtle-note">A PIN is linked to your account, can be used once, and expires 24 hours after it is issued. It cannot be used to create a new account.</p>
      {redeemNotice && <p className="subscription-note" role="status">{redeemNotice}</p>}
      {redeemError && <p className="subscription-message" role="alert">{redeemError}</p>}
    </section>}
    <section className="glass-panel settings-card">
      <div className="section-heading"><div><h2>Choose your plan</h2><p>Choose one option below to send your request to StudySpace on WhatsApp.</p></div><Clock3 size={20}/></div>
      <div className="subscription-plans">
        {plans.map(plan => <button type="button" key={plan.id} className={"subscription-plan " + (plan.id === "monthly" ? "subscription-plan-premium" : "")} onClick={() => requestPlan(plan)} disabled={loading || !studentId}>
          <span className="subscription-plan-top"><strong>{plan.name}{plan.id === "monthly" ? <small className="subscription-premium-tag">28 DAYS</small> : null}</strong><span><MessageCircle size={17}/></span></span>
          <span className="subscription-price">E{plan.price}</span>
          <span className="subscription-duration">{plan.duration}</span>
          <span className="subscription-description">{plan.description}</span>
          <span className="subscription-plan-action">Request on WhatsApp <MessageCircle size={14}/></span>
        </button>)}
      </div>
    </section>

    <section className="glass-panel settings-card payment-instructions">
      <div className="section-heading"><div><h2>Payment instructions</h2><p>StudySpace currently accepts MTN MoMo only.</p></div><LockKeyhole size={20}/></div>
      <div className="payment-recipient-card"><span className="subscription-label">MTN MOMO PAYMENT NUMBER</span><strong>StudySpace payments</strong><b>{MOMO_PAYMENT_NUMBER}</b><small>Use your Student ID as the payment reference. Before confirming, verify that the recipient name shown in MTN MoMo matches the payment instructions you received. Do not proceed if it does not match.</small></div>
      <ol>
        <li>Choose your plan above. WhatsApp will open with your Student ID, plan, amount and recipient details.</li>
        <li>Pay the exact amount to the MTN MoMo number shown above after confirming the recipient name in the payment app.</li>
        <li>Enter your exact Student ID as the payment reference.</li>
        <li>Send the payment confirmation or transaction reference to StudySpace on WhatsApp.</li>
        <li>Your access is restored after the payment is verified and your plan is activated by the administrator.</li>
      </ol>
      <p className="subscription-note"><ShieldCheck size={16}/> Do not pay a different number or share your MTN MoMo PIN or one-time security codes. A payment message alone does not unlock your account.</p>
    </section>
    {error && <div className="subscription-message" role="alert">{error}</div>}
  </div>;
}
