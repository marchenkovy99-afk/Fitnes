import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localDate,STORAGE_KEY,restoreState} from '../model.js';

test('controller creates a custom workout, records weight and completion, and renders calendar/history',async()=>{
 const memory=new Map(),events={},windowEvents={};let form=null;
 const app={innerHTML:'',addEventListener:(key,fn)=>events[key]=fn,querySelectorAll:()=>[],querySelector:()=>null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const meta={setAttribute(){}};
 const media={matches:false,addEventListener(){}};
 globalThis.window={localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},matchMedia:()=>media,addEventListener:(key,fn)=>windowEvents[key]=fn,scrollTo(){}};
 globalThis.location={hash:'#/training'};
 globalThis.document={documentElement:{dataset:{}},activeElement:null,hidden:false,title:'',addEventListener(){},querySelector:s=>s==='#app'?app:s==='#toast'?toast:s==='#workout-form'?form:s.startsWith('meta[')?meta:null};
 // Load the real controller with its tested modules, excluding only the separately tested cloud bootstrap.
 const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).split('// Load cloud support separately')[0].replaceAll("from './",`from '${new URL('../',import.meta.url).href}`);
 await import(`data:text/javascript,${encodeURIComponent(source)}`);
 const navigate=hash=>{location.hash=hash;windowEvents.hashchange();};
 const click=dataset=>events.click({target:{closest:()=>({dataset})}});
 const saved=()=>JSON.parse(memory.get(STORAGE_KEY));
 assert.ok(app.innerHTML.includes('Новая'));
 navigate('#/workout/A');form={id:'workout-form',elements:{name:{value:'Понедельник'},focus:{value:'Верх'}},querySelectorAll:()=>[]};
 events.submit({target:form,preventDefault(){}});form=null;navigate('#/training');
 assert.match(app.innerHTML,/>Понедельник<\/button>/);

 navigate('#/workout/new');
 form={id:'workout-form',elements:{name:{value:'Суббота <тест>'},focus:{value:'Спина'}},querySelectorAll:()=>[]};
 click({action:'workout-toggle',id:'row'});
 assert.ok(app.innerHTML.includes('Суббота &lt;тест&gt;'));
 form.querySelectorAll=()=>[{dataset:{id:'row',itemField:'sets'},type:'number',value:'4'},{dataset:{id:'row',itemField:'reps'},type:'text',value:'8'}];
 events.submit({target:form,preventDefault(){}});form=null;
 const id=saved().selectedPlan;assert.notEqual(id,'A');assert.equal(saved().plans[id].items[0].sets,'4');
 navigate('#/training');assert.ok(app.innerHTML.includes('Горизонтальная тяга'));assert.ok(app.innerHTML.includes(`data-weight-plan="${id}"`));
 events.input({target:{closest:()=>null,matches:s=>s==='.weight-input',dataset:{weightPlan:id,weightId:'row'},value:'25,5',setCustomValidity(){}}});
 click({action:'status',id:'row',plan:id,value:'done'});
 click({action:'complete-workout'});
 const key=`${localDate()}:${id}`;assert.equal(saved().history[key].items[0].weight,25.5);assert.equal(saved().history[key].items[0].status,'done');
 navigate('#/calendar');assert.ok(app.innerHTML.includes('Суббота &lt;тест&gt;'));assert.ok(app.innerHTML.includes('25,5 кг'));
 navigate(`#/history/${encodeURIComponent(key)}`);assert.ok(app.innerHTML.includes('История тренировки'));assert.ok(app.innerHTML.includes('25,5'));
 navigate('#/new');assert.ok(app.innerHTML.includes(`value="${id}" selected`));
 for(let n=0;n<2;n++){
   navigate('#/workout/new');form={id:'workout-form',elements:{name:{value:`Дополнительная ${n}`},focus:{value:''}},querySelectorAll:()=>[]};
   events.submit({target:form,preventDefault(){}});form=null;
 }
 navigate('#/training');assert.ok(app.innerHTML.includes('data-action="choose-plan"'));assert.ok(app.innerHTML.includes('Выбрать упражнения'));assert.ok(!app.innerHTML.includes('data-action="complete-workout"'));
 assert.ok(restoreState(JSON.stringify(saved())));
 click({action:'appearance',value:'dark'});assert.equal(document.documentElement.dataset.theme,'dark');
 click({action:'appearance',value:'light'});assert.equal(document.documentElement.dataset.theme,'light');
});
