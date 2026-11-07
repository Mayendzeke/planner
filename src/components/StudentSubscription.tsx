import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

type Plan = { id: string; name: string; duration: string; price: number; days: number; description: string };
const plans: Plan[] = [
  { id: "free_trial", name: "Free Trial", duration: "1 day", price: 0, days: 1, description: "Enjoy the full premium StudySpace experience free for one day." },
  { id: "weekly", name: "Weekly", duration: "7 days", price: 100, days: 7, description: "One week of full learner access." },
  { id: "two_weeks", name: "2 Weeks", duration: "14 days", price: 200, days: 14, description: "Two weeks of uninterrupted learning." },
  { id: "monthly", name: "Monthly", duration: "28 days", price: 350, days: 28, description: "Premium 28-day access with the highest daily MIΛ allowance." },
];

export default function StudentSubscription() {
  const [tier, setTier] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("weekly");
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { if (alive) { setLoading(false); setMessage("Subscription details are unavailable because Studyspace is not connected."); } return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setLoading(false); return; }
      const { data, error } = await supabase.from("profiles")
        .select("subscription_tier,subscription_expires_at")
        .eq("id", user.id).single();
      if (!alive) return;
      if (error) setMessage("We could not load your subscription details. Please try again while online.");
      else {
        setTier(data?.subscription_tier || "");
        setExpiresAt(data?.subscription_expires_at || null);
      }
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  const currentPlan = plans.find(plan => plan.id === tier || plan.name.toLowerCase() === tier.toLowerCase());
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const expired = expiryDate ? expiryDate.getTime() <= Date.now() : false;
  const formatDate = (date: Date) => date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  async function copyRequest() {
    const plan = plans.find(item => item.id === selected);
    if (!plan) return;
    const request = "Hello, I would like to request the Studyspace " + plan.name + " plan (" + plan.duration + ", E" + plan.price + "). Please confirm availability and activate it on my existing Student ID. Thank you.";
    setCopying(true);
    try {
      await navigator.clipboard.writeText(request);
      setMessage("Request copied. Send it to your Studyspace administrator to arrange payment and activation.");
    } catch {
      setMessage(request);
    } finally { setCopying(false); }
  }

  return <div className="settings-stack subscription-stack">
    <section className="glass-panel settings-card subscription-current">
      <div className="section-heading"><div><h2>Current subscription</h2><p>Your Student ID stays the same when your plan changes.</p></div><CreditCard size={21}/></div>
      {loading ? <p className="subtle-note">Loading your subscription…</p> : <>
        <div className="subscription-current-grid">
          <div><span className="subscription-label">CURRENT TIER</span><strong>{currentPlan?.name || tier || "Not assigned"}</strong></div>
          <div><span className="subscription-label">ACCESS STATUS</span><strong className={expired ? "subscription-expired" : "subscription-active"}>{expired ? "Expired" : expiresAt ? "Active until expiry" : "No expiry set"}</strong></div>
          <div><span className="subscription-label">ACCESS ENDS</span><strong>{expiryDate ? formatDate(expiryDate) : "Not set"}</strong></div>
        </div>
        <p className="subscription-note"><ShieldCheck size={16}/> Choosing a plan here does not charge you or change your access automatically. Your administrator confirms payment and activates the selected plan.</p>
      </>}
    </section>

    <section className="glass-panel settings-card">
      <div className="section-heading"><div><h2>Choose a plan</h2><p>Select the access period you want to request.</p></div><Clock3 size={20}/></div>
      <div className="subscription-plans">
        {plans.map(plan => <button type="button" key={plan.id} className={"subscription-plan " + (plan.id === "monthly" ? "subscription-plan-premium " : "") + (selected === plan.id ? "selected" : "")} onClick={() => { setSelected(plan.id); setMessage(""); }}>
          <span className="subscription-plan-top"><strong>{plan.name}{plan.id === "monthly" ? <small className="subscription-premium-tag">PREMIUM</small> : null}</strong><span>{selected === plan.id ? <CheckCircle2 size={18}/> : null}</span></span>
          <span className="subscription-price">{plan.price === 0 ? "Free" : "E" + plan.price}</span>
          <span className="subscription-duration">{plan.duration}</span>
          <span className="subscription-description">{plan.description}</span>
        </button>)}
      </div>
      <div className="subscription-request">
        <button type="button" className="primary-button" onClick={() => void copyRequest()} disabled={copying || loading}>{copying ? "Preparing request…" : "Copy plan request"}</button>
        <p className="subtle-note">Share the copied request with your administrator. Your existing account and saved work remain linked to your Student ID.</p>
        {message && <div className="subscription-message" role="status">{message}</div>}
      </div>
    </section>
  </div>;
}
