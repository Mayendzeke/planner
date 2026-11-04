import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, RotateCcw, Trophy, Puzzle, ListChecks, PenLine, ToggleLeft, FileText, Target, CalendarDays, GraduationCap, Sparkles, Upload, FolderOpen } from "lucide-react";
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
  const name = subject.trim().toLocaleLowerCase();
  if (name === "mathematics") return banks.mathematics;
  if (name === "english" || name === "english language") return banks.english;
  if (name === "science" || name === "combined science") return banks.science;
  return null;
}

function readAttempts(): Attempt[] {
  try {
    const value = JSON.parse(localStorage.getItem("studyspace-weekly-test-attempts") || "[]");
    return Array.isArray(value) ? value.filter((item: any) => item && typeof item.subject === "string" && typeof item.mode === "string" && Number.isFinite(item.score) && Number.isFinite(item.total) && typeof item.completedAt === "string") : [];
  } catch { return []; }
}

type LearningPath = "Study notes" | "Revision notes" | "Topic test" | "Weekly test" | "Examination";
type Topic = { name: string; keywords: string[] };
const topicCatalog: Record<string, Topic[]> = {
  mathematics: [
    { name:"Algebra", keywords:["algebra","equation","expression","variable","simplify","solve","unknown"] },
    { name:"Number and percentages", keywords:["number","percent","percentage","prime","factor","multiple","square","product","even"] },
    { name:"Geometry and measurement", keywords:["triangle","angle","circle","area","rectangle","polygon","circumference","coordinate","pi"] },
  ],
  english: [
    { name:"Grammar and parts of speech", keywords:["adjective","noun","verb","adverb","pronoun","apostrophe","plural","sentence","tense"] },
    { name:"Vocabulary", keywords:["synonym","antonym","meaning","reluctant","word"] },
    { name:"Literature and writing", keywords:["theme","metaphor","simile","stanza","paragraph","conclusion","poem"] },
  ],
  science: [
    { name:"Biology", keywords:["cell","nucleus","plant","photosynthesis","chlorophyll","osmosis","respiration","heart","liver","life"] },
    { name:"Chemistry", keywords:["oxygen","atom","element","chemical","water","h2o","metal","proton","electron"] },
    { name:"Physics", keywords:["force","newton","gravity","sound","vacuum","electric","particle","energy"] },
  ]
};
function topicFor(subject: string): Topic[] {
  const key = subject.trim().toLocaleLowerCase();
  if (key === "mathematics") return topicCatalog.mathematics;
  if (key === "english" || key === "english language") return topicCatalog.english;
  if (key === "science" || key === "combined science") return topicCatalog.science;
  return [];
}
function questionsFor(subject: string): Exercise[] {
  const bank = bankFor(subject);
  return bank ? modes.flatMap(item => bank[item.name]) : [];
}
function matchesTopic(question: Exercise, topic: Topic): boolean {
  const text = [question.prompt, question.answer, question.clue ?? "", question.scramble ?? ""].join(" ").toLocaleLowerCase();
  return topic.keywords.some(keyword => text.includes(keyword));
}
function readAttempts(): Attempt[] {
  try {
    const value = JSON.parse(localStorage.getItem("studyspace-weekly-test-attempts") || "[]");
    return Array.isArray(value) ? value.filter((item: any) => item && typeof item.subject === "string" && typeof item.mode === "string" && Number.isFinite(item.score) && Number.isFinite(item.total) && typeof item.completedAt === "string") : [];
  } catch { return []; }
}

export default function WeeklyTest({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 0);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [topicName, setTopicName] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>(readAttempts);
  const [notes, setNotes] = useState<{id:number;name:string;subjectId?:number;resourceType?:string;topic?:string;file:Blob;createdAt:string}[]>([]);
  const [noteType, setNoteType] = useState<"Study notes"|"Revision notes">("Study notes");
  const [noteTopic, setNoteTopic] = useState("");
  const [noteError, setNoteError] = useState("");
  const activeSubject = subjects.find(item => item.id === subjectId) ?? subjects[0] ?? null;
  const subject = activeSubject?.name ?? "";
  const topics = topicFor(subject);
  const fullPool = useMemo(() => questionsFor(subject), [subject]);
  const topicPool = useMemo(() => fullPool.filter(question => matchesTopic(question, topics.find(item => item.name === topicName) ?? {name:"",keywords:[]})), [fullPool, topics, topicName]);
  const weeklyPool = useMemo(() => modes.flatMap(item => (bankFor(subject)?.[item.name] ?? []).slice(0, 3)), [subject, fullPool]);
  const examPool = fullPool;
  const activePool = path === "Topic test" ? topicPool : path === "Weekly test" ? weeklyPool : path === "Examination" ? examPool : [];
  const question = activePool[questionIndex];
  const questionMode = question ? modes.find(item => bankFor(subject)?.[item.name].includes(question))?.name ?? "Question" : "";
  const sectionLetter = String.fromCharCode(65 + Math.max(0, modes.findIndex(item => item.name === questionMode)));
  const correct = !!question && response.trim().toLocaleLowerCase() === question.answer.toLocaleLowerCase();
  const percent = activePool.length ? Math.round((score / activePool.length) * 100) : 0;

  async function loadNotes() {
    try {
      const { plannerDb } = await import("../data/db");
      const stored = await plannerDb.resources.toArray();
      setNotes(stored as typeof notes);
    } catch { setNotes([]); }
  }
  useEffect(() => { void loadNotes(); }, [subjectId]);
  const visibleNotes = notes.filter(item => item.subjectId === activeSubject?.id && item.resourceType === path && (path !== "Revision notes" || item.resourceType === "Revision notes"));
  function openResource(resource: typeof notes[number]) {
    const url = URL.createObjectURL(resource.file);
    const anchor = document.createElement("a"); anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function addNoteFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    if (!files.length || !activeSubject) return;
    setNoteError("");
    try {
      const { plannerDb } = await import("../data/db");
      const accepted = files.filter(file => file.size <= 30 * 1024 * 1024 && /\\.(pdf|doc|docx|ppt|pptx|epub|txt|rtf)$/i.test(file.name));
      if (!accepted.length) { setNoteError("Choose a supported document up to 30 MB."); return; }
      await plannerDb.resources.bulkAdd(accepted.map((file,index) => ({id:Date.now()+index,name:file.name,mimeType:file.type||"application/octet-stream",size:file.size,file,createdAt:new Date().toISOString(),subjectId:activeSubject.id,resourceType:path,topic:noteTopic.trim()})));
      await loadNotes();
    } catch { setNoteError("The files could not be saved. Check available device storage."); }
  }
  function begin(nextPath: LearningPath) {
    setPath(nextPath); setTopicName(""); setQuestionIndex(0); setResponse(""); setSubmitted(false); setScore(0); setFinished(false); setNoteError("");
  }
  function restart() { setQuestionIndex(0); setResponse(""); setSubmitted(false); setScore(0); setFinished(false); }
  function advance() {
    const nextScore = score + (correct ? 1 : 0);
    if (questionIndex === activePool.length - 1) {
      const attempt: Attempt = {id:String(Date.now()),subject,mode:path ?? "Weekly test",score:nextScore,total:activePool.length,completedAt:new Date().toISOString()};
      const next=[attempt,...attempts].slice(0,30); setAttempts(next);
      try { localStorage.setItem("studyspace-weekly-test-attempts",JSON.stringify(next)); } catch { /* Current result remains available. */ }
      setScore(nextScore); setFinished(true); return;
    }
    setScore(nextScore); setQuestionIndex(index=>index+1); setResponse(""); setSubmitted(false);
  }
  const pathOptions: {name:LearningPath;description:string;icon:typeof BookOpen}[] = [
    {name:"Study notes",description:"Open class notes, textbooks and learning resources.",icon:BookOpen},
    {name:"Revision notes",description:"Review concise summaries and exam preparation material.",icon:FileText},
    {name:"Topic test",description:"Choose one topic and practise only questions mapped to it.",icon:Target},
    {name:"Weekly test",description:"A short mixed check of the selected subject.",icon:CalendarDays},
    {name:"Examination",description:"A longer mixed paper covering the available subject question bank.",icon:GraduationCap}
  ];
  return <div className="weekly-test-page study-hub">
    <section className="weekly-test-hero glass-panel"><div className="weekly-test-hero-copy"><span className="eyebrow">YOUR LEARNING WORKSPACE</span><h2>Study with a clear path.</h2><p>Choose one of your enrolled subjects, then open learning material, practise a topic, complete a weekly check or sit a mixed examination.</p></div><div className="weekly-test-trophy"><Trophy size={28}/><span>{attempts.length} attempts</span></div></section>
    <section className="study-subject-select glass-panel"><div className="section-heading"><div><h2>1. Choose a subject or module</h2><p>Only subjects in your Studyspace profile are shown.</p></div><BookOpen size={20}/></div>{subjects.length?<div className="study-subject-grid">{subjects.map(item=><button key={item.id} className={activeSubject?.id===item.id?"study-subject-card selected":"study-subject-card"} onClick={()=>{setSubjectId(item.id);setPath(null);setTopicName("");}}><span className="study-subject-dot" style={{background:item.color}}/><strong>{item.name}</strong><small>{item.category??"Your subject"}</small><ChevronRight size={16}/></button>)}</div>:<div className="weekly-test-unavailable"><BookOpen size={28}/><h2>Add your subjects first</h2><p>Choose Subjects in the menu to add the modules you are studying.</p></div>}</section>
    {activeSubject&&<section className="study-path-section"><div className="section-heading"><div><h2>2. What would you like to do in {subject}?</h2><p>Choose a learning activity.</p></div><Sparkles size={20}/></div><div className="study-path-grid">{pathOptions.map(item=>{const Icon=item.icon;return <button key={item.name} className={path===item.name?"study-path-card selected":"study-path-card"} onClick={()=>begin(item.name)}><span><Icon size={20}/></span><strong>{item.name}</strong><small>{item.description}</small><ChevronRight size={16}/></button>;})}</div></section>}
    {path==="Study notes"||path==="Revision notes"?<section className="glass-panel study-notes-panel"><div className="section-heading"><div><h2>{path} · {subject}</h2><p>Files saved for this subject on this device.</p></div><BookOpen size={20}/></div><div className="study-note-upload"><label className="field-label">Topic (optional)<input value={noteTopic} onChange={e=>setNoteTopic(e.target.value)} placeholder="e.g. Algebraic expressions"/></label><label className="primary-button library-upload"><Upload size={15}/> Add {path.toLowerCase()}<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.epub,.txt,.rtf" onChange={addNoteFiles}/></label></div>{noteError&&<p className="inline-message" role="alert">{noteError}</p>}{visibleNotes.length?<div className="study-note-list">{visibleNotes.map(note=><button key={note.id} className="study-note-row" onClick={()=>openResource(note)}><FileText size={18}/><span><strong>{note.name}</strong><small>{note.topic||"General notes"} · {new Date(note.createdAt).toLocaleDateString()}</small></span><ChevronRight size={16}/></button>)}</div>:<div className="weekly-test-unavailable"><FolderOpen size={26}/><h2>No {path.toLowerCase()} yet</h2><p>Add a document here and it will be organised under {subject}.</p></div>}</section>:null}
    {path==="Topic test"&&<section className="glass-panel study-topic-panel"><div className="section-heading"><div><h2>3. Select a topic</h2><p>Topic questions are filtered from the available subject bank.</p></div><Target size={20}/></div>{topics.length?<div className="study-topic-list">{topics.map(topic=><button key={topic.name} className={topicName===topic.name?"study-topic-option selected":"study-topic-option"} onClick={()=>{setTopicName(topic.name);restart();}}><span><strong>{topic.name}</strong><small>Topic-focused practice</small></span><ChevronRight size={16}/></button>)}</div>:<div className="weekly-test-unavailable"><Target size={26}/><h2>Topic tests are being prepared</h2><p>There is no verified topic map for {subject} yet. We will not show unrelated questions as a topic test.</p></div>}</section>}
    {(path==="Topic test"&&topicName||path==="Weekly test"||path==="Examination")&&<section className="weekly-test-card glass-panel study-quiz-card">
      <div className="section-heading"><div><span className="eyebrow">{path==="Examination"?"EXAMINATION PAPER":path==="Weekly test"?"WEEKLY KNOWLEDGE CHECK":"TOPIC ASSESSMENT"}</span><h2>{subject}{topicName?" · "+topicName:""}</h2><p>{path==="Examination"?"Formal mixed paper: all available question formats, organised into sections, using the complete current subject question bank.":path==="Weekly test"?"Ten-question mixed practice round.":"Questions matched to the topic you selected."}</p></div><span className="count-chip">{activePool.length} questions</span></div>
      {!activePool.length?<div className="weekly-test-unavailable"><BookOpen size={28}/><h2>Questions not available yet</h2><p>No verified questions are currently mapped to {topicName||subject}. The question bank needs to be authored for this area before a test can run.</p></div>:finished?<div className="weekly-test-result"><div className="weekly-test-result-icon"><Trophy size={30}/></div><span className="eyebrow">ASSESSMENT COMPLETE</span><h2>{percent>=80?"Excellent work.":percent>=60?"Good progress.":"Keep practising."}</h2><div className="weekly-test-score">{score}<small> / {activePool.length}</small></div><p>{percent}% correct · {subject}{topicName?" · "+topicName:""} · {path}</p><div className="weekly-test-result-actions"><button className="primary-button" onClick={restart}><RotateCcw size={16}/> Retake</button><button className="secondary-button" onClick={()=>setPath(null)}>Back to subject</button></div></div>:<><div className="weekly-test-progress"><div><span>{subject}{topicName?" · "+topicName:""}</span><strong>QUESTION {questionIndex+1} / {activePool.length}</strong></div><div className="weekly-test-progress-track"><span style={{width:((questionIndex+1)/activePool.length*100)+"%"}}/></div></div><div className="weekly-test-question"><span className="weekly-test-type">{path==="Examination"?"SECTION "+sectionLetter+" · "+questionMode:path==="Weekly test"?"WEEKLY · "+questionMode:"TOPIC · "+questionMode}</span><h2>Question {questionIndex+1}</h2><p>{question.prompt}</p></div>{question.options?<div className="weekly-test-options">{question.options.map(option=><button key={option} disabled={submitted} className={submitted&&option===question.answer?"answer-correct":submitted&&option===response?"answer-wrong":response===option?"answer-selected":""} onClick={()=>setResponse(option)}>{option}{submitted&&option===question.answer&&<CheckCircle2 size={16}/>}</button>)}</div>:<label className="weekly-test-answer"><span>{question.clue??"Your answer"}</span><input value={response} onChange={e=>setResponse(e.target.value)} disabled={submitted} onKeyDown={e=>{if(e.key==="Enter"&&response.trim()&&!submitted)setSubmitted(true);}} placeholder="Type your answer…"/></label>}{submitted&&<p className={correct?"weekly-test-feedback good":"weekly-test-feedback bad"}>{correct?"Correct — well done.":"Not quite. Correct answer: "+question.answer}</p>}<div className="weekly-test-controls"><span>{score} correct so far</span>{!submitted?<button className="primary-button" disabled={!response.trim()} onClick={()=>setSubmitted(true)}>Check answer <ChevronRight size={16}/></button>:<button className="primary-button" onClick={advance}>{questionIndex===activePool.length-1?"See results":"Next question"} <ChevronRight size={16}/></button>}</div></>}
    </section>}
    <section className="weekly-test-history glass-panel"><div className="section-heading"><div><h2>Recent attempts</h2><p>Results saved on this device.</p></div></div>{attempts.length?<div className="weekly-test-history-list">{attempts.slice(0,6).map(item=><div className="weekly-test-history-row" key={item.id}><div><strong>{item.subject} · {item.mode}</strong><span>{new Date(item.completedAt).toLocaleString()}</span></div><b>{item.score}/{item.total}</b></div>)}</div>:<p className="weekly-test-empty">Completed tests and examinations will appear here.</p>}</section>
  </div>;
}
