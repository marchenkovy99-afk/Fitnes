import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../model.js';
const {SyncEngine}=await import('../sync.js').catch(()=>({}));
function setup(local=initialState(),remoteRow=null,meta=null){
 const memory=new Map(meta?[['fitness.sync.meta',JSON.stringify(meta)]]:[]);
 let state=local,row=remoteRow,writes=0;
 const engine=new SyncEngine({storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},readLocal:()=>state,applyRemote:d=>{state=d;},load:async()=>structuredClone(row),save:async(data,revision)=>{if((row?.revision||0)!==revision)throw Object.assign(new Error('conflict'),{code:'40001'});writes++;row={payload:structuredClone(data),revision:revision+1};return row;},onStatus:()=>{}});
 return {engine,get state(){return state;},get row(){return row;},get writes(){return writes;},setRow:r=>row=r};
}
test('first cloud connection uploads existing local results',async()=>{
 const s=initialState();s.weights={'2026-10-19:A':{smith:30}};
 const f=setup(s);await f.engine.connect('user-a');
 assert.equal(f.row.payload.weights['2026-10-19:A'].smith,30);assert.equal(f.writes,1);
});
test('new device downloads cloud instead of uploading the default program',async()=>{
 const s=initialState();s.exercises.smith.name='Из облака';
 const f=setup(initialState(),{revision:3,payload:s});await f.engine.connect('user-a');
 assert.equal(f.state.exercises.smith.name,'Из облака');assert.equal(f.writes,0);
});
test('different unsynced local and cloud results require an explicit conflict resolution',async()=>{
 const s=initialState();s.exercises.smith.name='Локально';const r=initialState();r.exercises.smith.name='Облако';
 const f=setup(s,{revision:2,payload:r});await f.engine.connect('user-a');
 assert.equal(f.engine.status.kind,'conflict');assert.equal(f.state.exercises.smith.name,'Локально');assert.equal(f.writes,0);
 await f.engine.useCloud();assert.equal(f.state.exercises.smith.name,'Облако');
});
test('concurrent writes preserve local data and stop at the version conflict',async()=>{
 const f=setup();await f.engine.connect('user-a');
 f.state.weights={'2026-10-19:A':{smith:35}};f.engine.markChanged();
 f.setRow({revision:8,payload:initialState()});await f.engine.flush();
 assert.equal(f.engine.status.kind,'conflict');assert.equal(f.state.weights['2026-10-19:A'].smith,35);assert.equal(f.writes,1);f.engine.disconnect();
});
test('signing into a different account never automatically uploads the previous account data',async()=>{
 const f=setup(initialState(),null,{userId:'old-user',revision:2,dirty:false});
 await f.engine.connect('new-user');assert.equal(f.engine.status.kind,'conflict');assert.equal(f.writes,0);
});
