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
