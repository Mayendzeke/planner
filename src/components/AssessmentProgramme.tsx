import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, RefreshCw, Settings2, ShieldAlert, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { prepareAssessmentProgramme } from "../lib/cloudSync";
import "./AssessmentProgramme.css";

const weekdays=[{day:1,label:"Monday"},{day:2,label:"Tuesday"},{day:3,label:"Wednesday"},{day:4,label:"Thursday"},{day:5,label:"Friday"}];
type WindowDraft={day:number;enabled:boolean;start:string;end:string};
type ScheduleItem={id:string;subject_name:string;assessment_type:string;scheduled_at:string;duration_minutes:number;question_count:number;status:string;exercise_assignment_id:string|null;metadata:Record<string,unknown>};
type Conflict={subjectName?:string;reason:string;day?:string;requiredMinutes?:number;limitMinutes?:number;periodType?:string};
const emptyWindows=():WindowDraft[]=>weekdays.map(item=>({day:item.day,enabled:false,start:"",end:""}));
const timeLabel=(value:string)=>new Date(value).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
const dateLabel=(value:string)=>new Date(value).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});

export default function AssessmentProgramme({onOpenAssignments}:{onOpenAssignments:()=>void}) {
  const [learnerId,setLearnerId]=useState("");
  const [windows,setWindows]=useState<WindowDraft[]>(emptyWindows);
  const [dailyLimit,setDailyLimit]=useState("120");
  const [questionCount,setQuestionCount]=useState("10");
  const [timezone,setTimezone]=useState("Africa/Mbabane");
  const [language,setLanguage]=useState("English");
  const [items,setItems]=useState<ScheduleItem[]>([]);
  const [monthlyItems,setMonthlyItems]=useState<ScheduleItem[]>([]);
  const [quarterlyItems,setQuarterlyItems]=useState<ScheduleItem[]>([]);
  const [conflicts,setConflicts]=useState<Conflict[]>([]);
  const [weekStart,setWeekStart]=useState("");
  const [programmeStatus,setProgrammeStatus]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const selectedDays=useMemo(()=>windows.filter(item=>item.enabled),[windows]);
  const nextAssessment=useMemo(()=>[...items,...monthlyItems,...quarterlyItems]
    .filter(item=>item.exercise_assignment_id&&item.status!=="completed")
    .sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime())[0]||null,[items,monthlyItems,quarterlyItems]);
  const periodItemStatus=(item:ScheduleItem)=>{
    if(item.status==="completed")return "Completed";
    if(item.exercise_assignment_id)return new Date(item.scheduled_at).getTime()>Date.now()?"Stored":"Ready";
    if(item.metadata?.waiting_for_material_approval)return "Awaiting material approval";
    if(item.metadata?.waiting_for_study_pack)return "Preparing study material";
    if(item.metadata?.material_request_error)return "Material preparation failed";
    return "Scheduled";
  };
  const renderPeriodItem=(item:ScheduleItem)=> <div className="assessment-scheduled-item" key={item.id}>
    <div><strong>{item.subject_name}</strong><small>{dateLabel(item.scheduled_at)} · {timeLabel(item.scheduled_at)} · {item.duration_minutes} min · {item.question_count} questions</small></div>
    <span className={"assessment-item-status status-"+item.status}>{periodItemStatus(item)}</span>
  </div>;
  const refreshItems=useCallback(async(learnerIdOverride?:string)=>{
    if(!supabase)return;
    const activeLearnerId=learnerIdOverride||learnerId;
    if(!activeLearnerId)return;
    const {data:runs,error:runError}=await supabase.from("assessment_schedule_runs")
      .select("id,period_type,period_start,status,conflicts")
      .eq("learner_id",activeLearnerId).in("period_type",["weekly","monthly","quarterly"])
      .order("period_start",{ascending:false});
    if(runError)throw runError;
    const latestByType=new Map<string,any>();
    for(const run of runs||[])if(!latestByType.has(String(run.period_type)))latestByType.set(String(run.period_type),run);
    const weeklyRun=latestByType.get("weekly");
    if(weeklyRun){setWeekStart(String(weeklyRun.period_start));setProgrammeStatus(String(weeklyRun.status||"planned"));}
    const runIds=[...latestByType.values()].map((run:any)=>run.id).filter(Boolean);
    if(!runIds.length){setItems([]);setMonthlyItems([]);setQuarterlyItems([]);setConflicts([]);return;}
    const {data,error:queryError}=await supabase.from("assessment_schedule_items")
      .select("id,subject_name,assessment_type,scheduled_at,duration_minutes,question_count,status,exercise_assignment_id,metadata")
      .in("schedule_run_id",runIds).order("scheduled_at");
    if(queryError)throw queryError;
    const rows=(data||[]) as ScheduleItem[];
    setItems(rows.filter(item=>item.assessment_type==="weekly_subject"));
    setMonthlyItems(rows.filter(item=>item.assessment_type==="monthly_subject"));
    setQuarterlyItems(rows.filter(item=>item.assessment_type==="quarterly_exam"));
    setConflicts((runs||[]).flatMap((run:any)=>(Array.isArray(run.conflicts)?run.conflicts:[]).map((item:any)=>({...item,periodType:run.period_type}))) as Conflict[]);
  },[learnerId]);

  const runScheduler=useCallback(async(showProgress=true,learnerIdOverride?:string)=>{
    const activeLearnerId=learnerIdOverride||learnerId;
    if(!supabase||!activeLearnerId||generating)return;
    if(showProgress)setGenerating(true);
    setError("");setNotice("");
    try{
      const result=await prepareAssessmentProgramme();
      if(result.error)throw new Error(result.error);
      const data=result.data;
      if(data?.status)setProgrammeStatus(String(data.status));
      if(Array.isArray(data?.conflicts))setConflicts(data.conflicts as Conflict[]);
      if(data?.weekStart)setWeekStart(String(data.weekStart));
      await refreshItems(activeLearnerId);
      if(data?.status==="needs_availability")setNotice("Set your available study periods below, or mark free periods in your personal timetable as ready for study.");
      else if(data?.status==="no_subjects")setNotice("Add your registered subjects before creating your assessment programme.");
      else if(data?.hasMore)setNotice("Your programme is saved. Study Space will continue preparing the remaining near-term assessments automatically.");
      else setNotice(String(data?.message||"Your programme and stored assessments are ready."));
    }catch(reason){
      setError(reason instanceof Error?reason.message:"The assessment programme could not be loaded.");
    }finally{if(showProgress)setGenerating(false);}
  },[learnerId,generating,refreshItems]);

  useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase){setError("StudySpace is not connected.");setLoading(false);return;}
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user){setError("Sign in again to load your assessment programme.");setLoading(false);return;}
      if(!alive)return;
      setLearnerId(auth.user.id);
      const {data:preferences,error:preferencesError}=await supabase.from("assessment_schedule_preferences")
        .select("available_windows,daily_minutes_limit,timezone,question_count,language").eq("learner_id",auth.user.id).maybeSingle();
      if(preferencesError){setError(preferencesError.message);setLoading(false);return;}
      if(preferences){
        setDailyLimit(String(preferences.daily_minutes_limit||120));
        setQuestionCount(String(preferences.question_count||10));
        setTimezone(String(preferences.timezone||"Africa/Mbabane"));
        setLanguage(String(preferences.language||"English"));
        const saved=Array.isArray(preferences.available_windows)?preferences.available_windows as Record<string,unknown>[]:[];
        setWindows(weekdays.map(day=>{
          const row=saved.find(item=>Number(item.day)===day.day);
          return {day:day.day,enabled:!!row,start:String(row?.start||""),end:String(row?.end||"")};
        }));
      }
      setLoading(false);
      if(alive)await runScheduler(true,auth.user.id);
    }
    void load();
    return()=>{alive=false;};
  },[]);

  async function saveAvailability(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!supabase||!learnerId||saving)return;
    const invalid=selectedDays.find(item=>!item.start||!item.end||item.end<=item.start);
    if(invalid){setError("Choose a valid start and end time for every selected day.");return;}
    setSaving(true);setError("");setNotice("");
    try{
      const available_windows=selectedDays.map(item=>({day:item.day,start:item.start,end:item.end}));
      const {error:saveError}=await supabase.from("assessment_schedule_preferences").upsert({
        learner_id:learnerId,timezone,language,available_windows,
        preferred_assessment_days:selectedDays.map(item=>item.day),
        daily_minutes_limit:Number(dailyLimit),question_count:Number(questionCount),updated_at:new Date().toISOString(),
      },{onConflict:"learner_id"});
      if(saveError)throw saveError;
      setNotice("Your available study periods have been saved. Building your balanced weekly programme…");
      await runScheduler(true);
    }catch(reason){setError(reason instanceof Error?reason.message:"Your availability could not be saved.");}
    finally{setSaving(false);}
  }

  const updateWindow=(day:number,patch:Partial<WindowDraft>)=>setWindows(current=>current.map(item=>item.day===day?{...item,...patch}:item));
  const grouped=weekdays.map(day=>({ ...day,items:items.filter(item=>new Date(item.scheduled_at).toLocaleDateString("en-US",{weekday:"long",timeZone:timezone})===day.label) }));

  if(loading)return <section className="assessment-programme glass-panel"><div className="assessment-programme-loading"><RefreshCw size={20}/> Loading your assessment programme…</div></section>;

  return <section className="assessment-programme">
    <header className="assessment-programme-hero glass-panel">
      <div><span className="eyebrow">YOUR PERSONAL ASSESSMENT PLAN</span><h2>Your assessment programme</h2><p>Weekly subject tests are balanced across your available periods, with a comprehensive test for every subject each month and a quarterly examination every three months.</p></div>
      <div className="assessment-programme-hero-icon"><CalendarDays size={25}/></div>
    </header>

    <section className="assessment-availability glass-panel">
      <div className="assessment-section-heading"><div><span className="eyebrow">SCHEDULING PREFERENCES</span><h3>When are you available to study?</h3><p>School lessons, teacher timetable entries and personal commitments are removed from these windows automatically.</p></div><Settings2 size={20}/></div>
      <form onSubmit={saveAvailability}>
        <div className="assessment-day-windows">{windows.map(item=><div className={"assessment-day-window"+(item.enabled?" is-enabled":"")} key={item.day}>
          <label className="assessment-day-toggle"><input type="checkbox" checked={item.enabled} onChange={event=>updateWindow(item.day,{enabled:event.target.checked})}/><strong>{weekdays[item.day-1].label}</strong></label>
          <label>From<input type="time" value={item.start} onChange={event=>updateWindow(item.day,{start:event.target.value})} disabled={!item.enabled}/></label>
          <label>Until<input type="time" value={item.end} onChange={event=>updateWindow(item.day,{end:event.target.value})} disabled={!item.enabled}/></label>
        </div>)}</div>
        <div className="assessment-preference-footer">
          <label>Daily assessment workload<select value={dailyLimit} onChange={event=>setDailyLimit(event.target.value)}><option value="60">Up to 1 hour</option><option value="90">Up to 1.5 hours</option><option value="120">Up to 2 hours</option><option value="180">Up to 3 hours</option><option value="240">Up to 4 hours</option></select></label>
          <label>Questions per subject test<select value={questionCount} onChange={event=>setQuestionCount(event.target.value)}><option value="5">5 questions</option><option value="10">10 questions</option><option value="15">15 questions</option><option value="20">20 questions</option><option value="25">25 questions</option><option value="30">30 questions</option></select></label>
          <label>Questions &amp; instructions language<select value={language} onChange={event=>setLanguage(event.target.value)}><option>English</option><option>SiSwati</option><option>French</option><option>Portuguese</option><option>Afrikaans</option><option>Arabic</option><option>Mandarin Chinese</option><option>Spanish</option></select></label>
          <label>Time zone<select value={timezone} onChange={event=>setTimezone(event.target.value)}><option value="Africa/Mbabane">Eswatini (Africa/Mbabane)</option><option value="Africa/Johannesburg">South Africa (Africa/Johannesburg)</option><option value="UTC">UTC</option></select></label>
          <button type="submit" className="primary-button" disabled={saving||generating}>{saving||generating?"Saving…":"Save availability & build plan"}</button>
        </div>
      </form>
      <p className="assessment-availability-hint"><ShieldAlert size={15}/> You can also mark free periods in your Personal Timetable as “Ready for study”. If no availability is configured here, those marked periods can be used.</p>
    </section>

    {error&&<p className="assessment-programme-error" role="alert">{error}</p>}
    {notice&&<p className="assessment-programme-notice" role="status">{notice}</p>}

    {nextAssessment&&<section className="assessment-next-action glass-panel">
      <div><span className="eyebrow">YOUR NEXT ASSESSMENT</span><h3>{nextAssessment.subject_name}</h3><p>{dateLabel(nextAssessment.scheduled_at)} at {timeLabel(nextAssessment.scheduled_at)} · {nextAssessment.question_count} questions · {nextAssessment.duration_minutes} minutes</p></div>
      <button type="button" className="primary-button" onClick={onOpenAssignments}>Open assessment</button>
    </section>}
    <section className="assessment-weekly-plan glass-panel">
      <div className="assessment-section-heading"><div><span className="eyebrow">BALANCED MONDAY–FRIDAY PLAN</span><h3>{weekStart?"Week of "+new Date(weekStart+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"}):"Your weekly schedule"}</h3><p>{items.length} of your registered subject assessments scheduled. Each regular subject test contains {questionCount} questions.</p></div><button type="button" className="secondary-button" onClick={()=>void runScheduler(true)} disabled={generating||!learnerId}><RefreshCw size={15}/>{generating?"Preparing…":"Refresh programme"}</button></div>
      {programmeStatus==="needs_availability"&&<div className="assessment-programme-empty"><Clock3 size={22}/><strong>Availability needed</strong><span>Choose free study windows above or mark personal timetable periods as ready for study.</span></div>}
      {items.length? <div className="assessment-week-grid">{grouped.map(day=><article className="assessment-week-day" key={day.day}>
        <header><strong>{day.label}</strong><span>{day.items.length} test{day.items.length===1?"":"s"}</span></header>
        {day.items.length?day.items.map(item=><div className="assessment-scheduled-item" key={item.id}>
          <div><strong>{item.subject_name}</strong><small>{timeLabel(item.scheduled_at)} · {item.duration_minutes} min · {item.question_count} questions</small></div>
          <span className={"assessment-item-status status-"+item.status}>{item.status==="completed"?"Completed":item.exercise_assignment_id?(new Date(item.scheduled_at).getTime()>Date.now()?"Stored":"Ready"):item.metadata?.waiting_for_material_approval?"Awaiting material approval":item.metadata?.material_request_error?"Material preparation failed":item.status==="generated"?"Preparing":"Scheduled"}</span>
        </div>):<p className="assessment-no-test">No test allocated</p>}
      </article>)}</div>:programmeStatus!=="needs_availability"&&<div className="assessment-programme-empty"><Sparkles size={22}/><strong>Your weekly programme is not ready yet</strong><span>Save your availability to let StudySpace balance your subjects and create stored tests.</span></div>}
      <div className="assessment-period-grid">
        <section className="assessment-period-card">
          <span className="eyebrow">EVERY MONTH</span><h3>Monthly comprehensive tests</h3>
          <p>One comprehensive subject test for every registered subject, scheduled near the end of the month.</p>
          {monthlyItems.length?monthlyItems.map(renderPeriodItem):<p className="assessment-no-test">Your monthly subject tests will appear here when the programme is created.</p>}
        </section>
        <section className="assessment-period-card">
          <span className="eyebrow">EVERY THREE MONTHS</span><h3>Quarterly examinations</h3>
          <p>One examination per registered subject, covering the wider term or quarter's learning.</p>
          {quarterlyItems.length?quarterlyItems.map(renderPeriodItem):<p className="assessment-no-test">Your quarterly examinations will appear here when the programme is created.</p>}
        </section>
      </div>
      {conflicts.length>0&&<div className="assessment-conflicts"><strong>Scheduling capacity needs attention</strong>{conflicts.map((item,index)=><p key={index}>{item.periodType==="monthly"?"Monthly: ":item.periodType==="quarterly"?"Quarterly: ":"Weekly: "}{item.reason==="daily_workload_limit_exceeded"?item.day+" exceeds your daily workload target ("+item.requiredMinutes+" minutes planned; target "+item.limitMinutes+" minutes).":(item.subjectName||"A subject")+" could not be scheduled within the available periods"+(item.requiredMinutes?" ("+item.requiredMinutes+" minutes needed)":"")+". Add more free time or adjust your availability."}</p>)}</div>}
      {generating&&<p className="assessment-next-batch-hint">Study Space is preparing your stored assessments automatically. You can continue using the app while this runs.</p>}
      <div className="assessment-plan-footer"><span><CheckCircle2 size={15}/> Your tests are stored independently of live MIΛ chat.</span><button type="button" className="text-button" onClick={onOpenAssignments}>Open my assessments →</button></div>
    </section>
  </section>;
}
