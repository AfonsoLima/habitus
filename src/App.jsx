import { useState, useEffect, useCallback, useMemo } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://gabwxecjrrxssjbrmiwh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYnd4ZWNqcnJ4c3NqYnJtaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjYwMzcsImV4cCI6MjA4OTc0MjAzN30.rV492tHGS3rDlnqFtidmU3vrWTKuLmOPWkbSerxWnlo";
const SB = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
async function sbGet(t) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, { headers: SB }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function sbUpsert(t, rows) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: "POST", headers: { ...SB, "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) }); if (!r.ok) throw new Error(await r.text()); }
async function sbDelete(t, id) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "DELETE", headers: SB }); if (!r.ok) throw new Error(await r.text()); }
const habitToDb = h => ({ id: h.id, name: h.name, emoji: h.emoji, category: h.category, color: h.color, goal_type: h.goalType, goal_value: h.goalValue, goal_unit: h.goalUnit, frequency: h.frequency, created_at: h.createdAt, is_active: h.isActive });
const habitFromDb = h => ({ id: h.id, name: h.name, emoji: h.emoji, category: h.category, color: h.color, goalType: h.goal_type, goalValue: Number(h.goal_value), goalUnit: h.goal_unit, frequency: h.frequency, createdAt: h.created_at, isActive: h.is_active === true || h.is_active === 'true' || h.is_active === 1 });
const entryToDb = e => ({ id: e.id, habit_id: e.habitId, date: e.date, value: e.value, completed: e.completed });
const entryFromDb = e => ({ id: e.id, habitId: e.habit_id, date: e.date, value: Number(e.value), completed: e.completed });

// ─── UTILS ────────────────────────────────────────────────────────────────────
const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const brasiliaDateStr = d => d.toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 10);
const todayStr = () => brasiliaDateStr(new Date());
const dateStr = d => brasiliaDateStr(d);
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const startOfWeek = d => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; };
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CATEGORIES = ["Espiritual", "Intelectual", "Físico", "Profissional", "Saúde", "Relacional"];
const CAT_COLORS = {
  Espiritual: "oklch(0.74 0.14 290)", Intelectual: "oklch(0.78 0.12 160)",
  "Físico": "oklch(0.78 0.13 45)", Profissional: "oklch(0.78 0.12 240)",
  "Saúde": "oklch(0.72 0.15 20)", Relacional: "oklch(0.80 0.11 80)"
};

function calcStreak(habitId, entries, habits) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return { current: 0, best: 0 };
  const done = new Set(entries.filter(e => e.habitId === habitId && e.completed).map(e => e.date));
  let current = 0, best = 0, count = 0;
  for (let i = 0; i <= 365; i++) {
    const d = dateStr(addDays(new Date(), -i)), dow = addDays(new Date(), -i).getDay();
    if (!habit.frequency[dow]) continue;
    if (done.has(d)) { count++; if (i <= 1) current = count; }
    else { if (i === 0) current = 0; best = Math.max(best, count); count = 0; }
  }
  return { current, best: Math.max(best, count, current) };
}

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#0B0B0E", text: "rgba(255,255,255,0.96)", textSec: "rgba(235,235,245,0.62)",
  textTer: "rgba(235,235,245,0.38)", textQuat: "rgba(235,235,245,0.20)",
  glass1: "rgba(255,255,255,0.045)", glass2: "rgba(255,255,255,0.075)",
  stroke: "rgba(255,255,255,0.09)", innerHi: "rgba(255,255,255,0.22)",
  accent: "oklch(0.78 0.12 160)", accentSoft: "oklch(0.78 0.12 160 / 0.18)",
  gold: "oklch(0.82 0.11 75)", danger: "oklch(0.72 0.16 25)",
};
const glassStyle = { background: "rgba(28,30,32,0.92)", border: "none", outline: "none", borderRadius: 22, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", transform: "translateZ(0)" };
const glass2Style = { ...glassStyle, background: "rgba(36,38,42,0.95)" };

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = ({ d, s = 20, sw = 1.6 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const icPlus = (s = 18) => <Ic s={s} d="M12 5v14M5 12h14" />;
const icCal = (s = 20) => <Ic s={s} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />;
const icLeaf = (s = 20) => <Ic s={s} d="M6 20S4 12 12 4c8 0 8 8 8 8-4 0-8 2-10 5M6 20c1-3 4-5 6-5" />;
const icChart = (s = 20) => <Ic s={s} d="M3 3v18h18M7 16l4-4 4 4 4-8" />;
const icChevL = (s = 18) => <Ic s={s} d="M15 18l-6-6 6-6" />;
const icChevR = (s = 18) => <Ic s={s} d="M9 18l6-6-6-6" />;
const icFlame = (s = 14) => <Ic s={s} sw={1.8} d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072 2.143-.224 4.054 2 6 .5.5 1 1.5 1 2.5a2.5 2.5 0 01-5 0c0-1.5 1.5-2.5 2.5-3.5" />;
const icEdit = (s = 15) => <Ic s={s} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const icTrash = (s = 15) => <Ic s={s} d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />;
const icPause = (s = 14) => <Ic s={s} d="M6 4h4v16H6zM14 4h4v16h-4" />;
const icPlay = (s = 14) => <Ic s={s} d="M5 3l14 9-14 9V3z" />;

const HABIT_ICONS = {
  prayer: "M8 3.5C8 3.5 8 10 12 10S16 3.5 16 3.5M12 10v11M6 21h12",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 22h16v-5H6.5M4 19.5V5a2 2 0 012-2h12v11H6.5",
  run: "M13 4a1 1 0 100-2 1 1 0 000 2zM7 20l4-8 3 3 2-4M6 12l4-4 4 2 4-5",
  cross: "M12 2v20M2 12h20",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  meditate: "M12 3a2 2 0 100 4 2 2 0 000-4zM5 13h14M7 17c0 2 2 4 5 4s5-2 5-4",
  leaf: "M6 20S4 12 12 4c8 0 8 8 8 8-4 0-8 2-10 5M6 20c1-3 4-5 6-5",
  water: "M12 2.69l5.66 5.66a8 8 0 11-11.31 0z",
  sleep: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  brain: "M9 3a5 5 0 00-5 5c0 1.5.6 2.8 1.6 3.8A5 5 0 009 21h6a5 5 0 004.4-7.2A5 5 0 0015 3H9z",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  music: "M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  pen: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  target: "M22 12h-4M6 12H2M12 6V2M12 22v-4M18 12a6 6 0 11-12 0 6 6 0 0112 0zm-4 0a2 2 0 11-4 0 2 2 0 014 0z",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  muscle: "M14.5 12.5c1.5-1.5 2.5-4 1-6.5-1-1.5-3-2-4.5-1.5M9.5 11.5c-1.5 1.5-2.5 4-1 6.5 1 1.5 3 2 4.5 1.5M9.5 11.5l4.5 1M10.5 4.5l3 1M8 20l2-2M16 4l-2 2",
  hands: "M9 5v6M7 5v4M5 6v3M11 5v6M13 5v6M15 5v4M17 6v3M5 9c0 4 3 7 7 8 4-1 7-4 7-8",
  stop: "M12 2a10 10 0 100 20A10 10 0 0012 2zM8 8h8v8H8z",
};
const ICON_NAMES = Object.keys(HABIT_ICONS);

function HabitIcon({ name = "leaf", size = 22, color = T.accent, sw = 1.6 }) {
  // Support legacy emoji strings stored in DB
  if (name && !HABIT_ICONS[name]) {
    return <span style={{ fontSize: size * 0.85, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{name}</span>;
  }
  const d = HABIT_ICONS[name] || HABIT_ICONS.leaf;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Glass({ children, style = {}, strong = false, onClick }) {
  return <div style={{ ...(strong ? glass2Style : glassStyle), ...style }} onClick={onClick}>{children}</div>;
}

function Ring({ value = 0, size = 110, stroke = 9, color = T.accent, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.2,0.9,0.2,1)", filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function MiniRing({ value = 0, size = 48, stroke = 2.5, color = T.accent }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (Math.min(value, 100) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", inset: -2 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.2,0.9,0.2,1)" }} />
    </svg>
  );
}

function CheckButton({ completed, partial, color, onClick, size = 44 }) {
  const bg = completed
    ? `linear-gradient(180deg, ${color}, ${color}cc)`
    : partial ? `${color}38` : "rgba(255,255,255,0.06)";
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 14, border: "none",
      background: bg, cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
      boxShadow: completed ? `inset 0 1px 0 rgba(255,255,255,0.35), 0 0 18px ${color}88` : "inset 0 1px 0 rgba(255,255,255,0.18)",
      color: completed ? "#0E1410" : T.textSec, fontSize: 20, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.25s cubic-bezier(0.2,0.9,0.2,1)",
    }}>
      {completed ? "✓" : partial ? "~" : ""}
    </button>
  );
}

function TabBar({ tab, setTab }) {
  return (
    <div style={{ ...glass2Style, borderRadius: 26, padding: "6px 8px", display: "flex" }}>
      {[{ id: "today", label: "Hoje", icon: icCal }, { id: "habits", label: "Hábitos", icon: icLeaf }, { id: "reports", label: "Relatórios", icon: icChart }].map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: "9px 4px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
          background: tab === t.id ? "linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06))" : "transparent",
          boxShadow: tab === t.id ? "inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
          color: tab === t.id ? T.text : T.textSec,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          transition: "all 0.2s cubic-bezier(0.2,0.9,0.2,1)",
        }}>
          {t.icon(20)}
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",

    }}>
      <div style={{
        ...glass2Style, borderRadius: "28px 28px 0 0", padding: "20px 20px 40px",
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        animation: "slideUp 0.3s cubic-bezier(0.2,0.9,0.2,1)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)", margin: "0 auto 20px" }} />
        {children}
      </div>
    </div>
  );
}

// ─── HABIT FORM ───────────────────────────────────────────────────────────────
function HabitForm({ habit, onSave, onCancel }) {
  const [form, setForm] = useState(habit || {
    name: "", emoji: "leaf", category: "Espiritual", color: CAT_COLORS["Espiritual"],
    goalType: "time", goalValue: 30, goalUnit: "min",
    frequency: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }, isActive: true
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDay = d => setForm(f => ({ ...f, frequency: { ...f.frequency, [d]: !f.frequency[d] } }));
  useEffect(() => { if (!habit) set("color", CAT_COLORS[form.category] || T.accent); }, [form.category]);

  const lbl = { fontSize: 10, fontWeight: 700, color: T.textTer, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 };
  const inp = { width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.08)", fontSize: 14, color: T.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 500, letterSpacing: "-0.03em", color: T.text, margin: 0 }}>
          {habit ? "Editar hábito" : "Novo hábito"}
        </h2>
        <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: "6px 12px", color: T.textSec, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Fechar</button>
      </div>

      <Glass style={{ padding: 12, marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: `radial-gradient(100% 100% at 30% 30%, ${form.color}44, rgba(255,255,255,0.04))`, border: "0.5px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <HabitIcon name={form.emoji} size={26} color={form.color} />
        </div>
        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome do hábito"
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 16, color: T.text, outline: "none", fontFamily: "inherit" }} />
      </Glass>

      <div style={{ marginBottom: 14 }}>
        <span style={lbl}>Ícone</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {ICON_NAMES.map(n => (
            <button key={n} onClick={() => set("emoji", n)} style={{
              aspectRatio: "1/1", borderRadius: 12, cursor: "pointer", border: "none",
              background: form.emoji === n ? `${form.color}44` : "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 8, transition: "all 0.15s",
            }}>
              <HabitIcon name={n} size={18} color={form.emoji === n ? form.color : "rgba(235,235,245,0.5)"} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <span style={lbl}>Categoria</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => set("category", c)} style={{
              padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              border: "none",
              background: form.category === c ? `${CAT_COLORS[c]}2e` : "rgba(255,255,255,0.04)",
              color: form.category === c ? CAT_COLORS[c] : T.textSec,
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Tipo", content: <select value={form.goalType} onChange={e => { set("goalType", e.target.value); set("goalUnit", e.target.value === "time" ? "min" : "unid"); }} style={inp}><option value="time">Tempo</option><option value="numeric">Numérico</option></select> },
          { label: "Meta", content: <input type="number" value={form.goalValue} onChange={e => set("goalValue", Number(e.target.value))} style={inp} min={1} /> },
          { label: "Unidade", content: <input value={form.goalUnit} onChange={e => set("goalUnit", e.target.value)} style={inp} /> },
        ].map(f => <div key={f.label}><span style={lbl}>{f.label}</span>{f.content}</div>)}
      </div>

      <div style={{ marginBottom: 24 }}>
        <span style={lbl}>Frequência</span>
        <div style={{ display: "flex", gap: 5 }}>
          {DAYS.map((d, i) => (
            <button key={i} onClick={() => toggleDay(i)} style={{
              flex: 1, padding: "9px 2px", borderRadius: 10, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              border: "none",
              background: form.frequency[i] ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
              color: form.frequency[i] ? T.text : T.textTer,
            }}>{d[0]}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "rgba(255,255,255,0.07)", color: T.textSec, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        <button onClick={() => form.name.trim() && onSave(form)} style={{ flex: 2, padding: 13, borderRadius: 14, border: "none", background: `linear-gradient(180deg,${T.accent},oklch(0.65 0.12 160))`, color: "#0E1410", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 0 20px ${T.accentSoft}` }}>
          {habit ? "Salvar" : "Criar hábito"}
        </button>
      </div>
    </div>
  );
}

// ─── SVG CHARTS ───────────────────────────────────────────────────────────────
const CG = "rgba(255,255,255,0.06)";

function AreaChart({ data, height = 150, stroke = T.accent, fid = "af1" }) {
  const W = 320, H = height, pL = 30, pR = 10, pT = 10, pB = 24;
  const cW = W - pL - pR, cH = H - pT - pB, n = data.length;
  if (n === 0) return null;
  const xs = i => pL + (n === 1 ? cW / 2 : (i * cW) / (n - 1));
  const ys = v => pT + cH - (Math.max(0, Math.min(100, v)) / 100) * cH;
  const lp = data.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(d.pct).toFixed(1)}`).join(" ");
  const fp = lp + ` L${xs(n - 1).toFixed(1)},${pT + cH} L${xs(0).toFixed(1)},${pT + cH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs><linearGradient id={fid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.4" /><stop offset="100%" stopColor={stroke} stopOpacity="0.02" /></linearGradient></defs>
      {[0, 25, 50, 75, 100].map(g => <line key={g} x1={pL} y1={ys(g)} x2={W - pR} y2={ys(g)} stroke={CG} strokeDasharray="2 4" />)}
      {[0, 50, 100].map(g => <text key={g} x={pL - 6} y={ys(g) + 3} textAnchor="end" fontSize="9" fill="rgba(235,235,245,0.4)">{g}%</text>)}
      <path d={fp} fill={`url(#${fid})`} />
      <path d={lp} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={xs(i)} cy={ys(d.pct)} r="2.5" fill={stroke} />)}
      {data.map((d, i) => { const skip = n > 16 ? Math.ceil(n / 8) : 1; if (i % skip !== 0 && i !== n - 1) return null; return <text key={i} x={xs(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(235,235,245,0.4)">{d.name}</text>; })}
    </svg>
  );
}

function HBarChart({ data }) {
  const rH = 28, gap = 6, lW = 96, W = 320, pW = 40;
  const bMax = W - lW - pW - 8, H = data.length * (rH + gap) + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      {data.map((d, i) => { const y = 4 + i * (rH + gap), bw = Math.max(2, (d.pct / 100) * bMax); return (
        <g key={i}>
          <text x={lW - 8} y={y + rH / 2 + 4} textAnchor="end" fontSize="11" fontWeight="500" fill="rgba(235,235,245,0.75)">{d.name}</text>
          <rect x={lW} y={y + 6} width={bMax} height={rH - 12} fill="rgba(255,255,255,0.04)" rx="6" />
          <rect x={lW} y={y + 6} width={bw} height={rH - 12} fill={d.color} rx="6" opacity="0.9" />
          <text x={W - 4} y={y + rH / 2 + 4} textAnchor="end" fontSize="10.5" fill="rgba(235,235,245,0.8)">{d.pct}%</text>
        </g>
      ); })}
    </svg>
  );
}

function VBarChart({ data, height = 180 }) {
  const W = 320, H = height, pL = 30, pR = 10, pT = 10, pB = 24;
  const cW = W - pL - pR, cH = H - pT - pB, n = data.length, step = cW / n;
  const bw = Math.max(4, Math.min(22, step * 0.6));
  const ys = v => pT + cH - (Math.max(0, Math.min(100, v)) / 100) * cH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      {[0, 25, 50, 75, 100].map(g => <line key={g} x1={pL} y1={ys(g)} x2={W - pR} y2={ys(g)} stroke={CG} strokeDasharray="2 4" />)}
      {[0, 50, 100].map(g => <text key={g} x={pL - 6} y={ys(g) + 3} textAnchor="end" fontSize="9" fill="rgba(235,235,245,0.4)">{g}%</text>)}
      {data.map((d, i) => { const cx = pL + step * (i + 0.5), bh = (d.pct / 100) * cH; return (
        <g key={i}>
          <rect x={cx - bw / 2} y={pT + cH - bh} width={bw} height={bh} fill={d.color || T.accent} rx="4" opacity="0.9" />
          <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(235,235,245,0.4)">{d.month || d.name}</text>
        </g>
      ); })}
    </svg>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ habits, allHabits, entries, selectedDate, setSelectedDate, getEntry, toggleEntry, setEntryValue }) {
  const today = todayStr();
  const dates = Array.from({ length: 7 }, (_, i) => dateStr(addDays(new Date(), -6 + i)));
  const done = habits.filter(h => getEntry(h.id, selectedDate)?.completed).length;
  const pct = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0;
  const selDate = new Date(selectedDate + "T12:00:00");
  const selLabel = selDate.toDateString() === new Date().toDateString() ? "Hoje" : selDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const [inputs, setInputs] = useState({});
  const [showUnplanned, setShowUnplanned] = useState(false);

  // Habits not scheduled for this day and without an entry yet
  const unplannedAvailable = allHabits.filter(h => {
    const dow = new Date(selectedDate + "T12:00:00").getDay();
    return h.isActive && !h.frequency[dow] && !getEntry(h.id, selectedDate);
  });

  return (
    <div style={{ padding: "0 16px 120px" }}>
      <Glass style={{ padding: 20, marginBottom: 14, display: "flex", gap: 18, alignItems: "center" }}>
        <Ring value={pct} size={110} stroke={9} color={T.accent}>
          <div style={{ fontSize: 26, fontWeight: 500, color: T.text, lineHeight: 1, letterSpacing: "-0.04em" }}>{pct}<span style={{ fontSize: 13, opacity: 0.5 }}>%</span></div>
          <div style={{ fontSize: 9, marginTop: 3, color: T.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>do dia</div>
        </Ring>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{selLabel}</div>
          <div style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.03em", color: T.text, lineHeight: 1.15 }}>
            {done} de {habits.length}<br />
            <span style={{ fontSize: 22, color: T.textSec, fontStyle: "italic" }}>hábitos feitos</span>
          </div>
          {pct === 100 && habits.length > 0 && <div style={{ fontSize: 12, color: T.gold, fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>{icFlame(12)} Dia completo!</div>}
        </div>
      </Glass>

      <div style={{ display: "flex", gap: 7, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {dates.map(d => {
          const wd = new Date(d + "T12:00:00"), dow = wd.getDay();
          const dh = allHabits.filter(h => h.isActive && h.frequency[dow]);
          const dn = dh.filter(h => getEntry(h.id, d)?.completed).length;
          const isSel = d === selectedDate, p = dh.length > 0 ? dn / dh.length : 0;
          return (
            <button key={d} onClick={() => setSelectedDate(d)} style={{
              flex: "0 0 auto", width: 50, padding: "10px 4px", borderRadius: 16, cursor: "pointer", textAlign: "center", fontFamily: "inherit",
              border: "none",
              background: isSel ? "linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))" : "rgba(255,255,255,0.04)",
              boxShadow: isSel ? "inset 0 1px 0 rgba(255,255,255,0.3),0 6px 16px rgba(0,0,0,0.25)" : "none",
              color: isSel ? T.text : T.textSec, transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6 }}>{DAYS[dow]}</div>
              <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3 }}>{wd.getDate()}</div>
              <div style={{ width: p > 0 ? 20 : 14, height: 3, borderRadius: 2, margin: "3px auto 0", transition: "all 0.3s", background: p === 1 ? T.gold : p > 0 ? T.accent : "rgba(255,255,255,0.08)" }} />
            </button>
          );
        })}
      </div>

      {/* Add unplanned habit — always visible */}
      {allHabits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowUnplanned(!showUnplanned)} style={{
            width: "100%", padding: "11px 16px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
            border: "none", background: "rgba(255,255,255,0.05)",
            color: T.textSec, fontWeight: 600, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {icPlus(15)}
            {showUnplanned ? "Fechar" : "Adicionar hábito não planejado"}
          </button>
          {showUnplanned && (
            <Glass style={{ marginTop: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: T.textTer, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Hábitos não planejados para hoje
              </div>
              {unplannedAvailable.length === 0 ? (
                <div style={{ fontSize: 13, color: T.textTer, textAlign: "center", padding: "8px 0" }}>
                  Todos os hábitos já estão planejados ou registrados para este dia.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unplannedAvailable.map(h => (
                    <button key={h.id} onClick={() => { toggleEntry(h, selectedDate); setShowUnplanned(false); }} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                      border: "none", background: "rgba(255,255,255,0.05)",
                      textAlign: "left", width: "100%",
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: `${h.color}4a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <HabitIcon name={h.emoji} size={18} color={h.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{h.name}</div>
                        <div style={{ fontSize: 11, color: T.textTer, marginTop: 1 }}>{h.goalValue} {h.goalUnit} · {h.category}</div>
                      </div>
                      <span style={{ fontSize: 11, color: T.accent, fontWeight: 600, flexShrink: 0 }}>+ Adicionar</span>
                    </button>
                  ))}
                </div>
              )}
            </Glass>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {habits.length === 0 ? (
          <Glass style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{icLeaf(32)}</div>
            <div style={{ color: T.textSec, fontSize: 15 }}>Nenhum hábito para hoje</div>
          </Glass>
        ) : habits.map((h, idx) => {
          const entry = getEntry(h.id, selectedDate);
          const streak = calcStreak(h.id, entries, allHabits);
          const pctH = entry ? Math.min((entry.value / h.goalValue) * 100, 100) : 0;
          const key = `${h.id}-${selectedDate}`;
          return (
            <Glass key={h.id} style={{ padding: "14px 14px 14px 18px", display: "flex", alignItems: "center", gap: 12, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, background: h.color, boxShadow: `0 0 8px ${h.color}`, opacity: 0.8 }} />
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `radial-gradient(100% 100% at 30% 30%, ${h.color}4a, rgba(255,255,255,0.03))`, border: "0.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <HabitIcon name={h.emoji} size={22} color={h.color} />
                </div>
                {pctH > 0 && <MiniRing value={pctH} size={48} stroke={2.5} color={h.color} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>{h.name}</div>
                  {!allHabits.find(ah => ah.id === h.id)?.frequency[new Date(selectedDate + "T12:00:00").getDay()] && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: T.textTer, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>extra</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: T.textTer }}>{entry ? entry.value : 0}/{h.goalValue} {h.goalUnit}</span>
                  {streak.current > 0 && <span style={{ fontSize: 11, color: T.gold, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>{icFlame(11)}{streak.current}d</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <input type="number"
                  value={inputs[key] !== undefined ? inputs[key] : (entry?.value || "")}
                  onChange={e => { setInputs(i => ({ ...i, [key]: e.target.value })); if (e.target.value) setEntryValue(h, selectedDate, e.target.value); }}
                  placeholder={String(h.goalValue)}
                  style={{ width: 54, padding: 6, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.08)", fontSize: 12, textAlign: "center", color: T.text, outline: "none", fontFamily: "inherit" }}
                />
                <CheckButton completed={!!entry?.completed} partial={entry?.value > 0 && !entry?.completed} color={h.color} onClick={() => toggleEntry(h, selectedDate)} />
              </div>
            </Glass>
          );
        })}
      </div>


    </div>
  );
}

// ─── HABITS TAB ───────────────────────────────────────────────────────────────
function HabitsTab({ habits, entries, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete, onToggleActive }) {
  const [filter, setFilter] = useState("Todos");
  const cats = ["Todos", ...CATEGORIES.filter(c => habits.some(h => h.category === c))];
  const filtered = filter === "Todos" ? habits : habits.filter(h => h.category === filter);
  return (
    <div style={{ padding: "0 16px 120px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "all 0.15s",
            border: "none",
            background: filter === c ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
            color: filter === c ? T.text : T.textSec,
          }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(h => {
          const streak = calcStreak(h.id, entries, habits);
          const last7 = Array.from({ length: 7 }, (_, i) => dateStr(addDays(new Date(), -6 + i)));
          const done7 = last7.filter(d => { const dow = new Date(d + "T12:00:00").getDay(); return h.frequency[dow] && entries.find(e => e.habitId === h.id && e.date === d && e.completed); }).length;
          const exp7 = last7.filter(d => h.frequency[new Date(d + "T12:00:00").getDay()]).length;
          const conf = confirmDelete === h.id;
          return (
            <Glass key={h.id} style={{ padding: "14px 14px 14px 18px", opacity: h.isActive ? 1 : 0.55, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, background: h.color, opacity: 0.7, boxShadow: `0 0 8px ${h.color}` }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `radial-gradient(100% 100% at 30% 30%, ${h.color}4a, rgba(255,255,255,0.03))`, border: "0.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <HabitIcon name={h.emoji} size={22} color={h.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>{h.name}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: `${h.color}28`, color: h.color }}>{h.category}</span>
                    <span style={{ fontSize: 11, color: T.textTer }}>{h.goalValue} {h.goalUnit}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: T.gold, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>{icFlame(14)}{streak.current}</div>
                  <div style={{ fontSize: 10, color: T.textTer, marginTop: 2 }}>best {streak.best}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 9, color: T.textTer, fontWeight: 700, marginRight: 4 }}>7d</span>
                {last7.map(d => {
                  const dow = new Date(d + "T12:00:00").getDay(), inF = h.frequency[dow], e = entries.find(e => e.habitId === h.id && e.date === d);
                  return <div key={d} style={{ width: 24, height: 24, borderRadius: 6, background: !inF ? "rgba(255,255,255,0.02)" : e?.completed ? h.color : e?.value > 0 ? `${h.color}55` : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: e?.completed ? "#0E1410" : T.textQuat }}>{new Date(d + "T12:00:00").getDate()}</div>;
                })}
                <span style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginLeft: 4 }}>{exp7 > 0 ? Math.round(done7 / exp7 * 100) : 0}%</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onToggleActive(h.id)} style={{ flex: 1, padding: 8, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.07)", color: T.textSec, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  {h.isActive ? icPause() : icPlay()} {h.isActive ? "Pausar" : "Ativar"}
                </button>
                <button onClick={() => onEdit(h)} style={{ flex: 1, padding: 8, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.07)", color: T.textSec, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  {icEdit()} Editar
                </button>
                {conf ? (
                  <>
                    <button onClick={() => onConfirmDelete(h.id)} style={{ flex: 1, padding: 8, borderRadius: 12, border: "none", background: "rgba(220,53,69,0.25)", color: T.danger, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
                    <button onClick={onCancelDelete} style={{ padding: "8px 12px", borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: T.textSec, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => onDelete(h.id)} style={{ padding: "8px 14px", borderRadius: 12, border: "none", background: `${T.danger}18`, color: T.danger, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>{icTrash()}</button>
                )}
              </div>
            </Glass>
          );
        })}
        {filtered.length === 0 && <Glass style={{ padding: 40, textAlign: "center" }}><div style={{ color: T.textSec, fontSize: 15 }}>Nenhum hábito nesta categoria</div></Glass>}
      </div>
    </div>
  );
}

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────
function WeeklyReport({ habits, entries }) {
  const [offset, setOffset] = useState(0);
  const start = startOfWeek(addDays(new Date(), offset * 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dayStrs = days.map(dateStr);
  const active = habits.filter(h => h.isActive);
  const barData = active.map(h => {
    let d = 0, t = 0;
    dayStrs.forEach(ds => {
      const dow = new Date(ds + "T12:00:00").getDay();
      const hasEntry = entries.find(e => e.habitId === h.id && e.date === ds);
      if (!h.frequency[dow] && !hasEntry) return; // skip if not scheduled AND no entry
      t++;
      if (hasEntry?.completed) d++;
    });
    return { name: h.name.split(" ")[0], pct: t > 0 ? Math.round(d / t * 100) : 0, color: h.color };
  });
  const lineData = dayStrs.map((ds, i) => {
    const dow = days[i].getDay();
    // Count scheduled + any habit with an entry that day (unplanned)
    const dayHabitIds = new Set([
      ...active.filter(h => h.frequency[dow]).map(h => h.id),
      ...entries.filter(e => e.date === ds).map(e => e.habitId)
    ]);
    const total = dayHabitIds.size;
    const dn = [...dayHabitIds].filter(id => entries.find(e => e.habitId === id && e.date === ds && e.completed)).length;
    return { name: DAYS[dow], pct: total > 0 ? Math.round(dn / total * 100) : 0 };
  });
  const avg = Math.round(lineData.reduce((s, d) => s + d.pct, 0) / 7);
  const bestI = lineData.reduce((b, d, i) => d.pct > lineData[b].pct ? i : b, 0);
  const weekLabel = `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`;
  const fmtTime = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}min` : ""}` : `${m}min`;
  const sec = { fontSize: 9, color: T.textTer, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ ...glass2Style, borderRadius: 12, padding: "8px 12px", color: T.textSec, cursor: "pointer", fontFamily: "inherit" }}>{icChevL()}</button>
        <div style={{ textAlign: "center" }}>
          <div style={sec}>Semana</div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", color: T.text }}>{weekLabel}</div>
        </div>
        <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset >= 0} style={{ ...glass2Style, borderRadius: 12, padding: "8px 12px", color: T.textSec, cursor: "pointer", opacity: offset >= 0 ? 0.35 : 1, fontFamily: "inherit" }}>{icChevR()}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Glass style={{ padding: "14px 16px" }}><div style={sec}>Média</div><div style={{ fontSize: 34, fontWeight: 400, letterSpacing: "-0.04em", color: T.text, lineHeight: 1 }}>{avg}<span style={{ fontSize: 16, color: T.textSec }}>%</span></div></Glass>
        <Glass style={{ padding: "14px 16px" }}><div style={sec}>Melhor dia</div><div style={{ fontSize: 20, fontWeight: 500, color: T.text, marginTop: 4 }}>{DAYS[days[bestI].getDay()]}<span style={{ marginLeft: 6, color: T.gold, fontSize: 14 }}>{Math.max(...lineData.map(d => d.pct))}%</span></div></Glass>
      </div>
      <Glass style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Progresso diário</h3>
        <AreaChart data={lineData} height={150} fid="af1" />
      </Glass>
      <Glass style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Conclusão por hábito</h3>
        <HBarChart data={barData} />
      </Glass>
      {/* Volume grid */}
      <Glass style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 14px", letterSpacing: "-0.02em" }}>Volume</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px 6px" }}>
            <thead><tr>
              <th style={{ width: 80, textAlign: "left" }}><span style={{ ...sec, marginBottom: 0 }}>Hábito</span></th>
              {days.map((d, i) => { const isT = dateStr(d) === todayStr(); return <th key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 8.5, fontWeight: 700, color: isT ? T.accent : T.textTer, textTransform: "uppercase" }}>{DAYS[d.getDay()]}</div><div style={{ fontSize: 11, fontWeight: 600, color: isT ? T.accent : T.textSec, marginTop: 2 }}>{d.getDate()}</div></th>; })}
              <th style={{ paddingLeft: 6 }}><span style={{ ...sec, marginBottom: 0 }}>%</span></th>
            </tr></thead>
            <tbody>
              {active.map(h => {
                let dn = 0, ex = 0;
                const cells = days.map((d, i) => {
                  const ds = dateStr(d), dow = d.getDay();
                  const inF = h.frequency[dow];
                  const e = entries.find(e => e.habitId === h.id && e.date === ds);
                  const counts = inF || e; // count if scheduled OR has entry
                  if (counts) { ex++; if (e?.completed) dn++; }
                  return { inF, hasEntry: !!e, completed: e?.completed, partial: e?.value > 0 && !e?.completed, key: i };
                });
                return <tr key={h.id}>
                  <td style={{ paddingRight: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><HabitIcon name={h.emoji} size={13} color={h.color} sw={1.8} /><span style={{ fontSize: 11, fontWeight: 500, color: T.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 56 }}>{h.name.split(" ")[0]}</span></div></td>
                  {cells.map(c => <td key={c.key} style={{ textAlign: "center" }}>
                    {c.completed
                      ? <div style={{ width: 26, height: 26, borderRadius: 7, background: h.color, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E1410", fontSize: 13, fontWeight: 700, boxShadow: `0 0 8px ${h.color}80`, border: !c.inF ? `2px solid ${T.gold}` : "none" }}>✓</div>
                      : c.partial
                        ? <div style={{ width: 26, height: 26, borderRadius: 7, background: `${h.color}44`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: h.color, fontSize: 12, fontWeight: 700 }}>~</div>
                        : !c.inF
                          ? <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.02)", margin: "0 auto" }} />
                          : <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "0.5px dashed rgba(255,255,255,0.08)", margin: "0 auto" }} />}
                  </td>)}
                  <td style={{ textAlign: "center", paddingLeft: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: dn === ex && ex > 0 ? T.gold : dn > 0 ? T.accent : T.textTer }}>{ex > 0 ? `${Math.round(dn / ex * 100)}%` : "—"}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Glass>
      {/* Text summary */}
      <Glass style={{ padding: 16 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 16px", letterSpacing: "-0.02em" }}>Resumo da semana</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map(h => {
            let cV = 0, cD = 0, cE = 0;
            dayStrs.forEach(d => { const dow = new Date(d + "T12:00:00").getDay(); if (!h.frequency[dow]) return; cE++; const e = entries.find(e => e.habitId === h.id && e.date === d); if (e?.completed) { cD++; cV += e.value || 0; } else if (e?.value > 0) cV += e.value; });
            const prev = days.map(d => dateStr(addDays(d, -7)));
            let pV = 0, pD = 0;
            prev.forEach(d => { const dow = new Date(d + "T12:00:00").getDay(); if (!h.frequency[dow]) return; const e = entries.find(e => e.habitId === h.id && e.date === d); if (e?.completed) { pD++; pV += e.value || 0; } else if (e?.value > 0) pV += e.value; });
            const isT = h.goalType === "time";
            const main = isT ? (cV > 0 ? `Você dedicou ${fmtTime(cV)} de ${h.name.toLowerCase()} esta semana.` : `Você não registrou ${h.name.toLowerCase()} esta semana.`) : (cD > 0 ? `Você realizou ${h.name.toLowerCase()} ${cD} vez${cD > 1 ? "es" : ""} esta semana.` : `Você não realizou ${h.name.toLowerCase()} esta semana.`);
            let cmp = "", trend = 0;
            if (isT) { const diff = cV - pV; trend = diff > 0 ? 1 : diff < 0 ? -1 : 0; cmp = pV === 0 && cV === 0 ? "Nenhum registro nas últimas duas semanas." : pV === 0 ? "Sem dados na semana anterior." : diff === 0 ? `Mesmo volume (${fmtTime(pV)}).` : `${diff > 0 ? "↑ Mais" : "↓ Menos"} ${fmtTime(Math.abs(diff))} do que na semana passada (${fmtTime(pV)}).`; }
            else { const diff = cD - pD; trend = diff > 0 ? 1 : diff < 0 ? -1 : 0; cmp = pD === 0 && cD === 0 ? "Nenhum registro nas últimas duas semanas." : pD === 0 ? "Sem dados na semana anterior." : diff === 0 ? `Mesmo número (${pD}x).` : `${diff > 0 ? "↑" : "↓"} ${Math.abs(diff)}x ${diff > 0 ? "a mais" : "a menos"} (semana passada: ${pD}x).`; }
            return (
              <div key={h.id} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${h.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><HabitIcon name={h.emoji} size={16} color={h.color} /><span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{h.name}</span></div>
                <p style={{ margin: "0 0 3px", fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>{main}</p>
                <p style={{ margin: 0, fontSize: 12, color: trend > 0 ? T.accent : trend < 0 ? T.danger : T.textTer, fontWeight: 600, lineHeight: 1.5 }}>{cmp}</p>
              </div>
            );
          })}
        </div>
      </Glass>
    </div>
  );
}

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────
function MonthlyReport({ habits, entries }) {
  const [mo, setMo] = useState(0);
  const now = new Date(), ref = new Date(now.getFullYear(), now.getMonth() + mo, 1);
  const yr = ref.getFullYear(), mn = ref.getMonth(), dim = new Date(yr, mn + 1, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => dateStr(new Date(yr, mn, i + 1)));
  const firstDow = new Date(yr, mn, 1).getDay();
  const active = habits.filter(h => h.isActive);
  const HC = ["rgba(255,255,255,0.05)", "oklch(0.55 0.10 160 / 0.4)", "oklch(0.65 0.11 160 / 0.6)", "oklch(0.72 0.12 160 / 0.75)", "oklch(0.78 0.12 160)"];
  const intensity = days.map(d => {
    const dow = new Date(d + "T12:00:00").getDay();
    const dayHabitIds = new Set([
      ...active.filter(h => h.frequency[dow]).map(h => h.id),
      ...entries.filter(e => e.date === d).map(e => e.habitId)
    ]);
    if (!dayHabitIds.size) return 0;
    const dn = [...dayHabitIds].filter(id => entries.find(e => e.habitId === id && e.date === d && e.completed)).length;
    const p = dn / dayHabitIds.size;
    return p === 0 ? 0 : p < 0.33 ? 1 : p < 0.66 ? 2 : p < 1 ? 3 : 4;
  });
  const catData = Object.entries(CAT_COLORS).map(([cat, color]) => { const ch = active.filter(h => h.category === cat), v = ch.reduce((s, h) => s + days.filter(d => entries.find(e => e.habitId === h.id && e.date === d && e.completed)).length, 0); return { name: cat, value: v, color }; }).filter(c => c.value > 0);
  const total = catData.reduce((s, c) => s + c.value, 0);
  const weekTrend = [];
  for (let w = 0; w < 5; w++) {
    const wd = days.slice(w * 7, (w + 1) * 7);
    if (!wd.length) continue;
    let d = 0, t = 0;
    wd.forEach(ds => {
      const dow = new Date(ds + "T12:00:00").getDay();
      const ids = new Set([...active.filter(h => h.frequency[dow]).map(h => h.id), ...entries.filter(e => e.date === ds).map(e => e.habitId)]);
      t += ids.size;
      d += [...ids].filter(id => entries.find(e => e.habitId === id && e.date === ds && e.completed)).length;
    });
    weekTrend.push({ name: `S${w + 1}`, pct: t > 0 ? Math.round(d / t * 100) : 0, color: T.accent });
  }
  const sec = { fontSize: 9, color: T.textTer, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => setMo(m => m - 1)} style={{ ...glass2Style, borderRadius: 12, padding: "8px 12px", color: T.textSec, cursor: "pointer", fontFamily: "inherit" }}>{icChevL()}</button>
        <div style={{ textAlign: "center" }}><div style={sec}>Mês</div><div style={{ fontSize: 18, fontWeight: 500, color: T.text, letterSpacing: "-0.02em" }}>{MONTHS[mn]} {yr}</div></div>
        <button onClick={() => setMo(m => Math.min(0, m + 1))} disabled={mo >= 0} style={{ ...glass2Style, borderRadius: 12, padding: "8px 12px", color: T.textSec, cursor: "pointer", opacity: mo >= 0 ? 0.35 : 1, fontFamily: "inherit" }}>{icChevR()}</button>
      </div>
      <Glass style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Calendário</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: T.textQuat, textTransform: "uppercase", padding: "2px 0" }}>{d[0]}</div>)}
          {Array.from({ length: firstDow }).map((_, i) => <div key={"e" + i} />)}
          {days.map((d, i) => <div key={d} style={{ aspectRatio: "1", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 600, background: HC[intensity[i]], color: intensity[i] >= 3 ? T.text : T.textTer, transition: "background 0.2s" }}>{new Date(d + "T12:00:00").getDate()}</div>)}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 9, color: T.textTer }}>Menos</span>
          {HC.map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c }} />)}
          <span style={{ fontSize: 9, color: T.textTer }}>Mais</span>
        </div>
      </Glass>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Glass style={{ padding: 14 }}>
          <h3 style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: T.text, margin: "0 0 12px" }}>Categorias</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {catData.slice(0, 4).map(c => <div key={c.name}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 10, color: T.textSec, fontWeight: 600 }}>{c.name}</span><span style={{ fontSize: 10, color: c.color, fontWeight: 700 }}>{total > 0 ? Math.round(c.value / total * 100) : 0}%</span></div><div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 2, background: c.color, width: `${total > 0 ? c.value / total * 100 : 0}%`, transition: "width 0.5s" }} /></div></div>)}
          </div>
        </Glass>
        <Glass style={{ padding: 14 }}>
          <h3 style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: T.text, margin: "0 0 10px" }}>Por semana</h3>
          <VBarChart data={weekTrend} height={130} />
        </Glass>
      </div>
    </div>
  );
}

// ─── ANNUAL REPORT ────────────────────────────────────────────────────────────
function AnnualReport({ habits, entries }) {
  const yr = new Date().getFullYear(), start = new Date(yr, 0, 1);
  const total = Math.floor((new Date() - start) / 86400000) + 1;
  const allDays = Array.from({ length: total }, (_, i) => dateStr(addDays(start, i)));
  const active = habits.filter(h => h.isActive);
  const HC = ["rgba(255,255,255,0.04)", "oklch(0.50 0.09 160 / 0.4)", "oklch(0.60 0.10 160 / 0.55)", "oklch(0.68 0.11 160 / 0.7)", "oklch(0.74 0.12 160 / 0.85)", "oklch(0.78 0.12 160)"];
  const dayInt = allDays.map(d => {
    const dow = new Date(d + "T12:00:00").getDay();
    const ids = new Set([...active.filter(h => h.frequency[dow]).map(h => h.id), ...entries.filter(e => e.date === d).map(e => e.habitId)]);
    if (!ids.size) return 0;
    const dn = [...ids].filter(id => entries.find(e => e.habitId === id && e.date === d && e.completed)).length;
    const p = dn / ids.size;
    return p === 0 ? 0 : p < 0.25 ? 1 : p < 0.5 ? 2 : p < 0.75 ? 3 : p < 1 ? 4 : 5;
  });
  const firstDow = start.getDay();
  const weeks = []; let week = Array(firstDow).fill(null);
  allDays.forEach((d, i) => { week.push({ date: d, intensity: dayInt[i] }); if (week.length === 7) { weeks.push(week); week = []; } });
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
  const monthData = MONTHS.map((m, mi) => {
    const md = allDays.filter(d => new Date(d + "T12:00:00").getMonth() === mi);
    if (!md.length) return { month: m, pct: 0, color: T.accent };
    let d = 0, t = 0;
    md.forEach(ds => {
      const dow = new Date(ds + "T12:00:00").getDay();
      const ids = new Set([...active.filter(h => h.frequency[dow]).map(h => h.id), ...entries.filter(e => e.date === ds).map(e => e.habitId)]);
      t += ids.size;
      d += [...ids].filter(id => entries.find(e => e.habitId === id && e.date === ds && e.completed)).length;
    });
    return { month: m, pct: t > 0 ? Math.round(d / t * 100) : 0, color: T.accent };
  });
  const topHabits = active.map(h => { const dn = allDays.filter(d => entries.find(e => e.habitId === h.id && e.date === d && e.completed)).length; let best = 0, cur = 0; allDays.forEach(d => { const dow = new Date(d + "T12:00:00").getDay(); if (!h.frequency[dow]) return; if (entries.find(e => e.habitId === h.id && e.date === d && e.completed)) { cur++; best = Math.max(best, cur); } else cur = 0; }); return { ...h, done: dn, bestStreak: best }; }).sort((a, b) => b.done - a.done).slice(0, 3);
  return (
    <div>
      <Glass style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Heatmap {yr}</h3>
        <div style={{ display: "flex", overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginRight: 4 }}>
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} style={{ height: 11, fontSize: 7, color: T.textQuat, lineHeight: "11px", fontWeight: 700 }}>{d}</div>)}
          </div>
          {weeks.map((wk, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 1, marginRight: 1 }}>
              {wk.map((day, di) => day ? <div key={di} title={day.date} style={{ width: 11, height: 11, borderRadius: 2, background: HC[day.intensity], transition: "background 0.2s" }} /> : <div key={di} style={{ width: 11, height: 11 }} />)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 9, color: T.textTer }}>Menos</span>
          {HC.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)}
          <span style={{ fontSize: 9, color: T.textTer }}>Mais</span>
        </div>
      </Glass>
      <Glass style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Evolução mensal</h3>
        <VBarChart data={monthData} height={160} />
      </Glass>
      <Glass style={{ padding: 16 }}>
        <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 16px", letterSpacing: "-0.02em" }}>🏆 Top hábitos do ano</h3>
        {topHabits.map((h, i) => (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topHabits.length - 1 ? "0.5px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.gold}28`, color: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>#{i + 1}</div>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: `${h.color}4a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><HabitIcon name={h.emoji} size={20} color={h.color} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: T.textTer, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>{h.done} dias · {icFlame(10)} {h.bestStreak} melhor streak</div>
            </div>
          </div>
        ))}
        {topHabits.length === 0 && <div style={{ textAlign: "center", color: T.textTer, padding: 16 }}>Nenhum dado ainda</div>}
      </Glass>
    </div>
  );
}

function ReportsTab({ habits, entries }) {
  const [rt, setRt] = useState("weekly");
  return (
    <div style={{ padding: "0 16px 120px" }}>
      <div style={{ ...glass2Style, display: "flex", padding: 4, marginBottom: 16, borderRadius: 999 }}>
        {[{ id: "weekly", label: "Semanal" }, { id: "monthly", label: "Mensal" }, { id: "annual", label: "Anual" }].map(t => (
          <button key={t.id} onClick={() => setRt(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 999, border: "none", background: rt === t.id ? "linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06))" : "transparent", boxShadow: rt === t.id ? "inset 0 1px 0 rgba(255,255,255,0.3)" : "none", color: rt === t.id ? T.text : T.textSec, fontWeight: 600, fontSize: 12.5, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>{t.label}</button>
        ))}
      </div>
      {rt === "weekly" && <WeeklyReport habits={habits} entries={entries} />}
      {rt === "monthly" && <MonthlyReport habits={habits} entries={entries} />}
      {rt === "annual" && <AnnualReport habits={habits} entries={entries} />}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Habitus() {
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [modal, setModal] = useState(null);
  const [editHabit, setEditHabit] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadFromStorage = useCallback(async (spinner = false) => {
    if (spinner) setSyncing(true);
    setLoadError(null);
    try {
      const [hr, er] = await Promise.all([sbGet("habits"), sbGet("entries")]);
      setHabits(hr.map(habitFromDb));
      setEntries(er.map(entryFromDb));
    } catch (e) {
      console.error("Load error:", e);
      setLoadError(e.message || "Erro ao conectar ao banco de dados");
    }
    setLoaded(true);
    if (spinner) setSyncing(false);
  }, []);

  useEffect(() => { loadFromStorage(); }, []);

  const getEntry = useCallback((habitId, date) => entries.find(e => e.habitId === habitId && e.date === date), [entries]);

  const saveHabit = useCallback(async (form) => {
    if (editHabit) { const u = { ...form, id: editHabit.id, createdAt: editHabit.createdAt }; setHabits(hs => hs.map(h => h.id === editHabit.id ? u : h)); await sbUpsert("habits", [habitToDb(u)]); }
    else { const n = { ...form, id: uuid(), createdAt: todayStr() }; setHabits(hs => [...hs, n]); await sbUpsert("habits", [habitToDb(n)]); }
    setModal(null); setEditHabit(null);
  }, [editHabit]);

  const deleteHabit = useCallback(id => setConfirmDelete(id), []);
  const confirmDeleteHabit = useCallback(async id => { setHabits(hs => hs.filter(h => h.id !== id)); setEntries(es => es.filter(e => e.habitId !== id)); setConfirmDelete(null); await sbDelete("habits", id); }, []);

  const toggleEntry = useCallback(async (habit, date) => {
    const ex = entries.find(e => e.habitId === habit.id && e.date === date);
    if (ex) {
      if (ex.completed) { setEntries(es => es.filter(e => !(e.habitId === habit.id && e.date === date))); await sbDelete("entries", ex.id); }
      else { const u = { ...ex, value: habit.goalValue, completed: true }; setEntries(es => es.map(e => e.habitId === habit.id && e.date === date ? u : e)); await sbUpsert("entries", [entryToDb(u)]); }
    } else { const n = { id: uuid(), habitId: habit.id, date, value: habit.goalValue, completed: true }; setEntries(es => [...es, n]); await sbUpsert("entries", [entryToDb(n)]); }
  }, [entries]);

  const setEntryValue = useCallback(async (habit, date, value) => {
    const num = parseFloat(value) || 0, completed = num > 0;
    const ex = entries.find(e => e.habitId === habit.id && e.date === date);
    if (ex) { const u = { ...ex, value: num, completed }; setEntries(es => es.map(e => e.habitId === habit.id && e.date === date ? u : e)); await sbUpsert("entries", [entryToDb(u)]); }
    else if (num > 0) { const n = { id: uuid(), habitId: habit.id, date, value: num, completed }; setEntries(es => [...es, n]); await sbUpsert("entries", [entryToDb(n)]); }
  }, [entries]);

  const todayHabits = useMemo(() => {
    const dow = new Date(selectedDate + "T12:00:00").getDay();
    const scheduled = habits.filter(h => h.isActive && h.frequency[dow]);
    // Also include active habits that have an entry on this day (unplanned)
    const unplanned = habits.filter(h =>
      h.isActive && !h.frequency[dow] &&
      entries.find(e => e.habitId === h.id && e.date === selectedDate)
    );
    return [...scheduled, ...unplanned];
  }, [habits, selectedDate, entries]);
  const totalStreak = useMemo(() => habits.reduce((s, h) => s + calcStreak(h.id, entries, habits).current, 0), [habits, entries]);

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><HabitIcon name="leaf" size={32} color={T.accent} /></div>
        <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.03em", color: T.text }}>Habitus<span style={{ fontStyle: "italic", color: T.accent }}>.</span></div>
        <div style={{ fontSize: 12, color: T.textTer, marginTop: 8 }}>Carregando...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050507", fontFamily: "'Geist','Inter',-apple-system,system-ui,sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        button { outline: none; -webkit-appearance: none; }
        input, select { outline: none; -webkit-appearance: none; }
        input, select, button { font-family: 'Geist','Inter',-apple-system,system-ui,sans-serif; }
        ::placeholder { color: rgba(235,235,245,0.3); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        select option { background: #1a1a1e; color: #fff; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "50%", background: "radial-gradient(ellipse, oklch(0.4 0.13 160 / 0.2) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-10%", width: "50%", height: "40%", background: "radial-gradient(ellipse, oklch(0.4 0.14 240 / 0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ padding: "52px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: T.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase())}
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 400, margin: 0, color: T.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
              Habitus<span style={{ fontStyle: "italic", color: T.accent }}>.</span>
            </h1>
          </div>
          <button onClick={() => { setEditHabit(null); setModal("form"); }} style={{ ...glass2Style, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
            {icPlus()} Novo
          </button>
        </div>

        {/* KPIs */}
        <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
          {[
            { label: "Hoje", value: `${todayHabits.filter(h => getEntry(h.id, selectedDate)?.completed).length}/${todayHabits.length}`, gold: false },
            { label: "Streaks", value: totalStreak, gold: true },
            { label: "Ativos", value: habits.filter(h => h.isActive).length, gold: false },
          ].map(k => (
            <Glass key={k.label} style={{ flex: 1, padding: "10px 12px", borderRadius: 16 }}>
              <div style={{ fontSize: 9, color: T.textTer, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 1.2, marginTop: 2, color: k.gold ? T.gold : T.text, textShadow: k.gold ? `0 0 12px ${T.gold}66` : "none" }}>{k.value}</div>
            </Glass>
          ))}
        </div>

        {/* Sync */}
        <div style={{ padding: "0 20px 8px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => loadFromStorage(true)} style={{ background: "none", border: "none", color: T.textTer, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", opacity: syncing ? 0.5 : 1 }}>
            <span style={{ display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none", fontSize: 14 }}>⟳</span> Sincronizar
          </button>
        </div>

        {/* Error banner */}
        {loadError && (
          <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 12, background: "rgba(220,53,69,0.15)", border: "0.5px solid rgba(220,53,69,0.4)" }}>
            <div style={{ fontSize: 12, color: T.danger, fontWeight: 600, marginBottom: 2 }}>⚠️ Erro ao carregar dados</div>
            <div style={{ fontSize: 11, color: T.textSec, fontFamily: "monospace" }}>{loadError}</div>
            <button onClick={() => loadFromStorage(true)} style={{ marginTop: 8, fontSize: 11, color: T.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Tentar novamente →</button>
          </div>
        )}

        {/* Content */}
        <div style={{ animation: "fadeIn 0.25s ease" }}>
          {tab === "today" && <TodayTab habits={todayHabits} allHabits={habits} entries={entries} selectedDate={selectedDate} setSelectedDate={setSelectedDate} getEntry={getEntry} toggleEntry={toggleEntry} setEntryValue={setEntryValue} />}
          {tab === "habits" && <HabitsTab habits={habits} entries={entries} onEdit={h => { setEditHabit(h); setModal("form"); }} onDelete={deleteHabit} confirmDelete={confirmDelete} onConfirmDelete={confirmDeleteHabit} onCancelDelete={() => setConfirmDelete(null)} onToggleActive={async id => { const u = habits.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h); setHabits(u); await sbUpsert("habits", [habitToDb(u.find(h => h.id === id))]); }} />}
          {tab === "reports" && <ReportsTab habits={habits} entries={entries} />}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "0 16px 24px", zIndex: 50 }}>
        <TabBar tab={tab} setTab={setTab} />
      </div>

      <Modal open={modal === "form"} onClose={() => { setModal(null); setEditHabit(null); }}>
        <HabitForm habit={editHabit} onSave={saveHabit} onCancel={() => { setModal(null); setEditHabit(null); }} />
      </Modal>
    </div>
  );
}
