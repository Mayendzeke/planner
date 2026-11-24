/**
 * Deterministic weekly scheduler. Independent from MIΛ and the UI.
 * Inputs must contain normalized free slots after all school/personal busy
 * periods have been subtracted by the trusted scheduling service.
 */
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DIFFICULTY_WEIGHT = { very_high: 5, high: 4, moderate: 3, low: 2, very_low: 1 };
const TYPE_WEIGHT = { calculation: 1.25, practical: 1.2, essay: 1.15, theory: 1, memorisation: 0.95, language: 1, mixed: 1.1 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const numeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const fromMinutes = value => String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");

export function workloadFor(subject) {
  const explicit = DIFFICULTY_WEIGHT[String(subject.difficulty || "").toLowerCase()];
  const performance = numeric(subject.recent_score, NaN);
  const weakness = Number.isFinite(performance) ? clamp((70 - performance) / 20, 0, 2) : 0.5;
  const creditLoad = clamp(numeric(subject.credit_hours, 1) / 3, 0.5, 2.5);
  const typeFactor = TYPE_WEIGHT[String(subject.subject_type || "mixed").toLowerCase()] || 1.1;
  const difficulty = (explicit || clamp(numeric(subject.difficulty_score, 3), 1, 5)) + weakness;
  const weeklyTargetFactor = clamp(numeric(subject.weekly_minutes_target, 60) / 60, 0.5, 4);
  return {
    difficulty,
    workload: difficulty * typeFactor * creditLoad * weeklyTargetFactor,
    estimatedMinutes: clamp(Math.round(15 + difficulty * 5 + creditLoad * 5), 20, 60),
  };
}

function normalizeSlot(slot, index) {
  const day = WEEKDAYS.includes(slot.day) ? slot.day : null;
  const start = String(slot.start || "");
  const end = String(slot.end || "");
  if (!day || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return null;
  if (toMinutes(end) <= toMinutes(start)) return null;
  return {
    ...slot,
    id: String(slot.id || day + "-" + start + "-" + index),
    day,
    start,
    end,
    startMinutes: toMinutes(start),
    endMinutes: toMinutes(end),
    nextMinutes: toMinutes(start),
  };
}

/**
 * @param {{subjects:Array<object>,availableSlots:Array<object>,dailyMinutesLimit?:number,questionCount?:number}} input
 * @returns {{policy:string,assignments:Array<object>,conflicts:Array<object>,dayLoads:Array<object>}}
 */
export function buildBalancedWeeklySchedule(input) {
  const slots = (Array.isArray(input?.availableSlots) ? input.availableSlots : [])
    .map(normalizeSlot).filter(Boolean)
    .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.start.localeCompare(b.start));
  const dailyLimit = clamp(numeric(input?.dailyMinutesLimit, 120), 20, 360);
  const questionCount = clamp(Math.round(numeric(input?.questionCount, 10)), 1, 50);
  const dayLoads = WEEKDAYS.map(day => ({ day, workload: 0, minutes: 0, subjects: [], highDifficultyCount: 0 }));
  const assignments = [];
  const conflicts = [];
  const seen = new Set();

  const ordered = (Array.isArray(input?.subjects) ? input.subjects : [])
    .filter(subject => subject && subject.id != null && subject.name)
    .filter(subject => {
      const key = String(subject.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(subject => ({ subject, profile: workloadFor(subject) }))
    .sort((a, b) => b.profile.workload - a.profile.workload || String(a.subject.name).localeCompare(String(b.subject.name)));

  for (const { subject, profile } of ordered) {
    const candidates = slots.filter(slot => slot.endMinutes - slot.nextMinutes >= profile.estimatedMinutes);
    if (!candidates.length) {
      conflicts.push({ subjectId: subject.id, subjectName: subject.name, reason: "insufficient_available_capacity", requiredMinutes: profile.estimatedMinutes });
      continue;
    }

    const ranked = candidates.map(slot => {
      const day = dayLoads.find(entry => entry.day === slot.day);
      const isHard = profile.difficulty >= 4.5;
      const sameDayHardPenalty = isHard && day.highDifficultyCount > 0 ? 1000 : 0;
      const overloadPenalty = Math.max(0, day.minutes + profile.estimatedMinutes - dailyLimit) * 3;
      const workloadPenalty = day.workload * 12;
      const countPenalty = day.subjects.length * 4;
      const preferencePenalty = numeric(slot.preferencePenalty, 0);
      return { slot, day, score: sameDayHardPenalty + overloadPenalty + workloadPenalty + countPenalty + preferencePenalty };
    }).sort((a, b) => a.score - b.score || WEEKDAYS.indexOf(a.slot.day) - WEEKDAYS.indexOf(b.slot.day) || a.slot.start.localeCompare(b.slot.start));

    const { slot, day } = ranked[0];
    const durationMinutes = profile.estimatedMinutes;
    const start = fromMinutes(slot.nextMinutes);
    const end = fromMinutes(slot.nextMinutes + durationMinutes);
    slot.nextMinutes += durationMinutes;
    day.workload += profile.workload;
    day.minutes += durationMinutes;
    day.subjects.push(String(subject.name));
    if (profile.difficulty >= 4.5) day.highDifficultyCount += 1;

    assignments.push({
      subjectId: subject.id,
      subjectName: String(subject.name),
      day: slot.day,
      slotId: slot.id,
      start,
      end,
      durationMinutes,
      questionCount,
      difficultyScore: Math.round(profile.difficulty * 100) / 100,
      workloadScore: Math.round(profile.workload * 100) / 100,
      subjectType: String(subject.subject_type || "mixed"),
      creditHours: numeric(subject.credit_hours, 0),
      scheduleStatus: day.minutes > dailyLimit ? "capacity_warning" : "scheduled",
    });
  }

  for (const day of dayLoads) {
    if (day.minutes > dailyLimit) conflicts.push({ reason: "daily_workload_limit_exceeded", day: day.day, requiredMinutes: day.minutes, limitMinutes: dailyLimit });
  }

  return {
    policy: "balanced",
    assignments: assignments.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.start.localeCompare(b.start)),
    conflicts,
    dayLoads,
  };
}
export { WEEKDAYS };
