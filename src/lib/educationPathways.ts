export const EDUCATION_PATHWAYS = [
  { value: "Primary", label: "Primary School", description: "Primary education · Grades 0–7" },
  { value: "Secondary High", label: "Secondary High", description: "Junior Secondary · Forms 1–3" },
  { value: "High School", label: "High School", description: "Senior Secondary · Forms 4–5" },
  { value: "Matric", label: "Matric / Form 6", description: "Advanced Studies / Sixth Form · where offered" },
  { value: "Tertiary", label: "Higher Education", description: "University, college and technical / TVET institutions" },
] as const;

export type EducationLevel = typeof EDUCATION_PATHWAYS[number]["value"];
export const EDUCATION_LEVEL_VALUES = EDUCATION_PATHWAYS.map((stage) => stage.value);
export const CURRICULA = [
  "Eswatini National Curriculum",
  "National curriculum",
  "IGCSE / Cambridge",
  "A-Level",
  "IB",
  "CAPS",
  "Other / Not sure",
] as const;

export const INSTITUTION_TYPES = ["University", "College", "Technical / TVET", "Other"] as const;
export const QUALIFICATION_LEVELS = [
  "Certificate",
  "Higher Certificate",
  "Diploma",
  "Advanced Diploma",
  "Associate Degree",
  "Bachelor's Degree",
  "Honours Degree",
  "Postgraduate Certificate",
  "Postgraduate Diploma",
  "Master's Degree",
  "Doctorate / PhD",
  "Other",
] as const;

export const OTHER_GRADE_VALUE = "__other_grade__";

/** Eswatini institutions from the ESHEC registered-institutions and accredited-programmes register, updated 1 October 2026. */
export const ESWATINI_HIGHER_EDUCATION_INSTITUTIONS = [
  "University of Eswatini (UNESWA)",
  "Matsapha Police Academy",
  "William Pitcher Teacher Training College",
  "Ngwane Teacher Training College",
  "Eswatini Institute of Management and Public Administration (EIMPA)",
  "Advanced School of Information Technology (ASIT)",
  "Eswatini Medical Christian University (EMCU)",
  "Good Shepherd Catholic College of Health Sciences",
  "Institute of Development Management (IDM)",
  "Limkokwing University",
  "Southern Africa Nazarene University (SANU)",
  "Amadi University College",
  "African Prime Institute of Science and Technology (APIST)",
  "African Christian College",
  "Botho University Eswatini Campus",
  "Bradford College",
  "Centre for International Technology and Consultancy (CIT)",
  "Eastern and Southern African Management Institute (ESAMI)",
  "Emergency Medical Rescue College (EMRC)",
  "Emmanuel Wesleyan Bible College",
  "Institute of Research Management and Development (IRDM)",
  "Mananga Centre for Regional Integration and Management Development",
  "Springfield Research University",
  "Eswatini College of Theology",
  "Workers College",
  "Soft-Tech College",
  "NOSA",
  "SHAK Enterprise",
  "St John",
  "Bethel Vocational Centre",
  "BSA Training Centre",
  "Bosco Youth Agricultural Centre (BYAC)",
  "Ngwane Park TVET",
  "SIMAVSHEQ",
  "Solar Training and Renewable Energy Entrepreneurship Centre",
  "Ubombo Technical College (U-TECH)",
  "Eswatini College of Technology (ECOT)",
  "Eswatini Cooperative Development College (ECODEC)",
  "Gwamile Vocational and Commercial Training Institute",
] as const;

export const CURRICULA_BY_LEVEL: Record<EducationLevel, string[]> = {
  Primary: ["Eswatini National Curriculum", "Eswatini Primary Certificate (EPC)", "Eswatini Primary School Assessment (EPSA)", "Cambridge Primary", "CAPS", "Other / Not sure"],
  "Secondary High": ["Eswatini Junior Certificate (JC)", "Cambridge Lower Secondary", "IGCSE / Cambridge", "CAPS", "Other / Not sure"],
  "High School": ["Eswatini General Certificate (EGCSE)", "IGCSE / Cambridge", "CAPS", "Other / Not sure"],
  Matric: ["A-Level", "IB Diploma", "Other / Not sure"],
  Tertiary: ["Eswatini Qualifications Framework (ESQF)", "Other / International framework"],
};

export type CurriculumSubject = { name: string; code?: string; category: "Core" | "Core choice" | "Elective" | "Available subject" | "Programme area" };
export const ESWATINI_CURRICULUM_SOURCE_URL = "https://www.examscouncil.org.sz/";

/** ECESWA subject registers; codes identify the published examination subject, not a claim that every school offers it. */
const PRIMARY_SUBJECTS: CurriculumSubject[] = [
  { name: "English Language", code: "111", category: "Available subject" },
  { name: "Mathematics", code: "212", category: "Available subject" },
  { name: "SiSwati", code: "414", category: "Available subject" },
  { name: "Science", code: "513", category: "Available subject" },
  { name: "Social Studies", code: "515", category: "Available subject" },
  { name: "Religious Education", code: "631", category: "Available subject" },
  { name: "French", code: "434", category: "Available subject" },
  { name: "Agriculture", code: "616", category: "Available subject" },
  { name: "Consumer Science", code: "627", category: "Available subject" },
  { name: "Practical Arts and Technology", code: "640", category: "Available subject" },
  { name: "Expressive Arts", code: "641", category: "Available subject" },
  { name: "Health and Physical Education", code: "642", category: "Available subject" },
  { name: "ICT", code: "645", category: "Available subject" },
];
const EPC_SUBJECTS: CurriculumSubject[] = [
  { name: "English Language", code: "111", category: "Core" },
  { name: "Mathematics", code: "212", category: "Core" },
  { name: "SiSwati", code: "414", category: "Core" },
  { name: "Science", code: "513", category: "Core" },
  { name: "Social Studies", code: "515", category: "Core" },
  { name: "Religious Education", code: "631", category: "Core" },
  { name: "Expressive Arts", code: "641", category: "Core" },
  { name: "Health and Physical Education", code: "642", category: "Core" },
  { name: "French", code: "434", category: "Elective" },
  { name: "Agriculture", code: "616", category: "Elective" },
  { name: "Consumer Science", code: "627", category: "Elective" },
  { name: "ICT", code: "645", category: "Elective" },
  { name: "Portuguese", category: "Elective" },
  { name: "Practical Arts and Technology", code: "640", category: "Available subject" },
];
const PRIMARY_FOUNDATION_SUBJECTS: CurriculumSubject[] = [
  { name: "English", category: "Available subject" },
  { name: "Mathematics", category: "Available subject" },
  { name: "Science", category: "Available subject" },
  { name: "Religious Education", category: "Available subject" },
  { name: "SiSwati", category: "Available subject" },
  { name: "French", category: "Available subject" },
  { name: "Home Economics", category: "Available subject" },
  { name: "Practical Art", category: "Available subject" },
  { name: "Physical Education", category: "Available subject" },
];
const JUNIOR_CERTIFICATE_SUBJECTS: CurriculumSubject[] = [
  { name: "English Language", code: "101", category: "Core" },
  { name: "English Literature", code: "120", category: "Elective" },
  { name: "SiSwati", code: "207", category: "Core" },
  { name: "Mathematics", code: "309", category: "Core" },
  { name: "Science", code: "414", category: "Core" },
  { name: "ICT", category: "Core" },
  { name: "Health and Well-being, Guidance and Counselling", category: "Core" },
  { name: "French", code: "202", category: "Elective" },
  { name: "Agriculture", code: "516", category: "Elective" },
  { name: "Additional Mathematics", code: "519", category: "Elective" },
  { name: "Bookkeeping and Accounts", code: "520", category: "Elective" },
  { name: "Business Studies", code: "521", category: "Elective" },
  { name: "Development Studies", code: "524", category: "Elective" },
  { name: "Geography", code: "527", category: "Elective" },
  { name: "History", code: "530", category: "Elective" },
  { name: "Religious Education", code: "533", category: "Core" },
  { name: "Design and Technology", code: "537", category: "Elective" },
  { name: "Consumer Science", code: "540", category: "Elective" },
];
const EGCSE_SUBJECTS: CurriculumSubject[] = [
  { name: "SiSwati – First Language", code: "6870", category: "Core choice" },
  { name: "SiSwati – Second Language", code: "6871", category: "Core choice" },
  { name: "English Language", code: "6873", category: "Core" },
  { name: "Mathematics", code: "6880", category: "Core" },
  { name: "Biology", code: "6884", category: "Core choice" },
  { name: "Physical Science", code: "6888", category: "Core choice" },
  { name: "Agriculture", code: "6882", category: "Elective" },
  { name: "Literature in English", code: "6875", category: "Elective" },
  { name: "Geography", code: "6890", category: "Elective" },
  { name: "History", code: "6891", category: "Elective" },
  { name: "Religious Education", code: "6893", category: "Core" },
  { name: "Accounting", code: "6896", category: "Elective" },
  { name: "Business Studies", code: "6897", category: "Elective" },
  { name: "Economics", code: "6899", category: "Elective" },
  { name: "Design and Technology", code: "6902", category: "Elective" },
  { name: "Fashion and Fabrics", code: "6904", category: "Elective" },
  { name: "Food and Nutrition", code: "6905", category: "Elective" },
];
const PREVOCATIONAL_SUBJECTS: CurriculumSubject[] = [
  { name: "Agricultural Technology", code: "5920", category: "Programme area" },
  { name: "Business Accounting", code: "5921", category: "Programme area" },
  { name: "Entrepreneurship", code: "5923", category: "Programme area" },
  { name: "Information and Communication Technology", code: "5924", category: "Programme area" },
  { name: "Technical Studies", code: "5925", category: "Programme area" },
  { name: "Food and Textiles Technology", code: "5926", category: "Programme area" },
];
export const TERTIARY_SUBJECTS: CurriculumSubject[] = [
  ...["Accounting", "Business Administration", "Business Management", "Marketing", "Economics", "Finance", "Human Resource Management", "Procurement and Supply Chain Management", "Public Sector Accounting", "Hospitality and Tourism", "Tourism Management", "Project Management", "Entrepreneurship", "Law", "Education", "Early Childhood Care and Development", "Special and Inclusive Education", "Nursing", "Midwifery", "Medicine and Surgery", "Pharmacy", "Medical Laboratory Science", "Radiography", "Community Development", "Social Work", "Psychology", "Theology", "Agriculture", "Agronomy", "Animal Science", "Horticulture", "Food Science and Nutrition", "Environmental Health", "Environmental Management", "Engineering", "Electrical and Electronic Engineering", "Mechanical Engineering", "Civil Engineering", "Quantity Surveying", "Construction", "Information Technology", "Computer Science", "Cybersecurity", "Network Security", "Software Development", "Data Science", "Information Systems", "Journalism and Mass Communication", "Professional Communication", "Languages and Linguistics", "Research Methods"].map(name => ({ name, category: "Programme area" as const })),
];

export function curriculaFor(level: string, country = "Eswatini"): string[] {
  if (country.trim() && !/eswatini|swaziland/i.test(country)) {
    return ["National curriculum (school-specific)", "IGCSE / Cambridge", "A-Level", "IB Diploma", "CAPS", "Other / Not sure"];
  }
  return (CURRICULA_BY_LEVEL[level as EducationLevel] || [...CURRICULA]);
}

export function curriculumSubjectsFor(level: string, curriculum: string, grade = "", country = "Eswatini"): CurriculumSubject[] {
  const selected = curriculum.toLowerCase();
  if (country.trim() && !/eswatini|swaziland/i.test(country)) {
    if (level === "Primary") return ["English", "Mathematics", "Science", "Social Studies", "Languages", "Computing / ICT", "Religious Education", "Creative Arts", "Physical Education", "Agriculture", "Technology", "Life Skills"].map(name => ({ name, category: "Available subject" as const }));
    if (level === "Tertiary") return TERTIARY_SUBJECTS;
    return Array.from(new Set([...JUNIOR_CERTIFICATE_SUBJECTS, ...EGCSE_SUBJECTS].map(item => item.name).concat(["Computer Science", "ICT"]))).map(name => ({ name, category: "Available subject" as const }));
  }
  if (level === "Primary") {
    if (/epsa/.test(selected)) return PRIMARY_SUBJECTS;
    if (/cambridge/.test(selected)) return [
      ...PRIMARY_FOUNDATION_SUBJECTS,
      { name: "Computing", category: "Elective" },
      { name: "Global Perspectives", category: "Elective" },
    ];
    if (/caps/.test(selected)) return [
      ...PRIMARY_FOUNDATION_SUBJECTS,
      { name: "Life Skills", category: "Elective" },
      { name: "Technology", category: "Elective" },
    ];
    if (/epc/.test(selected) || /grade\s*[5-7]/i.test(grade)) return EPC_SUBJECTS;
    return PRIMARY_FOUNDATION_SUBJECTS;
  }
  if (level === "Secondary High") {
    if (/prevocational|epcse/.test(selected)) return PREVOCATIONAL_SUBJECTS;
    if (/cambridge|igcse/.test(selected)) return [
      ...JUNIOR_CERTIFICATE_SUBJECTS.filter(item => !["Bookkeeping and Accounts", "Development Studies", "Consumer Science"].includes(item.name)),
      { name: "ICT", category: "Elective" }, { name: "Computer Science", category: "Elective" },
    ];
    return JUNIOR_CERTIFICATE_SUBJECTS;
  }
  if (level === "High School") {
    if (/igcse|cambridge/.test(selected)) return [
      ...EGCSE_SUBJECTS,
      { name: "ICT", code: "0417", category: "Available subject" },
      { name: "French", code: "0520", category: "Available subject" },
      { name: "Development Studies", code: "0453", category: "Available subject" },
    ];
    return EGCSE_SUBJECTS;
  }
  if (level === "Matric") return [
    { name: "English Language", category: "Core" },
    { name: "Mathematics", category: "Available subject" },
    ...["Biology", "Chemistry", "Physics", "Geography", "History", "Economics", "Accounting", "Business", "Computer Science", "French", "SiSwati", "Psychology", "Sociology", "General Paper", "Thinking Skills"].map(name => ({ name, category: "Elective" as const })),
  ];
  if (level === "Tertiary") return TERTIARY_SUBJECTS;
  return [];
}

export function subjectCatalogNote(level: string, curriculum: string, grade = "", country = "Eswatini"): string {
  if (country.trim() && !/eswatini|swaziland/i.test(country)) return "General subject suggestions only. Confirm the exact subject names and syllabus with your country's education authority or school before exam-specific study.";
  if (level === "Primary") return /epsa/i.test(curriculum)
    ? "EPSA examination subject register. Subject availability and examination entry depend on the school and current ECESWA session."
    : /grade [5-7]/i.test(grade) || /epc/i.test(curriculum)
      ? "Eswatini Primary Certificate (EPC) syllabus subjects for Grades 5–7. The school confirms which elective learning areas are offered."
      : "Eswatini lower-primary learning areas. The EPC examination syllabus is for Grades 5–7; follow the school's current Grade 0–4 scheme of work.";
  if (level === "Secondary High") return /prevocational|epcse/i.test(curriculum)
    ? "Eswatini Prevocational Certificate subjects (EPCSE)."
    : "Junior Certificate and school-offered elective subjects. Your school determines which electives are available.";
  if (level === "High School") return "EGCSE / Cambridge subject register. Your school determines which subjects and science options it offers.";
  if (level === "Tertiary") return "Programme areas drawn from the ESHEC 2026 registered-institution and accredited-programme register. Confirm the exact award title with your institution.";
  return "Choose subjects that match your current school or programme outline. Add a subject if it is not listed.";
}

export function isEducationLevel(value: string): value is EducationLevel {
  return EDUCATION_LEVEL_VALUES.includes(value as EducationLevel);
}

export function isTertiaryLevel(value: string): boolean {
  return value === "Tertiary";
}

/**
 * Normalise legacy profile values without discarding the learner's saved form,
 * year, course or institution. Ambiguous legacy school stages are classified
 * from the recorded grade/form before a conservative default is used.
 */
export function normalizeEducationLevel(value: string, grade = "", course = "", institutionType = ""): EducationLevel | "" {
  const stage = value.trim().toLowerCase().replace(/\s+/g, " ");
  const year = grade.trim().toLowerCase();
  const fromGrade = (): EducationLevel | null => {
    if (/\b(?:form\s*6|sixth form|matric|a[- ]?level|grade\s*12)\b/.test(year)) return "Matric";
    if (/\b(?:form\s*[45]|grade\s*(?:10|11))\b/.test(year)) return "High School";
    if (/\b(?:form\s*[123]|grade\s*(?:8|9))\b/.test(year)) return "Secondary High";
    if (/\bgrade\s*[0-7]\b/.test(year)) return "Primary";
    return null;
  };
  if (["primary", "primary school"].includes(stage)) return "Primary";
  if (["secondary high", "junior secondary", "junior secondary school"].includes(stage)) return "Secondary High";
  if (["high school", "high school / sixth form", "senior secondary", "senior secondary school"].includes(stage)) return fromGrade() ?? "High School";
  if (["secondary school", "secondary", "secondary / high school"].includes(stage)) return fromGrade() ?? "Secondary High";
  if (["matric", "matric / form 6", "form 6", "sixth form"].includes(stage)) return "Matric";
  if (["tertiary", "higher education", "college", "university", "technical / tvet", "tvet"].includes(stage)) return "Tertiary";
  const gradeStage = fromGrade();
  if (gradeStage) return gradeStage;
  if (["college", "university", "technical / tvet", "tvet"].includes(institutionType.trim().toLowerCase())) return "Tertiary";
  if (/\b(?:certificate|diploma|bachelor|master|doctorate|phd|degree)\b/i.test(course)) return "Tertiary";
  return "";
}

export function normalizeInstitutionType(level: string, value = ""): string {
  if (!isTertiaryLevel(normalizeEducationLevel(level))) return "School";
  const current = value.trim();
  if (INSTITUTION_TYPES.includes(current as typeof INSTITUTION_TYPES[number]) && current !== "School") return current;
  const legacy = level.trim().toLowerCase();
  if (legacy === "college") return "College";
  if (legacy === "university") return "University";
  if (legacy === "technical / tvet" || legacy === "tvet") return "Technical / TVET";
  return "Other";
}

export function educationLevelLabel(value: string): string {
  return EDUCATION_PATHWAYS.find((stage) => stage.value === value)?.label ?? value;
}

export function gradeOptionsFor(value: string): string[] {
  if (value === "Primary") return Array.from({ length: 8 }, (_, index) => "Grade " + index);
  if (value === "Secondary High") return ["Form 1", "Form 2", "Form 3"];
  if (value === "High School") return ["Form 4", "Form 5"];
  if (value === "Matric") return ["Form 6", "Lower Sixth", "Upper Sixth"];
  if (value === "Tertiary") return [
    "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
    "Semester 1", "Semester 2", "Final year", "Part-time / modular",
  ];
  return [];
}

export function isStandardGrade(value: string, level: string): boolean {
  return gradeOptionsFor(level).includes(value);
}


/** Programme titles and institutional registration statuses transcribed from ESHEC's 10 August 2026 register. A listing is not a promise of current intake; verify with the institution before applying. */
export const ESWATINI_TERTIARY_CATALOGUE_SOURCE = "https://eshec.org.sz/wp-content/uploads/2026/08/ESHEC-HEI-List-Aug-2026_Final_V8.pdf";
export const ESWATINI_TERTIARY_PROGRAMMES_BY_INSTITUTION: Record<string, { status: string; programmes: string[] }> = {
  "University of Eswatini (UNESWA)": {
    "status": "Registered",
    "programmes": [
      "Doctor of Philosophy in Agricultural and Applied Economics",
      "Doctor of Philosophy in Agricultural Education",
      "Doctor of Philosophy in Horticulture (by Research)",
      "Master of Science in Agricultural and Applied Economics",
      "Master of Science in Agricultural Education",
      "Master of Science in Agricultural Extension",
      "Master of Science in Animal Science",
      "Master of Science in Crop Protection",
      "Master of Science in Crop Science",
      "Master of Science in Horticulture",
      "Bachelor of Science in Agricultural and Biosystems Engineering",
      "Bachelor of Science in Agricultural Economics and Agribusiness Management",
      "Bachelor of Science in Agricultural Education",
      "Bachelor of Science in Agricultural Extension",
      "Bachelor of Science in Agronomy",
      "Bachelor of Science in Animal Science",
      "Bachelor of Science in Horticulture",
      "Diploma in Agriculture",
      "Diploma in Agricultural Education",
      "Certificate in Agriculture",
      "Master of Science in Consumer Science Education",
      "Master of Science in Food Science and Technology",
      "Master of Science in Textiles",
      "Bachelor of Science in Consumer Science",
      "Bachelor of Science in Consumer Science Education",
      "Bachelor of Science in Food Science, Nutrition and Technology",
      "Bachelor of Science in Textile Apparel Design and Management",
      "Diploma in Home Economics",
      "Diploma in Home Economics Education",
      "Master of Business Administration",
      "Postgraduate Diploma in Taxation",
      "Postgraduate Diploma in Public Sector Accounting",
      "Bachelor of Commerce (Management, Accounting and Finance, Marketing)",
      "Master of Science in Chemistry",
      "Master of Science in Computational Physics",
      "Master of Science in Computer Science",
      "Master of Science in Conservation Ecology",
      "Master of Science in Environmental Resources Management",
      "Master of Science in Mathematics Finance",
      "Master of Science in Mathematical Modelling",
      "Master of Science in Pure Mathematics",
      "Bachelor of Science (Mathematics, Physics, Chemistry, Biology)",
      "Bachelor of Science in Geographic Information Science",
      "Bachelor of Science in Geography, Environmental Science and Planning",
      "Bachelor of Science in Actuarial and Financial Mathematics",
      "Bachelor of Science in Computer Science",
      "Bachelor of Science in Computer Science Education",
      "Bachelor of Science in Information Science",
      "Bachelor of Science in Information Technology",
      "Bachelor of Science in Urban and Regional Planning",
      "Bachelor of Engineering in Electrical and Electronic Engineering",
      "Postgraduate Diploma in Computer Science",
      "Master of Arts in History",
      "Master of Arts in Languages and Linguistics",
      "Master of Arts in African Literature",
      "Master of Arts in Linguistics",
      "Bachelor of Arts in Humanities",
      "Bachelor of Arts in Journalism and Mass Communication",
      "Master of Arts in Religious Studies",
      "Diploma in Journalism and Mass Communication",
      "Bachelor of Laws (LLB)",
      "Bachelor of Arts in Social Sciences",
      "Bachelor of Social Work",
      "Master of Nursing Science in Family Nurse Practice",
      "Master of Science in Midwifery",
      "Bachelor of Nursing Science",
      "Bachelor of Science in Community Health Nursing",
      "Bachelor of Science in Environmental Health Science",
      "Bachelor of Science in Environmental Health and Food Science",
      "Bachelor of Science in Environmental Management and Occupational Safety and Health",
      "Bachelor of Science in Environmental Management and Water Resources",
      "Master of Science in Environmental Resources Management (Land and Water Management)",
      "Diploma in General Nursing",
      "Diploma in Environmental Health Science",
      "Post Diploma Certificate in Community Health Nursing",
      "Post Diploma Certificate in Community Mental Health Nursing",
      "Post Diploma Certificate in Midwifery Science",
      "Post-Diploma Certificate in Nephrology Nursing Science",
      "Post Graduate Diploma in Neonatology",
      "Certificate in Adult Education",
      "Diploma in Adult Education",
      "Bachelor of Education Primary (Language Arts)",
      "Bachelor of Education Primary (Social Studies)",
      "Bachelor of Education Primary (Science)",
      "Bachelor of Education Secondary (Science)",
      "Bachelor of Education Secondary (Business Education)",
      "Bachelor of Education Secondary (Humanities)",
      "Post-Graduate Certificate in Education",
      "Doctor of Philosophy in Education (by Research)",
      "Diploma in Law",
      "Certificate in Portuguese",
      "Certificate in Psychosocial Support"
    ]
  },
  "Matsapha Police Academy": {
    "status": "Fully registered",
    "programmes": [
      "Diploma in Police Science",
      "Certificate in Basic Recruit Training",
      "Certificate in Middle Management Skills Development",
      "Certificate in Junior Supervisory Skills Development"
    ]
  },
  "William Pitcher Teacher Training College": {
    "status": "Registered",
    "programmes": [
      "Secondary Teachers Diploma"
    ]
  },
  "Ngwane Teacher Training College": {
    "status": "Registered",
    "programmes": [
      "Primary Teachers Diploma"
    ]
  },
  "Eswatini Institute of Management and Public Administration (EIMPA)": {
    "status": "Registered",
    "programmes": [
      "Tailor-made professional and public administration courses"
    ]
  },
  "Advanced School of Information Technology (ASIT)": {
    "status": "Provisionally registered",
    "programmes": [
      "Diploma in Certified Computer Professional (CCP)",
      "Diploma in Arena Animation International Programme (AAIP)",
      "Diploma in Certified Network Specialist (ACNS)",
      "Diploma in Information Security and Ethical Hacking (ISEH)",
      "Diploma in Cybersecurity and Network Forensics"
    ]
  },
  "Eswatini Medical Christian University (EMCU)": {
    "status": "Provisionally registered",
    "programmes": [
      "Bachelor of Medicine and Surgery",
      "Bachelor of Radiography",
      "Bachelor of Nursing Science",
      "Bachelor of Medical Laboratory Science",
      "Bachelor of Psychology",
      "Bachelor of Social Work",
      "Bachelor of Pharmacy",
      "Bachelor of Computer Science"
    ]
  },
  "Good Shepherd Catholic College of Health Sciences": {
    "status": "Fully registered",
    "programmes": [
      "Diploma in General Nursing",
      "Certificate in Nursing Assistant",
      "Post Graduate Certificate in Midwifery",
      "Diploma in Health and Safety"
    ]
  },
  "Institute of Development Management (IDM)": {
    "status": "Provisionally registered",
    "programmes": [
      "Bachelor of Arts in Human Resources Management",
      "Diploma in Human Resources Management",
      "Certificate in Human Resources Management",
      "Diploma in Information Technology",
      "Diploma in Occupational Health and Safety",
      "Certificate in Freight Forwarding and Customs Compliance",
      "Bachelor of Science in Information Technology",
      "Bachelor of Occupational Health and Safety",
      "Bachelor of Education Management and School Leadership",
      "Bachelor in Community Development"
    ]
  },
  "Limkokwing University": {
    "status": "Provisionally registered",
    "programmes": [
      "Associate Degree in Graphic Design",
      "Associate Degree in Music Design",
      "Associate Degree in Creative Multimedia",
      "Associate Degree in Architectural Technology",
      "Associate Degree in Public Relations",
      "Associate Degree in Events Management",
      "Associate Degree in Journalism and Media",
      "Associate Degree in TV and Film Production",
      "Associate Degree in International Tourism",
      "Associate Degree in Information Technology",
      "Associate Degree in Business Information Technology",
      "Associate Degree in Hotel Management",
      "Associate Degree in Business Management",
      "Bachelor of Science in Information Technology",
      "Bachelor of Arts in Professional Communication",
      "Bachelor of Business in International Business Management"
    ]
  },
  "Southern Africa Nazarene University (SANU)": {
    "status": "Fully registered",
    "programmes": [
      "Diploma in Business Management and Entrepreneurship",
      "Diploma in Pharmacy",
      "Diploma in Theology",
      "Primary Teachers Diploma",
      "Bachelor of Arts in Theology",
      "Bachelor of Education in Special and Inclusive Education",
      "Bachelor of Education in Leadership and Management for Inclusive Education",
      "Bachelor of Education Primary Teaching (French)",
      "Bachelor of Science in Nursing and Midwifery",
      "Bachelor of Science in Pharmacy",
      "Master of Science in Nursing",
      "Master of Education in Special and Inclusive Education",
      "Master of Arts in Practical Theology and Ministry"
    ]
  },
  "Amadi University College": {
    "status": "Provisionally registered",
    "programmes": [
      "Primary Teachers Diploma",
      "Bachelor of Commerce (Accounting)",
      "Bachelor of Education (Foundation)",
      "Bachelor of Education in Early Childhood Care and Development"
    ]
  },
  "African Prime Institute of Science and Technology (APIST)": {
    "status": "Provisionally registered",
    "programmes": [
      "Diploma in Health Records and Information Technology",
      "Diploma in Agriculture and Community Development",
      "Certificate in Architecture",
      "Certificate in Electrical and Electronic Telecommunication"
    ]
  },
  "African Christian College": {
    "status": "Fully registered",
    "programmes": [
      "Certificate in Leadership (Christian Studies)",
      "Bachelor of Theology"
    ]
  },
  "Botho University Eswatini Campus": {
    "status": "Fully registered",
    "programmes": [
      "Bachelor of Science in Network Security and Computer Forensics",
      "Bachelor of Science in Computing",
      "Bachelor of Commerce in Accounting",
      "Bachelor of Business Administration in Business Management",
      "Bachelor of Science in Mobile Computing",
      "Bachelor of Science in Health Information Management"
    ]
  },
  "Bradford College": {
    "status": "Provisionally registered",
    "programmes": [
      "Primary Teachers Diploma",
      "Secondary Teachers Diploma"
    ]
  },
  "Centre for International Technology and Consultancy (CIT)": {
    "status": "Provisionally registered",
    "programmes": [
      "Primary Teachers Diploma"
    ]
  },
  "Eastern and Southern African Management Institute (ESAMI)": {
    "status": "Provisionally registered",
    "programmes": [
      "Master of Business Administration",
      "Masters in Human Resources Management",
      "Master of Science in Project Management",
      "Bachelor of Business Administration",
      "Diploma in Management and Administration",
      "Diploma in Human Resources",
      "Diploma in Management"
    ]
  },
  "Emergency Medical Rescue College (EMRC)": {
    "status": "Fully registered",
    "programmes": [
      "Certificate in Basic Ambulance Assistant",
      "Certificate in Occupational Health and Safety",
      "Certificate in Emergency Medical Care and Rescue",
      "Diploma in Occupational Health and Safety",
      "Diploma in Emergency Medical Care and Rescue",
      "Diploma in Public Health",
      "Diploma in Disaster and Risk Management",
      "Bachelor of Science in Occupational Health and Safety",
      "Bachelor's Degree in Public Health",
      "Bachelor of Science in Emergency Medical Care",
      "Bachelor's Degree in Disaster and Risk Management"
    ]
  },
  "Emmanuel Wesleyan Bible College": {
    "status": "Provisionally registered",
    "programmes": [
      "Certificate in Christian Service",
      "Diploma in Counselling"
    ]
  },
  "Institute of Research Management and Development (IRDM)": {
    "status": "Provisionally registered",
    "programmes": [
      "Certificate in Security Management",
      "Diploma in Business Studies",
      "Certificate in Counselling Training"
    ]
  },
  "Mananga Centre for Regional Integration and Management Development": {
    "status": "Fully registered",
    "programmes": [
      "Diploma in Marketing",
      "Diploma in Public Sector Accounting",
      "Diploma in Entrepreneurship",
      "Certificate in Project Management",
      "Supervisors' Development Programme",
      "Certificate in Human Resources"
    ]
  },
  "Springfield Research University": {
    "status": "Fully registered",
    "programmes": [
      "Bachelor of Science in Forestry",
      "Bachelor of Arts in Political Science and Governance",
      "Bachelor of Arts in Psychology",
      "Bachelor of Business Administration in Supply Chain Management and Logistics",
      "Bachelor of Science in Computer Science",
      "Bachelor of Laws (LLB)",
      "Bachelor of Actuarial Science and Financial Mathematics",
      "Master of Laws",
      "Master of Public Health",
      "Master of Research: Engineering and Technology",
      "Master of Research: Education and Learning Science",
      "Master of Research: Arts, Political Science and Law",
      "Master of Research: Science and Medical Sciences",
      "Master of Research: Business Management and Economics",
      "Doctor of Philosophy: Engineering and Technology",
      "Doctor of Philosophy: Education and Learning Science",
      "Doctor of Philosophy: Arts, Political Science and Law",
      "Doctor of Philosophy: Science and Medical Sciences",
      "Doctor of Philosophy: Business Management and Economics"
    ]
  },
  "Eswatini College of Theology": {
    "status": "Fully registered",
    "programmes": [
      "Bachelor of Theology",
      "Bachelor in Psychology",
      "Diploma in Bible and Theology",
      "Diploma in Peace and Conflict Studies",
      "Diploma in Counselling",
      "Certificate in Psychosocial Counselling"
    ]
  },
  "Workers College": {
    "status": "Provisionally registered",
    "programmes": [
      "Primary Teachers Diploma",
      "Secondary Teachers Diploma",
      "Early Childhood Teachers Diploma",
      "Bachelor of Commerce",
      "Diploma in Occupational Health and Safety",
      "Diploma in Business Administration"
    ]
  },
  "Soft-Tech College": {
    "status": "Fully registered",
    "programmes": [
      "Diploma in Computer Hardware and Networking",
      "Diploma in Business Information Technology",
      "Certificate in Server Administration",
      "Certificate in Office Management",
      "Certificate in Project Management",
      "Certificate in Database",
      "Certificate in Storage Essentials",
      "Certificate in Google Apps",
      "Certificate in Android",
      "Certificate in Certified Ethical Hacking",
      "Certificate in Cisco",
      "Certificate Network Associate",
      "Certificate Network Professional"
    ]
  },
  "NOSA": {
    "status": "Fully registered",
    "programmes": [
      "Occupational Health and Safety programmes"
    ]
  },
  "SHAK Enterprise": {
    "status": "Provisionally registered",
    "programmes": [
      "Occupational Health and Safety programmes"
    ]
  },
  "St John": {
    "status": "Provisionally registered",
    "programmes": [
      "Occupational Health and Safety programmes"
    ]
  },
  "Bethel Vocational Centre": {
    "status": "Provisionally registered",
    "programmes": [
      "Certificate in Construction and Building",
      "Certificate in Welding Design",
      "Certificate in Electrical Engineering"
    ]
  },
  "BSA Training Centre": {
    "status": "Provisionally registered",
    "programmes": [
      "Certificate in Motor Vehicle Mechanics",
      "Certificate in Welding",
      "Certificate in Electrical Wiring",
      "Certificate in Auto Electrical",
      "Certificate in Heavy Plant Mechanics",
      "Certificate in Fashion and Design",
      "Certificate in Plumbing",
      "Certificate in Catering and Hotel Management",
      "Certificate in Business Studies",
      "Certificate in Health and Safety",
      "Diploma in Health and Safety"
    ]
  },
  "Bosco Youth Agricultural Centre (BYAC)": {
    "status": "Provisionally registered",
    "programmes": [
      "Certificate in Permaculture",
      "Certificate in Horticulture",
      "Certificate in Bee Keeping",
      "Certificate in Pig Production"
    ]
  },
  "Hillside College": {
    "status": "Provisionally registered",
    "programmes": [
      "HIV/AIDS Management"
    ]
  },
  "Ngwane Park TVET": {
    "status": "Fully registered",
    "programmes": [
      "Certificate in Information Communication Technology",
      "Certificate in Accounting and Finance",
      "Diploma in Information Communication Technology",
      "Diploma in Accounting and Finance",
      "Diploma in Fashion Design"
    ]
  },
  "SIMAVSHEQ": {
    "status": "Provisionally registered",
    "programmes": [
      "Occupational Health and Safety programmes"
    ]
  },
  "Solar Training and Renewable Energy Entrepreneurship Centre": {
    "status": "Fully registered",
    "programmes": [
      "Certificate in Renewable Energy and Entrepreneurship"
    ]
  },
  "Ubombo Technical College (U-TECH)": {
    "status": "Fully registered",
    "programmes": [
      "Diploma in Information Technology",
      "Diploma in Data Science",
      "Diploma in Electrical Engineering"
    ]
  },
  "Eswatini College of Technology (ECOT)": {
    "status": "Registered",
    "programmes": [
      "Diploma in Business Studies",
      "Diploma in Quantity Surveying",
      "Diploma in Architectural Technology",
      "Diploma in Civil Engineering",
      "Secondary Teacher's Diploma: Commercial",
      "Secondary Teacher's Diploma: Information and Communication Technology",
      "Secondary Teacher's Diploma: Design and Technology",
      "Vocational Instructor's Diploma",
      "Diploma in Office Management and Technology",
      "Diploma in Human Resources Management",
      "Diploma in Hospitality and Tourism",
      "Diploma in Electrical and Electronics",
      "Diploma in Automotive Engineering Light and Heavy",
      "Diploma in Mechanical Engineering",
      "Diploma in Computer Science",
      "Diploma in Information Technology"
    ]
  },
  "Eswatini Cooperative Development College (ECODEC)": {
    "status": "Provisionally registered",
    "programmes": [
      "Certificate in Cooperatives Business Management"
    ]
  },
  "Gwamile Vocational and Commercial Training Institute": {
    "status": "Registered",
    "programmes": [
      "Diploma in Mechanical and Manufacturing Engineering",
      "Diploma in Business and Accounting",
      "Diploma in Automotive Engineering",
      "Diploma in Vehicle Body Repairs",
      "Diploma in Electrical Engineering",
      "Diploma in Building and Construction Studies",
      "Diploma in Carpentry and Joinery"
    ]
  }
};

export function tertiaryProgrammesFor(institution: string): string[] {
  const needle = institution.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
  const match = Object.entries(ESWATINI_TERTIARY_PROGRAMMES_BY_INSTITUTION).find(([name]) => {
    const key = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
    return needle && (key === needle || key.includes(needle) || needle.includes(key));
  });
  if (match) return [...match[1].programmes];
  return [...new Set(Object.values(ESWATINI_TERTIARY_PROGRAMMES_BY_INSTITUTION).flatMap(item => item.programmes))].sort((a, b) => a.localeCompare(b));
}

export function tertiaryInstitutionStatus(institution: string): string {
  const needle = institution.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
  const match = Object.entries(ESWATINI_TERTIARY_PROGRAMMES_BY_INSTITUTION).find(([name]) => {
    const key = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
    return needle && (key === needle || key.includes(needle) || needle.includes(key));
  });
  return match?.[1].status ?? "Not found in the ESHEC August 2026 register";
}
