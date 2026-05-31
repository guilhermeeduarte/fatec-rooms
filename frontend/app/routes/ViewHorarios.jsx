import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import PageHero from "../components/PageHero";
import { Calendar } from "lucide-react";
import { Search } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LoadingState, ErrorState } from "../components/PageState";
import "../styles/grade.css";

// ─────────────────────────────────────────────────────────────────────────
// PERÍODOS PADRÃO — usados como fallback enquanto a API não retorna
// ─────────────────────────────────────────────────────────────────────────
const DEFAULT_PERIODS = [
  { periodId: 1,  periodName: "1º",  startTime: "07:30", endTime: "08:20" },
  { periodId: 2,  periodName: "2º",  startTime: "08:20", endTime: "09:20" },
  { periodId: 3,  periodName: "3º",  startTime: "09:10", endTime: "10:00" },
  { periodId: 4,  periodName: "4º",  startTime: "10:10", endTime: "11:00" },
  { periodId: 5,  periodName: "5º",  startTime: "11:00", endTime: "11:50" },
  { periodId: 6,  periodName: "6º",  startTime: "13:00", endTime: "13:50" },
  { periodId: 7,  periodName: "7º",  startTime: "13:50", endTime: "14:40" },
  { periodId: 8,  periodName: "8º",  startTime: "14:50", endTime: "15:40" },
  { periodId: 9,  periodName: "9º",  startTime: "15:40", endTime: "16:30" },
  { periodId: 10, periodName: "10º", startTime: "16:40", endTime: "17:30" },
  { periodId: 11, periodName: "11º", startTime: "19:20", endTime: "20:10" },
  { periodId: 12, periodName: "12º", startTime: "20:10", endTime: "21:10" },
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
        {isHoliday && <span className="gr-tip__badge gr-tip__badge--holiday">Feriado</span>}
        {occ && (
            <>
          <span className={`gr-tip__badge gr-tip__badge--${type}`}>
            {occ.type === "RECURRING" ? "Recorrente" : "Simples"}
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
// MODAL DE NOVA RESERVA — com cursos do backend
// ─────────────────────────────────────────────────────────────────────────
function BookingModal({ rooms, periods, date, onClose, onSuccess }) {
  const [roomId, setRoomId] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [motivo, setMotivo] = useState("");
  const [curso, setCurso] = useState("");
  const [naoSeAplica, setNaoSeAplica] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  useEffect(() => {
    async function loadCourses() {
      const token = localStorage.getItem("token");
      if (!token) return;
      setLoadingCourses(true);
      try {
        const response = await fetch("/api/courses", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const activeCourses = Array.isArray(data)
              ? data.filter(course => course.active === true)
              : [];
          setCourses(activeCourses);
        }
      } catch (err) {
        console.error("Erro ao carregar cursos:", err);
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  function togglePeriod(id) {
    setSelectedPeriods(prev =>
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setError(null);
  }

// No BookingModal, substitua a função handleSubmit pela versão abaixo:

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Validacoes basicas
    if (!roomId) {
      setPopupMessage("Selecione uma sala.");
      setShowErrorPopup(true);
      return;
    }
    if (selectedPeriods.length === 0) {
      setPopupMessage("Selecione pelo menos um periodo.");
      setShowErrorPopup(true);
      return;
    }
    if (!motivo.trim()) {
      setPopupMessage("Informe o motivo da reserva.");
      setShowErrorPopup(true);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setPopupMessage("Sessao expirada. Faca login novamente.");
      setShowErrorPopup(true);
      return;
    }

    // Verificar data passada
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setPopupMessage("Nao e possivel fazer reservas em datas passadas. Selecione uma data futura.");
      setShowErrorPopup(true);
      return;
    }

    // Verificar se é domingo
    const isSunday = selectedDate.getDay() === 0;
    if (isSunday) {
      setPopupMessage("Reservas nao sao permitidas aos domingos.");
      setShowErrorPopup(true);
      return;
    }

    const notes = naoSeAplica
        ? motivo
        : `${motivo}\nCurso: ${curso || "Nao informado"}`;

    setLoading(true);

    try {
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

      if (!res.ok) {
        let rawErrorMessage = "";
        try {
          const errorData = await res.json();
          rawErrorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) {
          rawErrorMessage = await res.text();
        }

        let errorMessage = "";

        // Tratamento específico para conflito de horário (prioridade máxima)
        if (rawErrorMessage.includes("Operacao nao permitida") ||
            rawErrorMessage.includes("status") ||
            rawErrorMessage.includes("conflito") ||
            rawErrorMessage.includes("ja reservada") ||
            rawErrorMessage.includes("já reservada") ||
            rawErrorMessage.includes("ocupada")) {

          let periodInfo = "";
          if (selectedPeriods.length === 1) {
            const period = periods.find(p => p.periodId === selectedPeriods[0]);
            if (period) {
              periodInfo = ` no ${period.periodName} periodo (${period.startTime?.slice(0,5)} as ${period.endTime?.slice(0,5)})`;
            }
          } else {
            periodInfo = ` para ${selectedPeriods.length} periodos selecionados`;
          }
          errorMessage = `Conflito de horario${periodInfo}. A sala selecionada ja esta reservada para este horario. Escolha outro horario ou sala.`;
        }
        // Outros erros
        else if (rawErrorMessage.includes("data da reserva deve ser futura")) {
          errorMessage = "Nao e possivel fazer reservas em datas passadas. Selecione uma data futura.";
        } else if (rawErrorMessage.includes("suspensa")) {
          errorMessage = "As reservas estao temporariamente suspensas. Nao e possivel criar novas reservas no momento.";
        } else if (rawErrorMessage.includes("antecedencia")) {
          errorMessage = "Esta reserva precisa ser feita com mais dias de antecedencia. Coordenadores podem reservar com ate 1 dia de antecedencia.";
        } else if (rawErrorMessage.includes("permissao") || rawErrorMessage.includes("autorizacao")) {
          errorMessage = "Voce nao tem permissao para fazer esta reserva. Verifique seu nivel de acesso.";
        } else if (rawErrorMessage.includes("feriado")) {
          errorMessage = "Nao e possivel fazer reservas em feriados.";
        } else {
          errorMessage = rawErrorMessage;
        }

        throw new Error(errorMessage);
      }

      onSuccess();
    } catch (err) {
      setPopupMessage(err.message);
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = { marginLeft: 0, marginRight: 0 };

  // CORREÇÃO: Usar "Manhã" com acento em vez de "Manha"
  const morningPeriods = periods.filter(p => periodGroup(p.startTime) === "Manhã");
  const afternoonPeriods = periods.filter(p => periodGroup(p.startTime) === "Tarde");
  const eveningPeriods = periods.filter(p => periodGroup(p.startTime) === "Noite");

  return (
      <>
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-espacos" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-content-wrapper">
              <div className="modal-topo">
                <h2>Nova Reserva — {date.toLocaleDateString("pt-BR")}</h2>
                <button className="btn-close-modal" onClick={onClose}>×</button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="form-group-reserva" style={fieldStyle}>
                  <label>Sala *</label>
                  <select
                      value={roomId}
                      onChange={e => {
                        setRoomId(e.target.value);
                        setError(null);
                      }}
                      required
                  >
                    <option value="">Selecione</option>
                    {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomName}</option>)}
                  </select>
                </div>

                <div className="form-group-reserva" style={fieldStyle}>
                  <label>Periodos *</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Manha */}
                    {morningPeriods.length > 0 && (
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#51cd99", marginBottom: "6px" }}>Manha</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {morningPeriods.map(p => (
                                <label key={p.periodId} style={{
                                  border: selectedPeriods.includes(p.periodId) ? "1px solid #dc2626" : "1px solid #d1d5db",
                                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                                  background: selectedPeriods.includes(p.periodId) ? "#fecaca" : "white",
                                  transition: "all 0.2s"
                                }}>
                                  <input type="checkbox" checked={selectedPeriods.includes(p.periodId)}
                                         onChange={() => togglePeriod(p.periodId)} style={{ display: "none" }} />
                                  {p.periodName} <span style={{ fontSize: "0.75rem", color: "#666" }}>{p.startTime?.slice(0,5)}</span>
                                </label>
                            ))}
                          </div>
                        </div>
                    )}

                    {/* Tarde */}
                    {afternoonPeriods.length > 0 && (
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#3b82f6", marginBottom: "6px" }}>Tarde</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {afternoonPeriods.map(p => (
                                <label key={p.periodId} style={{
                                  border: selectedPeriods.includes(p.periodId) ? "1px solid #dc2626" : "1px solid #d1d5db",
                                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                                  background: selectedPeriods.includes(p.periodId) ? "#fecaca" : "white",
                                  transition: "all 0.2s"
                                }}>
                                  <input type="checkbox" checked={selectedPeriods.includes(p.periodId)}
                                         onChange={() => togglePeriod(p.periodId)} style={{ display: "none" }} />
                                  {p.periodName} <span style={{ fontSize: "0.75rem", color: "#666" }}>{p.startTime?.slice(0,5)}</span>
                                </label>
                            ))}
                          </div>
                        </div>
                    )}

                    {/* Noite */}
                    {eveningPeriods.length > 0 && (
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#ff2eb7", marginBottom: "6px" }}>Noite</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {eveningPeriods.map(p => (
                                <label key={p.periodId} style={{
                                  border: selectedPeriods.includes(p.periodId) ? "1px solid #dc2626" : "1px solid #d1d5db",
                                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                                  background: selectedPeriods.includes(p.periodId) ? "#fecaca" : "white",
                                  transition: "all 0.2s"
                                }}>
                                  <input type="checkbox" checked={selectedPeriods.includes(p.periodId)}
                                         onChange={() => togglePeriod(p.periodId)} style={{ display: "none" }} />
                                  {p.periodName} <span style={{ fontSize: "0.75rem", color: "#666" }}>{p.startTime?.slice(0,5)}</span>
                                </label>
                            ))}
                          </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="form-group-reserva" style={fieldStyle}>
                  <label>Motivo *</label>
                  <input
                      type="text"
                      value={motivo}
                      onChange={e => {
                        setMotivo(e.target.value);
                        setError(null);
                      }}
                      placeholder="Descreva o motivo"
                      required
                  />
                </div>

                <div className="form-group-reserva" style={fieldStyle}>
                  <label>Curso</label>
                  <select
                      value={curso}
                      onChange={e => setCurso(e.target.value)}
                      required={!naoSeAplica}
                      disabled={naoSeAplica || loadingCourses}
                      style={{ backgroundColor: naoSeAplica ? "#cfcccc89" : "white" }}
                  >
                    <option value="">Selecione um curso</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.name}>
                          {course.name}
                        </option>
                    ))}
                  </select>
                  {loadingCourses && <small style={{ color: "#666" }}>Carregando cursos...</small>}
                </div>

                <div className="form-group-reserva-check" style={fieldStyle}>
                  <input
                      type="checkbox"
                      id="nsa2"
                      checked={naoSeAplica}
                      onChange={e => {
                        setNaoSeAplica(e.target.checked);
                        if (e.target.checked) setCurso("");
                      }}
                  />
                  <label htmlFor="nsa2"> Nao se aplica a um curso</label>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginLeft: 0, marginRight: 0 }}>
                  <button type="button" className="sonic"
                          style={{ marginTop: 0, height: 44, padding: "8px 20px" }}
                          onClick={onClose}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-submit-reserva"
                          style={{ flex: 1, margin: 0, height: 44, fontSize: 15 }}
                          disabled={loading}>
                    {loading ? "Enviando..." : "Solicitar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Popup de erro */}
        {showErrorPopup && (
            <Popup
                message={popupMessage}
                onClose={() => setShowErrorPopup(false)}
                type="error"
            />
        )}
      </>
  );
}
// ─────────────────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DA GRADE
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
  const groups = [
    { key: "Manhã",  label: "MANHÃ",  cls: "manham" },
    { key: "Tarde",  label: "TARDE",  cls: "tarde"  },
    { key: "Noite",  label: "NOITE",  cls: "noite"  },
  ].map(g => ({
    ...g,
    periods: visiblePeriods.filter(p => periodGroup(p.startTime) === g.key),
  })).filter(g => g.periods.length > 0);

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
          <tr className="gr-thead-group">
            <th className="gr-th-sala" rowSpan={2} />
            {groups.map(g => (
                <th key={g.key} colSpan={g.periods.length}
                    className={`gr-th-group gr-th-group--${g.cls}`}>
                  {g.label}
                </th>
            ))}
          </tr>
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
          {!loading && error && (
              <tr>
                <td colSpan={visiblePeriods.length + 1} className="gr-state gr-state--error">
                  {error}
                </td>
              </tr>
          )}
          {!loading && !error && rooms.length === 0 && (
              <tr>
                <td colSpan={visiblePeriods.length + 1} className="gr-state">
                  Nenhuma sala encontrada para esta data.
                </td>
              </tr>
          )}
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
                            <div className="gr-block gr-block--holiday"><span className="gr-block__label"></span></div>
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
  const [timeoutId, setTimeoutId] = useState(null);

  const isoDate = getISOFromDate(selDate);

  // Limpar timeout do success message quando o componente desmontar
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

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

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('gr-fullscreen-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('gr-fullscreen-active');
    }

    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('gr-fullscreen-active');
    };
  }, [fullscreen]);

  const roomsList = useMemo(() => schedule?.rooms || [], [schedule]);

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

  function exportToPDF() {
    if (!filteredRooms.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Grade de Reservas", 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(fmtDateCap, 14, 20);
    doc.setTextColor(0);

    const headers = [
      "Sala",
      ...visiblePeriods.map(p => `${p.startTime?.slice(0, 5)}\n${p.endTime?.slice(0, 5)}`),
    ];

    const rows = filteredRooms.map(room => [
      room.roomName,
      ...visiblePeriods.map(period => {
        const slot = room.slots?.find(s => s.periodId === period.periodId);
        if (!slot || slot.status === "FREE") return "";
        if (slot.status === "HOLIDAY") return "Feriado";
        return slot.occupant?.userOrClass || "";
      }),
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 25,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [192, 18, 28],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 30, fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index === 0) return;
        const periodIndex = data.column.index - 1;
        const period = visiblePeriods[periodIndex];
        if (!period) return;
        const room = filteredRooms[data.row.index];
        if (!room) return;
        const slot = room.slots?.find(s => s.periodId === period.periodId);
        if (!slot?.occupant) return;
        if (slot.occupant.type === "RECURRING") {
          data.cell.styles.fillColor = [168, 85, 247];
          data.cell.styles.textColor = [255, 255, 255];
        } else {
          data.cell.styles.fillColor = [245, 158, 11];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setFillColor(168, 85, 247);
        doc.rect(14, pageHeight - 10, 8, 4, "F");
        doc.setTextColor(60);
        doc.text("Recorrente", 24, pageHeight - 7);
        doc.setFillColor(245, 158, 11);
        doc.rect(55, pageHeight - 10, 8, 4, "F");
        doc.text("Simples", 65, pageHeight - 7);
        doc.setTextColor(160);
        doc.text(`Exportado em ${new Date().toLocaleDateString("pt-BR")}`, data.settings.margin.left, pageHeight - 2);
      },
    });

    doc.save(`grade_${isoDate}.pdf`);
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

  const isPastDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(selDate);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  })();

  // isDisabled apenas para botão de Nova Reserva (não para exportar/imprimir)
  const isBookingDisabled = isHolidayDay || isSunday || isPastDate;

  // isActionDisabled apenas para ações de exportar/imprimir (só feriado e domingo)
  const isActionDisabled = isHolidayDay || isSunday;

  const isDisabled = isHolidayDay || isSunday || isPastDate;

  // Função para tentar recarregar os dados
  const handleRetry = () => {
    fetchSchedule(isoDate);
  };

  // Função para mostrar mensagem de sucesso com timeout
  const showSuccessMessage = (message) => {
    // Limpar timeout anterior se existir
    if (timeoutId) clearTimeout(timeoutId);

    setSuccessMsg(message);

    // Configurar novo timeout para remover a mensagem após 3 segundos
    const newTimeoutId = setTimeout(() => {
      setSuccessMsg(null);
      setTimeoutId(null);
    }, 3000);

    setTimeoutId(newTimeoutId);
  };

  // Estado de loading
  if (loading && !schedule) {
    return (
        <LoadingState
            activePage="Reservas"
            heroTag="Grade Semanal"
            heroTitle="Grade de Reservas"
            heroDescription="Visualize e gerencie as reservas de salas e laboratórios."
            description="Carregando grade de reservas..."
        />
    );
  }

  // Estado de erro
  if (error && !schedule) {
    return (
        <ErrorState
            error={error}
            title="Erro ao carregar grade"
            onRetry={handleRetry}
            onBack={() => navigate("/")}
            activePage="Reservas"
            heroTag="Grade Semanal"
            heroTitle="Grade de Reservas"
            heroDescription="Visualize e gerencie as reservas de salas e laboratórios."
        />
    );
  }

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
          <div className="gr-card">

            {/* Topo */}
            <div className="gr-card__top">
              <div>
                <h2 className="gr-card__title">Grade de Horários</h2>
                <p className="gr-card__subtitle">
                  {fmtDateCap} · 1º Semestre {selDate.getFullYear()}
                </p>
              </div>
              <div className="gr-card__actions">
                <button className="gr-btn gr-btn--outline" onClick={exportToPDF} disabled={isActionDisabled}
                        style={{ opacity: isActionDisabled ? 0.5 : 1 }}>
                  Exportar PDF
                </button>
                <button className="gr-btn gr-btn--outline" onClick={() => window.print()} disabled={isActionDisabled}
                        style={{ opacity: isActionDisabled ? 0.5 : 1 }}>
                  Imprimir
                </button>
                <button className="gr-btn gr-btn--icon" onClick={() => setFullscreen(true)} title="Tela cheia">
                  ⛶
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="gr-filterbar">
              <div className="gr-filterbar__date" style={{ position: "relative" }}>
                <button className="gr-nav-btn" onClick={() => setSelDate(d => addDays(d, -1))}>‹</button>
                <button className="gr-nav-date-btn" onClick={() => setShowCal(v => !v)}>
                  {selDate.toLocaleDateString("pt-BR", {
                    weekday: "short", day: "2-digit", month: "short", year: "numeric",
                  })}<Calendar style={{ marginBottom: "-2px", marginLeft: "0.7em" }} color="black" size={15} />
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
                <Search size={18} color="gray" style={{ marginRight: "8px" }} />
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
            </div>

            {/* Banners */}
            {isHolidayDay && (
                <div className="gr-banner gr-banner--holiday">
                  <strong>Feriado</strong> — Reservas indisponíveis nesta data.
                </div>
            )}
            {isSunday && !isHolidayDay && (
                <div className="gr-banner gr-banner--holiday">
                  Domingo — Reservas indisponíveis.
                </div>
            )}
            {/* Banner de data passada - só aparece se não for feriado E não for domingo */}
            {isPastDate && !isHolidayDay && !isSunday && (
                <div className="gr-banner gr-banner--holiday">
                  Data passada — Reservas indisponíveis para datas anteriores.
                </div>
            )}

            {/* Mensagem de sucesso com auto-esconder em 3 segundos */}
            {successMsg && (
                <div className="gr-banner gr-banner--success" style={{ animation: "fadeOut 0.5s ease-in-out 2.5s forwards" }}>
                  {successMsg}
                </div>
            )}

            {/* Tabela */}
            <div className="gr-card__body">{tableEl}</div>

            {/* Rodapé */}
            <div className="gr-card__footer">
              <button className="gr-btn gr-btn--outline" onClick={() => navigate("/reserva-recorrente")}>
                Reserva Recorrente
              </button>
              <button
                  className="gr-btn gr-btn--red"
                  onClick={() => {
                    setSuccessMsg(null);
                    setShowBookingModal(true);
                  }}
                  disabled={isHolidayDay || isSunday || isPastDate}
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
                <span className="gr-fullscreen__title">Grade de Horários — {fmtDateCap}</span>
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
                onSuccess={async () => {
                  setShowBookingModal(false);
                  try {
                    const token = localStorage.getItem("token");
                    const userRes = await fetch("/api/users/me", {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const userData = await userRes.json();
                    if (userData.authlevel === 1) {
                      showSuccessMessage("Reserva realizada com sucesso!");
                    } else {
                      showSuccessMessage("Reserva solicitada com sucesso! Aguarde aprovação.");
                    }
                  } catch {
                    showSuccessMessage("Reserva solicitada com sucesso! Aguarde aprovação.");
                  }
                  // Recarregar a grade após 1 segundo para dar tempo da API processar
                  setTimeout(() => {
                    fetchSchedule(isoDate);
                  }, 1000);
                }}
            />
        )}
      </div>
  );
}