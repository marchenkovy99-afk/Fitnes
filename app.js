import {initialState,STORAGE_KEY,restoreState,persist,localDate,getStatus,setStatus,getWeight,setWeight,completeWorkout,removeCompletion,saveExercise,saveWorkout,validCover} from './model.js?v=4';
import {calendarView,historyView} from './calendar.js?v=4';
import {workoutDraft,readWorkoutForm,workoutEditorView} from './workout-editor.js?v=4';
import {setAppearance,getAppearance} from './theme.js?v=4';

const paths={up:'m6 15 6-6 6 6',down:'m6 9 6 6 6-6',cloud:'M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-1 10',calendar:'M3 5h18v16H3zM7 3v4M17 3v4M3 10h18M7 14h2M15 14h2M7 18h2',plus:'M12 5v14M5 12h14',check:'m5 12 4 4L19 6',x:'m6 6 12 12M18 6 6 18',back:'m15 18-6-6 6-6',chevron:'m9 6 6 6-6 6',edit:'m16 3 5 5M4 20l4-1L21 6l-4-4L4 15v5Z',image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M8 7h.01',link:'m10 13 4-4M8 15l-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m4 0 2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',dumbbell:'M7 12h10M5 7v10M19 7v10M2 9v6M22 9v6',library:'M4 5h7l2 3h7v13H4zM4 5V2h5',clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',reset:'M3 10a9 9 0 1 1 1 8M3 4v6h6'};
const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name]||paths.dumbbell}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage,storageWarning='',state=initialState();
try{
  storage=window.localStorage;
  const raw=storage.getItem(STORAGE_KEY);
  if(raw){const restored=restoreState(raw);if(restored)state=restored;else storageWarning='Сохранённые данные не удалось прочитать. Исходные данные оставлены в хранилище; перед новыми изменениями можно скачать их копию.';}
}catch{storageWarning='Браузер запретил сохранение. Изменения будут доступны только до закрытия страницы.';}
const app=document.querySelector('#app');
let cloud=null;
let search='',toastTimer,formState=null,origin='training',date=localDate();
let calendarMonth=new Date(),calendarSelected=date,workoutFormState=null,workoutQuery='';
function persistState(){
  const ok=storage&&persist(storage,state);
  if(!ok){storageWarning='Не удалось сохранить: хранилище недоступно или заполнено. Скачайте резервную копию во вкладке «Упражнения».';toast('Изменения пока только в памяти. Скачайте копию.');}
  else storageWarning='';
  cloud?.engine.markChanged();
  return Boolean(ok);
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
function animateScreenEntry(){
  const screen=app.querySelector?.('.screen');
  if(!screen||typeof screen.animate!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
  screen.animate([
    {opacity:.55,transform:'translateY(10px)'},
    {opacity:1,transform:'translateY(0)'}
  ],{duration:240,easing:'cubic-bezier(.22,.7,.22,1)'});
}
function closeDialogWithMotion(dialog){
  if(!dialog.open)return;
  const close=()=>{if(dialog.open)dialog.close();};
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||typeof dialog.animate!=='function'){close();return;}
  if(dialog.dataset.motionClosing==='true')return;
  dialog.dataset.motionClosing='true';
  dialog.inert=true;
  dialog.animate([
    {opacity:1,transform:'translateY(0)'},
    {opacity:.7,transform:'translateY(24px)'}
  ],{duration:155,easing:'ease-in',fill:'forwards'}).finished.then(close,close);
}

function currentPlan(id){return state.plans[state.selectedPlan].items.some(x=>x.exerciseId===id)?state.selectedPlan:Object.keys(state.plans).find(p=>state.plans[p].items.some(x=>x.exerciseId===id))||state.selectedPlan;}
function cover(exercise,size='thumb'){
  if(exercise.cover&&validCover(exercise.cover))return `<span class="cover ${size}"><img src="${esc(exercise.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  if(Number.isInteger(exercise.tile)&&exercise.tile>=0&&exercise.tile<12){const t=exercise.tile;return `<span class="cover sprite ${size}" style="background-position:${(t%4)*100/3}% ${Math.floor(t/4)*50}%" aria-hidden="true"></span>`;}
  return `<span class="cover placeholder ${size}" aria-hidden="true">${icon('image')}</span>`;
}
const statusNames={pending:'Не отмечено',done:'Выполнено',skipped:'Пропущено'};
function statusLine(value){return `<span class="status-line ${value}"><span class="status-dot">${value==='pending'?'':icon(value==='done'?'check':'x')}</span>${statusNames[value]||statusNames.pending}</span>`;}
function statusButtons(id,plan){const status=getStatus(state,date,plan,id);return `<button class="status-button done ${status==='done'?'selected':''}" data-action="status" data-id="${esc(id)}" data-plan="${esc(plan)}" data-value="done" aria-label="Выполнено: ${esc(state.exercises[id].name)}" aria-pressed="${status==='done'}">${icon('check')}</button>`;}
function brand(){return `<div class="brand"><img src="./assets/icons/icon-192.png?v=3" alt="" width="36" height="36"><span>FITNESS</span></div>`;}
function planPicker(){
  const plans=Object.keys(state.plans),p=state.selectedPlan;
  if(plans.length>3)return `<label class="plan-select"><span class="sr-only">Выбрать тренировку</span><select data-action="choose-plan">${plans.map(id=>`<option value="${esc(id)}" ${id===p?'selected':''}>${esc(state.plans[id].name)}</option>`).join('')}</select>${icon('down')}</label>`;
  return `<div class="plan-switch" aria-label="Выбор тренировки">${plans.map(id=>`<button data-action="plan" data-plan="${esc(id)}" aria-pressed="${id===p}" title="${esc(state.plans[id].name)}">${esc(id==='A'&&state.plans[id].name==='Тренировка А'&&state.plans[id].focus==='Ноги и ягодицы'?'А · Ноги':id==='B'&&state.plans[id].name==='Тренировка Б'&&state.plans[id].focus==='Верх тела'?'Б · Верх':state.plans[id].name)}</button>`).join('')}</div>`;
}
function nav(active){return `<nav class="bottom-nav" aria-label="Основная навигация"><a href="#/training" ${active==='training'?'aria-current="page"':''}>${icon('dumbbell')}<span>Тренировка</span></a><a href="#/library" ${active==='library'?'aria-current="page"':''}>${icon('library')}<span>Упражнения</span></a><a href="#/calendar" ${active==='calendar'?'aria-current="page"':''}>${icon('calendar')}<span>Календарь</span></a></nav>`;}
function alertHTML(){return storageWarning?`<div class="storage-alert" role="alert">${esc(storageWarning)}</div>`:'';}
function sessionNote(label,text){return `<div class="session-note">${icon('clock')}<div><strong>${label}</strong><br>${text}</div></div>`;}
function renderTraining(){
  const p=state.selectedPlan,plan=state.plans[p],items=plan.items;
  const done=items.filter(i=>getStatus(state,date,p,i.exerciseId)==='done').length;
  const completed=Boolean(state.history?.[`${date}:${p}`]);
  const dateLabel=new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'long'}).format(new Date(`${date}T12:00:00`));
  app.innerHTML=`<main class="screen training-screen" id="main">${alertHTML()}<header><div class="brandbar">${brand()}<a class="icon-button plain cloud-shortcut" href="#/cloud" aria-label="Облачная синхронизация" title="${esc(cloud?.status.text||'Облачная синхронизация')}">${icon('cloud')}<span class="sync-dot ${esc(cloud?.status.kind||'local')}"></span></a></div><p class="date-label">${esc(dateLabel)}</p><div class="title-row"><h1 tabindex="-1">Тренировка</h1><a class="new-workout" href="#/workout/new">${icon('plus')} Новая</a></div>${planPicker()}<div class="plan-meta"><span>${esc(plan.focus||plan.name)}${p==='A'||p==='B'?' · 45–60 мин':''}</span><a href="#/workout/${encodeURIComponent(p)}">Состав ${icon('edit')}</a></div>${items.length?`<div class="progress-label"><strong>${done} из ${items.length} выполнено</strong></div><div class="progress" role="progressbar" aria-label="Выполнено упражнений" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}"><span style="width:${done/items.length*100}%"></span></div>`:''}</header>${items.length?`${sessionNote('Разминка','5–7 мин на дорожке')}<div class="exercise-list">${items.map(item=>{const e=state.exercises[item.exerciseId],status=getStatus(state,date,p,e.id);return `<article class="exercise-row ${status==='done'?'is-done':''}"><a class="exercise-link" href="#/exercise/${encodeURIComponent(e.id)}">${cover(e)}<div class="row-content"><h2 class="exercise-name">${esc(e.name)}</h2><p class="prescription">${dose(item)}</p>${item.optional?'<span class="optional-label">По самочувствию</span>':''}${status==='skipped'?'<span class="skip-label">Пропущено</span>':''}</div></a>${statusButtons(e.id,p)}<label class="weight-field"><span class="sr-only">Вес, кг</span><input class="weight-input" type="text" inputmode="decimal" maxlength="8" data-weight-id="${esc(e.id)}" data-weight-plan="${esc(p)}" value="${esc(String(getWeight(state,date,p,e.id)).replace('.',','))}" placeholder="Вес" aria-label="Вес в килограммах: ${esc(e.name)}"><span aria-hidden="true">кг</span></label></article>`;}).join('')}</div><a class="add-exercise-link" href="#/new">${icon('plus')} Новое упражнение</a><div class="after-list">${sessionNote('После тренировки','5–10 минут ходьбы · по желанию')}<p class="hint">Отдых: 90–120 сек после сложных упражнений, 60–90 сек после остальных.</p>${completed?`<a class="text-link" href="#/history/${encodeURIComponent(`${date}:${p}`)}">Посмотреть результаты в календаре ${icon('chevron')}</a>`:''}<button class="quiet" data-action="reset">${icon('reset')} Снять отметки за сегодня</button></div>`:`<section class="empty-workout"><span>${icon('dumbbell')}</span><h2>${esc(plan.name)}</h2><p>Добавьте упражнения из библиотеки или создайте своё.</p><a class="button primary wide" href="#/workout/${encodeURIComponent(p)}">Выбрать упражнения</a><a class="button secondary wide" href="#/new">Создать упражнение</a></section>`}</main>${items.length?`<div class="training-dock"><button class="complete-workout ${completed?'completed':''}" data-action="complete-workout" role="checkbox" aria-checked="${completed}">${completed?icon('check'):''}<span>${completed?'Тренировка выполнена':'Завершить тренировку'}</span></button></div>`:''}${nav('training')}`;
}
function dose(item){if(!item?.sets&&!item?.reps)return '';return `${esc(item.sets||'—')} × ${esc(item.reps||'—')}`;}
function renderLibrary(){
  const exercises=Object.values(state.exercises),filtered=exercises.filter(e=>`${e.name} ${e.body.join(' ')}`.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')));
  app.innerHTML=`<main class="screen"><header class="title-row"><h1 tabindex="-1">Упражнения</h1><a class="icon-button primary" href="#/new" aria-label="Создать упражнение">${icon('plus')}</a></header>${alertHTML()}<label class="search-wrap" style="display:block">${icon('search')}<input id="search" type="text" placeholder="Название или область тела" aria-label="Поиск упражнений" value="${esc(search)}"></label><p class="library-count">${filtered.length} из ${exercises.length} упражнений</p><div class="exercise-list">${filtered.map((e,i)=>`<article class="exercise-row library-row"><span class="number">${String(i+1).padStart(2,'0')}</span><a class="exercise-link" href="#/exercise/${encodeURIComponent(e.id)}">${cover(e)}<div class="row-content"><h2 class="exercise-name">${esc(e.name)}</h2><p class="body-line">${esc(e.body.join(' · '))}</p><p class="body-line">${Object.keys(state.plans).filter(p=>state.plans[p].items.some(x=>x.exerciseId===e.id)).map(p=>esc(state.plans[p].name)).join(' · ')}</p></div></a><a class="icon-button" href="#/exercise/${encodeURIComponent(e.id)}" aria-label="Открыть: ${esc(e.name)}">${icon('chevron')}</a></article>`).join('')||'<div class="empty"><h2>Ничего не найдено</h2><p>Попробуйте другое название или область тела.</p></div>'}</div><a class="cloud-entry" href="#/cloud">${icon('cloud')}<span><strong>Облачная синхронизация</strong><small id="sync-badge">${esc(cloud?.status.text||'Войти и подключить')}</small></span>${icon('chevron')}</a><section class="appearance-settings"><h2>Оформление</h2><div class="theme-switch" role="group" aria-label="Тема приложения">${[['auto','Как на телефоне'],['light','Светлая'],['dark','Тёмная']].map(([value,label])=>`<button data-action="appearance" data-value="${value}" aria-pressed="${getAppearance()===value}">${label}</button>`).join('')}</div></section><div class="library-bottom"><button class="quiet" data-action="export">${icon('download')} Скачать копию данных</button><button class="quiet" data-action="import">Восстановить копию</button><input class="file-input" id="import-file" type="file" accept=".json,application/json"></div><p class="subtle-note">Без входа данные сохраняются в этом браузере. Обложки иллюстративные; техника и нагрузка определяются вашей программой.</p></main>${nav('library')}`;
}
function renderDetail(id){
  const e=state.exercises[id];if(!e)return notFound();
  const p=currentPlan(id),item=state.plans[p].items.find(i=>i.exerciseId===id),status=getStatus(state,date,p,id);
  app.innerHTML=`<main class="screen detail"><header class="topbar"><a href="#/${origin}" class="back" aria-label="Назад">${icon('back')}<span>Назад</span></a><a class="edit-action" href="#/edit/${encodeURIComponent(id)}">Изменить</a></header>${alertHTML()}<h1 tabindex="-1">${esc(e.name)}</h1><div class="upper-grid">${cover(e,'large')}<div><span class="section-label">Область тела</span><div class="tag-list">${e.body.map(x=>`<span class="tag">${esc(x)}</span>`).join('')||'<span class="hint">Не указана</span>'}</div><p class="dose">${dose(item)}</p><p class="hint">${esc(state.plans[p].name)}</p>${item?.optional?'<p class="optional-note">По самочувствию</p>':''}</div></div><section class="description-section"><h2 class="section-label">Описание</h2><p class="description">${esc(e.description||'Описание пока не добавлено.')}</p></section>${item?`<section class="detail-weight"><label for="detail-weight" class="field-label">Вес, кг</label><div class="large-weight"><input id="detail-weight" class="weight-input" type="text" inputmode="decimal" maxlength="8" data-weight-id="${esc(id)}" data-weight-plan="${esc(p)}" value="${esc(String(getWeight(state,date,p,id)).replace('.',','))}" placeholder="0"><span>кг</span></div></section>`:''}</main><div class="bottom-actions detail-actions"><button class="button accent wide" data-action="status" data-id="${esc(id)}" data-plan="${esc(p)}" data-value="done" aria-pressed="${status==='done'}">${status==='done'?icon('check'):''}${status==='done'?'Выполнено':'Отметить выполненным'}</button><button class="quiet wide ${status==='skipped'?'skip-label':''}" data-action="status" data-id="${esc(id)}" data-plan="${esc(p)}" data-value="skipped" aria-pressed="${status==='skipped'}">${status==='skipped'?'Пропущено · снять отметку':'Пропустить'}</button></div>`;
}
function draftKey(){return `fitness.draft.${formState?.id||'new'}`;}
function writeDraft(){if(!formState)return;try{storage?.setItem(draftKey(),JSON.stringify(formState));}catch{/* Main save reports persistent storage errors. */}}
function readFields(){const f=document.querySelector('#exercise-form');if(!f||!formState)return;for(const k of ['name','description','sets','reps'])formState[k]=f.elements[k].value;formState.optional=f.elements.optional.checked;formState.plan=f.elements.plan.value;writeDraft();}
function renderForm(id){
  const previous=id?state.exercises[id]:null;if(id&&!previous)return notFound();
  if(!formState||formState.id!==(id||'')){
    const p=previous?currentPlan(id):state.selectedPlan,item=state.plans[p].items.find(i=>i.exerciseId===id);
    formState={id:id||'',name:previous?.name||'',body:[...(previous?.body||[])],description:previous?.description||'',cover:previous?.cover||'',tile:previous?.tile,sets:item?.sets||'',reps:item?.reps||'',optional:item?.optional||false,plan:p};
    try{const draft=JSON.parse(storage?.getItem(draftKey())||'null');if(draft&&draft.id===(id||'')&&typeof draft.name==='string'&&Array.isArray(draft.body)&&validCover(draft.cover)&&Object.hasOwn(state.plans,draft.plan))formState=draft;}catch{}
  }
  const f=formState;
  app.innerHTML=`<main class="screen editor"><header class="topbar"><a href="${id?`#/exercise/${encodeURIComponent(id)}`:`#/${origin}`}" class="back" aria-label="Назад">${icon('back')}</a><h2>${id?'Изменить упражнение':'Новое упражнение'}</h2><span class="spacer"></span></header>${alertHTML()}<form id="exercise-form"><div class="field"><label class="field-label" for="name">Название</label><input type="text" id="name" name="name" maxlength="120" required placeholder="Например, приседания" value="${esc(f.name)}"></div><div class="upper-grid"><div><span class="field-label">Обложка</span><button class="cover-button" type="button" data-action="photo" aria-label="Выбрать обложку" style="border:0;padding:0;background:none;width:100%;text-align:left;position:relative">${cover(f,'large')}<span class="cover-overlay">${icon('image')} ${f.cover||Number.isInteger(f.tile)?'Изменить':'Добавить фото'}</span></button><input id="photo-file" class="file-input" type="file" accept="image/png,image/jpeg,image/webp"><button type="button" class="button link-cover" data-action="cover-url">${icon('link')} Добавить по ссылке</button></div><div><span class="field-label">Область тела</span><div class="body-editor">${f.body.map((b,i)=>`<span class="tag">${esc(b)}<button type="button" class="remove-tag" data-action="remove-tag" data-index="${i}" aria-label="Убрать область ${esc(b)}">${icon('x')}</button></span>`).join('')}</div><div class="tag-input"><input id="new-tag" type="text" maxlength="40" list="body-suggestions" placeholder="Ноги, руки…" aria-label="Новая область тела"><button type="button" class="icon-button" data-action="add-tag" aria-label="Добавить область тела">${icon('plus')}</button></div><datalist id="body-suggestions">${[...new Set(Object.values(state.exercises).flatMap(x=>x.body))].map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist></div></div><div class="field"><label class="field-label" for="description">Описание</label><textarea id="description" name="description" maxlength="10000" placeholder="Назначение упражнения и ваши заметки">${esc(f.description)}</textarea></div><div class="field-row"><div class="field"><label class="field-label" for="sets">Подходы</label><input id="sets" name="sets" type="number" min="1" max="99" inputmode="numeric" value="${esc(f.sets)}" placeholder="3"></div><div class="field"><label class="field-label" for="reps">Повторения</label><input id="reps" name="reps" type="text" maxlength="40" value="${esc(f.reps)}" placeholder="10–12"></div></div><div class="field"><label class="field-label" for="plan">Тренировка</label><select id="plan" name="plan" aria-describedby="plan-hint">${Object.keys(state.plans).map(p=>`<option value="${esc(p)}" ${p===f.plan?'selected':''}>${esc(state.plans[p].name)} · ${esc(state.plans[p].focus)}</option>`).join('')}</select><p class="hint" id="plan-hint">Подходы и повторения относятся к выбранной тренировке. Название и описание общие.</p></div><label class="checkbox-label"><input type="checkbox" name="optional" ${f.optional?'checked':''}>По самочувствию</label><p id="form-error" class="error" role="alert"></p><p class="hint">Черновик сохраняется при вводе.</p></form></main><div class="bottom-actions"><button type="submit" form="exercise-form" class="button primary wide">Сохранить упражнение</button></div>`;
}
function writeWorkoutDraft(){if(workoutFormState)try{storage?.setItem(`fitness.workout.draft.${workoutFormState.id||'new'}`,JSON.stringify(workoutFormState));}catch{}}
function renderWorkout(id=''){
  if(id&&!Object.hasOwn(state.plans,id))return notFound();
  if(!workoutFormState||workoutFormState.id!==id){
    workoutFormState=workoutDraft(state,id);workoutQuery='';
    try{const draft=JSON.parse(storage?.getItem(`fitness.workout.draft.${id||'new'}`)||'null');if(draft&&draft.id===id&&typeof draft.name==='string'&&typeof draft.focus==='string'&&Array.isArray(draft.items)&&draft.items.every(i=>i&&Object.hasOwn(state.exercises,i.exerciseId)&&typeof i.sets==='string'&&typeof i.reps==='string'))workoutFormState=draft;}catch{}
  }
  app.innerHTML=workoutEditorView(state,workoutFormState,workoutQuery,{esc,icon,cover,dose});
}
function notFound(){app.innerHTML=`<main class="screen empty"><h1>Не найдено</h1><p>Такого упражнения нет в библиотеке.</p><a class="button primary" href="#/training">К тренировке</a></main>`;}
function render({keepFocus=false}={}){
  const active=keepFocus?document.activeElement:null,key=active?.dataset?.action,id=active?.dataset?.id,value=active?.dataset?.value,plan=active?.dataset?.plan;
  const parts=location.hash.slice(2).split('/'),view=parts[0]||'training';
  if(view==='workout'){origin='training';renderWorkout(parts[1]==='new'?'':decodeURIComponent(parts[1]||''));}else if(view==='training'){origin='training';renderTraining();}else if(view==='library'){origin='library';renderLibrary();}else if(view==='cloud'){app.innerHTML=cloud?cloud.view(esc,icon):'<main class="screen"><h1>Облако</h1><p>Загрузка подключения…</p></main>';}else if(view==='calendar'){app.innerHTML=calendarView(state,calendarMonth,calendarSelected,{esc,icon,nav,cover,dose});}else if(view==='history'){const key=decodeURIComponent(parts[1]||'');const record=state.history?.[key];if(record){calendarSelected=record.date;calendarMonth=new Date(`${record.date.slice(0,7)}-01T12:00:00`);app.innerHTML=historyView(record,{esc,icon,nav,cover,statusLine,dose});}else notFound();}else if(view==='exercise'){renderDetail(decodeURIComponent(parts[1]||''));}else if(view==='new'||view==='edit'){renderForm(view==='edit'?decodeURIComponent(parts[1]||''):null);}else notFound();
  document.title=`Fitness · ${view==='workout'?'Программа тренировки':view==='cloud'?'Облачная синхронизация':view==='calendar'?'Календарь':view==='history'?'История тренировки':view==='library'?'Упражнения':view==='new'?'Новое упражнение':'Тренировка'}`;
  if(key){[...app.querySelectorAll('[data-action]')].find(x=>x.dataset.action===key&&x.dataset.id===id&&x.dataset.value===value&&x.dataset.plan===plan)?.focus({preventScroll:true});}
}
function addTag(){readFields();const el=document.querySelector('#new-tag'),value=el.value.trim();if(!value)return;if(formState.body.length>=8){toast('Можно добавить до 8 областей тела');return;}if(!formState.body.includes(value))formState.body.push(value);writeDraft();renderForm(formState.id||null);document.querySelector('#new-tag')?.focus();}
function download(){const data=JSON.stringify(state,null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`fitness-${date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function confirmDialog(title,text,onConfirm){
  const d=document.createElement('dialog');d.className='modal';d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="action-pair"><button class="button secondary" data-cancel>Отмена</button><button class="button primary" data-confirm>Подтвердить</button></div>`;document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>closeDialogWithMotion(d);d.querySelector('[data-confirm]').onclick=()=>{onConfirm();closeDialogWithMotion(d);};d.addEventListener('close',()=>d.remove());d.showModal();
}
function openCoverDialog(){
  readFields();const d=document.createElement('dialog');d.className='modal';d.innerHTML=`<form><h2>Обложка по ссылке</h2><p>Вставьте прямую ссылку на изображение.</p><label class="field-label" for="cover-url">Ссылка</label><input id="cover-url" type="url" placeholder="https://…" value="${esc(formState.cover?.startsWith('http')?formState.cover:'')}"><p class="error" role="alert"></p><div class="action-pair"><button type="button" class="button secondary" data-cancel>Отмена</button><button type="submit" class="button primary">Применить</button></div></form>`;document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>closeDialogWithMotion(d);d.addEventListener('close',()=>d.remove());d.querySelector('form').onsubmit=e=>{e.preventDefault();const url=d.querySelector('input').value.trim();if(!url||!/^https?:/.test(url)||!validCover(url)){d.querySelector('.error').textContent='Нужна прямая http/https-ссылка на фото.';return;}formState.cover=url;writeDraft();closeDialogWithMotion(d);renderForm(formState.id||null);};d.showModal();
}
app.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;const a=button.dataset.action;
  if(a==='cloud-sync')cloud?.engine.poll();
  if(a==='cloud-signout')confirmDialog('Выйти из аккаунта?','Данные на устройстве останутся доступны. Если есть несинхронизированные изменения, перед выходом скачайте копию.',()=>{cloud?.signOut().catch(e=>toast(e.message));});
  if(a==='cloud-use-remote')confirmDialog('Использовать облачную копию?','Текущая локальная копия будет скачана, затем данные на устройстве заменятся облачными.',()=>{download();cloud?.engine.useCloud().catch(e=>toast(e.message));});
  if(a==='cloud-use-local')confirmDialog('Загрузить локальную копию?','Текущая копия будет скачана в файл. Данные в облаке заменятся этой копией. Другие устройства получат её после синхронизации.',()=>{download();cloud?.engine.useLocal().catch(e=>toast(e.message));});
  if(a==='appearance'){setAppearance(button.dataset.value);render();}
  if(a==='workout-toggle'||a==='workout-move'){
    if(!workoutFormState)return;readWorkoutForm(document.querySelector('#workout-form'),workoutFormState);
    const id=button.dataset.id,index=workoutFormState.items.findIndex(i=>i.exerciseId===id);
    if(a==='workout-toggle'){
      if(index>=0)workoutFormState.items.splice(index,1);
      else if(state.exercises[id]){const previous=Object.values(state.plans).flatMap(p=>p.items).find(i=>i.exerciseId===id);workoutFormState.items.push({exerciseId:id,sets:previous?.sets||'3',reps:previous?.reps||'10–12',optional:Boolean(previous?.optional)});}
    }else{const next=index+Number(button.dataset.step);if(index>=0&&next>=0&&next<workoutFormState.items.length)[workoutFormState.items[index],workoutFormState.items[next]]=[workoutFormState.items[next],workoutFormState.items[index]];}
    writeWorkoutDraft();renderWorkout(workoutFormState.id);
  }
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
  if(event.target.closest('#workout-form')){
    readWorkoutForm(document.querySelector('#workout-form'),workoutFormState);writeWorkoutDraft();
    if(event.target.id==='workout-search'){const pos=event.target.selectionStart;workoutQuery=event.target.value;renderWorkout(workoutFormState.id);const f=document.querySelector('#workout-search');f.focus();f.setSelectionRange(pos,pos);}
    return;
  }
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
  if(event.target.id==='workout-form'){
    event.preventDefault();readWorkoutForm(event.target,workoutFormState);
    try{const key=`fitness.workout.draft.${workoutFormState.id||'new'}`,id=saveWorkout(state,workoutFormState);state.selectedPlan=id;const saved=persistState();if(saved)try{storage?.removeItem(key);}catch{}workoutFormState=null;location.hash='#/training';toast(saved?'Тренировка сохранена':'Тренировка создана в памяти. Скачайте копию.');}
    catch(error){const el=document.querySelector('#workout-error');el.textContent=error.message;el.scrollIntoView({block:'center'});}
    return;
  }
  if(event.target.id==='cloud-auth'){
    event.preventDefault();const form=event.target,submit=event.submitter,buttons=[...form.querySelectorAll('button')];
    buttons.forEach(b=>b.disabled=true);
    cloud?.authenticate(form.elements.email.value.trim(),form.elements.password.value,submit?.name==='signup').then(message=>{if(message)toast(message);if(location.hash==='#/cloud')render();}).catch(error=>{const m=document.querySelector('#cloud-message');if(m)m.textContent=error.message;buttons.forEach(b=>b.disabled=false);});
    return;
  }
  if(event.target.id!=='exercise-form')return;event.preventDefault();readFields();
  try{const oldId=formState.id,id=saveExercise(state,formState,formState.plan);state.selectedPlan=formState.plan;const saved=persistState();if(saved){try{storage.removeItem(`fitness.draft.${oldId||'new'}`);}catch{}}formState=null;location.hash=`#/exercise/${encodeURIComponent(id)}`;if(saved)toast('Упражнение сохранено');}
  catch(error){document.querySelector('#form-error').textContent=error.message;document.querySelector('#form-error').scrollIntoView({block:'center'});}
});
app.addEventListener('change',async event=>{
  if(event.target.matches('[data-action="choose-plan"]')&&Object.hasOwn(state.plans,event.target.value)){state.selectedPlan=event.target.value;persistState();render();}

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
window.addEventListener('hashchange',()=>{const isForm=/^#\/(new|edit)/.test(location.hash);if(!isForm)formState=null;if(!/^#\/workout\//.test(location.hash))workoutFormState=null;render();window.scrollTo({top:0,behavior:'instant'});animateScreenEntry();app.querySelector('h1')?.focus({preventScroll:true});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const now=localDate();if(now!==date){date=now;if(!document.querySelector('#exercise-form,#workout-form'))render();}}});
render();
animateScreenEntry();

// Load cloud support separately so local training remains usable if the network fails.
import('./cloud.js?v=4').then(({startCloud})=>{
  cloud=startCloud({storage,getState:()=>state,applyRemote:incoming=>{
    state=incoming;if(storage)persist(storage,state);
    const editing=document.activeElement?.matches('input,textarea,select')||document.querySelector('#exercise-form,#workout-form');
    if(!editing&&location.hash!=='#/cloud')render();
  },onStatus:status=>{
    const badge=document.querySelector('#sync-badge');if(badge)badge.textContent=status.text;
    if(location.hash==='#/cloud'&&(!document.querySelector('#cloud-auth')||cloud?.user))render();
  }});
  if(location.hash==='#/cloud')render();
}).catch(()=>{if(location.hash==='#/cloud')app.innerHTML='<main class="screen"><h1>Нет связи с облаком</h1><p>Перезагрузите страницу. Локальные тренировки доступны.</p><a class="button primary" href="#/training">К тренировке</a></main>';});
