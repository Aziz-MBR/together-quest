"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Person = string;
type Member = { id:string; name:string; color:string };
type Task = { id:number; owner:Person; title:string; note:string; stage:number; points:number; done:boolean };
type Comment = { id:number; author:string; text:string; date:string };
type QuestState = { tasks:Task[]; savings:{contributions:Record<string,number>;goal:number}; comments:Comment[]; members:Member[]; destination:{country:string;flag:string;year:number} };

const STORAGE_KEY = "together-quest-demo-v1";
const sharedOwner = "Общее";
const palette = ["#8d77e8","#319bd7","#f48c66","#d65e9c","#5fa969","#e2a52d"];
const countries = [{country:"Малайзия",flag:"🇲🇾"},{country:"Польша",flag:"🇵🇱"},{country:"Франция",flag:"🇫🇷"},{country:"Армения",flag:"🇦🇲"},{country:"Таиланд",flag:"🇹🇭"},{country:"Индонезия",flag:"🇮🇩"},{country:"Другая цель",flag:"🌍"}];

const stages = [
  { id:1,title:"Старт",subtitle:"Наводим порядок",icon:"🌱" },
  { id:2,title:"Документы",subtitle:"Собираем основу",icon:"📁" },
  { id:3,title:"Навыки",subtitle:"Усиливаем себя",icon:"⚡" },
  { id:4,title:"Выбор вузов",subtitle:"Находим свой маршрут",icon:"🎓" },
  { id:5,title:"Подача",subtitle:"Отправляем заявки",icon:"🚀" },
  { id:6,title:"Переезд",subtitle:"Малайзия ждёт",icon:"🇲🇾" },
];

const seed:QuestState = {
  savings:{contributions:{Musya:0,Tank:0},goal:500000}, comments:[],
  members:[{id:"Musya",name:"Musya",color:palette[0]},{id:"Tank",name:"Tank",color:palette[1]}],
  destination:{country:"Малайзия",flag:"🇲🇾",year:2027},
  tasks:[
    {id:1,owner:"Musya",title:"Определить направления магистратуры",note:"AI, IT, аналитика и управление продуктами",stage:1,points:20,done:false},
    {id:2,owner:"Tank",title:"Записать данные прошлого обучения",note:"Вуз, специальность, даты, причина отчисления, закрытые курсы",stage:1,points:20,done:false},
    {id:3,owner:"Общее",title:"Согласовать бюджет и дату переезда",note:"Выбрать ориентир и сумму финансовой подушки",stage:1,points:30,done:false},
    {id:4,owner:"Musya",title:"Подготовить диплом и приложение",note:"Сделать качественные сканы для будущего перевода",stage:2,points:20,done:false},
    {id:5,owner:"Tank",title:"Получить академическую справку",note:"С оценками, часами и зачётными единицами",stage:2,points:30,done:false},
    {id:6,owner:"Tank",title:"Запросить программы дисциплин",note:"Они нужны для перезачёта предметов в Малайзии",stage:2,points:30,done:false},
    {id:7,owner:"Общее",title:"Проверить загранпаспорта",note:"Срок действия должен покрывать поступление и переезд",stage:2,points:20,done:false},
    {id:8,owner:"Tank",title:"Пройти пробный IELTS",note:"Зафиксировать баллы по четырём секциям",stage:3,points:20,done:false},
    {id:9,owner:"Tank",title:"Выбрать профессиональное направление",note:"IT, аналитика, QA, бизнес или другое — без распыления",stage:3,points:30,done:false},
    {id:10,owner:"Musya",title:"Собрать сильное портфолио",note:"ВКР, AI-продукт, сертификаты и достижения",stage:3,points:40,done:false},
    {id:11,owner:"Общее",title:"Сдать IELTS",note:"Цель — результат, подходящий выбранным программам",stage:3,points:50,done:false},
    {id:12,owner:"Musya",title:"Составить список магистратур",note:"3 приоритетных, 4 реалистичных, 3 запасных",stage:4,points:30,done:false},
    {id:13,owner:"Tank",title:"Запросить предварительный credit transfer",note:"Отправить транскрипт и программы дисциплин",stage:4,points:40,done:false},
    {id:14,owner:"Общее",title:"Выбрать вузы в одном городе",note:"Сравнить стоимость, жильё и даты начала учёбы",stage:4,points:40,done:false},
    {id:15,owner:"Musya",title:"Подать заявки в магистратуры",note:"Не ждать одного ответа — подаваться параллельно",stage:5,points:60,done:false},
    {id:16,owner:"Tank",title:"Подать заявки на бакалавриат",note:"Приложить запрос на перезачёт дисциплин",stage:5,points:60,done:false},
    {id:17,owner:"Общее",title:"Сравнить офферы и выбрать пару вузов",note:"Стоимость, сроки, перезачёт и расстояние",stage:5,points:60,done:false},
    {id:18,owner:"Общее",title:"Получить оба Student Pass",note:"Финальная проверка документов перед билетами",stage:6,points:80,done:false},
    {id:19,owner:"Общее",title:"Забронировать жильё на первый месяц",note:"Безопасный район и дорога до обоих вузов",stage:6,points:50,done:false},
    {id:20,owner:"Общее",title:"Прилететь в Малайзию",note:"Новый уровень открыт 💛",stage:6,points:100,done:false},
  ],
};

function normalize(raw:unknown):QuestState {
  if(!raw||typeof raw!=="object")return seed;
  const candidate=raw as Partial<QuestState>;
  if(
    !Array.isArray(candidate.tasks)||
    !Array.isArray(candidate.comments)||
    !Array.isArray(candidate.members)||
    !candidate.destination||
    !candidate.savings?.contributions
  )return seed;
  return candidate as QuestState;
}

export default function Home() {
  const [data,setData]=useState<QuestState>(seed);
  const [tab,setTab]=useState<Person>("Общее");
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const [taskOpen,setTaskOpen]=useState(false);
  const [fundOpen,setFundOpen]=useState(false);
  const [peopleOpen,setPeopleOpen]=useState(false);
  const [countryOpen,setCountryOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [newTask,setNewTask]=useState({owner:"Musya" as Person,title:"",note:"",stage:1});
  const [fund,setFund]=useState<{owner:Person;amount:string}>({owner:"Musya",amount:""});
  const [comment,setComment]=useState({author:"Musya",text:""});
  const [memberName,setMemberName]=useState("");
  const [destination,setDestination]=useState(seed.destination);

  useEffect(()=>{
    try {
      const saved=window.localStorage.getItem(STORAGE_KEY);
      if(saved)window.setTimeout(()=>setData(normalize(JSON.parse(saved))),0);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },[]);

  function persist(next:QuestState,message?:string){
    setData(next); setSaving(true);
    try{
      window.localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      if(message){setToast(message);window.setTimeout(()=>setToast(""),2400);}
    }catch{setToast("Браузер не разрешил сохранить изменения.");}finally{window.setTimeout(()=>setSaving(false),180);}
  }

  const doneCount=data.tasks.filter(t=>t.done).length;
  const totalPoints=data.tasks.filter(t=>t.done).reduce((s,t)=>s+t.points,0);
  const percentage=Math.round(doneCount/data.tasks.length*100);
  const savingTotal=Object.values(data.savings.contributions).reduce((sum,value)=>sum+value,0);
  const savingPercent=Math.min(100,Math.round(savingTotal/data.savings.goal*100));
  const firstIncompleteStage=stages.find(s=>data.tasks.some(t=>t.stage===s.id&&!t.done))?.id??6;
  const visibleStages=useMemo(()=>stages.map(stage=>({...stage,tasks:data.tasks.filter(task=>task.stage===stage.id&&(tab==="Общее"||task.owner===tab||task.owner==="Общее"))})),[data.tasks,tab]);

  function toggleTask(id:number){
    const task=data.tasks.find(t=>t.id===id);
    persist({...data,tasks:data.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)},task?.done?"Задача снова в пути":`+${task?.points??0} XP — отлично!`);
  }
  function addTask(e:FormEvent){e.preventDefault();if(!newTask.title.trim())return;const task:Task={id:Date.now(),...newTask,title:newTask.title.trim(),note:newTask.note.trim(),points:20,done:false};persist({...data,tasks:[...data.tasks,task]},"Новый шаг добавлен");setNewTask({owner:"Musya",title:"",note:"",stage:1});setTaskOpen(false);}
  function addFunds(e:FormEvent){e.preventDefault();const amount=Number(fund.amount);if(!Number.isFinite(amount)||amount<=0)return;persist({...data,savings:{...data.savings,contributions:{...data.savings.contributions,[fund.owner]:(data.savings.contributions[fund.owner]??0)+amount}}},`+${amount.toLocaleString("ru-RU")} ₽ в мечту`);setFund({...fund,amount:""});setFundOpen(false);}
  function addComment(e:FormEvent){e.preventDefault();if(!comment.text.trim())return;const entry:Comment={id:Date.now(),author:comment.author,text:comment.text.trim(),date:new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"short"})};persist({...data,comments:[entry,...data.comments]});setComment({...comment,text:""});}
  function addMember(e:FormEvent){e.preventDefault();const name=memberName.trim();if(!name)return;const id=`user-${Date.now()}`;persist({...data,members:[...data.members,{id,name,color:palette[data.members.length%palette.length]}],savings:{...data.savings,contributions:{...data.savings.contributions,[id]:0}}},`${name} присоединяется к маршруту`);setMemberName("");}
  function openCountry(){setDestination(data.destination);setCountryOpen(true);setMenuOpen(false);}
  function saveCountry(e:FormEvent){e.preventDefault();persist({...data,destination},`Новая цель — ${destination.country}`);setCountryOpen(false);}
  function resetDemo(){
    if(!window.confirm("Сбросить задачи, накопления и заметки к исходной версии?"))return;
    window.localStorage.removeItem(STORAGE_KEY);
    setData(seed);
    setTab(sharedOwner);
    setToast("Демо возвращено к исходному состоянию");
    window.setTimeout(()=>setToast(""),2400);
    setMenuOpen(false);
  }
  const member=(id:string)=>data.members.find(m=>m.id===id);

  return <main>
    <header className="topbar">
      <a className="brand" href="#top"><span>✦</span> Together Quest</a>
      <div className="top-stats"><span className="streak">🔥 1 день</span><span className="xp">⚡ {totalPoints} XP</span><span className="save-state">{saving?"Сохраняю…":"Сохранено в браузере ✓"}</span><div className="menu-wrap"><button className="menu-button" aria-label="Открыть меню" onClick={()=>setMenuOpen(!menuOpen)}>☰</button>{menuOpen&&<nav className="menu-pop"><button onClick={()=>{setPeopleOpen(true);setMenuOpen(false)}}>👥 Участники</button><button onClick={openCountry}>🌍 Главная цель</button><button onClick={()=>{setTaskOpen(true);setMenuOpen(false)}}>✨ Новая задача</button><a href="#notes" onClick={()=>setMenuOpen(false)}>💬 Заметки</a><button onClick={resetDemo}>↺ Сбросить демо</button></nav>}</div></div>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow">НАША БОЛЬШАЯ МИССИЯ</p><h1>Из «когда-нибудь» —<br/><em>в {data.destination.country} вместе.</em></h1><p>Один маленький шаг за раз. Без паники, без перегруза — с удовольствием от каждого выполненного дела.</p><span className="demo-badge">Демо-режим · данные остаются только в вашем браузере</span><div className="hero-actions"><a href="#route" className="primary">Продолжить маршрут <span>→</span></a><button className="secondary" onClick={()=>setTaskOpen(true)}>＋ Добавить задачу</button></div></div>
      <button className="mission-card" onClick={openCountry}><div className="flag-orbit">{data.destination.flag}</div><span className="pill">ОБЩИЙ ПРОГРЕСС</span><strong>{percentage}%</strong><div className="progress"><i style={{width:`${percentage}%`}}/></div><p>{doneCount} из {data.tasks.length} шагов выполнено</p><span className="change-hint">Изменить цель →</span></button>
    </section>

    <section className="dashboard">
      <article className="piggy"><div className="card-head"><div><span className="mini-label">КОПИЛКА НА ПЕРЕЕЗД</span><h2>{savingTotal.toLocaleString("ru-RU")} ₽</h2></div><button className="round-button" onClick={()=>setFundOpen(true)}>＋</button></div><div className="saving-bar"><i style={{width:`${savingPercent}%`}}/></div><div className="saving-meta"><span>Цель: {data.savings.goal.toLocaleString("ru-RU")} ₽</span><b>{savingPercent}%</b></div><div className="contributors">{data.members.map(m=><span key={m.id}><i className="avatar" style={{background:m.color}}>{m.name[0]?.toUpperCase()}</i>{m.name}<b>{(data.savings.contributions[m.id]??0).toLocaleString("ru-RU")} ₽</b></span>)}</div></article>
      <article className="next-card"><span className="mini-label">СЛЕДУЮЩАЯ НАГРАДА</span><div className="reward-row"><span className="reward">🎁</span><div><h3>Вечер мечты</h3><p>Откроется на 200 XP</p></div><b>{Math.min(totalPoints,200)}/200</b></div><div className="progress pale"><i style={{width:`${Math.min(100,totalPoints/2)}%`}}/></div></article>
    </section>

    <section className="route-section" id="route">
      <div className="section-title"><div><p className="eyebrow">КАРТА ПУТИ</p><h2>Сегодня достаточно одного шага</h2></div><div className="tabs"><button onClick={()=>setTab(sharedOwner)} className={tab===sharedOwner?"active":""}>Вместе</button>{data.members.map(m=><button key={m.id} onClick={()=>setTab(m.id)} className={tab===m.id?"active":""}>{m.name}</button>)}</div></div>
      <div className="quest-list">{visibleStages.map(stage=>{const allDone=stage.tasks.length>0&&stage.tasks.every(t=>t.done);const locked=stage.id>firstIncompleteStage;const stageDone=stage.tasks.filter(t=>t.done).length;return <article className={`stage ${allDone?"complete":""} ${locked?"locked":""}`} key={stage.id}>
        <div className="stage-node"><span>{allDone?"✓":locked?"🔒":stage.icon}</span><i/></div>
        <div className="stage-content"><div className="stage-head"><div><span className="stage-number">УРОВЕНЬ {stage.id}</span><h3>{stage.title}</h3><p>{stage.id===6?`${data.destination.country} ждёт`:stage.subtitle}</p></div><span className="counter">{stageDone}/{stage.tasks.length}</span></div><div className="tasks">{stage.tasks.length===0&&<p className="empty">Здесь пока нет личных задач.</p>}{stage.tasks.map(task=><button className={`task ${task.done?"done":""}`} key={task.id} onClick={()=>!locked&&toggleTask(task.id)} disabled={locked}><span className="check">{task.done?"✓":""}</span><span className="task-copy"><b>{task.title}</b><small>{task.note}</small></span><span className="owner" style={{background:task.owner===sharedOwner?"#eef6ef":`${member(task.owner)?.color}20`,color:task.owner===sharedOwner?"#43765b":member(task.owner)?.color}}>{task.owner===sharedOwner?"Вместе":member(task.owner)?.name??task.owner}</span><span className="points">+{task.points}</span></button>)}</div></div>
      </article>})}</div>
    </section>

    <section className="notes-section" id="notes"><div className="notes-head"><div><p className="eyebrow">НАША ЛЕНТА</p><h2>Поддержка и заметки</h2></div><span>💬 {data.comments.length}</span></div><form className="comment-form" onSubmit={addComment}><select value={comment.author} onChange={e=>setComment({...comment,author:e.target.value})}>{data.members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select><input value={comment.text} onChange={e=>setComment({...comment,text:e.target.value})} placeholder="Написать поддержку, идею или важную заметку…"/><button>Отправить</button></form><div className="comments">{data.comments.length===0?<div className="no-comments">Здесь появятся ваши заметки. Начните с сообщения друг другу 💛</div>:data.comments.map(item=>{const author=member(item.author);return <article key={item.id}><i className="avatar" style={{background:author?.color}}>{author?.name[0]?.toUpperCase()??"?"}</i><div><b>{author?.name??item.author}</b><span>{item.date}</span><p>{item.text}</p></div></article>})}</div></section>
    <footer><span>{data.members.map(m=>m.name).join(" + ")}</span><p>Большие мечты строятся из маленьких завершённых дел.</p><b>{data.destination.flag} {data.destination.year}</b></footer>

    {taskOpen&&<div className="modal-backdrop" onMouseDown={()=>setTaskOpen(false)}><form className="modal" onSubmit={addTask} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setTaskOpen(false)}>×</button><span className="modal-icon">✨</span><h2>Новый шаг</h2><p>Пусть задача будет маленькой и конкретной.</p><label>Для кого<select value={newTask.owner} onChange={e=>setNewTask({...newTask,owner:e.target.value})}>{data.members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}<option value={sharedOwner}>Вместе</option></select></label><label>Задача<input autoFocus value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})} placeholder="Например: написать в один университет"/></label><label>Подсказка<input value={newTask.note} onChange={e=>setNewTask({...newTask,note:e.target.value})} placeholder="Что именно нужно сделать?"/></label><label>Уровень<select value={newTask.stage} onChange={e=>setNewTask({...newTask,stage:Number(e.target.value)})}>{stages.map(s=><option value={s.id} key={s.id}>{s.id}. {s.title}</option>)}</select></label><button className="modal-submit">Добавить шаг</button></form></div>}
    {fundOpen&&<div className="modal-backdrop" onMouseDown={()=>setFundOpen(false)}><form className="modal fund-modal" onSubmit={addFunds} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setFundOpen(false)}>×</button><span className="modal-icon">🐷</span><h2>Пополнить копилку</h2><p>Любая сумма — ещё один шаг к мечте.</p><label>Кто добавляет<select value={fund.owner} onChange={e=>setFund({...fund,owner:e.target.value})}>{data.members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label>Сумма, ₽<input autoFocus type="number" min="1" value={fund.amount} onChange={e=>setFund({...fund,amount:e.target.value})} placeholder="1000"/></label><button className="modal-submit">Добавить в мечту</button></form></div>}
    {peopleOpen&&<div className="modal-backdrop" onMouseDown={()=>setPeopleOpen(false)}><form className="modal" onSubmit={addMember} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setPeopleOpen(false)}>×</button><span className="modal-icon">👥</span><h2>Участники</h2><p>Добавляйте близких и двигайтесь к цели вместе.</p><div className="member-list">{data.members.map(m=><div key={m.id}><i className="avatar" style={{background:m.color}}>{m.name[0]?.toUpperCase()}</i><b>{m.name}</b><span>{data.tasks.filter(t=>t.owner===m.id&&t.done).reduce((s,t)=>s+t.points,0)} XP</span></div>)}</div><label>Имя нового участника<input autoFocus value={memberName} onChange={e=>setMemberName(e.target.value)} placeholder="Например: Luna" maxLength={24}/></label><button className="modal-submit">Добавить участника</button></form></div>}
    {countryOpen&&<div className="modal-backdrop" onMouseDown={()=>setCountryOpen(false)}><form className="modal" onSubmit={saveCountry} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setCountryOpen(false)}>×</button><span className="modal-icon">{destination.flag}</span><h2>Главная цель</h2><p>Смените страну — задачи и прогресс сохранятся.</p><div className="country-grid">{countries.map(c=><button type="button" key={c.country} className={destination.country===c.country?"selected":""} onClick={()=>setDestination({...destination,...c})}><span>{c.flag}</span>{c.country}</button>)}</div><label>Название цели<input value={destination.country} onChange={e=>setDestination({...destination,country:e.target.value,flag:countries.find(c=>c.country===e.target.value)?.flag??"🌍"})}/></label><label>Год<select value={destination.year} onChange={e=>setDestination({...destination,year:Number(e.target.value)})}>{[2026,2027,2028,2029,2030].map(y=><option key={y}>{y}</option>)}</select></label><button className="modal-submit">Сохранить цель</button></form></div>}
    {toast&&<div className="toast">{toast}</div>}
  </main>;
}
