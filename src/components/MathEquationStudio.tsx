import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpenCheck, CheckCircle2, ChevronRight, Lightbulb, RefreshCw, Sigma, Sparkles } from "lucide-react";
import "./MathEquationStudio.css";

type Pathway = "Primary" | "Secondary High" | "High School" | "Matric" | "Tertiary";
type Topic = "linear" | "quadratic" | "systems" | "rational" | "radical" | "exponential" | "logarithmic" | "absolute" | "trigonometry";
type Problem = { topic: Topic; pathway: Pathway; prompt: string; answer: number[]; steps: string[]; hint: string; domain: string; methods: string[]; methodNote: string };
type TopicMeta = { id: Topic; title: string; description: string; pathways: Pathway[] };

const topics: TopicMeta[] = [
  { id: "linear", title: "Linear equations", description: "Inverse operations and the balance principle", pathways: ["Primary", "Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "quadratic", title: "Quadratic equations", description: "Factorisation and the quadratic formula", pathways: ["Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "systems", title: "Simultaneous equations", description: "Elimination and substitution in two variables", pathways: ["Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "rational", title: "Rational equations", description: "Fractions, restrictions and excluded values", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "radical", title: "Radical equations", description: "Isolating roots and checking candidates", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "exponential", title: "Exponential equations", description: "Rewrite both sides with a common base", pathways: ["Matric", "Tertiary"] },
  { id: "logarithmic", title: "Logarithmic equations", description: "Log definitions, laws and domain checks", pathways: ["Matric", "Tertiary"] },
  { id: "absolute", title: "Absolute-value equations", description: "Split into positive and negative cases", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "trigonometry", title: "Basic trigonometric equations", description: "Circular functions and solutions in a stated interval", pathways: ["Matric", "Tertiary"] },
];
const historyKey = "studyspace:math-equation-studio:v1";
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const signed = (value: number) => value < 0 ? " − " + Math.abs(value) : " + " + value;
const multiply = (a: number, variable: string) => a === 1 ? variable : a === -1 ? "−" + variable : a + variable;

function createProblem(topic: Topic, pathway: Pathway): Problem {
  if (topic === "linear") {
    const a = pathway === "Primary" ? 1 : randomInt(2, 9);
    const x = randomInt(-6, 12);
    const b = randomInt(-10, 12);
    const c = a * x + b;
    return { topic, pathway, prompt: multiply(a, "x") + signed(b) + " = " + c, answer: [x], hint: "Undo the addition or subtraction first. Whatever you do to one side, do to the other.", domain: "All real numbers", methods: ["Balance / inverse operations", "Graph both sides"], methodNote: "The balance method keeps the two sides equivalent at every step.", steps: ["Start with " + multiply(a, "x") + signed(b) + " = " + c + ".", "Subtract " + b + " from both sides: " + multiply(a, "x") + " = " + (c - b) + ".", "Divide both sides by " + a + ".", "Therefore x = " + x + ".", "Check: substitute x = " + x + " into the original equation."] };
  }
  if (topic === "quadratic") {
    let r1 = randomInt(-6, 6), r2 = randomInt(-6, 6);
    while (r1 === r2) r2 = randomInt(-6, 6);
    const b = -(r1 + r2), c = r1 * r2;
    const factor = "(x " + (r1 < 0 ? "+ " + Math.abs(r1) : "− " + r1) + ")(x " + (r2 < 0 ? "+ " + Math.abs(r2) : "− " + r2) + ") = 0";
    return { topic, pathway, prompt: "x²" + signed(b) + signed(c) + " = 0", answer: [r1, r2], hint: "Look for two numbers whose product is the constant term and whose sum is the coefficient of x.", domain: "All real numbers", methods: ["Factorisation", "Quadratic formula", "Graphing"], methodNote: "Factorisation is efficient when integer factors are visible. The quadratic formula works for every quadratic with a ≠ 0.", steps: ["Write the equation in standard form ax² + bx + c = 0.", "Find two numbers with product " + c + " and sum " + b + ".", "Factor: " + factor + ".", "Use the zero-product rule: x " + (r1 < 0 ? "+ " + Math.abs(r1) : "− " + r1) + " = 0 or x " + (r2 < 0 ? "+ " + Math.abs(r2) : "− " + r2) + " = 0.", "Solutions: x = " + r1 + " and x = " + r2 + ".", "Substitute both roots into the original equation to verify."] };
  }
  if (topic === "systems") {
    let a = randomInt(1, 5), b = randomInt(1, 5), d = randomInt(1, 5), e = randomInt(1, 5);
    while (a * e - b * d === 0) { d = randomInt(1, 5); e = randomInt(1, 5); }
    const x = randomInt(-4, 5), y = randomInt(-4, 5), c = a * x + b * y, f = d * x + e * y;
    return { topic, pathway, prompt: a + "x + " + b + "y = " + c + "     and     " + d + "x + " + e + "y = " + f, answer: [x, y], hint: "Choose elimination or substitution. Elimination removes one variable so you can solve for the other.", domain: "One unique solution (non-zero determinant)", methods: ["Elimination", "Substitution", "Graphing"], methodNote: "Elimination is often efficient when coefficients can be matched. Substitution is useful when one variable is already isolated.", steps: ["Label the equations (1) and (2).", "Multiply one or both equations so the coefficients of y (or x) are opposites.", "Add the equations to eliminate that variable.", "Solve the resulting one-variable equation.", "Substitute that value into either original equation.", "Solution: x = " + x + ", y = " + y + ". Check both original equations."] };
  }
  if (topic === "rational") {
    const h = randomInt(-5, 5), m = randomInt(1, 5), q = randomInt(1, 5), k = m * q, x = h + q;
    return { topic, pathway, prompt: k + " / (x " + (h < 0 ? "+ " + Math.abs(h) : "− " + h) + ") = " + m, answer: [x], hint: "First state which value makes the denominator zero. Then multiply both sides by the denominator.", domain: "x ≠ " + h, methods: ["Clear the denominator", "Equivalent multiplication"], methodNote: "Multiplying by a variable expression is valid only while its denominator is non-zero.", steps: ["Domain restriction: x ≠ " + h + ".", "Multiply both sides by (x " + (h < 0 ? "+ " + Math.abs(h) : "− " + h) + ").", "This gives " + k + " = " + m + "(x " + (h < 0 ? "+ " + Math.abs(h) : "− " + h) + ").", "Divide by " + m + ", then isolate x.", "Candidate solution: x = " + x + ".", "Check x = " + x + " in the original equation. It is allowed because it is not " + h + "."] };
  }
  if (topic === "radical") {
    const a = randomInt(-6, 8), root = randomInt(2, 8), x = root * root - a;
    return { topic, pathway, prompt: "√(x " + (a < 0 ? "− " + Math.abs(a) : "+ " + a) + ") = " + root, answer: [x], hint: "Isolate the square root, square both sides, then substitute your candidate into the original equation.", domain: "x " + (a < 0 ? "≥ " + Math.abs(a) : "≥ " + -a), methods: ["Isolate and square", "Graph both sides"], methodNote: "Squaring is not a reversible operation in every context. Always check for extraneous roots.", steps: ["The square root is already isolated.", "Square both sides: x " + (a < 0 ? "− " + Math.abs(a) : "+ " + a) + " = " + (root * root) + ".", "Isolate x: x = " + x + ".", "Check the domain and substitute x = " + x + " into the original equation.", "The left side is √" + (x + a) + " = " + root + ", so the candidate is valid."] };
  }
  if (topic === "exponential") {
    const base = randomInt(2, 4), shift = randomInt(-4, 5), power = randomInt(1, 5), x = power - shift;
    return { topic, pathway, prompt: base + "^(x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + ") = " + base + "^" + power, answer: [x], hint: "Both sides already have the same base. Equate the exponents, provided the base is positive and not 1.", domain: "All real x (base " + base + " is positive and not 1)", methods: ["Common-base method", "Logarithms"], methodNote: "When equal positive bases (not 1) are on both sides, their exponents must be equal.", steps: ["The bases are equal: " + base + ".", "Equate exponents: x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + " = " + power + ".", "Undo the shift on both sides.", "Therefore x = " + x + ".", "Substitute the value to confirm both powers match."] };
  }
  if (topic === "logarithmic") {
    const base = randomInt(2, 5), power = randomInt(1, 4), shift = randomInt(-5, 5), x = Math.pow(base, power) - shift;
    return { topic, pathway, prompt: "log" + base + "(x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + ") = " + power, answer: [x], hint: "Convert the logarithm to exponential form: log_b(A) = n means A = bⁿ.", domain: "The logarithm argument must be greater than 0", methods: ["Convert to exponential form", "Use logarithm laws"], methodNote: "A logarithm is defined only when its argument is positive and its base is positive and not 1.", steps: ["Convert to exponential form: x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + " = " + base + "^" + power + ".", "Evaluate the power: " + Math.pow(base, power) + ".", "Isolate x: x = " + x + ".", "Domain check: x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + " = " + Math.pow(base, power) + " > 0.", "The solution is valid."] };
  }
  if (topic === "absolute") {
    const centre = randomInt(-8, 8), distance = randomInt(1, 7);
    return { topic, pathway, prompt: "|x " + (centre < 0 ? "+ " + Math.abs(centre) : "− " + centre) + "| = " + distance, answer: [centre - distance, centre + distance], hint: "An absolute value measures distance. There are usually two cases: the inside is positive or negative.", domain: "All real numbers", methods: ["Positive / negative cases", "Graphing"], methodNote: "For |u| = k with k > 0, solve u = k and u = −k.", steps: ["Split into two cases: x " + (centre < 0 ? "+ " + Math.abs(centre) : "− " + centre) + " = " + distance + " OR x " + (centre < 0 ? "+ " + Math.abs(centre) : "− " + centre) + " = −" + distance + ".", "Solve the first case: x = " + (centre + distance) + ".", "Solve the second case: x = " + (centre - distance) + ".", "Both values are valid because each is exactly " + distance + " units from " + centre + "."] };
  }
  const pairs: Record<string, number[]> = { "1/2": [30, 150], "√3/2": [60, 120], "−1/2": [210, 330] };
  const keys = Object.keys(pairs), selected = keys[randomInt(0, keys.length - 1)], roots = pairs[selected];
  return { topic, pathway, prompt: "Solve sin(θ) = " + selected + " for 0° ≤ θ < 360°.", answer: roots, hint: "Find the reference angle, then use the signs of sine in the first and second quadrants.", domain: "0° ≤ θ < 360°", methods: ["Reference-angle method", "Unit-circle method", "Graphing"], methodNote: "Sine is positive in quadrants I and II and negative in quadrants III and IV.", steps: ["Find the reference angle for the given sine value.", "Locate the quadrants where sine has the required sign.", "The solutions in this interval are " + roots[0] + "° and " + roots[1] + "°.", "Check both angles on the unit circle."] };
}

function parseAnswers(value: string): number[] {
  return value.split(/[,;\s]+/).map(item => item.trim()).filter(Boolean).map(Number);
}
function sameAnswers(actual: number[], expected: number[]) {
  if (actual.length !== expected.length || actual.some(value => !Number.isFinite(value))) return false;
  const a = [...actual].sort((x, y) => x - y), b = [...expected].sort((x, y) => x - y);
  return a.every((value, index) => Math.abs(value - b[index]) < 0.011);
}

export default function MathEquationStudio() {
  const [pathway, setPathway] = useState<Pathway>("High School");
  const [topic, setTopic] = useState<Topic>("linear");
  const [difficulty, setDifficulty] = useState<"guided" | "independent" | "challenge">("guided");
  const [problem, setProblem] = useState<Problem>(() => createProblem("linear", "High School"));
  const [method, setMethod] = useState("Balance / inverse operations");
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [attempts, setAttempts] = useState<{ topic: Topic; correct: boolean }[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    try { setAttempts(JSON.parse(localStorage.getItem(historyKey) || "[]")); } catch { setAttempts([]); }
  }, []);
  useEffect(() => {
    if (!topics.find(item => item.id === topic)?.pathways.includes(pathway)) {
      const next = topics.find(item => item.pathways.includes(pathway));
      if (next) {
        setTopic(next.id);
        const generated = createProblem(next.id, pathway);
        setProblem(generated);
        setMethod(generated.methods[0]);
        setAnswer("");
        setChecked(false);
        setShowHint(false);
        setShowSteps(false);
      }
    }
  }, [pathway, topic]);

  const availableTopics = useMemo(() => topics.filter(item => item.pathways.includes(pathway)), [pathway]);
  const total = attempts.length;
  const accuracy = total ? Math.round(attempts.filter(item => item.correct).length / total * 100) : 0;
  const weakTopic = useMemo(() => {
    const counts = new Map<Topic, { total: number; correct: number }>();
    attempts.forEach(item => { const current = counts.get(item.topic) ?? { total: 0, correct: 0 }; current.total++; if (item.correct) current.correct++; counts.set(item.topic, current); });
    return [...counts.entries()].filter(([, value]) => value.total >= 2).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0]?.[0];
  }, [attempts]);

  function nextProblem(nextTopic = topic) {
    const next = createProblem(nextTopic, pathway);
    setProblem(next); setMethod(next.methods[0]); setAnswer(""); setChecked(false); setShowHint(false); setShowSteps(false); setStepIndex(0);
  }
  function checkAnswer() {
    if (!answer.trim()) return;
    const correct = sameAnswers(parseAnswers(answer), problem.answer);
    const next = [...attempts, { topic: problem.topic, correct }].slice(-250);
    setAttempts(next);
    try { localStorage.setItem(historyKey, JSON.stringify(next)); } catch { /* The current session remains usable if storage is full. */ }
    setChecked(true);
  }

  return <section className="equation-studio" aria-labelledby="equation-studio-title">
    <header className="equation-studio-header">
      <div className="equation-studio-icon"><Sigma size={25}/></div>
      <div><span className="eyebrow">ADAPTIVE MATHEMATICS WORKSPACE</span><h2 id="equation-studio-title">Math Equation Studio</h2><p>Learn the method, work through each transformation and check your solution—not just the final answer.</p></div>
    </header>
    <div className="equation-studio-stats">
      <article><strong>{total}</strong><span>Practice attempts</span></article><article><strong>{accuracy}%</strong><span>Accuracy</span></article><article><strong>{weakTopic ? topics.find(item => item.id === weakTopic)?.title : "Building"}</strong><span>Topic to revisit</span></article>
    </div>
    <div className="equation-studio-controls">
      <label>Learning pathway<select value={pathway} onChange={event => {
        const nextPathway = event.target.value as Pathway;
        const nextTopic = topics.find(item => item.id === topic && item.pathways.includes(nextPathway))?.id ?? topics.find(item => item.pathways.includes(nextPathway))!.id;
        setPathway(nextPathway);
        setTopic(nextTopic);
        const generated = createProblem(nextTopic, nextPathway);
        setProblem(generated);
        setMethod(generated.methods[0]);
        setAnswer("");
        setChecked(false);
        setShowHint(false);
        setShowSteps(false);
      }}><option>Primary</option><option>Secondary High</option><option>High School</option><option>Matric</option><option>Tertiary</option></select></label>
      <label>Equation family<select value={topic} onChange={event => { const next = event.target.value as Topic; setTopic(next); nextProblem(next); }} >{availableTopics.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Practice style<select value={difficulty} onChange={event => setDifficulty(event.target.value as typeof difficulty)}><option value="guided">Guided · show hints</option><option value="independent">Independent · fewer prompts</option><option value="challenge">Challenge · solve first</option></select></label>
    </div>
    <div className="equation-studio-topic"><div><span className="eyebrow">CURRENT SKILL</span><h3>{topics.find(item => item.id === topic)?.title}</h3><p>{topics.find(item => item.id === topic)?.description}</p></div><span className="equation-studio-pathway">{pathway}</span></div>
    <div className="equation-studio-problem">
      <div className="equation-studio-problem-top"><span>YOUR QUESTION</span><button type="button" onClick={() => nextProblem()}><RefreshCw size={14}/> New variant</button></div>
      <div className="equation-studio-equation" aria-live="polite">{problem.prompt}</div>
      <p className="equation-studio-domain"><strong>Domain / restrictions:</strong> {problem.domain}</p>
      <label className="equation-studio-answer">Your solution <input value={answer} onChange={event => { setAnswer(event.target.value); setChecked(false); }} onKeyDown={event => { if (event.key === "Enter") checkAnswer(); }} placeholder={problem.answer.length > 1 ? "Enter both answers, separated by a comma" : "Enter your value for x"}/></label>
      <div className="equation-studio-actions"><button type="button" className="equation-studio-primary" onClick={checkAnswer} disabled={!answer.trim() || checked}>Check my answer</button><button type="button" onClick={() => setShowHint(value => !value)}><Lightbulb size={15}/> {showHint ? "Hide hint" : "Get a hint"}</button><button type="button" onClick={() => { setShowSteps(value => !value); setStepIndex(0); }}><BookOpenCheck size={15}/> {showSteps ? "Hide solution" : "Work through steps"}</button></div>
      {showHint && <div className="equation-studio-hint"><Lightbulb size={16}/><span>{problem.hint}</span></div>}
      {checked && <div className={"equation-studio-feedback " + (sameAnswers(parseAnswers(answer), problem.answer) ? "correct" : "incorrect")} role="status"><strong>{sameAnswers(parseAnswers(answer), problem.answer) ? "Correct — well reasoned." : "Not quite. Use the hint or compare the worked method."}</strong><span>Expected solution: {problem.answer.join(", ")}</span></div>}
      {showSteps && <div className="equation-studio-steps"><div className="equation-studio-steps-head"><strong>Worked solution</strong><span>Step {stepIndex + 1} of {problem.steps.length}</span></div><p>{problem.steps[stepIndex]}</p><div className="equation-studio-step-actions"><button type="button" onClick={() => setStepIndex(value => Math.max(0, value - 1))} disabled={stepIndex === 0}>Previous</button><button type="button" onClick={() => setStepIndex(value => Math.min(problem.steps.length - 1, value + 1))} disabled={stepIndex === problem.steps.length - 1}>Next step <ChevronRight size={14}/></button></div></div>}
    </div>
    <div className="equation-studio-method"><div><span className="eyebrow">METHOD SELECTION</span><h3>Choose an approach</h3><p>{problem.methodNote}</p></div><div className="equation-studio-method-options">{problem.methods.map(item => <button type="button" key={item} className={method === item ? "active" : ""} onClick={() => setMethod(item)}>{item}</button>)}</div></div>
    {difficulty === "guided" && <div className="equation-studio-guidance"><Sparkles size={15}/> Guided mode is selected. Try the hint first, then reveal one worked step at a time.</div>}
    {weakTopic && <div className="equation-studio-guidance"><Activity size={15}/> Your recent practice suggests revisiting {topics.find(item => item.id === weakTopic)?.title}. Switch to that topic for a focused refresher.</div>}
    <footer className="equation-studio-footer"><CheckCircle2 size={15}/> Practice history is saved on this device. Teacher-assigned marks remain separate from personal Lab practice.</footer>
  </section>;
}
