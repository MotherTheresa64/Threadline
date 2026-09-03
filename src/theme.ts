type ThemeId='paper'|'moss'|'lavender'|'night';
type ThemeOption={id:ThemeId;label:string;description:string;colors:[string,string];browserColor:string};
const STORAGE_KEY='threadline-theme-v2';
const DEFAULT_THEME:ThemeId='night';
const themes:ThemeOption[]=[
  {id:'paper',label:'Carbon',description:'Soft black with restrained silver',colors:['#08090d','#9aa4b2'],browserColor:'#08090d'},
  {id:'moss',label:'Signal',description:'Deep charcoal with muted green',colors:['#070d0b','#62b890'],browserColor:'#070d0b'},
  {id:'lavender',label:'Ultraviolet',description:'Black plum with electric lavender',colors:['#090713','#a85cff'],browserColor:'#090713'},
  {id:'night',label:'Threadline',description:'Near-black with signature violet',colors:['#05060c','#9d4dff'],browserColor:'#05060c'}
];
function isTheme(value:string|null):value is ThemeId{return themes.some(theme=>theme.id===value)}
function readTheme():ThemeId{try{const saved=localStorage.getItem(STORAGE_KEY);return isTheme(saved)?saved:DEFAULT_THEME}catch{return DEFAULT_THEME}}
function persistTheme(theme:ThemeId){try{localStorage.setItem(STORAGE_KEY,theme)}catch{/* Theme remains usable in memory. */}}
function setBrowserColor(color:string){let meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.append(meta)}meta.content=color}
function applyTheme(theme:ThemeId){
  const option=themes.find(item=>item.id===theme)??themes[0];
  document.documentElement.dataset.theme=option.id;
  document.documentElement.style.colorScheme='dark';
  setBrowserColor(option.browserColor);persistTheme(option.id);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button=>{const active=button.dataset.themeChoice===option.id;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active)});
  const label=document.querySelector<HTMLElement>('[data-current-theme]');if(label)label.textContent=option.label;
}
function createThemeControl(){
  if(document.querySelector('.theme-control'))return;
  const host=document.createElement('div');host.className='theme-control';
  host.innerHTML=`<button class="theme-toggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Choose appearance"><span class="theme-toggle-icon" aria-hidden="true">◐</span><span class="theme-toggle-copy"><b>Appearance</b><small data-current-theme></small></span><span aria-hidden="true">⌃</span></button><div class="theme-panel" role="dialog" aria-label="Choose Threadline theme" hidden><div class="theme-panel-head"><div><b>Choose your reading space</b><small>Saved on this device.</small></div><button class="theme-close" type="button" aria-label="Close theme picker">×</button></div><div class="theme-options"></div></div>`;
  const options=host.querySelector<HTMLElement>('.theme-options')!;
  const toggle=host.querySelector<HTMLButtonElement>('.theme-toggle')!;const panel=host.querySelector<HTMLElement>('.theme-panel')!;const closeButton=host.querySelector<HTMLButtonElement>('.theme-close')!;
  const open=()=>{panel.hidden=false;toggle.setAttribute('aria-expanded','true');requestAnimationFrame(()=>panel.classList.add('open'))};
  const close=()=>{panel.classList.remove('open');toggle.setAttribute('aria-expanded','false');window.setTimeout(()=>{panel.hidden=true},150)};
  themes.forEach(theme=>{const button=document.createElement('button');button.type='button';button.className='theme-option';button.dataset.themeChoice=theme.id;button.innerHTML=`<span class="theme-swatch" style="--swatch-a:${theme.colors[0]};--swatch-b:${theme.colors[1]}"></span><span><b>${theme.label}</b><small>${theme.description}</small></span><span class="theme-check" aria-hidden="true">✓</span>`;button.addEventListener('click',()=>{applyTheme(theme.id);close()});options.append(button)});
  toggle.addEventListener('click',()=>panel.hidden?open():close());closeButton.addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close()});document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!host.contains(event.target as Node))close()});document.body.append(host);applyTheme(readTheme());
}
export function initializeThemes(){applyTheme(readTheme());if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createThemeControl,{once:true});else queueMicrotask(createThemeControl)}
