import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function PdfViewer({ file, fileName }: { file: Blob; fileName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setLoading(true); setError(""); setDocumentProxy(null); setPage(1);
    file.arrayBuffer()
      .then(buffer => pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise)
      .then(pdf => {
        loaded = pdf;
        if (cancelled) { void pdf.destroy(); return; }
        setDocumentProxy(pdf); setPageCount(pdf.numPages); setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError("This PDF could not be opened. It may be damaged, encrypted or unsupported."); setLoading(false); }
      });
    return () => { cancelled = true; if (loaded) void loaded.destroy(); };
  }, [file]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setRendering(true);
    documentProxy.getPage(page).then(pdfPage => {
      if (cancelled || !canvasRef.current) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: zoom * pixelRatio });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas is unavailable");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      canvas.style.width = (viewport.width / pixelRatio) + "px";
      canvas.style.height = (viewport.height / pixelRatio) + "px";
      task = pdfPage.render({ canvasContext: context, viewport });
      return task.promise;
    }).then(() => { if (!cancelled) setRendering(false); })
      .catch(reason => {
        if (!cancelled && reason?.name !== "RenderingCancelledException") {
          setError("This page could not be rendered."); setRendering(false);
        }
      });
    return () => { cancelled = true; task?.cancel(); };
  }, [documentProxy, page, zoom]);

  function changePage(next: number) { setPage(Math.max(1, Math.min(pageCount, next))); }
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); changePage(page - 1); }
    if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); changePage(page + 1); }
    if ((event.ctrlKey || event.metaKey) && ["s", "p"].includes(event.key.toLowerCase())) event.preventDefault();
  }

  return <section className="pdf-viewer" aria-label={"PDF viewer: " + fileName} onContextMenu={event => event.preventDefault()} onKeyDown={handleKeyDown} tabIndex={0}>
    <div className="pdf-viewer-toolbar">
      <div className="pdf-page-controls">
        <button type="button" onClick={() => changePage(page - 1)} disabled={loading || page <= 1} aria-label="Previous page">‹</button>
        <span>{loading ? "Loading…" : "Page " + page + " of " + pageCount}</span>
        <button type="button" onClick={() => changePage(page + 1)} disabled={loading || page >= pageCount} aria-label="Next page">›</button>
      </div>
      <div className="pdf-zoom-controls">
        <button type="button" onClick={() => setZoom(value => Math.max(.6, Math.round((value - .1) * 10) / 10))} disabled={zoom <= .6} aria-label="Zoom out">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(value => Math.min(2, Math.round((value + .1) * 10) / 10))} disabled={zoom >= 2} aria-label="Zoom in">+</button>
      </div>
    </div>
    <div className="pdf-viewer-stage">
      {loading && <p className="pdf-viewer-message">Preparing document…</p>}
      {error && <p className="pdf-viewer-message" role="alert">{error}</p>}
      {!error && <canvas ref={canvasRef} aria-label={"Page " + page} />}
      {rendering && !loading && <span className="pdf-render-status">Rendering page…</span>}
    </div>
    <p className="pdf-viewer-footnote">Rendered inside Studyspace. Download and print controls are not provided.</p>
  </section>;
}
