const media=window.matchMedia('(prefers-color-scheme: dark)');
let appearance=document.documentElement.dataset.appearance||'auto';
export const getAppearance=()=>appearance;
export function setAppearance(value){
  appearance=['auto','light','dark'].includes(value)?value:'auto';
  const theme=appearance==='auto'?(media.matches?'dark':'light'):appearance;
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.appearance=appearance;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#161819':'#f6f4ef');
  try{window.localStorage.setItem('fitness.appearance',appearance);}catch{}
}
media.addEventListener('change',()=>{if(appearance==='auto')setAppearance('auto');});
setAppearance(appearance);
