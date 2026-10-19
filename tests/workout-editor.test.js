import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,saveWorkout} from '../model.js';
import {workoutDraft,workoutEditorView,readWorkoutForm} from '../workout-editor.js';
const h={esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),icon:()=>'',cover:()=>'',dose:()=>''};
test('workout editing drafts do not mutate saved programs before submit',()=>{
 const s=initialState(),draft=workoutDraft(s,'A');draft.items.reverse();draft.name='Черновик';
 assert.equal(s.plans.A.items[0].exerciseId,'smith');assert.equal(s.plans.A.name,'Тренировка А');
 const form={elements:{name:{value:'Выходной'},focus:{value:'Всё тело'}},querySelectorAll:()=>[{dataset:{id:draft.items[0].exerciseId,itemField:'sets'},type:'number',value:'5'}]};
 readWorkoutForm(form,draft);assert.equal(draft.name,'Выходной');assert.equal(draft.items[0].sets,'5');assert.equal(s.plans.A.items[5].sets,'2');
});
test('new workout editor exposes existing exercises and escapes user text',()=>{
 const s=initialState(),draft=workoutDraft(s);draft.name='Тест <script>';
 const html=workoutEditorView(s,draft,'',h);
 assert.ok(html.includes('Приседания в Смите'));assert.ok(html.includes('Создать тренировку'));assert.ok(html.includes('&lt;script>'));assert.ok(!html.includes('<script>'));
 const id=saveWorkout(s,{name:'Своя',focus:'',items:[]});
 assert.ok(workoutEditorView(s,workoutDraft(s,id),'несуществующее',h).includes('Ничего не найдено'));
});
