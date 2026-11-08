import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import TermsAndConditions, { TERMS_VERSION, type TermsAcceptanceRole } from "./TermsAndConditions";

type InviteData = {
  studentId: string;
  name: string;
};

const RELATIONSHIPS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "legal_guardian", label: "Legal guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Other" },
];

export default function GuardianConsentPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("guardian_consent") ?? "", []);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [guardianFullName, setGuardianFullName] = useState("");
  const [relationship, setRelationship] = useState("mother");
  const [relationshipDetails, setRelationshipDetails] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [testimonialMarketingConsent, setTestimonialMarketingConsent] = useState(false);
  const [termsAcceptedByName, setTermsAcceptedByName] = useState("");
  const [termsAcceptanceRole, setTermsAcceptanceRole] = useState<TermsAcceptanceRole>("parent_guardian");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadInvite() {
      if (!token || !supabase) {
        setError("This guardian invitation link is incomplete or StudySpace is unavailable.");
        setLoading(false);
        return;
      }
      const { data, error: invokeError } = await supabase.functions.invoke("guardian-consent", {
        body: { action: "get_invite", token },
      });
      if (!alive) return;
      if (invokeError || !data?.success || !data?.learner) {
        setError(data?.error || invokeError?.message || "This guardian invitation could not be verified.");
        setLoading(false);
        return;
      }
      setInvite(data.learner as InviteData);
      setLoading(false);
    }
    void loadInvite();
    return () => { alive = false; };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !invite || busy) return;
    if (guardianFullName.trim().length < 2) {
      setError("Enter the parent or legal guardian’s full name.");
      return;
    }
    if (!termsAccepted || termsAcceptedByName.trim() !== guardianFullName.trim() || termsAcceptanceRole !== "parent_guardian") {
      setError("The parent or legal guardian must read and personally accept the current terms in their own name.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke("guardian-consent", {
      body: {
        action: "submit_consent",
        token,
        guardianFullName: guardianFullName.trim(),
        relationship,
        relationshipDetails: relationship === "other" ? relationshipDetails.trim() : "",
        guardianPhone: guardianPhone.trim(),
        guardianConsent: true,
        termsVersion: TERMS_VERSION,
        testimonialMarketingConsent,
      },
    });
    if (invokeError || !data?.success) {
      setError(data?.error || invokeError?.message || "Your consent could not be submitted. Check the details and try again.");
      setBusy(false);
      return;
    }
    setSubmitted(true);
    setBusy(false);
  }

  if (loading) return <main className="guardian-consent-shell"><section className="guardian-consent-card"><div className="guardian-consent-brand"><GraduationCap size={23}/> studyspace<span>.</span></div><p>Checking your guardian invitation…</p></section></main>;

  if (submitted) return <main className="guardian-consent-shell">
    <section className="guardian-consent-card">
      <div className="guardian-consent-brand"><GraduationCap size={23}/> studyspace<span>.</span></div>
      <div className="guardian-consent-success"><CheckCircle2 size={30}/></div>
      <div className="eyebrow">CONSENT SUBMITTED</div>
      <h1>Thank you. Your response has been recorded.</h1>
      <p>Your consent submission for <strong>{invite?.name}</strong> ({invite?.studentId}) has been sent to StudySpace.</p>
      <div className="student-access-notice"><ShieldCheck size={18}/><p>The learner’s account remains locked until a StudySpace administrator reviews the guardian submission and approves activation. A 48-hour learning trial starts only after that approval.</p></div>
      <p className="guardian-consent-small">You do not need to create a StudySpace account or provide an email address. Keep your phone available in case StudySpace needs to confirm the submission.</p>
    </section>
  </main>;

  return <main className="guardian-consent-shell">
    <section className="guardian-consent-card">
      <div className="guardian-consent-brand"><GraduationCap size={23}/> studyspace<span>.</span></div>
      <div className="eyebrow"><ShieldCheck size={14}/> PARENT / LEGAL GUARDIAN CONSENT</div>
      <h1>Review and approve this learner’s account.</h1>
      {error && <p className="student-access-notice" role="alert">{error}</p>}
      {invite ? <>
        <div className="guardian-consent-learner">
          <span>Learner</span><strong>{invite.name}</strong><small>Student ID: {invite.studentId}</small>
        </div>
        <p className="guardian-consent-instructions">Please complete this form yourself as the parent or legal guardian. No email address, smartphone account or national identity document is required to submit this consent. StudySpace may contact you to confirm the details before activating the learner’s account.</p>
        <form onSubmit={event => void submit(event)}>
          <div className="guardian-consent-form-grid">
            <label>Parent / guardian full name<input value={guardianFullName} onChange={event => { setGuardianFullName(event.target.value); setTermsAcceptedByName(event.target.value); setTermsAccepted(false); }} minLength={2} maxLength={120} autoComplete="name" required/></label>
            <label>Relationship to learner<select value={relationship} onChange={event => setRelationship(event.target.value)}>{RELATIONSHIPS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            {relationship === "other" && <label>Describe relationship<input value={relationshipDetails} onChange={event => setRelationshipDetails(event.target.value)} minLength={2} maxLength={100} required placeholder="e.g. aunt, uncle, foster carer"/></label>}
            <label>Contact number<input type="tel" value={guardianPhone} onChange={event => setGuardianPhone(event.target.value)} maxLength={30} autoComplete="tel" required placeholder="e.g. +268 7XXX XXXX"/></label>
          </div>
          <TermsAndConditions
            accepted={termsAccepted}
            onAcceptedChange={setTermsAccepted}
            acceptedByName={termsAcceptedByName}
            onAcceptedByNameChange={setTermsAcceptedByName}
            acceptanceRole="parent_guardian"
            onAcceptanceRoleChange={setTermsAcceptanceRole}
            adultLearnerOnly
            hideAcceptanceName
          />
          <label className="testimonial-consent"><input type="checkbox" checked={testimonialMarketingConsent} onChange={event => setTestimonialMarketingConsent(event.target.checked)}/><span><strong>Optional: I authorise limited marketing use of the learner’s testimonial.</strong><small>If the learner submits a testimonial, StudySpace may use its words and the learner’s preferred name in promotional images. Student ID, contact details and profile photo will not be used. This permission is voluntary and declining does not affect account approval or learning access.</small></span></label>
          <div className="guardian-consent-online-note"><Users size={18}/><p>Submitting this online form does not immediately open the learner’s account. StudySpace will review the submission and approve it in Monitor. If you prefer to give consent in person, you may meet an authorised StudySpace representative instead.</p></div>
          <button className="student-access-submit" type="submit" disabled={busy || !termsAccepted || guardianFullName.trim().length < 2 || guardianPhone.trim().length < 7 || (relationship === "other" && relationshipDetails.trim().length < 2)}>{busy ? "Submitting consent…" : "Submit guardian consent"}</button>
        </form>
      </> : <div className="student-access-notice"><ShieldCheck size={18}/><p>The invitation is unavailable. Ask the learner to request a new link, or contact StudySpace to arrange in-person verification through Monitor.</p></div>}
      <p className="guardian-consent-small">This link is private, expires after 14 days and can be used once. Do not forward it to anyone other than the parent or legal guardian.</p>
    </section>
  </main>;
}
