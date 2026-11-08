import { useEffect, useState } from "react";
import { studentStorageKey } from "../lib/studentStorage";
import { showStudyspaceNotification } from "../lib/studyspaceNotifications";
import { Bell, BellRing, Clock3, ShieldCheck } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type ReminderSettings = { enabled: boolean; time: string; days: string[] };
const STORAGE_KEY = "studyspace-study-reminders";
const defaultSettings: ReminderSettings = { enabled: false, time: "16:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] };

function readSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(studentStorageKey(STORAGE_KEY));
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as ReminderSettings;
    if (typeof parsed.enabled !== "boolean" || typeof parsed.time !== "string" || !Array.isArray(parsed.days)) return defaultSettings;
    return { enabled: parsed.enabled, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.time) ? parsed.time : "16:00", days: parsed.days.filter(day => DAYS.includes(day)) };
  } catch { return defaultSettings; }
}

export default function StudyReminders({ preferredDays = [], showSettings = true, userId }: { preferredDays?: string[]; showSettings?: boolean; userId: string | null }) {
  const [settings, setSettings] = useState<ReminderSettings>(() => {
    const saved = readSettings();
    let hasSavedSettings = false;
    try { hasSavedSettings = localStorage.getItem(studentStorageKey(STORAGE_KEY)) !== null; } catch { /* Use device-independent defaults. */ }
    return hasSavedSettings ? saved : { ...defaultSettings, days: preferredDays.length ? preferredDays.filter(day => DAYS.includes(day)) : defaultSettings.days };
  });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hydrate = () => setSettings(readSettings());
    window.addEventListener("studyspace-cloud-preferences-updated", hydrate);
    return () => window.removeEventListener("studyspace-cloud-preferences-updated", hydrate);
  }, []);

  useEffect(() => {
    const refreshPermission = () => {
      setPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
    };
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);
    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, []);

  const remindersActive = settings.enabled && permission === "granted";

  useEffect(() => {
    if (!settings.enabled || permission !== "granted") return;
    const check = async () => {
      const now = new Date();
      const day = DAYS[(now.getDay() + 6) % 7];
      const [hour, minute] = settings.time.split(":").map(Number);
      const target = new Date(now);
      target.setHours(hour, minute, 0, 0);
      const delta = now.getTime() - target.getTime();
      if (!settings.days.includes(day) || delta < 0 || delta > 5 * 60 * 1000) return;
      const key = "studyspace-reminder-fired-" + now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
      const storageKey = studentStorageKey(key);
      try {
        if (localStorage.getItem(storageKey) === settings.time) return;
        if (!userId) return;
        await showStudyspaceNotification(
          userId,
          "study_reminders",
          "Your StudySpace session is ready",
          "It's your planned study time. Open your study space and take one small step.",
          "studyspace-daily-study",
          import.meta.env.BASE_URL + "favicon.svg",
        );
        localStorage.setItem(storageKey, settings.time);
      } catch {
        setMessage("The browser could not deliver this reminder. Check this site's notification permission and keep Studyspace open around your selected study time.");
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 20_000);
    return () => window.clearInterval(timer);
  }, [settings, permission, userId]);

  function update(next: ReminderSettings) {
    setSettings(next);
    try { localStorage.setItem(studentStorageKey(STORAGE_KEY), JSON.stringify(next)); localStorage.setItem(studentStorageKey(STORAGE_KEY + "-updated-at"), new Date().toISOString()); } catch { setMessage("Your browser could not save reminder preferences."); }
  }

  async function enableReminders() {
    if (permission === "unsupported") { setMessage("This browser does not support desktop notifications. Try a current version of Chrome, Edge or Firefox."); return; }
    try {
      let result = permission;
      if (permission === "default") result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        update({ ...settings, enabled: true });
        setMessage("Notifications are enabled. Keep Studyspace open around your selected study time.");
      } else if (result === "denied") {
        setMessage("Notifications are blocked in browser settings. Allow notifications for this site, then try again.");
      } else {
        setMessage("Notification permission was not granted.");
      }
    } catch {
      setMessage("The browser could not request notification permission. Check this site's browser permissions.");
    }
  }

  function toggleDay(day: string) {
    const days = settings.days.includes(day) ? settings.days.filter(item => item !== day) : [...settings.days, day];
    if (!days.length) {
      setMessage("Choose at least one study day, or turn reminders off.");
      return;
    }
    update({ ...settings, days });
    setMessage("");
  }

  if (!showSettings) return null;

  return <section className="glass-panel settings-card reminder-settings">
    <div className="section-heading"><div><h2>Study reminders</h2><p>Choose when Studyspace should nudge you to begin a study session.</p></div><BellRing size={20}/></div>
    <div className="setting-row"><div><strong>Daily reminder</strong><span>{remindersActive ? "Your selected study days are active on this device." : permission === "denied" ? "Notifications are blocked by this browser. Allow them for Studyspace to use reminders." : "Turn on a browser notification for your planned study time."}</span></div><button className={remindersActive ? "secondary-button reminder-enabled" : "primary-button"} onClick={() => remindersActive ? update({ ...settings, enabled: false }) : void enableReminders()}>{remindersActive ? <><Bell size={15}/> Turn off</> : <><BellRing size={15}/> Enable reminders</>}</button></div>
    <div className="setting-row"><div><strong>Reminder time</strong><span>Uses your device's local time.</span></div><label className="goal-input"><Clock3 size={15}/><input type="time" value={settings.time} onChange={e => update({ ...settings, time: e.target.value })}/></label></div>
    <div className="reminder-days"><strong>Study days</strong><div>{DAYS.map(day => <button type="button" key={day} className={settings.days.includes(day) ? "day-chip day-chip-selected" : "day-chip"} aria-pressed={settings.days.includes(day)} onClick={() => toggleDay(day)}>{day.slice(0, 3)}</button>)}</div></div>
    {message && <p className="inline-message" role="status">{message}</p>}
    <div className="reminder-note"><ShieldCheck size={15}/><span>Privacy-first: reminders are scheduled locally in this browser. The app must be open for the reminder check to run. Reliable reminders while the app is closed, SMS and cross-device notifications will require the secure backend and push-notification service.</span></div>
    {permission === "denied" && <p className="reminder-blocked">Notifications are currently blocked for this site in your browser settings.</p>}
  </section>;
}
