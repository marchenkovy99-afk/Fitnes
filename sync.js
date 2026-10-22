import {initialState,restoreState} from './model.js?v=6';
const META='fitness.sync.meta';
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>k!=='selectedPlan').map(k=>[k,stable(value[k])]));return value;}
export const sameData=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export class SyncEngine{
  constructor(options){Object.assign(this,options);this.status={kind:'local',text:'На этом устройстве'};this.epoch=0;this.busy=false;this.userId=null;this.meta={dirty:false,revision:0,userId:null};try{Object.assign(this.meta,JSON.parse(this.storage?.getItem(META)||'{}'));}catch{}}
  notify(kind,text){this.status={kind,text};this.onStatus(this.status);}
  remember(){try{this.storage?.setItem(META,JSON.stringify(this.meta));}catch{}}
  disconnect(){this.epoch++;this.userId=null;this.busy=false;clearTimeout(this.timer);this.notify('local','На этом устройстве');}
  markChanged(){this.meta.dirty=true;this.remember();if(this.userId&&this.status.kind!=='conflict'){this.notify('pending','Есть несохранённые в облаке изменения');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),900);this.timer.unref?.();}}
  validated(row){if(!row)return null;const payload=restoreState(JSON.stringify(row.payload));if(!payload||!Number.isSafeInteger(Number(row.revision))||Number(row.revision)<1)throw new Error('Облачная копия повреждена. Локальные данные сохранены.');return {...row,payload,revision:Number(row.revision)};}
  accept(row){const current=this.readLocal().selectedPlan,selectedPlan=Object.hasOwn(row.payload.plans,current)?current:row.payload.selectedPlan;this.applyRemote({...row.payload,selectedPlan});this.meta={userId:this.userId,revision:row.revision,dirty:false};this.remember();this.notify('synced','Синхронизировано');}
  async connect(userId){
    this.userId=userId;const epoch=++this.epoch;this.busy=true;this.notify('loading','Подключение к облаку…');
    try{
      const row=this.validated(await this.load());if(epoch!==this.epoch)return;
      const local=this.readLocal(),oldOwner=this.meta.userId&&this.meta.userId!==userId;
      if(oldOwner){this.notify('conflict','На устройстве данные другого аккаунта. Выберите, какую копию использовать.');return;}
      if(row){
        if(sameData(local,row.payload)){this.meta={userId,revision:row.revision,dirty:false};this.remember();this.notify('synced','Синхронизировано');}
        else if(sameData(local,initialState())||(this.meta.userId===userId&&!this.meta.dirty))this.accept(row);
        else this.notify('conflict','Локальная и облачная копии различаются. Выберите нужную.');
      }else{this.meta={userId,revision:0,dirty:true};this.remember();}
    }catch(error){if(epoch===this.epoch)this.notify('offline',error.message||'Нет соединения с облаком');}
    finally{if(epoch===this.epoch)this.busy=false;}
    if(epoch===this.epoch&&this.meta.dirty&&this.status.kind!=='conflict'&&this.status.kind!=='offline')await this.flush();
  }
  async flush(){
    if(!this.userId||this.busy||!this.meta.dirty||this.status.kind==='conflict')return;
    const epoch=this.epoch,snapshot=structuredClone(this.readLocal());this.busy=true;this.notify('loading','Сохранение в облако…');
    try{const row=this.validated(await this.save(snapshot,this.meta.revision));if(epoch!==this.epoch)return;this.meta={userId:this.userId,revision:row.revision,dirty:!sameData(snapshot,this.readLocal())};this.remember();this.notify(this.meta.dirty?'pending':'synced',this.meta.dirty?'Есть новые изменения':'Синхронизировано');}
    catch(error){if(epoch===this.epoch)this.notify(error.code==='40001'?'conflict':'offline',error.code==='40001'?'Данные изменились на другом устройстве. Обе копии сохранены.':error.message||'Нет связи. Изменения сохранены на устройстве.');}
    finally{if(epoch===this.epoch)this.busy=false;}
    if(this.meta.dirty&&this.status.kind==='pending')this.markChanged();
  }
  async poll(){
    if(!this.userId||this.busy||this.status.kind==='conflict')return;
    if(this.meta.dirty)return this.flush();
    const epoch=this.epoch;this.busy=true;
    try{const row=this.validated(await this.load());if(epoch===this.epoch&&row&&!this.meta.dirty&&row.revision!==this.meta.revision)this.accept(row);else if(epoch===this.epoch)this.notify('synced','Синхронизировано');}
    catch{if(epoch===this.epoch)this.notify('offline','Нет связи. Локальные данные доступны.');}
    finally{if(epoch===this.epoch)this.busy=false;}
  }
  async useCloud(){if(!this.userId||this.busy)return;const epoch=this.epoch;this.busy=true;try{const row=this.validated(await this.load());if(epoch!==this.epoch)return;if(row)this.accept(row);else{this.applyRemote(initialState());this.meta={userId:this.userId,revision:0,dirty:false};this.remember();this.notify('synced','В облаке пока нет данных');}}finally{if(epoch===this.epoch)this.busy=false;}}
  async useLocal(){if(!this.userId||this.busy)return;const epoch=this.epoch;this.busy=true;try{const row=this.validated(await this.load());if(epoch!==this.epoch)return;this.meta={userId:this.userId,revision:row?.revision||0,dirty:true};this.remember();this.notify('pending','Сохранение выбранной копии');}finally{if(epoch===this.epoch)this.busy=false;}await this.flush();}
}
