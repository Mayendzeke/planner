import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/student-experience.css", import.meta.url), "utf8");
const mia = readFileSync(new URL("../src/components/MiaChat.tsx", import.meta.url), "utf8");

test("desktop sidebar collapses to an icon rail and remembers the student's preference", () => {
  assert.match(app, /studyspace-sidebar-collapsed/);
  assert.match(app, /desktop-sidebar-toggle/);
  assert.match(app, /aria-expanded=\{!sidebarCollapsed\}/);
  assert.match(app, /setSidebarCollapsed\(value => !value\)/);
  assert.match(styles, /app-shell-sidebar-collapsed/);
  assert.match(styles, /width:76px/);
  assert.match(styles, /left:112px/);
});

test("student toolbar is clean and keeps only essential controls", () => {
  const start = app.indexOf('<header className="topbar"');
  const end = app.indexOf("</header>", start);
  assert.ok(start >= 0 && end > start, "Top toolbar is present.");
  const header = app.slice(start, end);
  assert.doesNotMatch(header, /breadcrumb|Workspace|Dashboard/);
  assert.doesNotMatch(header, /Open messages|theme-toggle|Switch theme/);
  assert.match(header, /Search tasks and subjects/);
  assert.match(header, /StudentNotificationCenter/);
  assert.match(header, /top-avatar-button/);
  assert.match(header, /desktop-sidebar-toggle/);
  assert.match(header, /mobile-menu-button/);
});

test("route transitions are subtle and respect reduced motion", () => {
  assert.match(app, /key=\{page\} data-page=\{page\}/);
  assert.match(styles, /@keyframes studyspace-page-enter/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("desktop collapse does not replace the mobile drawer or bottom navigation", () => {
  assert.match(app, /id="student-navigation-drawer"/);
  assert.match(app, /className="mobile-bottom-nav"/);
  assert.match(app, /aria-label="Quick navigation"/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /desktop-sidebar-toggle\{display:none/);
});

test("learning pages expose contextual shortcuts without removing destinations", () => {
  assert.match(app, /page==="Learning Studio"&&<div className="welcome-actions"/);
  assert.match(app, /page==="Today's Session"&&<button type="button" className="secondary-button"/);
  for (const destination of ["Learning Studio", "Languages", "MIΛ", "Subjects", "Labs", "Study & Exams", "Study Materials & Resources", "Planner", "Timetable", "Academic Calendar", "Progress", "Messages", "Friends", "Testimonials", "Help & feedback", "Subscription"]) {
    assert.ok(app.includes('name: "' + destination + '"') || app.includes('name:"' + destination + '"') || app.includes('names: ["' + destination), "Destination remains available: " + destination);
  }
});

test("dashboard launchpad groups learning, resources, planning and assessment destinations", () => {
  for (const label of ["Choose your next step", "Learning Studio", "Ask MIΛ", "My subjects", "Resources", "Study planner", "Timetable", "Assessments", "My progress", "Messages"]) {
    assert.ok(app.includes(label), "Missing dashboard shortcut: " + label);
  }
  assert.match(app, /dashboard-shortcut-grid/);
  assert.match(styles, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:1120px\)/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:420px\)/);
});

test("learning workspace headers include the new language studio", () => {
  assert.ok(app.includes('page==="Learning Studio"?"Your learning studio."'));
  assert.ok(app.includes('page==="Languages"?"Grow your language skills."'));
  assert.ok(app.includes('Practise SiSwati vocabulary, grammar, reading, writing'));
  assert.ok(app.includes('Study, practise, build visual understanding'));
  assert.ok(app.includes('Manage your appearance, reminders, privacy'));
  assert.match(app, /page==="Languages"&&<LanguageLearningHub onStartPractice=\{startMiaWithPrompt\}\/\>/);
});

test("shared page controls use Study Space purple tokens and accessible theme surfaces", () => {
  assert.match(styles, /--brand-button-text/);
  assert.match(styles, /\.app-shell:not\(\.app-shell-mia\) \.primary-button/);
  assert.match(styles, /background:var\(--panel-strong\)/);
  assert.match(styles, /\.study-exams-tabs/);
  assert.match(styles, /\.student-message-layout/);
  assert.match(styles, /\.student-feedback-page/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("dense workspaces retain responsive and touch-scroll layouts", () => {
  assert.match(styles, /\.timetable-grid-scroll/);
  assert.match(styles, /overflow-x:auto/);
  assert.match(styles, /@media\(min-width:761px\) and \(max-width:1000px\)/);
  assert.match(styles, /@media\(max-width:760px\)/);
});

test("MIΛ keeps its approved interface, conversation history navigation and home return", () => {
  assert.match(mia, /mia-exit-button/);
  assert.match(mia, /aria-label="Back to StudySpace home"/);
  assert.match(mia, /className="mia-history-home"/);
  assert.match(mia, /Search MIΛ history/);
  assert.match(styles, /\.app-shell:not\(\.app-shell-mia\)/);
});

test("language studio provides official SiSwati routes and guards its source accuracy", () => {
  const hub = readFileSync(new URL("../src/components/LanguageLearningHub.tsx", import.meta.url), "utf8");
  const hubStyles = readFileSync(new URL("../src/components/LanguageLearningHub.css", import.meta.url), "utf8");
  assert.match(hub, /First Language · 6870/);
  assert.match(hub, /Second Language · 6871/);
  assert.match(hub, /2027-2029|2027–2029/);
  assert.match(hub, /specimen papers and mark schemes/);
  assert.match(hub, /publisher-reported/);
  assert.match(hub, /not ECESWA-prescribed/);
  assert.match(hub, /onStartPractice\(prompt\)/);
  assert.match(hubStyles, /language-resource-grid/);
  assert.match(hubStyles, /@media\(max-width:760px\)/);
});

test("browser-side learning UI contains no provider API secrets", () => {
  const frontend = app + readFileSync(new URL("../src/components/LanguageLearningHub.tsx", import.meta.url), "utf8");
  assert.ok(!frontend.includes("CLOUDFLARE_API_TOKEN"));
  assert.ok(!frontend.includes("GEMINI_API_KEY"));
  assert.ok(!frontend.includes("SUPABASE_SERVICE_ROLE_KEY"));
});
