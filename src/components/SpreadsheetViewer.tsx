import { useMemo, useState } from "react";

type Cell = { value: string; formula?: string };
type Sheet = { name: string; rows: Cell[][] };

export default function SpreadsheetViewer({ sheets }: { sheets: Sheet[] }) {
  const [active,setActive]=useState(0);
  const [selected,setSelected]=useState<{row:number;column:number}|null>(null);
  const [query,setQuery]=useState("");
  const sheet=sheets[active] || sheets[0];
  const selectedCell=selected?sheet?.rows[selected.row]?.[selected.column]:null;
  const filtered=useMemo(()=>{
    if(!sheet) return [];
    if(!query.trim()) return sheet.rows;
    const needle=query.toLowerCase();
    return sheet.rows.filter(row=>row.some(cell=>cell.value.toLowerCase().includes(needle)||cell.formula?.toLowerCase().includes(needle)));
  },[sheet,query]);
  const columnName=(index:number)=>{
    let n=index+1,result="";
    while(n){const rem=(n-1)%26;result=String.fromCharCode(65+rem)+result;n=Math.floor((n-1)/26);}
    return result;
  };
  return <section className="studyspace-sheet-viewer" aria-label="Spreadsheet viewer">
    <header className="studyspace-sheet-toolbar">
      <div><span className="eyebrow">WORKBOOK PREVIEW</span><strong>{sheets.length} worksheet(s) · {sheet?.rows.length||0} rows visible</strong></div>
      <label><span>Find in sheet</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search values…"/></label>
    </header>
    <div className="studyspace-sheet-formula"><b>{selected?columnName(selected.column)+(selected.row+1):"Cell"}</b><span>{selectedCell?.formula||selectedCell?.value||"Select a cell to inspect its value or formula."}</span></div>
    <div className="studyspace-sheet-grid-wrap">
      <table className="studyspace-sheet-grid">
        <thead><tr><th>#</th>{Array.from({length:Math.max(1,...filtered.map(row=>row.length))},(_,index)=><th key={index}>{columnName(index)}</th>)}</tr></thead>
        <tbody>{filtered.map((row,rowIndex)=><tr key={rowIndex}><th>{rowIndex+1}</th>{Array.from({length:Math.max(1,...filtered.map(item=>item.length))},(_,column)=>{const cell=row[column]||{value:""};return <td key={column}><button type="button" className={selected?.row===rowIndex&&selected?.column===column?"selected":""} onClick={()=>setSelected({row:rowIndex,column})} title={cell.formula||cell.value}>{cell.value}</button></td>;})}</tr>)}</tbody>
      </table>
      {!filtered.length&&<p className="studyspace-sheet-empty">No cells match this search.</p>}
    </div>
    <nav className="studyspace-sheet-tabs" aria-label="Workbook worksheets">{sheets.map((item,index)=><button type="button" key={item.name+"-"+index} className={active===index?"active":""} onClick={()=>{setActive(index);setSelected(null);setQuery("");}}>{item.name}</button>)}</nav>
    <p className="studyspace-sheet-note">Read-only workbook preview · all detected worksheets are available. Download the original XLSX to preserve macros, formulas, formatting and editing behaviour.</p>
  </section>;
}
