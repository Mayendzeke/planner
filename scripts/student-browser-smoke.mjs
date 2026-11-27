import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const previewUrl = "http://127.0.0.1:4173/planner/";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://tibcoottzstnqkfpwabk.supabase.co";
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const learnerId = "4d4ca4a1-4c45-4a3e-a5d6-8ebc10f73b15";
const nowSeconds = Math.floor(Date.now() / 1000);
const user = {
  id: learnerId,
  aud: "authenticated",
  role: "authenticated",
  email: "browser-qa@studyspace.invalid",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  app_metadata: { provider: "email", providers: ["email"], must_change_password: false },
  user_metadata: { full_name: "StudySpace QA Learner", preferred_name: "QA Learner" },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const accessToken = [
  encode({ alg: "HS256", typ: "JWT" }),
  encode({
    sub: learnerId,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    iat: nowSeconds,
    exp: nowSeconds + 7200,
  }),
  "browser-smoke-signature",
].join(".");
const session = {
  access_token: accessToken,
  refresh_token: "browser-smoke-refresh-token",
  token_type: "bearer",
  expires_in: 7200,
  expires_at: nowSeconds + 7200,
  user,
};

const profile = {
  id: learnerId,
  role: "student",
  student_id: "STU-QA123456",
  account_status: "active",
  date_of_birth: "2000-01-01",
  subscription_tier: "Monthly",
  subscription_expires_at: "2099-12-31T23:59:59.000Z",
  trial_started_at: null,
  trial_expires_at: null,
  trial_reminder_shown_at: null,
  terms_accepted_at: "2026-11-24T10:00:00.000Z",
  terms_version: "2026-11-24-v9",
  full_name: "StudySpace QA Learner",
  preferred_name: "QA Learner",
  country: "Eswatini",
  institution: "StudySpace QA School",
  course: "",
  education_level: "Secondary High",
  institution_type: "School",
  qualification_level: "",
  grade: "Form 4",
  curriculum: "Eswatini",
  academic_year: "2026",
  avatar_path: null,
  sex: "male",
  profile_setup_dismissed_at: null,
};
const goal = {
  learner_id: learnerId,
  goal_text: "Improve my marks",
  target_mark: 80,
  weekly_hours: 8,
  preferred_days: ["Saturday", "Sunday"],
};
const subjects = [
  { learner_id: learnerId, name: "Mathematics" },
  { learner_id: learnerId, name: "English" },
];

async function waitForPreview(server) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Vite preview exited before it became ready.");
    try {
      const response = await fetch(previewUrl);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await delay(500);
  }
  throw new Error("Vite preview did not become ready within 45 seconds.");
}

async function main() {
  const server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
    stdio: "inherit",
    env: process.env,
  });
  let browser;

  try {
    await waitForPreview(server);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      serviceWorkers: "block",
      reducedMotion: "reduce",
    });

    await context.addInitScript(({ storageKey, persistedSession }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(persistedSession));
      window.localStorage.setItem("studyspace-theme", "dark");
      window.localStorage.setItem("studyspace-sidebar-collapsed", "false");
    }, {
      storageKey: `sb-${projectRef}-auth-token`,
      persistedSession: session,
    });

    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin !== supabaseUrl) {
        await route.continue();
        return;
      }

      const path = requestUrl.pathname;
      const method = route.request().method();

      if (path === "/auth/v1/user") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) });
        return;
      }
      if (path === "/rest/v1/profiles") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(profile) });
        return;
      }
      if (path === "/rest/v1/student_goals") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(goal) });
        return;
      }
      if (path === "/rest/v1/student_subjects") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(subjects) });
        return;
      }
      if (path.startsWith("/rest/v1/rpc/")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
        return;
      }
      if (path.startsWith("/rest/v1/")) {
        await route.fulfill({
          status: method === "DELETE" ? 204 : 200,
          contentType: "application/json",
          body: method === "DELETE" ? "" : "[]",
        });
        return;
      }
      if (path.startsWith("/functions/v1/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], messages: [], notifications: [] }),
        });
        return;
      }
      if (path.startsWith("/storage/v1/")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
        return;
      }
      await route.continue();
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await page.locator(".app-shell").waitFor({ state: "visible", timeout: 45_000 });
    assert.equal(await page.locator(".page-content").getAttribute("data-page"), "Overview", "The authenticated learner should land on Overview.");

    const sidebar = page.locator("#student-navigation-drawer");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await page.waitForFunction(() => document.querySelector(".app-shell")?.classList.contains("app-shell-sidebar-collapsed"));
    assert.equal(await page.evaluate(() => localStorage.getItem("studyspace-sidebar-collapsed")), "true", "Sidebar collapse preference should persist.");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await page.waitForFunction(() => !document.querySelector(".app-shell")?.classList.contains("app-shell-sidebar-collapsed"));

    const destinations = [
      "Today's Session",
      "Learning Studio",
      "Languages",
      "MIΛ",
      "Subjects",
      "Labs",
      "Study & Exams",
      "Study Materials & Resources",
      "Planner",
      "Timetable",
      "Academic Calendar",
      "Progress",
      "Messages",
      "Friends",
      "Testimonials",
      "Help & feedback",
      "Subscription",
    ];

    for (const destination of destinations) {
      await sidebar.getByRole("button", { name: destination, exact: true }).click();
      await page.waitForFunction(
        (expected) => document.querySelector(".page-content")?.getAttribute("data-page") === expected,
        destination,
      );
      assert.equal(
        await page.locator(".page-content").getAttribute("data-page"),
        destination,
        `Navigation should open the ${destination} screen.`,
      );
      if (destination === "Languages") {
        await page.getByRole("heading", { name: "Learn in your language." }).waitFor({ state: "visible" });
      }
      if (destination === "MIΛ") {
        // MIΛ is intentionally full-screen and hides the main sidebar until the learner exits.
        await page.getByRole("button", { name: "Back to StudySpace home" }).click();
        await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "Overview");
      }
    }

    await sidebar.getByRole("button", { name: "Settings and backup", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "Settings");

    const themeOptions = page.locator(".theme-options");
    await themeOptions.getByRole("button", { name: /Light/ }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
    await themeOptions.getByRole("button", { name: /Dark/ }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");

    await sidebar.getByRole("button", { name: "View and edit my profile", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "My profile");

    await page.setViewportSize({ width: 1024, height: 768 });
    assert.equal(await page.getByRole("navigation", { name: "Quick navigation" }).isVisible(), false, "Tablet layout should use the desktop navigation.");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Tablet layout should not overflow horizontally.");

    await page.setViewportSize({ width: 390, height: 844 });
    const quickNav = page.getByRole("navigation", { name: "Quick navigation" });
    assert.equal(await quickNav.isVisible(), true, "Mobile quick navigation should be visible.");
    await quickNav.getByRole("button", { name: "Learn", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "Learning Studio");
    await page.getByRole("button", { name: "More", exact: true }).click();
    assert.ok(
      await sidebar.evaluate((element) => element.classList.contains("sidebar-open")),
      "The mobile More control should open the navigation drawer.",
    );
    await sidebar.getByRole("button", { name: "Study Materials & Resources", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "Study Materials & Resources");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile resources layout should not overflow horizontally.");

    await quickNav.getByRole("button", { name: "Planner", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "Planner");
    await quickNav.getByRole("button", { name: "Tests", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".page-content")?.getAttribute("data-page") === "Study & Exams");
    await quickNav.getByRole("button", { name: "MIΛ", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".app-shell")?.classList.contains("app-shell-mia"));
    assert.ok(await page.locator(".app-shell-mia").count(), "MIΛ should open within its existing full-screen experience.");
    await page.getByRole("button", { name: "Back to StudySpace home" }).click();
    await page.waitForFunction(() => !document.querySelector(".app-shell")?.classList.contains("app-shell-mia"));

    assert.equal(pageErrors.length, 0, `The browser reported uncaught runtime errors: ${pageErrors.join(" | ")}`);
    console.log("Student browser smoke passed: authenticated shell, all desktop destinations, collapse persistence, theme switching, tablet layout, mobile navigation and MIΛ return.");
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
