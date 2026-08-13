"use client";

import { useEffect, useMemo, useState } from "react";

type Habit = { id: string; name: string; category: string; icon: string; color: string; days: string[] };

const CATEGORIES = ["Здоровье", "Развитие", "Творчество", "Продуктивность", "Другое"];
const COLORS = ["#39d353", "#58a6ff", "#bc8cff", "#f2cc60", "#f778ba", "#ff7b72"];
const ICONS = ["💧", "📚", "🏃", "🧘", "🎯", "✍️", "💪", "🌿", "🧠", "🎸", "☀️", "😴"];
const DAY = 86400000;

function key(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, amount: number) { return new Date(date.getTime() + amount * DAY); }
function startOfDay(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

const seed: Habit[] = [
  { id: "water", name: "Пить воду", category: "Здоровье", icon: "💧", color: "#58a6ff", days: [] },
  { id: "read", name: "Читать 20 минут", category: "Развитие", icon: "📚", color: "#bc8cff", days: [] },
  { id: "run", name: "Пробежка", category: "Здоровье", icon: "🏃", color: "#39d353", days: [] },
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
  const [filter, setFilter] = useState("Все привычки");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "Здоровье", icon: "🎯", color: COLORS[0] });
  const today = key(startOfDay());

  useEffect(() => {
    const stored = localStorage.getItem("gitgrow-habits");
    setHabits(stored ? JSON.parse(stored) : makeSeed()); setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("gitgrow-habits", JSON.stringify(habits)); }, [habits, ready]);

  const visible = filter === "Все привычки" ? habits : habits.filter(h => h.category === filter);
  const days = useMemo(() => Array.from({ length: 364 }, (_, i) => addDays(startOfDay(), i - 363)), []);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i - 6)), []);
  const totalDone = habits.reduce((sum, h) => sum + h.days.length, 0);
  const bestStreak = Math.max(0, ...habits.map(h => streak(h.days)));
  const todayDone = habits.filter(h => h.days.includes(today)).length;

  function toggle(id: string, date = today) {
    setHabits(old => old.map(h => h.id === id ? { ...h, days: h.days.includes(date) ? h.days.filter(d => d !== date) : [...h.days, date] } : h));
  }
  function openNew() { setSelected(null); setForm({ name: "", category: "Здоровье", icon: "🎯", color: COLORS[0] }); setModal(true); }
  function openEdit(h: Habit) { setSelected(h.id); setForm({ name: h.name, category: h.category, icon: h.icon, color: h.color }); setModal(true); }
  function save() {
    if (!form.name.trim()) return;
    if (selected) setHabits(old => old.map(h => h.id === selected ? { ...h, ...form, name: form.name.trim() } : h));
    else setHabits(old => [...old, { ...form, name: form.name.trim(), id: crypto.randomUUID(), days: [] }]);
    setModal(false);
  }
  function remove() { if (selected) { setHabits(old => old.filter(h => h.id !== selected)); setModal(false); } }

  if (!ready) return <main className="loading">Загружаем прогресс…</main>;
  return <main>
    <header>
      <div className="brand"><span className="mark">◆</span><span>GitGrow</span></div>
      <button className="newButton" onClick={openNew}><span>＋</span> Новая привычка</button>
    </header>
    <div className="shell">
      <section className="intro">
        <div><p className="eyebrow">ТВОЙ ПРОГРЕСС</p><h1>Добрый вечер <span>👋</span></h1><p>Маленькие шаги каждый день превращаются в большие перемены.</p></div>
        <div className="dateBadge"><b>{new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(new Date())}</b><span>{new Intl.DateTimeFormat("ru", { weekday: "long" }).format(new Date())}</span></div>
      </section>

      <section className="stats">
        <article><span className="statIcon green">↗</span><div><small>ВСЕГО ОТМЕТОК</small><strong>{totalDone}</strong><em>за всё время</em></div></article>
        <article><span className="statIcon orange">🔥</span><div><small>ЛУЧШИЙ СТРИК</small><strong>{bestStreak} <i>дн.</i></strong><em>продолжай в том же духе</em></div></article>
        <article><span className="statIcon blue">✓</span><div><small>СЕГОДНЯ</small><strong>{todayDone}<i>/{habits.length}</i></strong><em>{habits.length === todayDone ? "всё выполнено!" : "ещё немного"}</em></div></article>
      </section>

      <section className="weekCard">
        <div className="sectionTitle"><div><h2>Эта неделя</h2><p>{todayDone === habits.length && habits.length ? "Идеальный день — так держать!" : "Отмечай выполненное и расти каждый день"}</p></div><span className="percent">{habits.length ? Math.round(habits.reduce((s,h) => s + week.filter(d => h.days.includes(key(d))).length, 0)/(habits.length*7)*100) : 0}%</span></div>
        <div className="weekGrid">
          <div className="habitHead">ПРИВЫЧКА</div>{week.map(d => <div className="dayHead" key={key(d)}><span>{new Intl.DateTimeFormat("ru", { weekday: "short" }).format(d).slice(0,2)}</span><b className={key(d) === today ? "activeDay" : ""}>{d.getDate()}</b></div>)}<div />
          {visible.map(h => <div className="weekRow" key={h.id}>
            <button className="habitName" onClick={() => openEdit(h)}><span style={{ background: h.color + "22", color: h.color }}>{h.icon}</span><div><b>{h.name}</b><small>{h.category}</small></div></button>
            {week.map(d => { const done = h.days.includes(key(d)); return <button aria-label={`${h.name}, ${key(d)}`} className={`check ${done ? "done" : ""}`} style={done ? { background: h.color, borderColor: h.color } : {}} onClick={() => toggle(h.id, key(d))} key={key(d)}>{done && "✓"}</button> })}
            <div className="streak">🔥 <b>{streak(h.days)}</b></div>
          </div>)}
        </div>
        {!visible.length && <div className="empty">Здесь пока пусто. Создай первую привычку — это займёт пару секунд.</div>}
        <button className="addRow" onClick={openNew}>＋ Добавить привычку</button>
      </section>

      <section className="activityCard">
        <div className="sectionTitle"><div><h2>Активность</h2><p>{totalDone} выполнений за последний год</p></div><div className="legend">Меньше <i /> <i /><i /><i /><i /> Больше</div></div>
        <div className="heatWrap"><div className="months"><span>Сен</span><span>Окт</span><span>Ноя</span><span>Дек</span><span>Янв</span><span>Фев</span><span>Мар</span><span>Апр</span><span>Май</span><span>Июн</span><span>Июл</span><span>Авг</span></div>
          <div className="heatmap">{days.map(d => { const n = habits.filter(h => h.days.includes(key(d))).length; return <span title={`${key(d)}: ${n}`} key={key(d)} data-level={n ? Math.min(4, Math.ceil(n / Math.max(1, habits.length) * 4)) : 0} /> })}</div>
        </div>
      </section>

      <section className="habitsSection"><div className="sectionTitle"><div><h2>Мои привычки</h2><p>Управляй тем, что хочешь улучшить</p></div><select value={filter} onChange={e => setFilter(e.target.value)}><option>Все привычки</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="habitCards">{visible.map(h => <article key={h.id} onClick={() => openEdit(h)}><div className="habitTop"><span style={{ background: h.color + "20" }}>{h.icon}</span><button aria-label="Редактировать">•••</button></div><h3>{h.name}</h3><p><i style={{ background: h.color }} /> {h.category}</p><div className="habitBottom"><b>🔥 {streak(h.days)} дней</b><span>{h.days.length} отметок</span></div></article>)}<button className="createCard" onClick={openNew}><span>＋</span><b>Создать привычку</b><small>Начни новый стрик сегодня</small></button></div>
      </section>
    </div>
    <footer><div className="brand"><span className="mark">◆</span><span>GitGrow</span></div><p>Расти каждый день, по одному коммиту за раз.</p><span>Все данные хранятся на этом устройстве</span></footer>

    {modal && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setModal(false)}><div className="modal" role="dialog" aria-modal="true"><button className="close" onClick={() => setModal(false)}>×</button><p className="eyebrow">{selected ? "НАСТРОЙКИ" : "НОВАЯ ПРИВЫЧКА"}</p><h2>{selected ? "Редактировать привычку" : "Что будем развивать?"}</h2><label>Название<input autoFocus value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Например, читать 20 минут" onKeyDown={e => e.key === "Enter" && save()} /></label><label>Категория<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label><label>Иконка<div className="iconPicker">{ICONS.map(icon => <button className={form.icon === icon ? "chosen" : ""} onClick={() => setForm({...form, icon})} key={icon}>{icon}</button>)}</div></label><label>Цвет<div className="colorPicker">{COLORS.map(color => <button aria-label={color} className={form.color === color ? "chosen" : ""} style={{background:color}} onClick={() => setForm({...form,color})} key={color} />)}</div></label><div className="modalActions">{selected && <button className="delete" onClick={remove}>Удалить</button>}<button className="cancel" onClick={() => setModal(false)}>Отмена</button><button className="save" onClick={save}>{selected ? "Сохранить" : "Создать"}</button></div></div></div>}
  </main>;
}
