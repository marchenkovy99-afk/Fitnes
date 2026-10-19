import {localDate} from './model.js?v=4';

export function monthGrid(year,month){
  const first=new Date(year,month,1,12),offset=(first.getDay()+6)%7;
  return Array.from({length:42},(_,i)=>{
    const d=new Date(year,month,1-offset+i,12);
    return {date:localDate(d),day:d.getDate(),inMonth:d.getMonth()===month};
  });
}
const formatDate=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00`));

export function calendarView(state,month,selected,h){
  const {esc,icon,nav,cover,dose}=h,year=month.getFullYear(),m=month.getMonth(),today=localDate();
  const records=Object.values(state.history||{}),monthKey=`${year}-${String(m+1).padStart(2,'0')}`;
  const selectedRecords=records.filter(x=>x.date===selected).sort((a,b)=>a.plan.localeCompare(b.plan));
  const count=records.filter(x=>x.date.startsWith(monthKey)).length;
  return `<main class="screen calendar-screen"><header><h1 tabindex="-1">Календарь</h1><p class="page-intro">История тренировок</p></header><section class="calendar-panel" aria-label="Календарь тренировок"><div class="month-controls"><button class="icon-button" data-action="calendar-month" data-step="-1" aria-label="Предыдущий месяц">${icon('back')}</button><h2>${esc(new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(month))}</h2><button class="icon-button" data-action="calendar-month" data-step="1" aria-label="Следующий месяц">${icon('chevron')}</button></div><div class="calendar-weekdays" aria-hidden="true">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${monthGrid(year,m).map(day=>{
    const entries=records.filter(x=>x.date===day.date);
    return `<button class="calendar-day ${day.inMonth?'':'outside'} ${day.date===today?'today':''} ${day.date===selected?'selected':''}" data-action="calendar-day" data-date="${day.date}" aria-label="${esc(formatDate(day.date))}${entries.length?`, завершено тренировок: ${entries.length}`:', нет завершённых тренировок'}" aria-pressed="${day.date===selected}" ${day.date===today?'aria-current="date"':''}><span>${day.day}</span><span class="day-markers" aria-hidden="true">${entries.slice(0,5).map(()=>'<i></i>').join('')}</span></button>`;
  }).join('')}</div><div class="calendar-footer"><span>Завершено за месяц: <strong>${count}</strong></span><button class="quiet" data-action="calendar-today">Сегодня</button></div></section><section class="day-history" aria-label="Тренировки выбранного дня"><h2>${esc(formatDate(selected))}</h2>${selectedRecords.length?selectedRecords.map(r=>`<a class="history-card" href="#/history/${encodeURIComponent(`${r.date}:${r.plan}`)}"><div class="history-card-heading"><span><strong>${esc(r.name)}</strong><span class="body-line">${esc(r.focus)}${r.focus?' · ':''}${r.items.length} упражнений</span></span>${icon('chevron')}</div><span class="history-saved">${icon('check')} Выполнена</span>${r.items.slice(0,3).map(item=>`<div class="history-preview">${cover(item)}<span><strong>${esc(item.name)}</strong><small>${dose(item)}</small></span><span class="preview-weight">${item.weight===null?'—':esc(String(item.weight).replace('.',','))} кг</span></div>`).join('')}<span class="history-meta">${r.items.length>3?'Все упражнения и результаты':'Подробности тренировки'} ${r.items.filter(x=>x.status==='done').length} / ${r.items.length}</span></a>`).join(''):'<div class="calendar-empty"><span class="empty-calendar-icon">'+icon('calendar')+'</span><p>Нет завершённых тренировок</p><span>Отметьте тренировку выполненной, и она появится здесь вместе с весами.</span></div>'}</section></main>${nav('calendar')}`;
}

export function historyView(record,h){
  const {esc,icon,nav,cover,statusLine,dose}=h;
  return `<main class="screen history-screen"><header class="topbar"><a class="back" href="#/calendar" aria-label="Назад к календарю">${icon('back')}</a><h2>История тренировки</h2><span class="spacer"></span></header><p class="eyebrow">${esc(formatDate(record.date))}</p><h1 tabindex="-1">${esc(record.name)}</h1><p class="history-focus">${esc(record.focus)}</p><div class="history-summary">${icon('check')} Тренировка завершена <span>${record.items.filter(x=>x.status==='done').length} / ${record.items.length}</span></div><div class="history-exercises">${record.items.map((item,i)=>`<details class="history-exercise"><summary><span class="number">${String(i+1).padStart(2,'0')}</span>${cover(item)}<span class="history-exercise-copy"><span class="exercise-name">${esc(item.name)}</span><span class="body-line">${dose(item)}</span>${statusLine(item.status)}</span><span class="history-weight">${item.weight===null?'—':esc(String(item.weight).replace('.',','))}<small>кг</small></span></summary><div class="historical-description"><span class="body-line">${esc(item.body.join(' · '))}${item.optional?' · По самочувствию':''}</span><h2 class="section-label">Описание</h2><p>${esc(item.description||'Описание не добавлено.')}</p></div></details>`).join('')}</div><p class="subtle-note">Сохранены упражнения и нагрузки на момент завершения. Нажмите на упражнение, чтобы открыть описание.</p></main>${nav('calendar')}`;
}
