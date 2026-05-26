import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import "../styles/app.css";

// ─────────────────────────────────────────────────────────────────────────
// PERÍODOS PADRÃO — usados como fallback enquanto a API não retorna
// (evita tabela em branco; serão substituídos pelos dados reais da API)
// ─────────────────────────────────────────────────────────────────────────
const DEFAULT_PERIODS = [
  { periodId: 1,  periodName: "1º",  startTime: "07:30", endTime: "08:20" },
  { periodId: 2,  periodName: "2º",  startTime: "08:20", endTime: "09:10" },
  { periodId: 3,  periodName: "3º",  startTime: "09:10", endTime: "10:00" },
  { periodId: 4,  periodName: "4º",  startTime: "10:10", endTime: "11:00" },
  { periodId: 5,  periodName: "5º",  startTime: "11:00", endTime: "11:50" },
  { periodId: 6,  periodName: "6º",  startTime: "13:00", endTime: "13:50" },
  { periodId: 7,  periodName: "7º",  startTime: "13:50", endTime: "14:40" },
  { periodId: 8,  periodName: "8º",  startTime: "14:50", endTime: "15:40" },
  { periodId: 9,  periodName: "9º",  startTime: "15:40", endTime: "16:30" },
  { periodId: 10, periodName: "10º", startTime: "16:40", endTime: "17:30" },
  { periodId: 11, periodName: "11º", startTime: "19:20", endTime: "20:10" },
  { periodId: 12, periodName: "12º", startTime: "20:10", endTime: "21:00" },
  { periodId: 13, periodName: "13º", startTime: "21:10", endTime: "22:00" },
  { periodId: 14, periodName: "14º", startTime: "22:00", endTime: "22:50" },
];

// ─────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────
function getISOFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function periodGroup(startTime) {
  if (!startTime) return "Outro";
  const h = parseInt(startTime.split(":")[0], 10);
  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
}

// ─────────────────────────────────────────────────────────────────────────
// MINI CALENDÁRIO
// ─────────────────────────────────────────────────────────────────────────
function MiniCalendar({ onSelect, onClose }) {
  const today = new Date();
  const [cur, setCur] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = cur.getFullYear();
  const month = cur.getMonth();
  const monthName = cur.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  return (
    <div className="gr-minical">
      <div className="gr-minical__nav">
        <button onClick={() => setCur(new Date(year, month - 1, 1))}>‹</button>
        <span>{monthName}</span>
        <button onClick={() => setCur(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div className="gr-minical__grid">
        {["D","S","T","Q","Q","S","S"].map((d, i) => (
          <span key={i} className="gr-minical__wd">{d}</span>
        ))}
        {cells.map((day, i) => (
          <button
            key={i}
            className={[
              "gr-minical__day",
              !day ? "gr-minical__day--empty" : "",
              day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                ? "gr-minical__day--today" : "",
            ].join(" ")}
            disabled={!day}
            onClick={() => { if (day) { onSelect(new Date(year, month, day)); onClose(); } }}
          >
            {day || ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────────────────
function Tooltip({ res, roomName, x, y }) {
  if (!res) return null;
  const isHoliday = res.status === "HOLIDAY";
  const occ = res.occupant;
  const type = occ?.type === "RECURRING" ? "recurring" : "simple";
  return (
    <div
      className={`gr-tip gr-tip--${isHoliday ? "holiday" : type}`}
      style={{ left: x + 14, top: y - 8 }}
    >
      <strong>{roomName}</strong>
      {isHoliday && <span className="gr-tip__badge gr-tip__badge--holiday">🎉 Feriado</span>}
      {occ && (
        <>
          <span className={`gr-tip__badge gr-tip__badge--${type}`}>
            {occ.type === "RECURRING" ? "Recorrente" : "Avulsa"}
          </span>
          <span className="gr-tip__turma">{occ.userOrClass}</span>
          {occ.subject && <span className="gr-tip__hora" style={{ fontStyle: "italic" }}>{occ.subject}</span>}
        </>
      )}
      <span className="gr-tip__hora">{res.startTime?.slice(0,5)} – {res.endTime?.slice(0,5)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MODAL DE NOVA RESERVA
// ─────────────────────────────────────────────────────────────────────────
function BookingModal({ rooms, periods, date, onClose, onSuccess }) {
  const [roomId, setRoomId] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [motivo, setMotivo] = useState("");
  const [curso, setCurso] = useState("");
  const [naoSeAplica, setNaoSeAplica] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function togglePeriod(id) {
    setSelectedPeriods(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!roomId || selectedPeriods.length === 0 || !motivo) {
      setError("Preencha sala, períodos e motivo.");
      return;
    }
    const token = localStorage.getItem("token");
    const notes = naoSeAplica ? "Não se aplica" : `Curso: ${curso || "-"}`;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: Number(roomId),
          periodIds: selectedPeriods.map(Number),
          bookingDate: getISOFromDate(date),
          subject: motivo,
          notes,
        }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t || "Erro ao reservar."); }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-espacos" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Nova Reserva — {date.toLocaleDateString("pt-BR")}</h2>
          <button className="btn-close-modal" onClick={onClose}>×</button>
        </div>
        {error && <div style={{ color: "#b91c1c", marginBottom: "0.75rem", fontSize: "0.9rem" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="form-group-reserva">
            <label>Sala *</label>
            <select value={roomId} onChange={e => setRoomId(e.target.value)} required>
              <option value="">Selecione</option>
              {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomName}</option>)}
            </select>
          </div>
          <div className="form-group-reserva">
            <label>Períodos *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {periods.map(p => (
                <label key={p.periodId} style={{
                  border: selectedPeriods.includes(p.periodId) ? "2px solid #dc2626" : "1px solid #d1d5db",
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                  background: selectedPeriods.includes(p.periodId) ? "#fecaca" : "white",
                }}>
                  <input type="checkbox" checked={selectedPeriods.includes(p.periodId)}
                    onChange={() => togglePeriod(p.periodId)} style={{ display: "none" }} />
                  {p.periodName} <span style={{ fontSize: "0.75rem", color: "#666" }}>{p.startTime?.slice(0,5)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group-reserva">
            <label>Motivo *</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo" required />
          </div>
          <div className="form-group-reserva">
            <label>Curso</label>
            <select value={curso} onChange={e => setCurso(e.target.value)}
              required={!naoSeAplica} disabled={naoSeAplica}
              style={{ backgroundColor: naoSeAplica ? "#cfcccc89" : "white" }}>
              <option value="">Selecione</option>
              <option value="dsm">Desenvolvimento de Software Multiplataforma</option>
              <option value="admin">Administração</option>
              <option value="rh">Recursos Humanos</option>
              <option value="ads">Análise e Desenvolvimento de Sistemas</option>
              <option value="comex">Comércio Exterior</option>
            </select>
          </div>
          <div className="form-group-reserva-check">
            <input type="checkbox" id="nsa2" checked={naoSeAplica} onChange={e => {
              setNaoSeAplica(e.target.checked);
              if (e.target.checked) setCurso("");
            }} />
            <label htmlFor="nsa2"> Não se aplica a um curso</label>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn-submit-reserva" disabled={loading}>
              {loading ? "Enviando..." : "Solicitar"}
            </button>
            <button type="button" className="btn-cancelar" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DA GRADE
// Usa <table> real para colspan/rowspan corretos
// visiblePeriods NUNCA está vazio — usa DEFAULT_PERIODS como fallback
// ─────────────────────────────────────────────────────────────────────────
function ScheduleTable({
  rooms,
  visiblePeriods,
  loading,
  error,
  onMouseMove,
  onCellEnter,
  onCellLeave,
}) {
  // Grupos para cabeçalho linha 1
  const groups = [
    { key: "Manhã",  label: "MANHÃ",  cls: "manham" },
    { key: "Tarde",  label: "TARDE",  cls: "tarde"  },
    { key: "Noite",  label: "NOITE",  cls: "noite"  },
  ].map(g => ({
    ...g,
    periods: visiblePeriods.filter(p => periodGroup(p.startTime) === g.key),
  })).filter(g => g.periods.length > 0);

  // Agrupa slots consecutivos da mesma reserva para colspan
  function getGroupedSlots(roomSlots) {
    const slots = visiblePeriods.map(vp => {
      const found = (roomSlots || []).find(s => s.periodId === vp.periodId);
      return found || { periodId: vp.periodId, status: "FREE", occupant: null,
                        startTime: vp.startTime, endTime: vp.endTime };
    });

    const result = [];
    let i = 0;
    while (i < slots.length) {
      const slot = slots[i];
      const occ = slot.occupant;
      if (!occ || slot.status === "FREE" || slot.status === "HOLIDAY") {
        result.push({ slot, span: 1, type: slot.status === "HOLIDAY" ? "holiday" : "free" });
        i++;
      } else {
        let j = i;
        while (
          j + 1 < slots.length &&
          slots[j + 1].occupant?.id !== undefined &&
          slots[j + 1].occupant?.id === occ.id
        ) j++;
        result.push({
          slot: slots[i], span: j - i + 1, type: "reserved",
          occupant: occ, startTime: slots[i].startTime, endTime: slots[j].endTime,
        });
        i = j + 1;
      }
    }
    return result;
  }

  return (
    <div className="gr-table-wrap" onMouseMove={onMouseMove}>
      <table className="gr-table">
        <thead>
          {/* Linha 1 — Manhã / Tarde / Noite */}
          <tr className="gr-thead-group">
            <th className="gr-th-sala" rowSpan={2} />
            {groups.map(g => (
              <th
                key={g.key}
                colSpan={g.periods.length}
                className={`gr-th-group gr-th-group--${g.cls}`}
              >
                {g.label}
              </th>
            ))}
          </tr>
          {/* Linha 2 — Horários individuais */}
          <tr className="gr-thead-slots">
            {visiblePeriods.map(p => (
              <th key={p.periodId} className="gr-th-slot">
                <span className="gr-th-slot__h">{p.startTime?.slice(0, 5)}</span>
                <span className="gr-th-slot__e">{p.endTime?.slice(0, 5)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Estado de carregamento: mostra salas com células skeleton */}
          {loading && (
            <tr>
              <td colSpan={visiblePeriods.length + 1} className="gr-state">
                <div className="gr-loading">
                  <div className="gr-loading__spinner" />
                  Carregando grade...
                </div>
              </td>
            </tr>
          )}

          {/* Erro */}
          {!loading && error && (
            <tr>
              <td colSpan={visiblePeriods.length + 1} className="gr-state gr-state--error">
                {error}
              </td>
            </tr>
          )}

          {/* Sem salas */}
          {!loading && !error && rooms.length === 0 && (
            <tr>
              <td colSpan={visiblePeriods.length + 1} className="gr-state">
                Nenhuma sala encontrada para esta data.
              </td>
            </tr>
          )}

          {/* Linhas de salas */}
          {!loading && !error && rooms.map(room => {
            const grouped = getGroupedSlots(room.slots);
            return (
              <tr key={room.roomId} className="gr-tr">
                <td className="gr-td-sala">
                  <span className="gr-sala__nome">{room.roomName}</span>
                  <span className="gr-sala__loc">
                    {room.roomLocation || (room.capacity ? `${room.capacity} lug.` : "")}
                  </span>
                </td>
                {grouped.map((g, idx) => {
                  if (g.type === "free") {
                    return <td key={idx} colSpan={g.span} className="gr-td gr-td--free" />;
                  }
                  if (g.type === "holiday") {
                    return (
                      <td key={idx} colSpan={g.span} className="gr-td gr-td--free"
                        onMouseEnter={e => onCellEnter(e, { status: "HOLIDAY", startTime: g.slot.startTime, endTime: g.slot.endTime }, room.roomName)}
                        onMouseLeave={onCellLeave}>
                        <div className="gr-block gr-block--holiday"><span className="gr-block__label">🎉</span></div>
                      </td>
                    );
                  }
                  const btype = g.occupant.type === "RECURRING" ? "recurring" : "simple";
                  return (
                    <td key={idx} colSpan={g.span} className={`gr-td gr-td--${btype}`}
                      onMouseEnter={e => onCellEnter(e, {
                        occupant: g.occupant,
                        startTime: g.startTime,
                        endTime: g.endTime,
                        status: "OCCUPIED",
                      }, room.roomName)}
                      onMouseLeave={onCellLeave}>
                      <div className={`gr-block gr-block--${btype}`}>
                        <span className="gr-block__label">{g.occupant.userOrClass}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────
export default function GradeReservas() {
  const navigate = useNavigate();
  const [selDate, setSelDate] = useState(new Date());
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("Todos");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [tip, setTip] = useState({ res: null, roomName: "", x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [showCal, setShowCal] = useState(false);

  const isoDate = getISOFromDate(selDate);

  const fetchSchedule = useCallback(async (date) => {
    const token = localStorage.getItem("token");
    const authlevel = localStorage.getItem("authlevel");
    if (!token) { navigate("/"); return; }
    if (authlevel !== "1") { navigate("/"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/daily?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar grade.");
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchSchedule(isoDate); }, [isoDate, fetchSchedule]);

  const roomsList = useMemo(() => schedule?.rooms || [], [schedule]);

  // Extrai períodos da API; fallback para DEFAULT_PERIODS se API ainda não respondeu
  const allPeriods = useMemo(() => {
    if (schedule?.rooms?.length) {
      const slots = schedule.rooms[0].slots;
      if (slots?.length) {
        return slots.map(s => ({
          periodId: s.periodId,
          periodName: s.periodName,
          startTime: s.startTime,
          endTime: s.endTime,
        }));
      }
    }
    return DEFAULT_PERIODS;
  }, [schedule]);

  const visiblePeriods = useMemo(() => {
    if (filterPeriod === "Todos") return allPeriods;
    return allPeriods.filter(p => periodGroup(p.startTime) === filterPeriod);
  }, [allPeriods, filterPeriod]);

  const filteredRooms = useMemo(() => {
    let rooms = roomsList;
    if (filterRoom) rooms = rooms.filter(r => r.roomId === Number(filterRoom));
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      rooms = rooms.filter(r =>
        r.roomName.toLowerCase().includes(q) ||
        r.slots?.some(s =>
          s.occupant?.userOrClass?.toLowerCase().includes(q) ||
          s.occupant?.subject?.toLowerCase().includes(q)
        )
      );
    }
    return rooms;
  }, [roomsList, filterRoom, filterSearch]);

  const isHolidayDay = useMemo(() => {
    if (!schedule?.rooms?.length) return false;
    return schedule.rooms[0]?.slots?.some(s => s.status === "HOLIDAY");
  }, [schedule]);

  const isSunday = selDate.getDay() === 0;

  function handleMouseMove(e) {
    if (tip.res) setTip(t => ({ ...t, x: e.clientX, y: e.clientY }));
  }
  function handleCellEnter(e, slot, roomName) {
    if (!slot || slot.status === "FREE") return;
    setTip({ res: slot, roomName, x: e.clientX, y: e.clientY });
  }
  function handleCellLeave() {
    setTip({ res: null, roomName: "", x: 0, y: 0 });
  }

  function exportToCSV() {
    if (!filteredRooms.length) return;
    const headers = ["Sala", ...visiblePeriods.map(p => `${p.startTime?.slice(0,5)}-${p.endTime?.slice(0,5)}`)];
    const rows = filteredRooms.map(room => {
      const row = [room.roomName];
      visiblePeriods.forEach(period => {
        const slot = room.slots?.find(s => s.periodId === period.periodId);
        row.push(slot?.occupant?.userOrClass || (slot?.status === "HOLIDAY" ? "FERIADO" : ""));
      });
      return row;
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `grade_${isoDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const fmtDate = selDate.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const fmtDateCap = fmtDate.charAt(0).toUpperCase() + fmtDate.slice(1);

  const tableEl = (
    <ScheduleTable
      rooms={filteredRooms}
      visiblePeriods={visiblePeriods}
      loading={loading}
      error={error}
      onMouseMove={handleMouseMove}
      onCellEnter={handleCellEnter}
      onCellLeave={handleCellLeave}
    />
  );

  return (
    <div className="gr-page">
      <Navbar activePage="Reservas" />
      <PageHero
        tag="Grade Semanal"
        title="Grade de Reservas"
        description="Visualize e gerencie as reservas de salas e laboratórios."
      />

      {tip.res && (
        <Tooltip res={tip.res} roomName={tip.roomName} x={tip.x} y={tip.y} />
      )}

      <main className="gr-main">
        {/* Breadcrumb */}
        <div className="gr-breadcrumb">
          <span>Início</span>
          <span className="gr-breadcrumb__sep">›</span>
          <span className="gr-breadcrumb__active">Grade de Reservas</span>
        </div>

        {/* Card */}
        <div className="gr-card">

          {/* Topo: título + botões */}
          <div className="gr-card__top">
            <div>
              <h2 className="gr-card__title">Grade de Horários</h2>
              <p className="gr-card__subtitle">
                {fmtDateCap} · 1º Semestre {selDate.getFullYear()}
              </p>
            </div>
            <div className="gr-card__actions">
              <button className="gr-btn gr-btn--outline" onClick={exportToCSV}>
                📤 Exportar
              </button>
              <button className="gr-btn gr-btn--outline" onClick={() => window.print()}>
                🖨️ Imprimir
              </button>
              <button className="gr-btn gr-btn--icon" onClick={() => setFullscreen(true)} title="Tela cheia">
                ⛶
              </button>
            </div>
          </div>

          {/* Barra de filtros */}
          <div className="gr-filterbar">
            {/* Navegação de data */}
            <div className="gr-filterbar__date" style={{ position: "relative" }}>
              <button className="gr-nav-btn" onClick={() => setSelDate(d => addDays(d, -1))}>‹</button>
              <button className="gr-nav-date-btn" onClick={() => setShowCal(v => !v)}>
                📅 {selDate.toLocaleDateString("pt-BR", {
                  weekday: "short", day: "2-digit", month: "short", year: "numeric",
                })}
              </button>
              <button className="gr-nav-btn" onClick={() => setSelDate(d => addDays(d, 1))}>›</button>
              {showCal && (
                <MiniCalendar
                  onSelect={d => { setSelDate(d); setShowCal(false); }}
                  onClose={() => setShowCal(false)}
                />
              )}
            </div>

            <div className="gr-filterbar__sep" />

            <select className="gr-select" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="Todos">Todos os períodos</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
            </select>

            <select className="gr-select" value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="">Todas as salas</option>
              {roomsList.map(r => (
                <option key={r.roomId} value={r.roomId}>{r.roomName}</option>
              ))}
            </select>

            <div className="gr-search">
              <span>🔍</span>
              <input
                placeholder="Pesquisar turma, professor..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Legenda */}
          <div className="gr-legend">
            <span className="gr-legend__title">LEGENDA:</span>
            <span className="gr-legend__item">
              <span className="gr-legend__dot gr-legend__dot--recurring" /> Recorrente
            </span>
            <span className="gr-legend__item">
              <span className="gr-legend__dot gr-legend__dot--simple" /> Simples
            </span>
            <span className="gr-legend__item">
              <span className="gr-legend__dot gr-legend__dot--holiday" /> Feriado
            </span>
          </div>

          {/* Banners situacionais */}
          {isHolidayDay && (
            <div className="gr-banner gr-banner--holiday">
              🎉 <strong>Feriado</strong> — Reservas indisponíveis nesta data.
            </div>
          )}
          {isSunday && !isHolidayDay && (
            <div className="gr-banner gr-banner--holiday">
              Domingo — Reservas indisponíveis.
            </div>
          )}
          {successMsg && (
            <div className="gr-banner gr-banner--success">✅ {successMsg}</div>
          )}

          {/* Tabela */}
          <div className="gr-card__body">
            {tableEl}
          </div>

          {/* Rodapé */}
          <div className="gr-card__footer">
            <button className="gr-btn gr-btn--outline" onClick={() => navigate("/reserva-recorrente")}>
              🔄 Reserva Recorrente
            </button>
            <button
              className="gr-btn gr-btn--red"
              onClick={() => { setSuccessMsg(null); setShowBookingModal(true); }}
              disabled={isHolidayDay || isSunday}
            >
              + Nova Reserva
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Fullscreen */}
      {fullscreen && (
        <div className="gr-fullscreen">
          <div className="gr-fullscreen__bar">
            <span className="gr-fullscreen__title">🏛️ Grade de Horários — {fmtDateCap}</span>
            <button className="gr-btn gr-btn--outline" onClick={() => setFullscreen(false)}>
              ✕ Fechar
            </button>
          </div>
          <div className="gr-fullscreen__body">{tableEl}</div>
        </div>
      )}

      {/* Modal nova reserva */}
      {showBookingModal && (
        <BookingModal
          rooms={roomsList}
          periods={allPeriods}
          date={selDate}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            setSuccessMsg("Reserva solicitada com sucesso. Aguarde aprovação.");
            fetchSchedule(isoDate);
          }}
        />
      )}
    </div>
  );
}