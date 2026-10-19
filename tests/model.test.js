import test from 'node:test';
import assert from 'node:assert/strict';
const model = await import('../model.js').catch(() => ({}));
test('both supplied workout programs retain all exercises and their prescriptions', () => {
  assert.equal(typeof model.initialState, 'function');
  const s=model.initialState();
  assert.equal(s.plans.A.items.length,6); assert.equal(s.plans.B.items.length,7);
  assert.equal(s.exercises[s.plans.A.items[0].exerciseId].name,'Приседания в Смите');
  assert.equal(s.plans.A.items[0].sets,'3'); assert.equal(s.plans.A.items[0].reps,'10–12');
  assert.equal(s.plans.B.items[6].optional,true);
  assert.match(s.exercises[s.plans.B.items[6].exerciseId].description,/поясниц/);
  assert.equal(s.plans.A.items[4].exerciseId,s.plans.B.items[3].exerciseId);
  assert.equal(s.plans.A.items[4].sets,'2'); assert.equal(s.plans.B.items[3].sets,'3');
});
test('status is isolated by date and workout and toggles off on repeated selection',()=>{
  const s=model.initialState(); const id=s.plans.A.items[0].exerciseId;
  model.setStatus(s,'2026-10-19','A',id,'done');
  assert.equal(model.getStatus(s,'2026-10-19','A',id),'done');
  assert.equal(model.getStatus(s,'2026-10-19','B',id),'pending');
  assert.equal(model.getStatus(s,'2026-10-20','A',id),'pending');
  model.setStatus(s,'2026-10-19','A',id,'done');
  assert.equal(model.getStatus(s,'2026-10-19','A',id),'pending');
});
test('new exercise and its workout prescription survive serialization',()=>{
  const s=model.initialState();
  const id=model.saveExercise(s,{name:' Тест ',body:[' Ноги ','Ноги'],description:'Текст',cover:'',sets:'2',reps:'12'},'B');
  const restored=model.restoreState(JSON.stringify(s));
  assert.equal(restored.exercises[id].name,'Тест'); assert.deepEqual(restored.exercises[id].body,['Ноги']);
  assert.equal(restored.plans.B.items.at(-1).exerciseId,id);
  assert.equal(restored.plans.B.items.at(-1).sets,'2');
});
test('editing shared exercise preserves workout-specific sets and existing marks',()=>{
  const s=model.initialState(),id='chest';
  model.setStatus(s,'2026-10-19','A',id,'done');
  model.saveExercise(s,{id,name:'Жим',body:['Грудь'],description:'Правка',cover:'',sets:'4',reps:'8'},'A');
  assert.equal(s.plans.A.items[4].sets,'4'); assert.equal(s.plans.B.items[3].sets,'3');
  assert.equal(model.getStatus(s,'2026-10-19','A',id),'done');
});
test('unsafe URLs and empty names rejected without changing state',()=>{
  const s=model.initialState(),before=JSON.stringify(s);
  assert.throws(()=>model.saveExercise(s,{name:' ',body:[],cover:''},'A'));
  assert.throws(()=>model.saveExercise(s,{name:'X',body:[],cover:'javascript:alert(1)'},'A'));
  assert.throws(()=>model.saveExercise(s,{name:'X',body:[],cover:'data:text/html,<script>'},'A'));
  assert.equal(JSON.stringify(s),before);
});
test('malformed storage is rejected; valid storage preserves all edits',()=>{
  assert.equal(model.restoreState('{'),null); assert.equal(model.restoreState('{"version":1}'),null);
  const s=model.initialState(); s.exercises.smith.name='Изменено';
  assert.equal(model.restoreState(JSON.stringify(s)).exercises.smith.name,'Изменено');
  s.plans.A.items[0].exerciseId='missing'; assert.equal(model.restoreState(JSON.stringify(s)),null);
});
test('storage errors are surfaced without throwing or claiming success',()=>{
  const blocked={setItem(){throw new Error('QuotaExceededError');}};
  assert.equal(model.persist(blocked,model.initialState()),false);
});
test('import rejects unknown status strings and mismatched exercise identifiers',()=>{
  const s=model.initialState(); s.sessions['2026-10-19:A']={smith:'<img src=x onerror=alert(1)>'};
  assert.equal(model.restoreState(JSON.stringify(s)),null);
  s.sessions={};s.exercises.smith.id='not-smith';
  assert.equal(model.restoreState(JSON.stringify(s)),null);
});
