"use client";

import { useEffect, useMemo, useState } from "react";

type Habit = { id: string; name: string; category: string; icon: string; color: string; days: string[] };

const CATEGORIES = ["Health", "Growth", "Creativity", "Productivity", "Other"];
const CATEGORY_TRANSLATIONS: Record<string, string> = { "Здоровье": "Health", "Развитие": "Growth", "Творчество": "Creativity", "Продуктивность": "Productivity", "Другое": "Other" };
const HABIT_TRANSLATIONS: Record<string, string> = { "Пить воду": "Drink water", "Читать 20 минут": "Read for 20 minutes", "Пробежка": "Go for a run" };
const COLORS = ["#39d353", "#58a6ff", "#bc8cff", "#f2cc60", "#f778ba", "#ff7b72"];
const ICONS = ["💧", "📚", "🏃", "🧘", "🎯", "✍️", "💪", "🌿", "🧠", "🎸", "☀️", "😴"];
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
  const today = startOfDay();
  return seed.map((habit, hi) => ({ ...habit, days: Array.from({ length: 70 }, (_, i) => i).filter(i => ((i * 7 + hi * 3) % (hi + 3)) !== 0 && i < 63).map(i => key(addDays(today, -i))) }));
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
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "Health", icon: "🎯", color: COLORS[0] });
  const today = key(startOfDay());

  useEffect(() => {
    const stored = localStorage.getItem("gitgrow-habits");
    const loaded: Habit[] = stored ? JSON.parse(stored) : makeSeed();
    setHabits(loaded.map(h => ({ ...h, name: HABIT_TRANSLATIONS[h.name] || h.name, category: CATEGORY_TRANSLATIONS[h.category] || h.category }))); setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("gitgrow-habits", JSON.stringify(habits)); }, [habits, ready]);
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setModal(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [modal]);

  const visible = filter === "All habits" ? habits : habits.filter(h => h.category === filter);
  const days = useMemo(() => Array.from({ length: 364 }, (_, i) => addDays(startOfDay(), i - 363)), []);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i - 6)), []);
  const totalDone = habits.reduce((sum, h) => sum + h.days.length, 0);
  const bestStreak = Math.max(0, ...habits.map(h => streak(h.days)));
  const todayDone = habits.filter(h => h.days.includes(today)).length;

  function toggle(id: string, date = today) {
    setHabits(old => old.map(h => h.id === id ? { ...h, days: h.days.includes(date) ? h.days.filter(d => d !== date) : [...h.days, date] } : h));
  }
  function openNew() { setSelected(null); setForm({ name: "", category: "Health", icon: "🎯", color: COLORS[0] }); setModal(true); }
  function openEdit(h: Habit) { setSelected(h.id); setForm({ name: h.name, category: h.category, icon: h.icon, color: h.color }); setModal(true); }
  function save() {
    if (!form.name.trim()) return;
    if (selected) setHabits(old => old.map(h => h.id === selected ? { ...h, ...form, name: form.name.trim() } : h));
    else setHabits(old => [...old, { ...form, name: form.name.trim(), id: crypto.randomUUID(), days: [] }]);
    setModal(false);
  }
  function remove() { if (selected) { setHabits(old => old.filter(h => h.id !== selected)); setModal(false); } }

  if (!ready) return <main className="loading">Loading your progress…</main>;
  return <main>
    <header>
      <div className="brand"><span className="mark">◆</span><span>GitGrow</span></div>
      <button className="newButton" onClick={openNew}><span>＋</span> New habit</button>
    </header>
    <div className="shell">
      <section className="intro">
        <div><p className="eyebrow">YOUR PROGRESS</p><h1>Good evening <span>👋</span></h1><p>Small steps, repeated daily, become meaningful change.</p></div>
        <div className="dateBadge"><b>{new Intl.DateTimeFormat("en", { day: "numeric", month: "long" }).format(new Date())}</b><span>{new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date())}</span></div>
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

      <section className="activityCard">
        <div className="sectionTitle"><div><h2>Activity</h2><p>{totalDone} check-ins in the last year</p></div><div className="legend">Less <i /> <i /><i /><i /><i /> More</div></div>
        <div className="heatWrap"><div className="months"><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div>
          <div className="heatmap">{days.map(d => { const n = habits.filter(h => h.days.includes(key(d))).length; return <span title={`${key(d)}: ${n}`} key={key(d)} data-level={n ? Math.min(4, Math.ceil(n / Math.max(1, habits.length) * 4)) : 0} /> })}</div>
        </div>
      </section>

      <section className="habitsSection"><div className="sectionTitle"><div><h2>My habits</h2><p>Manage what you want to improve</p></div><select value={filter} onChange={e => setFilter(e.target.value)}><option>All habits</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="habitCards">{visible.map(h => <article key={h.id} onClick={() => openEdit(h)}><div className="habitTop"><span style={{ background: h.color + "20" }}>{h.icon}</span><button aria-label="Edit">•••</button></div><h3>{h.name}</h3><p><i style={{ background: h.color }} /> {h.category}</p><div className="habitBottom"><b>🔥 {streak(h.days)} days</b><span>{h.days.length} check-ins</span></div></article>)}<button className="createCard" onClick={openNew}><span>＋</span><b>Create a habit</b><small>Start a new streak today</small></button></div>
      </section>
    </div>
    <footer><div className="brand"><span className="mark">◆</span><span>GitGrow</span></div><p>Grow every day, one commit at a time.</p><span>All data stays on this device</span></footer>

    {modal && <div className="overlay"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="habit-dialog-title">
      <button className="close" aria-label="Close" onClick={() => setModal(false)}>×</button>
      <div className="modalInner">
        <p className="eyebrow">{selected ? "SETTINGS" : "NEW HABIT"}</p>
        <h2 id="habit-dialog-title">{selected ? "Edit habit" : "What will you build?"}</h2>
        <label>Name<input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="For example, read for 20 minutes" onKeyDown={e => e.key === "Enter" && save()} /></label>
        <label>Category<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Icon<div className="iconPicker">{ICONS.map(icon => <button className={form.icon === icon ? "chosen" : ""} onClick={() => setForm({...form, icon})} key={icon}>{icon}</button>)}</div></label>
        <label>Color<div className="colorPicker">{COLORS.map(color => <button aria-label={color} className={form.color === color ? "chosen" : ""} style={{background:color}} onClick={() => setForm({...form,color})} key={color} />)}</div></label>
        <div className="modalActions">{selected && <button className="delete" onClick={remove}>Delete</button>}<button className="cancel" onClick={() => setModal(false)}>Cancel</button><button className="save" onClick={save}>{selected ? "Save" : "Create"}</button></div>
      </div>
    </div></div>}
  </main>;
}
