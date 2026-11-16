import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import "./LabGraphSheet.css";

export type LabGraphCurve = { label: string; evaluate: (x: number) => number | null };
export type LabGraphConfig = {
  title: string;
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  xLabel?: string;
  yLabel?: string;
  unitNote?: string;
  curves: LabGraphCurve[];
};
export type LabNumberLineConfig = { boundary: number; direction: "left" | "right"; inclusive?: boolean };

type View = { xMin: number; xMax: number; yMin: number; yMax: number };
const WIDTH = 900, HEIGHT = 520;
const MARGIN = { left: 76, right: 28, top: 34, bottom: 62 };
const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceStep(range: number) {
  const rough = range / 8;
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-8))));
  const scaled = rough / power;
  return (scaled < 1.5 ? 1 : scaled < 3.5 ? 2 : scaled < 7.5 ? 5 : 10) * power;
}
function ticks(min: number, max: number) {
  const step = niceStep(max - min);
  const first = Math.ceil(min / step) * step;
  const result: number[] = [];
  for (let value = first, count = 0; value <= max + step * 1e-8 && count < 80; value += step, count++) result.push(Number(value.toPrecision(10)));
  return result;
}
function label(value: number) {
  if (Math.abs(value) < 1e-9) return "0";
  return Number(value.toPrecision(5)).toString();
}

export default function LabGraphSheet({ graph, numberLine, compact = false }: {
  graph?: LabGraphConfig;
  numberLine?: LabNumberLineConfig;
  compact?: boolean;
}) {
  const initial = useMemo<View>(() => ({
    xMin: graph?.xMin ?? (numberLine?.boundary ?? -10) - 10,
    xMax: graph?.xMax ?? (numberLine?.boundary ?? 10) + 10,
    yMin: graph?.yMin ?? -10,
    yMax: graph?.yMax ?? 10,
  }), [graph, numberLine]);
  const [view, setView] = useState<View>(initial);
  const [resetKey, setResetKey] = useState(0);
  const xTicks = useMemo(() => ticks(view.xMin, view.xMax), [view.xMin, view.xMax]);
  const yTicks = useMemo(() => ticks(view.yMin, view.yMax), [view.yMin, view.yMax]);
  const px = (x: number) => MARGIN.left + ((x - view.xMin) / (view.xMax - view.xMin)) * plotWidth;
  const py = (y: number) => MARGIN.top + ((view.yMax - y) / (view.yMax - view.yMin)) * plotHeight;
  const zeroX = view.xMin <= 0 && view.xMax >= 0 ? px(0) : null;
  const zeroY = view.yMin <= 0 && view.yMax >= 0 ? py(0) : null;
  const curves = graph?.curves ?? [];
  const paths = curves.map(curve => {
    let d = "", drawing = false;
    const samples = 500;
    for (let index = 0; index <= samples; index++) {
      const x = view.xMin + (index / samples) * (view.xMax - view.xMin);
      let y: number | null = null;
      try { y = curve.evaluate(x); } catch { y = null; }
      if (y === null || !Number.isFinite(y) || y < view.yMin || y > view.yMax) { drawing = false; continue; }
      d += (drawing ? " L " : " M ") + px(x).toFixed(2) + " " + py(y).toFixed(2);
      drawing = true;
    }
    return { label: curve.label, d };
  });
  const adjust = (factor: number, horizontal = 0, vertical = 0) => setView(current => {
    const cx = (current.xMin + current.xMax) / 2 + horizontal * (current.xMax - current.xMin);
    const cy = (current.yMin + current.yMax) / 2 + vertical * (current.yMax - current.yMin);
    const halfX = (current.xMax - current.xMin) * factor / 2;
    const halfY = (current.yMax - current.yMin) * factor / 2;
    return { xMin: cx - halfX, xMax: cx + halfX, yMin: cy - halfY, yMax: cy + halfY };
  });
  const reset = () => { setView(initial); setResetKey(value => value + 1); };

  if (numberLine) {
    const range = Math.max(10, Math.abs(numberLine.boundary) * 0.5 + 8);
    const min = view.xMin, max = view.xMax;
    const map = (value: number) => 54 + ((value - min) / (max - min)) * 792;
    const boundaryX = map(numberLine.boundary);
    return <section className={"lab-graph-sheet " + (compact ? "is-compact" : "")} aria-label="Interactive number line">
      <header className="lab-graph-head"><div><span>INTERACTIVE GRAPH SHEET</span><h4>Number-line solution</h4><p>Zoom and move the number line to inspect the boundary and solution region.</p></div><div className="lab-graph-controls"><button type="button" onClick={() => adjust(.75)} aria-label="Zoom in"><ZoomIn/></button><button type="button" onClick={() => adjust(1.35)} aria-label="Zoom out"><ZoomOut/></button><button type="button" onClick={reset} aria-label="Reset graph"><RotateCcw/></button></div></header>
      <div className="lab-graph-canvas"><svg viewBox="0 0 900 180" role="img" aria-label={numberLine.direction === "left" ? "Solution extends left from the boundary" : "Solution extends right from the boundary"}>
        <defs><marker id={"number-arrow-" + resetKey} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" className="lab-graph-arrow"/></marker></defs>
        <line x1="54" y1="82" x2="846" y2="82" className="lab-graph-axis"/>
        <line x1={numberLine.direction === "left" ? boundaryX : 54} y1="82" x2={numberLine.direction === "left" ? 54 : boundaryX} y2="82" className="lab-graph-solution" markerEnd={"url(#number-arrow-" + resetKey + ")"} />
        {ticks(min, max).map(value => <g key={value}><line x1={map(value)} y1="73" x2={map(value)} y2="91" className="lab-graph-tick"/><text x={map(value)} y="112" className="lab-graph-tick-label" textAnchor="middle">{label(value)}</text></g>)}
        <circle cx={boundaryX} cy="82" r="8" className={numberLine.inclusive ? "lab-graph-closed-point" : "lab-graph-open-point"}/>
        <text x={boundaryX} y="48" className="lab-graph-axis-label" textAnchor="middle">{label(numberLine.boundary)} {numberLine.inclusive ? "included" : "excluded"}</text>
      </svg></div>
      <footer className="lab-graph-foot"><span>{numberLine.inclusive ? "Closed boundary: ≤ or ≥" : "Open boundary: < or >"}</span><span>Solution: x {numberLine.direction === "left" ? (numberLine.inclusive ? "≤" : "<") : (numberLine.inclusive ? "≥" : ">")} {label(numberLine.boundary)}</span></footer>
    </section>;
  }

  if (!graph) return null;
  return <section className={"lab-graph-sheet " + (compact ? "is-compact" : "")} aria-label={graph.title}>
    <header className="lab-graph-head"><div><span>INTERACTIVE GRAPH SHEET</span><h4>{graph.title}</h4><p>Use the controls to zoom and pan. The graph redraws for your screen size.</p></div><div className="lab-graph-controls">
      <button type="button" onClick={() => adjust(.75)} aria-label="Zoom in" title="Zoom in"><ZoomIn/></button>
      <button type="button" onClick={() => adjust(1.35)} aria-label="Zoom out" title="Zoom out"><ZoomOut/></button>
      <button type="button" onClick={() => adjust(1, -.15, 0)} aria-label="Pan left" title="Pan left"><ArrowLeft/></button>
      <button type="button" onClick={() => adjust(1, .15, 0)} aria-label="Pan right" title="Pan right"><ArrowRight/></button>
      <button type="button" onClick={() => adjust(1, 0, .15)} aria-label="Pan up" title="Pan up"><ArrowUp/></button>
      <button type="button" onClick={() => adjust(1, 0, -.15)} aria-label="Pan down" title="Pan down"><ArrowDown/></button>
      <button type="button" onClick={reset} aria-label="Reset graph" title="Reset graph"><RotateCcw/></button>
    </div></header>
    <div className="lab-graph-canvas"><svg viewBox={"0 0 " + WIDTH + " " + HEIGHT} role="img" aria-label={graph.title + ". Interactive coordinate plane."}>
      <defs><clipPath id={"lab-graph-clip-" + resetKey}><rect x={MARGIN.left} y={MARGIN.top} width={plotWidth} height={plotHeight}/></clipPath></defs>
      <rect x={MARGIN.left} y={MARGIN.top} width={plotWidth} height={plotHeight} className="lab-graph-plot-bg"/>
      {xTicks.map(value => <g key={"x"+value}><line x1={px(value)} y1={MARGIN.top} x2={px(value)} y2={HEIGHT-MARGIN.bottom} className="lab-graph-grid"/><text x={px(value)} y={HEIGHT-MARGIN.bottom+23} className="lab-graph-tick-label" textAnchor="middle">{label(value)}</text></g>)}
      {yTicks.map(value => <g key={"y"+value}><line x1={MARGIN.left} y1={py(value)} x2={WIDTH-MARGIN.right} y2={py(value)} className="lab-graph-grid"/><text x={MARGIN.left-12} y={py(value)+4} className="lab-graph-tick-label" textAnchor="end">{label(value)}</text></g>)}
      {zeroX !== null && <line x1={zeroX} y1={MARGIN.top} x2={zeroX} y2={HEIGHT-MARGIN.bottom} className="lab-graph-axis"/>}
      {zeroY !== null && <line x1={MARGIN.left} y1={zeroY} x2={WIDTH-MARGIN.right} y2={zeroY} className="lab-graph-axis"/>}
      <g clipPath={"url(#lab-graph-clip-" + resetKey + ")"}>{paths.map((item,index)=><path key={item.label} d={item.d} className={"lab-graph-curve curve-" + (index % 4)} />)}</g>
      <text x={WIDTH/2} y={HEIGHT-12} className="lab-graph-axis-label" textAnchor="middle">{graph.xLabel || "x"}</text>
      <text x="18" y={HEIGHT/2} className="lab-graph-axis-label" textAnchor="middle" transform={"rotate(-90 18 " + HEIGHT/2 + ")"}>{graph.yLabel || "y"}</text>
    </svg></div>
    <div className="lab-graph-legend">{graph.curves.map((curve,index)=><span key={curve.label}><i className={"curve-" + (index%4)}/>{curve.label}</span>)}</div>
    {graph.unitNote && <footer className="lab-graph-foot">{graph.unitNote}</footer>}
  </section>;
}
