import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Calculator, CheckCircle2, Compass, Divide, Grid3X3, Percent, Ruler, Shapes, Sigma, Triangle } from "lucide-react";
import { useLabWorkspace } from "../lib/useLabWorkspace";

type Tool = "Fractions" | "Algebra balance" | "Coordinate graph" | "Geometry" |
  "Scientific calculator" | "Quadratic solver" | "Statistics" | "Trigonometry" | "Unit converter" | "Probability";

function parseStatistics(source: string) {
  const values = source.split(/[;,\\s]+/).map(Number).filter(value => Number.isFinite(value));
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  const mean = values.reduce((sum,value)=>sum+value,0)/values.length;
  const median = sorted.length%2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
  const frequencies = new Map<number,number>();
  values.forEach(value=>frequencies.set(value,(frequencies.get(value)||0)+1));
  const highest = Math.max(...frequencies.values());
  const mode = highest===1 ? [] : [...frequencies].filter(([,count])=>count===highest).map(([value])=>value);
  const variance = values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length;
  return {count:values.length,mean,median,mode,range:sorted[sorted.length-1]-sorted[0],variance,deviation:Math.sqrt(variance)};
}

function unitConvert(value:number,kind:string,from:string,to:string):number {
  if(kind==="temperature") {
    const celsius=from==="°F"?(value-32)*5/9:from==="K"?value-273.15:value;
    return to==="°F"?celsius*9/5+32:to==="K"?celsius+273.15:celsius;
  }
  const factors:Record<string,Record<string,number>> = {
    length:{m:1,km:1000,cm:.01,mm:.001,mi:1609.344,ft:.3048},
    mass:{kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125},
  };
  return value*(factors[kind]?.[from]||1)/(factors[kind]?.[to]||1);
}

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
  const lab = useLabWorkspace("maths");
  const restored = useRef(false);
  const [scientificValue,setScientificValue] = useState(9);
  const [scientificAngle,setScientificAngle] = useState(30);
  const [quadratic,setQuadratic] = useState({a:1,b:-5,c:6});
  const [statisticsInput,setStatisticsInput] = useState("12, 15, 18, 18, 22, 25");
  const [trigAngle,setTrigAngle] = useState(35);
  const [trigAdjacent,setTrigAdjacent] = useState(8);
  const [unitKind,setUnitKind] = useState("length");
  const [unitValue,setUnitValue] = useState(10);
  const [unitFrom,setUnitFrom] = useState("m");
  const [unitTo,setUnitTo] = useState("cm");
  const [favourable,setFavourable] = useState(3);
  const [total,setTotal] = useState(8);

  useEffect(() => {
    if(!lab.loaded || restored.current) return;
    restored.current=true;
    const saved=lab.workRows.find(row=>row.activity_key==="maths-workspace")?.live_state as Record<string,any>|undefined;
    if(!saved) return;
    if(saved.tool) setTool(saved.tool as Tool);
    if(saved.fraction) {setNumerator(Number(saved.fraction.numerator??3));setDenominator(Number(saved.fraction.denominator??8));}
    if(saved.algebra) {setCoefficient(Number(saved.algebra.coefficient??3));setConstant(Number(saved.algebra.constant??5));}
    if(saved.graph) {setSlope(Number(saved.graph.slope??1));setIntercept(Number(saved.graph.intercept??1));}
    if(saved.geometry) {setWidth(Number(saved.geometry.width??8));setHeight(Number(saved.geometry.height??5));}
    if(saved.scientificValue!==undefined) setScientificValue(Number(saved.scientificValue));
    if(saved.scientificAngle!==undefined) setScientificAngle(Number(saved.scientificAngle));
    if(saved.quadratic) setQuadratic(saved.quadratic);
    if(saved.statisticsInput) setStatisticsInput(String(saved.statisticsInput));
    if(saved.trig) {setTrigAngle(Number(saved.trig.angle??35));setTrigAdjacent(Number(saved.trig.adjacent??8));}
    if(saved.units) {setUnitKind(String(saved.units.kind??"length"));setUnitValue(Number(saved.units.value??10));setUnitFrom(String(saved.units.from??"m"));setUnitTo(String(saved.units.to??"cm"));}
    if(saved.probability) {setFavourable(Number(saved.probability.favourable??3));setTotal(Number(saved.probability.total??8));}
  },[lab.loaded,lab.workRows]);

  const stats = useMemo(()=>parseStatistics(statisticsInput),[statisticsInput]);
  const discriminant = quadratic.b*quadratic.b-4*quadratic.a*quadratic.c;
  const quadraticRoots = quadratic.a===0 ? null : discriminant>=0
    ? [(-quadratic.b+Math.sqrt(discriminant))/(2*quadratic.a),(-quadratic.b-Math.sqrt(discriminant))/(2*quadratic.a)]
    : null;
  const radians=trigAngle*Math.PI/180;
  const opposite=trigAdjacent*Math.tan(radians);
  const hypotenuse=trigAdjacent/Math.cos(radians);
  const converted=unitConvert(unitValue,unitKind,unitFrom,unitTo);
  const probability=total>0?favourable/total:0;

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
    { label: "Scientific calculator", description: "Scientific functions and angle modes", icon: Calculator },
    { label: "Quadratic solver", description: "Discriminants and roots", icon: Triangle },
    { label: "Statistics", description: "Mean, median, mode and spread", icon: BarChart3 },
    { label: "Trigonometry", description: "Right-triangle ratios", icon: Divide },
    { label: "Unit converter", description: "Convert common measurement units", icon: Ruler },
    { label: "Probability", description: "Fractions, percentages and odds", icon: Percent },
  ];

  const savedSnapshot = useMemo(()=>({
    tool,
    fraction:{numerator,denominator},
    algebra:{coefficient,constant},
    graph:{slope,intercept},
    geometry:{width,height},
    scientificValue,scientificAngle,quadratic,statisticsInput,
    trig:{angle:trigAngle,adjacent:trigAdjacent},
    units:{kind:unitKind,value:unitValue,from:unitFrom,to:unitTo},
    probability:{favourable,total},
  }),[tool,numerator,denominator,coefficient,constant,slope,intercept,width,height,scientificValue,scientificAngle,quadratic,statisticsInput,trigAngle,trigAdjacent,unitKind,unitValue,unitFrom,unitTo,favourable,total]);

  useEffect(()=>{
    if(!lab.loaded || !lab.control.enabled) return;
    const timer=window.setTimeout(()=>void lab.saveWork("maths-workspace","Maths Lab",savedSnapshot,{
      activeTool:tool,
      algebraAnswer:coefficient?((coefficient*solution-constant)/coefficient):null,
      fractionPercent,
      quadraticDiscriminant:discriminant,
      statisticsCount:stats?.count??0,
    }),650);
    return ()=>window.clearTimeout(timer);
  },[lab.loaded,lab.control.enabled,lab.saveWork,savedSnapshot,tool,coefficient,solution,fractionPercent,discriminant,stats?.count]);


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

      {tool === "Scientific calculator" && <article className="maths-lab-workspace">
        <div className="maths-lab-card"><span className="eyebrow">SCIENTIFIC CALCULATOR</span><h2>Calculate and explore functions</h2><p>Enter a value and choose a scientific function. Results update instantly.</p>
          <div className="maths-lab-control"><label htmlFor="scientific-value">Input value <strong>{scientificValue}</strong></label><input id="scientific-value" type="number" value={scientificValue} onChange={e=>setScientificValue(Number(e.target.value))}/></div>
          <div className="maths-lab-control"><label htmlFor="scientific-angle">Angle for trigonometry <strong>{scientificAngle}°</strong></label><input id="scientific-angle" type="range" min="-360" max="360" value={scientificAngle} onChange={e=>setScientificAngle(Number(e.target.value))}/></div>
          <div className="maths-scientific-grid">{["sin","cos","tan","√x","x²","1/x","ln","log₁₀"].map(fn=><button type="button" key={fn} onClick={()=>{const rad=scientificAngle*Math.PI/180;const v=scientificValue;const result=fn==="sin"?Math.sin(rad):fn==="cos"?Math.cos(rad):fn==="tan"?Math.tan(rad):fn==="√x"?Math.sqrt(Math.max(0,v)):fn==="x²"?v*v:fn==="1/x"?(v===0?0:1/v):fn==="ln"?Math.log(Math.max(v,1e-12)):Math.log10(Math.max(v,1e-12));setScientificValue(Number.isFinite(result)?Number(result.toFixed(8)):0);}}>{fn}</button>)}</div>
          <p className="maths-lab-feedback correct" role="status">sin({scientificAngle}°) = {Math.sin(scientificAngle*Math.PI/180).toFixed(6)} · cos({scientificAngle}°) = {Math.cos(scientificAngle*Math.PI/180).toFixed(6)}</p>
        </div><aside className="maths-lab-result-card"><span className="eyebrow">LIVE VALUE</span><div className="maths-formula">{scientificValue.toPrecision(7)}</div><p>Use the function keys to apply scientific operations. Trigonometric keys use the selected angle in degrees.</p><div className="maths-lab-answer-line"><span>Square</span><strong>{(scientificValue**2).toPrecision(6)}</strong></div><div className="maths-lab-answer-line"><span>Square root</span><strong>{Math.sqrt(Math.max(0,scientificValue)).toPrecision(6)}</strong></div></aside>
      </article>}

      {tool === "Quadratic solver" && <article className="maths-lab-workspace">
        <div className="maths-lab-card"><span className="eyebrow">QUADRATIC EQUATIONS</span><h2>Solve ax² + bx + c = 0</h2><p>Change the coefficients and inspect the discriminant to determine the nature of the roots.</p>
          <div className="maths-lab-control"><label htmlFor="quad-a">a <strong>{quadratic.a}</strong></label><input id="quad-a" type="number" step="any" value={quadratic.a} onChange={e=>setQuadratic(q=>({...q,a:Number(e.target.value)}))}/></div>
          <div className="maths-lab-control"><label htmlFor="quad-b">b <strong>{quadratic.b}</strong></label><input id="quad-b" type="number" step="any" value={quadratic.b} onChange={e=>setQuadratic(q=>({...q,b:Number(e.target.value)}))}/></div>
          <div className="maths-lab-control"><label htmlFor="quad-c">c <strong>{quadratic.c}</strong></label><input id="quad-c" type="number" step="any" value={quadratic.c} onChange={e=>setQuadratic(q=>({...q,c:Number(e.target.value)}))}/></div>
        </div><aside className="maths-lab-result-card"><span className="eyebrow">SOLUTION</span><div className="maths-formula">Δ = {discriminant.toFixed(3)}</div><h3>{quadratic.a===0?"Not quadratic":discriminant>0?"Two distinct real roots":discriminant===0?"One repeated real root":"Two complex roots"}</h3>{quadratic.a!==0&&discriminant>=0?<><div className="maths-lab-answer-line"><span>x₁</span><strong>{quadraticRoots?.[0].toFixed(5)}</strong></div><div className="maths-lab-answer-line"><span>x₂</span><strong>{quadraticRoots?.[1].toFixed(5)}</strong></div></>:<p>{quadratic.a===0?"Coefficient a must not be zero.":"The equation has no real roots. Complex roots are a ± bi."}</p>}<p className="maths-lab-steps-note">Δ = b² − 4ac. The sign of the discriminant determines the number of real roots.</p></aside>
      </article>}

      {tool === "Statistics" && <article className="maths-lab-workspace">
        <div className="maths-lab-card"><span className="eyebrow">DESCRIPTIVE STATISTICS</span><h2>Analyse a data set</h2><p>Enter numbers separated by commas, spaces or semicolons. The summary is recalculated as you type.</p><label className="maths-lab-answer-input" htmlFor="statistics-input">Data values<textarea id="statistics-input" rows={4} value={statisticsInput} onChange={e=>setStatisticsInput(e.target.value)}/></label><div className="maths-lab-feedback">{stats?stats.count+" valid values detected":"Enter at least one numeric value."}</div></div>
        <aside className="maths-lab-result-card"><span className="eyebrow">DATA SUMMARY</span>{stats?<><div className="maths-lab-answer-line"><span>Mean</span><strong>{stats.mean.toFixed(3)}</strong></div><div className="maths-lab-answer-line"><span>Median</span><strong>{stats.median.toFixed(3)}</strong></div><div className="maths-lab-answer-line"><span>Mode</span><strong>{stats.mode.length?stats.mode.join(", "):"No mode"}</strong></div><div className="maths-lab-answer-line"><span>Range</span><strong>{stats.range.toFixed(3)}</strong></div><div className="maths-lab-answer-line"><span>Standard deviation</span><strong>{stats.deviation.toFixed(3)}</strong></div><div className="maths-lab-answer-line"><span>Population variance</span><strong>{stats.variance.toFixed(3)}</strong></div></>:<p>Statistics will appear when valid numbers are entered.</p>}</aside>
      </article>}

      {tool === "Trigonometry" && <article className="maths-lab-workspace">
        <div className="maths-lab-card"><span className="eyebrow">RIGHT-TRIANGLE EXPLORER</span><h2>SOH · CAH · TOA</h2><p>Set an acute angle and the adjacent side. The other sides and trigonometric ratios update live.</p><div className="maths-lab-control"><label htmlFor="trig-angle">Angle θ <strong>{trigAngle}°</strong></label><input id="trig-angle" type="range" min="1" max="89" value={trigAngle} onChange={e=>setTrigAngle(Number(e.target.value))}/></div><div className="maths-lab-control"><label htmlFor="trig-adjacent">Adjacent side <strong>{trigAdjacent}</strong></label><input id="trig-adjacent" type="range" min="1" max="20" value={trigAdjacent} onChange={e=>setTrigAdjacent(Number(e.target.value))}/></div><svg viewBox="0 0 320 210" className="maths-triangle-svg" role="img" aria-label="Right triangle with an angle theta"><path d="M42 172 L278 172 L278 48 Z"/><path d="M258 172 L258 152 L278 152" className="right-angle"/><text x="130" y="195">Adjacent</text><text x="284" y="110">Opposite</text><text x="55" y="159">θ = {trigAngle}°</text><text x="112" y="88">Hypotenuse</text></svg></div>
        <aside className="maths-lab-result-card"><span className="eyebrow">TRIGONOMETRIC RATIOS</span><div className="maths-lab-answer-line"><span>Opposite</span><strong>{opposite.toFixed(3)}</strong></div><div className="maths-lab-answer-line"><span>Hypotenuse</span><strong>{hypotenuse.toFixed(3)}</strong></div><div className="maths-lab-answer-line"><span>sin θ</span><strong>{Math.sin(radians).toFixed(5)}</strong></div><div className="maths-lab-answer-line"><span>cos θ</span><strong>{Math.cos(radians).toFixed(5)}</strong></div><div className="maths-lab-answer-line"><span>tan θ</span><strong>{Math.tan(radians).toFixed(5)}</strong></div></aside>
      </article>}

      {tool === "Unit converter" && <article className="maths-lab-workspace">
        <div className="maths-lab-card"><span className="eyebrow">MEASUREMENT CONVERTER</span><h2>Convert units instantly</h2><p>Convert length, mass and temperature. Select the unit family and source/target units.</p><div className="maths-lab-control"><label htmlFor="unit-kind">Measurement family</label><select id="unit-kind" value={unitKind} onChange={e=>{const kind=e.target.value;setUnitKind(kind);setUnitFrom(kind==="length"?"m":kind==="mass"?"kg":"°C");setUnitTo(kind==="length"?"cm":kind==="mass"?"g":"°F");}}><option value="length">Length</option><option value="mass">Mass</option><option value="temperature">Temperature</option></select></div><div className="maths-lab-control"><label htmlFor="unit-value">Value</label><input id="unit-value" type="number" step="any" value={unitValue} onChange={e=>setUnitValue(Number(e.target.value))}/></div><div className="maths-lab-control"><label htmlFor="unit-from">From</label><select id="unit-from" value={unitFrom} onChange={e=>setUnitFrom(e.target.value)}>{(unitKind==="length"?["m","km","cm","mm","mi","ft"]:unitKind==="mass"?["kg","g","mg","lb","oz"]:["°C","°F","K"]).map(u=><option key={u}>{u}</option>)}</select></div><div className="maths-lab-control"><label htmlFor="unit-to">To</label><select id="unit-to" value={unitTo} onChange={e=>setUnitTo(e.target.value)}>{(unitKind==="length"?["m","km","cm","mm","mi","ft"]:unitKind==="mass"?["kg","g","mg","lb","oz"]:["°C","°F","K"]).map(u=><option key={u}>{u}</option>)}</select></div></div>
        <aside className="maths-lab-result-card"><span className="eyebrow">CONVERTED VALUE</span><div className="maths-formula">{Number.isFinite(converted)?converted.toPrecision(8):"—"} {unitTo}</div><p>{unitValue} {unitFrom} equals {converted.toPrecision(7)} {unitTo}.</p></aside>
      </article>}

      {tool === "Probability" && <article className="maths-lab-workspace">
        <div className="maths-lab-card"><span className="eyebrow">THEORETICAL PROBABILITY</span><h2>Favourable outcomes / total outcomes</h2><p>Adjust the number of favourable outcomes and the size of the sample space.</p><div className="maths-lab-control"><label htmlFor="probability-total">Total outcomes <strong>{total}</strong></label><input id="probability-total" type="range" min="1" max="100" value={total} onChange={e=>{const next=Number(e.target.value);setTotal(next);setFavourable(current=>Math.min(current,next));}}/></div><div className="maths-lab-control"><label htmlFor="probability-favourable">Favourable outcomes <strong>{favourable}</strong></label><input id="probability-favourable" type="range" min="0" max={total} value={favourable} onChange={e=>setFavourable(Number(e.target.value))}/></div><div className="fraction-tiles" style={{gridTemplateColumns:"repeat("+Math.min(total,20)+",minmax(0,1fr))"}}>{Array.from({length:Math.min(total,20)},(_,i)=><span key={i} className={i<favourable?"filled":""}/>)}</div></div>
        <aside className="maths-lab-result-card"><span className="eyebrow">PROBABILITY</span><div className="fraction-display"><span>{favourable}</span><i/><span>{total}</span></div><h3>{(probability*100).toFixed(2)}% chance</h3><p>Probability = {favourable}/{total} = {probability.toFixed(4)}.</p><div className="maths-lab-answer-line"><span>Favourable : Unfavourable</span><strong>{favourable}:{total-favourable}</strong></div></aside>
      </article>}

      <section className="maths-lab-assignment-panel">
        <div><span className="eyebrow">YOUR MATHEMATICS WORK</span><strong>Assigned practice</strong></div>
        {lab.assignments.length ? lab.assignments.map(item=><article key={item.id}><span><b>{item.title}</b><small>{item.instructions||"Complete this activity in Maths Lab."}{item.due_at?" · Due "+new Date(item.due_at).toLocaleString():""}</small></span><em>{item.status}</em></article>) : <p>No assigned Maths practicals at the moment.</p>}
        <small className="maths-lab-sync-status">{lab.syncState==="synced"?"Your work is synced across devices.":lab.syncState==="offline"?"Your work is saved locally and will sync when online.":"Connecting to your StudySpace account…"}</small>
      </section>

      <footer className="maths-lab-footer"><Calculator size={15}/> Interactive models are for exploration. Use the worked steps to explain your reasoning, not just the final answer.</footer>
    </section>
  );
}
