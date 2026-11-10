import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { showStudyspaceNotification } from "../lib/studyspaceNotifications";

type Nudge={slot:"morning"|"afternoon"|"evening";title:string;body:string};

export default function StudyspaceDailyNudges(){
  const [userId,setUserId]=useState("");
  useEffect(()=>{
    if(!supabase)return;
    let live=true;
    void supabase.auth.getUser().then(({data})=>{if(live)setUserId(data.user?.id||"");});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUserId(session?.user?.id||""));
    return()=>{live=false;subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    if(!supabase||!userId)return;
    let running=false;
    const check=async()=>{
      if(running||document.visibilityState!=="visible"||!("Notification" in window)||Notification.permission!=="granted")return;
      running=true;
      try{
        const {data,error}=await supabase!.rpc("claim_due_studyspace_mia_nudges");
        if(error)return;
        const rows=(data||[]) as Nudge[];
        for(const nudge of rows){
          const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Mbabane"}).format(new Date());
          await showStudyspaceNotification(userId,"study_reminders",nudge.title,nudge.body,
            "studyspace-mia-"+day+"-"+nudge.slot,import.meta.env.BASE_URL+"favicon.svg");
        }
      }finally{running=false;}
    };
    void check();
    const timer=window.setInterval(()=>void check(),60000);
    const onFocus=()=>void check();
    document.addEventListener("visibilitychange",onFocus);
    window.addEventListener("focus",onFocus);
    return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",onFocus);window.removeEventListener("focus",onFocus);};
  },[userId]);
  return null;
}
