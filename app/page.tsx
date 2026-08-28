"use client";
/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */

import { useEffect, useMemo, useRef, useState } from "react";
import { PLAYER_ASSET, WORLD_TILES, isNextTile, isTileUnlocked } from "@/lib/world-map";

type Habit = { id: string; name: string; category: string; icon: string; color: string; days: string[] };
type Tab = "today" | "map" | "activity" | "habits" | "profile";
type Profile = { name: string; age: string; weight: string; height: string; goal: string };
type Quest = { id:string; title:string; description:string; zone:string; proof:"photo"|"location"|"either"; kind:"daily"|"landmark"; tile?:number; unlocked?:boolean; status?:string; assignment?:{id:string;status:string;deadlineAt?:string}|null };
type GameData = { user:{displayName:string;email:string;xpBalance:number;lifetimeXp:number;unlockedTiles:number;worldPosition:number;preferences:string[];importCompleted:boolean}; worldPosition:number; currentTile:number; reachableTiles:number[]; profile:Profile; habits:Habit[]; daily:Quest[]; active:Array<{id:string;status:string;deadlineAt?:string;quest:Quest}>; landmarks:Quest[]; proofs:Array<{id:string;kind:string;createdAt:string;questId?:string}> };

const CATEGORIES = ["Health", "Growth", "Creativity", "Productivity", "Other"];
const COLORS = ["#39d353", "#58a6ff", "#bc8cff", "#f2cc60", "#f778ba", "#ff7b72"];
const ICONS = ["💧", "📚", "🏃", "🧘", "🎯", "✍️", "💪", "🌿", "🧠", "🎸", "☀️", "😴"];
const CONSISTENCY_MESSAGES = [
  "1% better every day.",
  "1.01^365 = 37.8 — small gains compound.",
  "Consistency beats intensity.",
  "Small actions, repeated, become remarkable results.",
  "Never miss twice.",
  "Show up today. Momentum follows.",
  "Progress is built one check-in at a time.",
];
const DAY = 86400000;

function key(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function addDays(date: Date, amount: number) { return new Date(date.getTime() + amount * DAY); }
function startOfDay(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

function streak(days: string[]) {
  const set = new Set(days); let count = 0; let date = startOfDay();
  if (!set.has(key(date))) date = addDays(date, -1);
  while (set.has(key(date))) { count++; date = addDays(date, -1); }
  return count;
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All habits");
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [modal, setModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "Health", icon: "🎯", color: COLORS[0] });
  const [profile, setProfile] = useState<Profile>({ name: "", age: "", weight: "", height: "", goal: "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [game, setGame] = useState<GameData | null>(null);
  const [signIn, setSignIn] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [questModal, setQuestModal] = useState<{assignmentId:string;quest:Quest}|null>(null);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [hasLocalImport, setHasLocalImport] = useState(false);
  const [now, setNow] = useState(new Date(0));
  const [consistencyMessage, setConsistencyMessage] = useState(CONSISTENCY_MESSAGES[0]);
  const heatWrapRef = useRef<HTMLDivElement>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const mapBoardRef = useRef<HTMLDivElement>(null);
  const today = key(startOfDay());

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const previousMessage = Number(localStorage.getItem("gitgrow-message-index"));
    const availableMessages = CONSISTENCY_MESSAGES.map((_, index) => index).filter(index => index !== previousMessage);
    const nextMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)] ?? 0;
    setConsistencyMessage(CONSISTENCY_MESSAGES[nextMessage]);
    localStorage.setItem("gitgrow-message-index", String(nextMessage));
    setNow(new Date()); setHasLocalImport(Boolean(localStorage.getItem("gitgrow-habits")||localStorage.getItem("gitgrow-profile"))); loadGame();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    document.body.style.overflow = modal || questModal ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeModal();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [modal, questModal]);
  useEffect(() => {
    if (activeTab !== "activity") return;
    requestAnimationFrame(() => {
      if (heatWrapRef.current) heatWrapRef.current.scrollLeft = heatWrapRef.current.scrollWidth;
      document.querySelectorAll<HTMLElement>(".habitHeatWrap").forEach(element => { element.scrollLeft = element.scrollWidth; });
    });
  }, [activeTab, habits.length]);
  useEffect(() => {
    if (activeTab !== "map" || !game) return;
    setMapMenuOpen(false);
    const centerOnPlayer = () => {
      const viewport = mapViewportRef.current;
      const board = mapBoardRef.current;
      const playerTile = board?.querySelector<HTMLElement>(".worldTile.current");
      if (!viewport || !board || !playerTile) return;
      board.style.transition = "none";
      board.style.transform = `translate(0px, 0px) scale(${mapZoom})`;
      const viewportRect = viewport.getBoundingClientRect();
      const baseRect = board.getBoundingClientRect();
      const tileRect = playerTile.getBoundingClientRect();
      const desiredPan = {
        x: viewportRect.left + viewportRect.width / 2 - (tileRect.left + tileRect.width / 2),
        y: viewportRect.top + viewportRect.height / 2 - (tileRect.top + tileRect.height / 2),
      };
      const clampPan = (value:number, start:number, size:number, viewportStart:number, viewportSize:number) => {
        if (size < viewportSize) return value;
        const minimum = viewportStart + viewportSize - (start + size);
        const maximum = viewportStart - start;
        return Math.min(maximum, Math.max(minimum, value));
      };
      const nextPan = {
        x: clampPan(desiredPan.x, baseRect.left, baseRect.width, viewportRect.left, viewportRect.width),
        y: clampPan(desiredPan.y, baseRect.top, baseRect.height, viewportRect.top, viewportRect.height),
      };
      setMapPan(nextPan);
      board.style.transform = `translate(${nextPan.x}px, ${nextPan.y}px) scale(${mapZoom})`;
      requestAnimationFrame(() => { if (mapBoardRef.current) mapBoardRef.current.style.transition = ""; });
    };
    const frame = requestAnimationFrame(centerOnPlayer);
    window.addEventListener("resize", centerOnPlayer);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", centerOnPlayer); };
  }, [activeTab, game?.currentTile, game?.user.unlockedTiles, mapZoom]);

  const visible = filter === "All habits" ? habits : habits.filter(h => h.category === filter);
  const days = useMemo(() => Array.from({ length: 364 }, (_, i) => addDays(startOfDay(), i - 363)), []);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i - 6)), []);
  const totalDone = habits.reduce((sum, h) => sum + h.days.length, 0);
  const bestStreak = Math.max(0, ...habits.map(h => streak(h.days)));
  const todayDone = habits.filter(h => h.days.includes(today)).length;

  function applyGame(data:GameData){setGame(data);setHabits(data.habits);setProfile(data.profile);setReady(true);setError("");}
  async function loadGame(){try{const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";const response=await fetch(`/api/bootstrap?timezone=${encodeURIComponent(timezone)}`,{cache:"no-store"});const body=await response.json();if(response.status===401){setSignIn(body.signIn);setReady(true);return}if(!response.ok)throw new Error(body.error||"Could not load GitGrow");applyGame(body)}catch(e){setError(e instanceof Error?e.message:"Could not load GitGrow");setReady(true)}}
  async function api(url:string,options:RequestInit={}){setBusy(true);setError("");try{const response=await fetch(url,{...options,headers:options.body instanceof FormData?options.headers:{"content-type":"application/json",...options.headers}});const body=await response.json();if(!response.ok)throw new Error(body.error||"Request failed");applyGame(body);return body}finally{setBusy(false)}}
  async function moveTo(tile:number){if(!game?.reachableTiles.includes(tile))return;try{await api("/api/map/move",{method:"POST",body:JSON.stringify({tile})})}catch(e){setError(e instanceof Error?e.message:"Could not move on the map")}}
  async function toggle(id:string,date=today){try{await api("/api/checkins",{method:"POST",body:JSON.stringify({habitId:id,date})})}catch(e){setError(e instanceof Error?e.message:"Could not save check-in")}}
  function openNew() { setClosing(false); setSelected(null); setForm({ name: "", category: "Health", icon: "🎯", color: COLORS[0] }); setModal(true); }
  function openEdit(h: Habit) { setClosing(false); setSelected(h.id); setForm({ name: h.name, category: h.category, icon: h.icon, color: h.color }); setModal(true); }
  function closeModal() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => { setModal(false); setClosing(false); }, 520);
  }
  async function save() {
    if (!form.name.trim()) return;
    try{await api("/api/habits",{method:selected?"PUT":"POST",body:JSON.stringify({...form,id:selected})});closeModal()}catch(e){setError(e instanceof Error?e.message:"Could not save habit")}
  }
  async function remove(){if(selected)try{await api(`/api/habits?id=${encodeURIComponent(selected)}`,{method:"DELETE"});closeModal()}catch(e){setError(e instanceof Error?e.message:"Could not delete habit")}}
  async function saveProfile(){try{await api("/api/profile/preferences",{method:"PUT",body:JSON.stringify({profile})});setProfileSaved(true);window.setTimeout(()=>setProfileSaved(false),1800)}catch(e){setError(e instanceof Error?e.message:"Could not save profile")}}
  async function savePreferences(preferences:string[]){try{await api("/api/profile/preferences",{method:"PUT",body:JSON.stringify({preferences})})}catch(e){setError(e instanceof Error?e.message:"Could not save preferences")}}
  async function acceptQuest(q:Quest){try{const body=q.kind==="daily"?{assignmentId:q.assignment?.id}:{questId:q.id};const data=await api("/api/quests/daily/accept",{method:"POST",body:JSON.stringify(body)});const active=data.active.find((a:{quest:{id:string}})=>a.quest.id===q.id);if(active)setQuestModal({assignmentId:active.id,quest:q})}catch(e){setError(e instanceof Error?e.message:"Could not accept quest")}}
  async function completeQuest(assignmentId:string,quest:Quest,file?:File){const formData=new FormData();const kind=quest.proof==="either"?(file?"photo":"location"):quest.proof;formData.set("kind",kind);if(kind==="photo"){if(!file){setError("Choose a photo first");return}try{file=await preparePhoto(file)}catch{setError("This photo could not be prepared");return}formData.set("photo",file)}else{try{const pos=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000}));formData.set("latitude",String(pos.coords.latitude));formData.set("longitude",String(pos.coords.longitude));formData.set("accuracy",String(pos.coords.accuracy))}catch{setError("Location permission and accuracy are required");return}}try{await api(`/api/quests/${assignmentId}/complete`,{method:"POST",body:formData});setQuestModal(null)}catch(e){setError(e instanceof Error?e.message:"Could not complete quest")}}
  async function importLocal(){const stored=localStorage.getItem("gitgrow-habits"),storedProfile=localStorage.getItem("gitgrow-profile");try{await api("/api/import",{method:"POST",body:JSON.stringify({habits:stored?JSON.parse(stored):[],profile:storedProfile?JSON.parse(storedProfile):{}})});localStorage.removeItem("gitgrow-habits");localStorage.removeItem("gitgrow-profile")}catch(e){setError(e instanceof Error?e.message:"Could not import local data")}}

  if (!ready) return <main className="loading">Loading your progress…</main>;
  if(signIn)return <main className="authScreen"><div className="brand"><span className="mark">◆</span><span>GitGrow</span></div><div className="authCard"><p className="eyebrow">YOUR ADVENTURE AWAITS</p><h1>Turn consistency into a world.</h1><p>Build habits, earn XP, reveal the map, and take on side quests.</p><a className="save" href={signIn}>Sign in with ChatGPT</a><small>Your progress stays private and syncs across devices.</small></div></main>;
  return <main className={activeTab === "map" ? "mapApp" : ""}>
    <header>
      <div className="brand"><span className="mark">◆</span><span>GitGrow</span></div>
      <button className="newButton" onClick={openNew}><span>＋</span> New habit</button>
    </header>
    <div className="shell">
      {error && <div className="errorBanner" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
      <nav className="tabBar" aria-label="Main sections">
        <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>Today</button>
        <button className={activeTab === "map" ? "active" : ""} onClick={() => setActiveTab("map")}>Map</button>
        <button className={activeTab === "activity" ? "active" : ""} onClick={() => setActiveTab("activity")}>Activity</button>
        <button className={activeTab === "habits" ? "active" : ""} onClick={() => setActiveTab("habits")}>Habits</button>
        <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
      </nav>

      {activeTab === "today" && <>
      <section className="intro">
        <div><p className="eyebrow">YOUR PROGRESS</p><h1>{greetingFor(now)} <span>👋</span></h1><p>{consistencyMessage}</p></div>
        <div className="dateBadge"><b>{new Intl.DateTimeFormat("en", { day: "numeric", month: "long" }).format(now)}</b><span>{new Intl.DateTimeFormat("en", { weekday: "long" }).format(now)}</span></div>
      </section>

      <section className="stats">
        <article><span className="statIcon green">↗</span><div><small>TOTAL CHECK-INS</small><strong>{totalDone}</strong><em>all time</em></div></article>
        <article><span className="statIcon orange">🔥</span><div><small>BEST STREAK</small><strong>{bestStreak} <i>days</i></strong><em>keep it going</em></div></article>
        <article><span className="statIcon blue">✓</span><div><small>TODAY</small><strong>{todayDone}<i>/{habits.length}</i></strong><em>{habits.length === todayDone ? "all done" : "keep going"}</em></div></article>
      </section>

      {game && <section className="xpCard"><div><span>LEVEL PROGRESS</span><strong>{game.user.xpBalance} XP</strong><small>{game.user.unlockedTiles}/36 map tiles revealed</small></div><div className="xpTrack"><i style={{width:`${game.user.lifetimeXp%100}%`}} /></div><b>{100-game.user.lifetimeXp%100} XP to the next tile</b></section>}

      <section className="weekCard">
        <div className="sectionTitle"><div><h2>This week</h2><p>{todayDone === habits.length && habits.length ? "A perfect day — keep it up!" : "Check in and build momentum every day"}</p></div><span className="percent">{habits.length ? Math.round(habits.reduce((s,h) => s + week.filter(d => h.days.includes(key(d))).length, 0)/(habits.length*7)*100) : 0}%</span></div>
        <div className="weekGrid">
          <div className="habitHead">HABIT</div>{week.map(d => <div className="dayHead" key={key(d)}><span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(d).slice(0,2)}</span><b className={key(d) === today ? "activeDay" : ""}>{d.getDate()}</b></div>)}<div />
          {visible.map(h => <div className="weekRow" key={h.id}>
            <button className="habitName" onClick={() => openEdit(h)}><span style={{ background: h.color + "22", color: h.color }}>{h.icon}</span><div><b>{h.name}</b><small>{h.category}</small></div></button>
            {week.map(d => { const done = h.days.includes(key(d)); return <button aria-label={`${h.name}, ${key(d)}`} className={`check ${done ? "done" : ""}`} style={{ "--check-color": h.color } as React.CSSProperties} onClick={() => toggle(h.id, key(d))} key={key(d)} /> })}
            <div className="streak">🔥 <b>{streak(h.days)}</b></div>
          </div>)}
        </div>
        {!visible.length && <div className="empty">Nothing here yet. Create your first habit in a few seconds.</div>}
        <button className="addRow" onClick={openNew}>＋ Add habit</button>
      </section>
      </>}

      {activeTab === "map" && game && <section className="mapSection mapOnly tabPanel">
        <div className="mapHero"><div><p className="eyebrow">THE CONSISTENCY MAP</p><h1>Reveal your world</h1><p>Move through the world one step at a time.</p></div><div className="mapTools"><div className="mapZoomControls" aria-label="Map zoom controls"><button type="button" aria-label="Zoom out" onClick={()=>setMapZoom(zoom=>Math.max(0.8,Number((zoom-0.2).toFixed(1))))}>−</button><button type="button" aria-label="Reset zoom" onClick={()=>setMapZoom(1)}>100%</button><button type="button" aria-label="Zoom in" onClick={()=>setMapZoom(zoom=>Math.min(1.8,Number((zoom+0.2).toFixed(1))))}>+</button></div><button className="mapMenuButton" aria-label="Open map menu" aria-expanded={mapMenuOpen} onClick={()=>setMapMenuOpen(open=>!open)}>•••</button>{mapMenuOpen&&<div className="mapMenu" role="menu"><strong>Map menu</strong><button role="menuitem" onClick={()=>{setMapMenuOpen(false);setActiveTab("today")}}>Today</button><button role="menuitem" onClick={()=>{setMapMenuOpen(false);setActiveTab("activity")}}>Activity</button><button role="menuitem" onClick={()=>{setMapMenuOpen(false);setActiveTab("habits")}}>Habits</button><button role="menuitem" onClick={()=>{setMapMenuOpen(false);setActiveTab("profile")}}>Profile</button><button role="menuitem" onClick={()=>{setMapMenuOpen(false);setMapZoom(1)}}>⌖ Center on me</button><button role="menuitem" onClick={()=>setMapMenuOpen(false)}>Close menu</button></div>}</div></div>
        {!game.user.preferences.length && <div className="onboarding"><h2>Choose your quest directions</h2><p>Select at least one. You can change these later in Profile.</p><div className="preferenceGrid">{["Fitness","Outdoors","Social","Courage","Creativity","Mindfulness"].map(zone=><button key={zone} onClick={()=>savePreferences([zone])}>{zone}</button>)}</div></div>}
        {!game.user.importCompleted && hasLocalImport && <div className="importCard"><div><b>Bring your existing progress</b><p>Import the habits and check-ins stored on this device once.</p></div><button onClick={importLocal}>Import</button></div>}
        <div className="dailyHeader"><div><h2>Today&apos;s side quests</h2><p>Choose one. Complete it for +40 XP or lose 25 XP at midnight.</p></div></div>
        <div className="questCards">{game.daily.map(q=><article className={q.assignment?.status==="active"?"activeQuest":""} key={q.id}><div className="questMeta"><span>{q.zone}</span><i>{q.proof}</i></div><h3>{q.title}</h3><p>{q.description}</p><div className="questReward"><b>+40 XP</b><span>missed −25 XP</span></div>{q.assignment?.status==="active"?<button onClick={()=>setQuestModal({assignmentId:q.assignment!.id,quest:q})}>Submit proof</button>:q.assignment?.status==="completed"?<button disabled>Completed</button>:<button disabled={busy||game.active.some(a=>a.quest?.kind==="daily")} onClick={()=>acceptQuest(q)}>Accept quest</button>}</article>)}</div>
        <div className="mapViewport" ref={mapViewportRef} aria-label="Interactive world map"><div className="worldMapFrame" ref={mapBoardRef} style={{transform:`translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`}}><div className="worldMapArt" aria-hidden="true" /><div className="worldGrid" aria-label="36 tile world map">{Array.from({length:36},(_,tile)=>{const unlocked=isTileUnlocked(tile,game.user.unlockedTiles),next=isNextTile(tile,game.user.unlockedTiles),current=tile===game.currentTile,reachable=game.reachableTiles.includes(tile),landmark=game.landmarks.find(q=>q.tile===tile),worldTile=WORLD_TILES[tile],completed=landmark?.status==="completed",objectIcons:Record<string,string>={palms:"🌴",waterfall:"💧",bridge:"🌉",campfire:"🔥",ruins:"🏛️",hut:"🛖",peak:"⛰️",volcano:"🌋",pines:"🌲",rocks:"🪨",river:"〰️",shell:"🐚"};return <button key={tile} data-tile={tile} aria-label={`${worldTile.label}, ${current?"your current position, ":""}${unlocked?"revealed":"covered by fog"}${landmark?`, landmark quest ${landmark.title}`:""}`} className={`worldTile ${unlocked?"revealed":"fog"} ${next?"next":""} ${current?"current":""} ${reachable?"reachable":""} ${landmark?"landmark":""} ${completed?"completed":""}`} disabled={!unlocked||(!current&&!reachable)} onClick={()=>{if(current&&landmark){if(landmark.status==="active")setQuestModal({assignmentId:game.active.find(a=>a.quest.id===landmark.id)?.id||"",quest:landmark});else if(!completed)acceptQuest(landmark)}else if(reachable)moveTo(tile)}}><span className="tileObject" aria-hidden="true">{unlocked?(landmark?(completed?"✓":"◆"):(worldTile.object?objectIcons[worldTile.object]:"•")):""}</span>{unlocked&&<small>{worldTile.label}</small>}{current&&<img className="mapPlayer" src={PLAYER_ASSET} alt="" aria-hidden="true" />}{current&&<i className="youAreHere">You</i>}</button>})}</div></div></div>
        <div className="zoneLegend">{["Fitness","Outdoors","Social","Courage","Creativity","Mindfulness"].map((z,i)=><span key={z}><i data-zone={i}/>{z}</span>)}</div>
      </section>}

      {activeTab === "activity" && <section className="activityCard tabPanel">
        <div className="sectionTitle"><div><h2>Activity</h2><p>{totalDone} check-ins in the last year</p></div><div className="legend">Less <i /> <i /><i /><i /><i /> More</div></div>
        <div className="heatWrap" ref={heatWrapRef}><div className="months"><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div>
          <div className="heatmap">{days.map(d => { const n = habits.filter(h => h.days.includes(key(d))).length; return <span title={`${key(d)}: ${n}`} key={key(d)} data-level={n ? Math.min(4, Math.ceil(n / Math.max(1, habits.length) * 4)) : 0} /> })}</div>
        </div>
        <div className="habitActivityHeader"><h2>By habit</h2><p>Consistency for each habit over the last year</p></div>
        <div className="habitActivityList">{habits.map(h => <article className="habitActivity" key={h.id}>
          <div className="habitActivityTitle"><span style={{ background: h.color + "20" }}>{h.icon}</span><div><b>{h.name}</b><small>{h.days.length} check-ins · {streak(h.days)} day streak</small></div></div>
          <div className="habitHeatWrap"><div className="habitHeatmap">{days.map(d => <span title={`${key(d)}: ${h.days.includes(key(d)) ? "done" : "not done"}`} key={key(d)} style={h.days.includes(key(d)) ? { background: h.color } : undefined} />)}</div></div>
        </article>)}</div>
      </section>}

      {activeTab === "habits" && <section className="habitsSection tabPanel"><div className="sectionTitle"><div><h2>My habits</h2><p>Manage what you want to improve</p></div><select value={filter} onChange={e => setFilter(e.target.value)}><option>All habits</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="habitCards">{visible.map(h => <article key={h.id} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openEdit(h)}} onClick={() => openEdit(h)}><div className="habitTop"><span style={{ background: h.color + "20" }}>{h.icon}</span><button aria-label="Edit">•••</button></div><h3>{h.name}</h3><p><i style={{ background: h.color }} /> {h.category}</p><div className="habitBottom"><b>🔥 {streak(h.days)} days</b><span>{h.days.length} check-ins</span></div></article>)}<button className="createCard" onClick={openNew}><span>＋</span><b>Create a habit</b><small>Start a new streak today</small></button></div>
      </section>}

      {activeTab === "profile" && <section className="profileSection tabPanel">
        <div className="profileHero"><div className="avatar">{profile.name.trim() ? profile.name.trim()[0].toUpperCase() : "G"}</div><div><p className="eyebrow">YOUR PROFILE</p><h1>{profile.name || "Your details"}</h1><p>Keep your personal baseline in one place.</p></div></div>
        <div className="profileGrid">
          <label className="wide">Name<input value={profile.name} onChange={e => setProfile({...profile, name:e.target.value})} placeholder="Your name" /></label>
          <label>Age<input type="number" inputMode="numeric" value={profile.age} onChange={e => setProfile({...profile, age:e.target.value})} placeholder="Years" /></label>
          <label>Weight<input type="number" inputMode="decimal" value={profile.weight} onChange={e => setProfile({...profile, weight:e.target.value})} placeholder="kg" /></label>
          <label>Height<input type="number" inputMode="numeric" value={profile.height} onChange={e => setProfile({...profile, height:e.target.value})} placeholder="cm" /></label>
          <label className="wide">Main goal<input value={profile.goal} onChange={e => setProfile({...profile, goal:e.target.value})} placeholder="What are you working toward?" /></label>
        </div>
        {game && <div className="questPreferences"><h2>Quest directions</h2><p>Daily quests are selected from these areas.</p><div className="preferenceGrid">{["Fitness","Outdoors","Social","Courage","Creativity","Mindfulness"].map(zone=>{const active=game.user.preferences.includes(zone);return <button className={active?"selected":""} key={zone} onClick={()=>savePreferences(active?game.user.preferences.filter(z=>z!==zone):[...game.user.preferences,zone])}>{zone}</button>})}</div></div>}
        <div className="profileActions"><span className={profileSaved ? "visible" : ""}>Saved to your account</span><button className="save" onClick={saveProfile}>Save profile</button></div>
        {game && <div className="proofJournal"><div><h2>Proof journal</h2><p>Private evidence stays until you delete it.</p></div>{!game.proofs.length?<div className="empty">No quest proofs yet.</div>:game.proofs.map(p=><article key={p.id}><span>{p.kind==="photo"?"▣":"⌖"}</span><div><b>{p.kind==="photo"?"Photo proof":"Location proof"}</b><small>{new Date(p.createdAt).toLocaleDateString()}</small></div>{p.kind==="photo"&&<a href={`/api/proofs/${p.id}`} target="_blank" rel="noreferrer">View</a>}<button onClick={async()=>{await fetch(`/api/proofs/${p.id}`,{method:"DELETE"});loadGame()}}>Delete</button></article>)}</div>}
      </section>}
    </div>
    <footer><div className="brand"><span className="mark">◆</span><span>GitGrow</span></div><p>Grow every day, one commit at a time.</p><span>{game?.user.email} · <a href="/signout-with-chatgpt?return_to=/">Sign out</a></span></footer>

    {modal && <div className={`overlay ${closing ? "closing" : ""}`}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="habit-dialog-title">
      <button className="close" aria-label="Close" onClick={closeModal}>×</button>
      <div className="modalInner">
        <p className="eyebrow">{selected ? "SETTINGS" : "NEW HABIT"}</p>
        <h2 id="habit-dialog-title">{selected ? "Edit habit" : "What will you build?"}</h2>
        <label>Name<input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="For example, read for 20 minutes" onKeyDown={e => e.key === "Enter" && save()} /></label>
        <label>Category<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Icon<div className="iconPicker">{ICONS.map(icon => <button className={form.icon === icon ? "chosen" : ""} onClick={() => setForm({...form, icon})} key={icon}>{icon}</button>)}</div></label>
        <label>Color<div className="colorPicker">{COLORS.map(color => <button aria-label={color} className={form.color === color ? "chosen" : ""} style={{background:color}} onClick={() => setForm({...form,color})} key={color} />)}</div></label>
        <div className="modalActions">{selected && <button className="delete" onClick={remove}>Delete</button>}<button className="cancel" onClick={closeModal}>Cancel</button><button className="save" onClick={save}>{selected ? "Save" : "Create"}</button></div>
      </div>
    </div></div>}
    {questModal && <ProofDialog quest={questModal.quest} busy={busy} onClose={()=>setQuestModal(null)} onSubmit={(file)=>completeQuest(questModal.assignmentId,questModal.quest,file)} />}
  </main>;
}

async function preparePhoto(file:File){const bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d")!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("encode")),"image/webp",.86));return new File([blob],"quest-proof.webp",{type:"image/webp"})}

function ProofDialog({quest,busy,onClose,onSubmit}:{quest:Quest;busy:boolean;onClose:()=>void;onSubmit:(file?:File)=>void}){
 const [file,setFile]=useState<File>(); const needsPhoto=quest.proof==="photo"||(quest.proof==="either"&&Boolean(file));
 return <div className="overlay"><div className="modal proofModal" role="dialog" aria-modal="true"><button className="close" onClick={onClose}>×</button><div className="modalInner"><p className="eyebrow">QUEST PROOF · {quest.zone}</p><h2>{quest.title}</h2><p className="proofCopy">{quest.description}</p><div className="proofNotice"><b>{quest.proof==="location"?"Location required":quest.proof==="photo"?"Photo required":"Photo or location"}</b><span>{quest.proof==="location"?"Accuracy must be within 100 m and the place must be new.":"Use a private JPEG, PNG, or WebP image up to 8 MB."}</span></div>{quest.proof!=="location"&&<label>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0])}/></label>}<div className="modalActions"><button className="cancel" onClick={onClose}>Not now</button><button className="save" disabled={busy||(needsPhoto&&!file)} onClick={()=>onSubmit(file)}>{busy?"Checking…":quest.proof==="location"?"Use my location":"Complete quest"}</button></div></div></div></div>;
}
