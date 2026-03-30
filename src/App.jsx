import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

// ─── PALETTE & CONSTANTS ──────────────────────────────────────────────────────
const FOREST = "#1A6B4A";
const FOREST_LIGHT = "#2A8A62";
const FOREST_DARK = "#0F4030";
const CREAM = "#F7F3EE";
const WARM = "#E8DDD0";
const BARK = "#6B5744";
const GOLD = "#C9963E";
const SLATE = "#3D4A3E";

const CATEGORIES = ["Espiritual", "Intelectual", "Físico", "Profissional", "Saúde", "Relacional"];
const CAT_COLORS = {
  Espiritual: "#7B68EE", Intelectual: "#1A6B4A", Físico: "#E07B39",
  Profissional: "#2D7DD2", Saúde: "#E63946", Relacional: "#C9963E"
};
const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function dateStr(d) { return d.toISOString().slice(0,10); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
function generateSampleData() {
  const habits = [
    { id:"h1", name:"Oração Matinal", emoji:"🙏", category:"Espiritual", color:"#7B68EE",
      goalType:"time", goalValue:30, goalUnit:"min", frequency:{0:true,1:true,2:true,3:true,4:true,5:true,6:true}, createdAt:"2025-01-01", isActive:true },
    { id:"h2", name:"Leitura", emoji:"📚", category:"Intelectual", color:"#1A6B4A",
      goalType:"numeric", goalValue:20, goalUnit:"páginas", frequency:{1:true,2:true,3:true,4:true,5:true}, createdAt:"2025-01-01", isActive:true },
    { id:"h3", name:"Exercício", emoji:"🏃", category:"Físico", color:"#E07B39",
      goalType:"time", goalValue:45, goalUnit:"min", frequency:{1:true,3:true,5:true}, createdAt:"2025-01-15", isActive:true },
    { id:"h4", name:"Estudo Bíblico", emoji:"✝️", category:"Espiritual", color:"#9B59B6",
      goalType:"numeric", goalValue:2, goalUnit:"capítulos", frequency:{1:true,2:true,3:true,4:true,5:true,6:true,0:true}, createdAt:"2025-02-01", isActive:true },
    { id:"h5", name:"Coding", emoji:"💻", category:"Profissional", color:"#2D7DD2",
      goalType:"time", goalValue:60, goalUnit:"min", frequency:{1:true,2:true,3:true,4:true,5:true}, createdAt:"2025-02-15", isActive:true },
  ];

  const entries = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = addDays(today, -i);
    const ds = dateStr(d);
    const dow = d.getDay();
    habits.forEach(h => {
      if (!h.frequency[dow]) return;
      const rand = Math.random();
      if (rand < 0.75) {
        const pct = 0.6 + Math.random() * 0.5;
        entries.push({
          id: uuid(), habitId: h.id, date: ds,
          value: Math.round(h.goalValue * Math.min(pct, 1)),
          completed: pct >= 1,
        });
      }
    });
  }
  return { habits, entries };
}

// ─── STREAK CALC ──────────────────────────────────────────────────────────────
function calcStreak(habitId, entries, habits) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return { current: 0, best: 0 };
  const completedDates = new Set(
    entries.filter(e => e.habitId === habitId && e.completed).map(e => e.date)
  );
  let current = 0, best = 0, count = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = dateStr(addDays(today, -i));
    const dow = addDays(today, -i).getDay();
    if (!habit.frequency[dow]) continue;
    if (completedDates.has(d)) {
      count++;
      if (i === 0 || i === 1) current = count;
    } else {
      if (i === 0) { current = 0; }
      best = Math.max(best, count);
      count = 0;
    }
  }
  best = Math.max(best, count, current);
  return { current, best };
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
function HeatmapCell({ date, intensity, size = 11 }) {
  const colors = ["#E8DDD0","#A8D5BC","#5AAD85","#2A8A62","#1A6B4A","#0F4030"];
  const c = colors[Math.min(intensity, 5)];
  return (
    <div title={date} style={{
      width: size, height: size, borderRadius: 2, backgroundColor: c,
      display:"inline-block", margin:1, transition:"background 0.2s"
    }} />
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(10,25,15,0.6)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      backdropFilter:"blur(4px)"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:CREAM, borderRadius:20, padding:28, width:"100%", maxWidth:480,
        maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(10,40,20,0.25)",
        animation:"slideUp 0.25s ease"
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── HABIT FORM ───────────────────────────────────────────────────────────────
const PRESET_EMOJIS = ["🙏","📚","🏃","💻","✝️","🧘","🥗","💪","🎯","📖","✍️","🎵","🌿","💧","😴","🧠","❤️","🌟"];

function HabitForm({ habit, onSave, onCancel }) {
  const [form, setForm] = useState(habit || {
    name:"", emoji:"🌿", category:"Espiritual", color:FOREST,
    goalType:"time", goalValue:30, goalUnit:"min",
    frequency:{0:true,1:true,2:true,3:true,4:true,5:true,6:true}, isActive:true
  });
  const set = (k,v) => setForm(f => ({...f, [k]:v}));
  const toggleDay = d => setForm(f => ({...f, frequency:{...f.frequency, [d]:!f.frequency[d]}}));

  return (
    <div>
      <h2 style={{fontFamily:"'Playfair Display',Georgia,serif", color:FOREST_DARK, fontSize:22, marginBottom:20}}>
        {habit ? "✏️ Editar Hábito" : "✨ Novo Hábito"}
      </h2>

      <div style={{marginBottom:16}}>
        <label style={labelStyle}>Emoji</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6, marginTop:6}}>
          {PRESET_EMOJIS.map(e => (
            <button key={e} onClick={() => set("emoji",e)} style={{
              fontSize:22, background: form.emoji===e ? WARM : "transparent",
              border: form.emoji===e ? `2px solid ${FOREST}` : "2px solid transparent",
              borderRadius:8, padding:"4px 6px", cursor:"pointer", transition:"all 0.15s"
            }}>{e}</button>
          ))}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Nome</label>
        <input value={form.name} onChange={e=>set("name",e.target.value)}
          placeholder="Ex: Oração Matinal"
          style={inputStyle} />
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14}}>
        <div>
          <label style={labelStyle}>Categoria</label>
          <select value={form.category} onChange={e=>set("category",e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cor</label>
          <input type="color" value={form.color} onChange={e=>set("color",e.target.value)}
            style={{...inputStyle, padding:4, height:42, cursor:"pointer"}} />
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14}}>
        <div>
          <label style={labelStyle}>Tipo de Meta</label>
          <select value={form.goalType} onChange={e=>{set("goalType",e.target.value); set("goalUnit",e.target.value==="time"?"min":"unid")}} style={inputStyle}>
            <option value="time">Tempo</option>
            <option value="numeric">Numérico</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Meta</label>
          <input type="number" value={form.goalValue} onChange={e=>set("goalValue",Number(e.target.value))}
            style={inputStyle} min={1} />
        </div>
        <div>
          <label style={labelStyle}>Unidade</label>
          <input value={form.goalUnit} onChange={e=>set("goalUnit",e.target.value)}
            placeholder="min" style={inputStyle} />
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <label style={labelStyle}>Frequência</label>
        <div style={{display:"flex", gap:6, marginTop:6}}>
          {DAYS_PT.map((d,i) => (
            <button key={i} onClick={() => toggleDay(i)} style={{
              flex:1, padding:"8px 2px", borderRadius:8, fontSize:11, fontWeight:600,
              border:`2px solid ${form.frequency[i] ? FOREST : WARM}`,
              background: form.frequency[i] ? FOREST : "transparent",
              color: form.frequency[i] ? "#fff" : BARK, cursor:"pointer",
              transition:"all 0.15s"
            }}>{d}</button>
          ))}
        </div>
      </div>

      <div style={{display:"flex", gap:10}}>
        <button onClick={onCancel} style={{...btnStyle, background:WARM, color:BARK, flex:1}}>Cancelar</button>
        <button onClick={() => form.name.trim() && onSave(form)} style={{...btnStyle, flex:2}}>
          {habit ? "Salvar" : "Criar Hábito"}
        </button>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const labelStyle = { fontSize:11, fontWeight:700, color:BARK, textTransform:"uppercase", letterSpacing:"0.08em" };
const inputStyle = {
  width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${WARM}`,
  background:"#fff", fontSize:14, color:SLATE, outline:"none", boxSizing:"border-box",
  fontFamily:"inherit", marginTop:4
};
const btnStyle = {
  padding:"12px 20px", borderRadius:12, border:"none", cursor:"pointer",
  background:FOREST, color:"#fff", fontWeight:700, fontSize:14, fontFamily:"inherit",
  transition:"all 0.2s", boxShadow:`0 4px 14px ${FOREST}44`
};
const cardStyle = {
  background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(10,40,20,0.08)",
  border:`1px solid ${WARM}`
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Habitus() {
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("today");
  const [reportTab, setReportTab] = useState("weekly");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [modal, setModal] = useState(null); // null | 'new' | 'edit' | habitObj
  const [editHabit, setEditHabit] = useState(null);
  const [entryInput, setEntryInput] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncLog, setSyncLog] = useState([]);
  const [showSyncLog, setShowSyncLog] = useState(false);

  // ── LOCAL STORAGE ──
  const loadFromStorage = useCallback(async (showSpinner = false) => {
    if (showSpinner) setSyncing(true);
    try {
      const r = await window.storage.get("habitus-data");
      if (r?.value) {
        const d = JSON.parse(r.value);
        setHabits(d.habits || []);
        setEntries(d.entries || []);
      } else {
        const sample = generateSampleData();
        setHabits(sample.habits);
        setEntries(sample.entries);
      }
    } catch {
      const sample = generateSampleData();
      setHabits(sample.habits);
      setEntries(sample.entries);
    }
    setLoaded(true);
    setLastSync(new Date());
    if (showSpinner) setSyncing(false);
  }, []);

  useEffect(() => { loadFromStorage(); }, []);

  // Auto-save on every change
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      try { await window.storage.set("habitus-data", JSON.stringify({ habits, entries })); } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [habits, entries, loaded]);

  const saveHabit = useCallback((form) => {
    if (editHabit) {
      setHabits(hs => hs.map(h => h.id === editHabit.id ? {...form, id:h.id, createdAt:h.createdAt} : h));
    } else {
      setHabits(hs => [...hs, {...form, id:uuid(), createdAt:todayStr()}]);
    }
    setModal(null); setEditHabit(null);
  }, [editHabit]);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const deleteHabit = useCallback((id) => {
    setConfirmDelete(id);
  }, []);

  const confirmDeleteHabit = useCallback((id) => {
    setHabits(hs => hs.filter(h => h.id !== id));
    setEntries(es => es.filter(e => e.habitId !== id));
    setConfirmDelete(null);
  }, []);

  const getEntry = useCallback((habitId, date) =>
    entries.find(e => e.habitId === habitId && e.date === date), [entries]);

  const toggleEntry = useCallback((habit, date) => {
    const existing = entries.find(e => e.habitId === habit.id && e.date === date);
    if (existing) {
      if (existing.completed) {
        setEntries(es => es.filter(e => !(e.habitId === habit.id && e.date === date)));
      } else {
        setEntries(es => es.map(e =>
          e.habitId === habit.id && e.date === date
            ? {...e, value: habit.goalValue, completed: true} : e
        ));
      }
    } else {
      setEntries(es => [...es, {id:uuid(), habitId:habit.id, date, value:habit.goalValue, completed:true}]);
    }
  }, [entries]);

  const setEntryValue = useCallback((habit, date, value) => {
    const num = parseFloat(value) || 0;
    const completed = num >= habit.goalValue;
    setEntries(es => {
      const existing = es.find(e => e.habitId === habit.id && e.date === date);
      if (existing) return es.map(e => e.habitId === habit.id && e.date === date ? {...e, value:num, completed} : e);
      return [...es, {id:uuid(), habitId:habit.id, date, value:num, completed}];
    });
  }, []);

  const todayHabits = useMemo(() => {
    const dow = new Date(selectedDate + "T12:00:00").getDay();
    return habits.filter(h => h.isActive && h.frequency[dow]);
  }, [habits, selectedDate]);

  const todayCompleted = useMemo(() =>
    todayHabits.filter(h => getEntry(h.id, selectedDate)?.completed).length,
    [todayHabits, getEntry, selectedDate]
  );

  const totalStreak = useMemo(() =>
    habits.reduce((sum, h) => sum + calcStreak(h.id, entries, habits).current, 0),
    [habits, entries]
  );

  // ── RENDER ───────────────────────────────────────────────────────────────────
  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:CREAM}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>🌿</div>
        <div style={{color:FOREST,fontFamily:"'Playfair Display',serif",fontSize:20}}>Habitus</div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh", background:CREAM, fontFamily:"'DM Sans',system-ui,sans-serif",
      maxWidth:480, margin:"0 auto", position:"relative", paddingBottom:80
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        input, select, button { font-family: 'DM Sans',system-ui,sans-serif; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${WARM}; border-radius:4px; }
        .habit-card:active { transform:scale(0.98); }
        .check-btn:active { animation: pop 0.2s ease; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background:`linear-gradient(135deg, ${FOREST_DARK} 0%, ${FOREST} 100%)`,
        padding:"28px 20px 20px", color:"#fff",
        boxShadow:"0 4px 20px rgba(10,40,20,0.25)"
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2}}>
              {new Date().toLocaleDateString("pt-BR",{weekday:"long"})}
            </div>
            <h1 style={{fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, margin:0, letterSpacing:"-0.02em"}}>
              Habitus 🌿
            </h1>
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <button onClick={() => { loadFromStorage(true); setShowSyncLog(true); }} title="Sincronizar" style={{
              background:"rgba(255,255,255,0.15)", border:"none", borderRadius:12,
              padding:"8px 10px", color:"#fff", fontSize:16, cursor:"pointer",
              backdropFilter:"blur(8px)", opacity: syncing ? 0.6 : 1,
              transition:"all 0.2s", display:"flex", alignItems:"center", gap:4
            }}>
              <span style={{display:"inline-block", animation: syncing ? "spin 1s linear infinite" : "none"}}>⟳</span>
              {lastSync && <span style={{fontSize:10, opacity:0.75}}>{lastSync.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
            </button>
            <button onClick={() => {setEditHabit(null); setModal("form");}} style={{
              background:"rgba(255,255,255,0.15)", border:"none", borderRadius:12,
              padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
              backdropFilter:"blur(8px)"
            }}>+ Novo</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:18}}>
          {[
            { label:"Hoje", value:`${todayCompleted}/${todayHabits.length}`, icon:"✅" },
            { label:"Streaks", value:totalStreak, icon:"🔥" },
            { label:"Hábitos", value:habits.filter(h=>h.isActive).length, icon:"🌿" },
          ].map(k => (
            <div key={k.label} style={{
              background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 12px",
              backdropFilter:"blur(8px)"
            }}>
              <div style={{fontSize:16}}>{k.icon}</div>
              <div style={{fontSize:18, fontWeight:700, lineHeight:1.2}}>{k.value}</div>
              <div style={{fontSize:10, opacity:0.7, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em"}}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SYNC LOG (debug) ── */}
      {showSyncLog && (
        <div style={{background:"#0F1F15", padding:"10px 16px", fontSize:11, fontFamily:"monospace", color:"#7FD9A8"}}>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
            <span style={{fontWeight:700, color:"#fff"}}>🔍 Diagnóstico de Sync</span>
            <button onClick={()=>setShowSyncLog(false)} style={{background:"none",border:"none",color:"#7FD9A8",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          {syncLog.length === 0 && <div style={{opacity:0.6}}>Nenhum evento ainda...</div>}
          {syncLog.map((l,i) => <div key={i} style={{opacity:1-i*0.15, marginBottom:2}}>{l}</div>)}
        </div>
      )}

      {/* ── NAV ── */}
      <div style={{
        display:"flex", background:"#fff", borderBottom:`2px solid ${WARM}`,
        position:"sticky", top:0, zIndex:10, boxShadow:"0 2px 8px rgba(10,40,20,0.06)"
      }}>
        {[
          {id:"today",label:"Hoje",icon:"📅"},
          {id:"habits",label:"Hábitos",icon:"🌿"},
          {id:"reports",label:"Relatórios",icon:"📈"},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:"12px 4px", border:"none", background:"transparent",
            color: tab===t.id ? FOREST : BARK, fontWeight: tab===t.id ? 700 : 500,
            fontSize:12, cursor:"pointer", borderBottom: tab===t.id ? `3px solid ${FOREST}` : "3px solid transparent",
            transition:"all 0.15s", display:"flex", flexDirection:"column", alignItems:"center", gap:2
          }}>
            <span style={{fontSize:16}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{padding:"16px 16px 0", animation:"fadeIn 0.25s ease"}}>

        {/* TODAY TAB */}
        {tab === "today" && <TodayTab
          habits={todayHabits} allHabits={habits} entries={entries}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          getEntry={getEntry} toggleEntry={toggleEntry} setEntryValue={setEntryValue}
          entryInput={entryInput} setEntryInput={setEntryInput}
          calcStreak={calcStreak}
        />}

        {/* HABITS TAB */}
        {tab === "habits" && <HabitsTab
          habits={habits} entries={entries} calcStreak={calcStreak}
          onEdit={(h) => { setEditHabit(h); setModal("form"); }}
          onDelete={deleteHabit}
          confirmDelete={confirmDelete}
          onConfirmDelete={confirmDeleteHabit}
          onCancelDelete={() => setConfirmDelete(null)}
          onToggleActive={(id) => setHabits(hs => hs.map(h => h.id===id ? {...h,isActive:!h.isActive} : h))}
        />}

        {/* REPORTS TAB */}
        {tab === "reports" && <ReportsTab
          habits={habits} entries={entries} reportTab={reportTab} setReportTab={setReportTab}
        />}
      </div>

      {/* ── MODAL ── */}
      <Modal open={modal === "form"} onClose={() => {setModal(null); setEditHabit(null);}}>
        <HabitForm habit={editHabit} onSave={saveHabit} onCancel={() => {setModal(null); setEditHabit(null);}} />
      </Modal>
    </div>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ habits, allHabits, entries, selectedDate, setSelectedDate, getEntry, toggleEntry, setEntryValue, entryInput, setEntryInput, calcStreak }) {
  const today = todayStr();
  const dates = Array.from({length:7}, (_,i) => dateStr(addDays(new Date(), -6+i)));

  return (
    <div>
      {/* Date strip */}
      <div style={{display:"flex", gap:6, marginBottom:20, overflowX:"auto", paddingBottom:4}}>
        {dates.map(d => {
          const wd = new Date(d+"T12:00:00");
          const dow = wd.getDay();
          const dayHabits = allHabits.filter(h => h.isActive && h.frequency[dow]);
          const done = dayHabits.filter(h => getEntry(h.id, d)?.completed).length;
          const isToday = d === today;
          const isSel = d === selectedDate;
          return (
            <button key={d} onClick={() => setSelectedDate(d)} style={{
              flex:"0 0 auto", width:52, padding:"10px 4px", borderRadius:14,
              border:`2px solid ${isSel ? FOREST : "transparent"}`,
              background: isSel ? FOREST : isToday ? `${FOREST}15` : "transparent",
              color: isSel ? "#fff" : SLATE, cursor:"pointer", textAlign:"center",
              transition:"all 0.15s"
            }}>
              <div style={{fontSize:10, fontWeight:700, opacity: isSel ? 0.8 : 0.6, textTransform:"uppercase", letterSpacing:"0.05em"}}>
                {DAYS_PT[dow]}
              </div>
              <div style={{fontSize:20, fontWeight:700, lineHeight:1.3}}>
                {wd.getDate()}
              </div>
              {dayHabits.length > 0 && (
                <div style={{
                  width:done===dayHabits.length ? 8 : 6, height:done===dayHabits.length ? 8 : 6,
                  borderRadius:"50%", background: done===dayHabits.length ? (isSel?"#fff":GOLD) : (isSel?"rgba(255,255,255,0.4)":WARM),
                  margin:"3px auto 0", transition:"all 0.2s"
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div style={{...cardStyle, marginBottom:16, padding:"14px 16px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <span style={{fontSize:13, fontWeight:600, color:BARK}}>Progresso do dia</span>
            <span style={{fontSize:13, fontWeight:700, color:FOREST}}>
              {habits.filter(h=>getEntry(h.id,selectedDate)?.completed).length}/{habits.length}
            </span>
          </div>
          <div style={{height:8, background:WARM, borderRadius:4, overflow:"hidden"}}>
            <div style={{
              height:"100%", borderRadius:4, background:`linear-gradient(90deg,${FOREST_LIGHT},${FOREST})`,
              width:`${habits.length ? (habits.filter(h=>getEntry(h.id,selectedDate)?.completed).length/habits.length*100) : 0}%`,
              transition:"width 0.5s ease"
            }} />
          </div>
        </div>
      )}

      {/* Habit cards */}
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {habits.length === 0 ? (
          <div style={{...cardStyle, textAlign:"center", padding:32, color:BARK}}>
            <div style={{fontSize:40, marginBottom:8}}>🌱</div>
            <div style={{fontSize:15, fontWeight:600}}>Nenhum hábito para hoje</div>
            <div style={{fontSize:13, opacity:0.7, marginTop:4}}>Toque em "+ Novo" para começar</div>
          </div>
        ) : habits.map(h => {
          const entry = getEntry(h.id, selectedDate);
          const streak = calcStreak(h.id, entries, allHabits);
          const pct = entry ? Math.min((entry.value / h.goalValue) * 100, 100) : 0;
          const key = `${h.id}-${selectedDate}`;
          return (
            <div key={h.id} className="habit-card" style={{
              ...cardStyle, display:"flex", alignItems:"center", gap:12,
              borderLeft:`4px solid ${h.color}`,
              background: entry?.completed ? `${h.color}08` : "#fff",
              transition:"all 0.2s"
            }}>
              <div style={{fontSize:28, flexShrink:0}}>{h.emoji}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:700, fontSize:15, color:SLATE, marginBottom:2}}>{h.name}</div>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <div style={{flex:1, height:5, background:WARM, borderRadius:3, overflow:"hidden"}}>
                    <div style={{
                      height:"100%", background:h.color, borderRadius:3,
                      width:`${pct}%`, transition:"width 0.4s ease"
                    }} />
                  </div>
                  <span style={{fontSize:11, color:BARK, fontWeight:600, flexShrink:0}}>
                    {entry ? entry.value : 0}/{h.goalValue} {h.goalUnit}
                  </span>
                </div>
                {streak.current > 0 && (
                  <div style={{fontSize:11, color:GOLD, fontWeight:700, marginTop:3}}>
                    🔥 {streak.current} dias
                  </div>
                )}
              </div>
              <div style={{display:"flex", flexDirection:"column", gap:4, flexShrink:0}}>
                {h.goalType !== "check" && (
                  <input
                    type="number"
                    value={entryInput[key] !== undefined ? entryInput[key] : (entry?.value || "")}
                    onChange={e => setEntryInput(i => ({...i, [key]: e.target.value}))}
                    onBlur={e => {
                      if (e.target.value) setEntryValue(h, selectedDate, e.target.value);
                    }}
                    placeholder={h.goalValue}
                    style={{
                      width:60, padding:"6px 8px", borderRadius:8, border:`1.5px solid ${WARM}`,
                      fontSize:12, textAlign:"center", background:"#fff", color:SLATE, outline:"none"
                    }}
                  />
                )}
                <button className="check-btn" onClick={() => toggleEntry(h, selectedDate)} style={{
                  width:42, height:42, borderRadius:12, border:"none", cursor:"pointer",
                  background: entry?.completed ? h.color : WARM,
                  color: entry?.completed ? "#fff" : BARK,
                  fontSize:20, display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.2s", boxShadow: entry?.completed ? `0 4px 12px ${h.color}55` : "none"
                }}>
                  {entry?.completed ? "✓" : "○"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HABITS TAB ───────────────────────────────────────────────────────────────
function HabitsTab({ habits, entries, calcStreak, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete, onToggleActive }) {
  const [filter, setFilter] = useState("Todos");
  const cats = ["Todos", ...CATEGORIES.filter(c => habits.some(h=>h.category===c))];
  const filtered = filter === "Todos" ? habits : habits.filter(h=>h.category===filter);

  return (
    <div>
      <div style={{display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4}}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            flexShrink:0, padding:"7px 14px", borderRadius:20, border:"none",
            background: filter===c ? FOREST : WARM, color: filter===c ? "#fff" : BARK,
            fontWeight:600, fontSize:12, cursor:"pointer", transition:"all 0.15s"
          }}>{c}</button>
        ))}
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {filtered.map(h => {
          const streak = calcStreak(h.id, entries, habits);
          const last7 = Array.from({length:7},(_,i)=>dateStr(addDays(new Date(),-6+i)));
          const done7 = last7.filter(d => {
            const dow = new Date(d+"T12:00:00").getDay();
            return h.frequency[dow] && entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed);
          }).length;
          const expected7 = last7.filter(d => h.frequency[new Date(d+"T12:00:00").getDay()]).length;
          return (
            <div key={h.id} style={{...cardStyle, borderLeft:`4px solid ${h.color}`, opacity: h.isActive ? 1 : 0.5}}>
              <div style={{display:"flex", alignItems:"center", gap:12}}>
                <div style={{fontSize:28}}>{h.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, fontSize:15, color:SLATE}}>{h.name}</div>
                  <div style={{display:"flex", gap:8, marginTop:3, flexWrap:"wrap"}}>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10,
                      background:`${CAT_COLORS[h.category] || FOREST}20`,
                      color: CAT_COLORS[h.category] || FOREST
                    }}>{h.category}</span>
                    <span style={{fontSize:11, color:BARK}}>
                      Meta: {h.goalValue} {h.goalUnit}
                    </span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14, fontWeight:700, color:GOLD}}>🔥 {streak.current}</div>
                  <div style={{fontSize:10, color:BARK}}>melhor: {streak.best}</div>
                </div>
              </div>

              {/* Mini heatmap last 7 days */}
              <div style={{display:"flex", gap:3, marginTop:12, alignItems:"center"}}>
                <span style={{fontSize:10, color:BARK, marginRight:4, fontWeight:600}}>7 dias:</span>
                {last7.map(d => {
                  const dow = new Date(d+"T12:00:00").getDay();
                  const inFreq = h.frequency[dow];
                  const e = entries.find(e=>e.habitId===h.id&&e.date===d);
                  return (
                    <div key={d} style={{
                      width:24, height:24, borderRadius:5,
                      background: !inFreq ? "#F0EAE0" : e?.completed ? h.color : e ? `${h.color}50` : WARM,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:9, color: e?.completed ? "#fff" : BARK,
                      fontWeight:700, transition:"background 0.2s"
                    }}>
                      {new Date(d+"T12:00:00").getDate()}
                    </div>
                  );
                })}
                <span style={{fontSize:11, color:FOREST, fontWeight:700, marginLeft:4}}>
                  {expected7 > 0 ? Math.round(done7/expected7*100) : 0}%
                </span>
              </div>

              <div style={{display:"flex", gap:8, marginTop:12}}>
                <button onClick={() => onToggleActive(h.id)} style={{
                  ...btnStyle, flex:1, padding:"8px", fontSize:12,
                  background: h.isActive ? WARM : FOREST, color: h.isActive ? BARK : "#fff",
                  boxShadow:"none"
                }}>
                  {h.isActive ? "Pausar" : "Ativar"}
                </button>
                <button onClick={() => onEdit(h)} style={{...btnStyle, flex:1, padding:"8px", fontSize:12, background:FOREST}}>
                  Editar
                </button>
                {confirmDelete === h.id ? (
                  <>
                    <button onClick={() => onConfirmDelete(h.id)} style={{...btnStyle, padding:"8px 12px", fontSize:12, background:"#E63946", boxShadow:"none"}}>
                      Confirmar
                    </button>
                    <button onClick={onCancelDelete} style={{...btnStyle, padding:"8px 12px", fontSize:12, background:WARM, color:BARK, boxShadow:"none"}}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button onClick={() => onDelete(h.id)} style={{...btnStyle, padding:"8px 14px", fontSize:12, background:"#E6394620", color:"#E63946", boxShadow:"none"}}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{textAlign:"center", padding:40, color:BARK}}>
            <div style={{fontSize:36}}>🌱</div>
            <div style={{marginTop:8, fontWeight:600}}>Nenhum hábito nesta categoria</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab({ habits, entries, reportTab, setReportTab }) {
  return (
    <div>
      <div style={{display:"flex", gap:8, marginBottom:20}}>
        {[{id:"weekly",label:"Semanal"},{id:"monthly",label:"Mensal"},{id:"annual",label:"Anual"}].map(t => (
          <button key={t.id} onClick={() => setReportTab(t.id)} style={{
            flex:1, padding:"10px", borderRadius:12, border:"none",
            background: reportTab===t.id ? FOREST : WARM,
            color: reportTab===t.id ? "#fff" : BARK,
            fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.15s"
          }}>{t.label}</button>
        ))}
      </div>

      {reportTab === "weekly" && <WeeklyReport habits={habits} entries={entries} />}
      {reportTab === "monthly" && <MonthlyReport habits={habits} entries={entries} />}
      {reportTab === "annual" && <AnnualReport habits={habits} entries={entries} />}
    </div>
  );
}

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────
function WeeklyReport({ habits, entries }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const start = startOfWeek(addDays(new Date(), weekOffset * 7));
  const days = Array.from({length:7}, (_,i) => addDays(start, i));
  const dayStrs = days.map(dateStr);

  const barData = habits.filter(h=>h.isActive).map(h => {
    let done = 0, total = 0;
    dayStrs.forEach(d => {
      const dow = new Date(d+"T12:00:00").getDay();
      if (!h.frequency[dow]) return;
      total++;
      if (entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)) done++;
    });
    return { name: h.emoji + " " + h.name.split(" ")[0], done, total, pct: total>0?Math.round(done/total*100):0, color:h.color };
  });

  const lineData = dayStrs.map((d,i) => {
    const dow = days[i].getDay();
    const dayHabits = habits.filter(h=>h.isActive&&h.frequency[dow]);
    const done = dayHabits.filter(h=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length;
    return { name: DAYS_PT[dow], done, total: dayHabits.length, pct: dayHabits.length>0?Math.round(done/dayHabits.length*100):0 };
  });

  const weekLabel = `${days[0].getDate()}/${days[0].getMonth()+1} – ${days[6].getDate()}/${days[6].getMonth()+1}`;

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{...btnStyle, padding:"8px 16px", background:WARM, color:BARK, boxShadow:"none"}}>‹</button>
        <div style={{fontWeight:700, color:SLATE, fontSize:14}}>{weekLabel}</div>
        <button onClick={()=>setWeekOffset(w=>Math.min(0,w+1))} style={{...btnStyle, padding:"8px 16px", background:WARM, color:BARK, boxShadow:"none"}}>›</button>
      </div>

      <div style={{...cardStyle, marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:16, margin:"0 0 14px"}}>Conclusão por Hábito</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} layout="vertical" margin={{left:0,right:16,top:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={WARM} />
            <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:10,fill:BARK}} />
            <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:SLATE}} width={80} />
            <Tooltip formatter={(v)=>[`${v}%`,"Conclusão"]} contentStyle={{borderRadius:10,border:`1px solid ${WARM}`,fontSize:12}} />
            <Bar dataKey="pct" radius={[0,4,4,0]}>
              {barData.map((d,i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{...cardStyle}}>
        <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:16, margin:"0 0 14px"}}>Progresso Diário</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={lineData} margin={{left:-10,right:10,top:5,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={WARM} />
            <XAxis dataKey="name" tick={{fontSize:11,fill:BARK}} />
            <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:10,fill:BARK}} domain={[0,100]} />
            <Tooltip formatter={(v)=>[`${v}%`,"% Concluído"]} contentStyle={{borderRadius:10,border:`1px solid ${WARM}`,fontSize:12}} />
            <Line type="monotone" dataKey="pct" stroke={FOREST} strokeWidth={2.5} dot={{fill:FOREST,r:4}} activeDot={{r:6}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────
function MonthlyReport({ habits, entries }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const year = now.getFullYear();
  const month = new Date(year, now.getMonth() + monthOffset, 1).getMonth();
  const displayYear = new Date(year, now.getMonth() + monthOffset, 1).getFullYear();
  const daysInMonth = new Date(displayYear, month+1, 0).getDate();
  const days = Array.from({length:daysInMonth}, (_,i) => {
    const d = new Date(displayYear, month, i+1);
    return dateStr(d);
  });

  // Heatmap: intensity per day
  const intensity = days.map(d => {
    const dow = new Date(d+"T12:00:00").getDay();
    const dayH = habits.filter(h=>h.isActive&&h.frequency[dow]);
    const done = dayH.filter(h=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length;
    const total = dayH.length;
    if (total === 0) return 0;
    const pct = done/total;
    if (pct === 0) return 0;
    if (pct < 0.33) return 1;
    if (pct < 0.66) return 2;
    if (pct < 1) return 3;
    return 4;
  });

  // Category pie
  const catData = CATEGORIES.map(c => {
    const catHabits = habits.filter(h=>h.category===c&&h.isActive);
    const done = catHabits.reduce((s,h) => s + days.filter(d=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length, 0);
    return { name:c, value:done, color:CAT_COLORS[c] };
  }).filter(c=>c.value>0);

  // Weekly trend
  const weekTrend = [];
  for (let w=0; w<5; w++) {
    const wDays = days.slice(w*7, (w+1)*7);
    if (!wDays.length) continue;
    let done=0, total=0;
    wDays.forEach(d => {
      const dow = new Date(d+"T12:00:00").getDay();
      const dh = habits.filter(h=>h.isActive&&h.frequency[dow]);
      total += dh.length;
      done += dh.filter(h=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length;
    });
    weekTrend.push({name:`S${w+1}`, pct:total>0?Math.round(done/total*100):0});
  }

  const firstDow = new Date(displayYear, month, 1).getDay();

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
        <button onClick={()=>setMonthOffset(m=>m-1)} style={{...btnStyle, padding:"8px 16px", background:WARM, color:BARK, boxShadow:"none"}}>‹</button>
        <div style={{fontWeight:700, color:SLATE, fontSize:15}}>{MONTHS_PT[month]} {displayYear}</div>
        <button onClick={()=>setMonthOffset(m=>Math.min(0,m+1))} style={{...btnStyle, padding:"8px 16px", background:WARM, color:BARK, boxShadow:"none"}}>›</button>
      </div>

      {/* Calendar heatmap */}
      <div style={{...cardStyle, marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:16, margin:"0 0 12px"}}>Calendário de Consistência</h3>
        <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4}}>
          {DAYS_PT.map(d => <div key={d} style={{textAlign:"center", fontSize:9, fontWeight:700, color:BARK, textTransform:"uppercase", padding:"2px 0"}}>{d[0]}</div>)}
          {Array.from({length:firstDow}).map((_,i) => <div key={"e"+i} />)}
          {days.map((d,i) => (
            <div key={d} title={d} style={{
              aspectRatio:"1", borderRadius:6, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:10, fontWeight:700,
              background: ["#F0EAE0","#C8E6D5","#8DC9AA","#4DA57A","#1A6B4A"][intensity[i]],
              color: intensity[i] >= 3 ? "#fff" : BARK,
              transition:"background 0.2s"
            }}>
              {new Date(d+"T12:00:00").getDate()}
            </div>
          ))}
        </div>
        <div style={{display:"flex", gap:4, marginTop:10, alignItems:"center", justifyContent:"flex-end"}}>
          <span style={{fontSize:10, color:BARK}}>Menos</span>
          {["#F0EAE0","#C8E6D5","#8DC9AA","#4DA57A","#1A6B4A"].map((c,i) =>
            <div key={i} style={{width:12, height:12, borderRadius:3, background:c}} />
          )}
          <span style={{fontSize:10, color:BARK}}>Mais</span>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14}}>
        <div style={cardStyle}>
          <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:14, margin:"0 0 10px"}}>Por Categoria</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}>
                {catData.map((d,i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v,n)=>[v+" dias",n]} contentStyle={{borderRadius:8,fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:14, margin:"0 0 10px"}}>Por Semana</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={weekTrend} margin={{left:-20,right:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={WARM} />
              <XAxis dataKey="name" tick={{fontSize:11}} />
              <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:9}} domain={[0,100]} />
              <Tooltip formatter={v=>[`${v}%`]} contentStyle={{borderRadius:8,fontSize:11}} />
              <Bar dataKey="pct" fill={FOREST} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── ANNUAL REPORT ────────────────────────────────────────────────────────────
function AnnualReport({ habits, entries }) {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const today = new Date();
  const totalDays = Math.floor((today - startDate) / 86400000) + 1;
  const allDays = Array.from({length:totalDays}, (_,i) => dateStr(addDays(startDate, i)));

  // Intensity per day
  const dayIntensity = allDays.map(d => {
    const dow = new Date(d+"T12:00:00").getDay();
    const dh = habits.filter(h=>h.isActive&&h.frequency[dow]);
    if (!dh.length) return 0;
    const done = dh.filter(h=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length;
    const pct = done/dh.length;
    if (pct === 0) return 0;
    if (pct < 0.25) return 1;
    if (pct < 0.5) return 2;
    if (pct < 0.75) return 3;
    if (pct < 1) return 4;
    return 5;
  });

  // Group by week for grid display
  const firstDow = startDate.getDay();
  const weeks = [];
  let week = Array(firstDow).fill(null);
  allDays.forEach((d, i) => {
    week.push({ date:d, intensity:dayIntensity[i] });
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length) { while(week.length < 7) week.push(null); weeks.push(week); }

  // Monthly bars
  const monthData = MONTHS_PT.map((m,mi) => {
    const mDays = allDays.filter(d => new Date(d+"T12:00:00").getMonth() === mi);
    if (!mDays.length) return { name:m, pct:0 };
    let done=0, total=0;
    mDays.forEach(d => {
      const dow = new Date(d+"T12:00:00").getDay();
      const dh = habits.filter(h=>h.isActive&&h.frequency[dow]);
      total += dh.length;
      done += dh.filter(h=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length;
    });
    return { name:m, pct:total>0?Math.round(done/total*100):0 };
  });

  // Top habits
  const topHabits = habits.filter(h=>h.isActive).map(h => {
    const done = allDays.filter(d=>entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)).length;
    const streak = (() => {
      let best=0, cur=0;
      allDays.forEach(d=>{
        const dow = new Date(d+"T12:00:00").getDay();
        if(!h.frequency[dow]) return;
        if(entries.find(e=>e.habitId===h.id&&e.date===d&&e.completed)){cur++;best=Math.max(best,cur);}
        else cur=0;
      });
      return best;
    })();
    return {...h, done, bestStreak:streak};
  }).sort((a,b)=>b.done-a.done).slice(0,3);

  return (
    <div>
      <div style={{...cardStyle, marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:16, margin:"0 0 12px"}}>
          Heatmap {year}
        </h3>
        {/* Month labels */}
        <div style={{display:"flex", overflowX:"auto", paddingBottom:4}}>
          <div style={{display:"flex", flexDirection:"column", gap:1, marginRight:4}}>
            {["D","S","T","Q","Q","S","S"].map((d,i)=>(
              <div key={i} style={{height:11, fontSize:7, color:BARK, lineHeight:"11px", fontWeight:700}}>{d}</div>
            ))}
          </div>
          {weeks.map((week,wi) => (
            <div key={wi} style={{display:"flex", flexDirection:"column", gap:1, marginRight:1}}>
              {week.map((day,di) => day ? (
                <HeatmapCell key={di} date={day.date} intensity={day.intensity} size={11} />
              ) : <div key={di} style={{width:11,height:11}} />)}
            </div>
          ))}
        </div>
        <div style={{display:"flex", gap:4, marginTop:8, alignItems:"center", justifyContent:"flex-end"}}>
          <span style={{fontSize:9, color:BARK}}>Menos</span>
          {["#E8DDD0","#A8D5BC","#5AAD85","#2A8A62","#1A6B4A","#0F4030"].map((c,i)=>
            <div key={i} style={{width:10, height:10, borderRadius:2, background:c}} />
          )}
          <span style={{fontSize:9, color:BARK}}>Mais</span>
        </div>
      </div>

      <div style={{...cardStyle, marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:16, margin:"0 0 12px"}}>Evolução Mensal</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthData} margin={{left:-10,right:4}}>
            <CartesianGrid strokeDasharray="3 3" stroke={WARM} />
            <XAxis dataKey="name" tick={{fontSize:9}} />
            <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:9}} domain={[0,100]} />
            <Tooltip formatter={v=>[`${v}%`,"% Conclusão"]} contentStyle={{borderRadius:8,fontSize:11}} />
            <Bar dataKey="pct" fill={FOREST} radius={[3,3,0,0]}>
              {monthData.map((d,i) => <Cell key={i} fill={d.pct>=80?GOLD:d.pct>=50?FOREST:FOREST_LIGHT} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <h3 style={{fontFamily:"'Playfair Display',serif", color:FOREST_DARK, fontSize:16, margin:"0 0 14px"}}>🏆 Top Hábitos do Ano</h3>
        {topHabits.map((h,i) => (
          <div key={h.id} style={{
            display:"flex", alignItems:"center", gap:12, padding:"10px 0",
            borderBottom: i<topHabits.length-1 ? `1px solid ${WARM}` : "none"
          }}>
            <div style={{
              width:28, height:28, borderRadius:8, background:GOLD, color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:14
            }}>#{i+1}</div>
            <div style={{fontSize:24}}>{h.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, color:SLATE, fontSize:14}}>{h.name}</div>
              <div style={{fontSize:11, color:BARK}}>{h.done} dias completados · 🔥 {h.bestStreak} melhor streak</div>
            </div>
          </div>
        ))}
        {topHabits.length === 0 && (
          <div style={{textAlign:"center", color:BARK, padding:16}}>Nenhum dado ainda</div>
        )}
      </div>
    </div>
  );
}

