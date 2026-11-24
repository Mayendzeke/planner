# Central assessment engine — implementation contract

## Product rules
- Weekly coverage is for every active registered subject/module, Monday–Friday.
- The balanced policy is authoritative: distribute high-workload subjects across different days where free slots permit; never silently omit a subject.
- Regular subject assessments contain 10 questions.
- Schedule generation is deterministic for a given profile/week/availability snapshot and must be idempotent when persisted.
- A missed due date marks an assessment overdue; it must not prevent opening or submitting it.
- MIΛ may generate questions, but persisted assessments and attempts must work without a live MIΛ conversation.
- Monthly assessments and quarterly examinations are separate assessment periods and must be planned around weekly workload.
- Saturday competitions are out of scope for this implementation phase.

## Scheduling inputs
The trusted scheduling service must build normalized free slots by subtracting school timetable entries, teacher/class lessons, personal timetable entries, personal commitments and explicit unavailable periods from the student's configured availability. The client scheduler must never infer that a student is free merely because no timetable row exists.

Each subject/module may include:
- education level, grade/year, curriculum and country
- subject type (calculation, theory, practical, essay, memorisation, language, mixed)
- difficulty (teacher/student estimate and observed difficulty)
- university credit hours or workload units
- recent performance and topic mastery
- upcoming assessment deadlines and learning gaps

## Question and assessment lifecycle
1. Create a schedule record with a unique learner + period + subject + assessment-type key.
2. Resolve approved learning materials and syllabus/topic coverage.
3. Select verified shared question-bank items or request generation from an approved provider.
4. Validate schema, answer keys, curriculum fit, topic coverage, difficulty and duplication.
5. Create immutable learner-specific question snapshots (randomised selection/order and safe numeric variants).
6. Persist assessment set, questions and learner assignment before it appears in the student app.
7. Store attempts independently; preserve first-attempt and best-score semantics for XP anti-farming.

## Learning-material approval lifecycle
- Check the student's resources and topic coverage first.
- If there is a gap, create a material research/generation job using the student's full profile.
- Store provenance (source URL/title, retrieval date, curriculum, syllabus mapping, topic, language, generator and verification status).
- Keep generated material in pending review; it is not visible to the learner until Monitor approves it.
- Approval publishes a student-scoped resource and links its source/provenance. Rejection retains an audit record and does not publish.
- Reusable material may be proposed to other learners only when country, curriculum, level, grade/course, subject, syllabus and language are compatible. Never assume same grade alone is sufficient.

## Reusable question bank and anti-copying
- Keep shared verified question-bank items separate from learner assignment snapshots.
- Generate different random versions from the same learning objectives and difficulty blueprint.
- Randomise item selection/order and parameterise values when academically valid.
- Store exact version and item IDs on each assignment for reproducibility and marking.
- Prevent accidental identical forms for the same session/cohort where pool size permits; do not claim anti-cheating guarantees.

## Security requirements
- Every exposed table has RLS and least-privilege grants.
- Students can read only their own published materials, assignments and attempts.
- Monitor approval actions require authenticated administrator authorization and MFA enforcement already used by Monitor.
- AI generation runs server-side; provider secrets never enter browser bundles.
- Do not trust student-supplied profile metadata for privileged authorization.
- Use storage policies and signed URLs for private learning resources.
