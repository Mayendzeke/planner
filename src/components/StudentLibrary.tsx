import { useEffect, useState } from "react";
import { BookOpen, FileText, FolderOpen, Plus, Trash2, Upload, X, Eye, AlertCircle } from "lucide-react";
import { plannerDb, type StudentResource, type Subject } from "../data/db";

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".rtf"];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function StudentLibrary({ subjects = [] }: { subjects?: Subject[] }) {
  const [files, setFiles] = useState<StudentResource[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [resourceType, setResourceType] = useState<"Study notes" | "Revision notes">("Study notes");
  const [topic, setTopic] = useState("");
  const [viewing, setViewing] = useState<StudentResource | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewText, setPreviewText] = useState("");

  async function refresh() {
    const stored = await plannerDb.resources.orderBy("createdAt").reverse().toArray();
    setFiles(stored);
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!viewing) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(viewing.file); setPreviewUrl(url); setPreviewText("");
    const ext = viewing.name.toLowerCase().slice(viewing.name.lastIndexOf("."));
    if (ext === ".txt" || ext === ".rtf") void viewing.file.text().then(setPreviewText).catch(() => setPreviewText("Unable to read this file."));
    return () => URL.revokeObjectURL(url);
  }, [viewing]);
  useEffect(() => {
    if (!viewing) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setViewing(null); };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [viewing]);

  async function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setMessage("");
    const accepted: StudentResource[] = [];
    for (const file of selected) {
      const lower = file.name.toLowerCase();
      if (!ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
        setMessage(file.name + " was skipped. Choose a PDF, TXT or RTF file. Other document formats will be enabled when their in-app viewers are ready.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setMessage(file.name + " is larger than the 30 MB per-file limit.");
        continue;
      }
      accepted.push({
        id: Date.now() + accepted.length,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        file,
        createdAt: new Date().toISOString(),
        subjectId: subjectId ? Number(subjectId) : undefined,
        resourceType,
        topic: topic.trim() || undefined
      });
    }
    if (!accepted.length) return;
    setBusy(true);
    try {
      await plannerDb.resources.bulkAdd(accepted);
      await refresh();
      setMessage(accepted.length + " file(s) added to your personal library on this device.");
    } catch {
      setMessage("The files could not be saved. Your browser may be low on storage space.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(resource: StudentResource) {
    if (!window.confirm("Remove " + resource.name + " from this device?")) return;
    await plannerDb.resources.delete(resource.id);
    await refresh();
  }

  return <section className="library-page">
    <div className="library-intro glass-panel">
      <div className="library-intro-icon"><BookOpen size={22}/></div>
      <div><h2>Your personal learning library</h2><p>Organise notes by subject and learning purpose so they appear in the correct Study &amp; Exams section.</p></div>
      <div className="library-upload-fields"><label>Subject<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">Personal / unassigned</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Resource type<select value={resourceType} onChange={e=>setResourceType(e.target.value as "Study notes"|"Revision notes")}><option>Study notes</option><option>Revision notes</option></select></label><label>Topic (optional)<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Algebra"/></label></div>
      <label className="primary-button library-upload"><Upload size={16}/> Add files<input type="file" multiple accept=".pdf,.txt,.rtf" onChange={event => void addFiles(event)} disabled={busy}/></label>
    </div>
    <div className="library-privacy"><FolderOpen size={15}/><span>Private to this browser and device for now. These files are not sent to your teacher or synced to another device.</span></div>
    <div className="library-privacy"><FolderOpen size={15}/><span>Files remain in this browser. View them inside Studyspace; no download action is provided.</span></div>
    {message && <p className="library-message" role="status">{message}</p>}
    <div className="glass-panel library-list">
      <div className="section-heading"><div><h2>My resources</h2><p>{files.length} saved file(s) · up to 30 MB per file</p></div><FileText size={20}/></div>
      {files.length ? <div className="library-files">{files.map(file => <article className="library-file" key={file.id}>
        <span className="library-file-icon"><FileText size={18}/></span>
        <div className="library-file-copy"><strong>{file.name}</strong><span>{formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}</span></div>
        <button className="icon-button" aria-label={"View " + file.name} title="View in Studyspace" onClick={() => setViewing(file)}><Eye size={16}/></button>
        <button className="icon-button" aria-label={"Remove " + file.name} title="Remove" onClick={() => void removeFile(file)}><Trash2 size={16}/></button>
      </article>)}</div> : <div className="library-empty"><div><BookOpen size={24}/></div><strong>Your library is ready</strong><p>Add your own textbooks, PDFs, class notes or worksheets. They will be kept on this device for offline access.</p><label className="secondary-button library-upload"><Plus size={15}/> Choose your first files<input type="file" multiple accept=".pdf,.txt,.rtf" onChange={event => void addFiles(event)} disabled={busy}/></label></div>}
    </div>
    {viewing && <div className="modal-backdrop library-viewer-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setViewing(null); }}>
      <section className="library-viewer" role="dialog" aria-modal="true" aria-label={"Viewing " + viewing.name}>
        <header className="library-viewer-header"><div><span>STUDYSPACE VIEWER</span><strong>{viewing.name}</strong></div><button className="icon-button" onClick={() => setViewing(null)} aria-label="Close viewer"><X size={19}/></button></header>
        <div className="library-viewer-content">
          {previewUrl && viewing.name.toLowerCase().endsWith(".pdf") && <iframe title={viewing.name} src={previewUrl + "#toolbar=0&navpanes=0"} />}
          {(viewing.name.toLowerCase().endsWith(".txt") || viewing.name.toLowerCase().endsWith(".rtf")) && <pre>{previewText || "Loading preview…"}</pre>}
          {![".pdf",".txt",".rtf"].some(ext => viewing.name.toLowerCase().endsWith(ext)) && <div className="library-viewer-unsupported"><AlertCircle size={28}/><strong>This format is not yet supported by the in-app preview.</strong><p>The file stays here. Studyspace will not open it in another app or offer it for download.</p></div>}
        </div><footer className="library-viewer-footer">In-app viewing only · No download option</footer>
      </section>
    </div>}
  </section>;
}
