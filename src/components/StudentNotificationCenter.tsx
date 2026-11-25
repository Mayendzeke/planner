import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell, BookOpen, CalendarDays, Check, CheckCheck, ClipboardCheck,
  MessageCircle, Megaphone, RefreshCw, UserPlus, Users, X
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./StudentNotificationCenter.css";

type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  action_page: string;
  entity_id: string | null;
  created_at: string;
  read_at: string | null;
};

const iconFor = (category: string) => {
  if (category.startsWith("friend_")) return UserPlus;
  if (category === "direct_message") return MessageCircle;
  if (category === "group_message") return Users;
  if (category === "homework_assignment") return BookOpen;
  if (category === "assessment_update") return ClipboardCheck;
  if (category === "timetable_update") return CalendarDays;
  if (category === "system_announcement") return Megaphone;
  return Bell;
};

const relativeTime = (value: string) => {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d ago";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

export default function StudentNotificationCenter({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = useMemo(() => items.filter(item => !item.read_at).length, [items]);

  const refresh = useCallback(async (showLoading = false) => {
    if (!supabase || !userId) return;
    if (showLoading) setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("studyspace_notifications")
      .select("id,category,title,body,action_page,entity_id,created_at,read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (queryError) setError("Notifications could not be refreshed. Please try again.");
    else setItems((data ?? []) as NotificationRow[]);
    if (showLoading) setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) setUserId(data.user?.id || "");
    });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || "");
      setItems([]);
    });
    return () => {
      live = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    void refresh(true);
    const channel = supabase.channel("student-notification-center-" + userId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "studyspace_notifications",
        filter: "user_id=eq." + userId
      }, payload => {
        const row = payload.new as NotificationRow;
        setItems(current => [row, ...current.filter(item => item.id !== row.id)].slice(0, 40));
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "studyspace_notifications",
        filter: "user_id=eq." + userId
      }, payload => {
        const row = payload.new as NotificationRow;
        setItems(current => current.map(item => item.id === row.id ? { ...item, ...row } : item));
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [userId, refresh]);

  async function markRead(item: NotificationRow) {
    if (!supabase || !userId || item.read_at) return;
    const readAt = new Date().toISOString();
    setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: readAt } : row));
    const { error: updateError } = await supabase.from("studyspace_notifications")
      .update({ read_at: readAt }).eq("id", item.id).eq("user_id", userId);
    if (updateError) {
      setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: null } : row));
      setError("This notification could not be marked as read.");
    }
  }

  async function markAllRead() {
    if (!supabase || !userId || unreadCount === 0) return;
    const readAt = new Date().toISOString();
    const previous = items;
    setItems(current => current.map(row => row.read_at ? row : { ...row, read_at: readAt }));
    const { error: updateError } = await supabase.from("studyspace_notifications")
      .update({ read_at: readAt }).eq("user_id", userId).is("read_at", null);
    if (updateError) {
      setItems(previous);
      setError("Unread notifications could not all be marked as read.");
    }
  }

  async function openNotification(item: NotificationRow) {
    await markRead(item);
    setOpen(false);
    onNavigate(item.action_page || "Friends");
  }

  return <div className="student-notification-center">
    <button
      type="button"
      className={"student-notification-trigger" + (open ? " is-open" : "")}
      onClick={() => { const next = !open; setOpen(next); if (next) void refresh(true); }}
      aria-label={unreadCount ? "Notifications, " + unreadCount + " unread" : "Notifications"}
      aria-expanded={open}
      title="Notifications"
    >
      <Bell size={18}/>
      {unreadCount > 0 && <span className="student-notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
    {open && <>
      <button type="button" className="student-notification-dismiss-layer" aria-label="Close notifications" onClick={() => setOpen(false)}/>
      <section className="student-notification-popover" role="dialog" aria-label="Notifications">
        <header className="student-notification-popover-head">
          <div><strong>Notifications</strong><span>{unreadCount ? unreadCount + " unread" : "You're all caught up"}</span></div>
          <div className="student-notification-tools">
            <button type="button" onClick={() => void refresh(true)} disabled={loading} aria-label="Refresh notifications" title="Refresh"><RefreshCw size={15}/></button>
            {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} title="Mark all as read"><CheckCheck size={16}/></button>}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={16}/></button>
          </div>
        </header>
        {error && <p className="student-notification-error" role="alert">{error}</p>}
        <div className="student-notification-items">
          {loading && !items.length ? <div className="student-notification-empty">Loading notifications…</div>
            : items.length ? items.map(item => {
              const Icon = iconFor(item.category);
              return <button type="button" key={item.id}
                className={"student-notification-item" + (!item.read_at ? " is-unread" : "")}
                onClick={() => void openNotification(item)}>
                <span className="student-notification-icon"><Icon size={16}/></span>
                <span className="student-notification-copy">
                  <strong>{item.title}</strong>
                  <small>{item.body}</small>
                  <time>{relativeTime(item.created_at)}</time>
                </span>
                {!item.read_at && <i className="student-notification-unread-dot"/>}
              </button>;
            }) : <div className="student-notification-empty"><Bell size={22}/><strong>No notifications yet</strong><span>Friend requests, messages and new learning activities will appear here.</span></div>}
        </div>
        <footer className="student-notification-footer">
          <button type="button" onClick={() => { setOpen(false); onNavigate("Friends"); }}>Open Friends</button>
          <button type="button" onClick={() => { setOpen(false); onNavigate("Settings"); }}>Notification settings</button>
        </footer>
      </section>
    </>}
  </div>;
}
