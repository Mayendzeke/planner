import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, MessageCircle, ShieldCheck } from "lucide-react";
import type { Subject } from "../data/db";
import AssignedAssessments from "./AssignedAssessments";
import AssessmentProgramme from "./AssessmentProgramme";
import SchoolHomeworkHelp from "./SchoolHomeworkHelp";
import WeeklyTest from "./WeeklyTest";
import "./StudyExamsPage.css";

type AssessmentTab = "programme" | "practice" | "assigned" | "help";
type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { failed: boolean };

export class StudyExamsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Study & Exams could not render:", error, info.componentStack);
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) {
      return (
        <section className="study-exams-error glass-panel" role="alert">
          <div className="study-exams-error-icon"><ShieldCheck size={24} /></div>
          <span className="eyebrow">ASSESSMENT RECOVERY</span>
          <h2>This part of Study &amp; Exams could not open.</h2>
          <p>Your wider StudySpace account is still available. Try opening this section again. Previously submitted work remains saved to your account.</p>
          <div className="study-exams-error-actions">
            <button type="button" className="primary-button" onClick={this.retry}>Try again</button>
            <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Reload StudySpace</button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

const tabs: { id: AssessmentTab; label: string; description: string; icon: typeof BookOpen; kicker: string }[] = [
  { id: "programme", label: "My programme", description: "Set your available study periods and follow your balanced weekly assessment schedule.", icon: CalendarDays, kicker: "YOUR PERSONAL WEEKLY PROGRAMME" },
  { id: "practice", label: "Practice & exams", description: "Choose a subject, revise key ideas, practise a topic or sit a mixed examination.", icon: GraduationCap, kicker: "YOUR PERSONAL REVISION SPACE" },
  { id: "assigned", label: "Teacher assignments", description: "Open tests and assessments your teacher has assigned to your StudySpace account.", icon: ClipboardCheck, kicker: "WORK SET BY YOUR TEACHER" },
  { id: "help", label: "Ask my teacher", description: "Send a homework question or photo and follow the replies from your teacher and MIΛ.", icon: MessageCircle, kicker: "SCHOOL HOMEWORK SUPPORT" },
];

export default function StudyExamsPage({ subjects }: { subjects: Subject[] }) {
  const [activeTab, setActiveTab] = useState<AssessmentTab>("programme");
  const active = tabs.find(tab => tab.id === activeTab) ?? tabs[0];
  const ActiveIcon = active.icon;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById("study-exams-tab-" + nextTab.id)?.focus();
  };

  return (
    <section className="study-exams-workspace">
      <header className="study-exams-header glass-panel">
        <div className="study-exams-header-copy">
          <span className="eyebrow">STUDYSPACE ASSESSMENT CENTRE</span>
          <h2>Exams, tests and assignments.</h2>
          <p>One organised place for practice, formal assessments, results and teacher support.</p>
        </div>
        <div className="study-exams-secure-label"><ShieldCheck size={16} /><span>Student account protected</span></div>
      </header>

      <nav className="study-exams-tabs" role="tablist" aria-label="Assessment workspace sections">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={"study-exams-tab-" + tab.id}
              type="button"
              role="tab"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              aria-controls="study-exams-panel"
              className={"study-exams-tab" + (selected ? " is-active" : "")}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={event => handleTabKeyDown(event, index)}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="study-exams-tab-intro">
        <div>
          <span className="eyebrow">{active.kicker}</span>
          <p>{active.description}</p>
        </div>
        <ActiveIcon size={21} aria-hidden="true" />
      </div>

      <div id="study-exams-panel" role="tabpanel" aria-labelledby={"study-exams-tab-" + activeTab} className="study-exams-tab-panel">
        <StudyExamsErrorBoundary key={activeTab}>
          {activeTab === "programme" && <AssessmentProgramme onOpenAssignments={() => setActiveTab("assigned")} />}
          {activeTab === "practice" && <WeeklyTest subjects={subjects} />}
          {activeTab === "assigned" && <AssignedAssessments assignmentType="non_practice" />}
          {activeTab === "help" && <SchoolHomeworkHelp />}
        </StudyExamsErrorBoundary>
      </div>
    </section>
  );
}
