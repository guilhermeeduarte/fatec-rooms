import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import Calendar from "react-calendar";

const dayCodeMap = {
  SEG: "MONDAY",
  TER: "TUESDAY",
  QUA: "WEDNESDAY",
  QUI: "THURSDAY",
  SEX: "FRIDAY",
  SAB: "SATURDAY",
};

const dayCodeLabels = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

const jsDoWToCode = { 1: "SEG", 2: "TER", 3: "QUA", 4: "QUI", 5: "SEX", 6: "SAB" };

// Mapeamento shift → palavras-chave no nome do período
const SHIFT_KEYWORDS = {
  MORNING:   ["manhã", "manha"],
  AFTERNOON: ["tarde"],
  EVENING:   ["noite"],
  YEAR_1:    ["noite"],
  YEAR_2:    ["noite"],
};

function getPeriodShift(period) {
  const name = (period.name || "").toLowerCase().replace(/\s+/g, "");
  if (name.includes("sábado") || name.includes("sabado")) return "SATURDAY";
  if (name.includes("manhã") || name.includes("manha")) return "MORNING";
  if (name.includes("tarde")) return "AFTERNOON";
  if (name.includes("noite")) return "EVENING";
  // fallback: tenta pelo horário de início
  if (period.startTime) {
    const hour = parseInt((period.startTime || "").slice(0, 2), 10);
    if (hour < 12) return "MORNING";
    if (hour < 18) return "AFTERNOON";
    return "EVENING";
  }
  return null;
}

function isSaturdayOnlyPeriod(period) {
  if (!period.name) return false;
  const nomeLower = period.name.toLowerCase();
  return nomeLower.includes("sábado") || nomeLower.includes("sabado");
}

function parseBackendError(text) {
  if (!text) return null;
  try {
    const body = JSON.parse(text);
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

function getISOFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function ReservaRecorrente() {
  const navigate = useNavigate();

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  useEffect(() => {
    if (error) setShowErrorPopup(true);
  }, [error]);

  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [recurringBookings, setRecurringBookings] = useState([]);

  const [calendarDate, setCalendarDate] = useState(new Date());

  const [form, setForm] = useState({
    semesterId: "",
    courseId: "",
    classGroupId: "",
    roomId: "",
    weekDays: [],
    periodIds: [],
    subject: "",
    notes: "",
  });

  // Indica quais períodos foram auto-selecionados pelo turno (para destaque visual)
  const [autoSelectedPeriodIds, setAutoSelectedPeriodIds] = useState([]);

  const selectedClassGroup = classGroups.find((item) => item.id === Number(form.classGroupId));
  const selectedSemester = semesters.find((item) => item.id === Number(form.semesterId));
  const activePeriods = periods.filter((p) => p.active === 1 || p.active === true);
  const bookableRooms = rooms.filter((r) => r.bookable === 1 || r.bookable === true);
  const availableClassGroups = form.courseId
      ? classGroups.filter((g) => g.courseId === Number(form.courseId))
      : classGroups;

  // Períodos filtrados com base nos dias da semana selecionados
  const filteredPeriods = useMemo(() => {
    const hasSaturday = form.weekDays.includes("SAB");
    return activePeriods.filter((period) => {
      const isSaturdayOnly = isSaturdayOnlyPeriod(period);
      if (isSaturdayOnly) return hasSaturday;
      return true;
    });
  }, [activePeriods, form.weekDays]);

  // Períodos do turno da turma selecionada (não-sábado)
  const shiftPeriods = useMemo(() => {
    if (!selectedClassGroup) return [];
    const shift = selectedClassGroup.shift;
    return activePeriods.filter((p) => {
      if (isSaturdayOnlyPeriod(p)) return false;
      const ps = getPeriodShift(p);
      if (shift === "MORNING")   return ps === "MORNING";
      if (shift === "AFTERNOON") return ps === "AFTERNOON";
      if (shift === "EVENING" || shift === "YEAR_1" || shift === "YEAR_2") return ps === "EVENING";
      return false;
    });
  }, [selectedClassGroup, activePeriods]);

  // Auto-seleciona períodos E dias da semana quando a turma muda
  useEffect(() => {
    if (!selectedClassGroup) {
      setAutoSelectedPeriodIds([]);
      return;
    }
    const ids = shiftPeriods.map((p) => p.id);
    setAutoSelectedPeriodIds(ids);

    // Auto-seleciona dias da semana baseado no turno
    // Manhã/Tarde/Noite → Seg–Sex por padrão; Sábado só se hasSaturday
    const shift = selectedClassGroup.shift;
    const defaultDays = ["SEG", "TER", "QUA", "QUI", "SEX"];
    const autoWeekDays = selectedClassGroup.hasSaturday
      ? [...defaultDays, "SAB"]
      : defaultDays;

    setForm((prev) => ({
      ...prev,
      weekDays: autoWeekDays,
      // mantém sábados já marcados manualmente, substitui os do turno
      periodIds: [
        ...ids,
        ...prev.periodIds.filter((id) => {
          const p = activePeriods.find((ap) => ap.id === id);
          return p && isSaturdayOnlyPeriod(p);
        }),
      ],
    }));
  }, [form.classGroupId]); // eslint-disable-line

  // Remove períodos de sábado quando SAB é desmarcado
  useEffect(() => {
    const hasSaturday = form.weekDays.includes("SAB");
    if (!hasSaturday && form.periodIds.length > 0) {
      const saturdayPeriodIds = activePeriods
          .filter((p) => isSaturdayOnlyPeriod(p))
          .map((p) => p.id);
      const newPeriodIds = form.periodIds.filter((id) => !saturdayPeriodIds.includes(id));
      if (newPeriodIds.length !== form.periodIds.length) {
        setForm((prev) => ({ ...prev, periodIds: newPeriodIds }));
      }
    }
  }, [form.weekDays, activePeriods]);

  const semesterRange = useMemo(() => {
    if (!selectedSemester?.startDate || !selectedSemester?.endDate) return null;
    return {
      start: new Date(selectedSemester.startDate + "T00:00:00"),
      end: new Date(selectedSemester.endDate + "T00:00:00"),
    };
  }, [selectedSemester]);

  const markedDates = useMemo(() => {
    if (!semesterRange || form.weekDays.length === 0) return new Set();
    const set = new Set();
    const cur = new Date(semesterRange.start);
    while (cur <= semesterRange.end) {
      const code = jsDoWToCode[cur.getDay()];
      if (code && form.weekDays.includes(code)) {
        set.add(getISOFromDate(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return set;
  }, [semesterRange, form.weekDays]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    async function loadData() {
      try {
        setLoadingPage(true);
        setError(null);
        const [semRes, courseRes, classGroupRes, roomRes, periodRes] = await Promise.all([
          fetch("/api/semesters", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/courses", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/class-groups", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/periods", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!semRes.ok) throw new Error("Falha ao carregar semestres.");
        if (!courseRes.ok) throw new Error("Falha ao carregar cursos.");
        if (!classGroupRes.ok) throw new Error("Falha ao carregar turmas.");
        if (!roomRes.ok) throw new Error("Falha ao carregar salas.");
        if (!periodRes.ok) throw new Error("Falha ao carregar períodos.");
        setSemesters(await semRes.json());
        setCourses(await courseRes.json());
        setClassGroups(await classGroupRes.json());
        setRooms(await roomRes.json());
        setPeriods(await periodRes.json());
      } catch (err) {
        setError(err.message || "Erro ao carregar a página.");
      } finally {
        setLoadingPage(false);
      }
    }
    loadData();
  }, [navigate]);

  useEffect(() => {
    if (!form.semesterId) { setRecurringBookings([]); return; }
    const token = localStorage.getItem("token");
    fetch(`/api/recurring-bookings/by-semester/${form.semesterId}?page=0&size=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
        .then((res) => (res.ok ? res.json() : { content: [] }))
        .then((data) => setRecurringBookings(data.content ?? data))
        .catch(() => setRecurringBookings([]));
  }, [form.semesterId]);

  useEffect(() => {
    if (semesterRange?.start) setCalendarDate(new Date(semesterRange.start));
  }, [semesterRange]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "courseId") {
        next.classGroupId = "";
        next.periodIds = [];
        setAutoSelectedPeriodIds([]);
      }
      if (name === "semesterId") {
        next.weekDays = [];
        next.periodIds = [];
        setAutoSelectedPeriodIds([]);
      }
      return next;
    });
    setSuccess(null);
    setError(null);
  }

  function toggleDia(code) {
    if (!code) return;

    // valida sábado
    const canUseSaturday =
        selectedClassGroup &&
        selectedClassGroup.hasSaturday === true;

    // bloqueia sábado se a turma não permitir
    if (code === "SAB" && !canUseSaturday) {
      return;
    }

    setForm((prev) => {
      const alreadySelected =
          prev.weekDays.includes(code);

      let newWeekDays;

      if (alreadySelected) {
        newWeekDays = prev.weekDays.filter(
            (d) => d !== code
        );
      } else {
        newWeekDays = [...prev.weekDays, code];
      }

      let newPeriodIds = [...prev.periodIds];

      // MARCOU sábado
      if (
          code === "SAB" &&
          !alreadySelected &&
          canUseSaturday
      ) {
        const saturdayIds = activePeriods
            .filter((p) =>
                isSaturdayOnlyPeriod(p)
            )
            .map((p) => p.id);

        newPeriodIds = [
          ...new Set([
            ...newPeriodIds,
            ...saturdayIds,
          ]),
        ];
      }

      // DESMARCOU sábado
      if (
          code === "SAB" &&
          alreadySelected
      ) {
        const saturdayIds = activePeriods
            .filter((p) =>
                isSaturdayOnlyPeriod(p)
            )
            .map((p) => p.id);

        newPeriodIds = newPeriodIds.filter(
            (id) =>
                !saturdayIds.includes(id)
        );
      }

      return {
        ...prev,
        weekDays: newWeekDays,
        periodIds: newPeriodIds,
      };
    });
  }

  function handleCalendarClick(value) {
    if (!semesterRange) return;
    const clicked = new Date(value);
    clicked.setHours(0, 0, 0, 0);
    if (clicked < semesterRange.start || clicked > semesterRange.end) return;
    const code = jsDoWToCode[clicked.getDay()];
    if (!code) return;
    toggleDia(code);
  }

  function togglePeriod(periodId) {
    const isAutoSelected = autoSelectedPeriodIds.includes(periodId);
    setForm((prev) => {
      if (prev.periodIds.includes(periodId)) {
        // Se for auto-selecionado, remove do auto também
        if (isAutoSelected) {
          setAutoSelectedPeriodIds((ids) => ids.filter((id) => id !== periodId));
        }
        return { ...prev, periodIds: prev.periodIds.filter((id) => id !== periodId) };
      }
      return { ...prev, periodIds: [...prev.periodIds, periodId] };
    });
  }

  function selectAllShiftPeriods() {
    const ids = shiftPeriods.map((p) => p.id);
    setAutoSelectedPeriodIds(ids);
    const defaultDays = ["SEG", "TER", "QUA", "QUI", "SEX"];
    const autoWeekDays = selectedClassGroup?.hasSaturday
      ? [...defaultDays, "SAB"]
      : defaultDays;
    setForm((prev) => ({
      ...prev,
      weekDays: autoWeekDays,
      periodIds: [
        ...ids,
        ...prev.periodIds.filter((id) => {
          const p = activePeriods.find((ap) => ap.id === id);
          return p && isSaturdayOnlyPeriod(p);
        }),
      ],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.semesterId || !form.courseId || !form.classGroupId || !form.roomId || !form.weekDays.length || !form.periodIds.length || !form.subject.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    const body = {
      semesterId: Number(form.semesterId),
      roomId: Number(form.roomId),
      classGroupId: Number(form.classGroupId),
      periodIds: form.periodIds.map(Number),
      weekDays: form.weekDays.map((code) => dayCodeMap[code]),
      subject: form.subject.trim(),
      notes: form.notes.trim(),
    };

    try {
      setLoadingSubmit(true);
      const res = await fetch("/api/recurring-bookings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(parseBackendError(text) || "Falha ao criar reserva recorrente.");
      }
      setSuccess("Reserva recorrente criada com sucesso.");
      setShowPopup(true);
      setAutoSelectedPeriodIds([]);
      setForm((prev) => ({ ...prev, weekDays: [], periodIds: [], subject: "", notes: "" }));
      const updated = await fetch(`/api/recurring-bookings/by-semester/${form.semesterId}?page=0&size=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (updated.ok) {
        const data = await updated.json();
        setRecurringBookings(data.content ?? data);
      }
    } catch (err) {
      setError(err.message || "Erro ao enviar.");
    } finally {
      setLoadingSubmit(false);
    }
  }

  // Label do turno para exibir ao usuário
  const shiftLabel = useMemo(() => {
    if (!selectedClassGroup) return null;
    const map = {
      MORNING:   "Manhã",
      AFTERNOON: "Tarde",
      EVENING:   "Noite",
      YEAR_1:    "1º Ano (Noite)",
      YEAR_2:    "2º Ano (Noite)",
    };
    return map[selectedClassGroup.shift] || selectedClassGroup.shift;
  }, [selectedClassGroup]);

  // Períodos de sábado disponíveis (para a seção de sábado)
  const saturdayPeriods = useMemo(
      () => activePeriods.filter(isSaturdayOnlyPeriod),
      [activePeriods]
  );

  if (loadingPage) return (
      <>
        <Navbar activePage="ReservaRecorrente" />
        <PageHero variant="SolicitaReserva" tag="Painel Operacional" title="Reserva Recorrente" description="Carregando..." />
        <div className="content-solicitarReserva"><div className="form-title">Carregando informações...</div></div>
        <Footer />
      </>
  );

  return (
      <>
        <Navbar activePage="ReservaRecorrente" />
        <PageHero
            variant="SolicitaReserva"
            tag="Painel Operacional"
            title="Reserva Recorrente"
            description="Cadastre reservas recorrentes para turmas durante o semestre."
        />

        <div className="content-solicitarReserva">

          {/* PAINEL ESQUERDO */}
          <div className="div-calendario">
            <div className="title-calendario">
              <h3>Calendário do Semestre:</h3>
              <p>
                {semesterRange
                    ? "Clique em um dia para selecionar todos os dias iguais do semestre."
                    : "Selecione um semestre para visualizar o calendário."}
              </p>
            </div>

            <Calendar
                onChange={handleCalendarClick}
                value={calendarDate}
                onActiveStartDateChange={({ activeStartDate }) => setCalendarDate(activeStartDate)}
                tileDisabled={({ date: d, view }) => {
                  if (view !== "month") return false;
                  if (!semesterRange) return true;
                  const day = new Date(d);
                  day.setHours(0, 0, 0, 0);
                  return day < semesterRange.start || day > semesterRange.end || d.getDay() === 0;
                }}
                tileClassName={({ date: d, view }) => {
                  if (view !== "month") return null;
                  const iso = getISOFromDate(d);
                  if (!semesterRange) return "dia-fora";
                  const day = new Date(d);
                  day.setHours(0, 0, 0, 0);
                  if (day < semesterRange.start || day > semesterRange.end) return "dia-fora";
                  if (d.getDay() === 0) return null;
                  if (markedDates.has(iso)) return "dia-aceita";
                  return null;
                }}
                tileContent={({ date: d, view }) => {
                  if (view !== "month") return null;
                  if (!semesterRange) return null;
                  const day = new Date(d);
                  day.setHours(0, 0, 0, 0);
                  if (day < semesterRange.start || day > semesterRange.end) return null;
                  const code = jsDoWToCode[d.getDay()];
                  if (!code || !form.weekDays.includes(code)) return null;
                  const booking = recurringBookings.find((b) =>
                      b.weekDays?.some((wd) => wd.startsWith(code === "SEG" ? "MON" : code === "TER" ? "TUE" : code === "QUA" ? "WED" : code === "QUI" ? "THU" : code === "SEX" ? "FRI" : "SAT"))
                  );
                  return (
                      <span style={{ fontSize: "0.55rem", display: "block", lineHeight: 1, color: "#166534", marginTop: "1px" }}>
                  {booking ? booking.roomName?.slice(0, 6) : "✓"}
                </span>
                  );
                }}
                locale="pt-BR"
                formatShortWeekday={(locale, d) =>
                    d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
                }
            />

            <div className="legenda">
              <div><span className="box verde"></span> Dia selecionado</div>
              <div><span className="box cinza"></span> Fora do semestre</div>
            </div>

            {form.weekDays.length > 0 && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <strong style={{ fontSize: "0.85rem", color: "#166534" }}>Dias selecionados:</strong>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    {form.weekDays.map((d) => (
                        <span key={d} style={{ background: "#dcfce7", color: "#166534", borderRadius: "4px", padding: "2px 8px", fontSize: "0.8rem", fontWeight: 600 }}>
                    {d}
                  </span>
                    ))}
                  </div>
                </div>
            )}

            <div className="reservas-feitas" style={{ marginTop: "1rem" }}>
              <h4>Reservas Cadastradas:</h4>
              <div className="lista-horarios">
                {recurringBookings.length === 0 ? (
                    <p>Nenhuma reserva recorrente cadastrada.</p>
                ) : (
                    recurringBookings.map((item) => (
                        <p key={item.id}>
                    <span className="hora">
                      {item.courseName || item.courseAbbreviation} • {item.classGroupLabel} • {item.weekDays.map((d) => d.substring(0, 3)).join(", ")}
                    </span>
                          <span className="prof">
                      {item.roomName} • {item.periods.map((p) => p.periodName).join(", ")}
                    </span>
                        </p>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO */}
          <div className="div-forms-reserva">
            <form onSubmit={handleSubmit}>

              <div className="form-group-reserva">
                <label>Semestre:</label>
                <select name="semesterId" value={form.semesterId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {semesters.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-reserva">
                <label>Curso:</label>
                <select name="courseId" value={form.courseId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-reserva">
                <label>Turma:</label>
                <select name="classGroupId" value={form.classGroupId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {availableClassGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-reserva">
                <label>Sala:</label>
                <select name="roomId" value={form.roomId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {bookableRooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}{r.location ? ` — ${r.location}` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-reserva">
                <label>Dias da semana:</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "0.25rem" }}>
                  {dayCodeLabels.map((dia) => {
                    const disabled =
                        dia === "SAB" &&
                        (
                            !selectedClassGroup ||
                            selectedClassGroup.hasSaturday !== true
                        );
                    const selected = form.weekDays.includes(dia);
                    return (
                        <button
                            key={dia}
                            type="button"
                            onClick={() => toggleDia(dia)}
                            disabled={disabled}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "6px",
                              border: selected
                                  ? "2px solid #dc2626"
                                  : "1px solid #d1d5db",

                              backgroundColor: selected
                                  ? "#fecaca"
                                  : disabled
                                      ? "#e5e7eb"
                                      : "white",

                              color: selected
                                  ? "#991b1b"
                                  : disabled
                                      ? "#9ca3af"
                                      : "#374151",

                              fontWeight: selected ? 600 : 400,

                              cursor: disabled
                                  ? "not-allowed"
                                  : "pointer",

                              fontSize: "0.85rem",

                              opacity: disabled ? 0.5 : 1,
                            }}
                        >
                          {dia}
                        </button>
                    );
                  })}
                </div>
                <small style={{ color: "#888", marginTop: "4px", display: "block" }}>
                  Ou clique nos dias no calendário.
                </small>
              </div>

              {/* ── SEÇÃO DE PERÍODOS ── */}
              <div className="form-group-reserva">
                <label>Períodos:</label>

                {/* Banner informativo quando turma selecionada */}
                {selectedClassGroup && shiftPeriods.length > 0 && (
                    <div style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#1d4ed8" }}>
                      ✓ Períodos e dias da semana do turno <strong>{shiftLabel}</strong> pré-selecionados automaticamente.
                    </span>
                      </div>
                      <button
                          type="button"
                          onClick={selectAllShiftPeriods}
                          style={{
                            fontSize: "0.75rem",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            border: "1px solid #93c5fd",
                            background: "white",
                            color: "#1d4ed8",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                      >
                        Restaurar seleção automática
                      </button>
                    </div>
                )}

                <div className="period-dropdown-options" style={{ position: "static", boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: "8px" }}>

                  {/* Botões rápidos */}
                  <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        type="button"
                        style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", background: "white" }}
                        onClick={() => {
                          // Selecionar todos respeita o turno: só períodos do turno + sábados se SAB selecionado
                          const shiftIds = shiftPeriods.map((p) => p.id);
                          const satIds = form.weekDays.includes("SAB")
                            ? activePeriods.filter(isSaturdayOnlyPeriod).map((p) => p.id)
                            : [];
                          setForm((prev) => ({ ...prev, periodIds: [...new Set([...shiftIds, ...satIds])] }));
                        }}
                    >
                      Selecionar todos
                    </button>
                    <button
                        type="button"
                        style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", background: "white" }}
                        onClick={() => { setForm((prev) => ({ ...prev, periodIds: [] })); setAutoSelectedPeriodIds([]); }}
                    >
                      Limpar
                    </button>
                  </div>

                  {/* Aviso quando nenhuma turma selecionada */}
                  {!selectedClassGroup && (
                      <div style={{ padding: "0.5rem", textAlign: "center", color: "#888" }}>
                        Selecione uma turma para ver os períodos disponíveis.
                      </div>
                  )}

                  {/* Períodos normais (não sábado), filtrados pelo turno da turma */}
                  {selectedClassGroup && shiftPeriods.length > 0 && (
                      <div>
                        {shiftLabel && (
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Turno {shiftLabel}
                            </div>
                        )}
                        {shiftPeriods.map((period) => {
                              const isChecked = form.periodIds.includes(period.id);
                              const isAuto = autoSelectedPeriodIds.includes(period.id);
                              return (
                                  <label
                                      key={period.id}
                                      className="period-checkbox"
                                      style={{
                                        background: isAuto && isChecked ? "#eff6ff" : "transparent",
                                        borderRadius: "6px",
                                        padding: "4px 6px",
                                        marginBottom: "2px",
                                        border: isAuto && isChecked ? "1px solid #bfdbfe" : "1px solid transparent",
                                      }}
                                  >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePeriod(period.id)}
                                    />
                                    <span>
                              {period.name} — {period.startTime?.slice(0, 5)} às {period.endTime?.slice(0, 5)}
                                      {isAuto && isChecked && (
                                          <span style={{ fontSize: "10px", marginLeft: "6px", color: "#2563eb", fontWeight: 600 }}>
                                  (auto)
                                </span>
                                      )}
                            </span>
                                  </label>
                              );
                            })}
                      </div>
                  )}

                  {/* Períodos de sábado — separados */}
                  {form.weekDays.includes("SAB") && saturdayPeriods.length > 0 && (
                      <div style={{ marginTop: "12px", borderTop: "1px dashed #e5e7eb", paddingTop: "10px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Períodos de sábado
                        </div>
                        {saturdayPeriods.map((period) => {
                          const isChecked = form.periodIds.includes(period.id);
                          return (
                              <label key={period.id} className="period-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePeriod(period.id)}
                                />
                                {period.name} — {period.startTime?.slice(0, 5)} às {period.endTime?.slice(0, 5)}
                              </label>
                          );
                        })}
                      </div>
                  )}
                </div>

                {/* Resumo dos selecionados */}
                {form.periodIds.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#374151", background: "#f9fafb", borderRadius: "6px", padding: "6px 10px" }}>
                      <strong>{form.periodIds.length}</strong> período{form.periodIds.length > 1 ? "s" : ""} selecionado{form.periodIds.length > 1 ? "s" : ""}
                      {autoSelectedPeriodIds.filter((id) => form.periodIds.includes(id)).length > 0 && (
                          <span style={{ color: "#2563eb", marginLeft: "6px" }}>
                      ({autoSelectedPeriodIds.filter((id) => form.periodIds.includes(id)).length} automáticos)
                    </span>
                      )}
                    </div>
                )}
              </div>

              <div className="form-group-reserva">
                <label>Assunto:</label>
                <input
                    type="text"
                    name="subject"
                    placeholder="Ex: Aula prática de laboratório"
                    value={form.subject}
                    onChange={handleChange}
                    required
                />
              </div>

              <div className="form-group-reserva">
                <label>Observações:</label>
                <textarea
                    name="notes"
                    placeholder="Ex: Turma precisa de equipamento específico"
                    value={form.notes}
                    onChange={handleChange}
                    rows="3"
                    style={{ fontFamily: "inherit", width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", resize: "vertical" }}
                />
              </div>

              <button type="submit" className="btn-submit-reserva" disabled={loadingSubmit}>
                {loadingSubmit ? "Enviando..." : "Reservar"}
              </button>
            </form>
          </div>
        </div>

        {showPopup && <Popup message={success} onClose={() => setShowPopup(false)} />}
        {showErrorPopup && <Popup message={error} onClose={() => setShowErrorPopup(false)} type="error" />}

        <Footer />
      </>
  );
}