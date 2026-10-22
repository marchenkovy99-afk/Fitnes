import {createClient} from './vendor/supabase.js';
import {SUPABASE_URL,SUPABASE_KEY} from './cloud-config.js';
import {SyncEngine} from './sync.js?v=6';

export function startCloud(options){
  const client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:'fitness.supabase.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  let user=null,authMessage='',lastUserId;
  const engine=new SyncEngine({storage:options.storage,readLocal:options.getState,applyRemote:options.applyRemote,onStatus:options.onStatus,
    load:async()=>{const {data,error}=await client.from('fitness_sync_state').select('payload,revision,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;return data;},
    save:async(payload,revision)=>{const {data,error}=await client.rpc('fitness_write_state',{p_payload:payload,p_expected:revision});if(error)throw error;return Array.isArray(data)?data[0]:data;}
  });
  async function sessionChanged(session){
    const next=session?.user||null;if(next?.id===lastUserId)return;
    lastUserId=next?.id;user=next;
    if(user)await engine.connect(user.id);else engine.disconnect();
    options.onStatus(engine.status);
  }
  client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>sessionChanged(session),0);});
  client.auth.getSession().then(({data,error})=>{if(error)engine.notify('offline','Не удалось восстановить вход. Попробуйте войти заново.');else sessionChanged(data.session);});
  const timer=setInterval(()=>{if(!document.hidden)engine.poll();},30000);
  window.addEventListener('online',()=>engine.poll());
  window.addEventListener('focus',()=>engine.poll());
  function view(esc,icon){
    return `<main class="screen cloud-screen"><header class="topbar"><a href="#/library" class="back" aria-label="Назад">${icon('back')}</a><h2>Облачная синхронизация</h2><span class="spacer"></span></header><div class="cloud-hero">${icon('cloud')}<h1 tabindex="-1">Ваши тренировки.<br>На всех устройствах.</h1><p>Упражнения, веса, обложки и календарь в одном аккаунте.</p></div>${user?`<section class="cloud-card"><h2>${esc(user.email||'Аккаунт подключён')}</h2><p class="sync-status ${engine.status.kind}">${esc(engine.status.text)}</p>${engine.status.kind==='conflict'?'<p class="hint">При выборе копии текущие локальные данные сначала будут скачаны в резервный файл.</p><div class="cloud-choice"><button class="button secondary" data-action="cloud-use-remote">Использовать облачную копию</button><button class="button secondary" data-action="cloud-use-local">Загрузить мою копию в облако</button></div>':'<button class="button primary wide" data-action="cloud-sync">Синхронизировать сейчас</button>'}<button class="quiet wide" data-action="cloud-signout">Выйти из аккаунта</button></section>`:`<form id="cloud-auth" class="cloud-card"><h2>Вход в Fitness</h2><p class="hint">На другом устройстве войдите в тот же аккаунт. Если уже есть аккаунт в вашем трекере на этом проекте Supabase, можно использовать его.</p><div class="field"><label class="field-label" for="cloud-email">Электронная почта</label><input id="cloud-email" name="email" type="email" autocomplete="username" required placeholder="name@example.com"></div><div class="field"><label class="field-label" for="cloud-password">Пароль</label><input id="cloud-password" name="password" type="password" autocomplete="current-password" minlength="8" required placeholder="Не менее 8 символов"></div><button class="button primary wide" type="submit">Войти</button><button class="button secondary wide" style="margin-top:10px" type="submit" name="signup" value="yes">Создать аккаунт</button></form>`}<p id="cloud-message" class="hint" role="status">${esc(authMessage)}</p><p class="subtle-note">Без входа приложение сохраняет данные на устройстве. При несовпадении копий синхронизация предложит выбор и не перезапишет результаты автоматически.</p></main>`;
  }
  return {engine,view,get user(){return user;},get status(){return engine.status;},
    async authenticate(email,password,signup){
      authMessage='';
      const result=signup?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
      if(result.error){authMessage=result.error.message==='Invalid login credentials'?'Проверьте почту и пароль.':result.error.message;throw new Error(authMessage);}
      if(signup&&!result.data.session)authMessage='Подтвердите регистрацию по письму Supabase, затем войдите с этой почтой и паролем.';
      else if(result.data.session)await sessionChanged(result.data.session);
      options.onStatus(engine.status);return authMessage;
    },
    async signOut(){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;lastUserId=undefined;user=null;engine.disconnect();options.onStatus(engine.status);},
    destroy(){clearInterval(timer);engine.disconnect();}
  };
}
