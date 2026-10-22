import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../model.js';
import {historyView,calendarView} from '../calendar.js';

const day='2026-10-22';
test('daily notes stay separate by workout and date and are included in completion',()=>{
  assert.equal(typeof model.setNote,'function');
  const s=model.initialState(),program=JSON.stringify(s.plans),exercises=JSON.stringify(s.exercises);
  model.setNote(s,day,'A','chest','Последний подход тяжёлый');
  model.setNote(s,day,'A',null,'Хорошее самочувствие');
  model.setNote(s,day,'B','chest','Другой вес');
  assert.equal(model.getNote(s,day,'A','chest'),'Последний подход тяжёлый');
  assert.equal(model.getNote(s,'2026-10-23','A','chest'),'');
  assert.equal(model.getNote(s,day,'B','chest'),'Другой вес');
  const record=model.completeWorkout(s,day,'A');
  assert.equal(record.note,'Хорошее самочувствие');
  assert.equal(record.items.find(i=>i.exerciseId==='chest').note,'Последний подход тяжёлый');
  const restored=model.restoreState(JSON.stringify(s));
  assert.equal(model.getNote(restored,day,'A','chest'),'Последний подход тяжёлый');
  assert.equal(JSON.stringify(s.exercises),exercises);assert.equal(JSON.stringify(s.plans),program);
});
test('historical notes can be edited after the program changes and survive removing completion',()=>{
  assert.equal(typeof model.setNote,'function');
  const s=model.initialState(),record=model.completeWorkout(s,day,'A');
  s.plans.A.items=s.plans.A.items.filter(i=>i.exerciseId!=='smith');
  model.setNote(s,day,'A','smith','Заметка после тренировки');
  model.setNote(s,day,'A',null,'Итог');
  assert.equal(record.items[0].note,'Заметка после тренировки');assert.equal(record.note,'Итог');
  const restored=model.restoreState(JSON.stringify(s));assert.equal(restored.history[`${day}:A`].items[0].note,'Заметка после тренировки');
  model.setNote(s,day,'A','smith','');assert.equal(record.items[0].note,'');
  model.removeCompletion(s,day,'A');assert.equal(model.getNote(s,day,'A',null),'Итог');
});
test('legacy history restores with empty notes without losing snapshots',()=>{
  const s=model.initialState();model.completeWorkout(s,day,'A');delete s.notes;
  delete s.history[`${day}:A`].note;for(const i of s.history[`${day}:A`].items)delete i.note;
  const r=model.restoreState(JSON.stringify(s));
  assert.deepEqual(r.notes,{});assert.equal(r.history[`${day}:A`].note,'');assert.equal(r.history[`${day}:A`].items[0].note,'');
});
test('notes validate input and imported data without changing state on errors',()=>{
  assert.equal(typeof model.setNote,'function');
  const s=model.initialState(),before=JSON.stringify(s);
  for(const args of [[day,'A','missing','x'],['bad','A',null,'x'],[day,'__proto__',null,'x'],[day,'A',null,'x'.repeat(4001)],[day,'A',null,{}]])assert.throws(()=>model.setNote(s,...args));
  assert.equal(JSON.stringify(s),before);
  for(const notes of [[],{[`${day}:A`]:{workout:7,exercises:{}}},{[`${day}:A`]:{workout:'',exercises:{smith:'x'.repeat(4001)}}}]){
    assert.equal(model.restoreState(JSON.stringify({...s,notes})),null);
  }
});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const h={esc,icon:()=>'',nav:()=>'',cover:()=>'',statusLine:()=>'',dose:()=>''};
test('history shows escaped workout and exercise notes, including old exercises',()=>{
  const s=model.initialState(),r=model.completeWorkout(s,day,'A');
  r.note='<img src=x onerror=alert(1)>';r.items[0].note='Техника\nПауза';
  const html=historyView(r,h);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('Техника\nПауза'));assert.ok(html.includes('data-action="edit-note"'));
  assert.ok(calendarView(s,new Date(2026,9,1),day,h).includes('Есть заметки'));
});

test('exercises added after completion can keep daily notes without altering the history snapshot',()=>{
 const s=model.initialState(),record=model.completeWorkout(s,day,'A');
 s.plans.A.items.push({exerciseId:'extension',sets:'3',reps:'12'});
 model.setNote(s,day,'A','extension','Заметка к добавленному упражнению');
 assert.equal(model.getNote(s,day,'A','extension'),'Заметка к добавленному упражнению');
 assert.equal(record.items.length,6);assert.ok(!record.items.some(i=>i.exerciseId==='extension'));
 const restored=model.restoreState(JSON.stringify(s));assert.equal(model.getNote(restored,day,'A','extension'),'Заметка к добавленному упражнению');
});
