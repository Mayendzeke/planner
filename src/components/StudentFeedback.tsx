import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LifeBuoy, MessageCircle, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

const SUPPORT_WHATSAPP = ["2687994", "0955"].join("");
const categories = ["Bug report", "Suggestion", "Content issue", "Accessibility", "Testimonial", "Other"] as const;
const testimonialBackgrounds = [
  { id: "ocean", label: "Ocean", swatch: "linear-gradient(135deg, #0b6477, #123b65)" },
  { id: "violet", label: "Violet", swatch: "linear-gradient(135deg, #6d43a8, #30245f)" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg, #f08a52, #9c3c66)" },
  { id: "emerald", label: "Emerald", swatch: "linear-gradient(135deg, #18856d, #174d48)" },
  { id: "rose", label: "Rose", swatch: "linear-gradient(135deg, #d66b91, #7b385e)" },
  { id: "gold", label: "Gold", swatch: "linear-gradient(135deg, #d6a63d, #80552c)" },
  { id: "midnight", label: "Midnight", swatch: "linear-gradient(135deg, #34445f, #101827)" },
] as const;

export default function StudentFeedback({ currentPage }: { currentPage: string }) {
  const [category, setCategory] = useState<(typeof categories)[number]>("Suggestion");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [testimonialConsent, setTestimonialConsent] = useState(false);
  const [testimonialMarketingConsent, setTestimonialMarketingConsent] = useState(false);
  const [testimonialBackground, setTestimonialBackground] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);


  function chooseFile(next: File | null) {
    if (!next) { setFile(null); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) {
      setNotice({ kind: "error", text: "Choose a PNG, JPG or WebP image." });
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setNotice({ kind: "error", text: "The screenshot must be 5 MB or smaller." });
      return;
    }
    setFile(next);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    const cleanMessage = message.trim();
    if (category === "Testimonial" && !testimonialBackground) {
      setNotice({ kind: "error", text: "Please choose a background colour for your testimonial card." });
      return;
    }
    if (category === "Testimonial" && !testimonialConsent) {
      setNotice({ kind: "error", text: "Please confirm that your testimonial may be reviewed privately by the StudySpace administrator." });
      return;
    }
    if (cleanMessage.length < 10) {
      setNotice({ kind: "error", text: "Please describe the issue or suggestion in at least 10 characters." });
      return;
    }
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Your secure session has expired. Sign in again and retry.");
      if (file) {
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        uploadedPath = auth.user.id + "/" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("studyspace-feedback").upload(uploadedPath, file, {
          contentType: file.type, cacheControl: "3600", upsert: false,
        });
        if (uploadError) throw new Error("Screenshot upload failed: " + uploadError.message);
      }
      const { error: insertError } = await supabase.from("student_feedback").insert({
        learner_id: auth.user.id,
        category,
        message: cleanMessage,
        page: currentPage.slice(0, 120),
        contact_email: contactEmail.trim() || null,
        attachment_path: uploadedPath,
        testimonial_private_consent: category === "Testimonial" && testimonialConsent,
        testimonial_marketing_consent: category === "Testimonial" && testimonialMarketingConsent,
        testimonial_background: category === "Testimonial" ? testimonialBackground : null,
      });
      if (insertError) throw new Error("Your feedback could not be saved: " + insertError.message);
      setNotice({ kind: "success", text: category === "Testimonial" ? "Thank you. Your testimonial has been sent to the private Testimonials inbox in StudySpace Monitor." : "Thank you. Your feedback has been sent privately to the Studyspace team." });
      setMessage("");
      setContactEmail("");
      setFile(null);
      setCategory("Suggestion");
      setTestimonialConsent(false);
      setTestimonialMarketingConsent(false);
      setTestimonialBackground("");
    } catch (reason) {
      if (uploadedPath) {
        try { await supabase.storage.from("studyspace-feedback").remove([uploadedPath]); } catch { /* Keep the original submission error. */ }
      }
      setNotice({ kind: "error", text: reason instanceof Error ? reason.message : "Feedback could not be sent. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="glass-panel student-feedback-page">
    <header className="student-feedback-header">
      <div className="student-feedback-heading-icon"><LifeBuoy size={20} /></div>
      <div><span className="eyebrow">STUDENT SUPPORT</span><h2 id="student-feedback-title">Help us improve Studyspace</h2><p>Report a problem, suggest an idea or share how StudySpace has helped you learn.</p></div>
    </header>
    <a className="student-feedback-whatsapp" href={"https://wa.me/" + SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/><span><strong>Prefer WhatsApp?</strong><small>Contact us on WhatsApp · +268 7994 0955</small></span><span className="student-feedback-whatsapp-arrow">↗</span></a>
    <form onSubmit={event => void submit(event)} className="student-feedback-form">
      <label className="field-label">What is this about?
        <select value={category} onChange={event => { const next = event.target.value as (typeof categories)[number]; setCategory(next); if (next !== "Testimonial") { setTestimonialConsent(false); setTestimonialMarketingConsent(false); setTestimonialBackground(""); } }}>
          {categories.map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="field-label">{category === "Testimonial" ? "Your StudySpace experience" : "Tell us what happened or what you would like to see"}
        <textarea required minLength={10} maxLength={4000} rows={5} value={message} onChange={event => setMessage(event.target.value)} placeholder={category === "Testimonial" ? "Tell us what you found useful, what improved, or how you use StudySpace…" : "Describe the steps, what you expected, and what happened instead…"} />
        <span className="student-feedback-counter">{message.length}/4000</span>
      </label>
      {category === "Testimonial" && <fieldset className="testimonial-background-picker" style={{ border: "1px solid var(--glass-border, rgba(128,148,170,.28))", borderRadius: 14, padding: 14, margin: "4px 0 16px" }}>
        <legend style={{ padding: "0 7px", fontWeight: 700 }}>Choose your testimonial background <span aria-hidden="true">*</span></legend>
        <p style={{ margin: "2px 0 12px", fontSize: 13, opacity: .78 }}>Pick the colour style you would like on your testimonial image.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {testimonialBackgrounds.map(option => <button key={option.id} type="button" onClick={() => setTestimonialBackground(option.id)} aria-label={option.label + " background"} aria-pressed={testimonialBackground === option.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 999, border: testimonialBackground === option.id ? "2px solid var(--accent, #56c9b0)" : "1px solid var(--glass-border, rgba(128,148,170,.35))", background: "transparent", color: "inherit", cursor: "pointer", font: "inherit" }}>
            <span aria-hidden="true" style={{ width: 25, height: 25, borderRadius: "50%", background: option.swatch, display: "inline-block", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.22)" }} />
            <span>{option.label}</span>
            {testimonialBackground === option.id && <CheckCircle2 size={15} />}
          </button>)}
        </div>
      </fieldset>}
      <div className="student-feedback-upload">
        <div><strong><ImagePlus size={16}/> Screenshot (optional)</strong><span>PNG, JPG or WebP · maximum 5 MB</span></div>
        <label className="secondary-button upload-button"><ImagePlus size={15}/> {file ? "Change image" : "Attach image"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => chooseFile(event.target.files?.[0] || null)} /></label>
      </div>
      {preview && <div className="student-feedback-preview"><img src={preview} alt="Screenshot attached to feedback"/><button type="button" className="secondary-button" onClick={() => setFile(null)}>Remove screenshot</button></div>}
      <label className="field-label">Email address <span className="field-optional">OPTIONAL</span>
        <input type="email" maxLength={254} value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="Only if you would like us to reply" />
      </label>
      {category === "Testimonial" && <label className="testimonial-consent"><input type="checkbox" checked={testimonialConsent} onChange={event => setTestimonialConsent(event.target.checked)}/><span><strong>I agree to private testimonial review.</strong><small>My message, preferred/full name, study level, grade/year, institution and profile picture may be viewed in the secured StudySpace Monitor inbox by the administrator. This does not give permission to publish or market my words or image.</small></span></label>}
      {category === "Testimonial" && <label className="testimonial-consent"><input type="checkbox" checked={testimonialMarketingConsent} onChange={event => setTestimonialMarketingConsent(event.target.checked)}/><span><strong>Optional: I give permission for marketing use.</strong><small>StudySpace may use the words of this testimonial, my preferred name and school in a promotional image using the background colour I selected. My student ID, contact details and profile photo will not be included. This is voluntary and does not affect my account or access to learning.</small></span></label>}
      <p className="student-feedback-privacy"><AlertCircle size={14}/> Please do not include passwords, private account details or sensitive personal information in your message or screenshot. {category === "Testimonial" ? "Your testimonial is private and is not published publicly." : "Your report is sent privately to the Studyspace team."}</p>
      {notice && <p className={"student-feedback-notice " + notice.kind} role="status">{notice.kind === "success" ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>} {notice.text}</p>}
      <div className="student-feedback-actions"><button type="submit" className="primary-button" disabled={busy}><Send size={15}/>{busy ? "Sending…" : "Send feedback"}</button></div>
    </form>
  </section>;
}
