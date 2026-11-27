export type LanguageChoice = "English" | "SiSwati" | "French" | "Portuguese" | "Other";

export type LanguageSyllabus = {
  id: string;
  language: LanguageChoice;
  label: string;
  code: string;
  cycle: string;
  status: "official-pdf" | "official-page" | "independent";
  subjectPage?: string;
  pdfUrl?: string;
  assessment: string;
  coverage: string[];
  sourceNote: string;
};

const ec = "https://www.examscouncil.org.sz";

export const LANGUAGE_SYLLABUSES: LanguageSyllabus[] = [
  {
    id: "epc-english",
    language: "English",
    label: "EPC English Language · Grades 5–7 · 111",
    code: "111",
    cycle: "2025–2027",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=15&programme=EPC",
    pdfUrl: ec + "/upload-centre/syllabus/EPC%20English%20Language%202025-2027%20Syllabus.pdf",
    assessment: "Paper 1 combines Listening, Reading and Writing (2 hours, 50 marks). Paper 2 is Continuous Writing (2 hours, 35 marks). The two examination papers contribute 80% of the final result; continuous assessment contributes 20%.",
    coverage: ["listening for information and meaning", "reading comprehension", "vocabulary and grammar in context", "information transfer", "functional and continuous writing", "speaking through school-based assessment"],
    sourceNote: "Use the EPC syllabus for Grades 5–7. For Grades 0–4, use age-appropriate foundation learning and the school's current curriculum outline; do not label EPC examination objectives as Grade 0–4 requirements."
  },
  {
    id: "jc-english",
    language: "English",
    label: "Junior Certificate English Language · Forms 1–3 · 101",
    code: "101",
    cycle: "2027",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=25&programme=JC",
    pdfUrl: ec + "/upload-centre/syllabus/JC%20English%20Language%202027-2027%20Syllabus.pdf",
    assessment: "Four papers: Reading and Directed Writing (2 hours, 35%); Continuous Writing (2 hours, 35%); Listening (about 40 minutes, 15%); and Speaking (about 8–10 minutes, school-based assessment, 15%).",
    coverage: ["reading comprehension and inference", "directed writing and audience", "continuous writing", "listening comprehension", "speaking and interaction", "grammar, vocabulary and register"],
    sourceNote: "Use the 2027 JC syllabus and its current specimen/past papers. Do not substitute the older 2024–2026 syllabus."
  },
  {
    id: "egcse-english",
    language: "English",
    label: "EGCSE English Language · Forms 4–5 · 6873",
    code: "6873",
    cycle: "2027–2029",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=45&programme=EGCSE",
    pdfUrl: ec + "/upload-centre/syllabus/EGCSE%20English%20language%202027-2029%20Syllabus.pdf",
    assessment: "Paper 1 Reading (2 hours, 35%); Paper 2 Directed Writing and Composition (2 hours, 35%); Paper 3 Listening (about 45 minutes, 15%); Paper 4 Speaking (about 10–15 minutes, 15%).",
    coverage: ["explicit and implied meaning", "analysis and evaluation of texts", "directed, informal and argumentative writing", "composition and register", "listening to conversations, presentations and lectures", "speaking, audience and vocabulary"],
    sourceNote: "The 2027–2029 syllabus adds/clarifies informal formats such as emails, text-based writing stimuli and possible argumentative essays. Teach the four skills together; grammar is integrated rather than isolated."
  },
  {
    id: "epc-siswati",
    language: "SiSwati",
    label: "EPC SiSwati · Grades 5–7 · 414",
    code: "414",
    cycle: "2025–2027",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=17&programme=EPC",
    pdfUrl: ec + "/upload-centre/syllabus/EPC%20Siswati%202025-2027%20Syllabus.pdf",
    assessment: "Two papers are used: Paper 1 (1 hour, 40%) and Paper 2 (1 hour 30 minutes, 60%) according to ECESWA's EPC examination procedure. The syllabus content covers composition and functional/directed writing, reading comprehension, grammar and language use, and cultural knowledge.",
    coverage: ["kuvisisa lokufundvwako", "kubhala nekuhlelembisa", "lulwimi nekuhleleka kwemisho", "silulumagama", "emasiko nemasiko", "kukhuluma nekulalela"],
    sourceNote: "Use the EPC syllabus for Grades 5–7. The paper split is taken from ECESWA's official EPC examination procedure; uploaded class notes may add examples, but the official syllabus remains the curriculum authority."
  },
  {
    id: "jc-siswati",
    language: "SiSwati",
    label: "Junior Certificate SiSwati · Forms 1–3 · 207",
    code: "207",
    cycle: "2027",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=29&programme=JC",
    pdfUrl: ec + "/upload-centre/syllabus/JC%20Siswati%202027-2027%20Syllabus.pdf",
    assessment: "Three papers: Paper 1 focuses on composition and functional writing (1 hour 30 minutes, 35 marks); Paper 2 covers reading comprehension, summary and grammar (2 hours, 70 marks); Paper 3 covers modern literature, oral literature and culture (2 hours, 80 marks).",
    coverage: ["kuvisisa nekufinyeta", "kubhala tindzaba netincwadzi", "takhi telulwimi", "taga netisho", "tinkondlo, tindzaba, inoveli nedrama", "emasiko nemasiko nemibhalo yesintfu"],
    sourceNote: "Use the 2027 JC syllabus. Do not prescribe set texts from an older examination cycle unless the learner's teacher confirms they remain current."
  },
  {
    id: "egcse-siswati-first",
    language: "SiSwati",
    label: "EGCSE First Language SiSwati · Forms 4–5 · 6870",
    code: "6870",
    cycle: "2027–2029",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=43&programme=EGCSE",
    pdfUrl: ec + "/upload-centre/syllabus/EGCSE%20First%20Language%20SiSwati%202027-2029%20Syllabus.pdf",
    assessment: "The current 2027–2029 first-language syllabus and specimen papers are published by ECESWA. Follow the paper structure and assessment criteria in that PDF; do not reuse 2024–2026 weightings.",
    coverage: ["kuvisisa imibhalo leyehlukene", "kubhala ngekwetfula nangekucamba", "kuhlatiya lulwimi", "tinkondlo nemibhalo", "emasiko nemibhalo yesintfu", "kukhuluma nekulalela"],
    sourceNote: "The official ECESWA subject page lists the 2027–2029 syllabus and specimen papers. The linked PDF is the authority for paper details and prescribed texts."
  },
  {
    id: "egcse-siswati-second",
    language: "SiSwati",
    label: "EGCSE SiSwati as a Second Language · Forms 4–5 · 6871",
    code: "6871",
    cycle: "2027–2029",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=44&programme=EGCSE",
    pdfUrl: ec + "/upload-centre/syllabus/EGCSE%20Siswati%20as%20a%20Second%20Language%202027-2029%20Syllabus.pdf",
    assessment: "Paper 1 Reading and Directed Writing (2 hours 15 minutes, 50%); Paper 2 Listening (about 45 minutes, 25%); Paper 3 Speaking (about 15 minutes, 25%).",
    coverage: ["reading reports, articles, advertisements and instructions", "reading for gist and detail", "summary and directed writing", "formal and informal writing", "listening comprehension", "spoken interaction and description"],
    sourceNote: "The official 2027–2029 PDF is published on the ECESWA domain even though the subject index page still shows the older 2024–2026 listing. Use the direct 2027–2029 PDF."
  },
  {
    id: "epc-french",
    language: "French",
    label: "EPC French · Grades 5–7 · 434",
    code: "434",
    cycle: "2025–2027",
    status: "official-pdf",
    subjectPage: ec + "/programmes/subject.php?id=18&programme=EPC",
    pdfUrl: ec + "/upload-centre/syllabus/EPC%20French%202025-2027%20Syllabus.pdf",
    assessment: "Paper 1 Listening and Reading Comprehension (1 hour, 25%); Paper 2 Writing (45 minutes, 25%); Paper 3 Speaking (school-based, about 10–15 minutes, 50%).",
    coverage: ["everyday vocabulary", "basic grammar and sentence patterns", "listening for meaning", "reading short texts", "guided writing", "spoken communication"],
    sourceNote: "Use the EPC French syllabus for Grades 5–7 and the school's current vocabulary/teaching sequence."
  },
  {
    id: "jc-french",
    language: "French",
    label: "Junior Certificate French · Forms 1–3 · 202",
    code: "202",
    cycle: "2027",
    status: "official-page",
    subjectPage: ec + "/programmes/subject.php?id=27&programme=JC",
    assessment: "ECESWA lists a 2027 JC French syllabus on its official subject page. The detailed assessment breakdown is not embedded here; use the linked current PDF and do not invent paper weightings.",
    coverage: ["listening", "speaking", "reading", "writing", "vocabulary", "grammar in context"],
    sourceNote: "The official page lists the 2027–2027 syllabus. If the PDF is unavailable in-app, ask the learner to attach the school copy or teacher outline before generating exam-specific tests."
  },
  {
    id: "igcse-french",
    language: "French",
    label: "IGCSE French · 520",
    code: "520",
    cycle: "Check current exam session",
    status: "official-page",
    subjectPage: ec + "/programmes/subject.php?id=73&programme=IGCSE",
    assessment: "ECESWA lists IGCSE French (520), but the current subject page does not expose a syllabus PDF or current paper weightings. Do not assume a cycle or exam structure; check the current syllabus with the school.",
    coverage: ["listening", "speaking", "reading", "writing", "vocabulary", "grammar"],
    sourceNote: "Use the school's current Cambridge/ECESWA syllabus as the authority. The app must not invent a 2027 exam structure."
  },
  {
    id: "portuguese-independent",
    language: "Portuguese",
    label: "Portuguese · Independent / school-specific practice",
    code: "School syllabus",
    cycle: "School-specific",
    status: "independent",
    assessment: "Portuguese appears as an elective language in EPC materials, but no separate ECESWA Portuguese syllabus or examination subject page was verified. Use general practice until the school supplies its course outline.",
    coverage: ["vocabulary", "pronunciation", "grammar", "reading", "writing", "listening", "conversation"],
    sourceNote: "Uploaded notes and the school's syllabus are supplementary course sources. Do not describe this as ECESWA-aligned unless an official syllabus is supplied."
  },
  {
    id: "other-independent",
    language: "Other",
    label: "Other language · School-specific / uploaded syllabus",
    code: "School syllabus",
    cycle: "School-specific",
    status: "independent",
    assessment: "No ECESWA syllabus has been verified for the selected language. Ask the learner for the language name, exam board and school syllabus before making exam-specific claims.",
    coverage: ["vocabulary", "pronunciation", "grammar", "reading", "writing", "listening", "speaking"],
    sourceNote: "Use learner-uploaded notes as supporting material only. Clearly separate general language practice from verified syllabus requirements."
  }
];

export const LANGUAGE_SKILLS: Record<LanguageChoice, { value: string; label: string; description: string }[]> = {
  English: [
    { value: "reading", label: "Reading comprehension", description: "Find explicit and implied meaning, select evidence and infer purpose." },
    { value: "directed_writing", label: "Directed writing", description: "Write for a purpose, audience and context using the correct register." },
    { value: "continuous_writing", label: "Continuous writing", description: "Plan, structure and edit stories, descriptions, reports and arguments." },
    { value: "summary", label: "Summary and information transfer", description: "Select, organise and condense relevant information." },
    { value: "grammar", label: "Grammar and vocabulary", description: "Build accuracy and range in context." },
    { value: "listening", label: "Listening", description: "Understand gist, detail, fact, opinion and implied meaning." },
    { value: "speaking", label: "Speaking", description: "Express ideas clearly and interact with an audience." },
    { value: "exam_practice", label: "Exam practice", description: "Practise the selected syllabus paper format." }
  ],
  SiSwati: [
    { value: "comprehension", label: "Kuvisisa nekufinyeta", description: "Reading comprehension, interpretation and summary." },
    { value: "grammar", label: "Takhi telulwimi", description: "Grammar, sentence structure and language use." },
    { value: "writing", label: "Kubhala", description: "Composition, functional writing and directed writing." },
    { value: "oral_literature", label: "Taga, tisho nemibhalo yesintfu", description: "Proverbs, idioms, oral literature and cultural context." },
    { value: "literature", label: "Tinkondlo nemibhalo", description: "Poetry, short stories, novels and drama where prescribed." },
    { value: "translation", label: "Kuhumusha", description: "Translation and meaning between SiSwati and English." },
    { value: "listening_speaking", label: "Kulalela nekukhuluma", description: "Listening comprehension and spoken communication." },
    { value: "exam_practice", label: "Kutilungiselela luhlolo", description: "Practise the selected ECESWA syllabus and paper format." }
  ],
  French: [
    { value: "vocabulary", label: "Vocabulaire", description: "Build everyday and syllabus vocabulary." },
    { value: "grammar", label: "Grammaire", description: "Practise grammar and sentence patterns in context." },
    { value: "listening", label: "Compréhension orale", description: "Understand spoken French." },
    { value: "speaking", label: "Expression orale", description: "Speak clearly in everyday and exam situations." },
    { value: "reading", label: "Compréhension écrite", description: "Read and understand short and extended texts." },
    { value: "writing", label: "Expression écrite", description: "Write messages, descriptions and structured responses." },
    { value: "exam_practice", label: "Examen", description: "Practise only the selected verified syllabus format." }
  ],
  Portuguese: [
    { value: "vocabulary", label: "Vocabulário", description: "Build useful everyday vocabulary." },
    { value: "grammar", label: "Gramática", description: "Practise grammar and sentence patterns." },
    { value: "listening", label: "Compreensão oral", description: "Understand spoken Portuguese." },
    { value: "speaking", label: "Conversação", description: "Practise pronunciation and everyday conversation." },
    { value: "reading", label: "Leitura", description: "Read short and extended texts." },
    { value: "writing", label: "Escrita", description: "Write messages and structured responses." },
    { value: "exam_practice", label: "School practice", description: "Follow the learner's uploaded school outline; no ECESWA paper format is assumed." }
  ],
  Other: [
    { value: "vocabulary", label: "Vocabulary", description: "Build useful words and phrases." },
    { value: "grammar", label: "Grammar", description: "Practise grammar in context." },
    { value: "listening", label: "Listening", description: "Understand spoken language." },
    { value: "speaking", label: "Speaking", description: "Practise pronunciation and conversation." },
    { value: "reading", label: "Reading", description: "Read and understand texts." },
    { value: "writing", label: "Writing", description: "Write clear and structured responses." },
    { value: "exam_practice", label: "School practice", description: "Use only the learner's confirmed exam board and uploaded syllabus." }
  ]
};

export function syllabusesForLanguage(language: LanguageChoice): LanguageSyllabus[] {
  return LANGUAGE_SYLLABUSES.filter(item => item.language === language);
}

export function syllabusById(id: string): LanguageSyllabus | undefined {
  return LANGUAGE_SYLLABUSES.find(item => item.id === id);
}

export function defaultLanguageSyllabusId(language: LanguageChoice, educationLevel = "", grade = "", curriculum = "", subjects: string[] = []): string {
  const level = educationLevel.trim().toLowerCase();
  const year = grade.trim().toLowerCase();
  const programme = curriculum.trim().toLowerCase();
  const subjectText = subjects.join(" ").toLowerCase();
  const isEpcGrade = level === "primary" && /\bgrade\s*[5-7]\b/.test(year);
  const isJcGrade = level === "secondary high" || /\bform\s*[1-3]\b/.test(year);
  const isEgcsEGrade = level === "high school" || /\bform\s*[4-5]\b/.test(year);

  if (language === "Portuguese") return "portuguese-independent";
  if (language === "Other") return "other-independent";

  if (language === "French") {
    if (/igcse/.test(programme)) return "igcse-french";
    if (/junior certificate|\bjc\b/.test(programme) || isJcGrade) return "jc-french";
    if (/\bepc\b/.test(programme) || isEpcGrade) return "epc-french";
    return "";
  }

  if (language === "English") {
    if (/egcse/.test(programme)) return "egcse-english";
    if (/junior certificate|\bjc\b/.test(programme) || isJcGrade) return "jc-english";
    if (/\bepc\b/.test(programme) || isEpcGrade) return "epc-english";
    if (isEgcsEGrade) return "egcse-english";
    return "";
  }

  if (language === "SiSwati") {
    if (/egcse/.test(programme) || isEgcsEGrade) {
      if (/second language|as a second language|6871/.test(subjectText)) return "egcse-siswati-second";
      if (/first language|6870/.test(subjectText)) return "egcse-siswati-first";
      return "";
    }
    if (/junior certificate|\bjc\b/.test(programme) || isJcGrade) return "jc-siswati";
    if (/\bepc\b/.test(programme) || isEpcGrade) return "epc-siswati";
    return "";
  }

  return "";
}
