import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, Compass, Grid3X3, Shapes, Sigma } from "lucide-react";

type Tool = "Fractions" | "Algebra balance" | "Coordinate graph" | "Geometry";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export default function MathsLab() {
  const [tool, setTool] = useState<Tool>("Fractions");
  const [numerator, setNumerator] = useState(3);
  const [denominator, setDenominator] = useState(8);
  const [coefficient, setCoefficient] = useState(3);
  const [constant, setConstant] = useState(5);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [slope, setSlope] = useState(1);
  const [intercept, setIntercept] = useState(1);
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(5);

  const solution = 4;
  const rightSide = coefficient * solution + constant;
  const reducedBy = gcd(numerator, denominator);
  const simplified = numerator / reducedBy + "/" + denominator / reducedBy;
  const fractionPercent = Math.round((numerator / denominator) * 100);
  const graphLine = useMemo(() => Array.from({ length: 25 }, (_, index) => {
    const x = -6 + index * 0.5;
    const y = slope * x + intercept;
    return (200 + x * 25) + "," + (150 - y * 18);
  }).join(" "), [slope, intercept]);

  const tools: { label: Tool; description: string; icon: typeof Calculator }[] = [
    { label: "Fractions", description: "Build and compare fractions", icon: Grid3X3 },
    { label: "Algebra balance", description: "Solve equations one step at a time", icon: Sigma },
    { label: "Coordinate graph", description: "Explore straight-line graphs", icon: Compass },
    { label: "Geometry", description: "Change dimensions and see measurements", icon: Shapes },
  ];

  return (
    <section className="maths-lab-page">
      <header className="maths-lab-heading">
        <div className="maths-lab-heading-icon"><Calculator size={23}/></div>
        <div><span className="eyebrow">HANDS-ON MATHEMATICS</span><h1>Maths Lab</h1><p>Explore ideas, move the controls and see how the mathematics changes.</p></div>
      </header>

      <nav className="maths-lab-tools" aria-label="Maths Lab tools">
        {tools.map(({ label, description, icon: Icon }) => (
          <button type="button" key={label} className={tool === label ? "active" : ""} onClick={() => setTool(label)} aria-pressed={tool === label}>
            <Icon size={17}/><span><strong>{label}</strong><small>{description}</small></span>
          </button>
        ))}
      </nav>

      {tool === "Fractions" && <article className="maths-lab-workspace">
        <div className="maths-lab-card">
          <span className="eyebrow">FRACTION BUILDER</span><h2>What part of the whole is shaded?</h2>
          <p>Change the number of equal parts, then choose how many parts to shade.</p>
          <div className="fraction-tiles" style={{gridTemplateColumns:"repeat("+denominator+",minmax(0,1fr))"}} role="img" aria-label={numerator + " of " + denominator + " equal parts are shaded"}>
            {Array.from({ length: denominator }, (_, index) => <span key={index} className={index < numerator ? "filled" : ""}/>)}
          </div>
          <div className="maths-lab-control"><label htmlFor="fraction-denominator">Equal parts <strong>{denominator}</strong></label><input id="fraction-denominator" type="range" min="2" max="12" value={denominator} onChange={event => { const next = Number(event.target.value); setDenominator(next); setNumerator(current => Math.min(current, next)); }}/></div>
          <div className="maths-lab-control"><label htmlFor="fraction-numerator">Shaded parts <strong>{numerator}</strong></label><input id="fraction-numerator" type="range" min="0" max={denominator} value={numerator} onChange={event => setNumerator(Number(event.target.value))}/></div>
        </div>
        <aside className="maths-lab-result-card"><span className="eyebrow">YOUR FRACTION</span><div className="fraction-display"><span>{numerator}</span><i/><span>{denominator}</span></div><h3>{fractionPercent}% shaded</h3><p>{numerator} out of {denominator} equal parts are shaded.</p><div className="maths-lab-answer-line"><span>Simplified fraction</span><strong>{simplified}</strong></div><div className="maths-lab-answer-line"><span>Decimal</span><strong>{(numerator / denominator).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}</strong></div></aside>
      </article>}

      {tool === "Algebra balance" && <article className="maths-lab-workspace">
        <div className="maths-lab-card">
          <span className="eyebrow">EQUATION BALANCE</span><h2>Keep both sides equal</h2>
          <p>Solve the equation by undoing addition first, then multiplication. The same operation must be applied to both sides.</p>
          <div className="algebra-equation"><span>{coefficient}x + {constant}</span><b>=</b><span>{rightSide}</span></div>
          <div className="maths-lab-control"><label htmlFor="algebra-coefficient">Coefficient of x <strong>{coefficient}</strong></label><input id="algebra-coefficient" type="range" min="1" max="8" value={coefficient} onChange={event => {setCoefficient(Number(event.target.value));setChecked(false);setAnswer("");}}/></div>
          <div className="maths-lab-control"><label htmlFor="algebra-constant">Constant <strong>{constant}</strong></label><input id="algebra-constant" type="range" min="0" max="15" value={constant} onChange={event => {setConstant(Number(event.target.value));setChecked(false);setAnswer("");}}/></div>
          <label className="maths-lab-answer-input" htmlFor="algebra-answer">Your value for x<input id="algebra-answer" type="number" value={answer} onChange={event => {setAnswer(event.target.value);setChecked(false);}} placeholder="Enter your answer"/></label>
          <button className="primary-button" type="button" disabled={answer.trim() === ""} onClick={() => setChecked(true)}>Check answer</button>
          {checked && <p className={Number(answer) === solution ? "maths-lab-feedback correct" : "maths-lab-feedback"} role="status">{Number(answer) === solution ? "Correct. Both sides balance when x = 4." : "Not quite. Try reversing the addition before dividing by the coefficient."}</p>}
        </div>
        <aside className="maths-lab-result-card"><span className="eyebrow">WORKED STEPS</span><h3>Undo one operation at a time</h3><ol className="maths-lab-steps"><li><b>{coefficient}x + {constant} = {rightSide}</b><span>Start with the original equation.</span></li><li><b>{coefficient}x = {rightSide - constant}</b><span>Subtract {constant} from both sides.</span></li><li><b>x = {rightSide - constant} ÷ {coefficient}</b><span>Divide both sides by {coefficient}.</span></li><li><b>x = 4</b><span>The unknown is isolated.</span></li></ol><div className="maths-lab-equilibrium"><CheckCircle2 size={17}/> Both sides remain equal at every step.</div></aside>
      </article>}

      {tool === "Coordinate graph" && <article className="maths-lab-workspace">
        <div className="maths-lab-card">
          <span className="eyebrow">STRAIGHT-LINE GRAPH</span><h2>Explore y = mx + c</h2>
          <p>Adjust the gradient and y-intercept. Watch the line change on the coordinate plane.</p>
          <div className="maths-graph-wrap">
            <svg viewBox="0 0 400 300" role="img" aria-label={"Graph of y equals " + slope + "x plus " + intercept}>
              <defs><clipPath id="maths-graph-clip"><rect x="45" y="20" width="310" height="250"/></clipPath></defs>
              {Array.from({length:13},(_,i)=><line key={"v"+i} x1={50+i*25} y1="25" x2={50+i*25} y2="275" className="maths-grid-line"/>)}
              {Array.from({length:11},(_,i)=><line key={"h"+i} x1="50" y1={35+i*24} x2="350" y2={35+i*24} className="maths-grid-line"/>)}
              <line x1="50" y1="155" x2="350" y2="155" className="maths-axis"/><line x1="200" y1="25" x2="200" y2="275" className="maths-axis"/>
              <g className="maths-axis-labels"><text x="355" y="169">x</text><text x="210" y="22">y</text><text x="205" y="169">0</text></g>
              <g clipPath="url(#maths-graph-clip)"><polyline points={graphLine} className="maths-graph-line"/><circle cx="200" cy={155-intercept*18} r="5" className="maths-graph-point"/></g>
            </svg>
          </div>
          <div className="maths-lab-control"><label htmlFor="graph-slope">Gradient (m) <strong>{slope}</strong></label><input id="graph-slope" type="range" min="-3" max="3" step="1" value={slope} onChange={event => setSlope(Number(event.target.value))}/></div>
          <div className="maths-lab-control"><label htmlFor="graph-intercept">Y-intercept (c) <strong>{intercept}</strong></label><input id="graph-intercept" type="range" min="-5" max="5" step="1" value={intercept} onChange={event => setIntercept(Number(event.target.value))}/></div>
        </div>
        <aside className="maths-lab-result-card"><span className="eyebrow">CURRENT LINE</span><div className="maths-formula">y = {slope}x {intercept < 0 ? "− " + Math.abs(intercept) : "+ " + intercept}</div><p>The gradient tells you how steep the line is. The y-intercept is where the line crosses the vertical axis.</p><div className="maths-lab-answer-line"><span>At x = 0</span><strong>y = {intercept}</strong></div><div className="maths-lab-answer-line"><span>At x = 1</span><strong>y = {slope + intercept}</strong></div><div className="maths-lab-answer-line"><span>At x = 2</span><strong>y = {2*slope + intercept}</strong></div></aside>
      </article>}

      {tool === "Geometry" && <article className="maths-lab-workspace">
        <div className="maths-lab-card">
          <span className="eyebrow">RECTANGLE EXPLORER</span><h2>Area and perimeter</h2>
          <p>Change the length and width. Compare the space inside with the distance around the shape.</p>
          <div className="geometry-stage"><div className="geometry-rectangle" style={{width: (width/12*78+18)+"%",height:(height/10*118+30)+"px"}}><span>{width} cm</span></div></div>
          <div className="maths-lab-control"><label htmlFor="geometry-width">Length <strong>{width} cm</strong></label><input id="geometry-width" type="range" min="1" max="12" value={width} onChange={event=>setWidth(Number(event.target.value))}/></div>
          <div className="maths-lab-control"><label htmlFor="geometry-height">Width <strong>{height} cm</strong></label><input id="geometry-height" type="range" min="1" max="10" value={height} onChange={event=>setHeight(Number(event.target.value))}/></div>
        </div>
        <aside className="maths-lab-result-card"><span className="eyebrow">LIVE MEASUREMENTS</span><div className="maths-measurement"><span>Area</span><strong>{width*height} cm²</strong><small>Length × width</small></div><div className="maths-measurement"><span>Perimeter</span><strong>{2*(width+height)} cm</strong><small>2 × (length + width)</small></div><p>Area measures the surface covered. Perimeter measures the total distance around the outside.</p></aside>
      </article>}

      <footer className="maths-lab-footer"><Calculator size={15}/> Interactive models are for exploration. Use the worked steps to explain your reasoning, not just the final answer.</footer>
    </section>
  );
}
