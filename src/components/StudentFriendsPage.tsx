import { useEffect, useMemo, useState } from "react";
import {
  Check, Clock3, MessageCircle, RefreshCw,
  Search, ShieldCheck, Sparkles, UserCheck, UserPlus, Users, X
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./StudentFriendsPage.css";

type FriendRecord = {
  request_id: string;
  learner_id: string;
  display_name: string;
  institution: string;
  education_level: string;
  grade: string;
  curriculum: string;
  country: string;
  status: "pending" | "accepted" | "rejected";
  direction: "incoming" | "outgoing" | "friend" | "closed";
  created_at: string;
};
type LearnerSuggestion = {
  learner_id: string;
  display_name: string;
  institution: string;
  education_level: string;
  grade: string;
  curriculum: string;
  country: string;
  shared_subjects?: number;
  can_invite: boolean;
};
type FriendsView = "suggestions" | "requests" | "friends";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "S";
}
function detailLine(person: { institution?: string; education_level?: string; grade?: string; curriculum?: string; country?: string }) {
  return [person.institution, person.education_level, person.grade, person.curriculum, person.country]
    .map(value => String(value || "").trim()).filter(Boolean).join(" · ") || "StudySpace learner";
}

export default function StudentFriendsPage({ onOpenMessages }: { onOpenMessages: (learnerId: string) => void }) {
  const [userId, setUserId] = useState("");
  const [view, setView] = useState<FriendsView>("suggestions");
  const [connections, setConnections] = useState<FriendRecord[]>([]);
  const [suggestions, setSuggestions] = useState<LearnerSuggestion[]>([]);
  const [searchResults, setSearchResults] = useState<LearnerSuggestion[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async (showSpinner = true) => {
    if (!supabase) {
      setError("StudySpace is not connected. Reconnect and sign in again.");
      setLoading(false);
      return;
    }
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Your student session has expired. Sign in again.");
      setUserId(auth.user.id);
      const [overview, discovery] = await Promise.all([
        supabase.rpc("get_studyspace_friend_overview"),
        supabase.rpc("get_studyspace_friend_suggestions", { p_limit: 18 })
      ]);
      if (overview.error) throw overview.error;
      if (discovery.error) throw discovery.error;
      setConnections((overview.data ?? []) as FriendRecord[]);
      setSuggestions((discovery.data ?? []) as LearnerSuggestion[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your friends could not be loaded.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase.channel("student-friends-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_connections" }, () => {
        void refresh(false);
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    let alive = true;
    const runSearch = async () => {
      const query = search.trim();
      if (!supabase || query.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const { data, error: searchError } = await supabase.rpc("search_studyspace_learners", { p_query: query });
      if (!alive) return;
      if (searchError) setError(searchError.message);
      else setSearchResults((data ?? []) as LearnerSuggestion[]);
      setSearching(false);
    };
    const handle = window.setTimeout(() => void runSearch(), 250);
    return () => { alive = false; window.clearTimeout(handle); };
  }, [search]);

  const friends = useMemo(() => connections.filter(row => row.status === "accepted" && row.direction === "friend"), [connections]);
  const incoming = useMemo(() => connections.filter(row => row.status === "pending" && row.direction === "incoming"), [connections]);
  const outgoing = useMemo(() => connections.filter(row => row.status === "pending" && row.direction === "outgoing"), [connections]);
  const people = search.trim().length >= 2 ? searchResults : suggestions;

  const currentConnection = (learnerId: string) =>
    connections.find(row => row.learner_id === learnerId);

  async function sendRequest(person: LearnerSuggestion) {
    if (!supabase || !userId || !person.can_invite || busyId) return;
    setBusyId(person.learner_id);
    setError("");
    setNotice("");
    const { error: insertError } = await supabase.from("student_connections").insert({
      requester_id: userId,
      addressee_id: person.learner_id,
      status: "pending"
    });
    if (insertError) setError(insertError.message);
    else {
      setNotice("Friend request sent. You will be notified when they respond.");
      await refresh(false);
    }
    setBusyId("");
  }

  async function respond(request: FriendRecord, accept: boolean) {
    if (!supabase || busyId) return;
    setBusyId(request.request_id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.from("student_connections")
      .update({ status: accept ? "accepted" : "rejected", updated_at: new Date().toISOString() })
      .eq("id", request.request_id)
      .eq("status", "pending");
    if (updateError) setError(updateError.message);
    else {
      setNotice(accept ? "Friend request accepted. You can now message each other." : "Friend request declined.");
      await refresh(false);
    }
    setBusyId("");
  }

  const personCard = (person: LearnerSuggestion) => {
    const connection = currentConnection(person.learner_id);
    const connected = connection?.status === "accepted";
    const pending = connection?.status === "pending";
    const closed = connection?.status === "rejected";
    return <article className="student-friend-card" key={person.learner_id}>
      <span className="student-friend-avatar" aria-hidden="true">{initials(person.display_name)}</span>
      <div className="student-friend-copy">
        <strong>{person.display_name}</strong>
        <span>{detailLine(person)}</span>
        <small>
          {person.shared_subjects ? person.shared_subjects + " shared subject" + (person.shared_subjects === 1 ? "" : "s") : "Suggested StudySpace connection"}
          {!person.can_invite ? " · Guardian approval required" : ""}
        </small>
      </div>
      <div className="student-friend-actions">
        {connected
          ? <span className="student-friend-status"><UserCheck size={14}/> Friends</span>
          : pending
            ? <span className="student-friend-status is-pending"><Clock3 size={14}/> Request pending</span>
            : closed
              ? <span className="student-friend-status is-muted"><X size={14}/> Request closed</span>
              : !person.can_invite
              ? <span className="student-friend-status is-muted"><ShieldCheck size={14}/> Not available yet</span>
              : <button type="button" className="primary-button" disabled={busyId === person.learner_id || Boolean(busyId)} onClick={() => void sendRequest(person)}>
                  <UserPlus size={15}/>{busyId === person.learner_id ? "Sending…" : "Add friend"}
                </button>}
      </div>
    </article>;
  };

  const relationCard = (person: FriendRecord, kind: "incoming" | "outgoing" | "friend") =>
    <article className="student-friend-card" key={person.request_id}>
      <span className="student-friend-avatar" aria-hidden="true">{initials(person.display_name)}</span>
      <div className="student-friend-copy">
        <strong>{person.display_name}</strong>
        <span>{detailLine(person)}</span>
        <small>{kind === "incoming" ? "Sent you a friend request" : kind === "outgoing" ? "Friend request sent" : "StudySpace friend"}</small>
      </div>
      <div className="student-friend-actions">
        {kind === "incoming" ? <>
          <button type="button" className="primary-button" disabled={Boolean(busyId)} onClick={() => void respond(person, true)}>
            <Check size={15}/>{busyId === person.request_id ? "Saving…" : "Accept"}
          </button>
          <button type="button" className="secondary-button" disabled={Boolean(busyId)} onClick={() => void respond(person, false)}>
            <X size={15}/>Decline
          </button>
        </> : kind === "outgoing"
          ? <span className="student-friend-status is-pending"><Clock3 size={14}/> Awaiting response</span>
          : <button type="button" className="secondary-button" onClick={() => onOpenMessages(person.learner_id)}>
              <MessageCircle size={15}/>Message
            </button>}
      </div>
    </article>;

  return <section className="student-friends-page">
    <header className="student-friends-heading">
      <div>
        <span className="eyebrow"><Users size={14}/> YOUR STUDYSPACE COMMUNITY</span>
        <h2>Friends</h2>
        <p>Find classmates, accept requests and stay connected with other learners.</p>
      </div>
      <button type="button" className="secondary-button" onClick={() => void refresh()} disabled={loading}>
        <RefreshCw size={15}/>{loading ? "Refreshing…" : "Refresh"}
      </button>
    </header>

    <div className="student-friends-stats">
      <div><Users size={17}/><strong>{friends.length}</strong><span>Friends</span></div>
      <div><UserPlus size={17}/><strong>{incoming.length}</strong><span>Requests for you</span></div>
      <div><Clock3 size={17}/><strong>{outgoing.length}</strong><span>Sent requests</span></div>
    </div>

    <nav className="student-friends-tabs" aria-label="Friends sections">
      <button type="button" className={view === "suggestions" ? "is-active" : ""} onClick={() => setView("suggestions")}>
        <Sparkles size={15}/> People you may know
      </button>
      <button type="button" className={view === "requests" ? "is-active" : ""} onClick={() => setView("requests")}>
        <UserPlus size={15}/> Friend requests {incoming.length > 0 && <i>{incoming.length}</i>}
      </button>
      <button type="button" className={view === "friends" ? "is-active" : ""} onClick={() => setView("friends")}>
        <Users size={15}/> Your friends
      </button>
    </nav>

    {view === "suggestions" && <>
      <label className="student-friends-search">
        <Search size={17}/>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by student name or Student ID" aria-label="Search students by name or Student ID"/>
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={15}/></button>}
      </label>
      <div className="student-friends-section-heading">
        <div><strong>{search.trim().length >= 2 ? "Search results" : "People you may know"}</strong>
          <span>{search.trim().length >= 2 ? "Search by full name, preferred name or Student ID." : "Suggestions are ranked by shared school details and subjects."}</span>
        </div>
        {!search && <span className="student-friends-count">{suggestions.length} suggestions</span>}
      </div>
      {error && <p className="student-friends-alert" role="alert">{error}</p>}
      {notice && <p className="student-friends-notice" role="status">{notice}</p>}
      <div className="student-friends-list" aria-live="polite">
        {loading ? <div className="student-friends-empty"><span className="student-friends-loader"/><strong>Finding learners…</strong></div>
          : searching ? <div className="student-friends-empty"><span className="student-friends-loader"/><strong>Searching StudySpace…</strong></div>
          : people.length ? people.map(personCard)
          : <div className="student-friends-empty"><Users size={25}/><strong>{search.trim().length >= 2 ? "No matching learners" : "No suggestions yet"}</strong>
              <span>{search.trim().length >= 2 ? "Try another name or Student ID." : "As more eligible learners join StudySpace, suggested classmates will appear here."}</span>
            </div>}
      </div>
    </>}

    {view === "requests" && <>
      {error && <p className="student-friends-alert" role="alert">{error}</p>}
      {notice && <p className="student-friends-notice" role="status">{notice}</p>}
      <section className="student-friends-request-section">
        <div className="student-friends-section-heading"><div><strong>Requests for you</strong><span>Accept to connect and enable private student messaging.</span></div><span className="student-friends-count">{incoming.length}</span></div>
        <div className="student-friends-list">
          {incoming.length ? incoming.map(person => relationCard(person, "incoming")) : <div className="student-friends-empty"><UserCheck size={24}/><strong>No pending requests</strong><span>New friend requests will appear here.</span></div>}
        </div>
      </section>
      <section className="student-friends-request-section">
        <div className="student-friends-section-heading"><div><strong>Requests you sent</strong><span>These learners have not responded yet.</span></div><span className="student-friends-count">{outgoing.length}</span></div>
        <div className="student-friends-list">
          {outgoing.length ? outgoing.map(person => relationCard(person, "outgoing")) : <div className="student-friends-empty is-compact"><span>No sent requests waiting for a response.</span></div>}
        </div>
      </section>
    </>}

    {view === "friends" && <>
      <div className="student-friends-section-heading"><div><strong>Your friends</strong><span>Only accepted connections can message each other.</span></div><span className="student-friends-count">{friends.length}</span></div>
      {error && <p className="student-friends-alert" role="alert">{error}</p>}
      <div className="student-friends-list">
        {loading ? <div className="student-friends-empty"><span className="student-friends-loader"/><strong>Loading friends…</strong></div>
          : friends.length ? friends.map(person => relationCard(person, "friend"))
          : <div className="student-friends-empty"><Users size={25}/><strong>Your friend list is ready</strong><span>Add classmates from “People you may know” or search for someone using their name or Student ID.</span>
              <button type="button" className="secondary-button" onClick={() => setView("suggestions")}><Sparkles size={14}/>Find friends</button>
            </div>}
      </div>
    </>}
  </section>;
}
