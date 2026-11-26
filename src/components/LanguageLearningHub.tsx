import { useState } from "react";
import { ArrowUpRight, BookOpen, Languages, MessageCircle, PenLine, Sparkles } from "lucide-react";
import "./LanguageLearningHub.css";

type LanguageLearningHubProps = {
  onStartPractice: (prompt: string) => void;
};

const skills = [
  { value: "Vocabulary and word meaning", label: "Vocabulary", description: "Build useful words, meanings and examples." },
  { value: "Grammar and sentence construction", label: "Grammar", description: "Practise sentence structure and language rules." },
  { value: "Reading comprehension", label: "Reading", description: "Read a short passage and answer questions." },
  { value: "Translation between SiSwati and English", label: "Translation", description: "Compare meaning and practise accurate translation." },
  { value: "Composition and creative writing", label: "Writing", description: "Plan, write and improve your own composition." },
  { value: "Oral literature, idioms and proverbs", label: "Oral literature", description: "Explore oral forms and their meaning in context." },
  { value: "EGCSE-style examination practice", label: "Exam practice", description: "Try original practice tasks and receive feedback." },
] as const;

export default function LanguageLearningHub({ onStartPractice }: LanguageLearningHubProps) {
  const [language, setLanguage] = useState<"SiSwati" | "English">("SiSwati");
  const [courseFocus, setCourseFocus] = useState<"First Language" | "Second Language">("First Language");
  const [skill, setSkill] = useState<(typeof skills)[number]["value"]>(skills[0].value);
  const selectedSkill = skills.find(item => item.value === skill) ?? skills[0];

  const start = () => {
    const sourceContext = language === "SiSwati"
      ? "StudySpace has verified metadata for the ECESWA EGCSE SiSwati " + courseFocus + " syllabus, 2027–2029, for Form 4/Form 5. First Language is for learners whose mother tongue is SiSwati; Second Language is for learners studying it as an additional language. The full PDF text is not included automatically, so do not claim to have read it or invent exact syllabus requirements. Use the official reference only as a source pointer and say when exact coverage cannot be verified. Some local book titles in the catalogue are only publisher-reported; never describe them as ECESWA-prescribed or confirmed set texts."
      : "No dedicated official English language syllabus document is attached to this activity. Match practice to my StudySpace learner profile and clearly distinguish general practice from exact examination syllabus coverage.";
    const prompt = [
      "Act as my age-appropriate StudySpace language tutor.",
      "Learning language: " + language + ".",
      "Activity: " + skill + ".",
      "Match the vocabulary, reading complexity and expectations to my saved education level, grade and curriculum. If the level is unclear, ask one brief question.",
      "Start with one short activity, let me attempt it, then give clear correction and explanation. Teach me rather than simply giving away the answer.",
      "For SiSwati, use correct spelling and natural language. Do not invent words, idioms, proverbs, grammar rules, translations or official examination requirements. When uncertain, say so and offer a cautious explanation rather than guessing. Use English only as a brief gloss when it helps me learn.",
      sourceContext,
      "Keep the lesson concise and encourage me to answer before revealing solutions."
    ].join("\n\n");
    onStartPractice(prompt);
  };

  return (
    <section className="language-workspace" aria-labelledby="language-workspace-title">
      <div className="language-hero">
        <div className="language-hero-icon"><Languages size={26}/></div>
        <div className="language-hero-copy">
          <span className="language-eyebrow">STUDYSPACE LANGUAGE STUDIO</span>
          <h2 id="language-workspace-title">Learn in your language.</h2>
          <p>Practise SiSwati with MIΛ through short, guided lessons that build confidence in vocabulary, grammar, reading and writing.</p>
        </div>
        <span className="language-feature-tag"><Sparkles size={14}/> SiSwati focus</span>
      </div>

      <div className="language-practice-panel">
        <div className="language-panel-heading">
          <div><span className="language-kicker">YOUR NEXT LESSON</span><h3>Choose what to practise</h3></div>
          <span className="language-ai-mark"><MessageCircle size={16}/> MIΛ tutor</span>
        </div>
        <div className="language-controls">
          <label>
            <span>Learning language</span>
            <select value={language} onChange={event => setLanguage(event.target.value as "SiSwati" | "English")}>
              <option value="SiSwati">SiSwati</option>
              <option value="English">English</option>
            </select>
          </label>
          {language === "SiSwati" && <label>
            <span>ECESWA course focus</span>
            <select value={courseFocus} onChange={event => setCourseFocus(event.target.value as "First Language" | "Second Language")}>
              <option value="First Language">First Language · 6870</option>
              <option value="Second Language">Second Language · 6871</option>
            </select>
          </label>}
          <label>
            <span>Skill to practise</span>
            <select value={skill} onChange={event => setSkill(event.target.value as (typeof skills)[number]["value"])}>
              {skills.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <div className="language-skill-preview">
          <div className="language-skill-icon"><PenLine size={18}/></div>
          <div><strong>{selectedSkill.label}</strong><p>{selectedSkill.description}</p></div>
        </div>
        <button type="button" className="language-start-button" onClick={start}>Start a guided lesson <Sparkles size={16}/></button>
      </div>

      <div className="language-resource-grid">
        <article className="language-resource-card language-official-card">
          <div className="language-resource-icon"><BookOpen size={18}/></div>
          <span className="language-source-status">OFFICIAL ECESWA · 6870</span>
          <h3>First Language SiSwati</h3>
          <p>2027–2029 syllabus reference for Form 4 and Form 5. The official subject page also lists the current-cycle specimen question papers and mark schemes.</p>
          <a href="https://www.examscouncil.org.sz/upload-centre/syllabus/EGCSE%20First%20Language%20SiSwati%202027-2029%20Syllabus.pdf" target="_blank" rel="noreferrer">Open 2027–2029 syllabus <ArrowUpRight size={14}/></a>
          <a href="https://www.examscouncil.org.sz/programmes/subject.php?id=43&programme=EGCSE" target="_blank" rel="noreferrer">Syllabus, specimen papers and mark schemes <ArrowUpRight size={14}/></a>
        </article>

        <article className="language-resource-card language-official-card">
          <div className="language-resource-icon"><BookOpen size={18}/></div>
          <span className="language-source-status">OFFICIAL ECESWA · 6871</span>
          <h3>SiSwati as a Second Language</h3>
          <p>Separate 2027–2029 syllabus for learners studying SiSwati as an additional language. Do not use this route as a substitute for First Language preparation.</p>
          <a href="https://www.examscouncil.org.sz/upload-centre/syllabus/EGCSE%20Siswati%20as%20a%20Second%20Language%202027-2029%20Syllabus.pdf" target="_blank" rel="noreferrer">Open 2027–2029 syllabus <ArrowUpRight size={14}/></a>
          <a href="https://www.examscouncil.org.sz/programmes/subject.php?id=44&programme=EGCSE" target="_blank" rel="noreferrer">Past papers and course information <ArrowUpRight size={14}/></a>
        </article>

        <article className="language-resource-card">
          <div className="language-resource-icon"><BookOpen size={18}/></div>
          <span className="language-source-status">LOCAL READING CATALOGUE</span>
          <h3>SiSwati books and reading</h3>
          <p>Publisher catalogue references are useful for discovering local reading material. They are not proof that a title is an ECESWA-prescribed or confirmed examination set text.</p>
          <a href="https://imisebepublishing.com/published-books/" target="_blank" rel="noreferrer">Browse publisher catalogue <ArrowUpRight size={14}/></a>
        </article>
      </div>
      <p className="language-honesty-note">StudySpace distinguishes verified examination-board references from publisher listings. Official text, translations and grade-specific reading lists will only be labelled as approved when the source confirms that status.</p>
    </section>
  );
}
