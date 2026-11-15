import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Atom, BookOpen, CheckCircle2, ClipboardCheck, Dna, FlaskConical,
  Leaf, Microscope, Waves, Zap, ShieldAlert, Calculator, RotateCcw,
} from "lucide-react";
import { useLabWorkspace, type LabArea, type LabAssignment } from "../lib/useLabWorkspace";
import { periodicElements } from "../data/periodicTable";

type ScienceArea = Exclude<LabArea, "maths">;
type Tool = "Motion" | "Forces" | "Energy" | "Circuits" | "Waves" | "Optics" |
  "Element explorer" | "Molar mass" | "Solutions & pH" | "Equation balancer" |
  "Cell biology" | "Genetics" | "DNA analysis" | "Ecology";

const masses: Record<string, number> = Object.fromEntries(periodicElements.map(item=>[item.symbol,item.mass]));

function parseFormula(formula: string): Record<string, number> | null {
  const source = formula.replace(/\s+/g, "");
  if (!source) return null;
  let index = 0;
  const parseGroup = (nested = false): Record<string, number> | null => {
    const counts: Record<string, number> = {};
    while (index < source.length) {
      if (source[index] === ")") { if (!nested) return null; index++; return counts; }
      if (source[index] === "(") {
        index++;
        const inner = parseGroup(true);
        if (!inner) return null;
        const multiplierMatch = source.slice(index).match(/^\d+/);
        const multiplier = multiplierMatch ? Number(multiplierMatch[0]) : 1;
        if (multiplierMatch) index += multiplierMatch[0].length;
        for (const [symbol,count] of Object.entries(inner)) counts[symbol] = (counts[symbol] || 0) + count * multiplier;
        continue;
      }
      const match = source.slice(index).match(/^([A-Z][a-z]?)(\d*)/);
      if (!match) return null;
      const symbol = match[1];
      if (!(symbol in masses)) return null;
      const amount = match[2] ? Number(match[2]) : 1;
      counts[symbol] = (counts[symbol] || 0) + amount;
      index += match[0].length;
    }
    return nested ? null : counts;
  };
  const parsed = parseGroup(false);
  return parsed && index === source.length ? parsed : null;
}
function molarMass(formula: string): number | null {
  const counts = parseFormula(formula);
  if (!counts) return null;
  return Object.entries(counts).reduce((sum,[symbol,count])=>sum + masses[symbol]*count,0);
}
function balanceEquation(equation: string): string | null {
  const halves = equation.split("->");
  if (halves.length !== 2) return null;
  const left = halves[0].split("+").map(value=>value.trim()).filter(Boolean);
  const right = halves[1].split("+").map(value=>value.trim()).filter(Boolean);
  const formulas = [...left,...right].map(parseFormula);
  if (formulas.some(value=>!value) || left.length<1 || right.length<1 || formulas.length>5) return null;
  const all = formulas as Record<string,number>[];
  const elements = Array.from(new Set(all.flatMap(row=>Object.keys(row))));
  const max = 10;
  const coefficients = new Array(all.length).fill(1);
  let solution: number[] | null = null;
  const valid = () => elements.every(element => {
    const total = all.reduce((sum,row,i)=>sum + (i<left.length?1:-1)*row[element]*coefficients[i],0);
    return total === 0;
  });
  const search = (position:number) => {
    if (solution) return;
    if (position===coefficients.length) {
      if (valid() && coefficients.some(value=>value!==1)) solution=[...coefficients];
      else if (valid()) solution=[...coefficients];
      return;
    }
    for(let n=1;n<=max&&!solution;n++){coefficients[position]=n;search(position+1);}
  };
  search(0);
  if (!solution) return null;
  const divisor = solution.reduce((a,b)=>{const gcd=(x:number,y:number):number=>y?gcd(y,x%y):x;return gcd(a,b);});
  return [...left.map((v,i)=>({v,c:solution![i]})),...right.map((v,i)=>({v,c:solution![i+left.length]}))]
    .map(item=>(item.c/divisor===1?"":item.c/divisor+" ")+item.v).join(" + ")
    .replace(/ \+ /g," + ");
}

const toolSets: Record<ScienceArea, {label:Tool;description:string;icon:typeof Activity}[]> = {
  physics: [
    {label:"Motion",description:"Distance, speed, time and motion graphs",icon:Activity},
    {label:"Forces",description:"Newton’s laws and resultant force",icon:Zap},
    {label:"Energy",description:"Work, kinetic and gravitational energy",icon:Activity},
    {label:"Circuits",description:"Ohm’s law, resistance and power",icon:Zap},
    {label:"Waves",description:"Frequency, wavelength and wave speed",icon:Waves},
    {label:"Optics",description:"Thin lenses and magnification",icon:Activity},
  ],
  chemistry: [
    {label:"Element explorer",description:"Explore all 118 elements",icon:Atom},
    {label:"Molar mass",description:"Calculate formula mass",icon:Calculator},
    {label:"Solutions & pH",description:"Concentration, dilution and pH",icon:FlaskConical},
    {label:"Equation balancer",description:"Conserve atoms in reactions",icon:Activity},
  ],
  biology: [
    {label:"Cell biology",description:"Compare plant and animal cells",icon:Microscope},
    {label:"Genetics",description:"Explore inheritance with Punnett squares",icon:Dna},
    {label:"DNA analysis",description:"Base pairing and GC content",icon:Dna},
    {label:"Ecology",description:"Model population growth",icon:Leaf},
  ],
};
const areaInfo: Record<ScienceArea,{title:string;tagline:string;icon:typeof Atom}> = {
  physics:{title:"Physics Lab",tagline:"Model the laws that explain motion, energy, electricity and the world around you.",icon:Atom},
  chemistry:{title:"Chemistry Lab",tagline:"Explore atoms, formulae, quantitative chemistry and chemical reactions.",icon:FlaskConical},
  biology:{title:"Biology Lab",tagline:"Investigate cells, inheritance, DNA and living systems.",icon:Microscope},
};
const n = (value:unknown,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
function NumberField({label,value,onChange,unit="",min=0,max=1000,step=1}:{label:string;value:number;onChange:(value:number)=>void;unit?:string;min?:number;max?:number;step?:number}) {
  return <label className="science-field"><span>{label}</span><div><input type="number" min={min} max={max} step={step} value={value} onChange={event=>onChange(n(event.target.value,0))}/>{unit&&<small>{unit}</small>}</div></label>;
}
function Result({label,value,detail}:{label:string;value:string;detail:string}) {
  return <div className="science-result"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function AssignmentList({items}:{items:LabAssignment[]}) {
  if(!items.length) return <div className="science-empty-assignments"><ClipboardCheck size={18}/><span>No lab practicals assigned right now.</span></div>;
  return <div className="science-assignments">{items.map(item=><article key={item.id}><div><strong>{item.title}</strong><p>{item.instructions||"Complete the assigned investigation in the relevant lab."}</p><small>{item.required?"Required practical":"Practice"}{item.due_at?" · Due "+new Date(item.due_at).toLocaleString():""}</small></div><span>{item.status.replace("_"," ")}</span></article>)}</div>;
}

export default function ScienceLab() {
  const [area,setArea]=useState<ScienceArea>("physics");
  const physics=useLabWorkspace("physics"), chemistry=useLabWorkspace("chemistry"), biology=useLabWorkspace("biology");
  const workspaces:Record<ScienceArea,ReturnType<typeof useLabWorkspace>>={physics,chemistry,biology};
  const active=workspaces[area], info=areaInfo[area], tools=toolSets[area];
  const [tool,setTool]=useState<Tool>("Motion");
  const [physicsData,setPhysicsData]=useState({distance:120,time:15,mass:4,acceleration:2,height:8,velocity:12,voltage:12,current:2,resistance:6,frequency:440,wavelength:.78,focalLength:10,objectDistance:20});
  const [selectedElement,setSelectedElement]=useState(8);
  const [formula,setFormula]=useState("H2O");
  const [solutionData,setSolutionData]=useState({concentration:.1,volume:250,hydrogen:0.0001,stock:1,target:.1});
  const [equation,setEquation]=useState("H2 + O2 -> H2O");
  const [cellType,setCellType]=useState<"plant"|"animal">("plant");
  const [organelle,setOrganelle]=useState("Nucleus");
  const [genetics,setGenetics]=useState({parentOne:"Aa",parentTwo:"Aa"});
  const [dna,setDna]=useState("ATGCGTACGTTAGC");
  const [eco,setEco]=useState({population:100,rate:5,years:10});

  useEffect(()=>{
    setTool(toolSets[area][0].label);
  },[area]);
  const [restoredArea,setRestoredArea]=useState<ScienceArea|null>(null);
  useEffect(()=>{
    if(!active.loaded || restoredArea===area) return;
    const saved=active.workRows.find(row=>row.activity_key==="science-workspace");
    if(saved?.live_state) {
      const state=saved.live_state as Record<string,any>;
      if(typeof state.tool==="string" && toolSets[area].some(item=>item.label===state.tool)) setTool(state.tool as Tool);
    if(area==="physics"&&state.physicsData) setPhysicsData(current=>({...current,...state.physicsData}));
    if(area==="chemistry"&&state.chemistryData) {
      setSelectedElement(n(state.chemistryData.selectedElement,8)); setFormula(String(state.chemistryData.formula||"H2O"));
      setSolutionData(current=>({...current,...state.chemistryData.solutionData})); setEquation(String(state.chemistryData.equation||"H2 + O2 -> H2O"));
    }
    if(area==="biology"&&state.biologyData) {
      setCellType(state.biologyData.cellType==="animal"?"animal":"plant"); setOrganelle(String(state.biologyData.organelle||"Nucleus"));
      setGenetics(current=>({...current,...state.biologyData.genetics})); setDna(String(state.biologyData.dna||"ATGCGTACGTTAGC"));
      setEco(current=>({...current,...state.biologyData.eco}));
      }
    }
    setRestoredArea(area);
  },[area,active.loaded,active.workRows,restoredArea]);

  const element=periodicElements.find(item=>item.number===selectedElement)!;
  const molecularMass=molarMass(formula);
  const pH=-Math.log10(Math.max(solutionData.hydrogen,1e-14));
  const solutionMoles=solutionData.concentration*(solutionData.volume/1000);
  const balanced=useMemo(()=>balanceEquation(equation),[equation]);
  const punnett=useMemo(()=>{
    const a=genetics.parentOne.trim().toUpperCase(), b=genetics.parentTwo.trim().toUpperCase();
    if(!/^[A-Z][A-Z]$/.test(a)||!/^[A-Z][A-Z]$/.test(b)||a[0].toLowerCase()!==a[1].toLowerCase()&&a[0]===a[1]) return null;
    const gametesA=[a[0],a[1]],gametesB=[b[0],b[1]];
    return gametesA.flatMap(one=>gametesB.map(two=>{
      const pair=[one,two].sort((x,y)=>x===x.toUpperCase()?-1:1).join("");
      return pair;
    }));
  },[genetics]);
  const sequence=dna.toUpperCase().replace(/[^ATGC]/g,"");
  const gcPercent=sequence.length?((sequence.match(/[GC]/g)||[]).length/sequence.length)*100:0;
  const complement=sequence.replace(/[ATGC]/g,base=>({A:"T",T:"A",G:"C",C:"G"}[base]||base));
  const growth=eco.population*Math.pow(1+eco.rate/100,eco.years);

  const snapshot = useMemo(() => area==="physics" ? {physicsData,tool} : area==="chemistry" ? {chemistryData:{selectedElement,formula,solutionData,equation},tool} : {biologyData:{cellType,organelle,genetics,dna,eco},tool}, [area,physicsData,tool,selectedElement,formula,solutionData,equation,cellType,organelle,genetics,dna,eco]);
  const keyResult = useMemo(() => area==="physics" ? {speed:physicsData.time?physicsData.distance/physicsData.time:0,force:physicsData.mass*physicsData.acceleration} : area==="chemistry" ? {molarMass:molecularMass,pH} : {gcPercent,populationAfter:growth}, [area,physicsData,molecularMass,pH,gcPercent,growth]);
  useEffect(()=>{
    if(!active.loaded||restoredArea!==area||!active.control.enabled) return;
    const timer=window.setTimeout(()=>void active.saveWork("science-workspace",info.title,snapshot,{currentTool:tool,area,keyResult}),700);
    return ()=>window.clearTimeout(timer);
  },[active.loaded,active.control.enabled,active.saveWork,info.title,snapshot,tool,area,keyResult,restoredArea]);

  const savedWork=active.workRows.find(row=>row.activity_key==="science-workspace");
  const status=active.syncState==="synced"?"Synced to your StudySpace account":active.syncState==="offline"?"Saved on this device · will sync when online":"Connecting to your lab workspace";
  const changePhysics=(key:keyof typeof physicsData,value:number)=>setPhysicsData(current=>({...current,[key]:value}));
  const areaChange=(next:ScienceArea)=>setArea(next);

  return <section className="science-lab-page">
    <header className="science-lab-hero">
      <div className="science-lab-hero-icon"><info.icon size={28}/></div>
      <div className="science-lab-hero-copy"><span className="eyebrow">STUDYSPACE SCIENCE LABS</span><h1>Science Lab</h1><p>Interactive experiments and models. Change a variable and watch the result update instantly.</p><small><span className={active.syncState==="synced"?"science-sync-dot":"science-sync-dot is-waiting"}/>{status}</small></div>
      <div className="science-lab-hero-bubble"><Atom size={27}/><span>OBSERVE · MODEL · EXPLAIN</span></div>
    </header>

    <nav className="science-subject-tabs" aria-label="Science subjects">
      {(["physics","chemistry","biology"] as ScienceArea[]).map(key=>{const Icon=areaInfo[key].icon;return <button key={key} className={area===key?"active":""} onClick={()=>areaChange(key)}><Icon size={18}/><span>{areaInfo[key].title}</span></button>;})}
    </nav>

    {active.control.enabled===false ? <section className="science-disabled"><ShieldAlert size={25}/><h2>This lab is temporarily unavailable</h2><p>{active.control.student_message||"Your teacher has paused this lab while it is being updated."}</p></section> : <>
      <section className="science-lab-intro"><div><span className="eyebrow">{area.toUpperCase()} · VIRTUAL WORKBENCH</span><h2>{info.title}</h2><p>{info.tagline}</p></div><span className="science-work-status"><CheckCircle2 size={14}/>{savedWork?.status==="submitted"?"Submitted for review":savedWork?"Work saved":"New investigation"}</span></section>
      <div className="science-tool-grid">
        {tools.map(({label,description,icon:Icon})=><button key={label} className={tool===label?"active":""} onClick={()=>setTool(label)}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span></button>)}
      </div>

      {area==="physics"&&tool==="Motion"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">MOTION INVESTIGATOR</span><h3>Distance, speed and time</h3><p>Adjust distance or elapsed time. The speed calculation and motion strip update instantly.</p><div className="science-fields"><NumberField label="Distance" value={physicsData.distance} onChange={v=>changePhysics("distance",v)} unit="m"/><NumberField label="Time" value={physicsData.time} onChange={v=>changePhysics("time",v)} unit="s"/></div><div className="science-motion-strip"><div style={{left:Math.min(92,Math.max(0,physicsData.distance/500*100))+"%"}}><span>Moving object</span></div></div><div className="science-axis"><span>0 m</span><span>{physicsData.distance} m</span></div><div className="science-equation">speed = distance ÷ time</div></section><aside className="science-results"><Result label="Average speed" value={(physicsData.time>0?physicsData.distance/physicsData.time:0).toFixed(2)+" m/s"} detail="v = s ÷ t"/><Result label="Time taken" value={physicsData.time.toFixed(1)+" s"} detail="Elapsed time"/><Result label="Distance travelled" value={physicsData.distance.toFixed(1)+" m"} detail="Displacement magnitude"/></aside></div>}

      {area==="physics"&&tool==="Forces"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">NEWTON'S SECOND LAW</span><h3>Force = mass × acceleration</h3><p>Explore how changing the mass or acceleration changes the resultant force.</p><div className="science-fields"><NumberField label="Mass" value={physicsData.mass} onChange={v=>changePhysics("mass",v)} unit="kg" max={100}/><NumberField label="Acceleration" value={physicsData.acceleration} onChange={v=>changePhysics("acceleration",v)} unit="m/s²" min={-30} max={30} step={.1}/></div><div className="science-force-visual"><span style={{width:Math.min(92,Math.abs(physicsData.mass*physicsData.acceleration)*2)+"%"}}/><b>{(physicsData.mass*physicsData.acceleration).toFixed(1)} N</b></div><div className="science-equation">F = ma</div></section><aside className="science-results"><Result label="Resultant force" value={(physicsData.mass*physicsData.acceleration).toFixed(2)+" N"} detail="Newton (N)"/><Result label="Mass" value={physicsData.mass.toFixed(2)+" kg"} detail="Inertial mass"/><Result label="Acceleration" value={physicsData.acceleration.toFixed(2)+" m/s²"} detail="Rate of velocity change"/></aside></div>}

      {area==="physics"&&tool==="Energy"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">ENERGY TRANSFER</span><h3>Kinetic and gravitational potential energy</h3><p>Compare energy due to motion with energy stored by height above a reference level.</p><div className="science-fields"><NumberField label="Mass" value={physicsData.mass} onChange={v=>changePhysics("mass",v)} unit="kg"/><NumberField label="Speed" value={physicsData.velocity} onChange={v=>changePhysics("velocity",v)} unit="m/s"/><NumberField label="Height" value={physicsData.height} onChange={v=>changePhysics("height",v)} unit="m"/></div><div className="science-equation">Eₖ = ½mv² · Eₚ = mgh</div></section><aside className="science-results"><Result label="Kinetic energy" value={(.5*physicsData.mass*physicsData.velocity**2).toFixed(2)+" J"} detail="½ × mass × speed²"/><Result label="Gravitational potential" value={(physicsData.mass*9.81*physicsData.height).toFixed(2)+" J"} detail="m × g × h (g = 9.81 m/s²)"/><Result label="Total mechanical energy" value={(.5*physicsData.mass*physicsData.velocity**2+physicsData.mass*9.81*physicsData.height).toFixed(2)+" J"} detail="Assuming no energy losses"/></aside></div>}

      {area==="physics"&&tool==="Circuits"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">ELECTRICITY WORKBENCH</span><h3>Ohm's law and electrical power</h3><p>Set voltage and resistance to calculate current, or set voltage and current to calculate resistance.</p><div className="science-fields"><NumberField label="Voltage" value={physicsData.voltage} onChange={v=>changePhysics("voltage",v)} unit="V"/><NumberField label="Resistance" value={physicsData.resistance} onChange={v=>changePhysics("resistance",Math.max(.01,v))} unit="Ω"/></div><div className="science-circuit"><span className="science-wire"/><i>Battery {physicsData.voltage} V</i><b>R = {physicsData.resistance} Ω</b><span className="science-circuit-arrow">→</span></div><div className="science-equation">I = V ÷ R · P = V × I</div></section><aside className="science-results"><Result label="Current" value={(physicsData.voltage/Math.max(.01,physicsData.resistance)).toFixed(3)+" A"} detail="I = V/R"/><Result label="Power" value={(physicsData.voltage**2/Math.max(.01,physicsData.resistance)).toFixed(2)+" W"} detail="P = V²/R"/><Result label="Charge per 60 s" value={(physicsData.voltage/Math.max(.01,physicsData.resistance)*60).toFixed(2)+" C"} detail="Q = It"/></aside></div>}

      {area==="physics"&&tool==="Waves"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">WAVE MODEL</span><h3>Wave speed, frequency and wavelength</h3><p>Change the frequency and wavelength. The wave shape and propagation speed are recalculated live.</p><div className="science-fields"><NumberField label="Frequency" value={physicsData.frequency} onChange={v=>changePhysics("frequency",v)} unit="Hz" max={100000}/><NumberField label="Wavelength" value={physicsData.wavelength} onChange={v=>changePhysics("wavelength",v)} unit="m" step={.01}/></div><svg className="science-wave-svg" viewBox="0 0 420 90" role="img" aria-label="Sine wave model"><line x1="0" y1="45" x2="420" y2="45"/><path d={Array.from({length:141},(_,i)=>{const x=i*3;const y=45-Math.sin(i/140*Math.PI*4)*28;return (i?"L":"M")+x+" "+y;}).join(" ")}/></svg><div className="science-equation">v = fλ</div></section><aside className="science-results"><Result label="Wave speed" value={(physicsData.frequency*physicsData.wavelength).toFixed(2)+" m/s"} detail="v = f × λ"/><Result label="Period" value={(physicsData.frequency>0?1/physicsData.frequency:0).toFixed(5)+" s"} detail="T = 1/f"/><Result label="Angular frequency" value={(2*Math.PI*physicsData.frequency).toFixed(2)+" rad/s"} detail="ω = 2πf"/></aside></div>}

      {area==="physics"&&tool==="Optics"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">THIN LENS MODEL</span><h3>Image distance and magnification</h3><p>Use the thin-lens equation. Object distance must be greater than zero and focal length cannot be zero.</p><div className="science-fields"><NumberField label="Focal length" value={physicsData.focalLength} onChange={v=>changePhysics("focalLength",Math.max(.01,v))} unit="cm"/><NumberField label="Object distance" value={physicsData.objectDistance} onChange={v=>changePhysics("objectDistance",Math.max(.01,v))} unit="cm"/></div><div className="science-equation">1/f = 1/u + 1/v</div></section><aside className="science-results"><Result label="Image distance" value={(1/(1/physicsData.focalLength-1/physicsData.objectDistance)||0).toFixed(2)+" cm"} detail="Negative values indicate a virtual image"/><Result label="Magnification" value={(-(1/(1/physicsData.focalLength-1/physicsData.objectDistance)||0)/physicsData.objectDistance).toFixed(2)+" ×"} detail="m = −v/u"/><Result label="Image type" value={physicsData.objectDistance>physicsData.focalLength?"Real (for a converging lens)":"Virtual / boundary case"} detail="Assumes a thin converging lens"/></aside></div>}

      {area==="chemistry"&&tool==="Element explorer"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">PERIODIC TABLE EXPLORER</span><h3>Choose an element to inspect</h3><p>Explore all 118 recognised elements, their atomic data, categories, phases and electron configurations.</p><div className="science-periodic-grid">{periodicElements.map(item=><button key={item.number} style={{gridColumnStart:item.group,gridRowStart:item.period}} className={selectedElement===item.number?"active":""} onClick={()=>setSelectedElement(item.number)}><small>{item.number}</small><strong>{item.symbol}</strong><span>{item.name}</span></button>)}</div></section><aside className="science-results"><div className="science-element-focus"><span>{element.number}</span><strong>{element.symbol}</strong><b>{element.name}</b><small>Relative atomic mass {element.mass}</small><small>{element.category} · {element.phase}</small><small>Group {element.group} · Period {element.period}</small><small>{element.electronConfiguration||"Electron configuration not listed"}</small></div><Result label="Protons" value={String(element.number)} detail="Atomic number"/><Result label="Electrons (neutral atom)" value={String(element.number)} detail="Equal to protons"/><Result label="Neutrons (approx.)" value={String(Math.max(0,Math.round(element.mass)-element.number))} detail="Rounded mass number − atomic number"/></aside></div>}

      {area==="chemistry"&&tool==="Molar mass"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">FORMULA MASS CALCULATOR</span><h3>Calculate molar mass</h3><p>Enter a chemical formula such as H₂O, CO₂, Ca(OH)₂ or C₆H₁₂O₆. Parentheses and subscripts are supported for elements in the built-in mass table.</p><label className="science-text-field">Chemical formula<input value={formula} onChange={event=>setFormula(event.target.value)} placeholder="e.g. Ca(OH)2"/></label><div className="science-equation">M = Σ (number of atoms × relative atomic mass)</div></section><aside className="science-results"><Result label="Molar mass" value={molecularMass===null?"Check formula":molecularMass.toFixed(3)+" g/mol"} detail={molecularMass===null?"Use valid element symbols and subscripts":"Calculated from relative atomic masses"}/><Result label="Formula" value={formula||"—"} detail="Chemical composition"/></aside></div>}

      {area==="chemistry"&&tool==="Solutions & pH"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">SOLUTION CALCULATOR</span><h3>Concentration, dilution and pH</h3><p>Model solution concentration and use hydrogen-ion concentration to calculate pH.</p><div className="science-fields"><NumberField label="Concentration" value={solutionData.concentration} onChange={v=>setSolutionData(s=>({...s,concentration:v}))} unit="mol/L" step={.01}/><NumberField label="Volume" value={solutionData.volume} onChange={v=>setSolutionData(s=>({...s,volume:v}))} unit="mL"/><NumberField label="Hydrogen ion [H⁺]" value={solutionData.hydrogen} onChange={v=>setSolutionData(s=>({...s,hydrogen:v}))} unit="mol/L" step={.0001} min={0.00000000000001}/></div><div className="science-equation">n = cV · pH = −log₁₀[H⁺]</div></section><aside className="science-results"><Result label="Amount of substance" value={solutionMoles.toFixed(4)+" mol"} detail="n = c × V (V in litres)"/><Result label="pH" value={Number.isFinite(pH)?pH.toFixed(2):"—"} detail={pH<7?"Acidic":pH>7?"Alkaline":"Neutral (at 25°C)"}/><Result label="Approx. hydroxide [OH⁻]" value={(1e-14/Math.max(solutionData.hydrogen,1e-14)).toExponential(2)+" mol/L"} detail="Kw = [H⁺][OH⁻] = 10⁻¹⁴ at 25°C"/></aside></div>}

      {area==="chemistry"&&tool==="Equation balancer"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">CONSERVATION OF MASS</span><h3>Balance a chemical equation</h3><p>Enter reactants and products separated by an arrow. Use + between compounds, e.g. Fe + O2 -&gt; Fe2O3.</p><label className="science-text-field">Unbalanced equation<input value={equation} onChange={event=>setEquation(event.target.value.replace("→","->"))}/></label><div className="science-balanced-result"><span>Balanced equation</span><strong>{balanced||"Could not balance this equation. Check the formulae and try a simpler equation."}</strong></div><p className="science-small-note">The built-in search checks small whole-number coefficients (1–10). It is a learning aid, not a replacement for a full stoichiometry solver.</p></section><aside className="science-results"><Result label="Equation status" value={balanced?"Balanced":"Needs checking"} detail="Atoms are conserved on both sides when a solution is found"/><Result label="Method" value="Atom counting" detail="Compare each element across reactants and products"/></aside></div>}

      {area==="biology"&&tool==="Cell biology"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">CELL EXPLORER</span><h3>Explore the parts of a cell</h3><p>Switch cell types and select an organelle to learn its function.</p><div className="science-switch"><button className={cellType==="plant"?"active":""} onClick={()=>setCellType("plant")}>Plant cell</button><button className={cellType==="animal"?"active":""} onClick={()=>setCellType("animal")}>Animal cell</button></div><div className={"science-cell-diagram "+cellType}><button className="cell-part nucleus" onClick={()=>setOrganelle("Nucleus")}>Nucleus</button><button className="cell-part membrane" onClick={()=>setOrganelle("Cell membrane")}>Membrane</button><button className="cell-part mitochondria" onClick={()=>setOrganelle("Mitochondrion")}>Mitochondrion</button><button className="cell-part ribosome" onClick={()=>setOrganelle("Ribosomes")}>Ribosomes</button>{cellType==="plant"&&<><button className="cell-part chloroplast" onClick={()=>setOrganelle("Chloroplast")}>Chloroplast</button><button className="cell-part vacuole" onClick={()=>setOrganelle("Vacuole")}>Vacuole</button></>}</div></section><aside className="science-results"><div className="science-organelle-card"><span>SELECTED STRUCTURE</span><strong>{organelle}</strong><p>{({Nucleus:"Contains most of the cell’s genetic material and helps control cell activities.","Cell membrane":"A selectively permeable boundary that controls movement of substances into and out of the cell.",Mitochondrion:"Site of aerobic respiration; releases usable energy in ATP.",Ribosomes:"Sites of protein synthesis.",Chloroplast:"Contains chlorophyll and is the site of photosynthesis in plant cells.",Vacuole:"A fluid-filled compartment; the large permanent plant vacuole helps maintain turgor."} as Record<string,string>)[organelle]||"Select a structure in the model to read about its function."}</p></div><Result label="Cell model" value={cellType==="plant"?"Plant":"Animal"} detail="Simplified schematic, not to scale"/></aside></div>}

      {area==="biology"&&tool==="Genetics"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">MENDELIAN GENETICS</span><h3>Build a Punnett square</h3><p>Use two-letter genotypes with one gene, e.g. Aa × Aa. Uppercase letters represent the dominant allele.</p><div className="science-fields"><label className="science-field"><span>Parent 1 genotype</span><input value={genetics.parentOne} maxLength={2} onChange={event=>setGenetics(s=>({...s,parentOne:event.target.value}))}/></label><label className="science-field"><span>Parent 2 genotype</span><input value={genetics.parentTwo} maxLength={2} onChange={event=>setGenetics(s=>({...s,parentTwo:event.target.value}))}/></label></div>{punnett?<div className="science-punnett"><span/><b>{genetics.parentTwo[0]}</b><b>{genetics.parentTwo[1]}</b><b>{genetics.parentOne[0]}</b><strong>{punnett[0]}</strong><strong>{punnett[1]}</strong><b>{genetics.parentOne[1]}</b><strong>{punnett[2]}</strong><strong>{punnett[3]}</strong></div>:<p className="science-error">Enter valid two-letter genotypes, such as Aa and aa.</p>}</section><aside className="science-results"><Result label="Dominant phenotype" value={punnett?punnett.filter(value=>/[A-Z]/.test(value)).length+"/4":"—"} detail="Offspring with at least one dominant allele"/><Result label="Recessive phenotype" value={punnett?punnett.filter(value=>value===value.toLowerCase()).length+"/4":"—"} detail="Offspring with two recessive alleles"/><Result label="Scope" value="One gene" detail="Assumes complete dominance and independent gametes"/></aside></div>}

      {area==="biology"&&tool==="DNA analysis"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">DNA SEQUENCE ANALYSER</span><h3>Base pairing and GC content</h3><p>Enter a DNA sequence using A, T, C and G. Invalid characters are ignored.</p><label className="science-text-field">DNA sequence<textarea rows={3} value={dna} onChange={event=>setDna(event.target.value.toUpperCase())}/></label><div className="science-dna-letters">{sequence.split("").slice(0,50).map((base,index)=><span key={index} data-base={base}>{base}</span>)}</div></section><aside className="science-results"><Result label="Sequence length" value={String(sequence.length)+" bp"} detail="Number of valid bases"/><Result label="GC content" value={gcPercent.toFixed(1)+"%"} detail="(G + C) ÷ total bases × 100"/><Result label="Complementary strand" value={complement||"—"} detail="A pairs with T · G pairs with C"/></aside></div>}

      {area==="biology"&&tool==="Ecology"&&<div className="science-workspace"><section className="science-card"><span className="eyebrow">POPULATION MODEL</span><h3>Exponential growth simulation</h3><p>Explore a simplified population model with a constant percentage growth rate and no resource limits.</p><div className="science-fields"><NumberField label="Starting population" value={eco.population} onChange={v=>setEco(s=>({...s,population:v}))} max={1000000}/><NumberField label="Growth rate per year" value={eco.rate} onChange={v=>setEco(s=>({...s,rate:v}))} unit="%" min={-100} max={100} step={.1}/><NumberField label="Elapsed time" value={eco.years} onChange={v=>setEco(s=>({...s,years:v}))} unit="years" max={100}/></div><div className="science-eco-bars">{Array.from({length:10},(_,index)=>{const val=eco.population*Math.pow(1+eco.rate/100,eco.years*(index+1)/10);return <span key={index} style={{height:Math.max(3,Math.min(100,val/Math.max(1,growth)*100))+"%"}} title={Math.round(val).toLocaleString()}/>})}</div><div className="science-axis"><span>Start</span><span>{eco.years} years</span></div></section><aside className="science-results"><Result label="Modelled population" value={Math.max(0,growth).toLocaleString(undefined,{maximumFractionDigits:0})} detail="P(t) = P₀(1 + r)ᵗ"/><Result label="Net change" value={(growth-eco.population).toLocaleString(undefined,{maximumFractionDigits:0})} detail="Difference from starting population"/><Result label="Model limitation" value="Unlimited resources" detail="Real ecosystems are constrained by carrying capacity"/></aside></div>}

      <section className="science-lab-bottom">
        <div className="science-assignment-panel"><div className="science-section-title"><div><span className="eyebrow">FROM YOUR TEACHER</span><h3>Assigned practicals</h3></div><ClipboardCheck size={18}/></div><AssignmentList items={active.assignments}/></div>
        <div className="science-notebook-panel"><div className="science-section-title"><div><span className="eyebrow">YOUR LAB NOTEBOOK</span><h3>Investigation record</h3></div><BookOpen size={18}/></div><p>Your current model settings and calculated results are saved automatically. Reopen the lab on another signed-in device to continue where you left off.</p>{savedWork?.feedback&&<div className="science-teacher-feedback"><strong>Teacher feedback{savedWork.score!=null?" · "+savedWork.score+"%":""}</strong><p>{savedWork.feedback}</p></div>}<div className="science-save-row"><span>{status}</span><button type="button" className="science-submit" onClick={()=>void active.saveWork("science-workspace",info.title,snapshot,keyResult,"submitted")} disabled={!active.control.enabled||!active.loaded}><ClipboardCheck size={13}/> Submit to teacher</button><button type="button" className="science-reset" onClick={()=>{if(area==="physics")setPhysicsData({distance:120,time:15,mass:4,acceleration:2,height:8,velocity:12,voltage:12,current:2,resistance:6,frequency:440,wavelength:.78,focalLength:10,objectDistance:20});else if(area==="chemistry"){setFormula("H2O");setEquation("H2 + O2 -> H2O");setSelectedElement(8);setSolutionData({concentration:.1,volume:250,hydrogen:.0001,stock:1,target:.1});}else{setCellType("plant");setOrganelle("Nucleus");setGenetics({parentOne:"Aa",parentTwo:"Aa"});setDna("ATGCGTACGTTAGC");setEco({population:100,rate:5,years:10});}}}><RotateCcw size={13}/> Reset model</button></div>
        </div>
      </section>
    </>}

    <footer className="science-lab-safety"><ShieldAlert size={16}/><span>Safety first: these are digital teaching models, not instructions to perform experiments with chemicals, electricity, heat or biological materials. Follow your teacher’s practical instructions and approved laboratory safety rules.</span></footer>
  </section>;
}
