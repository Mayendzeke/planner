import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const mia = read('src/components/MiaChat.tsx');
const library = read('src/components/StudentLibrary.tsx');

test('student library opens MIΛ with the selected resource attached and a study prompt', () => {
  assert.ok(app.includes('startMiaWithResource'));
  assert.ok(app.includes('onAskMia={startMiaWithResource}'));
  assert.ok(app.includes('initialAttachment={miaResourceStart?.file}'));
  assert.ok(mia.includes('initialAttachment?: File | null'));
  assert.ok(mia.includes('setAttachment(initialAttachment)'));
  assert.ok(mia.includes('setText(initialPrompt)'));
  assert.ok(mia.includes('onAttachmentConsumed?.()'));
  assert.ok(library.includes('Study with MIΛ'));
  assert.ok(library.includes('MIA_STUDY_PROMPT'));
  assert.ok(library.includes('studyTeacherFileWithMia'));
});

test('MIΛ shortcut respects the existing 4 MB attachment limit and supported formats', () => {
  assert.ok(library.includes('MIA_ATTACHMENT_LIMIT = 4 * 1024 * 1024'));
  for (const ext of ['.pdf','.txt','.md','.csv','.json','.xml','.html','.docx','.pptx','.xlsx','.jpg','.jpeg','.png','.webp']) {
    assert.ok(library.includes('"' + ext + '"'), 'MIΛ shortcut should support ' + ext);
  }
  assert.ok(library.includes('size <= MIA_ATTACHMENT_LIMIT'));
  assert.ok(mia.includes('file.size>4*1024*1024'));
});
