import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

export default function DocxViewer({ file }: { file: Blob }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  useEffect(()=>{
    let active=true;
    const host=hostRef.current;
    if(!host) return;
    host.innerHTML="";
    setStatus("loading");
    void renderAsync(file,host,undefined,{
      className:"studyspace-docx",
      inWrapper:true,
      ignoreWidth:false,
      ignoreHeight:false,
      ignoreFonts:false,
      breakPages:true,
      renderHeaders:true,
      renderFooters:true,
      renderFootnotes:true,
      renderEndnotes:true,
    }).then(()=>{if(active)setStatus("ready");}).catch(()=>{
      if(active){setStatus("error");host.innerHTML="";}
    });
    return ()=>{active=false;if(host)host.innerHTML="";};
  },[file]);
  return <section className="studyspace-docx-viewer" aria-label="Word document viewer">
    {status==="loading"&&<div className="studyspace-docx-status">Preparing the Word document…</div>}
    {status==="error"&&<div className="studyspace-docx-status" role="alert">This Word file could not be rendered. Download the original DOCX to open it in a compatible app.</div>}
    <div ref={hostRef} className="studyspace-docx-pages"/>
    {status==="ready"&&<p className="studyspace-docx-note">Word layout preview · Review page breaks, tables and embedded images in the original file when exact pagination is critical.</p>}
  </section>;
}
