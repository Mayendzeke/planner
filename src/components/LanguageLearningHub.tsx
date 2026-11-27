import "./LanguageLearningHub.css";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, ExternalLink, Languages, Sparkles } from "lucide-react";
import {
  LANGUAGE_SKILLS,
  defaultLanguageSyllabusId,
  syllabusById,
  syllabusesForLanguage,
} from "../lib/languageSyllabusCatalog";
import type { LanguageChoice } from "../lib/languageSyllabusCatalog";

type Props = {
  onStartPractice: (prompt: string) => void;
  educationLevel?: string;
  grade?: string;
  curriculum?: string;
  subjects?: string[];
  onOpenProfile?: () => void;
};

function customLanguageFromProfile(subjects: string[]): string {
  return subjects.find(subject => /language|spanish|german|arabic|chinese|japanese|korean|italian|swahili|isiZulu|isiXhosa|afrikaans|dutch|russian|hindi|urdu|mandarin|hebrew|greek|latin/i.test(subject)) || "";
}

function languageChoicesFromProfile(subjects: string[]): LanguageChoice[] {
  const text = subjects.join(" | ").toLowerCase();
  const choices: LanguageChoice[] = [];
  if (/siswati|si\s*swati/.test(text)) choices.push("SiSwati");
  if (/english|language arts/.test(text)) choices.push("English");
  if (/french/.test(text)) choices.push("French");
  if (/portuguese/.test(text)) choices.push("Portuguese");
  if (!choices.length && customLanguageFromProfile(subjects)) choices.push("Other");
  return choices;
}

const readingCatalogue = [
  { title: "Taga netisho", detail: "Proverbs and idioms in context", focus: "Meaning, usage and cultural context" },
  { title: "Tinganekwane", detail: "Traditional stories", focus: "Narrative structure, values and oral tradition" },
  { title: "Tinkondlo", detail: "Poetry and oral performance", focus: "Imagery, tone, structure and interpretation" },
  { title: "Tindzaba", detail: "Short stories and narrative texts", focus: "Character, setting, theme and evidence" },
];

export default function LanguageLearningHub({
  onStartPractice,
  educationLevel = "",
  grade = "",
  curriculum = "",
  subjects = [],
  onOpenProfile,
}: Props) {
  const profileLanguageChoices = useMemo(() => languageChoicesFromProfile(subjects), [subjects]);
  const initialLanguage = profileLanguageChoices[0] || "Other";
  const [language, setLanguage] = useState<LanguageChoice>(initialLanguage);
  const [syllabusId, setSyllabusId] = useState(() =>
    profileLanguageChoices.length ? defaultLanguageSyllabusId(initialLanguage, educationLevel, grade, curriculum, subjects) : ""
  );
  const [customLanguage, setCustomLanguage] = useState(() => initialLanguage === "Other" ? customLanguageFromProfile(subjects) : "");
  const [selectedSkill, setSelectedSkill] = useState(LANGUAGE_SKILLS[initialLanguage][0].value);
  const hasLanguageSubject = profileLanguageChoices.length > 0;

  useEffect(() => {
    if (!profileLanguageChoices.length) {
      setSyllabusId("");
      setLanguage("Other");
      setCustomLanguage("");
      return;
    }
    const nextLanguage = profileLanguageChoices.includes(language) ? language : profileLanguageChoices[0];
    setLanguage(nextLanguage);
    setSyllabusId(defaultLanguageSyllabusId(nextLanguage, educationLevel, grade, curriculum, subjects));
    setSelectedSkill(LANGUAGE_SKILLS[nextLanguage][0].value);
    if (nextLanguage === "Other") setCustomLanguage(customLanguageFromProfile(subjects));
  }, [profileLanguageChoices, educationLevel, grade, curriculum, subjects]);

  const syllabusOptions = syllabusesForLanguage(language);
  const selectedSyllabus = syllabusById(syllabusId);
  const skills = LANGUAGE_SKILLS[language];
  const selectedSkillInfo = skills.find((skill) => skill.value === selectedSkill) || skills[0];
  const displayLanguage = language === "Other" ? customLanguage.trim() || "your selected language" : language;
  const canStart = Boolean(hasLanguageSubject && selectedSyllabus && (language !== "Other" || customLanguage.trim()));

  const changeLanguage = (next: LanguageChoice) => {
    if (!profileLanguageChoices.includes(next)) return;
    setLanguage(next);
    setSyllabusId(defaultLanguageSyllabusId(next, educationLevel, grade, curriculum, subjects));
    setSelectedSkill(LANGUAGE_SKILLS[next][0].value);
    setCustomLanguage(next === "Other" ? customLanguageFromProfile(subjects) : "");
  };

  const startPractice = () => {
    if (!selectedSyllabus || (language === "Other" && !customLanguage.trim())) return;
    const sourceContext = [
      "Selected language: " + displayLanguage + ".",
      "Selected course: " + selectedSyllabus.label + ".",
      "Exam code: " + selectedSyllabus.code + ".",
      "Syllabus cycle: " + selectedSyllabus.cycle + ".",
      "Source status: " + selectedSyllabus.status + ".",
      "Assessment structure: " + selectedSyllabus.assessment + ".",
      "Verified syllabus coverage: " + selectedSyllabus.coverage.join("; ") + ".",
      "Source note: " + selectedSyllabus.sourceNote + ".",
      "Official syllabus PDF: " + (selectedSyllabus.pdfUrl || "No direct PDF is currently embedded in the app.") + ".",
      "Official ECESWA subject page: " + (selectedSyllabus.subjectPage || "Not available") + ".",
      "Student education stage: " + (educationLevel || "not set") + ".",
      "Student grade/year: " + (grade || "not set") + ".",
      "Student curriculum: " + (curriculum || "not set") + ".",
    ].join("\n");

    const prompt = [
      "MIΛ LANGUAGE LEARNING REQUEST",
      "",
      "Teach " + displayLanguage + " as a careful, syllabus-first language teacher.",
      "",
      "The learner selected this course:",
      sourceContext,
      "",
      "The learner's selected skill is: " + selectedSkillInfo.label + ".",
      "Skill description: " + selectedSkillInfo.description,
      "",
      "Teaching rules:",
      "1. Use the selected official syllabus and its verified coverage as the primary curriculum whenever a verified ECESWA PDF is listed.",
      "2. This catalogue embeds verified summaries and official links, not every page of every PDF. Do not claim to have read a full PDF unless the learner attaches it; ask for the current PDF or teacher outline for details not included here. Never invent syllabus topics, prescribed set texts, paper weightings, paper durations, assessment objectives or exam requirements.",
      "3. If this catalogue says only an official subject page is available, explain that the detailed syllabus breakdown is not verified here. Ask the learner to attach the current school PDF or teacher outline before creating an exam-specific test.",
      "4. If this is Portuguese or another independent-practice course, do not claim ECESWA alignment. Teach general language skills and ask for the school's syllabus before exam-specific work.",
      "5. Learners may attach class notes, textbooks or teacher handouts in the MIΛ chat. Treat these as supplementary learning material, extract their actual content, and compare them with the official syllabus. If a note conflicts with the official syllabus, identify the conflict and prioritise the official syllabus. Do not pretend to have read a file that was not attached.",
      "6. Explain concepts clearly at the learner's grade/form level. Give examples, guided practice, feedback and short checks for understanding. Do not overwhelm the learner with a full lesson at once.",
      "7. When generating a test, every question must have a valid answer mechanism: options for multiple choice, selectable True/False controls, or a text field for written answers. Include a clear marking key and explanations.",
      "8. For SiSwati, use correct SiSwati spelling and grammar, explain difficult terms in English when useful, and do not invent current prescribed texts. Ask the learner or teacher for the current set-text list if needed.",
      "9. For French and Portuguese, use correct accents and natural language. Correct errors constructively and explain why.",
      "10. Start by confirming the course and the selected skill, then teach the first small step.",
    ].join("\n");

    onStartPractice(prompt);
  };

  return (
    <section className="language-learning-hub">
      <header className="language-hub-header">
        <div className="language-hub-icon"><Languages size={24} /></div>
        <div>
          <p className="eyebrow">MIΛ LANGUAGE STUDIO</p>
          <h2>Language learning, guided by the syllabus</h2>
          <p>English, SiSwati and French use verified ECESWA references where available. Other languages remain available for general or school-specific practice without invented syllabus claims.</p>
        </div>
      </header>

      <div className="language-hub-controls">
        <label>
          <span>Language</span>
          <select value={language} onChange={(event) => changeLanguage(event.target.value as LanguageChoice)}>
            {profileLanguageChoices.map((choice) => <option key={choice} value={choice}>{choice === "Other" ? (customLanguageFromProfile(subjects) || "Other language") : choice}</option>)}
          </select>
        </label>
        <label>
          <span>Course / syllabus</span>
          <select value={syllabusId} onChange={(event) => setSyllabusId(event.target.value)}>
            <option value="">Choose the syllabus that matches your school and grade</option>
            {syllabusOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.label} · {item.cycle}</option>
            ))}
          </select>
        </label>
        {language === "Other" && (
          <label className="language-custom-name">
            <span>Language name</span>
            <input value={customLanguage} onChange={(event) => setCustomLanguage(event.target.value)} placeholder="Enter the language you study" />
          </label>
        )}
      </div>

      <div className="language-profile-context">
        <span><strong>Profile pathway:</strong> {[educationLevel, grade, curriculum].filter(Boolean).join(" · ") || "Not set yet"}</span>
        <span><strong>Language subjects:</strong> {subjects.filter(subject => /english|siswati|si\s*swati|french|portuguese|language/i.test(subject)).join(", ") || "None selected in your profile"}</span>
      </div>
      {!hasLanguageSubject && <section className="language-syllabus-prompt" role="status">
        <BookOpen size={20}/>
        <div><strong>Choose your language subject first</strong><p>MIΛ cannot safely guess which language you study. Open My Profile, select English, SiSwati, French, Portuguese or the language subject your school teaches, save your changes, then return here.</p>
          {onOpenProfile && <button type="button" className="language-practice-button" onClick={onOpenProfile}>Update my profile <ArrowRight size={15}/></button>}
        </div>
      </section>}

      {selectedSyllabus ? (
        <section className="language-syllabus-summary">
          <div className="language-syllabus-summary-heading">
            <div>
              <p className="eyebrow">CURRICULUM REFERENCE</p>
              <h3>{selectedSyllabus.label}</h3>
              <p>{selectedSyllabus.assessment}</p>
            </div>
            <span className={"language-source-status " + selectedSyllabus.status}>
              {selectedSyllabus.status === "official-pdf" ? "Official syllabus PDF" : selectedSyllabus.status === "official-page" ? "Official subject page" : "General practice"}
            </span>
          </div>
          <div className="language-coverage-list">
            {selectedSyllabus.coverage.map((item) => <span key={item}>{item}</span>)}
          </div>
          <p className="language-source-note">{selectedSyllabus.sourceNote}</p>
          <div className="language-source-links">
            {selectedSyllabus.pdfUrl && (
              <a href={selectedSyllabus.pdfUrl} target="_blank" rel="noreferrer">
                <BookOpen size={15} /> Open official syllabus PDF <ExternalLink size={13} />
              </a>
            )}
            {selectedSyllabus.subjectPage && (
              <a href={selectedSyllabus.subjectPage} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> ECESWA subject page and available specimen papers
              </a>
            )}
          </div>
        </section>
      ) : (
        <section className="language-syllabus-prompt">
          <BookOpen size={20} />
          <div>
            <strong>Choose the exact course before starting</strong>
            <p>For SiSwati EGCSE, select First Language (6870) or Second Language (6871). The app will not guess which examination course you take.</p>
          </div>
        </section>
      )}

      <section className="language-skills-section">
        <div className="language-section-heading">
          <div><p className="eyebrow">PRACTICE FOCUS</p><h3>What would you like to work on?</h3></div>
          <span>{skills.length} learning areas</span>
        </div>
        <div className="language-skill-grid">
          {skills.map((skill) => (
            <button
              type="button"
              key={skill.value}
              className={"language-skill-card " + (selectedSkill === skill.value ? "active" : "")}
              onClick={() => setSelectedSkill(skill.value)}
            >
              <strong>{skill.label}</strong>
              <span>{skill.description}</span>
            </button>
          ))}
        </div>
      </section>

      {language === "SiSwati" && (
        <section className="language-reading-catalogue">
          <div className="language-section-heading">
            <div><p className="eyebrow">SI SWATI READING PRACTICE</p><h3>Core language and literature areas</h3></div>
          </div>
          <div className="language-reading-grid">
            {readingCatalogue.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <small>{item.focus}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="language-notes-callout">
        <BookOpen size={18} />
        <p><strong>Your notes can be added.</strong> Start the MIΛ chat and attach class notes, worksheets or teacher handouts. MIΛ will use them as extra examples and practice, not as a replacement for the official syllabus.</p>
      </div>

      <button type="button" className="language-practice-button" disabled={!canStart} onClick={startPractice}>
        <Sparkles size={17} /> Start guided practice with MIΛ <ArrowRight size={16} />
      </button>
      {!canStart && hasLanguageSubject && <p className="language-validation-note">Select the exact syllabus for your chosen language subject. If the course is not listed, add its name and provide the current school syllabus before exam-specific practice.</p>}
    </section>
  );
}
