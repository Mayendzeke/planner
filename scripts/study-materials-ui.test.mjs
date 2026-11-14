import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const styles = read('src/styles.css');
const library = read('src/components/StudentLibrary.tsx');
const preview = read('src/lib/studyMaterialPreview.ts');
const db = read('src/data/db.ts');
const sync = read('src/lib/cloudSync.ts');
const solo = read('src/components/SoloStudyCoach.tsx');

test('student navigation prioritises Messages and keeps Settings reachable', () => {
  const ordered = [
    'name: "Overview"',
    'name: "Today\'s Session"',
    'name: "MIΛ"',
    'name: "Messages"',
    'name: "Subjects"',
    'name: "Planner"',
    'name: "Timetable"',
    'name: "Study & Exams"',
    'name: "Study Materials & Resources"',
  ];
  let previous = -1;
  for (const label of ordered) {
    const current = app.indexOf(label);
    assert.ok(current > previous, label + ' should be ordered by student importance');
    previous = current;
  }
  assert.ok(app.includes('<div className="sidebar-nav-slot">'));
  assert.ok(app.includes('<nav className="main-nav" aria-label="Main navigation">'));
  assert.ok(styles.includes('.app-shell > .sidebar > .sidebar-nav-slot'));
  assert.ok(styles.includes('flex:1 1 0%'));
  assert.ok(styles.includes('min-height:0'));
  assert.ok(styles.includes('overflow-y:auto'));
  assert.ok(styles.includes('overscroll-behavior-y:contain'));
  assert.ok(styles.includes('.app-shell > .sidebar > .sidebar-bottom'));
  assert.ok(styles.includes('flex:0 0 auto'));
  assert.ok(app.includes('page==="Study Materials & Resources"&&<StudentLibrary'));
});

test('student uploads support common Office, spreadsheet, image and text formats', () => {
  for (const extension of ['.pdf','.pptx','.ppt','.docx','.doc','.xlsx','.xls','.csv','.jpg','.jpeg','.png','.webp','.txt','.rtf']) {
    assert.ok(library.includes('"' + extension + '"'), 'Student Library must allow ' + extension);
  }
  assert.ok(library.includes('type="file" multiple'));
  assert.ok(library.includes('onDrop={onDrop}'));
  assert.ok(library.includes('MAX_FILE_SIZE = 25 * 1024 * 1024'));
  assert.ok(library.includes('MAX_BATCH_SIZE = 100 * 1024 * 1024'));
});

test('teacher-assigned resources remain separate from private student materials', () => {
  assert.ok(library.includes('resource_assignments'));
  assert.ok(library.includes('learning_resources'));
  assert.ok(library.includes('sync privately'));
  assert.ok(library.includes('downloadResource'));
  assert.ok(sync.includes('normalisePersonalResourceType'));
  assert.ok(db.includes('Worksheet') && db.includes('Past paper') && db.includes('Reference') && db.includes('Other'));
});

test('modern Office files and CSV have in-app preview extraction with download fallback', () => {
  assert.ok(preview.includes('ppt') && preview.includes('slides'));
  assert.ok(preview.includes('word/document.xml'));
  assert.ok(preview.includes('worksheets') && preview.includes('sheet'));
  assert.ok(preview.includes('parseCsv'));
  assert.ok(library.includes('Preview not available'));
  assert.ok(library.includes('Download original file'));
});

test('independent study retains its session controls and gains the refreshed visual hierarchy', () => {
  assert.ok(solo.includes('solo-study-hero'));
  assert.ok(solo.includes('solo-study-roadmap'));
  assert.ok(solo.includes('Finish and save session'));
  assert.ok(styles.includes('.solo-study-hero'));
  assert.ok(styles.includes('.solo-study-roadmap'));
});

test('PowerPoint files use a native slide viewer with images, thumbnails and navigation', () => {
  const powerpoint = read('src/components/PowerPointDocumentViewer.tsx');
  assert.ok(library.includes('lazy(() => import("./PowerPointDocumentViewer"))'));
  assert.ok(library.includes('extension === ".pptx" || extension === ".ppt"'));
  assert.ok(library.includes('kind: "powerpoint"'));
  assert.ok(library.includes('preview.kind==="powerpoint"'));
  assert.ok(powerpoint.includes('ReactPptxViewer'));
  assert.ok(powerpoint.includes('source={file}'));
  assert.ok(powerpoint.includes('showThumbnails'));
  assert.ok(powerpoint.includes('showToolbar'));
  assert.ok(powerpoint.includes('showDiagnostics'));
  assert.ok(powerpoint.includes('@extend-ai/react-pptx/styles.css'));
  assert.ok(powerpoint.includes('ViewerErrorBoundary'));
  assert.ok(powerpoint.includes('Embedded pictures'));
});


test('Learning Studio connects study tools without replacing existing student workspaces', () => {
  const studio = read('src/components/LearningStudio.tsx');
  assert.ok(app.includes('name: "Learning Studio"'));
  assert.ok(app.includes('page==="Learning Studio"&&profile&&<LearningStudio'));
  assert.ok(studio.includes('onOpenAssessments'));
  assert.ok(studio.includes('onOpenMaterials'));
  for (const action of ['Explain this topic','Teach me step by step','Quiz me','Make flashcards','Visual explanation','Build revision plan']) {
    assert.ok(studio.includes(action), 'Learning Studio must offer ' + action);
  }
  assert.ok(studio.includes('studyspace-learning-studio-v1'));
  assert.ok(studio.includes('nextReviewAt'));
  assert.ok(studio.includes('setRecords'));
  assert.ok(studio.includes('learning-studio-concept-map'));
  assert.ok(studio.includes('Check my answer'));
  assert.ok(studio.includes('learning-studio-number-line'));
  assert.ok(studio.includes('Daily challenge'));
  assert.ok(studio.includes('Find my weak areas'));
  assert.ok(studio.includes('Previous recall confidence'));
  assert.ok(studio.includes('setInterval(() => setNow(Date.now()), 60_000)'));
  assert.ok(studio.includes('type=\"range\"'));
  assert.ok(styles.includes('.learning-studio-hero'));
  assert.ok(styles.includes('.learning-studio-record-list'));
});

test('MIΛ accepts prompt-only handoffs and PowerPoint previews can open a slide-aware tutor request', () => {
  const mia = read('src/components/MiaChat.tsx');
  assert.ok(mia.includes('if (!initialAttachment && !initialPrompt) return;'));
  assert.ok(mia.includes('if (initialPrompt) setText(initialPrompt);'));
  assert.ok(library.includes('Ask MIΛ about these slides'));
  assert.ok(library.includes('Do not skip slide visuals.'));
});
