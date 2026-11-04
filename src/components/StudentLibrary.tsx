import { useEffect, useState } from "react";
import { BookOpen, Download, FileText, FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import { plannerDb, type StudentResource, type Subject } from "../data/db";

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".epub", ".txt", ".rtf"];

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
  const [subjectId, setSubjectId] = useState("");
  const [resourceType, setResourceType] = useState<"Study notes" | "Revision notes">("Study notes");
  const [topic, setTopic] = useState("");

  async function refresh() {
    const stored = await plannerDb.resources.orderBy("createdAt").reverse().toArray();
    setFiles(stored);
  }

  useEffect(() => { void refresh(); }, []);

  async function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setMessage("");
    const accepted: StudentResource[] = [];
    for (const file of selected) {
      const lower = file.name.toLowerCase();
      if (!ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
        setMessage(file.name + " was skipped. Choose a PDF, Word, PowerPoint, EPUB, TXT or RTF file.");
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

  function openFile(resource: StudentResource, download = false) {
    const url = URL.createObjectURL(resource.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    if (download) anchor.download = resource.name;
    else anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
      <label className="primary-button library-upload"><Upload size={16}/> Add files<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.epub,.txt,.rtf" onChange={event => void addFiles(event)} disabled={busy}/></label>
    </div>
    <div className="library-privacy"><FolderOpen size={15}/><span>Private to this browser and device for now. These files are not sent to your teacher or synced to another device.</span></div>
    {message && <p className="library-message" role="status">{message}</p>}
    <div className="glass-panel library-list">
      <div className="section-heading"><div><h2>My resources</h2><p>{files.length} saved file(s) · up to 30 MB per file</p></div><FileText size={20}/></div>
      {files.length ? <div className="library-files">{files.map(file => <article className="library-file" key={file.id}>
        <span className="library-file-icon"><FileText size={18}/></span>
        <div className="library-file-copy"><strong>{file.name}</strong><span>{formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}</span></div>
        <button className="icon-button" aria-label={"Open " + file.name} title="Open" onClick={() => openFile(file)}><FolderOpen size={16}/></button>
        <button className="icon-button" aria-label={"Download " + file.name} title="Download" onClick={() => openFile(file, true)}><Download size={16}/></button>
        <button className="icon-button" aria-label={"Remove " + file.name} title="Remove" onClick={() => void removeFile(file)}><Trash2 size={16}/></button>
      </article>)}</div> : <div className="library-empty"><div><BookOpen size={24}/></div><strong>Your library is ready</strong><p>Add your own textbooks, PDFs, class notes or worksheets. They will be kept on this device for offline access.</p><label className="secondary-button library-upload"><Plus size={15}/> Choose your first files<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.epub,.txt,.rtf" onChange={event => void addFiles(event)} disabled={busy}/></label></div>}
    </div>
  </section>;
}
