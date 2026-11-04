import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, RotateCcw, Trophy, XCircle, Puzzle, ListChecks, PenLine, ToggleLeft } from "lucide-react";
import type { Subject } from "../data/db";

type Mode = "Multiple choice" | "Word puzzle" | "Fill the blanks" | "True or false";
type Exercise = { prompt: string; answer: string; options?: string[]; clue?: string; scramble?: string };
type Attempt = { id: string; subject: string; mode: Mode; score: number; total: number; completedAt: string };

const banks: Record<string, Record<Mode, Exercise[]>> = {
  mathematics: {
    "Multiple choice": [
      { prompt: "Solve: 3x + 5 = 20.", options: ["x = 3", "x = 5", "x = 7", "x = 15"], answer: "x = 5" },
      { prompt: "What is 15% of 200?", options: ["15", "20", "30", "45"], answer: "30" },
      { prompt: "What is the area of a rectangle 8 cm by 5 cm?", options: ["13 cm²", "26 cm²", "40 cm²", "80 cm²"], answer: "40 cm²" },
      { prompt: "Simplify: 4a + 3a − 2a.", options: ["5a", "7a", "9a", "a"], answer: "5a" },
      { prompt: "What is the square root of 144?", options: ["10", "11", "12", "14"], answer: "12" }
    ],
    "Word puzzle": [
      { prompt: "A number that can be divided exactly by 2.", answer: "EVEN", clue: "Number property", scramble: "NEVE" },
      { prompt: "The result of multiplying numbers.", answer: "PRODUCT", clue: "Arithmetic vocabulary", scramble: "DURPTOC" },
      { prompt: "The distance around a circle.", answer: "CIRCUMFERENCE", clue: "Circle measurement", scramble: "ECNEREFMUCRIC" },
      { prompt: "A mathematical statement that two expressions are equal.", answer: "EQUATION", clue: "Algebra vocabulary", scramble: "QUTAEION" },
      { prompt: "A polygon with three sides.", answer: "TRIANGLE", clue: "Geometry", scramble: "GRAINTLE" }
    ],
    "Fill the blanks": [
      { prompt: "The sum of the angles in a triangle is ___ degrees.", answer: "180" },
      { prompt: "A number multiplied by itself is its ___ number.", answer: "square" },
      { prompt: "The value of pi to 2 decimal places is ___.", answer: "3.14" },
      { prompt: "The coordinates where the axes meet are (0, ___).", answer: "0" },
      { prompt: "An angle greater than 90° but less than 180° is ___ .", answer: "obtuse" }
    ],
    "True or false": [
      { prompt: "A prime number has exactly two positive factors.", options: ["True", "False"], answer: "True" },
      { prompt: "The square of 5 is 10.", options: ["True", "False"], answer: "False" },
      { prompt: "A right angle measures 90 degrees.", options: ["True", "False"], answer: "True" },
      { prompt: "Every multiple of 4 is also a multiple of 2.", options: ["True", "False"], answer: "True" },
      { prompt: "The sum of the interior angles of a quadrilateral is 360 degrees.", options: ["True", "False"], answer: "True" }
    ]
  },
  english: {
    "Multiple choice": [
      { prompt: "Which word is an adjective?", options: ["Quickly", "Beautiful", "Run", "Happiness"], answer: "Beautiful" },
      { prompt: "Choose the correct plural of 'analysis'.", options: ["Analysises", "Analyses", "Analysis", "Analys"], answer: "Analyses" },
      { prompt: "Which sentence uses the apostrophe correctly?", options: ["The students book's", "The student's book", "The students's book", "The student book's"], answer: "The student's book" },
      { prompt: "A comparison using 'like' or 'as' is called a…", options: ["Metaphor", "Simile", "Hyperbole", "Irony"], answer: "Simile" },
      { prompt: "Which is the closest synonym for 'reluctant'?", options: ["Unwilling", "Excited", "Certain", "Careless"], answer: "Unwilling" }
    ],
    "Word puzzle": [
      { prompt: "A word that means the opposite of another word.", answer: "ANTONYM", clue: "Vocabulary", scramble: "NOMYANT" },
      { prompt: "A word with a similar meaning to another word.", answer: "SYNONYM", clue: "Vocabulary", scramble: "MYNSONY" },
      { prompt: "A person, place, thing or idea.", answer: "NOUN", clue: "Parts of speech", scramble: "UNON" },
      { prompt: "A word that describes a noun.", answer: "ADJECTIVE", clue: "Parts of speech", scramble: "JADCEITVE" },
      { prompt: "The central message or insight in a text.", answer: "THEME", clue: "Literature", scramble: "EMTHE" }
    ],
    "Fill the blanks": [
      { prompt: "A verb expresses an action or a state of ___.", answer: "being" },
      { prompt: "The past tense of 'write' is ___.", answer: "wrote" },
      { prompt: "A group of lines in a poem is a ___.", answer: "stanza" },
      { prompt: "A sentence that asks a question ends with a question ___.", answer: "mark" },
      { prompt: "The word 'their' is a possessive ___.", answer: "pronoun" }
    ],
    "True or false": [
      { prompt: "An adverb can modify a verb.", options: ["True", "False"], answer: "True" },
      { prompt: "A metaphor always uses the words 'like' or 'as'.", options: ["True", "False"], answer: "False" },
      { prompt: "A proper noun begins with a capital letter.", options: ["True", "False"], answer: "True" },
      { prompt: "A paragraph should normally develop one main idea.", options: ["True", "False"], answer: "True" },
      { prompt: "The word 'quickly' is an adjective.", options: ["True", "False"], answer: "False" }
    ]
  },
  science: {
    "Multiple choice": [
      { prompt: "Which cell structure contains most of the genetic material?", options: ["Ribosome", "Nucleus", "Cell wall", "Vacuole"], answer: "Nucleus" },
      { prompt: "What is the chemical symbol for oxygen?", options: ["Ox", "O", "Og", "Oy"], answer: "O" },
      { prompt: "Which process do green plants use to make glucose?", options: ["Respiration", "Photosynthesis", "Digestion", "Transpiration"], answer: "Photosynthesis" },
      { prompt: "What is the SI unit of force?", options: ["Joule", "Watt", "Newton", "Pascal"], answer: "Newton" },
      { prompt: "Which particle has a negative electric charge?", options: ["Proton", "Neutron", "Electron", "Nucleus"], answer: "Electron" }
    ],
    "Word puzzle": [
      { prompt: "The basic structural and functional unit of life.", answer: "CELL", clue: "Biology", scramble: "LELC" },
      { prompt: "The green pigment that absorbs light in plants.", answer: "CHLOROPHYLL", clue: "Photosynthesis", scramble: "LCHOROPHYLL" },
      { prompt: "The force that pulls objects towards Earth.", answer: "GRAVITY", clue: "Physics", scramble: "VIGRATY" },
      { prompt: "A substance made of one type of atom.", answer: "ELEMENT", clue: "Chemistry", scramble: "TELENME" },
      { prompt: "The movement of water through a partially permeable membrane.", answer: "OSMOSIS", clue: "Biology", scramble: "SOMOSIS" }
    ],
    "Fill the blanks": [
      { prompt: "The process by which cells release energy from glucose is ___.", answer: "respiration" },
      { prompt: "The smallest unit of an element is an ___.", answer: "atom" },
      { prompt: "The human heart has ___ chambers.", answer: "four" },
      { prompt: "Water has the chemical formula ___.", answer: "h2o" },
      { prompt: "The change from liquid to gas is called ___.", answer: "evaporation" }
    ],
    "True or false": [
      { prompt: "Sound travels faster in a vacuum than in air.", options: ["True", "False"], answer: "False" },
      { prompt: "Plants use carbon dioxide during photosynthesis.", options: ["True", "False"], answer: "True" },
      { prompt: "An atom is electrically neutral when protons equal electrons.", options: ["True", "False"], answer: "True" },
      { prompt: "The liver is part of the digestive system.", options: ["True", "False"], answer: "True" },
      { prompt: "All metals are liquids at room temperature.", options: ["True", "False"], answer: "False" }
    ]
  },
  general: {
    "Multiple choice": [
      { prompt: "Which study technique involves recalling information without looking at notes?", options: ["Passive rereading", "Active recall", "Highlighting only", "Copying notes"], answer: "Active recall" },
      { prompt: "Which source is generally best for checking a scientific claim?", options: ["An anonymous post", "A peer-reviewed study", "An advert", "A rumour"], answer: "A peer-reviewed study" },
      { prompt: "What should a good paragraph usually contain?", options: ["Several unrelated ideas", "One clear main idea", "Only quotations", "No evidence"], answer: "One clear main idea" },
      { prompt: "Which is the best first step when solving a word problem?", options: ["Guess", "Identify the given information", "Skip the question", "Write any formula"], answer: "Identify the given information" },
      { prompt: "What is the purpose of a conclusion?", options: ["Introduce unrelated facts", "Summarise the main findings", "Add a new topic", "Repeat the title only"], answer: "Summarise the main findings" }
    ],
    "Word puzzle": [
      { prompt: "A planned way of approaching a task.", answer: "STRATEGY", clue: "Study skills", scramble: "TRATEGY S" },
      { prompt: "Information collected for analysis.", answer: "DATA", clue: "Research skills", scramble: "ATAD" },
      { prompt: "A reasoned judgement based on evidence.", answer: "CONCLUSION", clue: "Academic writing", scramble: "CONLUSIONC" },
      { prompt: "A statement that can be tested.", answer: "HYPOTHESIS", clue: "Scientific method", scramble: "HYPOTHEISS" },
      { prompt: "A source that gives information about a subject.", answer: "REFERENCE", clue: "Research skills", scramble: "EFERENCER" }
    ],
    "Fill the blanks": [
      { prompt: "A reliable argument should be supported by ___.", answer: "evidence" },
      { prompt: "The first stage of many research projects is defining the ___.", answer: "question" },
      { prompt: "A summary presents the main points in a ___ form.", answer: "concise" },
      { prompt: "A bibliography lists the sources that were ___.", answer: "used" },
      { prompt: "A deadline is the latest time by which work must be ___.", answer: "submitted" }
    ],
    "True or false": [
      { prompt: "Active recall can help strengthen memory.", options: ["True", "False"], answer: "True" },
      { prompt: "A source is reliable simply because it appears first in a search.", options: ["True", "False"], answer: "False" },
      { prompt: "Revision is more effective when it is spaced over time.", options: ["True", "False"], answer: "True" },
      { prompt: "A conclusion should address the task or research question.", options: ["True", "False"], answer: "True" },
      { prompt: "Copying a source without acknowledgement is good academic practice.", options: ["True", "False"], answer: "False" }
    ]
  }
};

const modes: { name: Mode; icon: typeof ListChecks; description: string }[] = [
  { name: "Multiple choice", icon: ListChecks, description: "Choose the best answer" },
  { name: "Word puzzle", icon: Puzzle, description: "Unscramble the key term" },
  { name: "Fill the blanks", icon: PenLine, description: "Recall the missing word" },
  { name: "True or false", icon: ToggleLeft, description: "Judge each statement" }
];

function bankFor(subject: string): Record<Mode, Exercise[]> | null {
  const name = subject.toLocaleLowerCase();
  if (name.includes("math")) return banks.mathematics;
  if (name.includes("english") || name.includes("language") || name.includes("literature")) return banks.english;
  if (name.includes("biology") || name.includes("science") || name.includes("chemistry") || name.includes("physics")) return banks.science;
  return null;
}

function readAttempts(): Attempt[] {
  try {
    const value = JSON.parse(localStorage.getItem("studyspace-weekly-test-attempts") || "[]");
    return Array.isArray(value) ? value.filter((item: any) => item && typeof item.subject === "string" && typeof item.mode === "string" && Number.isFinite(item.score) && Number.isFinite(item.total) && typeof item.completedAt === "string") : [];
  } catch { return []; }
}

export default function WeeklyTest({ subjects }: { subjects: Subject[] }) {
  const [mode, setMode] = useState<Mode>("Multiple choice");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>(readAttempts);
  const activeSubject = subjects.find(item => item.id === subjectId) ?? subjects[0] ?? null;
  const subject = activeSubject?.name ?? "";
  const questions = useMemo(() => bankFor(subject)?.[mode] ?? [], [subject, mode]);
  const question = questions[questionIndex];
  const correct = !!question && response.trim().toLocaleLowerCase() === question.answer.toLocaleLowerCase();
  const percent = Math.round((score / questions.length) * 100);

  function restart(nextMode = mode) {
    setMode(nextMode); setQuestionIndex(0); setResponse(""); setSubmitted(false); setScore(0); setFinished(false);
  }

  function advance() {
    const nextScore = score + (correct ? 1 : 0);
    if (questionIndex === questions.length - 1) {
      const attempt: Attempt = { id: String(Date.now()), subject, mode, score: nextScore, total: questions.length, completedAt: new Date().toISOString() };
      const nextAttempts = [attempt, ...attempts].slice(0, 30);
      setAttempts(nextAttempts);
      try { localStorage.setItem("studyspace-weekly-test-attempts", JSON.stringify(nextAttempts)); } catch { /* The current result remains visible for this session. */ }
      setScore(nextScore); setFinished(true); return;
    }
    setScore(nextScore); setQuestionIndex(index => index + 1); setResponse(""); setSubmitted(false);
  }

  return <div className="weekly-test-page">
    <section className="weekly-test-hero glass-panel">
      <div className="weekly-test-hero-copy"><span className="eyebrow">WEEKLY KNOWLEDGE CHECK</span><h2>Learn it. Test it. Own it.</h2><p>Short, subject-focused practice rounds. Every question is tied to the selected subject; unsupported subjects are clearly identified instead of receiving unrelated questions.</p></div>
      <div className="weekly-test-trophy"><Trophy size={28}/><span>{attempts.length} attempts</span></div>
    </section>
    <div className="weekly-test-toolbar">
      <label className="weekly-test-subject">Subject<select value={activeSubject?.id ?? ""} onChange={event => { setSubjectId(Number(event.target.value)); restart(); }} disabled={!subjects.length}>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="weekly-test-modes" role="tablist" aria-label="Test format">{modes.map(item => { const Icon=item.icon; return <button key={item.name} role="tab" aria-selected={mode===item.name} className={mode===item.name?"selected":""} onClick={() => restart(item.name)}><Icon size={15}/><span>{item.name}</span></button>; })}</div>
    </div>
    <section className="weekly-test-card glass-panel">
      {!subjects.length ? <div className="weekly-test-unavailable"><BookOpen size={30}/><h2>Add your subjects first</h2><p>Your tests will be created only from the subjects you selected during sign-up. Visit Subjects to add your courses.</p></div> : !questions.length ? <div className="weekly-test-unavailable"><BookOpen size={30}/><h2>Question bank coming soon</h2><p>There is not yet a verified question bank for <strong>{subject}</strong>. We will not substitute unrelated general questions. Choose another selected subject or wait for subject-specific content to be added.</p></div> : finished ? <div className="weekly-test-result"><div className="weekly-test-result-icon"><Trophy size={30}/></div><span className="eyebrow">ROUND COMPLETE</span><h2>{score >= 4 ? "Excellent work." : score >= 3 ? "Good progress." : "Keep practising."}</h2><div className="weekly-test-score">{score}<small> / {questions.length}</small></div><p>{percent}% correct in {subject} · {mode}</p><div className="weekly-test-result-actions"><button className="primary-button" onClick={() => restart()}><RotateCcw size={16}/> Try again</button><button className="secondary-button" onClick={() => restart(modes[(modes.findIndex(item => item.name === mode)+1)%modes.length].name)}>Next activity <ChevronRight size={16}/></button></div></div> : <>
        <div className="weekly-test-progress"><div><span>{subject}</span><strong>QUESTION {questionIndex+1} / {questions.length}</strong></div><div className="weekly-test-progress-track"><span style={{width: ((questionIndex+1)/questions.length*100)+"%"}}/></div></div>
        <div className="weekly-test-question"><span className="weekly-test-type">{mode}</span><h2>{mode==="Word puzzle" ? question.clue : "Question "+(questionIndex+1)}</h2><p>{question.prompt}</p></div>
        {mode==="Word puzzle" && <div className="word-scramble"><span>UNSCRAMBLE</span><strong>{question.scramble}</strong></div>}
        {question.options ? <div className="weekly-test-options">{question.options.map(option => <button key={option} disabled={submitted} className={submitted && option===question.answer?"answer-correct":submitted && option===response?"answer-wrong":response===option?"answer-selected":""} onClick={() => setResponse(option)}>{option}{submitted&&option===question.answer&&<CheckCircle2 size={16}/ >}{submitted&&option===response&&option!==question.answer&&<XCircle size={16}/>}</button>)}</div> : <label className="weekly-test-answer"><span>{mode==="Word puzzle"?"Your answer":"Missing word"}</span><input value={response} onChange={event=>setResponse(event.target.value)} disabled={submitted} onKeyDown={event=>{if(event.key==="Enter"&&response.trim()&&!submitted)setSubmitted(true);}} placeholder="Type your answer…"/></label>}
        {submitted && <p className={correct?"weekly-test-feedback good":"weekly-test-feedback bad"}>{correct?"Correct — well done.":"Not quite. The correct answer is: "+question.answer}</p>}
        <div className="weekly-test-controls"><span>{score} correct so far</span>{!submitted ? <button className="primary-button" disabled={!response.trim()} onClick={()=>setSubmitted(true)}>Check answer <ChevronRight size={16}/></button> : <button className="primary-button" onClick={advance}>{questionIndex===questions.length-1?"See results":"Next question"} <ChevronRight size={16}/></button>}</div>
      </>}
    </section>
    <section className="weekly-test-history glass-panel"><div className="section-heading"><div><h2>Recent attempts</h2><p>Your practice history stays private on this device.</p></div></div>{attempts.length ? <div className="weekly-test-history-list">{attempts.slice(0,5).map(item=><div className="weekly-test-history-row" key={item.id}><div><strong>{item.subject} · {item.mode}</strong><span>{new Date(item.completedAt).toLocaleString()}</span></div><b>{item.score}/{item.total}</b></div>)}</div> : <p className="weekly-test-empty">Your completed rounds will appear here.</p>}</section>
  </div>;
}
