import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Atom, BriefcaseBusiness, Calculator, CheckCircle2,
  ChevronRight, CircleHelp, Code2, Cog, Globe, Languages,
  Microscope, Palette, Sprout, TrendingUp, Utensils, Zap,
} from "lucide-react";
import type { Subject } from "../data/db";
import { supabase } from "../lib/supabase";
import MathsLab from "./MathsLab";
import MathEquationStudio from "./MathEquationStudio";
import AssignedLabPracticals from "./AssignedLabPracticals";
import LabLearningHub from "./LabLearningHub";
import LabGraphSheet, { type LabGraphConfig } from "./LabGraphSheet";
import "./SubjectLabs.css";

type LabKey = "maths" | "science" | "geography" | "business" | "accounting" | "computing" | "agriculture" | "engineering" | "languages" | "hospitality" | "design";
type ScienceArea = "physics" | "chemistry" | "biology" | "environment";
type LabAccess = { key: LabKey; subjects: string[]; modules: string[]; scienceAreas: ScienceArea[] };
type AssignedLabSource = { subjectName: string; topics: string[] };

const labMeta: Record<LabKey, { title: string; subtitle: string; icon: typeof Calculator; colour: string }> = {
  maths: { title: "Mathematics Lab", subtitle: "Explore numbers, equations, graphs, shapes and probability.", icon: Calculator, colour: "violet" },
  science: { title: "Science Lab", subtitle: "Explore physics, chemistry, biology and environmental science through safe simulations.", icon: Atom, colour: "blue" },
  geography: { title: "Geography Lab", subtitle: "Work with climate, map scale, coordinates and population data.", icon: Globe, colour: "teal" },
  business: { title: "Business Lab", subtitle: "Test pricing, costs, demand, marketing and business decisions.", icon: BriefcaseBusiness, colour: "amber" },
  accounting: { title: "Accounting Lab", subtitle: "Practise double-entry bookkeeping and check a trial balance.", icon: TrendingUp, colour: "green" },
  computing: { title: "ICT & Computer Science Lab", subtitle: "Convert binary, test logic gates and explore algorithms.", icon: Code2, colour: "indigo" },
  agriculture: { title: "Agriculture Lab", subtitle: "Investigate soil, growing conditions and crop planning.", icon: Sprout, colour: "green" },
  engineering: { title: "Engineering & Design Lab", subtitle: "Explore forces, gears, structures and design constraints.", icon: Cog, colour: "orange" },
  languages: { title: "Language Lab", subtitle: "Practise vocabulary, grammar, sentence structure and reading.", icon: Languages, colour: "pink" },
  hospitality: { title: "Hospitality & Tourism Lab", subtitle: "Explore menu costing, room operations and guest service.", icon: Utensils, colour: "amber" },
  design: { title: "Art & Design Studio", subtitle: "Experiment with colour, composition and visual balance.", icon: Palette, colour: "pink" },
};

const aliases: Record<LabKey, RegExp> = {
  maths: /\b(math|maths|mathematics|additional mathematics|further mathematics|pure mathematics|applied mathematics|statistics|numeracy|calculus|algebra)\b/i,
  science: /\b(science|combined science|integrated science|general science|physical science|environmental science|biology|biological sciences|life sciences|chemistry|chemical science|physics|physical sciences)\b/i,
  geography: /\b(geography|physical geography|human geography|geology|geomorphology|climatology|cartography|geospatial|gis)\b/i,
  business: /\b(business|business studies|business management|business administration|commerce|economics|marketing|entrepreneurship|enterprise|management studies)\b/i,
  accounting: /\b(accounting|bookkeeping|book keeping|financial accounting|cost accounting|management accounting|auditing)\b/i,
  computing: /\b(ict|computer science|computing|information technology|software development|software engineering|programming|coding|cybersecurity|data science|computer studies|digital technology)\b/i,
  agriculture: /\b(agriculture|agricultural science|agronomy|crop science|animal production|animal husbandry|horticulture|soil science|agricultural technology)\b/i,
  engineering: /\b(engineering|design and technology|design technology|mechanical engineering|civil engineering|electrical engineering|electronics|technical drawing|construction technology)\b/i,
  languages: /\b(english|siswati|siSwati|french|portuguese|spanish|mandarin|chinese|arabic|german|language|linguistics|literature|communication skills)\b/i,
  hospitality: /\b(hospitality|tourism|hotel management|food and nutrition|food studies|culinary|catering|restaurant management|travel and tourism)\b/i,
  design: /\b(art and design|art|visual arts|graphic design|fashion design|creative arts|fine art|media studies|photography)\b/i,
};

const scienceAliases: Record<ScienceArea, RegExp> = {
  physics: /\b(physics|physical science|mechanics|forces and motion|electric circuits|electricity|electronics|waves|wave properties|optics)\b/i,
  chemistry: /\b(chemistry|chemical science|organic chemistry|inorganic chemistry|analytical chemistry|acids and bases|chemical bonding|stoichiometry)\b/i,
  biology: /\b(biology|biological sciences|life sciences|anatomy|physiology|cell biology|cell structure|photosynthesis|genetics)\b/i,
  environment: /\b(environmental science|ecology|ecosystems|biodiversity|conservation|climate change|pollution|sustainability)\b/i,
};
const generalScience = /^(science|general science|combined science|integrated science|physical science)$/i;

function normalise(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function moduleCandidates(value: string) {
  const clean = value.trim();
  const withoutModuleNumber = clean.replace(/^\s*(module|unit|course)\s*(\d+|[a-z])\s*[:—–-]\s*/i, "");
  const parts = [withoutModuleNumber, ...withoutModuleNumber.split(/\s*[:|—–-]\s*/)];
  return [...new Set(parts.map(normalise).filter(Boolean))];
}
function classifySubject(value: string): { keys: LabKey[]; scienceAreas: ScienceArea[] } {
  const keys: LabKey[] = [];
  const name = normalise(value);
  const areas = (Object.keys(scienceAliases) as ScienceArea[]).filter(area => scienceAliases[area].test(value));
  const isGeneralScience = generalScience.test(name);
  // Only named experimental disciplines or an explicit general/combined Science
  // course may unlock Science Lab. A subject category or the word "science" alone
  // is not enough (for example, Computer Science or Agricultural Science).
  const hasExperimentalScience = areas.length > 0 || isGeneralScience;
  for (const key of Object.keys(aliases) as LabKey[]) {
    if (aliases[key].test(value) && !(key === "science" && !hasExperimentalScience)) keys.push(key);
  }
  if (keys.includes("science") && isGeneralScience) areas.push("physics", "chemistry", "biology", "environment");
  return { keys: [...new Set(keys)], scienceAreas: [...new Set(areas)] };
}
function classifyAssignedModule(value: string): { keys: LabKey[]; scienceAreas: ScienceArea[] } {
  const candidates = moduleCandidates(value);
  const strictAliases: Record<LabKey, RegExp> = {
    maths: /^(mathematics|maths|additional mathematics|additional maths|further mathematics|pure mathematics|applied mathematics|statistics|calculus|algebra|probability|geometry|trigonometry|linear algebra)$/,
    science: /^(science|general science|combined science|integrated science|physical science|environmental science|biology|biological sciences|life sciences|cell biology|cell structure|photosynthesis|chemistry|chemical science|acids and bases|chemical bonding|stoichiometry|physics|physical sciences|forces and motion|electric circuits|anatomy|physiology|ecology|ecosystems|biodiversity|conservation|climate change|pollution|sustainability|genetics|mechanics|optics)$/,
    geography: /^(geography|physical geography|human geography|geology|geomorphology|climatology|cartography|gis|geospatial studies)$/,
    business: /^(business|business studies|business management|business administration|commerce|economics|marketing|entrepreneurship|enterprise|management studies)$/,
    accounting: /^(accounting|bookkeeping|book keeping|financial accounting|cost accounting|management accounting|auditing)$/,
    computing: /^(ict|computer science|computing|information technology|software development|software engineering|programming|coding|cybersecurity|data science|computer studies|digital technology)$/,
    agriculture: /^(agriculture|agricultural science|agronomy|crop science|animal production|animal husbandry|horticulture|soil science|agricultural technology)$/,
    engineering: /^(engineering|design and technology|design technology|mechanical engineering|civil engineering|electrical engineering|electronics|technical drawing|construction technology)$/,
    languages: /^(english|siswati|french|portuguese|spanish|mandarin|chinese|arabic|german|language|linguistics|literature|communication skills)$/,
    hospitality: /^(hospitality|tourism|hotel management|food and nutrition|food studies|culinary arts|catering|restaurant management|travel and tourism)$/,
    design: /^(art and design|art|visual arts|graphic design|fashion design|creative arts|fine art|media studies|photography)$/,
  };
  const keys = (Object.keys(strictAliases) as LabKey[]).filter(key => candidates.some(candidate => strictAliases[key].test(candidate)));
  const areas = (Object.keys(scienceAliases) as ScienceArea[]).filter(area => candidates.some(candidate => scienceAliases[area].test(candidate)));
  if (keys.includes("science") && areas.length === 0 && candidates.some(candidate => generalScience.test(candidate))) areas.push("physics", "chemistry", "biology", "environment");
  return { keys, scienceAreas: [...new Set(areas)] };
}

function interpolateMonthly(values: number[], month: number): number | null {
  if (month < 1 || month > 12 || values.length !== 12) return null;
  const index = Math.min(10, Math.floor(month) - 1);
  const fraction = month - (index + 1);
  return values[index] + (values[index + 1] - values[index]) * fraction;
}
function readQuestionTopic(content: unknown): string {
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const topic = (content as Record<string, unknown>).topic;
  return typeof topic === "string" ? topic.trim() : "";
}

function useAssignedModules(studentId?: string | null) {
  const [sources, setSources] = useState<AssignedLabSource[]>([]);
  const [loading, setLoading] = useState(Boolean(studentId && supabase));
  useEffect(() => {
    const client = supabase;
    if (!client || !studentId) { setLoading(false); setSources([]); return; }
    let active = true;
    const load = async () => {
      setLoading(true);
      setSources([]);
      try {
        const [{ data: resourceAssignments, error: resourceAssignmentError }, { data: exerciseAssignments, error: exerciseAssignmentError }] = await Promise.all([
          client.from("resource_assignments").select("resource_id").eq("learner_id", studentId),
          client.from("exercise_assignments").select("exercise_set_id,available_at").eq("learner_id", studentId),
        ]);
        if (resourceAssignmentError) throw resourceAssignmentError;
        if (exerciseAssignmentError) throw exerciseAssignmentError;

        const resourceIds = [...new Set((resourceAssignments ?? []).map(row => row.resource_id).filter(Boolean))];
        const releasedExerciseIds = [...new Set((exerciseAssignments ?? [])
          .filter(row => !row.available_at || new Date(row.available_at).getTime() <= Date.now())
          .map(row => row.exercise_set_id).filter(Boolean))];

        const resourcesResult = resourceIds.length
          ? await client.from("learning_resources").select("subject_name,topic").in("id", resourceIds)
          : { data: [], error: null };
        if (resourcesResult.error) throw resourcesResult.error;

        const exercisesResult = releasedExerciseIds.length
          ? await client.from("exercise_sets").select("id,subject_name,is_published").in("id", releasedExerciseIds).eq("is_published", true)
          : { data: [], error: null };
        if (exercisesResult.error) throw exercisesResult.error;

        const publishedSetIds = (exercisesResult.data ?? []).map(row => row.id).filter(Boolean);
        const questionsResult = publishedSetIds.length
          ? await client.from("exercise_questions").select("exercise_set_id,topic,content").in("exercise_set_id", publishedSetIds)
          : { data: [], error: null };
        if (questionsResult.error) throw questionsResult.error;

        const next: AssignedLabSource[] = [];
        for (const row of resourcesResult.data ?? []) {
          const subjectName = String(row.subject_name ?? "").trim();
          if (!subjectName || /^uncategorised$|^uncategorized$/i.test(subjectName)) continue;
          const topics = [String(row.topic ?? "").trim()].filter(Boolean);
          next.push({ subjectName, topics });
        }
        for (const row of exercisesResult.data ?? []) {
          const subjectName = String(row.subject_name ?? "").trim();
          if (!subjectName) continue;
          const topics = (questionsResult.data ?? [])
            .filter(question => question.exercise_set_id === row.id)
            .flatMap(question => [String(question.topic ?? "").trim(), readQuestionTopic(question.content)])
            .filter(Boolean);
          next.push({ subjectName, topics: [...new Set(topics)] });
        }
        if (active) setSources(next);
      } catch {
        // Local subject enrolments remain available when assigned-content metadata is offline.
        if (active) setSources([]);
      }
      if (active) setLoading(false);
    };
    void load();
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, [studentId]);
  return { sources, loading };
}

function buildLabAccess(subjects: Subject[], assignedSources: AssignedLabSource[]): LabAccess[] {
  const access = new Map<LabKey, LabAccess>();
  const add = (key: LabKey, source: string, isModule: boolean, scienceAreas: ScienceArea[] = []) => {
    const current = access.get(key) ?? { key, subjects: [], modules: [], scienceAreas: [] };
    const target = isModule ? current.modules : current.subjects;
    if (!target.includes(source)) target.push(source);
    if (key === "science") current.scienceAreas = [...new Set([...current.scienceAreas, ...scienceAreas])];
    access.set(key, current);
  };
  for (const subject of subjects) {
    const match = classifySubject(subject.name);
    for (const key of match.keys) add(key, subject.name, false, match.scienceAreas);
  }
  for (const source of assignedSources) {
    const parent = classifyAssignedModule(source.subjectName);
    if (!parent.keys.length) continue;
    const topicMatches = source.topics.map(topic => ({ topic, match: classifyAssignedModule(topic) }))
      .filter(item => item.match.keys.some(key => parent.keys.includes(key)));
    const topicScienceAreas = [...new Set(topicMatches
      .filter(() => parent.keys.includes("science"))
      .flatMap(item => item.match.scienceAreas)
      .filter(area => !parent.scienceAreas.length || parent.scienceAreas.includes(area)))];
    const scienceAreas = topicScienceAreas.length ? topicScienceAreas : parent.scienceAreas;
    for (const key of parent.keys) add(key, source.subjectName, true, key === "science" ? scienceAreas : []);
    for (const item of topicMatches) {
      for (const key of item.match.keys.filter(value => parent.keys.includes(value))) {
        add(key, item.topic, true, key === "science" ? scienceAreas : []);
      }
    }
  }
  return [...access.values()].sort((a, b) => labMeta[a.key].title.localeCompare(labMeta[b.key].title));
}

export default function SubjectLabs({ subjects, studentId }: { subjects: Subject[]; studentId?: string | null }) {
  const { sources, loading } = useAssignedModules(studentId);
  const labs = useMemo(() => buildLabAccess(subjects, sources), [subjects, sources]);
  const [selected, setSelected] = useState<LabKey | null>(null);
  const activeLab = labs.find(item => item.key === selected);
  useEffect(() => {
    if (selected && !labs.some(item => item.key === selected)) setSelected(null);
  }, [labs, selected]);

  return (
    <section className="subject-labs">
      {activeLab ? (
        <>
          <div className="subject-labs-back"><button type="button" className="secondary-button" onClick={() => setSelected(null)}><ArrowLeft size={15}/> All available labs</button><span>{labMeta[activeLab.key].title}</span></div>
          <AssignedLabPracticals
            studentId={studentId ?? null}
            areas={activeLab.key === "maths" ? ["maths"] : activeLab.key === "science" ? activeLab.scienceAreas.filter((area): area is "physics" | "chemistry" | "biology" => area !== "environment") : []}
          />
          <LabLearningHub
            studentId={studentId ?? null}
            labTitle={labMeta[activeLab.key].title}
            subjectOptions={[...activeLab.subjects, ...activeLab.modules]}
          />
          <section className="lab-subject-tools">
            <header className="lab-subject-tools-heading">
              <span className="eyebrow">INTERACTIVE SUBJECT TOOLS</span>
              <h3>Explore and experiment</h3>
              <p>Subject-specific simulations and tools are available alongside your shared learning workspace.</p>
            </header>
            {activeLab.key === "maths" && <><MathsLab/><MathEquationStudio studentId={studentId ?? null} subjectName={activeLab.subjects[0] ?? activeLab.modules[0] ?? "Mathematics"}/></>}
            {activeLab.key === "science" && <ScienceLab areas={activeLab.scienceAreas.length ? activeLab.scienceAreas : ["physics", "chemistry", "biology"]}/>}
            {activeLab.key === "geography" && <GeographyLab/>}
            {activeLab.key === "business" && <BusinessLab/>}
            {activeLab.key === "accounting" && <AccountingLab/>}
            {activeLab.key === "computing" && <ComputingLab/>}
            {activeLab.key === "agriculture" && <AgricultureLab/>}
            {activeLab.key === "engineering" && <EngineeringLab/>}
            {activeLab.key === "languages" && <LanguageLab/>}
            {activeLab.key === "hospitality" && <HospitalityLab/>}
            {activeLab.key === "design" && <DesignLab/>}
          </section>
        </>
      ) : (
        <>
          <header className="subject-labs-header">
            <div><span className="eyebrow">YOUR SUBJECT TOOLKIT</span><h2>Labs that match what you study.</h2><p>Only labs connected to your registered subjects or teacher-assigned modules appear here. Tools inside Science Lab are restricted to the science disciplines available to you.</p></div>
            <div className="subject-labs-count"><strong>{labs.length}</strong><span>available labs</span></div>
          </header>
          {labs.length ? (
            <div className="subject-labs-grid">
              {labs.map(lab => {
                const meta = labMeta[lab.key];
                const Icon = meta.icon;
                return <button type="button" className={"subject-labs-card lab-tone-" + meta.colour} key={lab.key} onClick={() => setSelected(lab.key)}>
                  <span className="subject-labs-card-icon"><Icon size={22}/></span><span className="subject-labs-card-copy"><strong>{meta.title}</strong><small>{meta.subtitle}</small></span><span className="subject-labs-card-open"><ChevronRight size={18}/></span>
                  <span className="subject-labs-tags">{[...lab.subjects, ...lab.modules].slice(0, 5).map((name, index) => <i key={name + index}>{name}{lab.modules.includes(name) ? " · module" : ""}</i>)}</span>
                </button>;
              })}
            </div>
          ) : (
            <section className="subject-labs-empty">
              <div><CircleHelp size={24}/></div><h3>No subject labs unlocked yet</h3><p>Add your subjects in <strong>Subjects</strong>, or ask your teacher to assign learning material or an exercise under a recognised subject/module. The relevant lab will appear automatically.</p>
              <small>{loading ? "Checking your assigned learning modules…" : "Your available subjects and assigned modules are checked each time you open Labs."}</small>
            </section>
          )}
          <p className="subject-labs-footnote"><CheckCircle2 size={14}/> Lab access follows your subjects and assigned course content. It does not change your grades or assessment marks.</p>
        </>
      )}
    </section>
  );
}

function ToolTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return <div className="subject-lab-tabs">{options.map(option => <button type="button" key={option.value} className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
function LabHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="subject-lab-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></header>;
}
function RangeField({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="subject-lab-range"><span>{label}<strong>{value}{unit}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/></label>;
}
function Result({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="subject-lab-result"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function ScienceLab({ areas }: { areas: ScienceArea[] }) {
  const available = [...new Set(areas)];
  const [area, setArea] = useState<ScienceArea>(available[0] ?? "physics");
  useEffect(() => { if (!available.includes(area)) setArea(available[0] ?? "physics"); }, [available.join("|"), area]);
  return <section className="subject-lab-workspace">
    <LabHeading eyebrow="SAFE VIRTUAL EXPERIMENTS" title="Science Lab" description="Change one variable at a time, observe the results and explain the relationship. These are educational simulations, not instructions for handling hazardous materials."/>
    <ToolTabs value={area} onChange={setArea} options={available.map(item => ({ value: item, label: item === "environment" ? "Environmental science" : item[0].toUpperCase() + item.slice(1) }))}/>
    {area === "physics" && <PhysicsTools/>}
    {area === "chemistry" && <ChemistryTools/>}
    {area === "biology" && <BiologyTools/>}
    {area === "environment" && <EnvironmentalTools/>}
  </section>;
}
function PhysicsTools() {
  const [tab, setTab] = useState<"circuit" | "motion" | "waves">("circuit");
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(6);
  const [mass, setMass] = useState(5);
  const [acceleration, setAcceleration] = useState(2);
  const [distance, setDistance] = useState(100);
  const [time, setTime] = useState(20);
  const [frequency, setFrequency] = useState(5);
  const [wavelength, setWavelength] = useState(2);
  return <><ToolTabs value={tab} onChange={setTab} options={[{value:"circuit",label:"Circuits & Ohm's law"},{value:"motion",label:"Motion & forces"},{value:"waves",label:"Waves"}]}/>
    {tab === "circuit" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Ohm's law simulator</h3><p>Adjust the potential difference and resistance. Current follows I = V ÷ R.</p><RangeField label="Voltage" value={voltage} min={1} max={24} unit=" V" onChange={setVoltage}/><RangeField label="Resistance" value={resistance} min={1} max={24} unit=" Ω" onChange={setResistance}/><div className="subject-lab-circuit"><span>POWER SOURCE</span><Zap size={22}/><span>RESISTOR</span><i/></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Current" value={(voltage / resistance).toFixed(2) + " A"}/><Result label="Power" value={(voltage * voltage / resistance).toFixed(2) + " W"}/><Result label="Resistance" value={resistance + " Ω"}/></aside></div>}
    {tab === "motion" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Forces and motion</h3><p>Explore Newton's second law and average speed.</p><RangeField label="Mass" value={mass} min={1} max={30} unit=" kg" onChange={setMass}/><RangeField label="Acceleration" value={acceleration} min={0} max={10} step={0.5} unit=" m/s²" onChange={setAcceleration}/><RangeField label="Distance travelled" value={distance} min={10} max={1000} step={10} unit=" m" onChange={setDistance}/><RangeField label="Time taken" value={time} min={1} max={120} unit=" s" onChange={setTime}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Resultant force" value={(mass * acceleration).toFixed(1) + " N"} detail="F = ma"/><Result label="Average speed" value={(distance / time).toFixed(2) + " m/s"} detail="speed = distance ÷ time"/></aside></div>}
    {tab === "waves" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Wave relationship</h3><p>Frequency × wavelength determines wave speed in a uniform medium.</p><RangeField label="Frequency" value={frequency} min={1} max={30} unit=" Hz" onChange={setFrequency}/><RangeField label="Wavelength" value={wavelength} min={0.1} max={10} step={0.1} unit=" m" onChange={setWavelength}/><div className="subject-lab-wave" style={{backgroundSize:(Math.max(20,120/frequency))+"px 100%"}}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Wave speed" value={(frequency * wavelength).toFixed(2) + " m/s"} detail="v = fλ"/><Result label="Period" value={(1 / frequency).toFixed(3) + " s"} detail="T = 1 ÷ f"/></aside></div>}
  </>;
}
function ChemistryTools() {
  const [tab, setTab] = useState<"ph" | "dilution" | "rate">("ph");
  const [ph, setPh] = useState(7);
  const [stockConcentration, setStockConcentration] = useState(2);
  const [stockVolume, setStockVolume] = useState(50);
  const [finalVolume, setFinalVolume] = useState(200);
  const [temperature, setTemperature] = useState(25);
  const [concentration, setConcentration] = useState(2);
  const [surfaceArea, setSurfaceArea] = useState(2);
  const rate = (temperature / 20) * concentration * surfaceArea;
  return <><ToolTabs value={tab} onChange={setTab} options={[{value:"ph",label:"pH & indicators"},{value:"dilution",label:"Dilution"},{value:"rate",label:"Reaction rate"}]}/>
    {tab === "ph" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>pH scale explorer</h3><p>Move along the scale to compare acidic, neutral and alkaline solutions. This is a model only; do not mix chemicals.</p><RangeField label="pH value" value={ph} min={0} max={14} onChange={setPh}/><div className="subject-lab-ph-scale"><span>Acidic</span><i style={{left:(ph/14*100)+"%"}}/><span>Neutral</span><span>Alkaline</span></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Classification" value={ph < 7 ? "Acidic" : ph === 7 ? "Neutral" : "Alkaline"}/><Result label="Indicator model" value={ph < 4 ? "Red / orange" : ph < 7 ? "Yellow" : ph === 7 ? "Green" : ph < 11 ? "Blue" : "Purple"}/><Result label="Distance from neutral" value={Math.abs(7 - ph) + " pH units"}/></aside></div>}
    {tab === "dilution" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Solution dilution planner</h3><p>Use C₁V₁ = C₂V₂ to estimate the concentration after adding solvent.</p><RangeField label="Starting concentration" value={stockConcentration} min={0.1} max={5} step={0.1} unit=" mol/L" onChange={setStockConcentration}/><RangeField label="Starting volume" value={stockVolume} min={10} max={250} step={5} unit=" mL" onChange={setStockVolume}/><RangeField label="Final volume" value={Math.max(finalVolume, stockVolume)} min={stockVolume} max={500} step={10} unit=" mL" onChange={setFinalVolume}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Final concentration" value={(stockConcentration * stockVolume / Math.max(finalVolume, stockVolume)).toFixed(3) + " mol/L"}/><Result label="Solvent added" value={Math.max(0, Math.max(finalVolume, stockVolume) - stockVolume) + " mL"}/></aside></div>}
    {tab === "rate" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Reaction-rate variables</h3><p>Explore how temperature, concentration and exposed surface area can affect reaction rate in a simplified model.</p><RangeField label="Temperature" value={temperature} min={5} max={80} unit=" °C" onChange={setTemperature}/><RangeField label="Concentration" value={concentration} min={0.5} max={5} step={0.5} unit=" relative" onChange={setConcentration}/><RangeField label="Surface area" value={surfaceArea} min={1} max={5} unit="×" onChange={setSurfaceArea}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Relative rate index" value={rate.toFixed(2)}/><Result label="Compared with 20°C baseline" value={(rate/(concentration*surfaceArea)).toFixed(2)+"×"}/><p className="subject-lab-note">This illustrative index demonstrates trends; it is not an experimentally measured rate constant.</p></aside></div>}
  </>;
}
function BiologyTools() {
  const [tab, setTab] = useState<"cell" | "microscope" | "ecosystem">("cell");
  const [cell, setCell] = useState<"plant" | "animal">("plant");
  const [magnification, setMagnification] = useState(100);
  const [objective, setObjective] = useState(10);
  const [trophic, setTrophic] = useState(1);
  const organelles = cell === "plant"
    ? [{name:"Cell wall",role:"Supports and protects the plant cell."},{name:"Chloroplast",role:"Contains chlorophyll and is the site of photosynthesis."},{name:"Large vacuole",role:"Stores cell sap and helps maintain turgor."},{name:"Nucleus",role:"Contains genetic material and controls cell activities."},{name:"Cell membrane",role:"Regulates movement into and out of the cell."},{name:"Cytoplasm",role:"Where many cell reactions take place."}]
    : [{name:"Nucleus",role:"Contains genetic material and controls cell activities."},{name:"Mitochondrion",role:"Releases usable energy through aerobic respiration."},{name:"Cell membrane",role:"Regulates movement into and out of the cell."},{name:"Cytoplasm",role:"Where many cell reactions take place."},{name:"Ribosomes",role:"Sites of protein synthesis."}];
  return <><ToolTabs value={tab} onChange={setTab} options={[{value:"cell",label:"Cell explorer"},{value:"microscope",label:"Microscope"},{value:"ecosystem",label:"Energy transfer"}]}/>
    {tab === "cell" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Explore a cell</h3><p>Choose a cell type and inspect its structures and functions.</p><ToolTabs value={cell} onChange={setCell} options={[{value:"plant",label:"Plant cell"},{value:"animal",label:"Animal cell"}]}/><div className="subject-lab-list">{organelles.map(item=><article key={item.name}><strong>{item.name}</strong><span>{item.role}</span></article>)}</div></section><aside className="subject-lab-panel subject-lab-results"><Microscope size={28}/><strong>{cell === "plant" ? "Plant cell" : "Animal cell"}</strong><p>{cell === "plant" ? "Plant cells have a cellulose cell wall, chloroplasts in photosynthetic tissues and typically a large permanent vacuole." : "Animal cells do not have a cellulose cell wall or chloroplasts and usually have smaller temporary vacuoles."}</p></aside></div>}
    {tab === "microscope" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Magnification calculator</h3><p>Total magnification = eyepiece × objective lens.</p><RangeField label="Eyepiece" value={magnification} min={5} max={20} unit="×" onChange={setMagnification}/><RangeField label="Objective lens" value={objective} min={4} max={100} step={4} unit="×" onChange={setObjective}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Total magnification" value={(magnification*objective)+"×"}/><p>Higher magnification increases apparent size but does not automatically improve resolution.</p></aside></div>}
    {tab === "ecosystem" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Energy pyramid</h3><p>Use the 10% model to estimate energy passed to the next trophic level.</p><RangeField label="Starting producer energy" value={trophic} min={100} max={10000} step={100} unit=" kJ" onChange={setTrophic}/><div className="subject-lab-pyramid"><span style={{width:"100%"}}>Producers · {trophic} kJ</span><span style={{width:"60%"}}>Primary consumers · {(trophic*.1).toFixed(0)} kJ</span><span style={{width:"35%"}}>Secondary · {(trophic*.01).toFixed(1)} kJ</span><span style={{width:"20%"}}>Tertiary · {(trophic*.001).toFixed(2)} kJ</span></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Energy reaching tertiary level" value={(trophic*.001).toFixed(2)+" kJ"}/><p>Energy is lost between trophic levels through respiration, movement, heat and waste.</p></aside></div>}
  </>;
}

function EnvironmentalTools() {
  const [tab, setTab] = useState<"ecosystem" | "water" | "carbon">("ecosystem");
  const [species, setSpecies] = useState(32);
  const [habitat, setHabitat] = useState(75);
  const [pressure, setPressure] = useState(25);
  const [waterPh, setWaterPh] = useState(7);
  const [oxygen, setOxygen] = useState(8);
  const [turbidity, setTurbidity] = useState(15);
  const [emissions, setEmissions] = useState(8);
  const [trees, setTrees] = useState(150);
  const biodiversityIndex = Math.max(0, Math.min(100, species * habitat / 100 * (1 - pressure / 100)));
  const estimatedAbsorption = trees * 0.02;
  const netCarbon = emissions - estimatedAbsorption;
  return <section className="subject-lab-workspace">
    <LabHeading eyebrow="ECOSYSTEMS & ENVIRONMENT" title="Environmental Science Explorer" description="Explore biodiversity, water-quality indicators and a simplified carbon-balance model. These are classroom simulations, not field measurements or environmental compliance tests."/>
    <ToolTabs value={tab} onChange={setTab} options={[{value:"ecosystem",label:"Ecosystems"},{value:"water",label:"Water quality"},{value:"carbon",label:"Carbon balance"}]}/>
    {tab === "ecosystem" && <div className="subject-lab-grid">
      <section className="subject-lab-panel"><h3>Habitat and biodiversity model</h3><p>Explore how habitat condition and disturbance influence an illustrative biodiversity index.</p>
        <RangeField label="Species count in the sample" value={species} min={5} max={100} onChange={setSpecies}/>
        <RangeField label="Habitat condition" value={habitat} min={0} max={100} unit="%" onChange={setHabitat}/>
        <RangeField label="Human disturbance pressure" value={pressure} min={0} max={100} unit="%" onChange={setPressure}/>
        <div className="subject-lab-pyramid"><span style={{width:"100%"}}>Habitat · {habitat}%</span><span style={{width:(100-pressure)+"%"}}>Remaining condition after pressure · {100-pressure}%</span></div>
      </section>
      <aside className="subject-lab-panel subject-lab-results">
        <Result label="Illustrative biodiversity index" value={biodiversityIndex.toFixed(1)+"/100"}/>
        <Result label="Habitat status" value={habitat>=70?"Higher condition":habitat>=40?"Moderate condition":"Degraded condition"}/>
        <Result label="Disturbance" value={pressure>=70?"High":pressure>=35?"Moderate":"Low"}/>
        <p className="subject-lab-note">The index is a teaching model only. Real biodiversity surveys use species identification, sampling design and site-specific evidence.</p>
      </aside>
    </div>}
    {tab === "water" && <div className="subject-lab-grid">
      <section className="subject-lab-panel"><h3>Water-quality indicator model</h3><p>Adjust the sample indicators and compare them with broad classroom categories. This cannot establish whether water is safe to drink.</p>
        <RangeField label="pH" value={waterPh} min={0} max={14} step={0.1} onChange={setWaterPh}/>
        <RangeField label="Dissolved oxygen" value={oxygen} min={0} max={14} step={0.1} unit=" mg/L" onChange={setOxygen}/>
        <RangeField label="Turbidity" value={turbidity} min={0} max={100} unit=" relative units" onChange={setTurbidity}/>
      </section>
      <aside className="subject-lab-panel subject-lab-results">
        <Result label="pH category" value={waterPh<6.5?"Acidic":waterPh>8.5?"Alkaline":"Near-neutral"}/>
        <Result label="Oxygen indicator" value={oxygen>=6?"Higher":oxygen>=4?"Moderate":"Low"}/>
        <Result label="Clarity indicator" value={turbidity<=5?"Low turbidity":turbidity<=25?"Moderate turbidity":"Higher turbidity"}/>
        <p className="subject-lab-note">Actual water assessment requires calibrated instruments, sampling procedures and appropriate laboratory analysis.</p>
      </aside>
    </div>}
    {tab === "carbon" && <div className="subject-lab-grid">
      <section className="subject-lab-panel"><h3>Simple carbon-balance model</h3><p>Compare an example annual emissions figure with a hypothetical tree-uptake estimate. The uptake factor is illustrative, not a universal measurement.</p>
        <RangeField label="Annual emissions" value={emissions} min={1} max={30} unit=" tonnes CO₂e" onChange={setEmissions}/>
        <RangeField label="Trees in the scenario" value={trees} min={0} max={1000} step={10} onChange={setTrees}/>
      </section>
      <aside className="subject-lab-panel subject-lab-results">
        <Result label="Illustrative tree uptake" value={estimatedAbsorption.toFixed(1)+" tonnes/year"}/>
        <Result label="Net model balance" value={netCarbon>=0?netCarbon.toFixed(1)+" tonnes/year":Math.abs(netCarbon).toFixed(1)+" tonnes surplus uptake"}/>
        <Result label="Model outcome" value={netCarbon>0?"Net emissions":netCarbon<0?"Uptake exceeds emissions":"Balanced in this model"}/>
        <p className="subject-lab-note">This model excludes soil, land-use changes, tree age, species, survival and many other factors. Do not use it for carbon accounting.</p>
      </aside>
    </div>}
  </section>;
}

function GeographyLab() {
  const [tab, setTab] = useState<"climate" | "scale" | "population">("climate");
  const [temperature, setTemperature] = useState(22);
  const [rainfall, setRainfall] = useState(80);
  const [mapDistance, setMapDistance] = useState(4);
  const [scale, setScale] = useState(50000);
  const [population, setPopulation] = useState(120000);
  const [area, setArea] = useState(80);
  const climateGraphs = useMemo(() => {
    const temperatureOffsets = [3.5, 3.5, 2.5, .5, -2.5, -4.5, -4.5, -3.5, -1.5, .5, 2.5, 3.5];
    const rainfallFactors = [1.45, 1.35, 1.2, .9, .65, .4, .35, .4, .6, .9, 1.25, 1.55];
    const factorMean = rainfallFactors.reduce((sum, value) => sum + value, 0) / 12;
    const temperatures = temperatureOffsets.map(offset => temperature + offset);
    const rain = rainfallFactors.map(factor => rainfall * factor / factorMean);
    const monthNote = "Illustrative seasonal profile generated from your sliders, not observed station data. Months: 1 Jan · 2 Feb · 3 Mar · 4 Apr · 5 May · 6 Jun · 7 Jul · 8 Aug · 9 Sep · 10 Oct · 11 Nov · 12 Dec.";
    const temperatureGraph: LabGraphConfig = {
      title: "Monthly temperature profile",
      xMin: 1, xMax: 12, yMin: Math.min(...temperatures) - 3, yMax: Math.max(...temperatures) + 3,
      xLabel: "Month (1–12)", yLabel: "Temperature (°C)", unitNote: monthNote,
      curves: [{ label: "Mean temperature", evaluate: month => interpolateMonthly(temperatures, month) }],
    };
    const rainfallGraph: LabGraphConfig = {
      title: "Monthly rainfall profile",
      xMin: 1, xMax: 12, yMin: 0, yMax: Math.max(1, ...rain) * 1.2,
      xLabel: "Month (1–12)", yLabel: "Rainfall (mm)", unitNote: monthNote,
      curves: [{ label: "Monthly rainfall", evaluate: month => interpolateMonthly(rain, month) }],
    };
    return { temperatureGraph, rainfallGraph };
  }, [temperature, rainfall]);
  return <section className="subject-lab-workspace"><LabHeading eyebrow="SPATIAL DATA & FIELD SKILLS" title="Geography Lab" description="Practise interpreting data, map scale and human-environment patterns with adjustable examples."/><ToolTabs value={tab} onChange={setTab} options={[{value:"climate",label:"Climate graph"},{value:"scale",label:"Map scale"},{value:"population",label:"Population"}]}/>
    {tab === "climate" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Climate data explorer</h3><p>Adjust the average conditions. The two interactive graph sheets show a clearly labelled illustrative Southern Hemisphere seasonal profile.</p><RangeField label="Mean temperature" value={temperature} min={-5} max={40} unit=" °C" onChange={setTemperature}/><RangeField label="Mean monthly rainfall" value={rainfall} min={0} max={400} step={5} unit=" mm" onChange={setRainfall}/><LabGraphSheet graph={climateGraphs.temperatureGraph} compact/><LabGraphSheet graph={climateGraphs.rainfallGraph} compact/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Mean temperature" value={temperature+" °C"}/><Result label="Rainfall class" value={rainfall < 30 ? "Low" : rainfall < 100 ? "Moderate" : "High"}/><p>These are simulated teaching values, not local weather observations. Compare real monthly station data when answering climate-data questions.</p></aside></div>}
    {tab === "scale" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Map scale converter</h3><p>Representative fraction (1 : n) converts map distance to ground distance.</p><RangeField label="Map distance" value={mapDistance} min={1} max={20} unit=" cm" onChange={setMapDistance}/><RangeField label="Scale denominator" value={scale} min={10000} max={250000} step={10000} onChange={setScale}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Ground distance" value={(mapDistance*scale/100000).toFixed(2)+" km"}/><Result label="Scale" value={"1 : "+scale.toLocaleString()}/></aside></div>}
    {tab === "population" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Population density</h3><p>Density = population ÷ land area.</p><RangeField label="Population" value={population} min={1000} max={1000000} step={1000} onChange={setPopulation}/><RangeField label="Land area" value={area} min={1} max={1000} unit=" km²" onChange={setArea}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Population density" value={(population/area).toFixed(1)+" people/km²"}/><Result label="Population" value={population.toLocaleString()}/></aside></div>}
  </section>;
}
function BusinessLab() {
  const [tab, setTab] = useState<"breakEven" | "demand" | "marketing">("breakEven");
  const [price, setPrice] = useState(45);
  const [variableCost, setVariableCost] = useState(22);
  const [fixedCost, setFixedCost] = useState(5000);
  const [quantity, setQuantity] = useState(300);
  const [marketPrice, setMarketPrice] = useState(50);
  const [marketingMix, setMarketingMix] = useState("Product");
  const demandSupplyGraph = useMemo<LabGraphConfig>(() => {
    const equilibriumPrice = 140 / 2.4;
    const equilibriumQuantity = 120 - equilibriumPrice;
    const demand = Math.max(0, 120 - marketPrice);
    const supply = Math.max(0, marketPrice * 1.4 - 20);
    return {
      title: "Demand and supply curves",
      xMin: 0, xMax: 100, yMin: 0, yMax: 125,
      xLabel: "Price per unit (E)", yLabel: "Quantity (units)",
      unitNote: "Illustrative classroom model, not a real market forecast.",
      curves: [
        { label: "Demand", evaluate: priceValue => Math.max(0, 120 - priceValue) },
        { label: "Supply", evaluate: priceValue => Math.max(0, priceValue * 1.4 - 20) },
      ],
      points: [
        { x: equilibriumPrice, y: equilibriumQuantity, label: "Equilibrium" },
        { x: marketPrice, y: demand, label: "Demand at selected price" },
        { x: marketPrice, y: supply, label: "Supply at selected price" },
      ],
    };
  }, [marketPrice]);
  return <section className="subject-lab-workspace"><LabHeading eyebrow="DECISIONS & ENTREPRENEURSHIP" title="Business Lab" description="Model a small business, estimate break-even and explore how market price and marketing choices affect performance."/><ToolTabs value={tab} onChange={setTab} options={[{value:"breakEven",label:"Break-even"},{value:"demand",label:"Demand & supply"},{value:"marketing",label:"Marketing mix"}]}/>
    {tab === "breakEven" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Mini business simulator</h3><p>Adjust price and costs to model a simple product.</p><RangeField label="Selling price per unit" value={price} min={5} max={150} unit=" E" onChange={setPrice}/><RangeField label="Variable cost per unit" value={variableCost} min={1} max={100} unit=" E" onChange={setVariableCost}/><RangeField label="Fixed costs" value={fixedCost} min={500} max={30000} step={500} unit=" E" onChange={setFixedCost}/><RangeField label="Units sold" value={quantity} min={0} max={2000} step={10} onChange={setQuantity}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Break-even units" value={price>variableCost?Math.ceil(fixedCost/(price-variableCost)).toLocaleString():"Not reachable"} /><Result label="Revenue" value={"E"+(price*quantity).toLocaleString()}/><Result label="Estimated profit" value={"E"+(price*quantity-variableCost*quantity-fixedCost).toLocaleString()}/><Result label="Contribution per unit" value={"E"+(price-variableCost).toFixed(2)}/></aside></div>}
    {tab === "demand" && <><div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Price and quantity model</h3><p>Illustrative demand typically falls as price rises; this is a simple classroom model.</p><RangeField label="Market price" value={marketPrice} min={5} max={100} unit=" E" onChange={setMarketPrice}/><div className="subject-lab-demand"><span>Demand estimate</span><strong>{Math.max(0,120-marketPrice).toFixed(0)} units</strong><span>Supply estimate</span><strong>{Math.max(0,marketPrice*1.4-20).toFixed(0)} units</strong></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Market position" value={Math.max(0,120-marketPrice)>Math.max(0,marketPrice*1.4-20)?"Shortage pressure":Math.max(0,marketPrice*1.4-20) > Math.max(0,120-marketPrice)?"Surplus pressure":"Approx. balance"}/><Result label="Price" value={"E"+marketPrice}/></aside></div><LabGraphSheet graph={demandSupplyGraph} compact/></>}
    {tab === "marketing" && <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>The 4 Ps of marketing</h3><p>Select a marketing decision to explore its planning questions.</p><ToolTabs value={marketingMix} onChange={setMarketingMix} options={["Product","Price","Place","Promotion"].map(value=>({value,label:value}))}/><div className="subject-lab-explainer"><strong>{marketingMix}</strong><p>{marketingMix==="Product"?"What customer need does the product solve? Consider quality, features, design and packaging.":marketingMix==="Price"?"How does the price compare with costs, customer value and competitors?":marketingMix==="Place"?"Where and how will customers find, buy and receive the product?":"Which message and channel will reach the intended customer at the right time?"}</p></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Marketing framework" value="4 Ps"/><Result label="Planning prompt" value={marketingMix}/></aside></div>}
  </section>;
}
function AccountingLab() {
  type JournalEntry = { id: number; description: string; debitAccount: string; creditAccount: string; debit: number; credit: number };
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [description, setDescription] = useState("Owner invests cash");
  const [amount, setAmount] = useState(1000);
  const [kind, setKind] = useState("capital");
  const templates: Record<string, { debit: string; credit: string }> = {
    capital: { debit: "Cash / Bank", credit: "Capital" },
    sales: { debit: "Cash / Bank", credit: "Sales revenue" },
    purchase: { debit: "Purchases / Inventory", credit: "Cash / Bank" },
    expense: { debit: "Expense", credit: "Cash / Bank" },
    debtor: { debit: "Accounts receivable", credit: "Sales revenue" },
  };
  const add = () => {
    if (amount <= 0 || !Number.isFinite(amount)) return;
    const pair = templates[kind];
    setEntries(current => [...current, { id: current.length + 1, description: description.trim() || pair.debit + " / " + pair.credit, debitAccount: pair.debit, creditAccount: pair.credit, debit: amount, credit: amount }]);
  };
  const debitTotal = entries.reduce((sum, item) => sum + item.debit, 0);
  const creditTotal = entries.reduce((sum, item) => sum + item.credit, 0);
  return <section className="subject-lab-workspace"><LabHeading eyebrow="DOUBLE-ENTRY PRACTICE" title="Accounting Lab" description="Build balanced journal entries, inspect debit and credit totals, and practise the logic behind a trial balance."/>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Journal entry builder</h3><label className="subject-lab-input">Transaction type<select value={kind} onChange={event=>setKind(event.target.value)}><option value="capital">Owner capital introduced</option><option value="sales">Cash sale</option><option value="purchase">Inventory purchased for cash</option><option value="expense">Expense paid in cash</option><option value="debtor">Credit sale</option></select></label><label className="subject-lab-input">Narration<input value={description} onChange={event=>setDescription(event.target.value)} maxLength={100}/></label><label className="subject-lab-input">Amount (E)<input type="number" min="1" max="10000000" value={amount} onChange={event=>setAmount(Number(event.target.value))}/></label><button type="button" className="primary-button" onClick={add}>Add balanced entry</button><p className="subject-lab-note">Each example posts equal debit and credit values. Choose the transaction type first, then review the account pair in the ledger.</p><p><strong>{templates[kind].debit}</strong> Dr · <strong>{templates[kind].credit}</strong> Cr</p></section><aside className="subject-lab-panel subject-lab-results"><Result label="Total debits" value={"E"+debitTotal.toLocaleString()}/><Result label="Total credits" value={"E"+creditTotal.toLocaleString()}/><Result label="Trial balance" value={debitTotal===creditTotal?"Balanced":"Difference: E"+Math.abs(debitTotal-creditTotal).toFixed(2)}/><button type="button" className="secondary-button" onClick={()=>setEntries([])} disabled={!entries.length}>Clear practice entries</button></aside></div>
    <section className="subject-lab-panel subject-lab-table-panel"><h3>General journal</h3>{entries.length?<div className="subject-lab-table-wrap"><table><thead><tr><th>Transaction</th><th>Debit account</th><th>Debit (E)</th><th>Credit account</th><th>Credit (E)</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.description}</td><td>{entry.debitAccount}</td><td>{entry.debit.toLocaleString()}</td><td>{entry.creditAccount}</td><td>{entry.credit.toLocaleString()}</td></tr>)}</tbody></table></div>:<p className="subject-lab-note">Add a transaction to begin your practice journal.</p>}</section>
  </section>;
}
function ComputingLab() {
  const [tab, setTab] = useState<"binary" | "logic" | "sort">("binary");
  const [decimal, setDecimal] = useState(42);
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(false);
  const [gate, setGate] = useState("AND");
  const [numbers, setNumbers] = useState("8, 3, 6, 1, 5");
  const binary = decimal.toString(2).padStart(8, "0");
  const logic = gate==="AND"?left&&right:gate==="OR"?left||right:gate==="XOR"?left!==right:!(left&&right);
  const parsed = numbers.split(",").map(value=>Number(value.trim()));
  const valid = parsed.length>0 && parsed.length<=20 && parsed.every(Number.isFinite);
  const sortTrace = valid ? (() => {
    const values = [...parsed];
    let comparisons = 0;
    let swaps = 0;
    const passes: string[] = [];
    for (let pass = 0; pass < values.length - 1; pass++) {
      let changed = false;
      for (let index = 0; index < values.length - pass - 1; index++) {
        comparisons++;
        if (values[index] > values[index + 1]) {
          [values[index], values[index + 1]] = [values[index + 1], values[index]];
          swaps++;
          changed = true;
        }
      }
      passes.push(values.join(", "));
      if (!changed) break;
    }
    return { values, comparisons, swaps, passes };
  })() : null;
  return <section className="subject-lab-workspace"><LabHeading eyebrow="DIGITAL SYSTEMS & ALGORITHMS" title="ICT & Computer Science Lab" description="Convert number systems, test digital logic and compare an input sequence with its sorted output."/><ToolTabs value={tab} onChange={setTab} options={[{value:"binary",label:"Binary converter"},{value:"logic",label:"Logic gates"},{value:"sort",label:"Sorting"}]}/>
    {tab==="binary"&&<div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Decimal to binary</h3><p>Explore how an unsigned 8-bit number is represented in base two.</p><RangeField label="Decimal value" value={decimal} min={0} max={255} onChange={setDecimal}/><div className="subject-lab-binary">{binary.split("").map((bit,index)=><i key={index}>{bit}</i>)}</div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Decimal" value={String(decimal)}/><Result label="Binary" value={binary}/><Result label="Hexadecimal" value={"0x"+decimal.toString(16).toUpperCase().padStart(2,"0")}/></aside></div>}
    {tab==="logic"&&<div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Logic gate simulator</h3><p>Change the inputs and gate to see the output.</p><ToolTabs value={gate} onChange={setGate} options={["AND","OR","XOR","NAND"].map(value=>({value,label:value}))}/><div className="subject-lab-toggle-row"><button type="button" className={left?"active":""} onClick={()=>setLeft(!left)}>Input A: {left?"1 (true)":"0 (false)"}</button><button type="button" className={right?"active":""} onClick={()=>setRight(!right)}>Input B: {right?"1 (true)":"0 (false)"}</button></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Gate" value={gate}/><Result label="Output" value={logic?"1 (true)":"0 (false)"}/></aside></div>}
    {tab==="sort"&&<><div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Sorting algorithm explorer</h3><p>Enter up to 20 comma-separated numbers to compare the original sequence with its sorted result. The pass list shows bubble sort moving larger values towards the end.</p><label className="subject-lab-input">Input sequence<input value={numbers} onChange={event=>setNumbers(event.target.value)} placeholder="8, 3, 6, 1, 5"/></label>{!valid&&<p className="subject-lab-warning">Enter no more than 20 valid numbers, separated by commas.</p>}</section><aside className="subject-lab-panel subject-lab-results"><Result label="Original" value={valid?parsed.join(", "):"—"}/><Result label="Ascending order" value={valid?sortTrace!.values.join(", "):"—"}/><Result label="Items" value={valid?String(parsed.length):"—"}/><Result label="Comparisons" value={valid?String(sortTrace!.comparisons):"—"}/><Result label="Swaps" value={valid?String(sortTrace!.swaps):"—"}/></aside></div>{valid&&sortTrace?.passes.length?<section className="subject-lab-panel"><h3>Bubble-sort passes</h3><div className="subject-lab-list">{sortTrace.passes.map((pass,index)=><article key={index}><strong>Pass {index+1}</strong><span>{pass}</span></article>)}</div></section>:null}</>}
  </section>;
}
function AgricultureLab() {
  const [ph,setPh]=useState(6.5);
  const [moisture,setMoisture]=useState(55);
  const [organic,setOrganic]=useState(4);
  const [crop,setCrop]=useState("maize");
  const cropAdvice:Record<string,string>={maize:"Maize generally performs best in well-drained soils with adequate nutrients and reliable moisture.",beans:"Beans can improve soil nitrogen through biological fixation when suitable rhizobia are present.",spinach:"Leafy vegetables need steady moisture and fertile, well-drained soil."};
  const soilScore=Math.max(0,100-Math.abs(ph-6.5)*12-Math.abs(moisture-60)*0.5-Math.abs(organic-5)*4);
  return <section className="subject-lab-workspace"><LabHeading eyebrow="SOIL & CROP SCIENCE" title="Agriculture Lab" description="Explore how soil pH, moisture and organic matter can influence a crop plan. The model is illustrative; use local extension advice for real planting decisions."/>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Soil condition simulator</h3><RangeField label="Soil pH" value={ph} min={3} max={10} step={0.1} onChange={setPh}/><RangeField label="Soil moisture" value={moisture} min={0} max={100} unit="%" onChange={setMoisture}/><RangeField label="Organic matter" value={organic} min={0} max={10} step={0.5} unit="%" onChange={setOrganic}/><label className="subject-lab-input">Crop to investigate<select value={crop} onChange={event=>setCrop(event.target.value)}><option value="maize">Maize</option><option value="beans">Beans</option><option value="spinach">Spinach</option></select></label></section><aside className="subject-lab-panel subject-lab-results"><Result label="Illustrative soil suitability" value={soilScore.toFixed(0)+"/100"}/><Result label="pH condition" value={ph<5.5?"Acidic":ph>7.5?"Alkaline":"Near-neutral"}/><p>{cropAdvice[crop]}</p></aside></div>
  </section>;
}
function EngineeringLab() {
  const [teethA,setTeethA]=useState(20);
  const [teethB,setTeethB]=useState(40);
  const [inputSpeed,setInputSpeed]=useState(120);
  const [load,setLoad]=useState(100);
  const [span,setSpan]=useState(5);
  const [material,setMaterial]=useState("timber");
  const strength:Record<string,number>={timber:180,steel:650,concrete:420};
  const capacity=strength[material]/span;
  return <section className="subject-lab-workspace"><LabHeading eyebrow="APPLIED DESIGN & MECHANICS" title="Engineering & Design Lab" description="Explore a simple gear train and a simplified bridge-loading model. These are classroom calculations, not certified design tools."/>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Gear ratio simulator</h3><RangeField label="Input gear teeth" value={teethA} min={10} max={80} onChange={setTeethA}/><RangeField label="Output gear teeth" value={teethB} min={10} max={100} onChange={setTeethB}/><RangeField label="Input speed" value={inputSpeed} min={10} max={500} unit=" rpm" onChange={setInputSpeed}/><div className="subject-lab-gear-diagram"><i style={{width:(30+teethA)+"px",height:(30+teethA)+"px"}}/><i style={{width:(30+teethB)+"px",height:(30+teethB)+"px"}}/></div></section><aside className="subject-lab-panel subject-lab-results"><Result label="Gear ratio" value={(teethB/teethA).toFixed(2)+":1"}/><Result label="Output speed" value={(inputSpeed*teethA/teethB).toFixed(1)+" rpm"}/><Result label="Rotation" value="Opposite direction (meshed gears)"/></aside></div>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Bridge load model</h3><RangeField label="Span" value={span} min={2} max={20} unit=" m" onChange={setSpan}/><RangeField label="Applied load" value={load} min={10} max={1000} step={10} unit=" kg" onChange={setLoad}/><label className="subject-lab-input">Model material<select value={material} onChange={event=>setMaterial(event.target.value)}><option value="timber">Timber (teaching model)</option><option value="steel">Steel (teaching model)</option><option value="concrete">Concrete (teaching model)</option></select></label></section><aside className="subject-lab-panel subject-lab-results"><Result label="Load index" value={(load*span).toFixed(0)}/><Result label="Model capacity index" value={capacity.toFixed(1)}/><Result label="Model response" value={load*span<=strength[material]?"Within this simplified model":"Above this simplified model"}/><p className="subject-lab-note">Real structures require professional engineering calculations, safety factors and material specifications.</p></aside></div>
  </section>;
}
function LanguageLab() {
  const [tab,setTab]=useState<"grammar"|"vocabulary"|"reading">("grammar");
  const [grammarAnswer,setGrammarAnswer]=useState("");
  const [readingAnswer,setReadingAnswer]=useState("");
  const [word,setWord]=useState("persevere");
  const [definition,setDefinition]=useState("continue despite difficulty");
  const [revealed,setRevealed]=useState(false);
  const correct=grammarAnswer==="were";
  return <section className="subject-lab-workspace"><LabHeading eyebrow="COMMUNICATION & LITERACY" title="Language Lab" description="Practise sentence agreement, create personal vocabulary cards and test careful reading. The starter grammar example is in English; use MIΛ for language-specific guidance in other subjects."/><ToolTabs value={tab} onChange={setTab} options={[{value:"grammar",label:"Grammar"},{value:"vocabulary",label:"Vocabulary cards"},{value:"reading",label:"Reading"}]}/>
    {tab==="grammar"&&<div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Subject–verb agreement</h3><p>Choose the correct verb to complete the sentence.</p><div className="subject-lab-sentence">If they _____ prepared, they would start now.</div><div className="subject-lab-choice-row">{["was","were","is"].map(item=><button type="button" key={item} className={grammarAnswer===item?"active":""} onClick={()=>setGrammarAnswer(item)}>{item}</button>)}</div>{grammarAnswer&&<p className={correct?"subject-lab-correct":"subject-lab-note"}>{correct?"Correct. “They” takes “were” in this conditional sentence.":"Try again. Check the subject and the conditional structure."}</p>}</section><aside className="subject-lab-panel subject-lab-results"><Result label="Skill" value="Verb agreement"/><Result label="Feedback" value={correct?"Correct":"Practice"}/></aside></div>}
    {tab==="vocabulary"&&<div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Build a vocabulary card</h3><label className="subject-lab-input">Word or phrase<input value={word} onChange={event=>{setWord(event.target.value);setRevealed(false);}} maxLength={80}/></label><label className="subject-lab-input">Meaning<input value={definition} onChange={event=>{setDefinition(event.target.value);setRevealed(false);}} maxLength={200}/></label><button type="button" className="secondary-button" onClick={()=>setRevealed(!revealed)}>{revealed?"Hide meaning":"Reveal meaning"}</button></section><aside className="subject-lab-panel subject-lab-results"><span className="eyebrow">YOUR WORD</span><strong className="subject-lab-vocab-word">{word||"Add a word"}</strong>{revealed?<p>{definition}</p>:<p>Think of the meaning, then reveal it to check your recall.</p>}</aside></div>}
    {tab==="reading"&&<div className="subject-lab-panel"><h3>Reading comprehension</h3><p className="subject-lab-reading">Study routines work best when learners set a clear goal, practise actively and review mistakes. Short, focused sessions can make difficult topics easier to approach.</p><label className="subject-lab-input">What is the main idea?<select value={readingAnswer} onChange={event=>setReadingAnswer(event.target.value)}><option value="">Choose an answer</option><option value="a">Active study and review help learning.</option><option value="b">Long sessions are always better.</option><option value="c">Mistakes should be ignored.</option></select></label><p className={readingAnswer==="a"?"subject-lab-correct":"subject-lab-note"}>{readingAnswer==="a"?"Correct. The passage emphasises clear goals, active practice and reviewing mistakes.":readingAnswer?"Not quite. Find the idea repeated across the passage.":"Read the passage and choose its central message."}</p></div>}
  </section>;
}
function HospitalityLab() {
  const [ingredientCost,setIngredientCost]=useState(32);
  const [foodCostTarget,setFoodCostTarget]=useState(30);
  const [rooms,setRooms]=useState(40);
  const [occupied,setOccupied]=useState(28);
  const [roomRate,setRoomRate]=useState(750);
  const [scenario,setScenario]=useState("arrival");
  const scenarios:Record<string,string>={arrival:"Welcome the guest, confirm the booking and offer clear information about the stay.",complaint:"Listen without interrupting, acknowledge the concern, clarify the desired outcome and agree on a realistic solution.",departure:"Confirm charges, ask whether the stay met expectations and explain the check-out process."};
  return <section className="subject-lab-workspace"><LabHeading eyebrow="SERVICE & OPERATIONS" title="Hospitality & Tourism Lab" description="Practise food-cost calculations, room occupancy and guest-service decisions with realistic teaching examples."/>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Menu costing</h3><RangeField label="Ingredient cost per portion" value={ingredientCost} min={5} max={150} unit=" E" onChange={setIngredientCost}/><RangeField label="Target food-cost percentage" value={foodCostTarget} min={15} max={60} unit="%" onChange={setFoodCostTarget}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Suggested menu price" value={"E"+(ingredientCost/(foodCostTarget/100)).toFixed(2)}/><Result label="Gross contribution" value={"E"+(ingredientCost/(foodCostTarget/100)-ingredientCost).toFixed(2)}/><Result label="Food cost ratio" value={foodCostTarget+"%"}/></aside></div>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>Hotel occupancy</h3><RangeField label="Available rooms" value={rooms} min={1} max={300} onChange={setRooms}/><RangeField label="Occupied rooms" value={Math.min(occupied,rooms)} min={0} max={rooms} onChange={setOccupied}/><RangeField label="Average daily room rate" value={roomRate} min={100} max={5000} step={50} unit=" E" onChange={setRoomRate}/></section><aside className="subject-lab-panel subject-lab-results"><Result label="Occupancy rate" value={(Math.min(occupied,rooms)/rooms*100).toFixed(1)+"%"}/><Result label="Room revenue" value={"E"+(Math.min(occupied,rooms)*roomRate).toLocaleString()}/></aside></div>
    <section className="subject-lab-panel"><h3>Guest-service scenario</h3><label className="subject-lab-input">Situation<select value={scenario} onChange={event=>setScenario(event.target.value)}><option value="arrival">Guest arrival</option><option value="complaint">Guest complaint</option><option value="departure">Guest departure</option></select></label><p>{scenarios[scenario]}</p></section>
  </section>;
}
function DesignLab() {
  const [red,setRed]=useState(120);
  const [green,setGreen]=useState(90);
  const [blue,setBlue]=useState(210);
  const [balance,setBalance]=useState(50);
  const hex="#"+[red,green,blue].map(value=>value.toString(16).padStart(2,"0")).join("").toUpperCase();
  return <section className="subject-lab-workspace"><LabHeading eyebrow="VISUAL COMMUNICATION" title="Art & Design Studio" description="Mix an RGB colour, read its hexadecimal value and test how visual weight can be balanced in a simple composition."/>
    <div className="subject-lab-grid"><section className="subject-lab-panel"><h3>RGB colour mixer</h3><RangeField label="Red" value={red} min={0} max={255} onChange={setRed}/><RangeField label="Green" value={green} min={0} max={255} onChange={setGreen}/><RangeField label="Blue" value={blue} min={0} max={255} onChange={setBlue}/></section><aside className="subject-lab-panel subject-lab-results"><div className="subject-lab-colour-swatch" style={{background:hex}}/><Result label="Hex colour" value={hex}/><Result label="RGB" value={red+", "+green+", "+blue}/></aside></div>
    <section className="subject-lab-panel"><h3>Composition balance</h3><p>Adjust visual weight between the left and right side of a layout.</p><RangeField label="Left-side visual weight" value={balance} min={0} max={100} unit="%" onChange={setBalance}/><div className="subject-lab-balance"><i style={{flex:balance+1}}/><i style={{flex:101-balance}}/></div><p className="subject-lab-note">{balance>=45&&balance<=55?"The composition is close to symmetrical.":"The composition is asymmetrical; balance can still be achieved through contrast, scale and placement."}</p></section>
  </section>;
}
