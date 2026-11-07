import { useState } from "react";

export const TERMS_VERSION = "2026-11-07-v2";

export type TermsAcceptanceRole = "adult_learner" | "parent_guardian";

export const TERMS_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. About StudySpace and these terms",
    paragraphs: [
      "Study Space is an educational planning and learning-support service operated in the Kingdom of Eswatini by Ayanda Zwane, Founder and Owner. Study Space is the service and trading name currently used while formal business registration is pending; it is not represented as an already registered company or legal entity. In these terms, “Study Space”, “we” and “us” mean the service operated by Ayanda Zwane; “you” means the learner or the parent/legal guardian accepting these terms for a learner.",
      "Current operator contact details: Ayanda Zwane, Founder and Owner; email: ayandaagustozwane@gmail.com; WhatsApp: +268 7994 0955. The physical business address and formal registration particulars will be added once available. The WhatsApp and MTN MoMo contact currently uses a personal line while a dedicated business MTN MoMo account is being arranged.",
      "By creating or using a StudySpace account, the person accepting these terms confirms that they have read and understood these terms and the privacy information in section 10."
    ]
  },
  {
    heading: "2. Learners under 18 and guardian consent",
    paragraphs: [
      "A learner under 18 must not accept these terms on their own. A parent or legal guardian who has authority to act for the learner must read and accept these terms in their own name before the learner’s personal information is processed for the learning service.",
      "The parent/legal guardian confirms that they have authority to give the required consent, understand the information collected and how the service is used, and agree to supervise the learner’s use where appropriate. They may contact StudySpace to ask questions, request access to or correction of information, or raise a privacy concern.",
      "An adult learner aged 18 or older may accept these terms personally. StudySpace may request reasonable confirmation of guardian authority where required to protect a child."
    ]
  },
  {
    heading: "3. What StudySpace provides",
    paragraphs: [
      "Study Space may provide a student dashboard, study planner, academic calendar, subject organisation, study and exam tools, progress records, learning resources and classroom functions. The learner-facing MIΛ AI feature is temporarily unavailable while Study Space verifies a provider arrangement suitable for school-age learners. Features may change, be improved, be unavailable temporarily or vary by learner profile, curriculum, device and subscription status.",
      "StudySpace is a learning-support tool. It does not replace a school, teacher, tutor, examination authority, parent or guardian. The learner remains responsible for checking school instructions, deadlines, assessment requirements and the accuracy of work submitted to a school.",
      "We do not promise a particular grade, examination result, admission decision or academic outcome. AI-generated or automatically generated explanations can be incomplete or incorrect; learners should check important information against trusted course materials and teacher guidance."
    ]
  },
  {
    heading: "4. Student ID, PIN and account security",
    paragraphs: [
      "Each learner is assigned a Student ID. The one-time enrolment PIN is valid for exactly 24 hours after it is generated, can be redeemed once, and is only for first-time account creation. The 24-hour PIN expiry is separate from the learner’s free trial.",
      "The learner or guardian must keep the Student ID, password and any one-time PIN confidential and must not share an account. Tell StudySpace promptly if an account may have been accessed by someone else.",
      "The learner’s free trial starts only after successful account registration and lasts 48 consecutive hours. A reminder is shown in the app after 24 hours. When the 48 hours end, learning features are paused until a paid subscription is requested, paid for and activated by StudySpace."
    ]
  },
  {
    heading: "5. Subscription plans and access periods",
    paragraphs: [
      "The currently offered plans are Weekly: E100 for 7 days; 2 Weeks: E200 for 14 days; and Monthly: E350 for 28 days. Prices are stated in Eswatini Emalangeni (E). The plan period begins when StudySpace confirms the payment and activates the plan, not when the learner first opens WhatsApp or selects a plan.",
      "Plans are for the stated continuous access period and do not renew automatically. A learner must request another plan and complete the payment and confirmation process to continue after expiry. The Student ID remains the same when a plan changes.",
      "A plan selection or WhatsApp message is a request only. It is not payment confirmation and does not unlock the account. Access is restored only after StudySpace has verified the payment and activated the plan."
    ]
  },
  {
    heading: "6. Payment method and payment reference",
    paragraphs: [
      "MTN MoMo is the only accepted payment method at this time. Other payment methods, including bank transfer, eWallet, Unayo and other mobile-money services, are not accepted unless StudySpace announces a change through its official channels.",
      "The temporary MTN MoMo recipient is Ayanda Zwane, using the personal MTN number +268 7994 0955 while Study Space arranges a dedicated business account. The learner must use their exact StudySpace Student ID as the payment reference. Before confirming payment, verify that MTN MoMo displays the recipient name “Ayanda Zwane”. If the recipient name or number does not match, do not pay; contact Study Space through the official WhatsApp contact first.",
      "After payment, send the payment confirmation or transaction reference through the official StudySpace WhatsApp contact and include the Student ID and selected plan. Do not send an MTN MoMo PIN, password or one-time security code. StudySpace may ask for reasonable evidence to match the payment to the learner.",
      "StudySpace will activate access after the payment is received and verified. If the Student ID reference is missing or incorrect, activation may be delayed while the payment is investigated."
    ]
  },
  {
    heading: "7. Expired access and learner records",
    paragraphs: [
      "When a trial or paid plan expires, the learner may still sign in. The dashboard and learning features are disabled and visually dimmed. The Subscription page remains available so the learner can select a plan and contact StudySpace on WhatsApp.",
      "Expiry does not by itself delete the learner’s Student ID, profile or saved work. Records are retained and handled according to the privacy and retention rules in these terms and applicable law. StudySpace cannot promise indefinite storage, so learners should export or keep their own backups where the app provides that function.",
      "Access resumes when payment is verified and the administrator activates a paid plan. Contact support if the profile or saved work appears to be missing."
    ]
  },
  {
    heading: "8. Cancellations and refunds",
    paragraphs: [
      "The 48-hour free trial is provided so the learner can explore the available features before choosing a paid plan. Please check the plan, duration and price carefully before paying.",
      "Except where applicable law gives you a cancellation or refund right, payments are not refundable merely because a learner changes their mind, does not use the service, stops studying, forgets to renew or does not use the full plan period.",
      "StudySpace will investigate exceptional cases caused materially by StudySpace, including an account or saved work being deleted by a teacher or administrator by mistake, a duplicate payment, or a verified payment for which access was not provided. We will first try to restore the account or work, correct the account, or extend the subscription where that reasonably resolves the problem. If the problem cannot reasonably be fixed, an appropriate refund may be considered.",
      "Nothing in this section removes a consumer’s rights that cannot lawfully be excluded, including any cancellation, cooling-off, remedy or refund rights that apply under Eswatini law. If a mandatory legal right conflicts with this policy, the mandatory legal right takes priority."
    ]
  },
  {
    heading: "9. Acceptable use and intellectual property",
    paragraphs: [
      "Use StudySpace lawfully and respectfully. Do not attempt to access another learner’s account or data, bypass subscription controls, interfere with the service, upload malicious material, harass others, impersonate another person or use the platform to cheat or facilitate academic misconduct.",
      "StudySpace and its interface, branding, software and original learning materials remain owned by their respective rights holders. StudySpace grants the learner a personal, limited, non-transferable permission to use the service for learning during an active trial or subscription.",
      "Learners remain responsible for the content they create or upload and must have the right to use it. They allow StudySpace to store and process that content as reasonably necessary to provide the requested features, synchronisation, support and security."
    ]
  },
  {
    heading: "10. Privacy and personal information",
    paragraphs: [
      "To operate the service, StudySpace may process a Student ID, account credentials, learner name, country, school or institution, education level, grade or course, curriculum, subjects, study goals, planner entries, learning activity, messages, uploaded learning materials, support communications, payment-verification details and a record of agreement to these terms (including the accepting person's name, stated role, terms version and acceptance time). Do not upload information that is not needed for learning.",
      "We use this information to create and secure accounts, personalise the learning workspace, provide planner and learning features, support learners, manage subscriptions and payments, prevent misuse, maintain service records and comply with legal obligations. Access should be limited to authorised StudySpace administrators and, where relevant to a learning activity, authorised teachers or service providers.",
      "The learner-facing MIΛ AI feature has been disabled in the Student App. The administrator-only MIA tool and AI lesson-recap generation in Monitor have also been temporarily paused. Student and administrator prompts, attachments, lesson notes and learning-profile information are not currently sent from Study Space to Google Gemini or another external AI provider through these tools. Study Space will update this notice before re-enabling any AI feature after selecting a provider whose terms and data-processing arrangements are suitable for the service and its school-age users. Administrators must not submit identifiable learner information to external AI providers unless Study Space has first reviewed and approved the applicable provider terms and safeguards.",
      "You may ask StudySpace to confirm what personal information is held, request access to it, challenge or correct inaccurate information, or ask questions about its use. Some records may need to be retained for security, payment, legal or dispute-resolution purposes. Requests can be made through the official StudySpace WhatsApp contact.",
      "For a learner under 18, the parent/legal guardian must provide the required prior consent for the processing of the learner’s information. The learner and guardian should not use the service until that consent has been given."
    ]
  },
  {
    heading: "11. Availability, support and limits",
    paragraphs: [
      "StudySpace aims to keep the service available and secure but does not guarantee uninterrupted access. Maintenance, connectivity problems, device limitations, third-party outages or events outside our reasonable control may temporarily affect features or synchronisation.",
      "Keep your password private and maintain a backup of important schoolwork. StudySpace is not responsible for data loss caused by a learner’s device failure, the learner sharing credentials, unauthorised access resulting from compromised credentials, or failure to keep a separate copy where a backup option is available, except to the extent the loss is caused by StudySpace or applicable law says otherwise.",
      "Nothing in these terms excludes or limits liability or consumer remedies that cannot lawfully be excluded or limited."
    ]
  },
  {
    heading: "12. Suspension, termination and changes",
    paragraphs: [
      "StudySpace may restrict or suspend an account where there is a security risk, serious misuse, a legal requirement or conduct that threatens other learners or the service. Where reasonable, StudySpace will explain the reason and how the issue can be reviewed.",
      "StudySpace may update features, prices or these terms. Material changes will be shown in the app or communicated through an official StudySpace channel. Where renewed acceptance is required, the learner or guardian will be asked to review and accept the new version before using the affected service.",
      "A learner may stop using StudySpace and ask support about account closure or data requests. Closing an account may affect access to saved records, subject to legal retention requirements and any steps needed to verify the request."
    ]
  },
  {
    heading: "13. Governing law and contact",
    paragraphs: [
      "These terms are intended to be governed by the laws of the Kingdom of Eswatini, subject to any mandatory consumer or data-protection rights that apply. We encourage learners and guardians to contact StudySpace first so that account, payment or service concerns can be reviewed promptly.",
      "Operator: Ayanda Zwane, Founder and Owner, operating the Study Space service name while formal business registration is pending. Contact: ayandaagustozwane@gmail.com; WhatsApp: +268 7994 0955. The temporary MTN MoMo recipient is Ayanda Zwane at +268 7994 0955, pending a dedicated business account. The physical business address and formal registration particulars will be added once available. These terms are a working service notice, not legal advice, and must receive local legal review before public commercial launch. New learner enrolment will remain closed until Study Space completes the required data-controller registration and other applicable legal launch requirements."
    ]
  }
];

export default function TermsAndConditions({
  accepted,
  onAcceptedChange,
  acceptedByName,
  onAcceptedByNameChange,
  acceptanceRole,
  onAcceptanceRoleChange,
}: {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  acceptedByName: string;
  onAcceptedByNameChange: (value: string) => void;
  acceptanceRole: TermsAcceptanceRole;
  onAcceptanceRoleChange: (value: TermsAcceptanceRole) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);

  return <section className="terms-consent-panel">
    <button type="button" className="terms-read-toggle" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
      <span><strong>Read Terms &amp; Conditions and Privacy Notice</strong><small>Version {TERMS_VERSION} · Includes plans, MoMo payments, refunds, data and guardian consent</small></span>
      <span>{expanded ? "Hide terms" : "Read terms"}</span>
    </button>
    {expanded && <div className="terms-document" onScroll={event => {
      const target = event.currentTarget;
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 8) setReadToEnd(true);
    }}>
      <p className="terms-intro">Please read all sections before accepting. Save or print a copy for your records.</p>
      {TERMS_SECTIONS.map(section => <section key={section.heading}>
        <h3>{section.heading}</h3>
        {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </section>)}
      <p className="terms-version-note">StudySpace Terms &amp; Conditions · {TERMS_VERSION}</p>
    </div>}
    <label className="terms-role-label">Who is accepting these terms?
      <select value={acceptanceRole} onChange={event => onAcceptanceRoleChange(event.target.value as TermsAcceptanceRole)}>
        <option value="adult_learner">I am the learner and I am 18 or older</option>
        <option value="parent_guardian">I am the parent/legal guardian accepting for a learner under 18</option>
      </select>
    </label>
    <label className="terms-name-label">Full name of the person accepting
      <input value={acceptedByName} onChange={event => onAcceptedByNameChange(event.target.value)} maxLength={120} placeholder="Enter your full name" required/>
    </label>
    <label className="terms-checkbox-label">
      <input type="checkbox" checked={accepted} disabled={!readToEnd} onChange={event => onAcceptedChange(event.target.checked)}/>
      <span>I have read and agree to the StudySpace Terms &amp; Conditions and Privacy Notice. I confirm that the person named above is authorised to accept them for this account. If I am accepting as a parent/legal guardian, I give the required consent for the learner’s personal information to be processed for the StudySpace learning service.</span>
    </label>
    <p className="terms-guardian-note">{readToEnd ? "You have reached the end of the Terms & Conditions." : "Open the terms above and scroll to the end before ticking the agreement box."} Learners under 18 must have a parent or legal guardian complete this acceptance step. Do not select the adult-learner option on a child’s behalf.</p>
  </section>;
}
