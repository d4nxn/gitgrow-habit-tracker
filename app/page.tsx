"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Habit = { id: string; name: string; category: string; icon: string; color: string; days: string[] };
type Tab = "today" | "activity" | "habits" | "profile";
type Profile = { name: string; age: string; weight: string; height: string; goal: string };

const CATEGORIES = ["Health", "Growth", "Creativity", "Productivity", "Other"];
const CATEGORY_TRANSLATIONS: Record<string, string> = { "Здоровье": "Health", "Развитие": "Growth", "Творчество": "Creativity", "Продуктивность": "Productivity", "Другое": "Other" };
const HABIT_TRANSLATIONS: Record<string, string> = { "Пить воду": "Drink water", "Читать 20 минут": "Read for 20 minutes", "Пробежка": "Go for a run" };
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

function key(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, amount: number) { return new Date(date.getTime() + amount * DAY); }
function startOfDay(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

const seed: Habit[] = [
  { id: "water", name: "Drink water", category: "Health", icon: "💧", color: "#58a6ff", days: [] },
  { id: "read", name: "Read for 20 minutes", category: "Growth", icon: "📚", color: "#bc8cff", days: [] },
  { id: "run", name: "Go for a run", category: "Health", icon: "🏃", color: "#39d353", days: [] },
];

function makeSeed() {
  return seed.map(habit => ({ ...habit, days: [] }));
}

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
  const [now, setNow] = useState(new Date(0));
  const [consistencyMessage, setConsistencyMessage] = useState(CONSISTENCY_MESSAGES[0]);
  const heatWrapRef = useRef<HTMLDivElement>(null);
  const today = key(startOfDay());

  useEffect(() => {
    const stored = localStorage.getItem("gitgrow-habits");
    const loaded: Habit[] = stored ? JSON.parse(stored) : makeSeed();
    const storedProfile = localStorage.getItem("gitgrow-profile");
    if (storedProfile) setProfile(JSON.parse(storedProfile));
    const shouldResetCheckIns = localStorage.getItem("gitgrow-checkins-reset-v1") !== "done";
    setHabits(loaded.map(h => ({
      ...h,
      name: HABIT_TRANSLATIONS[h.name] || h.name,
      category: CATEGORY_TRANSLATIONS[h.category] || h.category,
      days: shouldResetCheckIns ? [] : h.days,
    })));
    if (shouldResetCheckIns) localStorage.setItem("gitgrow-checkins-reset-v1", "done");

    const previousMessage = Number(localStorage.getItem("gitgrow-message-index"));
    const availableMessages = CONSISTENCY_MESSAGES.map((_, index) => index).filter(index => index !== previousMessage);
    const nextMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)] ?? 0;
    setConsistencyMessage(CONSISTENCY_MESSAGES[nextMessage]);
    localStorage.setItem("gitgrow-message-index", String(nextMessage));
    setNow(new Date());
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("gitgrow-habits", JSON.stringify(habits)); }, [habits, ready]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeModal();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [modal]);
  useEffect(() => {
    if (activeTab !== "activity") return;
    requestAnimationFrame(() => {
      if (heatWrapRef.current) heatWrapRef.current.scrollLeft = heatWrapRef.current.scrollWidth;
      document.querySelectorAll<HTMLElement>(".habitHeatWrap").forEach(element => { element.scrollLeft = element.scrollWidth; });
    });
  }, [activeTab, habits.length]);

  const visible = filter === "All habits" ? habits : habits.filter(h => h.category === filter);
  const days = useMemo(() => Array.from({ length: 364 }, (_, i) => addDays(startOfDay(), i - 363)), []);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i - 6)), []);
  const totalDone = habits.reduce((sum, h) => sum + h.days.length, 0);
  const bestStreak = Math.max(0, ...habits.map(h => streak(h.days)));
  const todayDone = habits.filter(h => h.days.includes(today)).length;

  function toggle(id: string, date = today) {
    setHabits(old => old.map(h => h.id === id ? { ...h, days: h.days.includes(date) ? h.days.filter(d => d !== date) : [...h.days, date] } : h));
  }
  function openNew() { setClosing(false); setSelected(null); setForm({ name: "", category: "Health", icon: "🎯", color: COLORS[0] }); setModal(true); }
  function openEdit(h: Habit) { setClosing(false); setSelected(h.id); setForm({ name: h.name, category: h.category, icon: h.icon, color: h.color }); setModal(true); }
  function closeModal() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => { setModal(false); setClosing(false); }, 520);
  }
  function save() {
    if (!form.name.trim()) return;
    if (selected) setHabits(old => old.map(h => h.id === selected ? { ...h, ...form, name: form.name.trim() } : h));
    else setHabits(old => [...old, { ...form, name: form.name.trim(), id: crypto.randomUUID(), days: [] }]);
    closeModal();
  }
  function remove() { if (selected) { setHabits(old => old.filter(h => h.id !== selected)); closeModal(); } }
  function saveProfile() {
    localStorage.setItem("gitgrow-profile", JSON.stringify(profile));
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 1800);
  }

  if (!ready) return <main className="loading">Loading your progress…</main>;
  return <main>
    <header>
      <div className="brand"><span className="mark">◆</span><span>GitGrow</span></div>
      <button className="newButton" onClick={openNew}><span>＋</span> New habit</button>
    </header>
    <div className="shell">
      <nav className="tabBar" aria-label="Main sections">
        <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>Today</button>
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
        <div className="habitCards">{visible.map(h => <article key={h.id} onClick={() => openEdit(h)}><div className="habitTop"><span style={{ background: h.color + "20" }}>{h.icon}</span><button aria-label="Edit">•••</button></div><h3>{h.name}</h3><p><i style={{ background: h.color }} /> {h.category}</p><div className="habitBottom"><b>🔥 {streak(h.days)} days</b><span>{h.days.length} check-ins</span></div></article>)}<button className="createCard" onClick={openNew}><span>＋</span><b>Create a habit</b><small>Start a new streak today</small></button></div>
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
        <div className="profileActions"><span className={profileSaved ? "visible" : ""}>Saved on this device</span><button className="save" onClick={saveProfile}>Save profile</button></div>
      </section>}
    </div>
    <footer><div className="brand"><span className="mark">◆</span><span>GitGrow</span></div><p>Grow every day, one commit at a time.</p><span>All data stays on this device</span></footer>

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
  </main>;
}
