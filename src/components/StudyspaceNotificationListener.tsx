import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { showStudyspaceNotification } from "../lib/studyspaceNotifications";

type DirectMessageEvent = { id?: string; sender_id?: string; body?: string; attachment_name?: string };
type GroupMessageEvent = { id?: string; sender_id?: string; body?: string; attachment_name?: string };
type GroupInviteEvent = { id?: string; group_id?: string };

export default function StudyspaceNotificationListener() {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) setUserId(data.user?.id || "");
    });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || "");
    });
    return () => {
      live = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase.channel("studyspace-notifications-" + userId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: "recipient_id=eq." + userId,
      }, payload => {
        const row = payload.new as DirectMessageEvent;
        if (!row.id || row.sender_id === userId) return;
        void showStudyspaceNotification(
          userId, "direct_messages", "New private message",
          row.body?.trim() || (row.attachment_name ? "Attachment: " + row.attachment_name : "Open your inbox to view the message."),
          "studyspace-direct-" + row.id,
          import.meta.env.BASE_URL + "favicon.svg",
        );
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "studyspace_group_messages",
      }, payload => {
        const row = payload.new as GroupMessageEvent;
        if (!row.id || row.sender_id === userId) return;
        void showStudyspaceNotification(
          userId, "group_messages", "New group message",
          row.body?.trim() || (row.attachment_name ? "Attachment: " + row.attachment_name : "Open your study groups to view the message."),
          "studyspace-group-" + row.id,
          import.meta.env.BASE_URL + "favicon.svg",
        );
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "exercise_attempts",
        filter: "learner_id=eq." + userId,
      }, payload => {
        const row = payload.new as { id?: string; marked_at?: string | null };
        if (!row.id || !row.marked_at) return;
        void showStudyspaceNotification(
          userId, "assessment_updates", "Assessment result available",
          "Your teacher has marked an assessment. Open Study & Exams to review your result.",
          "studyspace-result-" + row.id,
          import.meta.env.BASE_URL + "favicon.svg",
        );
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "student_timetable_entries",
        filter: "learner_id=eq." + userId,
      }, payload => {
        const row = payload.new as { id?: string; title?: string; subject_name?: string };
        if (!row.id) return;
        void showStudyspaceNotification(
          userId, "timetable_updates", "Timetable updated",
          [row.title, row.subject_name].filter(Boolean).join(" · ") || "A new class has been added to your timetable.",
          "studyspace-timetable-" + row.id,
          import.meta.env.BASE_URL + "favicon.svg",
        );
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "studyspace_group_invites",
        filter: "invitee_id=eq." + userId,
      }, payload => {
        const row = payload.new as GroupInviteEvent;
        if (!row.id) return;
        void showStudyspaceNotification(
          userId, "group_activity", "Study group invitation",
          "You have been invited to join a StudySpace group.",
          "studyspace-group-invite-" + row.id,
          import.meta.env.BASE_URL + "favicon.svg",
          row.group_id,
        );
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "studyspace_group_members",
        filter: "learner_id=eq." + userId,
      }, payload => {
        const row = payload.new as { group_id?: string; membership_source?: string };
        if (!row.group_id || !["auto_match", "class_auto"].includes(row.membership_source || "")) return;
        void showStudyspaceNotification(
          userId, "group_activity", "You've joined a study group",
          "A group has been added because your StudySpace profile matches its class or subject.",
          "studyspace-group-joined-" + row.group_id,
          import.meta.env.BASE_URL + "favicon.svg",
          row.group_id,
        );
      })
      .subscribe();

    return () => { void supabase?.removeChannel(channel); };
  }, [userId]);

  return null;
}
