import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type LabArea = "maths" | "physics" | "chemistry" | "biology";
export type LabWorkRow = {
  learner_id: string;
  lab_area: LabArea;
  activity_key: string;
  title: string;
  live_state: Record<string, unknown>;
  result: Record<string, unknown>;
  status: "in_progress" | "completed" | "submitted";
  last_accessed_at: string;
  reviewed_at?: string | null;
  score?: number | null;
  feedback?: string;
  updated_at: string;
};
export type LabAssignment = {
  id: string;
  learner_id: string;
  lab_area: LabArea;
  activity_key: string;
  title: string;
  instructions: string;
  due_at: string | null;
  required: boolean;
  status: "assigned" | "in_progress" | "submitted" | "reviewed" | "cancelled";
  created_at: string;
  updated_at: string;
};
export type LabControl = { lab_area: LabArea; enabled: boolean; student_message: string };

function cacheKey(userId: string, area: LabArea) {
  return "studyspace:lab-work:" + userId + ":" + area;
}
function readCache(userId: string, area: LabArea): LabWorkRow[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey(userId, area)) || "[]");
    return Array.isArray(parsed) ? parsed as LabWorkRow[] : [];
  } catch { return []; }
}
function writeCache(userId: string, area: LabArea, rows: LabWorkRow[]) {
  try { localStorage.setItem(cacheKey(userId, area), JSON.stringify(rows)); } catch { /* Keep the in-memory work available. */ }
}

export function useLabWorkspace(area: LabArea) {
  const [workRows, setWorkRows] = useState<LabWorkRow[]>([]);
  const [assignments, setAssignments] = useState<LabAssignment[]>([]);
  const [control, setControl] = useState<LabControl>({ lab_area: area, enabled: true, student_message: "" });
  const [loaded, setLoaded] = useState(false);
  const [syncState, setSyncState] = useState<"loading" | "synced" | "offline" | "error">("loading");
  const [learnerId, setLearnerId] = useState("");

  useEffect(() => {
    let active = true;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    const load = async () => {
      if (!supabase) {
        if (active) { setLoaded(true); setSyncState("offline"); }
        return;
      }
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Sign in to sync lab work.");
        const userId = auth.user.id;
        if (!active) return;
        setLearnerId(userId);
        const cached = readCache(userId, area);
        setWorkRows(cached);
        const [workResult, assignmentResult, controlResult] = await Promise.all([
          supabase.from("student_lab_work").select("*").eq("learner_id", userId).eq("lab_area", area),
          supabase.from("lab_assignments").select("*").eq("learner_id", userId).eq("lab_area", area).neq("status", "cancelled").order("created_at", { ascending: false }),
          supabase.from("lab_controls").select("lab_area,enabled,student_message").eq("lab_area", area).maybeSingle(),
        ]);
        if (workResult.error) throw workResult.error;
        if (assignmentResult.error) throw assignmentResult.error;
        if (!active) return;
        const remoteRows = (workResult.data || []) as LabWorkRow[];
        const byKey = new Map<string, LabWorkRow>();
        for (const row of cached) byKey.set(row.activity_key, row);
        for (const row of remoteRows) {
          const local = byKey.get(row.activity_key);
          if (!local || Date.parse(row.updated_at) >= Date.parse(local.updated_at || "")) byKey.set(row.activity_key, row);
        }
        const merged = Array.from(byKey.values());
        setWorkRows(merged);
        writeCache(userId, area, merged);
        setAssignments((assignmentResult.data || []) as LabAssignment[]);
        if (controlResult.data) setControl(controlResult.data as LabControl);
        setSyncState("synced");
        setLoaded(true);

        channel = supabase.channel("student-lab-" + userId + "-" + area)
          .on("postgres_changes", { event: "*", schema: "public", table: "student_lab_work", filter: "learner_id=eq." + userId }, payload => {
            const next = (payload.new || payload.old) as LabWorkRow | undefined;
            if (!next || next.lab_area !== area) return;
            setWorkRows(current => {
              const updated = current.filter(item => item.activity_key !== next.activity_key);
              if (payload.eventType !== "DELETE") updated.push(next);
              writeCache(userId, area, updated);
              return updated;
            });
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "lab_assignments", filter: "learner_id=eq." + userId }, () => {
            void supabase!.from("lab_assignments").select("*").eq("learner_id", userId).eq("lab_area", area).neq("status", "cancelled")
              .order("created_at", { ascending: false }).then(({ data }) => { if (active) setAssignments((data || []) as LabAssignment[]); });
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "lab_controls", filter: "lab_area=eq." + area }, payload => {
            if (payload.new && active) setControl(payload.new as LabControl);
          })
          .subscribe();
      } catch {
        if (active) {
          setSyncState("offline");
          setLoaded(true);
        }
      }
    };
    void load();
    return () => {
      active = false;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [area]);

  const saveWork = useCallback(async (
    activityKey: string,
    title: string,
    liveState: Record<string, unknown>,
    result: Record<string, unknown>,
    status: LabWorkRow["status"] = "in_progress",
  ) => {
    const updatedAt = new Date().toISOString();
    const existing = workRows.find(item => item.activity_key === activityKey);
    const effectiveStatus = status === "in_progress" && existing?.status === "submitted" ? "submitted" : status;
    const row: LabWorkRow = {
      learner_id: learnerId,
      lab_area: area,
      activity_key: activityKey,
      title,
      live_state: liveState,
      result,
      status: effectiveStatus,
      last_accessed_at: updatedAt,
      updated_at: updatedAt,
    };
    if (learnerId) {
      setWorkRows(current => {
        const next = [...current.filter(item => item.activity_key !== activityKey), row];
        writeCache(learnerId, area, next);
        return next;
      });
    }
    if (!supabase || !learnerId || !navigator.onLine) {
      setSyncState("offline");
      return false;
    }
    const { error } = await supabase.from("student_lab_work").upsert(row, {
      onConflict: "learner_id,lab_area,activity_key",
    });
    if (error) {
      setSyncState("offline");
      return false;
    }
    setSyncState("synced");
    return true;
  }, [area, learnerId, workRows]);

  const submitWork = useCallback(async (activityKey: string) => {
    const existing = workRows.find(item => item.activity_key === activityKey);
    if (!existing) return false;
    return saveWork(activityKey, existing.title, existing.live_state, existing.result, "submitted");
  }, [saveWork, workRows]);

  return { workRows, assignments, control, loaded, syncState, saveWork, submitWork };
}
