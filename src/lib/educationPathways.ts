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

export type CurriculumSubject = { name: string; code?: string; category: "Core" | "Elective" | "Available subject" | "Programme area" };
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
  { name: "English Language", code: "111", category: "Available subject" },
  { name: "Mathematics", code: "212", category: "Available subject" },
  { name: "SiSwati", code: "414", category: "Available subject" },
  { name: "Science", code: "513", category: "Available subject" },
  { name: "Social Studies", code: "515", category: "Available subject" },
  { name: "Religious Education", code: "631", category: "Available subject" },
  { name: "French", code: "434", category: "Available subject" },
  { name: "Agriculture", code: "616", category: "Available subject" },
  { name: "Consumer Science", code: "627", category: "Available subject" },
  { name: "Expressive Arts", code: "641", category: "Available subject" },
  { name: "Health and Physical Education", code: "642", category: "Available subject" },
  { name: "ICT", code: "645", category: "Available subject" },
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
  { name: "English Language", code: "101", category: "Available subject" },
  { name: "English Literature", code: "120", category: "Available subject" },
  { name: "SiSwati", code: "207", category: "Available subject" },
  { name: "Mathematics", code: "309", category: "Available subject" },
  { name: "Science", code: "414", category: "Available subject" },
  { name: "ICT", category: "Core" },
  { name: "Health and Well-being, Guidance and Counselling", category: "Core" },
  { name: "French", code: "202", category: "Available subject" },
  { name: "Agriculture", code: "516", category: "Available subject" },
  { name: "Additional Mathematics", code: "519", category: "Available subject" },
  { name: "Bookkeeping and Accounts", code: "520", category: "Available subject" },
  { name: "Business Studies", code: "521", category: "Available subject" },
  { name: "Development Studies", code: "524", category: "Available subject" },
  { name: "Geography", code: "527", category: "Available subject" },
  { name: "History", code: "530", category: "Available subject" },
  { name: "Religious Education", code: "533", category: "Available subject" },
  { name: "Design and Technology", code: "537", category: "Available subject" },
  { name: "Consumer Science", code: "540", category: "Available subject" },
];
const EGCSE_SUBJECTS: CurriculumSubject[] = [
  { name: "SiSwati – First Language", code: "6870", category: "Core" },
  { name: "SiSwati – Second Language", code: "6871", category: "Core" },
  { name: "English Language", code: "6873", category: "Available subject" },
  { name: "Mathematics", code: "6880", category: "Available subject" },
  { name: "Biology", code: "6884", category: "Core" },
  { name: "Physical Science", code: "6888", category: "Core" },
  { name: "Agriculture", code: "6882", category: "Available subject" },
  { name: "Literature in English", code: "6875", category: "Elective" },
  { name: "Geography", code: "6890", category: "Available subject" },
  { name: "History", code: "6891", category: "Available subject" },
  { name: "Religious Education", code: "6893", category: "Available subject" },
  { name: "Accounting", code: "6896", category: "Elective" },
  { name: "Business Studies", code: "6897", category: "Available subject" },
  { name: "Economics", code: "6899", category: "Elective" },
  { name: "Design and Technology", code: "6902", category: "Available subject" },
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
const TERTIARY_SUBJECTS: CurriculumSubject[] = [
  ...["Accounting", "Business Administration", "Business Management", "Marketing", "Economics", "Finance", "Human Resource Management", "Procurement and Supply Chain Management", "Public Sector Accounting", "Hospitality and Tourism", "Tourism Management", "Project Management", "Entrepreneurship", "Law", "Education", "Early Childhood Care and Development", "Special and Inclusive Education", "Nursing", "Midwifery", "Medicine and Surgery", "Pharmacy", "Medical Laboratory Science", "Radiography", "Community Development", "Social Work", "Psychology", "Theology", "Agriculture", "Agronomy", "Animal Science", "Horticulture", "Food Science and Nutrition", "Environmental Health", "Environmental Management", "Engineering", "Electrical and Electronic Engineering", "Mechanical Engineering", "Civil Engineering", "Quantity Surveying", "Construction", "Information Technology", "Computer Science", "Cybersecurity", "Network Security", "Software Development", "Data Science", "Information Systems", "Journalism and Mass Communication", "Professional Communication", "Languages and Linguistics", "Research Methods"].map(name => ({ name, category: "Programme area" as const })),
];

export function curriculaFor(level: string): string[] {
  return (CURRICULA_BY_LEVEL[level as EducationLevel] || [...CURRICULA]);
}

export function curriculumSubjectsFor(level: string, curriculum: string, grade = ""): CurriculumSubject[] {
  const selected = curriculum.toLowerCase();
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

export function subjectCatalogNote(level: string, curriculum: string, grade = ""): string {
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
