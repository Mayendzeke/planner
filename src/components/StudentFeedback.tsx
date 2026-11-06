import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LifeBuoy, MessageCircle, MessageSquarePlus, Send, X } from "lucide-react";
import { supabase } from "../lib/supabase";

const SUPPORT_WHATSAPP = ["2687994", "0955"].join("");
const categories = ["Bug report", "Suggestion", "Content issue", "Accessibility", "Other"] as const;

export default function StudentFeedback({ currentPage }: { currentPage: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("Suggestion");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

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
      });
      if (insertError) throw new Error("Your feedback could not be saved: " + insertError.message);
      setNotice({ kind: "success", text: "Thank you. Your feedback has been sent privately to the Studyspace team." });
      setMessage("");
      setContactEmail("");
      setFile(null);
      setCategory("Suggestion");
    } catch (reason) {
      if (uploadedPath) {
        try { await supabase.storage.from("studyspace-feedback").remove([uploadedPath]); } catch { /* Keep the original submission error. */ }
      }
      setNotice({ kind: "error", text: reason instanceof Error ? reason.message : "Feedback could not be sent. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="student-feedback-launcher" onClick={() => { setOpen(true); setNotice(null); }} aria-haspopup="dialog">
      <MessageSquarePlus size={17} /><span>Help &amp; feedback</span>
    </button>
    {open && <div className="student-feedback-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="student-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="student-feedback-title">
        <header className="student-feedback-header">
          <div className="student-feedback-heading-icon"><LifeBuoy size={20} /></div>
          <div><span className="eyebrow">WE’RE LISTENING</span><h2 id="student-feedback-title">Help us improve Studyspace</h2><p>Report a problem, suggest an idea or tell us what would make studying easier.</p></div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} disabled={busy} aria-label="Close feedback"><X size={18}/></button>
        </header>
        <form onSubmit={event => void submit(event)} className="student-feedback-form">
          <label className="field-label">What is this about?
            <select value={category} onChange={event => setCategory(event.target.value as (typeof categories)[number])}>
              {categories.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field-label">Tell us what happened or what you would like to see
            <textarea required minLength={10} maxLength={4000} rows={5} value={message} onChange={event => setMessage(event.target.value)} placeholder="Describe the steps, what you expected, and what happened instead…" />
            <span className="student-feedback-counter">{message.length}/4000</span>
          </label>
          <div className="student-feedback-upload">
            <div><strong><ImagePlus size={16}/> Screenshot (optional)</strong><span>PNG, JPG or WebP · maximum 5 MB</span></div>
            <label className="secondary-button upload-button"><ImagePlus size={15}/> {file ? "Change image" : "Attach image"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => chooseFile(event.target.files?.[0] || null)} /></label>
          </div>
          {preview && <div className="student-feedback-preview"><img src={preview} alt="Screenshot attached to feedback"/><button type="button" className="icon-button" onClick={() => setFile(null)} aria-label="Remove screenshot"><X size={15}/></button></div>}
          <label className="field-label">Email address (optional)
            <input type="email" maxLength={254} value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="Only if you would like us to reply" />
          </label>
          <a className="student-feedback-whatsapp" href="https://wa.me/${SUPPORT_WHATSAPP}" target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/><span><strong>Prefer WhatsApp?</strong><small>Chat with the Studyspace team on +268 7994 0955</small></span><span className="student-feedback-whatsapp-arrow">↗</span></a>
          <p className="student-feedback-privacy"><AlertCircle size={14}/> Please do not include passwords, private account details or sensitive personal information in your message or screenshot. Your report is sent privately to the Studyspace team.</p>
          {notice && <p className={"student-feedback-notice " + notice.kind} role="status">{notice.kind === "success" ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>} {notice.text}</p>}
          <div className="student-feedback-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)} disabled={busy}>Close</button><button type="submit" className="primary-button" disabled={busy}><Send size={15}/>{busy ? "Sending…" : "Send feedback"}</button></div>
        </form>
      </section>
    </div>}
  </>;
}
