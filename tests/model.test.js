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
test('import requires display labels to be strings',()=>{
  const s=model.initialState();s.plans.A.name={bad:true};
  assert.equal(model.restoreState(JSON.stringify(s)),null);
});

test('weights accept decimal commas and zero and remain separate for each date and plan',()=>{
  const s=model.initialState();
  model.setWeight(s,'2026-10-19','A','chest','12,5');
  model.setWeight(s,'2026-10-19','B','chest','0');
  assert.equal(model.getWeight(s,'2026-10-19','A','chest'),12.5);
  assert.equal(model.getWeight(s,'2026-10-19','B','chest'),0);
  assert.equal(model.getWeight(s,'2026-10-20','A','chest'),'');
  assert.throws(()=>model.setWeight(s,'2026-10-19','A','chest','-5'));
  assert.throws(()=>model.setWeight(s,'2026-10-19','A','chest','NaN'));
  model.setWeight(s,'2026-10-19','A','chest','');
  assert.equal(model.getWeight(s,'2026-10-19','A','chest'),'');
});
test('completed workouts retain exercise snapshots, weights and individual statuses',()=>{
  const s=model.initialState();
  model.setWeight(s,'2026-10-19','A','smith','30');
  model.setStatus(s,'2026-10-19','A','smith','done');
  model.setStatus(s,'2026-10-19','A','curl','skipped');
  const record=model.completeWorkout(s,'2026-10-19','A');
  assert.equal(record.items.length,6);assert.equal(record.items[0].weight,30);
  assert.equal(record.items[0].status,'done');assert.equal(record.items[2].status,'skipped');
  assert.equal(record.items[1].status,'pending');
  model.saveExercise(s,{id:'smith',name:'Новое название',body:['Ноги'],description:'Новое описание',cover:'',sets:'5',reps:'5'},'A');
  assert.equal(record.items[0].name,'Приседания в Смите');
  assert.equal(record.items[0].sets,'3');
  assert.equal(model.restoreState(JSON.stringify(s)).history['2026-10-19:A'].items[0].weight,30);
});
test('calendar holds both workouts on one day; duplicate completion updates one record',()=>{
  const s=model.initialState();
  model.completeWorkout(s,'2026-10-19','A'); model.completeWorkout(s,'2026-10-19','B');
  model.completeWorkout(s,'2026-10-19','A');
  assert.equal(Object.keys(s.history).length,2);
  assert.equal(s.history['2026-10-19:B'].items[3].sets,'3');
  model.removeCompletion(s,'2026-10-19','A');
  assert.ok(s.history['2026-10-19:B']);assert.equal(s.history['2026-10-19:A'],undefined);
});
test('result edits after completion update calendar without changing historical program metadata',()=>{
  const s=model.initialState();model.completeWorkout(s,'2026-10-19','A');
  s.exercises.smith.name='Изменено';
  model.setWeight(s,'2026-10-19','A','smith','32,5');
  model.setStatus(s,'2026-10-19','A','smith','done');
  const item=s.history['2026-10-19:A'].items[0];
  assert.equal(item.weight,32.5);assert.equal(item.status,'done');
  assert.equal(item.name,'Приседания в Смите');
});
test('previous version data migrates without losing marks and rejects malformed history or weights',()=>{
  const old=model.initialState();delete old.history;delete old.weights;
  model.setStatus(old,'2026-10-19','A','smith','done');
  const s=model.restoreState(JSON.stringify(old));
  assert.deepEqual(s.history,{});assert.deepEqual(s.weights,{});
  assert.equal(model.getStatus(s,'2026-10-19','A','smith'),'done');
  s.weights={'2026-10-19:A':{smith:-2}};assert.equal(model.restoreState(JSON.stringify(s)),null);
  s.weights={};s.history={'2026-10-19:A':{items:'bad'}};
  assert.equal(model.restoreState(JSON.stringify(s)),null);
});
