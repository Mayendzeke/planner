import { useState } from "react";

export const TERMS_VERSION = "2026-11-09-v8";

export type TermsAcceptanceRole = "adult_learner" | "parent_guardian";

export const TERMS_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. About StudySpace and these terms",
    paragraphs: [
      "Study Space is an educational planning and learning-support service operated in the Kingdom of Eswatini by Ayanda Zwane, Founder and Owner. Study Space is the service and trading name currently used while formal business registration is pending; it is not represented as an already registered company or legal entity. In these terms, “Study Space”, “we” and “us” mean the service operated by Ayanda Zwane; “you” means the learner or the parent/legal guardian accepting these terms for a learner.",
      "Current operator details: Ayanda Zwane, Founder and Owner, operating from Ezulwini, Kingdom of Eswatini, while formal business registration is pending. This is a town/locality and not a street address. WhatsApp support: +268 7994 0955. MTN MoMo payments: +268 7824 0679. The MoMo recipient name displayed at payment must be checked before confirming a transfer.",
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
      "Study Space provides an educational planning and learning-support service that may include a student dashboard, study planner, academic calendar, subject organisation, study and exam tools, progress records, learning resources, classroom functions and MIΛ (MIA), the StudySpace AI learning assistant. StudySpace’s data-processing approval/registration, as described by StudySpace, covers educational processing for learners aged 9 and older and recognises MIΛ as an AI assistant for educational use. MIΛ is strictly for educational purposes: understanding school or course subjects, homework guidance, revision, examination preparation, study planning, timetable interpretation and other learning activities. It must not be used as a general-purpose assistant or for unrelated personal, medical, legal, financial, political or other non-educational advice. Requests outside education will be redirected. Features may change, be improved, be unavailable temporarily or vary by learner profile, curriculum, device and subscription status.",
      "StudySpace is a learning-support tool. It does not replace a school, teacher, tutor, examination authority, parent or guardian. The learner remains responsible for checking school instructions, deadlines, assessment requirements and the accuracy of work submitted to a school.",
      "We do not promise a particular grade, examination result, admission decision or academic outcome. AI-generated or automatically generated explanations can be incomplete or incorrect; learners should check important information against trusted course materials and teacher guidance."
    ]
  },
  {
    heading: "4. Student ID, PIN and account security",
    paragraphs: [
      "Each learner is assigned a Student ID. The one-time enrolment PIN is valid for exactly 24 hours after it is generated, can be redeemed once, and is only for first-time account creation. The 24-hour PIN expiry is separate from the learner’s free trial.",
      "The learner or guardian must keep the Student ID, password and any one-time PIN confidential and must not share an account. Tell StudySpace promptly if an account may have been accessed by someone else.",
      "The learner’s free trial starts only after successful account registration and lasts 7 consecutive days. A reminder is shown after 6 days, when 24 hours remain. When the 7 days end, learning features are paused until a paid subscription is requested, paid for and activated by StudySpace."
    ]
  },
  {
    heading: "5. Subscription plans and access periods",
    paragraphs: [
      "The currently offered plans are Weekly: E100 for 7 days; 2 Weeks: E180 for 14 days; and Monthly: E350 for 28 days. Prices are stated in Eswatini Emalangeni (E). The plan period begins when StudySpace confirms the payment and activates the plan, not when the learner first opens WhatsApp or selects a plan.",
      "Plans are for the stated continuous access period and do not renew automatically. A learner must request another plan and complete the payment and confirmation process to continue after expiry. The Student ID remains the same when a plan changes.",
      "A plan selection or WhatsApp message is a request only. It is not payment confirmation and does not unlock the account. Access is restored only after StudySpace has verified the payment and activated the plan."
    ]
  },
  {
    heading: "6. Payment method and payment reference",
    paragraphs: [
      "MTN MoMo is the only accepted payment method at this time. Other payment methods, including bank transfer, eWallet, Unayo and other mobile-money services, are not accepted unless StudySpace announces a change through its official channels.",
      "Send MTN MoMo payments to +268 7824 0679. The learner must use their exact StudySpace Student ID as the payment reference. Before confirming payment, verify that MTN MoMo displays the intended recipient name “Ayanda Zwane”. If the recipient name or number does not match, do not pay; contact StudySpace through WhatsApp at +268 7994 0955 first.",
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
      "The 7-day free trial is provided so the learner can explore the available features before choosing a paid plan. Please check the plan, duration and price carefully before paying.",
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
      "To operate the service, StudySpace may process a Student ID, account credentials, learner name, country, school or institution, education level, grade or course, curriculum, subjects, study goals, planner entries, learning activity, messages, uploaded learning materials, timetable and classroom participation information, support communications, payment-verification details and a record of agreement to these terms (including the accepting person's name, stated role, terms version and acceptance time). Do not upload information that is not needed for learning.",
      "We use this information to create and secure accounts, personalise the learning workspace, provide planner and learning features, support learners, manage subscriptions and payments, prevent misuse, maintain service records and comply with legal obligations. Access should be limited to authorised StudySpace administrators and, where relevant to a learning activity, authorised teachers or service providers.",
      "StudySpace's Supabase Cloud project is configured in the eu-west-1 region (Ireland). Supabase provides the account authentication, primary database and file storage used by the service. The primary project region is outside Eswatini. Supabase documents that Edge Functions run globally unless regional invocation is configured, and that storage CDN content may be cached globally; processing and delivery therefore are not necessarily confined to Ireland. The static application is published through GitHub Pages. Where live classroom video is enabled, room access and audio/video streams may be processed by 8x8 JaaS. When a learner or guardian contacts StudySpace or sends payment evidence through WhatsApp, Meta/WhatsApp processes those communications. MTN processes MoMo payments on its payment network; StudySpace receives the transaction details needed to verify a plan. These providers have their own privacy notices and service terms. Data may be transferred or accessed outside Eswatini because the providers use infrastructure and support systems in other countries. StudySpace will use these providers only for the educational and operational purposes described in its data-processing registration/approval and will apply the legal requirements and safeguards that govern those transfers. Google Gemini API is used only by the separate adult administrator tools in StudySpace Monitor, not by the Student app or learner-facing MIA. It is enabled only for an adult administrator session protected by multi-factor authentication and only after active paid API billing has been confirmed. The administrator tools are intended for anonymised, non-confidential teaching material; do not submit learner or guardian names, Student IDs, contact details, personal records or confidential information. For paid Gemini API services, Google states that prompts and responses are not used to improve its products, but may be logged for limited safety, security and legal purposes and may be stored or processed in countries where Google or its agents maintain facilities. The Student app and its homework fallback use Cloudflare Workers AI (Gemma), not the Gemini API. A primary project region does not mean that every service, function, delivery route, support operation or backup is located in that same country.",
      "MIΛ (MIA) is enabled as a learner-facing AI assistant for educational purposes only. When a learner asks a question, StudySpace sends the text of the question and relevant academic context—such as education level, grade, curriculum, subjects, study goals, preferred study schedule and saved learning observations—to Cloudflare Workers AI using the Gemma model to generate an educational response. When a learner chooses to attach a supported image, its contents may also be sent to Cloudflare for analysis. Do not include names, Student IDs, faces, addresses, phone numbers, identity documents, medical information, financial details or other personal or sensitive information in a question or attachment. Crop learning images so they show only the relevant educational material. StudySpace stores learner MIA conversations and academic learning observations in its Supabase project so the learner can continue a conversation and receive relevant study support. Supabase's primary project region is eu-west-1 (Ireland); Edge Functions may be invoked globally and storage content may be delivered or cached through global infrastructure. Cloudflare processes the question and any submitted image under its applicable service terms and data-processing arrangements. MIΛ must be used only for learning: school and course subjects, homework understanding, revision, exam preparation, study planning, timetable interpretation, flashcards and related academic support. It is not a source of medical, legal, financial, relationship, political or general personal advice. It may make mistakes or provide incomplete explanations; verify important answers with teachers, textbooks and trusted course resources. A teacher remains responsible for teaching, assessment and learner support. School Homework Help separately sends a typed school question or an image to the learner's teacher first; if the teacher has not replied after two minutes, StudySpace may send the question and image to Cloudflare Workers AI to prepare an educational explanation. The learner's Student ID and account profile are not added to that fallback prompt, but information visible in the submission may be processed. Uploaded homework photos are stored in private StudySpace storage and are available to the learner, authorised StudySpace administrators and the fallback process when triggered. Adult administrator MIA, Classroom Studio lesson generation and interactive homework generation use Google Gemini API as the primary provider, with Cloudflare Workers AI (Gemma 4) as the automatic backup when Gemini is unavailable. These functions are available only to authorised adult administrators with multi-factor authentication; Gemini is not called by the Student app, student MIA chat or learner homework fallback. The administrator tools screen common identifiers and display warnings, but administrators remain responsible for using anonymised, non-confidential teaching content only. Do not submit learner or guardian names, Student IDs, contact details, dates of birth, sensitive information or confidential learner records to either administrator AI provider.",
      "We retain account and learning information only for as long as it is reasonably needed for the educational service, account security, support, payment administration, audit, dispute resolution or a legal requirement. After a verified account-closure or deletion request, information in active systems is handled through the account-closure process, subject to records that must lawfully be retained. Copies in provider backups may remain until the relevant provider's backup cycle expires. StudySpace reviews retained information and removes or anonymises it when it is no longer required, subject to applicable legal obligations.",
      "You may ask StudySpace to confirm what personal information is held, request access to it, correct inaccurate information, request deletion or restriction where applicable, object to processing where the law allows, withdraw consent where consent is the lawful basis, or ask questions about its use. Some records may need to be retained for security, payment, legal or dispute-resolution purposes. Requests can be made through the official StudySpace email or WhatsApp contact.",
      "For a learner under 18, a parent or legal guardian with authority to act for the learner must provide the required prior consent for the processing of the learner's information. The learner and guardian should not use the service until that consent has been given. StudySpace will not rely on a learner's own acceptance where a guardian's consent is required."
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
      "Operator: Ayanda Zwane, Founder and Owner, operating from Ezulwini, Kingdom of Eswatini, while formal business registration is pending. Email: ayandaagustozwane@gmail.com; WhatsApp support: +268 7994 0955; MTN MoMo payments: +268 7824 0679. Ezulwini is the stated business locality, not a street address. Formal registration particulars will be added after registration is completed. StudySpace has received data-processing approval/registration for its educational service, as described by StudySpace, including coverage for learners aged 9 and older and recognition of MIΛ as an AI assistant for educational use. Public enrolment is available only for learners aged 9 or older, subject to the guardian-consent safeguards in these terms and to the conditions and scope of the applicable approval/registration. Formal business registration is a separate matter and remains pending until completed."
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
  adultLearnerOnly = false,
  hideAcceptanceName = false,
  readOnly = false,
}: {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  acceptedByName: string;
  onAcceptedByNameChange: (value: string) => void;
  acceptanceRole: TermsAcceptanceRole;
  onAcceptanceRoleChange: (value: TermsAcceptanceRole) => void;
  adultLearnerOnly?: boolean;
  hideAcceptanceName?: boolean;
  readOnly?: boolean;
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
    {!readOnly && !adultLearnerOnly && <label className="terms-role-label">Who is accepting these terms?
      <select value={acceptanceRole} onChange={event => onAcceptanceRoleChange(event.target.value as TermsAcceptanceRole)}>
        <option value="adult_learner">I am the learner and I am 18 or older</option>
        <option value="parent_guardian">I am the parent/legal guardian accepting for a learner under 18</option>
      </select>
    </label>}
    {!readOnly && !hideAcceptanceName && <label className="terms-name-label">Full name of the person accepting
      <input value={acceptedByName} onChange={event => onAcceptedByNameChange(event.target.value)} maxLength={120} placeholder="Enter your full name" required/>
    </label>}
    {!readOnly && <label className="terms-checkbox-label">
      <input type="checkbox" checked={accepted} disabled={!readToEnd} onChange={event => onAcceptedChange(event.target.checked)}/>
      <span>I have read and agree to the StudySpace Terms &amp; Conditions and Privacy Notice. I confirm that the person named above is authorised to accept them for this account. If I am accepting as a parent/legal guardian, I give the required consent for the learner’s personal information to be processed for the StudySpace learning service.</span>
    </label>}
    <p className="terms-guardian-note">{readOnly ? "Read-only copy for review. A learner under 18 cannot accept these terms. A parent or legal guardian must give consent in person through an authorised StudySpace representative." : readToEnd ? "You have reached the end of the Terms & Conditions." : "Open the terms above and scroll to the end before ticking the agreement box." + " Learners under 18 must have a parent or legal guardian complete this acceptance step. Do not select the adult-learner option on a child’s behalf."}</p>
  </section>;
}
