import { useEffect } from "react";
import { supabase } from "../lib/supabase";

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
        if (Notification.permission !== "granted") return;
        const body = assignment.due_at
          ? "Your teacher has set new work. Due " + new Date(assignment.due_at).toLocaleString() + "."
          : "Your teacher has assigned new work. Open Study & Exams to review it.";
        const notify = () => {
          const notification = new Notification("New StudySpace homework", {
            body,
            icon: "/planner/favicon.svg",
            tag: assignment.id ? "studyspace-assignment-" + assignment.id : "studyspace-new-assignment",
          });
          notification.onclick = () => {
            window.focus();
            window.dispatchEvent(new CustomEvent("studyspace-open-assigned-work"));
            notification.close();
          };
        };
        notify();
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [userId]);

  return null;
}
