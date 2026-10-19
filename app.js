import {initialState,STORAGE_KEY,restoreState,persist,localDate,getStatus,setStatus,getWeight,setWeight,completeWorkout,removeCompletion,saveExercise,validCover} from './model.js';
import {calendarView,historyView} from './calendar.js';

const paths={calendar:'M3 5h18v16H3zM7 3v4M17 3v4M3 10h18M7 14h2M15 14h2M7 18h2',plus:'M12 5v14M5 12h14',check:'m5 12 4 4L19 6',x:'m6 6 12 12M18 6 6 18',back:'m15 18-6-6 6-6',chevron:'m9 6 6 6-6 6',edit:'m16 3 5 5M4 20l4-1L21 6l-4-4L4 15v5Z',image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M8 7h.01',link:'m10 13 4-4M8 15l-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m4 0 2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',dumbbell:'M7 12h10M5 7v10M19 7v10M2 9v6M22 9v6',library:'M4 5h7l2 3h7v13H4zM4 5V2h5',clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',reset:'M3 10a9 9 0 1 1 1 8M3 4v6h6'};
const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name]||paths.dumbbell}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage,storageWarning='',state=initialState();
try{
  storage=window.localStorage;
  const raw=storage.getItem(STORAGE_KEY);
  if(raw){const restored=restoreState(raw);if(restored)state=restored;else storageWarning='Сохранённые данные не удалось прочитать. Исходные данные оставлены в хранилище; перед новыми изменениями можно скачать их копию.';}
}catch{storageWarning='Браузер запретил сохранение. Изменения будут доступны только до закрытия страницы.';}
const app=document.querySelector('#app');
let search='',toastTimer,formState=null,origin='training',date=localDate();
let calendarMonth=new Date(),calendarSelected=date;
function persistState(){
  const ok=storage&&persist(storage,state);
  if(!ok){storageWarning='Не удалось сохранить: хранилище недоступно или заполнено. Скачайте резервную копию во вкладке «Упражнения».';toast('Изменения пока только в памяти. Скачайте копию.');}
  else storageWarning='';
  return Boolean(ok);
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
function currentPlan(id){return state.plans[state.selectedPlan].items.some(x=>x.exerciseId===id)?state.selectedPlan:['A','B'].find(p=>state.plans[p].items.some(x=>x.exerciseId===id))||state.selectedPlan;}
function cover(exercise,size='thumb'){
  if(exercise.cover&&validCover(exercise.cover))return `<span class="cover ${size}"><img src="${esc(exercise.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  if(Number.isInteger(exercise.tile)&&exercise.tile>=0&&exercise.tile<12){const t=exercise.tile;return `<span class="cover sprite ${size}" style="background-position:${(t%4)*100/3}% ${Math.floor(t/4)*50}%" aria-hidden="true"></span>`;}
  return `<span class="cover placeholder ${size}" aria-hidden="true">${icon('image')}</span>`;
}
const statusNames={pending:'Не отмечено',done:'Выполнено',skipped:'Пропущено'};
function statusLine(value){return `<span class="status-line ${value}"><span class="status-dot">${value==='pending'?'':icon(value==='done'?'check':'x')}</span>${statusNames[value]||statusNames.pending}</span>`;}
function statusButtons(id,plan){const status=getStatus(state,date,plan,id);return `<div class="status-actions" role="group" aria-label="Статус: ${esc(state.exercises[id].name)}"><button class="status-button skipped" data-action="status" data-id="${esc(id)}" data-plan="${plan}" data-value="skipped" aria-label="Пропустить: ${esc(state.exercises[id].name)}" aria-pressed="${status==='skipped'}">${icon('x')}</button><button class="status-button done" data-action="status" data-id="${esc(id)}" data-plan="${plan}" data-value="done" aria-label="Выполнено: ${esc(state.exercises[id].name)}" aria-pressed="${status==='done'}">${icon('check')}</button></div>`;}
function nav(active){return `<nav class="bottom-nav" aria-label="Основная навигация"><a href="#/training" ${active==='training'?'aria-current="page"':''}>${icon('dumbbell')}<span>Тренировка</span></a><a href="#/library" ${active==='library'?'aria-current="page"':''}>${icon('library')}<span>Упражнения</span></a><a href="#/calendar" ${active==='calendar'?'aria-current="page"':''}>${icon('calendar')}<span>Календарь</span></a></nav>`;}
function alertHTML(){return storageWarning?`<div class="storage-alert" role="alert">${esc(storageWarning)}</div>`:'';}
function sessionNote(label,text){return `<div class="session-note">${icon('clock')}<div><strong>${label}</strong><br>${text}</div></div>`;}
function renderTraining(){
  const p=state.selectedPlan,plan=state.plans[p],items=plan.items;
  const done=items.filter(i=>getStatus(state,date,p,i.exerciseId)==='done').length;
  const completed=Boolean(state.history?.[`${date}:${p}`]);
  const skipped=items.filter(i=>getStatus(state,date,p,i.exerciseId)==='skipped').length;
  const dateLabel=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${date}T12:00:00`));
  app.innerHTML=`<main class="screen" id="main">${alertHTML()}<header><div class="title-row"><div><p class="eyebrow">${esc(dateLabel)}</p><h1 tabindex="-1">Тренировка</h1></div><a class="icon-button primary" href="#/new" aria-label="Добавить упражнение">${icon('plus')}</a></div><div class="plan-switch" aria-label="Выбор тренировки"><button data-action="plan" data-plan="A" aria-pressed="${p==='A'}">Тренировка А</button><button data-action="plan" data-plan="B" aria-pressed="${p==='B'}">Тренировка Б</button></div><p class="plan-meta"><span>${esc(plan.focus)}</span><span>45–60 мин</span></p><div class="progress-label"><strong>${done} из ${items.length} выполнено</strong><span>${skipped?`${skipped} пропущено`:''}</span></div><div class="progress" role="progressbar" aria-label="Выполнено упражнений" aria-valuemin="0" aria-valuemax="${items.length||1}" aria-valuenow="${done}"><span style="width:${items.length?done/items.length*100:0}%"></span></div></header>${sessionNote('Разминка','5–7 минут на дорожке')}<div class="exercise-list">${items.map((item,n)=>{const e=state.exercises[item.exerciseId],s=getStatus(state,date,p,e.id);return `<article class="exercise-row"><span class="number">${String(n+1).padStart(2,'0')}</span><a class="exercise-link" href="#/exercise/${encodeURIComponent(e.id)}">${cover(e)}<div class="row-content"><h2 class="exercise-name">${esc(e.name)}</h2><p class="body-line">${esc(e.body.join(' · '))}</p><p class="prescription">${dose(item)}</p>${item.optional?'<span class="optional-label">По самочувствию</span>':''}${statusLine(s)}</div></a>${statusButtons(e.id,p)}<label class="weight-field"><span>Вес, кг</span><input class="weight-input" type="text" inputmode="decimal" maxlength="8" data-weight-id="${esc(e.id)}" data-weight-plan="${p}" value="${esc(String(getWeight(state,date,p,e.id)).replace('.',','))}" placeholder="—" aria-label="Вес в килограммах: ${esc(e.name)}"></label></article>`;}).join('')}</div><div class="completion-block"><button class="complete-workout ${completed?'completed':''}" data-action="complete-workout" role="checkbox" aria-checked="${completed}"><span class="completion-checkbox">${completed?icon('check'):''}</span><span><strong>Тренировка выполнена</strong><small>${completed?'Результаты сохранены в календаре':'Завершить и сохранить результаты'}</small></span></button>${completed?`<a class="completion-history-link" href="#/history/${encodeURIComponent(`${date}:${p}`)}">Посмотреть в календаре ${icon('chevron')}</a>`:''}</div><div class="after-list">${sessionNote('После тренировки · по желанию','5–10 минут ходьбы')}<p class="hint">Отдых: 90–120 сек после сложных упражнений, 60–90 сек после остальных. Если не укладываетесь в час, уберите один дополнительный подход.</p><button class="quiet" data-action="reset">${icon('reset')} Снять отметки этой тренировки</button></div></main>${nav('training')}`;
}
function dose(item){if(!item?.sets&&!item?.reps)return '';return `${esc(item.sets||'—')} × ${esc(item.reps||'—')}`;}
function renderLibrary(){
  const exercises=Object.values(state.exercises),filtered=exercises.filter(e=>`${e.name} ${e.body.join(' ')}`.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')));
  app.innerHTML=`<main class="screen"><header class="title-row"><h1 tabindex="-1">Упражнения</h1><a class="icon-button primary" href="#/new" aria-label="Создать упражнение">${icon('plus')}</a></header>${alertHTML()}<label class="search-wrap" style="display:block">${icon('search')}<input id="search" type="text" placeholder="Название или область тела" aria-label="Поиск упражнений" value="${esc(search)}"></label><p class="library-count">${filtered.length} из ${exercises.length} упражнений</p><div class="exercise-list">${filtered.map((e,i)=>`<article class="exercise-row library-row"><span class="number">${String(i+1).padStart(2,'0')}</span><a class="exercise-link" href="#/exercise/${encodeURIComponent(e.id)}">${cover(e)}<div class="row-content"><h2 class="exercise-name">${esc(e.name)}</h2><p class="body-line">${esc(e.body.join(' · '))}</p><p class="body-line">${['A','B'].filter(p=>state.plans[p].items.some(x=>x.exerciseId===e.id)).map(p=>`Тренировка ${p==='A'?'А':'Б'}`).join(' · ')}</p></div></a><a class="icon-button" href="#/exercise/${encodeURIComponent(e.id)}" aria-label="Открыть: ${esc(e.name)}">${icon('chevron')}</a></article>`).join('')||'<div class="empty"><h2>Ничего не найдено</h2><p>Попробуйте другое название или область тела.</p></div>'}</div><div class="library-bottom"><button class="quiet" data-action="export">${icon('download')} Скачать копию данных</button><button class="quiet" data-action="import">Восстановить копию</button><input class="file-input" id="import-file" type="file" accept=".json,application/json"></div><p class="subtle-note">Данные сохраняются в этом браузере. Обложки иллюстративные; техника и нагрузка определяются вашей программой.</p></main>${nav('library')}`;
}
function renderDetail(id){
  const e=state.exercises[id];if(!e)return notFound();
  const p=currentPlan(id),item=state.plans[p].items.find(i=>i.exerciseId===id),status=getStatus(state,date,p,id);
  app.innerHTML=`<main class="screen detail"><header class="topbar"><a href="#/${origin}" class="back" aria-label="Назад">${icon('back')}</a><h2>Упражнение</h2><a class="edit-action" href="#/edit/${encodeURIComponent(id)}">${icon('edit')} Изменить</a></header>${alertHTML()}<h1 tabindex="-1">${esc(e.name)}</h1><div class="upper-grid">${cover(e,'large')}<div><span class="section-label">Область тела</span><div class="tag-list">${e.body.map(x=>`<span class="tag">${esc(x)}</span>`).join('')||'<span class="hint">Не указана</span>'}</div><p class="dose">${dose(item)}</p><p class="hint">${esc(state.plans[p].name)}</p>${item?.optional?'<p class="optional-note">По самочувствию</p>':''}</div></div><section><h2 class="section-label">Описание</h2><p class="description">${esc(e.description||'Описание пока не добавлено.')}</p></section></main><div class="bottom-actions"><div class="detail-status">${statusLine(status)}</div><div class="action-pair"><button class="button skipped ${status==='skipped'?'selected':''}" data-action="status" data-id="${esc(id)}" data-plan="${p}" data-value="skipped" aria-pressed="${status==='skipped'}">${icon('x')} Пропустить</button><button class="button primary" data-action="status" data-id="${esc(id)}" data-plan="${p}" data-value="done" aria-pressed="${status==='done'}">${icon('check')} Выполнено</button></div></div>`;
}
function draftKey(){return `fitness.draft.${formState?.id||'new'}`;}
function writeDraft(){if(!formState)return;try{storage?.setItem(draftKey(),JSON.stringify(formState));}catch{/* Main save reports persistent storage errors. */}}
function readFields(){const f=document.querySelector('#exercise-form');if(!f||!formState)return;for(const k of ['name','description','sets','reps'])formState[k]=f.elements[k].value;formState.optional=f.elements.optional.checked;formState.plan=f.elements.plan.value;writeDraft();}
function renderForm(id){
  const previous=id?state.exercises[id]:null;if(id&&!previous)return notFound();
  if(!formState||formState.id!==(id||'')){
    const p=previous?currentPlan(id):state.selectedPlan,item=state.plans[p].items.find(i=>i.exerciseId===id);
    formState={id:id||'',name:previous?.name||'',body:[...(previous?.body||[])],description:previous?.description||'',cover:previous?.cover||'',tile:previous?.tile,sets:item?.sets||'',reps:item?.reps||'',optional:item?.optional||false,plan:p};
    try{const draft=JSON.parse(storage?.getItem(draftKey())||'null');if(draft&&draft.id===(id||'')&&typeof draft.name==='string'&&Array.isArray(draft.body)&&validCover(draft.cover)&&['A','B'].includes(draft.plan))formState=draft;}catch{}
  }
  const f=formState;
  app.innerHTML=`<main class="screen editor"><header class="topbar"><a href="${id?`#/exercise/${encodeURIComponent(id)}`:`#/${origin}`}" class="back" aria-label="Назад">${icon('back')}</a><h2>${id?'Изменить упражнение':'Новое упражнение'}</h2><span class="spacer"></span></header>${alertHTML()}<form id="exercise-form"><div class="field"><label class="field-label" for="name">Название</label><input type="text" id="name" name="name" maxlength="120" required placeholder="Например, приседания" value="${esc(f.name)}"></div><div class="upper-grid"><div><span class="field-label">Обложка</span><button class="cover-button" type="button" data-action="photo" aria-label="Выбрать обложку" style="border:0;padding:0;background:none;width:100%;text-align:left;position:relative">${cover(f,'large')}<span class="cover-overlay">${icon('image')} ${f.cover||Number.isInteger(f.tile)?'Изменить':'Добавить фото'}</span></button><input id="photo-file" class="file-input" type="file" accept="image/png,image/jpeg,image/webp"><button type="button" class="button link-cover" data-action="cover-url">${icon('link')} Добавить по ссылке</button></div><div><span class="field-label">Область тела</span><div class="body-editor">${f.body.map((b,i)=>`<span class="tag">${esc(b)}<button type="button" class="remove-tag" data-action="remove-tag" data-index="${i}" aria-label="Убрать область ${esc(b)}">${icon('x')}</button></span>`).join('')}</div><div class="tag-input"><input id="new-tag" type="text" maxlength="40" list="body-suggestions" placeholder="Ноги, руки…" aria-label="Новая область тела"><button type="button" class="icon-button" data-action="add-tag" aria-label="Добавить область тела">${icon('plus')}</button></div><datalist id="body-suggestions">${[...new Set(Object.values(state.exercises).flatMap(x=>x.body))].map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist></div></div><div class="field"><label class="field-label" for="description">Описание</label><textarea id="description" name="description" maxlength="10000" placeholder="Что нужно делать в этом упражнении">${esc(f.description)}</textarea></div><div class="field-row"><div class="field"><label class="field-label" for="sets">Подходы</label><input id="sets" name="sets" type="number" min="1" max="99" inputmode="numeric" value="${esc(f.sets)}" placeholder="3"></div><div class="field"><label class="field-label" for="reps">Повторения</label><input id="reps" name="reps" type="text" maxlength="40" value="${esc(f.reps)}" placeholder="10–12"></div></div><div class="field"><label class="field-label" for="plan">Тренировка</label><select id="plan" name="plan" aria-describedby="plan-hint">${['A','B'].map(p=>`<option value="${p}" ${p===f.plan?'selected':''}>${esc(state.plans[p].name)} · ${esc(state.plans[p].focus)}</option>`).join('')}</select><p class="hint" id="plan-hint">Подходы и повторения относятся к выбранной тренировке. Название и описание общие.</p></div><label class="checkbox-label"><input type="checkbox" name="optional" ${f.optional?'checked':''}>По самочувствию</label><p id="form-error" class="error" role="alert"></p><p class="hint">Черновик сохраняется при вводе.</p></form></main><div class="bottom-actions"><button type="submit" form="exercise-form" class="button primary wide">Сохранить упражнение</button></div>`;
}
function notFound(){app.innerHTML=`<main class="screen empty"><h1>Не найдено</h1><p>Такого упражнения нет в библиотеке.</p><a class="button primary" href="#/training">К тренировке</a></main>`;}
function render({keepFocus=false}={}){
  const active=keepFocus?document.activeElement:null,key=active?.dataset?.action,id=active?.dataset?.id,value=active?.dataset?.value,plan=active?.dataset?.plan;
  const parts=location.hash.slice(2).split('/'),view=parts[0]||'training';
  if(view==='training'){origin='training';renderTraining();}else if(view==='library'){origin='library';renderLibrary();}else if(view==='calendar'){app.innerHTML=calendarView(state,calendarMonth,calendarSelected,{esc,icon,nav});}else if(view==='history'){const key=decodeURIComponent(parts[1]||'');const record=state.history?.[key];if(record){calendarSelected=record.date;calendarMonth=new Date(`${record.date.slice(0,7)}-01T12:00:00`);app.innerHTML=historyView(record,{esc,icon,nav,cover,statusLine,dose});}else notFound();}else if(view==='exercise'){renderDetail(decodeURIComponent(parts[1]||''));}else if(view==='new'||view==='edit'){renderForm(view==='edit'?decodeURIComponent(parts[1]||''):null);}else notFound();
  document.title=`Fitness · ${view==='calendar'?'Календарь':view==='history'?'История тренировки':view==='library'?'Упражнения':view==='new'?'Новое упражнение':'Тренировка'}`;
  if(key){[...app.querySelectorAll('[data-action]')].find(x=>x.dataset.action===key&&x.dataset.id===id&&x.dataset.value===value&&x.dataset.plan===plan)?.focus({preventScroll:true});}
}
function addTag(){readFields();const el=document.querySelector('#new-tag'),value=el.value.trim();if(!value)return;if(formState.body.length>=8){toast('Можно добавить до 8 областей тела');return;}if(!formState.body.includes(value))formState.body.push(value);writeDraft();renderForm(formState.id||null);document.querySelector('#new-tag')?.focus();}
function download(){const data=JSON.stringify(state,null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`fitness-${date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function confirmDialog(title,text,onConfirm){
  const d=document.createElement('dialog');d.className='modal';d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="action-pair"><button class="button secondary" data-cancel>Отмена</button><button class="button primary" data-confirm>Подтвердить</button></div>`;document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=()=>{onConfirm();d.close();};d.addEventListener('close',()=>d.remove());d.showModal();
}
function openCoverDialog(){
  readFields();const d=document.createElement('dialog');d.className='modal';d.innerHTML=`<form><h2>Обложка по ссылке</h2><p>Вставьте прямую ссылку на изображение.</p><label class="field-label" for="cover-url">Ссылка</label><input id="cover-url" type="url" placeholder="https://…" value="${esc(formState.cover?.startsWith('http')?formState.cover:'')}"><p class="error" role="alert"></p><div class="action-pair"><button type="button" class="button secondary" data-cancel>Отмена</button><button type="submit" class="button primary">Применить</button></div></form>`;document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.querySelector('form').onsubmit=e=>{e.preventDefault();const url=d.querySelector('input').value.trim();if(!url||!/^https?:/.test(url)||!validCover(url)){d.querySelector('.error').textContent='Нужна прямая http/https-ссылка на фото.';return;}formState.cover=url;writeDraft();d.close();renderForm(formState.id||null);};d.showModal();
}
app.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;const a=button.dataset.action;
  if(a==='plan'){state.selectedPlan=button.dataset.plan;persistState();render({keepFocus:true});}
  if(a==='status'){setStatus(state,date,button.dataset.plan,button.dataset.id,button.dataset.value);persistState();render({keepFocus:true});}
  if(a==='calendar-month'){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(button.dataset.step),1,12);render();}
  if(a==='calendar-day'){calendarSelected=button.dataset.date;calendarMonth=new Date(`${calendarSelected.slice(0,7)}-01T12:00:00`);render();}
  if(a==='calendar-today'){calendarSelected=date;calendarMonth=new Date(`${date.slice(0,7)}-01T12:00:00`);render();}
  if(a==='complete-workout'){
    const invalid=[...app.querySelectorAll('.weight-input')].find(input=>!input.checkValidity());
    if(invalid){invalid.reportValidity();return;}
    const p=state.selectedPlan,key=`${date}:${p}`;
    if(state.history?.[key])confirmDialog('Снять отметку завершения?','Запись этой тренировки будет удалена из календаря. Введённые веса и отметки упражнений останутся.',()=>{removeCompletion(state,date,p);persistState();render();});
    else{
      const finish=()=>{completeWorkout(state,date,p);const saved=persistState();calendarSelected=date;calendarMonth=new Date(`${date.slice(0,7)}-01T12:00:00`);render();if(saved)toast('Тренировка сохранена в календаре');};
      const pending=state.plans[p].items.filter(i=>getStatus(state,date,p,i.exerciseId)==='pending').length;
      if(pending)confirmDialog('Завершить тренировку?',`Не отмечено упражнений: ${pending}. Они останутся неотмеченными в истории. Введённые веса сохранятся.`,finish);else finish();
    }
  }
  if(a==='add-tag')addTag();
  if(a==='remove-tag'){readFields();formState.body.splice(Number(button.dataset.index),1);writeDraft();renderForm(formState.id||null);}
  if(a==='photo')document.querySelector('#photo-file').click();
  if(a==='cover-url')openCoverDialog();
  if(a==='export')download();
  if(a==='import')document.querySelector('#import-file').click();
  if(a==='reset')confirmDialog('Снять отметки?','Отметки упражнений и завершение этой тренировки за сегодня будут сброшены, запись удалится из календаря. Введённые веса останутся.',()=>{delete state.sessions[`${date}:${state.selectedPlan}`];removeCompletion(state,date,state.selectedPlan);persistState();render();toast('Отметки сняты');});
});
app.addEventListener('input',event=>{
  if(event.target.matches('.weight-input')){
    const input=event.target;
    try{setWeight(state,date,input.dataset.weightPlan,input.dataset.weightId,input.value);input.setCustomValidity('');persistState();}
    catch(error){input.setCustomValidity(error.message);}
    return;
  }
  if(event.target.id==='search'){const pos=event.target.selectionStart;search=event.target.value;renderLibrary();const f=document.querySelector('#search');f.focus();f.setSelectionRange(pos,pos);return;}
  if(event.target.closest('#exercise-form'))readFields();
});
app.addEventListener('keydown',event=>{if(event.target.id==='new-tag'&&event.key==='Enter'){event.preventDefault();addTag();}});
app.addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.parentElement.classList.add('failed');event.target.remove();}},true);
app.addEventListener('submit',event=>{
  if(event.target.id!=='exercise-form')return;event.preventDefault();readFields();
  try{const oldId=formState.id,id=saveExercise(state,formState,formState.plan);state.selectedPlan=formState.plan;const saved=persistState();if(saved){try{storage.removeItem(`fitness.draft.${oldId||'new'}`);}catch{}}formState=null;location.hash=`#/exercise/${encodeURIComponent(id)}`;if(saved)toast('Упражнение сохранено');}
  catch(error){document.querySelector('#form-error').textContent=error.message;document.querySelector('#form-error').scrollIntoView({block:'center'});}
});
app.addEventListener('change',async event=>{
  if(event.target.matches('.weight-input')){
    const input=event.target;
    if(!input.checkValidity()){input.reportValidity();return;}
    input.value=String(getWeight(state,date,input.dataset.weightPlan,input.dataset.weightId)).replace('.',',');
  }
  if(event.target.id==='photo-file'){
    const file=event.target.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){toast('Выберите JPG, PNG или WebP до 12 МБ');return;}
    readFields();const target=formState;
    try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();if(formState!==target)return;formState.cover=canvas.toDataURL('image/jpeg',.8);writeDraft();renderForm(formState.id||null);}
    catch{toast('Не удалось открыть фото. Попробуйте другое изображение.');}
  }
  if(event.target.id==='import-file'){
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>20*1024*1024){toast('Файл слишком большой: максимум 20 МБ');return;}
    try{const restored=restoreState(await file.text());if(!restored){toast('Это не резервная копия Fitness или файл повреждён');return;}confirmDialog('Восстановить данные?','Текущие упражнения и отметки в этом браузере будут заменены данными из файла.',()=>{state=restored;persistState();render();toast(storageWarning?'Данные открыты, но пока не сохранены':'Резервная копия восстановлена');});}
    catch{toast('Не удалось прочитать файл');}
  }
});
window.addEventListener('hashchange',()=>{const isForm=/^#\/(new|edit)/.test(location.hash);if(!isForm)formState=null;render();window.scrollTo({top:0,behavior:'instant'});app.querySelector('h1')?.focus({preventScroll:true});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const now=localDate();if(now!==date){date=now;if(!document.querySelector('#exercise-form'))render();}}});
render();
