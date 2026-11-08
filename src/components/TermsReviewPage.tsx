import { GraduationCap, ShieldCheck } from "lucide-react";
import TermsAndConditions, { type TermsAcceptanceRole } from "./TermsAndConditions";

export default function TermsReviewPage() {
  return (
    <main className="guardian-consent-shell">
      <section className="guardian-consent-card terms-review-card">
        <div className="guardian-consent-brand"><GraduationCap size={23}/> studyspace<span>.</span></div>
        <div className="eyebrow"><ShieldCheck size={14}/> STUDYSPACE TERMS &amp; PRIVACY NOTICE</div>
        <h1>Read the StudySpace agreement.</h1>
        <p>This is the current read-only copy of the StudySpace Terms and Conditions and Privacy Notice. It is provided so a parent or legal guardian can review it with a StudySpace representative. This page does not collect acceptance or activate any learner account.</p>
        <TermsAndConditions
          accepted={false}
          onAcceptedChange={() => {}}
          acceptedByName=""
          onAcceptedByNameChange={() => {}}
          acceptanceRole={"parent_guardian" as TermsAcceptanceRole}
          onAcceptanceRoleChange={() => {}}
          readOnly
        />
      </section>
    </main>
  );
}
