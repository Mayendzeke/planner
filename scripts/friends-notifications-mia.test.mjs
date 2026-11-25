import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const app = read("src/App.tsx");
const friends = read("src/components/StudentFriendsPage.tsx");
const notifications = read("src/components/StudentNotificationCenter.tsx");
const mia = read("src/components/MiaChat.tsx");
const miaLayout = read("src/components/MiaFullscreen.css");
const messagePage = read("src/components/StudentMessagesPage.tsx");
const preferencePanel = read("src/components/NotificationPreferencesPanel.tsx");

test("student navigation exposes a dedicated Friends destination", () => {
  assert.match(app, /type Page = [^;]*"Friends"/);
  assert.match(app, /\{ name: "Friends", icon: Users \}/);
  assert.match(app, /<StudentFriendsPage onOpenMessages=/);
});

test("Friends uses the guarded server discovery and name or Student ID search RPCs", () => {
  assert.match(friends, /get_studyspace_friend_overview/);
  assert.match(friends, /get_studyspace_friend_suggestions/);
  assert.match(friends, /search_studyspace_learners/);
  assert.match(friends, /placeholder="Search by student name or Student ID"/);
  assert.match(friends, /student-friend-card/);
  assert.match(friends, /People you may know/);
  assert.match(friends, /Friend requests/);
  assert.match(friends, /Your friends/);
});

test("Friends can open a direct conversation without re-searching the person", () => {
  assert.match(app, /setMessageInitialContactId\(learnerId\)/);
  assert.match(app, /<StudentMessagesPage initialContactId=\{messageInitialContactId\}/);
  assert.match(messagePage, /initialContactId\?: string/);
  assert.match(messagePage, /setSelected\(initialContactId\)/);
});

test("persistent notifications can be opened, refreshed and marked read", () => {
  assert.match(notifications, /from\("studyspace_notifications"\)/);
  assert.match(notifications, /markAllRead/);
  assert.match(notifications, /read_at/);
  assert.match(notifications, /student-notification-center-/);
  assert.match(app, /<StudentNotificationCenter onNavigate=/);
  assert.doesNotMatch(mia, /StudentNotificationCenter/);
});

test("student settings include friend-request notification preferences", () => {
  assert.match(preferencePanel, /friend_requests/);
  assert.match(preferencePanel, /Friends and connection requests/);
});

test("MIΛ is a dedicated full-screen learning workspace with clear grouped entry points", () => {
  assert.match(miaLayout, /\.app-shell-mia/);
  assert.match(miaLayout, /100dvh/);
  assert.match(miaLayout, /position: fixed !important/);
  assert.match(miaLayout, /flex: 1 1 0 !important/);
  assert.match(miaLayout, /overflow-y: auto !important/);
  assert.match(miaLayout, /safe-area-inset-bottom/);
  assert.match(miaLayout, /mia-help-groups/);
  assert.match(mia, /Understand and learn/);
  assert.match(mia, /Practise and prepare/);
  assert.match(mia, /Build your study tools/);
  assert.match(mia, /Plan and research/);
  assert.match(mia, /mia-visual-flashcards/);
  assert.match(mia, /mia-composer/);
});


test("MIΛ is mounted behind a recoverable render boundary and tolerates stale learner data", () => {
  assert.match(app, /class MiaChatErrorBoundary/);
  assert.match(app, /<MiaChatErrorBoundary><MiaChat/);
  assert.match(mia, /Array\.isArray\(suppliedSubjects\)/);
  assert.match(mia, /typeof profile\?\.preferredName === "string"/);
});
