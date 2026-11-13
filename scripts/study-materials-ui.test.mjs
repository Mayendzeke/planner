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

test('student navigation prioritises messages and gives the menu its own scroll area', () => {
  const ordered = ['Overview','Today\\'s Session','MIΛ','Messages','Subjects','Planner','Timetable','Study & Exams','Study Materials & Resources'];
  let previous = -1;
  for (const label of ordered) {
    const current = app.indexOf('name: "' + label + '"');
    assert.ok(current > previous, label + ' should be ordered by student importance');
    previous = current;
  }
  assert.match(styles, /\\.app-shell > \\.sidebar \\.main-nav[\\s\\S]*?overflow-y:\\s*auto/);
  assert.match(styles, /\\.app-shell > \\.sidebar \\.sidebar-bottom[\\s\\S]*?margin-top:\\s*auto/);
  assert.match(app, /page==="Study Materials & Resources"&&<StudentLibrary/);
});

test('student uploads accept common office, spreadsheet, image and text formats', () => {
  for (const extension of ['.pdf','.pptx','.ppt','.docx','.doc','.xlsx','.xls','.csv','.jpg','.jpeg','.png','.webp','.txt','.rtf']) {
    assert.ok(library.includes('"' + extension + '"'), 'Student Library must allow ' + extension);
  }
  assert.match(library, /type="file" multiple/);
  assert.match(library, /onDrop={onDrop}/);
  assert.match(library, /MAX_FILE_SIZE = 25 \\* 1024 \\* 1024/);
  assert.match(library, /MAX_BATCH_SIZE = 100 \\* 1024 \\* 1024/);
});

test('teacher-assigned and personal materials retain private storage and sync handling', () => {
  assert.match(library, /resource_assignments/);
  assert.match(library, /learning_resources/);
  assert.match(library, /sync privately/);
  assert.match(library, /downloadResource/);
  assert.match(sync, /normalisePersonalResourceType/);
  assert.match(db, /Worksheet.*Past paper.*Reference.*Other/);
});

test('modern Office documents and CSV have text or table previews', () => {
  assert.match(preview, /ppt\\/slides\\/slide/);
  assert.match(preview, /word\\/document\\.xml/);
  assert.match(preview, /worksheets\\/sheet/);
  assert.match(preview, /parseCsv/);
  assert.match(library, /Preview not available/);
  assert.match(library, /Download original file/);
});

test('independent study retains session controls and gains the refreshed visual hierarchy', () => {
  assert.match(solo, /solo-study-hero/);
  assert.match(solo, /solo-study-roadmap/);
  assert.match(solo, /Finish and save session/);
  assert.match(styles, /\\.solo-study-hero/);
  assert.match(styles, /\\.solo-study-roadmap/);
});
