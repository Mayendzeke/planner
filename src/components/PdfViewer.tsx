import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Download, FileSignature, Highlighter,
  Minus, Pen, Plus, Save, Search, Type, Undo2, Upload, ZoomIn, ZoomOut,
} from "lucide-react";
import { supabase } from "../lib/supabase";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type MarkTool = "pen" | "highlight" | "text" | "signature";
type Point = { x: number; y: number };
type PdfMark = {
  id: string;
  page: number;
  tool: MarkTool;
  points?: Point[];
  text?: string;
  color?: string;
  width?: number;
};
type FormField = { name: string; kind: string; options?: string[] };

export default function PdfViewer({
  file,
  fileName,
  resourceKey,
}: {
  file: Blob;
  fileName: string;
  resourceKey: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [tool, setTool] = useState<"hand" | MarkTool | "fill">("hand");
  const [marks, setMarks] = useState<PdfMark[]>([]);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [penColor, setPenColor] = useState("#6a5ad8");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showFillPanel, setShowFillPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline" | "submitted">("saving");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [learnerId, setLearnerId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const drawingTool = tool === "pen" || tool === "highlight";
  const currentPageMarks = useMemo(() => marks.filter(mark => mark.page === page), [marks, page]);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setLoading(true);
    setError("");
    setDocumentProxy(null);
    setPage(1);
    setWorkspaceReady(false);
    setMarks([]);
    setFormValues({});
    setFormFields([]);
    setSubmitted(false);
    file.arrayBuffer()
      .then(buffer => pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise)
      .then(async pdf => {
        loaded = pdf;
        if (cancelled) { void pdf.destroy(); return; }
        setDocumentProxy(pdf);
        setPageCount(pdf.numPages);
        setLoading(false);
        try {
          const editable = await PDFDocument.load(buffer.slice(0));
          const fields = editable.getForm().getFields();
          const defs = fields.map(field => {
            const kind = String((field as any).constructor?.name || "Field");
            const name = field.getName();
            return { name, kind };
          });
          if (!cancelled) setFormFields(defs);
        } catch {
          // Encrypted or XFA documents may render in PDF.js but not expose AcroForm fields to pdf-lib.
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("This PDF could not be opened. It may be damaged, password-protected or use unsupported features.");
          setLoading(false);
          setWorkspaceReady(true);
        }
      });
    return () => { cancelled = true; if (loaded) void loaded.destroy(); };
  }, [file]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    const restore = async () => {
      const localKey = "studyspace:document-work:" + resourceKey;
      let local: any = null;
      try { local = JSON.parse(localStorage.getItem(localKey) || "null"); } catch { local = null; }
      if (local && active) {
        setMarks(Array.isArray(local.annotations) ? local.annotations : []);
        setFormValues(local.form_values && typeof local.form_values === "object" ? local.form_values : {});
        setSubmitted(Boolean(local.submitted));
      }
      if (!supabase) { if (active) { setSaveState("offline"); setWorkspaceReady(true); } return; }
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("No signed-in student");
        if (!active) return;
        setLearnerId(auth.user.id);
        const { data, error: readError } = await supabase.from("student_document_work")
          .select("annotations,form_values,submitted,updated_at")
          .eq("learner_id", auth.user.id).eq("resource_key", resourceKey).maybeSingle();
        if (readError) throw readError;
        if (data && active) {
          const remoteTime = Date.parse(data.updated_at || "");
          const localTime = Date.parse(local?.updated_at || "");
          if (!local || !Number.isFinite(localTime) || remoteTime >= localTime) {
            setMarks(Array.isArray(data.annotations) ? data.annotations as PdfMark[] : []);
            setFormValues(data.form_values && typeof data.form_values === "object" ? data.form_values as Record<string,string> : {});
            setSubmitted(Boolean(data.submitted));
          }
        }
        if (!active) return;
        setSaveState("saved");
        setWorkspaceReady(true);
        channel = supabase.channel("document-work-" + auth.user.id + "-" + resourceKey)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "student_document_work",
            filter: "learner_id=eq." + auth.user.id,
          }, payload => {
            const next = payload.new as any;
            if (next?.resource_key !== resourceKey || !active) return;
            if (Date.parse(next.updated_at || "") > Date.now() - 4000) return;
            setMarks(Array.isArray(next.annotations) ? next.annotations : []);
            setFormValues(next.form_values || {});
            setSubmitted(Boolean(next.submitted));
          }).subscribe();
      } catch {
        if (active) { setSaveState("offline"); setWorkspaceReady(true); }
      }
    };
    void restore();
    return () => { active = false; if (channel && supabase) void supabase.removeChannel(channel); };
  }, [resourceKey]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setRendering(true);
    documentProxy.getPage(page).then(pdfPage => {
      if (cancelled || !canvasRef.current) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: zoom * pixelRatio, rotation });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { alpha: false });
      if (!canvas || !context) throw new Error("Canvas is unavailable");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = viewport.width / pixelRatio + "px";
      canvas.style.height = viewport.height / pixelRatio + "px";
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        overlay.style.width = canvas.style.width;
        overlay.style.height = canvas.style.height;
      }
      task = pdfPage.render({ canvasContext: context, viewport });
      return task.promise;
    }).then(() => { if (!cancelled) setRendering(false); })
      .catch(reason => {
        if (!cancelled && reason?.name !== "RenderingCancelledException") {
          setError("This page could not be rendered.");
          setRendering(false);
        }
      });
    return () => { cancelled = true; task?.cancel(); };
  }, [documentProxy, page, zoom, rotation]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const renderMark = (mark: PdfMark) => {
      const points = mark.points || [];
      if (mark.tool === "text" || mark.tool === "signature") {
        context.globalAlpha = 1;
        context.fillStyle = mark.color || "#20212b";
        context.font = mark.tool === "signature" ? "italic 25px cursive" : "16px sans-serif";
        context.fillText(mark.text || "", (points[0]?.x || 0) * width, (points[0]?.y || 0) * height);
        return;
      }
      if (points.length < 2) return;
      context.beginPath();
      context.moveTo(points[0].x * width, points[0].y * height);
      points.slice(1).forEach(point => context.lineTo(point.x * width, point.y * height));
      context.strokeStyle = mark.tool === "highlight" ? "#f4cb45" : (mark.color || "#6a5ad8");
      context.globalAlpha = mark.tool === "highlight" ? .34 : 1;
      context.lineWidth = mark.width || (mark.tool === "highlight" ? 18 : 3);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      context.globalAlpha = 1;
    };
    currentPageMarks.forEach(renderMark);
    if (draftPoints.length > 1) renderMark({ id: "draft", page, tool: tool === "highlight" ? "highlight" : "pen", points: draftPoints, color: penColor });
  }, [currentPageMarks, draftPoints, page, tool, penColor, rendering]);

  useEffect(() => {
    if (!documentProxy || !searchTerm.trim()) { setSearchMatches([]); setSearching(false); return; }
    let cancelled = false;
    const runSearch = async () => {
      setSearching(true);
      const needle = searchTerm.trim().toLocaleLowerCase();
      const matches: number[] = [];
      try {
        for (let index = 1; index <= documentProxy.numPages; index++) {
          const current = await documentProxy.getPage(index);
          const content = await current.getTextContent();
          const text = content.items.map(item => "str" in item ? item.str : "").join(" ").toLocaleLowerCase();
          if (text.includes(needle)) matches.push(index);
          if (cancelled) return;
        }
        if (!cancelled) setSearchMatches(matches);
      } finally { if (!cancelled) setSearching(false); }
    };
    const timer = window.setTimeout(() => void runSearch(), 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [documentProxy, searchTerm]);

  useEffect(() => {
    if (!workspaceReady || loading || !learnerId) return;
    const timer = window.setTimeout(() => void persistWorkspace(false), 650);
    return () => window.clearTimeout(timer);
  }, [marks, formValues, workspaceReady, loading, learnerId]);

  const persistWorkspace = useCallback(async (submit: boolean) => {
    const updatedAt = new Date().toISOString();
    const payload = {
      learner_id: learnerId,
      resource_key: resourceKey,
      document_name: fileName,
      page_count: pageCount,
      annotations: marks,
      form_values: formValues,
      submitted: submit || submitted,
      submitted_at: submit ? updatedAt : (submitted ? updatedAt : null),
      updated_at: updatedAt,
    };
    try {
      localStorage.setItem("studyspace:document-work:" + resourceKey, JSON.stringify(payload));
    } catch {
      setNotice("Your device could not save a local backup of this work.");
    }
    if (!supabase || !learnerId || !navigator.onLine) {
      setSaveState("offline");
      if (submit) setNotice("Saved on this device. Connect to the internet to submit it to your teacher.");
      return false;
    }
    const { error: saveError } = await supabase.from("student_document_work").upsert(payload, { onConflict: "learner_id,resource_key" });
    if (saveError) {
      setSaveState("offline");
      setNotice("Your work is saved on this device. Cloud sync will retry when you are online.");
      return false;
    }
    setSubmitted(submit || submitted);
    setSaveState(submit ? "submitted" : "saved");
    if (submit) setNotice("Your annotated paper has been submitted to your teacher in StudySpace Monitor.");
    return true;
  }, [learnerId,resourceKey,fileName,pageCount,marks,formValues,submitted]);

  function changePage(next: number) { setPage(Math.max(1, Math.min(pageCount, next))); }
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); changePage(page - 1); }
    if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); changePage(page + 1); }
  }
  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingTool) return;
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    setDraftPoints([{ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }]);
  }
  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    setDraftPoints(current => [...current, point]);
  }
  function onPointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (draftPoints.length > 1) {
      setMarks(current => [...current, {
        id: crypto.randomUUID(), page, tool: tool === "highlight" ? "highlight" : "pen",
        points: draftPoints, color: penColor, width: tool === "highlight" ? 18 : 3,
      }]);
    }
    setDraftPoints([]);
  }
  function addTextMark(kind: "text" | "signature", event: React.PointerEvent<HTMLCanvasElement>) {
    const typed = window.prompt(kind === "signature" ? "Type your name for an electronic signature:" : "Enter a note to place on the page:");
    if (!typed?.trim()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    setMarks(current => [...current, { id: crypto.randomUUID(), page, tool: kind, points: [point], text: typed.trim(), color: penColor }]);
    setNotice(kind === "signature" ? "Signature added. Export the completed copy to embed it in the PDF." : "Note added to this page.");
  }

  async function exportAnnotatedPdf() {
    try {
      setNotice("Preparing your completed PDF…");
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const pages = pdf.getPages();
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const signatureFont = await pdf.embedFont(StandardFonts.HelveticaOblique);
      for (const mark of marks) {
        const target = pages[mark.page - 1];
        if (!target) continue;
        const { width, height } = target.getSize();
        if (mark.tool === "text" || mark.tool === "signature") {
          const point = mark.points?.[0] || { x: .1, y: .1 };
          target.drawText(mark.text || "", {
            x: point.x * width,
            y: height - point.y * height,
            size: mark.tool === "signature" ? 17 : 11,
            font: mark.tool === "signature" ? signatureFont : regular,
            color: mark.tool === "signature" ? rgb(.19,.17,.38) : rgb(.14,.15,.2),
          });
        } else {
          const points = mark.points || [];
          const color = mark.tool === "highlight" ? rgb(1,.82,.18) : hexToRgb(mark.color || "#6a5ad8");
          for (let index = 1; index < points.length; index++) {
            target.drawLine({
              start: { x: points[index-1].x * width, y: height - points[index-1].y * height },
              end: { x: points[index].x * width, y: height - points[index].y * height },
              thickness: mark.width || (mark.tool === "highlight" ? 15 : 2.2),
              color,
              opacity: mark.tool === "highlight" ? .3 : 1,
            });
          }
        }
      }
      const form = pdf.getForm();
      for (const field of form.getFields() as any[]) {
        const value = formValues[field.getName()];
        if (value === undefined) continue;
        if (typeof field.setText === "function") field.setText(value);
        else if (typeof field.check === "function") { if (value === "true") field.check(); else field.uncheck(); }
        else if (typeof field.select === "function" && value) field.select(value);
      }
      try { form.updateFieldAppearances(regular); } catch { /* Not every form field type has a standard appearance. */ }
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      downloadBlob(blob, fileName.replace(/\.pdf$/i, "") + "-completed.pdf");
      setNotice("Completed copy exported. Your original PDF was not changed.");
    } catch {
      setNotice("This PDF could not be exported with the selected annotations or form fields. Your saved work is still available.");
    }
  }

  function hexToRgb(hex: string) {
    const clean = hex.replace("#","");
    const value = clean.length===3 ? clean.split("").map(char=>char+char).join("") : clean;
    return rgb(parseInt(value.slice(0,2),16)/255,parseInt(value.slice(2,4),16)/255,parseInt(value.slice(4,6),16)/255);
  }
  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function fitWidth() {
    const pageCanvas=canvasRef.current, stage=stageRef.current;
    if(!pageCanvas||!stage) return;
    const baseWidth=pageCanvas.clientWidth/zoom;
    if(baseWidth>0) setZoom(Math.max(.5,Math.min(2.5,(stage.clientWidth-32)/baseWidth*zoom)));
  }
  async function submitToTeacher() {
    setSaveState("saving");
    await persistWorkspace(true);
  }

  return <section className="pdf-viewer" aria-label={"PDF reader: " + fileName} onKeyDown={handleKeyDown} tabIndex={0}>
    <div className="pdf-reader-toolbar">
      <div className="pdf-reader-toolbar-row">
        <div className="pdf-reader-page-controls">
          <button type="button" onClick={() => changePage(page - 1)} disabled={loading || page <= 1} aria-label="Previous page"><ArrowLeft size={15}/></button>
          <input aria-label="Current page" type="number" min="1" max={pageCount||1} value={page} onChange={event=>changePage(Number(event.target.value)||1)}/>
          <span>/ {pageCount||"—"}</span>
          <button type="button" onClick={() => changePage(page + 1)} disabled={loading || page >= pageCount} aria-label="Next page"><ArrowRight size={15}/></button>
        </div>
        <div className="pdf-reader-zoom">
          <button type="button" onClick={() => setZoom(value=>Math.max(.55,Math.round((value-.1)*10)/10))} disabled={zoom<=.55} aria-label="Zoom out"><ZoomOut size={15}/></button>
          <span>{Math.round(zoom*100)}%</span>
          <button type="button" onClick={() => setZoom(value=>Math.min(2.5,Math.round((value+.1)*10)/10))} disabled={zoom>=2.5} aria-label="Zoom in"><ZoomIn size={15}/></button>
          <button type="button" onClick={fitWidth} aria-label="Fit width">Fit</button>
          <button type="button" onClick={()=>setRotation(value=>(value+90)%360)} aria-label="Rotate page">↻</button>
        </div>
        <div className="pdf-reader-save">
          <span className={"pdf-reader-save-state "+(saveState==="saved"||saveState==="submitted"?"is-saved":"")}>{saveState==="saving"?"Saving…":saveState==="offline"?"Offline copy":saveState==="submitted"?"Submitted":"Saved"}</span>
          <button type="button" onClick={()=>void exportAnnotatedPdf()}><Download size={14}/><span>Export copy</span></button>
        </div>
      </div>
      <div className="pdf-reader-tools">
        <button type="button" className={tool==="hand"?"active":""} onClick={()=>setTool("hand")}><span>Hand</span></button>
        <button type="button" className={tool==="pen"?"active":""} onClick={()=>setTool("pen")}><Pen size={14}/><span>Draw</span></button>
        <button type="button" className={tool==="highlight"?"active":""} onClick={()=>setTool("highlight")}><Highlighter size={14}/><span>Highlight</span></button>
        <button type="button" className={tool==="text"?"active":""} onClick={()=>setTool("text")}><Type size={14}/><span>Text</span></button>
        <button type="button" className={tool==="signature"?"active":""} onClick={()=>setTool("signature")}><FileSignature size={14}/><span>Sign</span></button>
        <button type="button" className={tool==="fill"?"active":""} onClick={()=>{setTool("fill");setShowFillPanel(value=>!value);}}><Check size={14}/><span>Fill</span>{formFields.length>0&&<small>{formFields.length}</small>}</button>
        <label className="pdf-reader-color" title="Pen colour"><span>Ink</span><input type="color" value={penColor} onChange={event=>setPenColor(event.target.value)}/></label>
        <button type="button" disabled={!marks.length} onClick={()=>setMarks(current=>current.slice(0,-1))}><Undo2 size={14}/><span>Undo</span></button>
        <button type="button" onClick={()=>setShowFillPanel(value=>!value)}><ChevronDown size={14}/><span>Form fields</span></button>
      </div>
      <div className="pdf-reader-search">
        <Search size={14}/>
        <input value={searchTerm} onChange={event=>setSearchTerm(event.target.value)} placeholder="Find text in this PDF…" aria-label="Search PDF text"/>
        <span>{searching?"Searching…":searchTerm?(searchMatches.length+" pages"):""}</span>
        {searchMatches.map(match=><button type="button" key={match} onClick={()=>changePage(match)}>p. {match}</button>)}
      </div>
    </div>

    <div className="pdf-reader-body">
      <aside className="pdf-reader-thumbnails" aria-label="Page navigation">
        <span>Pages</span>
        {Array.from({length:Math.min(pageCount,80)},(_,index)=>index+1).map(number=><button type="button" key={number} className={page===number?"active":""} onClick={()=>changePage(number)}><span>{number}</span></button>)}
        {pageCount>80&&<small>Showing first 80 pages. Use the page control to go further.</small>}
      </aside>
      <div className="pdf-viewer-stage" ref={stageRef}>
        {loading&&<p className="pdf-viewer-message">Opening document…</p>}
        {error&&<p className="pdf-viewer-message" role="alert">{error}</p>}
        {!error&&<div className="pdf-page-shell">
          <canvas ref={canvasRef} aria-label={"PDF page "+page}/>
          <canvas ref={overlayRef} className={"pdf-annotation-layer "+(drawingTool?"is-drawing":"")} aria-label="PDF annotation layer"
            style={{pointerEvents:drawingTool?"auto":tool==="text"||tool==="signature"?"auto":"none"}}
            onPointerDown={event=>{if(tool==="text"||tool==="signature"){addTextMark(tool,event);return;}onPointerDown(event);}}
            onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}/>
        </div>}
        {rendering&&!loading&&<span className="pdf-render-status">Rendering page…</span>}
        {notice&&<div className="pdf-reader-notice" role="status">{notice}</div>}
      </div>
      {showFillPanel&&<aside className="pdf-fill-panel">
        <div className="pdf-fill-panel-head"><strong>Fill & sign</strong><button type="button" onClick={()=>setShowFillPanel(false)} aria-label="Close form panel">×</button></div>
        {formFields.length?formFields.map(field=><label key={field.name}><span>{field.name}</span>{field.kind.includes("CheckBox")?<input type="checkbox" checked={formValues[field.name]==="true"} onChange={event=>setFormValues(current=>({...current,[field.name]:event.target.checked?"true":"false"}))}/>:<input value={formValues[field.name]||""} onChange={event=>setFormValues(current=>({...current,[field.name]:event.target.value}))} placeholder={field.kind.includes("Dropdown")?"Choose or type a value":"Enter value"}/>}</label>):<p>This PDF has no interactive form fields. You can still place text, draw answers, highlight and sign directly on the page.</p>}
        <button type="button" className="pdf-fill-save" onClick={()=>void persistWorkspace(false)}><Save size={14}/> Save filled fields</button>
        <button type="button" className="pdf-fill-submit" onClick={()=>void submitToTeacher()}><Upload size={14}/> Submit paper to teacher</button>
      </aside>}
    </div>
    <footer className="pdf-viewer-footnote">Autosaved work is linked to this document on your StudySpace account. Export a completed copy to preserve your answers in the PDF. Your original stays unchanged.</footer>
  </section>;
}
