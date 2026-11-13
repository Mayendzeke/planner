import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircle, BookOpen, Brain, Download, Eye, FileSpreadsheet, FileText, FolderOpen,
  Image as ImageIcon, Plus, Presentation, Search, ShieldCheck, Trash2, Upload, X,
} from "lucide-react";
import PdfViewer from "./PdfViewer";
import { plannerDb, type StudentResource, type Subject } from "../data/db";
import { supabase } from "../lib/supabase";
import { readStudyMaterialPreview, type StudyMaterialPreview } from "../lib/studyMaterialPreview";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_BATCH_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".pptx", ".ppt", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".txt", ".rtf"];
type ResourceType = NonNullable<StudentResource["resourceType"]>;
type TeacherResource = {
  id: string; title: string; description: string; subject_name: string; topic?: string;
  resource_type?: string; storage_path: string; mime_type: string; file_size: number; created_at: string;
};
type PreviewState = StudyMaterialPreview | { kind: "loading" } | { kind: "pdf" } | { kind: "image" };
const resourceTypes: ResourceType[] = ["Study notes", "Revision notes", "Worksheet", "Past paper", "Reference", "Other"];

function extensionOf(name: string) { return name.toLowerCase().slice(name.lastIndexOf(".")); }
function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "File size unavailable";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function fileType(name: string) { return extensionOf(name).replace(".", "").toUpperCase() || "FILE"; }
function formatCategory(value?: string) {
  if (value === "Notes") return "Study notes";
  if (value === "Revision") return "Revision notes";
  return value || "Study notes";
}
function subjectName(resource: StudentResource, subjects: Subject[]) {
  return resource.subjectId == null ? "Personal / unassigned" : subjects.find(subject => subject.id === resource.subjectId)?.name || "Personal / unassigned";
}
function downloadFile(resource: Pick<StudentResource, "file" | "name">) {
  const url = URL.createObjectURL(resource.file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resource.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const MIA_ATTACHMENT_LIMIT = 4 * 1024 * 1024;
const MIA_STUDY_PROMPT = "Please turn this material into a clear study guide for my level and curriculum. Explain the key ideas in simple language, highlight important definitions or formulas, include one worked example, then create five practice questions and let me answer them one at a time.";

function canStudyWithMia(name: string, size: number) {
  const extension = extensionOf(name);
  return size > 0 && size <= MIA_ATTACHMENT_LIMIT
    && [".pdf", ".txt", ".md", ".csv", ".json", ".xml", ".html", ".docx", ".pptx", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"].includes(extension);
}

export default function StudentLibrary({ subjects = [], onAskMia }: { subjects?: Subject[]; onAskMia: (file: File, prompt: string) => void }) {
  const [files, setFiles] = useState<StudentResource[]>([]);
  const [teacherFiles, setTeacherFiles] = useState<TeacherResource[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherBusyId, setTeacherBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("Study notes");
  const [topic, setTopic] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [viewing, setViewing] = useState<StudentResource | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  async function refresh() {
    try {
      const stored = await plannerDb.resources.orderBy("createdAt").reverse().toArray();
      setFiles(stored);
    } catch {
      setMessage("Your personal library could not be read from this device.");
      setMessageIsError(true);
    }
  }

  async function refreshTeacherFiles() {
    if (!supabase) { setTeacherLoading(false); return; }
    try {
      const { data: authState, error: authError } = await supabase.auth.getUser();
      if (authError || !authState.user) throw new Error("Sign in again to load your assigned resources.");
      const { data: assignments, error: assignmentError } = await supabase
        .from("resource_assignments").select("resource_id").eq("learner_id", authState.user.id);
      if (assignmentError) throw assignmentError;
      const ids = (assignments ?? []).map(row => row.resource_id).filter(Boolean);
      if (!ids.length) { setTeacherFiles([]); return; }
      const { data, error } = await supabase.from("learning_resources")
        .select("id,title,description,subject_name,topic,resource_type,storage_path,mime_type,file_size,created_at")
        .in("id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      setTeacherFiles((data ?? []) as TeacherResource[]);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Teacher resources could not be loaded.");
      setMessageIsError(true);
    } finally { setTeacherLoading(false); }
  }

  useEffect(() => {
    void refresh();
    void refreshTeacherFiles();
    const interval = window.setInterval(() => void refreshTeacherFiles(), 30000);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshTeacherFiles(); };
    window.addEventListener("focus", onVisible);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onVisible); };
  }, []);

  useEffect(() => {
    if (!viewing) { setPreview({ kind: "loading" }); setPreviewImageUrl(""); return; }
    setPreview({ kind: "loading" });
    let active = true;
    let imageUrl = "";
    const extension = extensionOf(viewing.name);
    const prepare = async () => {
      if (extension === ".pdf") {
        if (active) setPreview({ kind: "pdf" });
      } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
        imageUrl = URL.createObjectURL(viewing.file);
        if (active) { setPreviewImageUrl(imageUrl); setPreview({ kind: "image" }); }
      } else {
        const result = await readStudyMaterialPreview(viewing.file, viewing.name);
        if (active) setPreview(result);
      }
    };
    void prepare().catch(() => {
      if (active) setPreview({ kind: "unsupported", message: "This file could not be previewed. You can still download the original." });
    });
    return () => {
      active = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [viewing]);

  useEffect(() => {
    if (!viewing) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setViewing(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [viewing]);

  function queueFiles(incoming: FileList | File[]) {
    const selected = Array.from(incoming);
    if (!selected.length) return;
    const next = [...pendingFiles];
    const skipped: string[] = [];
    let added = 0;
    for (const file of selected) {
      const extension = extensionOf(file.name);
      if (!ALLOWED_EXTENSIONS.includes(extension)) { skipped.push(file.name + " — unsupported format"); continue; }
      if (file.size > MAX_FILE_SIZE) { skipped.push(file.name + " — over the 25 MB per-file limit"); continue; }
      if (next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
        skipped.push(file.name + " — already in this upload batch"); continue;
      }
      const total = next.reduce((sum, item) => sum + item.size, 0);
      if (total + file.size > MAX_BATCH_SIZE) { skipped.push(file.name + " — the batch limit is 100 MB"); continue; }
      next.push(file);
      added++;
    }
    setPendingFiles(next);
    setMessageIsError(skipped.length > 0);
    setMessage(skipped.length ? skipped.slice(0, 3).join("; ") + (skipped.length > 3 ? "; and " + (skipped.length - 3) + " more." : ".") : added ? added + " file(s) ready to add." : "");
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    queueFiles(event.target.files ?? []);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    queueFiles(event.dataTransfer.files);
  }

  async function savePendingFiles() {
    if (!pendingFiles.length || busy) return;
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const usedIds = new Set(files.map(item => item.id));
      let firstId = Date.now();
      while (pendingFiles.some((_, index) => usedIds.has(firstId + index))) firstId++;
      const createdAt = new Date().toISOString();
      const records: StudentResource[] = pendingFiles.map((file, index) => ({
        id: firstId + index,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        file,
        createdAt,
        subjectId: subjectId ? Number(subjectId) : undefined,
        resourceType,
        topic: topic.trim() || undefined,
      }));
      await plannerDb.resources.bulkAdd(records);
      await refresh();
      setPendingFiles([]);
      setMessage(records.length + " material(s) saved. They will sync privately to your StudySpace account when you are online.");
    } catch {
      setMessage("The upload batch could not be saved. Check available device storage and try a smaller batch.");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function studyTeacherFileWithMia(resource: TeacherResource) {
    if (!supabase || teacherBusyId) return;
    setTeacherBusyId(resource.id);
    setMessage("");
    setMessageIsError(false);
    try {
      const { data, error } = await supabase.storage.from("studyspace-resources").download(resource.storage_path);
      if (error) throw error;
      const file = new File([data], resource.title, { type: resource.mime_type || data.type || "application/octet-stream" });
      onAskMia(file, MIA_STUDY_PROMPT);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "This material could not be attached to MIΛ.");
      setMessageIsError(true);
    } finally { setTeacherBusyId(""); }
  }

  async function viewTeacherFile(resource: TeacherResource) {
    if (!supabase || teacherBusyId) return;
    setTeacherBusyId(resource.id);
    setMessage("");
    try {
      const { data, error } = await supabase.storage.from("studyspace-resources").download(resource.storage_path);
      if (error) throw error;
      setViewing({
        id: Date.now(),
        name: resource.title,
        mimeType: resource.mime_type || "application/octet-stream",
        size: Number(resource.file_size),
        file: data,
        createdAt: resource.created_at,
        resourceType: "Other",
        topic: resource.topic || "",
      });
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The teacher's file could not be opened.");
      setMessageIsError(true);
    } finally { setTeacherBusyId(""); }
  }

  async function removeFile(resource: StudentResource) {
    if (!window.confirm("Remove " + resource.name + " from your personal library? It will also be removed from your synced personal library.")) return;
    try {
      await plannerDb.resources.delete(resource.id);
      await refresh();
      setMessage("The material was removed from your personal library.");
      setMessageIsError(false);
    } catch {
      setMessage("The material could not be removed. Try again.");
      setMessageIsError(true);
    }
  }

  const subjectsForFilter = Array.from(new Set([
    ...subjects.map(item => item.name),
    ...teacherFiles.map(item => item.subject_name || "General"),
  ])).filter(Boolean).sort((a,b)=>a.localeCompare(b));

  const matchesFilters = (name: string, subject: string, category: string) => {
    const search = searchTerm.trim().toLocaleLowerCase();
    const matchesSearch = !search || [name, subject, category].some(value => value.toLocaleLowerCase().includes(search));
    return matchesSearch && (filterSubject === "All" || subject === filterSubject) && (filterType === "All" || fileType(name) === filterType);
  };
  const visibleTeacherFiles = filterSource === "Personal" ? [] : teacherFiles.filter(item =>
    matchesFilters(item.title, item.subject_name || "General", item.resource_type || "Other"));
  const visiblePersonalFiles = filterSource === "Teacher" ? [] : files.filter(item =>
    matchesFilters(item.name, subjectName(item, subjects), item.resourceType || "Study notes"));

  function downloadResource(resource: StudentResource) { downloadFile(resource); }

  return (
    <section className="library-page">
      <section className="library-hero">
        <div className="library-hero-copy">
          <span className="library-hero-kicker"><BookOpen size={13}/> YOUR STUDY MATERIALS</span>
          <h2>Everything you need to learn, in one place.</h2>
          <p>Keep teacher-assigned resources and your own study files together. Preview supported documents, organise them by subject and continue studying when you are offline.</p>
          <div className="library-hero-stats">
            <span><strong>{teacherFiles.length}</strong> teacher resources</span>
            <span><strong>{files.length}</strong> personal materials</span>
            <span><ShieldCheck size={12}/> Private to your account</span>
          </div>
        </div>
        <div className="library-hero-art" aria-hidden="true"><div className="library-hero-art-mark"><BookOpen size={34}/></div><strong>YOUR LIBRARY</strong><small>Organised. Private. Ready.</small></div>
      </section>

      <section className="glass-panel library-upload-panel">
        <div className="library-section-heading">
          <div><h3>Add your study materials</h3><p>Choose files or drag them into the upload area. Add several at once and organise the whole batch together.</p></div>
          <Upload size={20}/>
        </div>
        <div className={"library-dropzone" + (dragging ? " is-dragging" : "")}
          onDragEnter={event=>{event.preventDefault();setDragging(true);}}
          onDragOver={event=>{event.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}>
          <FolderOpen size={27}/>
          <strong>Drop your files here</strong>
          <p>PDF, PowerPoint, Word, Excel, CSV, images and text files. Up to 25 MB per file and 100 MB per upload batch.</p>
          <label className="primary-button library-browse"><Plus size={15}/> Browse files<input type="file" multiple accept={ALLOWED_EXTENSIONS.join(",")} onChange={onFileInput}/></label>
          <div className="library-format-list">{["PDF","PPTX","PPT","DOCX","DOC","XLSX","XLS","CSV","JPG","PNG","WEBP","TXT","RTF"].map(format=><span key={format}>{format}</span>)}</div>
        </div>
        <div className="library-upload-meta">
          <label>Subject
            <select value={subjectId} onChange={event=>setSubjectId(event.target.value)}>
              <option value="">Personal / unassigned</option>
              {subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label>Material type
            <select value={resourceType} onChange={event=>setResourceType(event.target.value as ResourceType)}>
              {resourceTypes.map(type=><option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Topic or chapter (optional)
            <input value={topic} onChange={event=>setTopic(event.target.value)} maxLength={120} placeholder="e.g. Algebra, photosynthesis"/>
          </label>
        </div>
        {pendingFiles.length>0&&<div className="library-queue">
          <div className="library-queue-head"><strong>Upload batch · {pendingFiles.length} file(s)</strong><span>{formatSize(pendingFiles.reduce((sum,file)=>sum+file.size,0))} selected</span></div>
          <div className="library-queue-list">{pendingFiles.map((file,index)=><div className="library-queue-item" key={file.name+"-"+file.size+"-"+file.lastModified}>
            <FileText size={15}/><span>{file.name}</span><small>{formatSize(file.size)}</small>
            <button type="button" aria-label={"Remove "+file.name+" from upload batch"} onClick={()=>setPendingFiles(current=>current.filter((_,i)=>i!==index))}><X size={14}/></button>
          </div>)}</div>
          <div className="library-upload-actions">
            <span>All selected files will use the subject and material type chosen above.</span>
            <button type="button" className="primary-button" onClick={()=>void savePendingFiles()} disabled={busy}>{busy?"Saving materials…":"Save " + pendingFiles.length + " material(s)"}</button>
          </div>
        </div>}
      </section>

      <div className="library-privacy"><ShieldCheck size={15}/><span>Your personal materials are saved on this device and synchronise privately to your StudySpace account when online. The offline copy lets you keep working without a connection.</span></div>
      <div className="library-privacy"><BookOpen size={15}/><span>Teacher-assigned materials appear below. Only resources assigned to your signed-in student account can be opened.</span></div>
      {message&&<p className={"library-message"+(messageIsError?" is-error":"")} role={messageIsError?"alert":"status"}>{message}</p>}

      <section className="glass-panel library-list">
        <div className="library-section-heading"><div><h3>Find a material</h3><p>Search by title, subject or file format. Filters update immediately.</p></div><Search size={19}/></div>
        <div className="library-toolbar">
          <label className="library-search"><Search size={15}/><input value={searchTerm} onChange={event=>setSearchTerm(event.target.value)} placeholder="Search materials…"/></label>
          <select aria-label="Filter by source" value={filterSource} onChange={event=>setFilterSource(event.target.value)}><option>All</option><option>Teacher</option><option>Personal</option></select>
          <select aria-label="Filter by subject" value={filterSubject} onChange={event=>setFilterSubject(event.target.value)}><option>All</option>{subjectsForFilter.map(subject=><option key={subject}>{subject}</option>)}</select>
          <select aria-label="Filter by file format" value={filterType} onChange={event=>setFilterType(event.target.value)}><option>All</option>{["PDF","PPTX","PPT","DOCX","DOC","XLSX","XLS","CSV","JPG","JPEG","PNG","WEBP","TXT","RTF"].map(type=><option key={type}>{type}</option>)}</select>
        </div>
      </section>

      {(filterSource==="All"||filterSource==="Teacher")&&<section className="glass-panel library-list">
        <div className="library-section-heading"><div><h3>From your teacher</h3><p>{visibleTeacherFiles.length} assigned resource(s) shown · opens only for your account</p></div><BookOpen size={19}/></div>
        {teacherLoading?<div className="library-empty"><strong>Loading assigned materials…</strong></div>:visibleTeacherFiles.length?<div className="library-files">{visibleTeacherFiles.map(file=><article className="library-file" key={file.id}>
          <span className="library-file-icon"><FileText size={18}/></span>
          <div className="library-file-copy"><strong>{file.title}</strong><span>{file.subject_name||"General"} · {formatCategory(file.resource_type)} · {fileType(file.title)} · {formatSize(Number(file.file_size))}</span>{file.description&&<span>{file.description}</span>}</div>
          <div className="library-file-actions">
            <button type="button" className="icon-button" aria-label={"Download "+file.title} title="Download original file" disabled={teacherBusyId===file.id} onClick={()=>void (async()=>{if(!supabase)return;setTeacherBusyId(file.id);try{const {data,error}=await supabase.storage.from("studyspace-resources").download(file.storage_path);if(error)throw error;downloadFile({file:data,name:file.title});}catch(reason){setMessage(reason instanceof Error?reason.message:"The file could not be downloaded.");setMessageIsError(true);}finally{setTeacherBusyId("");}})()}><Download size={15}/></button>
            {canStudyWithMia(file.title, Number(file.file_size))&&<button type="button" className="icon-button" aria-label={"Study "+file.title+" with MIΛ"} title="Study with MIΛ · summarise, explain and practise" disabled={teacherBusyId===file.id} onClick={()=>void studyTeacherFileWithMia(file)}><Brain size={15}/></button>}
            <button type="button" className="icon-button" aria-label={"Preview "+file.title} title="Preview material" disabled={teacherBusyId===file.id} onClick={()=>void viewTeacherFile(file)}><Eye size={15}/></button>
          </div>
        </article>)}</div>:<div className="library-empty"><div><BookOpen size={23}/></div><strong>No teacher materials match</strong><p>When your teacher assigns materials, they will appear here. Try changing the filters if you expected to see a file.</p></div>}
      </section>}

      {(filterSource==="All"||filterSource==="Personal")&&<section className="glass-panel library-list">
        <div className="library-section-heading"><div><h3>My personal materials</h3><p>{visiblePersonalFiles.length} of {files.length} personal file(s) shown · available offline after sync</p></div><FileText size={19}/></div>
        {visiblePersonalFiles.length?<div className="library-files">{visiblePersonalFiles.map(file=><article className="library-file" key={file.id}>
          <span className="library-file-icon">{[".jpg",".jpeg",".png",".webp"].includes(extensionOf(file.name))?<ImageIcon size={18}/>:extensionOf(file.name)===".pptx"?<Presentation size={18}/>:extensionOf(file.name)===".xlsx"||extensionOf(file.name)===".xls"?<FileSpreadsheet size={18}/>:<FileText size={18}/>}</span>
          <div className="library-file-copy"><strong>{file.name}</strong><span>{subjectName(file,subjects)} · {file.resourceType||"Study notes"} · {fileType(file.name)} · {formatSize(file.size)}</span>{file.topic&&<span>{file.topic}</span>}</div>
          <div className="library-file-actions">
            <button type="button" className="icon-button" aria-label={"Download "+file.name} title="Download original file" onClick={()=>downloadResource(file)}><Download size={15}/></button>
            {canStudyWithMia(file.name, file.size)&&<button type="button" className="icon-button" aria-label={"Study "+file.name+" with MIΛ"} title="Study with MIΛ · summarise, explain and practise" onClick={()=>onAskMia(new File([file.file],file.name,{type:file.mimeType||file.file.type||"application/octet-stream"}),MIA_STUDY_PROMPT)}><Brain size={15}/></button>}
            <button type="button" className="icon-button" aria-label={"Preview "+file.name} title="Preview material" onClick={()=>setViewing(file)}><Eye size={15}/></button>
            <button type="button" className="icon-button" aria-label={"Remove "+file.name} title="Remove from personal library" onClick={()=>void removeFile(file)}><Trash2 size={15}/></button>
          </div>
        </article>)}</div>:<div className="library-empty"><div><FolderOpen size={23}/></div><strong>Your personal library is ready</strong><p>Save notes, presentations, worksheets, images and spreadsheets here. Choose files above to begin building your own study collection.</p></div>}
      </section>}

      {viewing&&<div className="modal-backdrop library-viewer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setViewing(null);}}>
        <section className="library-viewer" role="dialog" aria-modal="true" aria-label={"Previewing "+viewing.name}>
          <header className="library-viewer-header"><div><span>STUDYSPACE MATERIAL PREVIEW</span><strong>{viewing.name}</strong></div>
            <div className="library-viewer-header-actions"><button type="button" className="icon-button" aria-label="Download original file" title="Download original file" onClick={()=>downloadResource(viewing)}><Download size={16}/></button><button type="button" className="icon-button" aria-label="Close preview" onClick={()=>setViewing(null)}><X size={18}/></button></div>
          </header>
          <div className="library-viewer-content">
            {preview.kind==="loading"&&<div className="library-empty"><strong>Preparing preview…</strong></div>}
            {preview.kind==="pdf"&&<PdfViewer file={viewing.file} fileName={viewing.name}/>}
            {preview.kind==="image"&&previewImageUrl&&<img src={previewImageUrl} alt={viewing.name} style={{display:"block",maxWidth:"100%",maxHeight:"100%",margin:"0 auto",objectFit:"contain"}}/>}
            {preview.kind==="text"&&<pre className="library-preview-text">{preview.text||"No readable text was found in this file."}</pre>}
            {preview.kind==="slides"&&<><div className="library-preview-note"><Presentation size={14}/><span>Slide text preview. The original presentation remains available to download; embedded graphics and exact slide layout are not shown in this preview.</span></div><div className="library-preview-slides">{preview.slides.map(slide=><article className="library-preview-slide" key={slide.number}><div className="library-preview-slide-head"><span>SLIDE {String(slide.number).padStart(2,"0")}</span><span>POWERPOINT</span></div><h4>{slide.title}</h4>{slide.body&&<p>{slide.body}</p>}</article>)}</div></>}
            {preview.kind==="table"&&<><div className="library-preview-note"><FileSpreadsheet size={14}/><span>Spreadsheet preview · showing the first worksheet and up to 100 rows. Download the original for full formulas, formatting and workbook features.</span></div><div className="library-preview-table-wrap"><table className="library-preview-table"><tbody>{preview.rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></>}
            {preview.kind==="unsupported"&&<div className="library-empty"><div><AlertCircle size={24}/></div><strong>Preview not available</strong><p>{preview.message}</p><button type="button" className="primary-button" onClick={()=>downloadResource(viewing)}><Download size={15}/> Download original file</button></div>}
          </div>
          <footer className="library-viewer-footer">Private StudySpace file · Original file download remains available</footer>
        </section>
      </div>}
    </section>
  );
}
