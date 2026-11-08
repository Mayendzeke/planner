import { useEffect, useState } from "react";
import { BellRing, Bell, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { showStudyspaceNotification } from "../lib/studyspaceNotifications";

export default function StudentAssignmentNotifications({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!supabase || !userId || !("Notification" in window)) return;
    const channel = supabase.channel("student-assignment-alerts-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "exercise_assignments",
        filter: "learner_id=eq." + userId,
      }, payload => {
        const assignment = payload.new as { id?: string; due_at?: string | null; assigned_at?: string };
        const body = assignment.due_at
          ? "Your teacher has set new work. Due " + new Date(assignment.due_at).toLocaleString() + "."
          : "Your teacher has assigned new work. Open Study & Exams to review it.";
        void showStudyspaceNotification(
          userId,
          "homework_assignments",
          "New StudySpace homework",
          body,
          assignment.id ? "studyspace-assignment-" + assignment.id : "studyspace-new-assignment",
          import.meta.env.BASE_URL + "favicon.svg",
        );
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [userId]);

  return null;
}

export function HomeworkAlertSettings() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : "denied"
  );
  const [busy, setBusy] = useState(false);

  async function enable() {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } finally {
      setBusy(false);
    }
  }

  return <section className="glass-panel settings-card homework-alert-settings">
    <div className="section-heading"><div><h2>Homework notifications</h2><p>Receive a phone or browser notification when a teacher assigns new homework.</p></div><BellRing size={20}/></div>
    <div className="setting-row">
      <div><strong>{permission === "granted" ? "Notifications allowed" : permission === "denied" ? "Notifications blocked" : "Enable homework alerts"}</strong><span>{permission === "granted" ? "Alerts are delivered while StudySpace is open and connected to the internet." : permission === "denied" ? "Allow notifications for StudySpace in your browser or phone app settings." : "Permission is requested only when you press Enable."}</span></div>
      {permission === "default" && <button type="button" className="primary-button" onClick={() => void enable()} disabled={busy}><Bell size={15}/>{busy ? "Requesting…" : "Enable alerts"}</button>}
      {permission === "granted" && <span className="connection-pill"><i/> Enabled</span>}
      {permission === "denied" && <span className="connection-pill"><i/> Blocked</span>}
    </div>
    <div className="reminder-note"><ShieldCheck size={15}/><span>Notifications use the device permission you control. Homework alerts require an active internet connection and StudySpace running in the browser or installed app. Delivery while the app is fully closed needs a separate background push service.</span></div>
  </section>;
}
