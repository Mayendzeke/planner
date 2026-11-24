import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildBalancedSchedule, subtractBusyWindows } from "./scheduler.ts";

const headers = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://mayendzeke.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
function keyValue(name:string) {
  const raw=Deno.env.get(name)||"";
  try { const value=JSON.parse(raw)?.default; return typeof value==="string"?value:""; } catch { return raw; }
}
function dateParts(date:Date,timezone:string) {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const get=(key:string)=>parts.find(p=>p.type===key)?.value||"";
  return get("year")+"-"+get("month")+"-"+get("day");
}
function weekMonday(localDate:string) {
  const [y,m,d]=localDate.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  const weekday=date.getUTCDay();
  date.setUTCDate(date.getUTCDate()-((weekday+6)%7));
  return date.toISOString().slice(0,10);
}
function dateForDay(monday:string,dayName:string) {
  const [y,m,d]=monday.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1,d+DAYS_INDEX[dayName]));
  return date.toISOString().slice(0,10);
}
const DAYS_INDEX:Record<string,number>={Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4};
function zonedTimeToIso(date:string,time:string,timezone:string) {
  const [y,m,d]=date.split("-").map(Number),[h,minute]=time.split(":").map(Number);
  const utcGuess=Date.UTC(y,m-1,d,h,minute);
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(utcGuess));
  const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value||0);
  const localAsUtc=Date.UTC(get("year"),get("month")-1,get("day"),get("hour"),get("minute"));
  return new Date(utcGuess-(localAsUtc-utcGuess)).toISOString();
}
async function sha(value:string) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function isAccessActive(profile:Record<string,unknown>) {
  const now=Date.now();
  if(!profile.terms_accepted_at||profile.terms_version!=="2026-11-09-v8")return false;
  if(profile.subscription_tier) return Boolean(profile.subscription_expires_at&&Date.parse(String(profile.subscription_expires_at))>now);
  return Boolean(profile.trial_started_at&&profile.trial_expires_at&&Date.parse(String(profile.trial_started_at))<=now&&Date.parse(String(profile.trial_expires_at))>now);
}
async function generateQuestions(url:string,publishable:string,token:string,origin:string,subject:string,topic:string,count:number,difficulty:string,notesText:string) {
  const response=await fetch(url+"/functions/v1/mia-assistant",{
    method:"POST",
    headers:{Authorization:"Bearer "+token,apikey:publishable,Origin:origin,"Content-Type":"application/json"},
    body:JSON.stringify({action:"generate_topic_test",subject,topic,questionCount:count,difficulty,notesText}),
    signal:AbortSignal.timeout(90000),
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload?.success!==true||!Array.isArray(payload.questions))throw new Error(String(payload?.error||"Question generation was unavailable."));
  return payload.questions as Record<string,unknown>[];
}
async function materialText(admin:any,learnerId:string,subject:string) {
  const {data:assignments}=await admin.from("resource_assignments").select("resource_id").eq("learner_id",learnerId);
  const ids=(assignments||[]).map((row:any)=>row.resource_id).filter(Boolean);
  if(!ids.length)return "";
  const {data:resources}=await admin.from("learning_resources").select("title,subject_name,topic,storage_path,mime_type").in("id",ids).ilike("subject_name",subject).limit(4);
  const parts:string[]=[];
  for(const resource of resources||[]) {
    if(!resource.storage_path||!/^text\/(plain|markdown)/i.test(String(resource.mime_type||"")))continue;
    const {data,error}=await admin.storage.from("studyspace-resources").download(resource.storage_path);
    if(error||!data)continue;
    const text=await data.text();
    if(text.trim())parts.push("# "+resource.title+"\nTopic: "+resource.topic+"\n"+text.slice(0,7000));
  }
  return parts.join("\n\n").slice(0,23000);
}

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers});
  if(request.method!=="POST")return json(405,{error:"Method not allowed."});
  const origin=request.headers.get("Origin")||"";
  const allowed=Deno.env.get("APP_ORIGIN")||"https://mayendzeke.github.io";
  if(origin!==allowed)return json(403,{error:"This StudySpace origin is not allowed."});
  const authorization=request.headers.get("Authorization")||"";
  const token=authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const url=Deno.env.get("SUPABASE_URL")||"";
  const publishable=keyValue("SUPABASE_PUBLISHABLE_KEYS")||Deno.env.get("SUPABASE_ANON_KEY")||"";
  const secret=keyValue("SUPABASE_SECRET_KEYS")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!token)return json(401,{error:"Sign in is required."});
  if(!url||!publishable||!secret)return json(503,{error:"Assessment service configuration is incomplete."});
  const caller=createClient(url,publishable,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:auth,error:authError}=await caller.auth.getUser(token);
  if(authError||!auth.user)return json(401,{error:"Sign in again to load your assessment programme."});
  const admin=createClient(url,secret,{auth:{persistSession:false}});
  const {data:profile,error:profileError}=await admin.from("profiles")
    .select("role,account_status,country,education_level,grade,curriculum,academic_year,course,subscription_tier,subscription_expires_at,trial_started_at,trial_expires_at,terms_accepted_at,terms_version")
    .eq("id",auth.user.id).maybeSingle();
  if(profileError||!profile||profile.role!=="learner"||profile.account_status!=="active")return json(403,{error:"An active learner account is required."});
  if(!isAccessActive(profile))return json(403,{error:"Your StudySpace access is paused or your current terms need acceptance."});

  let body:Record<string,unknown>={};
  try{body=await request.json();}catch{return json(400,{error:"Invalid request body."});}
  const timezone=String(body.timezone||"Africa/Mbabane").slice(0,80);
  const localToday=dateParts(new Date(),timezone);
  const monday=weekMonday(localToday);
  const fridayDate=dateForDay(monday,"Friday");
  const [{data:preferences,error:preferencesError},{data:subjects,error:subjectsError},{data:studentEntries,error:studentEntriesError},{data:members,error:membersError}] = await Promise.all([
    admin.from("assessment_schedule_preferences").select("available_windows,daily_minutes_limit,preferred_assessment_days,timezone").eq("learner_id",auth.user.id).maybeSingle(),
    admin.from("student_subjects").select("id,name,category,description,difficulty_level,subject_type,credit_hours,weekly_minutes_target").eq("learner_id",auth.user.id).order("name"),
    admin.from("student_timetable_entries").select("id,timetable_kind,day_of_week,starts_at,ends_at,notes").eq("learner_id",auth.user.id),
    admin.from("teacher_timetable_members").select("entry_id").eq("learner_id",auth.user.id),
  ]);
  if(preferencesError||subjectsError||studentEntriesError||membersError)return json(503,{error:"Your subjects, timetable or assessment availability could not be loaded."});
  if(!subjects?.length)return json(200,{success:true,status:"no_subjects",message:"Add your subjects before creating a weekly assessment programme."});
  const prefs=preferences||{available_windows:[],daily_minutes_limit:120,preferred_assessment_days:[1,2,3,4,5],timezone};
  const preferredDays=Array.isArray(prefs.preferred_assessment_days)?prefs.preferred_assessment_days.map(Number):[1,2,3,4,5];
  let windows=Array.isArray(prefs.available_windows)?prefs.available_windows as Record<string,unknown>[]:[];
  if(!windows.length) {
    windows=(studentEntries||[]).filter((row:any)=>row.timetable_kind==="personal"&&String(row.notes||"").includes("[READY_FOR_STUDY]"))
      .map((row:any)=>({day:row.day_of_week,start:String(row.starts_at).slice(0,5),end:String(row.ends_at).slice(0,5),id:row.id}));
  }
  windows=windows.filter(row=>preferredDays.includes(Number(row.day)));
  if(!windows.length) {
    const hash=await sha(JSON.stringify({learner:auth.user.id,week:monday,availability:[]}));
    const {data:run}=await admin.from("assessment_schedule_runs").upsert({
      learner_id:auth.user.id,period_type:"weekly",period_start:monday,period_end:fridayDate,
      policy:"balanced",status:"needs_availability",schedule_hash:hash,
      input_snapshot:{subject_count:subjects.length,timezone},conflicts:[{reason:"availability_not_configured"}],
    },{onConflict:"learner_id,period_type,period_start"}).select("id,status").single();
    return json(200,{success:true,status:"needs_availability",scheduleRunId:run?.id,message:"Set your available study periods or mark personal timetable periods as ready for study."});
  }

  const busy=(studentEntries||[]).filter((row:any)=>row.timetable_kind==="school"||!String(row.notes||"").includes("[READY_FOR_STUDY]"))
    .map((row:any)=>({day:row.day_of_week,start:String(row.starts_at).slice(0,5),end:String(row.ends_at).slice(0,5)}));
  const teacherIds=(members||[]).map((row:any)=>row.entry_id).filter(Boolean);
  if(teacherIds.length) {
    const {data:teacherEntries,error:teacherError}=await admin.from("teacher_timetable_entries")
      .select("day_of_week,starts_at,ends_at").in("id",teacherIds).eq("is_active",true);
    if(teacherError)return json(503,{error:"Teacher timetable conflicts could not be checked."});
    for(const row of teacherEntries||[])busy.push({day:row.day_of_week,start:String(row.starts_at).slice(0,5),end:String(row.ends_at).slice(0,5)});
  }
  const freeSlots=subtractBusyWindows(windows,busy);
  const {data:assignmentRows}=await admin.from("exercise_assignments").select("id,exercise_set_id").eq("learner_id",auth.user.id);
  const assignmentIds=(assignmentRows||[]).map((row:any)=>row.id);
  const setIds=(assignmentRows||[]).map((row:any)=>row.exercise_set_id).filter(Boolean);
  const {data:sets}=setIds.length?await admin.from("exercise_sets").select("id,subject_name").in("id",setIds):{data:[]};
  const setSubject=new Map((sets||[]).map((row:any)=>[row.id,row.subject_name]));
  const {data:attempts}=assignmentIds.length?await admin.from("exercise_attempts").select("assignment_id,score,total_points,submitted_at").eq("learner_id",auth.user.id).in("assignment_id",assignmentIds).order("submitted_at",{ascending:false}).limit(100):{data:[]};
  const scoreBySubject=new Map<string,number[]>();
  for(const attempt of attempts||[]) {
    const assignment=(assignmentRows||[]).find((row:any)=>row.id===attempt.assignment_id);
    const subject=assignment?String(setSubject.get(assignment.exercise_set_id)||""):"";
    const total=Number(attempt.total_points),score=Number(attempt.score);
    if(!subject||!Number.isFinite(total)||total<=0||!Number.isFinite(score))continue;
    const values=scoreBySubject.get(subject)||[];
    if(values.length<3)values.push(score/total*100);
    scoreBySubject.set(subject,values);
  }
  const schedulerSubjects=subjects.map((subject:any)=>({
    ...subject,
    difficulty:subject.difficulty_level,
    recent_score:(scoreBySubject.get(subject.name)||[]).length
      ? (scoreBySubject.get(subject.name)||[]).reduce((sum,value)=>sum+value,0)/(scoreBySubject.get(subject.name)||[]).length : undefined,
  }));
  const schedule=buildBalancedSchedule(schedulerSubjects,freeSlots,Number(prefs.daily_minutes_limit)||120);
  const snapshot={profile:{country:profile.country,education_level:profile.education_level,grade:profile.grade,curriculum:profile.curriculum,course:profile.course,academic_year:profile.academic_year},subjects:schedulerSubjects,windows,freeSlots};
  const hash=await sha(JSON.stringify(snapshot));
  const {data:existing}=await admin.from("assessment_schedule_runs").select("id,schedule_hash,status").eq("learner_id",auth.user.id).eq("period_type","weekly").eq("period_start",monday).maybeSingle();
  let runId=existing?.id;
  if(!existing||existing.schedule_hash!==hash) {
    const {data:run,error:runError}=await admin.from("assessment_schedule_runs").upsert({
      learner_id:auth.user.id,period_type:"weekly",period_start:monday,period_end:fridayDate,
      policy:"balanced",status:schedule.conflicts.length?"capacity_conflict":"planned",
      schedule_hash:hash,input_snapshot:snapshot,conflicts:schedule.conflicts,
    },{onConflict:"learner_id,period_type,period_start"}).select("id").single();
    if(runError||!run)return json(503,{error:"The weekly assessment plan could not be saved."});
    runId=run.id;
    if(existing?.id)await admin.from("assessment_schedule_items").delete().eq("schedule_run_id",runId).is("exercise_assignment_id",null);
    const existingAssigned=existing?.id?await admin.from("assessment_schedule_items").select("subject_id").eq("schedule_run_id",runId).not("exercise_assignment_id","is",null):{data:[]};
    const assignedSubjects=new Set((existingAssigned.data||[]).map((row:any)=>row.subject_id));
    const newRows=schedule.assignments.filter((item:any)=>!assignedSubjects.has(item.subjectId)).map((item:any)=>({
      schedule_run_id:runId,learner_id:auth.user.id,subject_id:item.subjectId,subject_name:item.subjectName,
      assessment_type:"weekly_subject",
      scheduled_at:zonedTimeToIso(dateForDay(monday,String(item.day)),String(item.start),timezone),
      duration_minutes:item.durationMinutes,question_count:10,difficulty_score:item.difficultyScore,
      workload_score:item.workloadScore,status:"scheduled",
      schedule_key:"weekly:"+auth.user.id+":"+monday+":"+item.subjectId,
      version_seed:crypto.randomUUID(),
      metadata:{day:item.day,start:item.start,end:item.end,subject_type:item.subjectType,credit_hours:item.creditHours,weekly_minutes_target:item.weeklyMinutesTarget},
    }));
    if(newRows.length) {
      const {error:itemsError}=await admin.from("assessment_schedule_items").insert(newRows);
      if(itemsError)return json(503,{error:"The weekly assessment plan was saved, but some scheduled items could not be stored."});
    }
  }
  const {data:items,error:itemsError}=await admin.from("assessment_schedule_items").select("*").eq("schedule_run_id",runId).order("scheduled_at");
  if(itemsError)return json(503,{error:"The saved weekly assessment plan could not be loaded."});

  let generatedCount=0;
  const pending=(items||[]).filter((item:any)=>!item.exercise_assignment_id&&item.status==="scheduled").slice(0,2);
  const appOrigin=Deno.env.get("APP_ORIGIN")||"https://mayendzeke.github.io";
  for(const item of pending) {
    try {
      const notesText=await materialText(admin,auth.user.id,item.subject_name);
      const questions=await generateQuestions(url,publishable,token,appOrigin,item.subject_name,"Weekly curriculum practice and current learning objectives",10,"adaptive",notesText);
      const title="Weekly Test · "+item.subject_name+" · "+monday;
      const {data:set,error:setError}=await admin.from("exercise_sets").insert({
        created_by:auth.user.id,title,instructions:"Complete all 10 questions. This test was prepared for your registered subject and academic profile.",
        subject_name:item.subject_name,education_level:String(profile.education_level||""),grade:String(profile.grade||""),
        curriculum:String(profile.curriculum||""),question_count:10,is_published:false,review_status:"draft",
        duration_minutes:item.duration_minutes,due_date:dateForDay(monday,String(item.metadata?.day||"Monday")),
      }).select("id").single();
      if(setError||!set)throw new Error("Assessment storage could not be created.");
      const questionRows=questions.map((question:any,index:number)=>({
        exercise_set_id:set.id,position:index+1,question_type:String(question.question_type),
        prompt:String(question.prompt),content:{options:question.options||[],pairs:question.pairs||[],clue:question.clue||"",scramble:question.scramble||"",topic:question.topic||item.subject_name,difficulty:question.difficulty||"adaptive"},
        explanation:String(question.explanation||""),points:1,topic:String(question.topic||item.subject_name),difficulty:String(question.difficulty||"Standard"),
      }));
      const {data:savedQuestions,error:questionError}=await admin.from("exercise_questions").insert(questionRows).select("id");
      if(questionError||!savedQuestions||savedQuestions.length!==10)throw new Error("The generated questions could not be saved completely.");
      const answerRows=questions.map((question:any,index:number)=>({
        question_id:savedQuestions[index].id,
        answer_key:{answer:String(question.answer||""),acceptedAnswers:[String(question.answer||"")],pairs:question.pairs||[],explanation:String(question.explanation||"")},
      }));
      const {error:keyError}=await admin.from("exercise_answer_keys").insert(answerRows);
      if(keyError)throw new Error("The answer keys could not be stored.");
      const {error:publishError}=await admin.from("exercise_sets").update({is_published:true,review_status:"approved"}).eq("id",set.id);
      if(publishError)throw new Error("The assessment could not be published.");
      const scheduledAt=Date.parse(item.scheduled_at);
      const dueAt=new Date(scheduledAt).toISOString().slice(0,10)+"T23:59:00Z";
      const {data:assignment,error:assignmentError}=await admin.from("exercise_assignments").insert({
        exercise_set_id:set.id,learner_id:auth.user.id,assigned_by:auth.user.id,
        available_at:item.scheduled_at,due_at:dueAt,
      }).select("id").single();
      if(assignmentError||!assignment)throw new Error("The assessment assignment could not be created.");
      const {error:updateError}=await admin.from("assessment_schedule_items").update({exercise_assignment_id:assignment.id,status:"published"}).eq("id",item.id);
      if(updateError)throw new Error("The scheduled assessment could not be linked.");
      generatedCount++;
    } catch(error) {
      const safeMessage=error instanceof Error?error.message.slice(0,240):"Question generation failed.";
      await admin.from("assessment_schedule_items").update({metadata:{...(item.metadata||{}),generation_error:safeMessage}}).eq("id",item.id);
    }
  }
  const {data:finalItems}=await admin.from("assessment_schedule_items").select("id,subject_name,assessment_type,scheduled_at,duration_minutes,question_count,status,exercise_assignment_id,metadata").eq("schedule_run_id",runId).order("scheduled_at");
  const allPublished=(finalItems||[]).length>0&&(finalItems||[]).every((item:any)=>item.exercise_assignment_id);
  await admin.from("assessment_schedule_runs").update({status:allPublished?"published":schedule.conflicts.length?"capacity_conflict":"planned"}).eq("id",runId);
  return json(200,{
    success:true,status:allPublished?"published":schedule.conflicts.length?"capacity_conflict":"planned",
    scheduleRunId:runId,weekStart:monday,subjectCount:subjects.length,
    scheduledCount:(finalItems||[]).length,generatedCount,conflicts:schedule.conflicts,
    items:finalItems||[],message:generatedCount?"Your weekly assessments have been prepared and saved.":"Your weekly programme is saved. More tests will be prepared as capacity allows.",
  });
});
