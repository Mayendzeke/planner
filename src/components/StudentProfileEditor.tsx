import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, ImagePlus, Pencil, Save, UserRound, X } from "lucide-react";
import type { StudentProfile } from "./StudentOnboarding";
import { supabase } from "../lib/supabase";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LEVELS = ["Primary school", "Secondary school", "High school / Sixth form", "College", "University", "Other"];
const CURRICULA = ["National curriculum", "IGCSE / Cambridge", "A-Level", "IB", "CAPS", "Other / Not sure"];

export default function StudentProfileEditor({ profile, onSaved, avatarUrl = "" }: {
  profile: StudentProfile;
  onSaved: (next: StudentProfile) => void;
  avatarUrl?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StudentProfile>(profile);
  const [customSubject, setCustomSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(""); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function chooseAvatar(file: File | null) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Choose a PNG, JPG or WebP profile picture."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Your profile picture must be 2 MB or smaller."); return; }
    setAvatarFile(file);
    setRemoveAvatar(false);
    setError("");
  }

  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function toggleDay(day: string) {
    const next = draft.preferredDays.includes(day)
      ? draft.preferredDays.filter(item => item !== day)
      : [...draft.preferredDays, day];
    update("preferredDays", next);
  }

  function addSubject() {
    const name = customSubject.trim().slice(0, 80);
    if (!name || draft.subjects.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    update("subjects", [...draft.subjects, name]);
    setCustomSubject("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || saving) return;
    if (!draft.fullName.trim()) { setError("Full name is required."); return; }
    if (!draft.preferredDays.length) { setError("Choose at least one preferred study day."); return; }
    const targetMark = Number(draft.targetMark);
    const weeklyHours = Number(draft.weeklyHours);
    if (!Number.isFinite(targetMark) || targetMark < 0 || targetMark > 100) { setError("Target mark must be between 0 and 100."); return; }
    if (!Number.isFinite(weeklyHours) || weeklyHours < 0 || weeklyHours > 168) { setError("Weekly study hours must be between 0 and 168."); return; }

    setSaving(true); setError(""); setNotice("");
    try {
      const { data: sessionState, error: sessionError } = await supabase.auth.getSession();
      const learnerId = sessionState.session?.user.id;
      if (sessionError || !learnerId) throw new Error("Your secure session has expired. Sign in again.");

      const { error: profileError } = await supabase.rpc("update_studyspace_learner_profile", {
        p_full_name: draft.fullName.trim(),
        p_preferred_name: draft.preferredName.trim(),
        p_country: draft.country.trim(),
        p_institution: draft.institution.trim(),
        p_education_level: draft.level,
        p_grade: draft.grade.trim(),
        p_curriculum: draft.curriculum,
        p_academic_year: draft.academicYear.trim(),
        p_course: draft.course.trim(),
      });
      if (profileError) throw new Error("Your profile could not be updated: " + profileError.message);

      const { data: currentGoal, error: currentGoalError } = await supabase.from("student_goals")
        .select("reminder_settings").eq("learner_id", learnerId).maybeSingle();
      if (currentGoalError) throw new Error("Your profile was saved, but reminder preferences could not be preserved: " + currentGoalError.message);
      const { error: goalError } = await supabase.from("student_goals").upsert({
        learner_id: learnerId,
        goal_text: draft.goals,
        target_mark: targetMark,
        weekly_hours: weeklyHours,
        preferred_days: draft.preferredDays,
        reminder_settings: currentGoal?.reminder_settings ?? { enabled: false, time: "16:00", days: draft.preferredDays },
        updated_at: new Date().toISOString(),
      }, { onConflict: "learner_id" });
      if (goalError) throw new Error("Your profile was saved, but study goals could not be saved: " + goalError.message);

      const { data: existingRows, error: subjectLoadError } = await supabase.from("student_subjects")
        .select("name").eq("learner_id", learnerId);
      if (subjectLoadError) throw new Error("Your profile was saved, but current subjects could not be checked: " + subjectLoadError.message);
      const current = new Set((existingRows || []).map(row => String(row.name)));
      const desired = new Set(draft.subjects.map(name => name.trim()).filter(Boolean));
      for (const removed of current) {
        if (!desired.has(removed)) {
          const { error: removeError } = await supabase.from("student_subjects")
            .delete().eq("learner_id", learnerId).eq("name", removed);
          if (removeError) throw new Error("Your profile was saved, but a removed subject could not be updated: " + removeError.message);
        }
      }
      const additions = [...desired].filter(name => !current.has(name));
      if (additions.length) {
        const { error: addError } = await supabase.from("student_subjects").upsert(
          additions.map(name => ({ learner_id: learnerId, name })),
          { onConflict: "learner_id,name", ignoreDuplicates: true }
        );
        if (addError) throw new Error("Your profile was saved, but new subjects could not be added: " + addError.message);
      }

      let savedAvatarPath = draft.avatarPath || null;
      let uploadedAvatarPath: string | null = null;
      if (avatarFile) {
        const extension = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        uploadedAvatarPath = learnerId + "/avatar-" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("studyspace-avatars").upload(uploadedAvatarPath, avatarFile, {
          contentType: avatarFile.type, cacheControl: "3600", upsert: false,
        });
        if (uploadError) throw new Error("Your profile picture could not be uploaded: " + uploadError.message);
        savedAvatarPath = uploadedAvatarPath;
      }
      if (avatarFile || removeAvatar) {
        const { error: avatarError } = await supabase.rpc("update_studyspace_learner_avatar", {
          p_avatar_path: removeAvatar ? null : savedAvatarPath,
        });
        if (avatarError) {
          if (uploadedAvatarPath) await supabase.storage.from("studyspace-avatars").remove([uploadedAvatarPath]);
          throw new Error("Your profile picture could not be saved: " + avatarError.message);
        }
        if (profile.avatarPath && profile.avatarPath !== savedAvatarPath) {
          const { error: removeError } = await supabase.storage.from("studyspace-avatars").remove([profile.avatarPath]);
          if (removeError) setNotice("Your profile was saved. The previous profile picture could not be removed from storage.");
        }
      }

      const next: StudentProfile = {
        ...draft,
        fullName: draft.fullName.trim(),
        preferredName: draft.preferredName.trim(),
        country: draft.country.trim(),
        institution: draft.institution.trim(),
        course: draft.course.trim(),
        grade: draft.grade.trim(),
        academicYear: draft.academicYear.trim(),
        targetMark: String(targetMark),
        weeklyHours: String(weeklyHours),
        subjects: [...desired],
        avatarPath: savedAvatarPath || undefined,
      };
      onSaved(next);
      setDraft(next);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setEditing(false);
      setNotice("Your profile and academic plan have been updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(profile);
    setCustomSubject("");
    setAvatarFile(null);
    setRemoveAvatar(false);
    setError("");
    setEditing(false);
  }

  return <section className="glass-panel settings-card student-profile-editor">
    <div className="section-heading">
      <div><h2>My profile &amp; academic plan</h2><p>Keep your personal and school details up to date. Account security, age and guardian-verification status cannot be changed here.</p></div>
      <BookOpen size={20}/>
    </div>
    {!editing ? <>
      <div className="profile-editor-identity"><div className="profile-editor-avatar">{avatarUrl ? <img src={avatarUrl} alt="Your profile"/> : <UserRound size={28}/>}</div><div><strong>{profile.preferredName || profile.fullName}</strong><span>{profile.fullName}</span></div></div>
      <div className="privacy-list">
        <p><strong>{profile.preferredName || profile.fullName}</strong> · {profile.level}{profile.grade ? " · " + profile.grade : ""}</p>
        <p>{profile.institution || "School / institution not added"} · {profile.curriculum || "Curriculum not set"} · Academic year {profile.academicYear || "not set"}</p>
        <p>{profile.subjects.length ? profile.subjects.join(" · ") : "No subjects added yet"}</p>
        <p>Goal: {profile.goals} · Target: {profile.targetMark}% · {profile.weeklyHours} study hours per week</p>
      </div>
      <div className="setting-row"><div><strong>Update learner details</strong><span>Changes sync to your StudySpace account when online.</span></div><button type="button" className="secondary-button" onClick={() => { setDraft(profile); setEditing(true); setError(""); setNotice(""); }}><Pencil size={15}/> Edit profile</button></div>
    </> : <form className="onboarding-fields" onSubmit={event => void save(event)}>
      <div className="profile-editor-photo-edit"><div className="profile-editor-avatar">{avatarPreview ? <img src={avatarPreview} alt="New profile picture preview"/> : avatarUrl && !removeAvatar ? <img src={avatarUrl} alt="Current profile picture"/> : <UserRound size={28}/>}</div><div><strong>Profile picture</strong><small>Optional · PNG, JPG or WebP · up to 2 MB</small><div className="profile-editor-photo-actions"><label className="secondary-button"><ImagePlus size={14}/>{avatarFile ? "Change picture" : "Upload picture"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => chooseAvatar(event.target.files?.[0] || null)}/></label>{(profile.avatarPath || avatarFile) && <button className="text-button" type="button" onClick={() => { setAvatarFile(null); setRemoveAvatar(true); setError(""); }}>Remove picture</button>}</div></div></div>
      <p className="profile-locked-note">Full name and country are protected account details. To correct either one, contact the StudySpace administrator. Date of birth and guardian-verification details are not editable here.</p>
      <div className="onboarding-two-col">
        <label className="field-label">Full name<input readOnly value={draft.fullName} aria-readonly="true"/></label>
        <label className="field-label">Preferred name<input maxLength={80} value={draft.preferredName} onChange={event => update("preferredName", event.target.value)}/></label>
        <label className="field-label">Country<input readOnly value={draft.country} aria-readonly="true"/></label>
        <label className="field-label">School / institution<input maxLength={160} value={draft.institution} onChange={event => update("institution", event.target.value)}/></label>
        <label className="field-label">Education level<select value={draft.level} onChange={event => update("level", event.target.value)}>{LEVELS.map(level => <option key={level}>{level}</option>)}</select></label>
        <label className="field-label">Grade / year<input maxLength={80} value={draft.grade} onChange={event => update("grade", event.target.value)}/></label>
        <label className="field-label">Course / programme<input maxLength={160} value={draft.course} onChange={event => update("course", event.target.value)}/></label>
        <label className="field-label">Curriculum<select value={draft.curriculum} onChange={event => update("curriculum", event.target.value)}>{CURRICULA.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">Academic year<input maxLength={30} value={draft.academicYear} onChange={event => update("academicYear", event.target.value)}/></label>
        <label className="field-label">Number of terms<select value={draft.termCount} onChange={event => update("termCount", event.target.value)}><option value="1">1 academic year</option><option value="2">2 terms / semesters</option><option value="3">3 terms</option><option value="4">4 terms</option><option value="custom">Other / not sure</option></select></label>
      </div>
      <div className="field-label">Subjects / courses <span className="field-optional">YOUR CURRENT SELECTION</span><div className="subject-picker-selected"><div>{draft.subjects.map(name => <button type="button" key={name} onClick={() => update("subjects", draft.subjects.filter(item => item !== name))}>{name}<b>×</b></button>)}</div></div></div>
      <div className="subject-picker-custom"><input maxLength={80} value={customSubject} onChange={event => setCustomSubject(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addSubject(); } }} placeholder="Add a subject or course"/><button type="button" className="secondary-button" onClick={addSubject} disabled={!customSubject.trim()}>Add</button></div>
      <label className="field-label">Main academic goal<select value={draft.goals} onChange={event => update("goals", event.target.value)}><option>Improve my marks</option><option>Prepare for examinations</option><option>Stay organised and meet deadlines</option><option>Build consistent study habits</option><option>Maintain strong academic performance</option></select></label>
      <div className="onboarding-two-col">
        <label className="field-label">Target mark (%)<input type="number" min="0" max="100" value={draft.targetMark} onChange={event => update("targetMark", event.target.value)}/></label>
        <label className="field-label">Study hours per week<input type="number" min="0" max="168" step="0.5" value={draft.weeklyHours} onChange={event => update("weeklyHours", event.target.value)}/></label>
      </div>
      <div className="field-label">Preferred study days <div className="onboarding-days">{DAYS.map(day => <button type="button" key={day} className={draft.preferredDays.includes(day) ? "day-chip day-chip-selected" : "day-chip"} aria-pressed={draft.preferredDays.includes(day)} onClick={() => toggleDay(day)}>{day.slice(0,3)}</button>)}</div></div>
      {error && <p className="inline-message error-message" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={cancel} disabled={saving}><X size={15}/> Cancel</button><button type="submit" className="primary-button" disabled={saving}><Save size={15}/>{saving ? "Saving…" : "Save profile"}</button></div>
    </form>}
    {notice && <p className="inline-message" role="status">{notice}</p>}
    {!supabase && <p className="inline-message error-message" role="alert">Profile editing requires an active StudySpace connection.</p>}
  </section>;
}
