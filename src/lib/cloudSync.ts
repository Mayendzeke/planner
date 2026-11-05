import type { StudentProfile } from "../components/StudentOnboarding";
import {
  getPlannerDatabaseForUser,
  readCloudTombstones,
  clearCloudTombstones,
  withCloudSyncPaused,
  type CloudSyncEntity,
  type Subject,
  type PlannerTask,
  type StudySession,
  type AcademicPeriod,
  type CalendarEvent,
  type StudentResource,
} from "../data/db";
import { getStudentStorageOwner, studentStorageKeyForUser } from "./studentStorage";
import { supabase } from "./supabase";

type CloudRow = Record<string, any>;
type LocalCloudRow = {
  id: number;
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};

export type StudentSyncResult = {
  syncedAt: string;
  weeklyHours?: number;
  downloaded: number;
  uploaded: number;
  deleted: number;
  reminderSettings?: Record<string, unknown>;
};

const remoteTableFor: Record<CloudSyncEntity, string> = {
  subjects: "student_subjects",
  tasks: "planner_tasks",
  sessions: "study_sessions",
  academicPeriods: "academic_periods",
  events: "academic_events",
  resources: "learner_personal_resources",
};

function timestamp(value?: string | null): number {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function makeLocalId(existing: number[]): number {
  let value = Date.now();
  const used = new Set(existing);
  while (used.has(value)) value += 1;
  return value;
}

function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
    + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function fromLocalDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeFileName(value: string): string {
  const result = value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return result || "studyspace-file";
}

async function fetchRows(table: string, userId: string): Promise<CloudRow[]> {
  if (!supabase) throw new Error("Studyspace cloud services are not configured.");
  const { data, error } = await supabase.from(table).select("*").eq("learner_id", userId);
  if (error) throw new Error("Could not read " + table.replaceAll("_", " ") + ": " + error.message);
  return (data ?? []) as CloudRow[];
}

async function removeCloudRecord(entity: CloudSyncEntity, cloudId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error("Studyspace cloud services are not configured.");
  const remoteTable = remoteTableFor[entity];
  if (entity === "resources") {
    const { data, error: readError } = await supabase.from(remoteTable)
      .select("storage_path").eq("id", cloudId).eq("learner_id", userId).maybeSingle();
    if (readError) throw readError;
    if (data?.storage_path) {
      const { error: storageError } = await supabase.storage.from("studyspace-resources").remove([data.storage_path]);
      if (storageError) throw storageError;
    }
  }
  const { error } = await supabase.from(remoteTable).delete().eq("id", cloudId).eq("learner_id", userId);
  if (error) throw new Error("Could not delete a cloud " + entity + " record: " + error.message);
}

async function reconcileCollection<T extends LocalCloudRow>(
  entity: CloudSyncEntity,
  table: any,
  remoteRows: CloudRow[],
  userId: string,
  toCloud: (local: T, subjects: Subject[]) => CloudRow,
  fromCloud: (remote: CloudRow, localId: number, subjects: Subject[]) => T,
  subjects: Subject[],
  matchRemote?: (local: T, rows: CloudRow[]) => CloudRow | undefined,
): Promise<{ downloaded: number; uploaded: number }> {
  if (!supabase) throw new Error("Studyspace cloud services are not configured.");
  const pause = <T,>(work: () => Promise<T>) => withCloudSyncPaused(work, userId);
  let localRows = (await table.toArray()) as T[];
  const existingIds = localRows.map(row => row.id);
  for (const row of localRows) {
    if (!row.cloudId || !row.localUpdatedAt) {
      await pause(() => table.update(row.id, {
        cloudId: row.cloudId || crypto.randomUUID(),
        localUpdatedAt: row.localUpdatedAt || new Date().toISOString(),
      }));
    }
  }
  localRows = (await table.toArray()) as T[];

  const remoteById = new Map(remoteRows.map(row => [String(row.id), row]));
  const handledRemote = new Set<string>();
  let downloaded = 0;
  let uploaded = 0;

  const writeLocal = async (remote: CloudRow, localId: number) => {
    const stamp = String(remote.updated_at || remote.created_at || new Date().toISOString());
    const record = fromCloud(remote, localId, subjects);
    await pause(() => table.put({
      ...record,
      cloudId: String(remote.id),
      localUpdatedAt: stamp,
      cloudUpdatedAt: stamp,
    }));
    downloaded += 1;
  };

  const pushLocal = async (local: T) => {
    const payload = toCloud(local, subjects);
    const { data, error } = await supabase!.from(remoteTableFor[entity])
      .upsert(payload, { onConflict: "id" }).select("*").single();
    if (error) throw new Error("Could not upload " + entity + " to Studyspace: " + error.message);
    const stamp = String(data.updated_at || data.created_at || local.localUpdatedAt || new Date().toISOString());
    await pause(() => table.update(local.id, {
      cloudId: String(data.id),
      localUpdatedAt: stamp,
      cloudUpdatedAt: stamp,
    }));
    handledRemote.add(String(data.id));
    uploaded += 1;
  };

  for (const local of localRows) {
    let remote = local.cloudId ? remoteById.get(local.cloudId) : undefined;
    if (!remote && matchRemote) remote = matchRemote(local, remoteRows);
    if (!remote) {
      await pushLocal(local);
      continue;
    }
    handledRemote.add(String(remote.id));
    if (local.cloudId !== String(remote.id)) {
      await pause(() => table.update(local.id, {
        cloudId: String(remote.id),
        cloudUpdatedAt: String(remote.updated_at || remote.created_at || ""),
      }));
    }
    if (timestamp(local.localUpdatedAt) > timestamp(remote.updated_at)) {
      await pushLocal({ ...local, cloudId: String(remote.id) });
    } else {
      await writeLocal(remote, local.id);
    }
  }

  for (const remote of remoteRows) {
    if (handledRemote.has(String(remote.id))) continue;
    const localId = makeLocalId(existingIds);
    existingIds.push(localId);
    await writeLocal(remote, localId);
  }
  return { downloaded, uploaded };
}

async function syncPersonalResources(db: ReturnType<typeof getPlannerDatabaseForUser>, userId: string, remoteRows: CloudRow[], subjects: Subject[]): Promise<{ downloaded: number; uploaded: number }> {
  if (!supabase) throw new Error("Studyspace cloud services are not configured.");
  const pause = <T,>(work: () => Promise<T>) => withCloudSyncPaused(work, userId);
  const table = db.resources;
  let localRows = await table.toArray();
  const localIds = localRows.map(row => row.id);
  for (const row of localRows) {
    if (!row.cloudId || !row.localUpdatedAt) {
      await pause(() => table.update(row.id, {
        cloudId: row.cloudId || crypto.randomUUID(),
        localUpdatedAt: row.localUpdatedAt || new Date().toISOString(),
      }));
    }
  }
  localRows = await table.toArray();
  const remoteById = new Map(remoteRows.map(row => [String(row.id), row]));
  const handled = new Set<string>();
  let downloaded = 0;
  let uploaded = 0;

  const persistRemote = async (remote: CloudRow, localId: number, existing?: StudentResource) => {
    if (!existing) {
      const { data, error } = await supabase!.storage.from("studyspace-resources").download(remote.storage_path);
      if (error) throw new Error("Could not download your cloud file " + remote.title + ": " + error.message);
      const resource: StudentResource = {
        id: localId,
        cloudId: String(remote.id),
        localUpdatedAt: String(remote.updated_at || remote.created_at),
        cloudUpdatedAt: String(remote.updated_at || remote.created_at),
        name: remote.title,
        mimeType: remote.mime_type,
        size: Number(remote.file_size),
        file: data,
        createdAt: String(remote.created_at),
        resourceType: remote.resource_type === "Revision notes" ? "Revision notes" : "Study notes",
        topic: remote.topic || "",
        subjectId: subjects.find(subject => subject.name.toLocaleLowerCase() === String(remote.subject_name || "").toLocaleLowerCase())?.id,
      };
      await pause(() => table.put(resource));
      downloaded += 1;
    } else {
      const remoteStamp = String(remote.updated_at || remote.created_at);
      const needsFileRefresh = timestamp(remoteStamp) > timestamp(existing.cloudUpdatedAt || existing.localUpdatedAt);
      let filePatch: Partial<StudentResource> = {};
      if (needsFileRefresh) {
        const { data, error } = await supabase!.storage.from("studyspace-resources").download(remote.storage_path);
        if (error) throw new Error("Could not refresh your cloud file " + remote.title + ": " + error.message);
        filePatch = { file: data };
      }
      await pause(() => table.update(existing.id, {
        ...filePatch,
        name: remote.title,
        mimeType: remote.mime_type,
        size: Number(remote.file_size),
        createdAt: String(remote.created_at),
        topic: remote.topic || "",
        subjectId: subjects.find(subject => subject.name.toLocaleLowerCase() === String(remote.subject_name || "").toLocaleLowerCase())?.id,
        resourceType: remote.resource_type === "Revision notes" ? "Revision notes" : "Study notes",
        cloudId: String(remote.id),
        localUpdatedAt: remoteStamp,
        cloudUpdatedAt: remoteStamp,
      }));
      downloaded += 1;
    }
  };

  for (const local of localRows) {
    let remote = local.cloudId ? remoteById.get(local.cloudId) : undefined;
    if (remote) {
      handled.add(String(remote.id));
      if (timestamp(local.localUpdatedAt) > timestamp(remote.updated_at)) {
        const path = remote.storage_path || userId + "/personal/" + local.cloudId + "/" + safeFileName(local.name);
        const { error: uploadError } = await supabase.storage.from("studyspace-resources").upload(path, local.file, {
          contentType: local.mimeType || "application/octet-stream",
          upsert: true,
        });
        if (uploadError) throw new Error("Could not update personal file " + local.name + ": " + uploadError.message);
        const { data, error } = await supabase.from("learner_personal_resources").upsert({
          id: local.cloudId,
          learner_id: userId,
          title: local.name,
          subject_name: local.subjectId == null ? "" : (subjects.find(subject => subject.id === local.subjectId)?.name || ""),
          topic: local.topic || "",
          resource_type: local.resourceType || "Personal",
          description: "",
          storage_path: path,
          mime_type: local.mimeType || "application/octet-stream",
          file_size: local.size,
          created_at: local.createdAt,
          updated_at: local.localUpdatedAt,
        }, { onConflict: "id" }).select("*").single();
        if (error) throw new Error("Could not save personal file details: " + error.message);
        const stamp = String(data.updated_at || data.created_at);
        await pause(() => table.update(local.id, { cloudUpdatedAt: stamp, localUpdatedAt: stamp }));
        uploaded += 1;
      } else {
        await persistRemote(remote, local.id, local);
      }
      continue;
    }

    const cloudId = local.cloudId || crypto.randomUUID();
    const path = userId + "/personal/" + cloudId + "/" + safeFileName(local.name);
    const { error: uploadError } = await supabase.storage.from("studyspace-resources").upload(path, local.file, {
      contentType: local.mimeType || "application/octet-stream",
      upsert: true,
    });
    if (uploadError) throw new Error("Could not upload personal file " + local.name + ": " + uploadError.message);
    const { data, error } = await supabase.from("learner_personal_resources").upsert({
      id: cloudId,
      learner_id: userId,
      title: local.name,
      subject_name: local.subjectId == null ? "" : (subjects.find(subject => subject.id === local.subjectId)?.name || ""),
      topic: local.topic || "",
      resource_type: local.resourceType || "Personal",
      description: "",
      storage_path: path,
      mime_type: local.mimeType || "application/octet-stream",
      file_size: local.size,
      created_at: local.createdAt,
      updated_at: local.localUpdatedAt || new Date().toISOString(),
    }, { onConflict: "id" }).select("*").single();
    if (error) throw new Error("Could not save personal file details: " + error.message);
    const stamp = String(data.updated_at || data.created_at);
    await pause(() => table.update(local.id, {
      cloudId,
      cloudUpdatedAt: stamp,
      localUpdatedAt: stamp,
    }));
    handled.add(cloudId);
    uploaded += 1;
  }

  for (const remote of remoteRows) {
    if (handled.has(String(remote.id))) continue;
    const localId = makeLocalId(localIds);
    localIds.push(localId);
    await persistRemote(remote, localId);
  }
  return { downloaded, uploaded };
}

async function syncPracticeProgress(userId:string, subjects:Subject[]):Promise<{downloaded:number;uploaded:number}> {
  if(!supabase) throw new Error("Studyspace cloud services are not configured.");
  const {data:remote,error}=await supabase.from("progress_events")
    .select("id,event_type,score,max_score,metadata,created_at")
    .eq("learner_id",userId).in("event_type",["weekly_test_attempt","flashcard_state"]);
  if(error) throw new Error("Could not synchronise revision history: "+error.message);
  const rows=remote||[];
  let downloaded=0, uploaded=0;

  const attemptsKey=studentStorageKeyForUser(userId,"studyspace-weekly-test-attempts");
  let attempts:any[]=[];
  try { const parsed=JSON.parse(localStorage.getItem(attemptsKey)||"[]"); if(Array.isArray(parsed)) attempts=parsed; } catch {}
  const remoteAttempts=rows.filter(row=>row.event_type==="weekly_test_attempt");
  const knownAttemptIds=new Set(remoteAttempts.map(row=>String(row.metadata?.local_event_id||"")).filter(Boolean));
  const localIds=new Set(attempts.map(item=>String(item.id)));
  for(const item of attempts){
    const id=String(item?.id||"");
    if(!id||knownAttemptIds.has(id)) continue;
    const linked=subjects.find(subject=>subject.name.toLocaleLowerCase()===String(item.subject||"").toLocaleLowerCase());
    const {error:insertError}=await supabase.from("progress_events").insert({
      learner_id:userId,subject_id:linked?.cloudId||null,event_type:"weekly_test_attempt",
      score:Number(item.score)||0,max_score:Number(item.total)||1,
      metadata:{local_event_id:id,subject:String(item.subject||"General"),mode:String(item.mode||"Weekly test"),completed_at:String(item.completedAt||new Date().toISOString())}
    });
    if(insertError) throw new Error("Could not upload a study result: "+insertError.message);
    uploaded++;
  }
  const merged=[...attempts];
  for(const row of remoteAttempts){
    const meta=row.metadata||{}, id=String(meta.local_event_id||row.id);
    if(localIds.has(id)) continue;
    merged.unshift({id,subject:String(meta.subject||"General"),mode:String(meta.mode||"Weekly test"),score:Number(row.score||0),total:Number(row.max_score||0),completedAt:String(meta.completed_at||row.created_at)});
    localIds.add(id); downloaded++;
  }
  if(merged.length!==attempts.length || merged.some((item,index)=>item.id!==attempts[index]?.id)){
    localStorage.setItem(attemptsKey,JSON.stringify(merged.slice(0,100)));
  }

  const remoteStates=new Map(rows.filter(row=>row.event_type==="flashcard_state").map(row=>[String(row.metadata?.local_event_id||""),row]));
  for(const subject of subjects){
    if(!subject.cloudId) continue;
    const knownKey=studentStorageKeyForUser(userId,"studyspace-known-cards-"+subject.id);
    const reviewKey=studentStorageKeyForUser(userId,"studyspace-review-cards-"+subject.id);
    const hasLocal=localStorage.getItem(knownKey)!==null || localStorage.getItem(reviewKey)!==null;
    let known:string[]=[], review:string[]=[];
    try { const v=JSON.parse(localStorage.getItem(knownKey)||"[]"); if(Array.isArray(v)) known=v.filter((x:unknown)=>typeof x==="string"); } catch {}
    try { const v=JSON.parse(localStorage.getItem(reviewKey)||"[]"); if(Array.isArray(v)) review=v.filter((x:unknown)=>typeof x==="string"); } catch {}
    const key="flashcard-state:"+subject.cloudId, cloud=remoteStates.get(key) as any;
    if(!hasLocal && cloud){
      localStorage.setItem(knownKey,JSON.stringify(Array.isArray(cloud.metadata?.known_cards)?cloud.metadata.known_cards:[]));
      localStorage.setItem(reviewKey,JSON.stringify(Array.isArray(cloud.metadata?.review_cards)?cloud.metadata.review_cards:[]));
      downloaded++;
    } else if(hasLocal){
      const metadata={local_event_id:key,subject_name:subject.name,known_cards:known,review_cards:review};
      const same=cloud && JSON.stringify(cloud.metadata?.known_cards||[])===JSON.stringify(known) && JSON.stringify(cloud.metadata?.review_cards||[])===JSON.stringify(review);
      if(!same){
        const result=cloud
          ? await supabase.from("progress_events").update({metadata}).eq("id",cloud.id)
          : await supabase.from("progress_events").insert({learner_id:userId,subject_id:subject.cloudId,event_type:"flashcard_state",metadata});
        if(result.error) throw new Error("Could not upload flashcard progress: "+result.error.message);
        uploaded++;
      }
    }
  }
  if(downloaded>0) window.dispatchEvent(new Event("studyspace-cloud-practice-updated"));
  return {downloaded,uploaded};
}

export async function syncStudentWorkspace(
  userId: string,
  profile: StudentProfile,
  weeklyHours: number,
): Promise<StudentSyncResult> {
  if (!supabase) throw new Error("Studyspace cloud services are not configured.");
  if (!navigator.onLine) throw new Error("You are offline. Your changes are saved on this device and will sync when you reconnect.");
  if (getStudentStorageOwner() !== userId) throw new Error("The active local workspace does not match the signed-in student.");
  const db = getPlannerDatabaseForUser(userId);

  const { data: authState, error: authError } = await supabase.auth.getUser();
  if (authError || authState.user?.id !== userId) throw new Error("Your Studyspace session needs to be refreshed before syncing.");

  const deletionQueue = readCloudTombstones(userId);
  const completedDeletes: typeof deletionQueue = [];
  let deleted = 0;
  for (const item of deletionQueue) {
    const { error: ledgerError } = await supabase.from("student_sync_deletions").upsert({
      learner_id: userId, entity: item.entity, cloud_id: item.cloudId,
    }, { onConflict: "learner_id,entity,cloud_id", ignoreDuplicates: true });
    if (ledgerError) throw new Error("Could not record an offline deletion for other devices: " + ledgerError.message);
    await removeCloudRecord(item.entity, item.cloudId, userId);
    completedDeletes.push(item);
    deleted += 1;
  }
  clearCloudTombstones(completedDeletes,userId);

  const { data: serverTombstones, error: tombstoneReadError } = await supabase.from("student_sync_deletions")
    .select("entity,cloud_id").eq("learner_id", userId);
  if (tombstoneReadError) throw new Error("Could not retrieve cross-device deletion records: " + tombstoneReadError.message);
  const entityTables: Record<CloudSyncEntity, any> = {
    subjects: db.subjects, tasks: db.tasks, sessions: db.sessions,
    academicPeriods: db.academicPeriods, events: db.events, resources: db.resources,
  };
  for (const tombstone of serverTombstones || []) {
    const entity = tombstone.entity as CloudSyncEntity;
    if (!entityTables[entity] || !tombstone.cloud_id) continue;
    await removeCloudRecord(entity, String(tombstone.cloud_id), userId);
    await withCloudSyncPaused(() => entityTables[entity].where("cloudId").equals(String(tombstone.cloud_id)).delete(), userId);
  }

  const [remoteSubjects, remoteTasks, remoteSessions, remotePeriods, remoteEvents, remoteResources, goalResult] = await Promise.all([
    fetchRows("student_subjects", userId),
    fetchRows("planner_tasks", userId),
    fetchRows("study_sessions", userId),
    fetchRows("academic_periods", userId),
    fetchRows("academic_events", userId),
    fetchRows("learner_personal_resources", userId),
    supabase.from("student_goals").select("*").eq("learner_id", userId).maybeSingle(),
  ]);
  if (goalResult.error) throw new Error("Could not read your cloud study preferences: " + goalResult.error.message);

  const periodResult = await reconcileCollection<AcademicPeriod>(
    "academicPeriods", db.academicPeriods, remotePeriods, userId,
    (local) => ({
      id: local.cloudId, learner_id: userId,
      period_type: local.kind === "Term" ? "term" : local.kind === "Holiday" ? "holiday" : local.kind === "Examination" ? "exam" : "semester",
      display_kind: local.kind, title: local.title, starts_on: local.startDate,
      ends_on: local.endDate, notes: local.notes || "", created_at: local.createdAt,
      updated_at: local.localUpdatedAt || new Date().toISOString(),
    }),
    (remote, id) => ({
      id, cloudId: String(remote.id), title: String(remote.title),
      kind: remote.display_kind || (remote.period_type === "holiday" ? "Holiday" : remote.period_type === "exam" ? "Examination" : "Term"),
      startDate: String(remote.starts_on), endDate: String(remote.ends_on),
      notes: String(remote.notes || ""), createdAt: String(remote.created_at),
    }),
    [],
    (local, rows) => rows.find(row =>
      String(row.title).trim().toLocaleLowerCase() === local.title.trim().toLocaleLowerCase()
      && String(row.starts_on) === local.startDate
      && String(row.ends_on) === local.endDate
    ),
  );


  // Academic period IDs are device-local numbers. Persist stable cloud UUIDs
  // in student_subjects.period_ids and map them back to each device's local IDs.
  const localPeriods = await db.academicPeriods.toArray();
  const periodCloudIdByLocalId = new Map<number, string>(
    localPeriods.filter(period => period.cloudId).map(period => [period.id, String(period.cloudId)] as [number, string])
  );
  const periodLocalIdByCloudId = new Map<string, number>(
    localPeriods.filter(period => period.cloudId).map(period => [String(period.cloudId), period.id] as [string, number])
  );
  const localPeriodIds = new Set(localPeriods.map(period => period.id));
  const restorePeriodIds = (values: unknown): number[] => Array.isArray(values)
    ? values.map(value => {
        const cloudMatch = periodLocalIdByCloudId.get(String(value));
        if (cloudMatch !== undefined) return cloudMatch;
        const legacyId = Number(value);
        return Number.isSafeInteger(legacyId) && localPeriodIds.has(legacyId) ? legacyId : null;
      }).filter((id): id is number => id !== null)
    : [];

  const subjectResult = await reconcileCollection<Subject>(
    "subjects", db.subjects, remoteSubjects, userId,
    (local) => ({
      id: local.cloudId, learner_id: userId, name: local.name, subject_code: local.code || null,
      category: local.category || "Core", color: local.color || "#8db9ff",
      description: local.description || "", target_mark: local.targetMark ?? null,
      period_ids: (local.periodIds || []).map(id => periodCloudIdByLocalId.get(id)).filter((id): id is string => Boolean(id)), created_at: local.createdAt,
      updated_at: local.localUpdatedAt || new Date().toISOString(),
    }),
    (remote, id) => ({
      id, name: String(remote.name), color: String(remote.color || "#8db9ff"),
      code: remote.subject_code || undefined, description: String(remote.description || ""),
      category: String(remote.category || "Core"), targetMark: remote.target_mark == null ? undefined : Number(remote.target_mark),
      periodIds: restorePeriodIds(remote.period_ids),
      createdAt: String(remote.created_at),
    }),
    [],
    (local, rows) => rows.find(row => String(row.name).trim().toLowerCase() === local.name.trim().toLowerCase()),
  );
  void subjectResult;

  const subjects = await db.subjects.toArray();
  const subjectByLocalId = new Map(subjects.map(subject => [subject.id, subject]));
  const subjectByCloudId = new Map(subjects.filter(subject => subject.cloudId).map(subject => [String(subject.cloudId), subject]));
  const cloudSubjectId = (localId: number | null) => {
    if (localId == null) return null;
    return subjectByLocalId.get(localId)?.cloudId || null;
  };
  const localSubjectId = (cloudId: string | null) => {
    if (!cloudId) return null;
    return subjectByCloudId.get(cloudId)?.id ?? null;
  };

  const taskResult = await reconcileCollection<PlannerTask>(
    "tasks", db.tasks, remoteTasks, userId,
    (local) => ({
      id: local.cloudId, learner_id: userId, subject_id: cloudSubjectId(local.subjectId),
      title: local.title, notes: local.notes || "", task_kind: local.kind || "Study",
      due_at: fromLocalDateTime(local.dueAt), estimated_minutes: local.minutes,
      priority: local.priority, is_completed: local.done, completed_at: local.completedAt,
      created_at: local.createdAt, updated_at: local.localUpdatedAt || new Date().toISOString(),
    }),
    (remote, id) => ({
      id, cloudId: String(remote.id), title: String(remote.title), subjectId: localSubjectId(remote.subject_id),
      dueAt: toLocalDateTime(remote.due_at), minutes: Number(remote.estimated_minutes || 30),
      priority: remote.priority, kind: remote.task_kind, notes: String(remote.notes || ""),
      done: Boolean(remote.is_completed), createdAt: String(remote.created_at),
      completedAt: remote.completed_at || null,
    }),
    subjects,
    (local, rows) => rows.find(row =>
      String(row.title).trim().toLocaleLowerCase() === local.title.trim().toLocaleLowerCase()
      && String(row.created_at) === local.createdAt
      && String(row.subject_id || "") === String(cloudSubjectId(local.subjectId) || "")
      && String(row.due_at || "") === String(fromLocalDateTime(local.dueAt) || "")
    ),
  );

  const sessionResult = await reconcileCollection<StudySession>(
    "sessions", db.sessions, remoteSessions, userId,
    (local) => ({
      id: local.cloudId, learner_id: userId, subject_id: cloudSubjectId(local.subjectId),
      started_at: local.date, duration_minutes: local.minutes, reflection: local.notes || "",
      updated_at: local.localUpdatedAt || new Date().toISOString(),
    }),
    (remote, id) => ({
      id, cloudId: String(remote.id), subjectId: localSubjectId(remote.subject_id),
      date: String(remote.started_at), minutes: Number(remote.duration_minutes), notes: String(remote.reflection || ""),
    }),
    subjects,
    (local, rows) => rows.find(row =>
      String(row.started_at) === local.date
      && Number(row.duration_minutes) === local.minutes
      && String(row.subject_id || "") === String(cloudSubjectId(local.subjectId) || "")
    ),
  );

  const eventResult = await reconcileCollection<CalendarEvent>(
    "events", db.events, remoteEvents, userId,
    (local) => ({
      id: local.cloudId, learner_id: userId, subject_id: null,
      title: local.title, event_type: local.kind, starts_at: fromLocalDateTime(local.date + "T" + (local.time || "00:00")),
      ends_at: null, all_day: !local.time, notes: local.notes || "",
      created_at: local.createdAt, updated_at: local.localUpdatedAt || new Date().toISOString(),
    }),
    (remote, id) => {
      const localDateTime = toLocalDateTime(remote.starts_at);
      return {
        id, cloudId: String(remote.id), title: String(remote.title),
        date: localDateTime.slice(0, 10), time: remote.all_day ? "" : localDateTime.slice(11, 16),
        kind: remote.event_type || "Other", notes: String(remote.notes || ""),
        createdAt: String(remote.created_at),
      };
    },
    subjects,
    (local, rows) => rows.find(row =>
      String(row.title).trim().toLocaleLowerCase() === local.title.trim().toLocaleLowerCase()
      && String(row.starts_at) === String(fromLocalDateTime(local.date + "T" + (local.time || "00:00")) || "")
    ),
  );

  const resourceResult = await syncPersonalResources(db, userId, remoteResources, subjects);
  const practiceResult = await syncPracticeProgress(userId, subjects);

  const remoteGoal = goalResult.data as CloudRow | null;
  const localGoalKey = studentStorageKeyForUser(userId,"studyspace-weekly-goal");
  const localGoalEditedKey = studentStorageKeyForUser(userId,"studyspace-weekly-goal-updated-at");
  const reminderKey = studentStorageKeyForUser(userId,"studyspace-study-reminders");
  const reminderEditedKey = studentStorageKeyForUser(userId,"studyspace-study-reminders-updated-at");
  const baselineKey = studentStorageKeyForUser(userId,"studyspace-cloud-preferences-baseline");

  let baseline: { weeklyHours: number; reminderSettings: CloudRow; syncedAt: string } | null = null;
  try {
    const parsed = JSON.parse(localStorage.getItem(baselineKey) || "null");
    if (parsed && Number.isFinite(Number(parsed.weeklyHours)) && parsed.reminderSettings && typeof parsed.reminderSettings === "object" && typeof parsed.syncedAt === "string") {
      baseline = parsed;
    }
  } catch { baseline = null; }

  const hasLocalGoal = localStorage.getItem(localGoalKey) !== null;
  const localGoalValue = hasLocalGoal ? Number(localStorage.getItem(localGoalKey)) : NaN;
  const localGoalEditedAt = timestamp(localStorage.getItem(localGoalEditedKey));
  const remoteWeeklyHours = remoteGoal && Number.isFinite(Number(remoteGoal.weekly_hours))
    ? Math.max(1, Math.min(168, Number(remoteGoal.weekly_hours)))
    : null;
  let resolvedWeeklyHours = Number.isFinite(localGoalValue) && localGoalValue >= 1 && localGoalValue <= 168 ? localGoalValue : weeklyHours;
  let localGoalWins = !remoteGoal || remoteWeeklyHours === null;

  if (remoteWeeklyHours !== null) {
    if (!baseline) {
      // First sync migrates this device's existing setting to the cloud.
      localGoalWins = hasLocalGoal && Number.isFinite(localGoalValue) && localGoalValue >= 1 && localGoalValue <= 168;
      if (!localGoalWins) resolvedWeeklyHours = remoteWeeklyHours;
    } else {
      const localChanged = hasLocalGoal && resolvedWeeklyHours !== baseline.weeklyHours;
      const cloudChanged = remoteWeeklyHours !== baseline.weeklyHours;
      if (localChanged && cloudChanged) localGoalWins = localGoalEditedAt > timestamp(remoteGoal?.updated_at) && localGoalEditedAt > timestamp(baseline.syncedAt);
      else localGoalWins = localChanged;
      if (!localGoalWins) resolvedWeeklyHours = remoteWeeklyHours;
    }
  }
  if (!localStorage.getItem(localGoalKey) || resolvedWeeklyHours !== localGoalValue) {
    localStorage.setItem(localGoalKey, String(resolvedWeeklyHours));
    if (!localGoalWins && remoteGoal?.updated_at) localStorage.setItem(localGoalEditedKey, String(remoteGoal.updated_at));
  }

  const hasLocalReminders = localStorage.getItem(reminderKey) !== null;
  let localReminderSettings: CloudRow = { enabled: false, time: "16:00", days: profile.preferredDays || [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(reminderKey) || "null");
    if (parsed && typeof parsed === "object") localReminderSettings = parsed;
  } catch { /* Use defaults if local preferences are malformed. */ }
  const remoteReminderSettings = remoteGoal?.reminder_settings && typeof remoteGoal.reminder_settings === "object"
    ? remoteGoal.reminder_settings as CloudRow
    : null;
  const localReminderEditedAt = timestamp(localStorage.getItem(reminderEditedKey));
  let reminderSettings: CloudRow = localReminderSettings;
  let localReminderWins = !remoteGoal || !remoteReminderSettings;
  if (remoteReminderSettings) {
    if (!baseline) {
      localReminderWins = hasLocalReminders;
      if (!localReminderWins) reminderSettings = remoteReminderSettings;
    } else {
      const localChanged = hasLocalReminders && JSON.stringify(localReminderSettings) !== JSON.stringify(baseline.reminderSettings);
      const cloudChanged = JSON.stringify(remoteReminderSettings) !== JSON.stringify(baseline.reminderSettings);
      if (localChanged && cloudChanged) localReminderWins = localReminderEditedAt > timestamp(remoteGoal?.updated_at) && localReminderEditedAt > timestamp(baseline.syncedAt);
      else localReminderWins = localChanged;
      if (!localReminderWins) reminderSettings = remoteReminderSettings;
    }
  }
  if (!hasLocalReminders || JSON.stringify(localReminderSettings) !== JSON.stringify(reminderSettings)) {
    localStorage.setItem(reminderKey, JSON.stringify(reminderSettings));
    if (!localReminderWins && remoteGoal?.updated_at) localStorage.setItem(reminderEditedKey, String(remoteGoal.updated_at));
  }

  const preferredDays = profile.preferredDays || (Array.isArray(remoteGoal?.preferred_days) ? remoteGoal!.preferred_days : []);
  const goalPayload = {
    learner_id: userId,
    goal_text: profile.goals || "",
    target_mark: Number(profile.targetMark) || null,
    weekly_hours: resolvedWeeklyHours,
    preferred_days: preferredDays,
    reminder_settings: reminderSettings,
    updated_at: remoteGoal?.updated_at || new Date().toISOString(),
  };
  const localGoalChanged = localGoalWins && hasLocalGoal && remoteWeeklyHours !== Number(resolvedWeeklyHours);
  const localReminderChanged = localReminderWins && hasLocalReminders && JSON.stringify(remoteReminderSettings || {}) !== JSON.stringify(reminderSettings);
  const needsGoalWrite = !remoteGoal
    || localGoalChanged
    || localReminderChanged
    || String(remoteGoal.goal_text || "") !== goalPayload.goal_text
    || Number(remoteGoal.target_mark || 0) !== Number(goalPayload.target_mark || 0)
    || JSON.stringify(remoteGoal.preferred_days || []) !== JSON.stringify(preferredDays);
  if (needsGoalWrite) {
    const { error } = await supabase.from("student_goals").upsert(goalPayload, { onConflict: "learner_id" });
    if (error) throw new Error("Could not sync your study goals: " + error.message);
  }
  const syncedAt = new Date().toISOString();
  localStorage.setItem(baselineKey, JSON.stringify({
    weeklyHours: resolvedWeeklyHours,
    reminderSettings,
    syncedAt,
  }));
  if (localGoalWins && !localStorage.getItem(localGoalEditedKey)) localStorage.setItem(localGoalEditedKey, syncedAt);
  if (localReminderWins && !localStorage.getItem(reminderEditedKey)) localStorage.setItem(reminderEditedKey, syncedAt);


  return {
    syncedAt,
    weeklyHours: resolvedWeeklyHours,
    downloaded: subjectResult.downloaded + taskResult.downloaded + sessionResult.downloaded + periodResult.downloaded + eventResult.downloaded + resourceResult.downloaded + practiceResult.downloaded,
    uploaded: subjectResult.uploaded + taskResult.uploaded + sessionResult.uploaded + periodResult.uploaded + eventResult.uploaded + resourceResult.uploaded + practiceResult.uploaded,
    deleted,
    reminderSettings,
  };
}
