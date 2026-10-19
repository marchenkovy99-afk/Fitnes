import {SEED} from './data.js';
export const STORAGE_KEY='fitness.v1';
export function initialState(){return structuredClone(SEED);}
export function localDate(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function getStatus(state,date,plan,id){return state.sessions[`${date}:${plan}`]?.[id] || 'pending';}
export function setStatus(state,date,plan,id,value){
  if(!['done','skipped'].includes(value)||!state.plans[plan]?.items.some(i=>i.exerciseId===id)) return;
  const key=`${date}:${plan}`; state.sessions[key] ||= {};
  state.sessions[key][id]=getStatus(state,date,plan,id)===value?'pending':value;
}
export function validCover(value){
  if(!value)return true;
  if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value.length<1500000;
  try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}
}
export function saveExercise(state,input,plan){
  const name=String(input.name||'').trim();
  if(!name||name.length>120)throw new Error('Введите название до 120 символов.');
  const cover=String(input.cover||'').trim();
  if(!validCover(cover))throw new Error('Укажите прямую http/https-ссылку на изображение или загрузите фото.');
  const body=[...new Set((input.body||[]).map(x=>String(x).trim()).filter(Boolean))];
  if(body.length>8||body.some(x=>x.length>40))throw new Error('До 8 областей тела, не более 40 символов в каждой.');
  const sets=String(input.sets||'').trim(), reps=String(input.reps||'').trim();
  if(sets && (!/^\d{1,2}$/.test(sets)||Number(sets)<1))throw new Error('Число подходов: от 1 до 99.');
  if(reps.length>40)throw new Error('Сократите повторения до 40 символов.');
  if(!state.plans[plan])throw new Error('Тренировка не найдена.');
  const id=input.id||`exercise-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const previous=state.exercises[id];
  state.exercises[id]={...previous,id,name,body,cover,description:String(input.description||'').slice(0,10000)};
  let item=state.plans[plan].items.find(x=>x.exerciseId===id);
  if(!item){item={exerciseId:id};state.plans[plan].items.push(item);}
  Object.assign(item,{sets,reps,optional:Boolean(input.optional)});
  return id;
}
export function restoreState(raw){
  try{
    const s=JSON.parse(raw);
    if(s?.version!==1||!s.exercises||!s.sessions||Array.isArray(s.sessions)||!['A','B'].includes(s.selectedPlan))return null;
    for(const p of ['A','B']){
      if(!Array.isArray(s.plans?.[p]?.items)||typeof s.plans[p].name!=='string'||typeof s.plans[p].focus!=='string')return null;
      for(const item of s.plans[p].items){
        if(!s.exercises[item.exerciseId]||typeof item.sets!=='string'||typeof item.reps!=='string')return null;
      }
    }
    for(const [key,e] of Object.entries(s.exercises)){
      if(!e||typeof e.id!=='string'||e.id!==key||typeof e.name!=='string'||typeof e.description!=='string'||!Array.isArray(e.body)||!e.body.every(x=>typeof x==='string')||typeof e.cover!=='string'||!validCover(e.cover))return null;
    }
    for(const session of Object.values(s.sessions)){
      if(!session||typeof session!=='object'||Array.isArray(session)||Object.values(session).some(value=>!['pending','done','skipped'].includes(value)))return null;
    }
    return s;
  }catch{return null;}
}
export function persist(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
