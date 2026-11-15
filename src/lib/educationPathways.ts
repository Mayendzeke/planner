export const EDUCATION_STAGES = [
  "Primary",
  "Secondary High",
  "High School",
  "Matric",
  "Tertiary",
] as const;

export type EducationStage = typeof EDUCATION_STAGES[number];

export const STAGE_DESCRIPTIONS: Record<EducationStage, string> = {
  Primary: "Primary education · Grades 1–7",
  "Secondary High": "Junior secondary · Forms 1–3",
  "High School": "Senior high school · Forms 4–5",
  Matric: "Matric / Sixth Form · Form 6 or equivalent pre-university study",
  Tertiary: "University, college or technical institute · certificates through PhD",
};

export const CURRICULA = [
  "National curriculum",
  "IGCSE / Cambridge",
  "A-Level",
  "IB",
  "CAPS",
  "Other / Not sure",
] as const;

export const TERTIARY_INSTITUTION_TYPES = [
  "University",
  "College",
  "Technical / TVET",
  "Other",
] as const;

export const TERTIARY_QUALIFICATIONS = [
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

export const SCHOOL_INSTITUTION_TYPE = "School";

const STAGE_GRADES: Record<EducationStage, string[]> = {
  Primary: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"],
  "Secondary High": ["Form 1", "Form 2", "Form 3"],
  "High School": ["Form 4", "Form 5"],
  Matric: ["Form 6", "Sixth Form", "A-Level", "IB Diploma", "Pre-University", "Other / not listed"],
  Tertiary: [
    "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
    "Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6",
    "Research / Thesis", "Other / not listed",
  ],
};

export function isTertiaryStage(level: string): level is "Tertiary" {
  return level === "Tertiary";
}

export function gradeOptionsFor(level: string): string[] {
  return EDUCATION_STAGES.includes(level as EducationStage)
    ? STAGE_GRADES[level as EducationStage]
    : [];
}

export function isValidEducationStage(level: string): level is EducationStage {
  return EDUCATION_STAGES.includes(level as EducationStage);
}

export function normaliseEducationProfile<T extends {
  level?: string;
  grade?: string;
  course?: string;
  institutionType?: string;
  qualificationLevel?: string;
}>(profile: T): T & { level: string; grade: string; institutionType: string; qualificationLevel: string } {
  const level = isValidEducationStage(profile.level ?? "") ? profile.level! : inferEducationStage(profile.grade ?? "", profile.course ?? "");
  return {
    ...profile,
    level,
    grade: profile.grade ?? "",
    institutionType: profile.institutionType ?? (level === "Tertiary" ? "" : SCHOOL_INSTITUTION_TYPE),
    qualificationLevel: profile.qualificationLevel ?? "",
  };
}

export function inferEducationStage(grade: string, course = ""): EducationStage {
  const value = grade.trim().toLowerCase().replace(/\s+/g, " ");
  if (/\b(form ?[1-3]|f[1-3])\b/.test(value)) return "Secondary High";
  if (/\b(form ?[45]|f[45])\b/.test(value)) return "High School";
  if (/\b(form ?6|sixth form|lower sixth|upper sixth|a[- ]?level|matric|grade 12|year 12)\b/.test(value)) return "Matric";
  if (/\b(primary|standard [1-7]|grade [1-7])\b/.test(value) && !course.trim()) return "Primary";
  if (course.trim() && /\b(year [1-9]|level [1-9]|semester [1-9]|research|thesis)\b/.test(value)) return "Tertiary";
  return "Secondary High";
}
