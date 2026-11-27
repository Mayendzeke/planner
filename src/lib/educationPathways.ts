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
