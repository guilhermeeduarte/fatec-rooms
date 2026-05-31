import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import Calendar from "react-calendar";
import { LoadingState, ErrorState } from "../components/PageState";

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

const SHIFT_KEYWORDS = {
  MORNING: ["manhã", "manha"],
  AFTERNOON: ["tarde"],
  EVENING: ["noite"],
  YEAR_1: ["noite"],
  YEAR_2: ["noite"],
};

function getPeriodShift(period) {
  const name = (period.name || "").toLowerCase().replace(/\s+/g, "");
  if (name.includes("sábado") || name.includes("sabado")) return "SATURDAY";
  if (name.includes("manhã") || name.includes("manha")) return "MORNING";
  if (name.includes("tarde")) return "AFTERNOON";
  if (name.includes("noite")) return "EVENING";
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

  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

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

  const [autoSelectedPeriodIds, setAutoSelectedPeriodIds] = useState([]);

  const selectedClassGroup = classGroups.find((item) => item.id === Number(form.classGroupId));
  const selectedSemester = semesters.find((item) => item.id === Number(form.semesterId));
  const activePeriods = periods.filter((p) => p.active === 1 || p.active === true);
  const bookableRooms = rooms.filter((r) => r.bookable === 1 || r.bookable === true);
  const availableClassGroups = form.courseId
      ? classGroups.filter((g) => g.courseId === Number(form.courseId))
      : classGroups;

  const filteredPeriods = useMemo(() => {
    const hasSaturday = form.weekDays.includes("SAB");
    return activePeriods.filter((period) => {
      const isSaturdayOnly = isSaturdayOnlyPeriod(period);
      if (isSaturdayOnly) return hasSaturday;
      return true;
    });
  }, [activePeriods, form.weekDays]);

  const shiftPeriods = useMemo(() => {
    if (!selectedClassGroup) return [];
    const shift = selectedClassGroup.shift;
    return activePeriods.filter((p) => {
      if (isSaturdayOnlyPeriod(p)) return false;
      const ps = getPeriodShift(p);
      if (shift === "MORNING") return ps === "MORNING";
      if (shift === "AFTERNOON") return ps === "AFTERNOON";
      if (shift === "EVENING" || shift === "YEAR_1" || shift === "YEAR_2") return ps === "EVENING";
      return false;
    });
  }, [selectedClassGroup, activePeriods]);

  const [filterCourse, setFilterCourse] = useState("");
// Agrupar reservas por curso para contagem
  const reservationsByCourse = useMemo(() => {
    const counts = {};
    recurringBookings.forEach(item => {
      const courseName = item.courseName || "Sem curso";
      if (!counts[courseName]) {
        counts[courseName] = 0;
      }
      counts[courseName]++;
    });
    return counts;
  }, [recurringBookings]);

// Filtrar reservas por curso
  const filteredRecurringBookings = useMemo(() => {
    if (!filterCourse) return recurringBookings;
    return recurringBookings.filter(item =>
        (item.courseName || "Sem curso") === filterCourse
    );
  }, [recurringBookings, filterCourse]);

// Total de cursos distintos
  const totalCourses = Object.keys(reservationsByCourse).length;

  useEffect(() => {
    if (!selectedClassGroup) {
      setAutoSelectedPeriodIds([]);
      return;
    }

    // Períodos normais do turno (Manhã/Tarde/Noite)
    const shiftPeriodIds = shiftPeriods.map((p) => p.id);

    // Períodos de sábado (sempre adicionar se hasSaturday for true)
    let saturdayPeriodIds = [];
    if (selectedClassGroup.hasSaturday === true) {
      saturdayPeriodIds = activePeriods
          .filter((p) => isSaturdayOnlyPeriod(p))
          .map((p) => p.id);
    }

    // IDs de todos os períodos pré-selecionados (turno + sábado)
    const allAutoIds = [...shiftPeriodIds, ...saturdayPeriodIds];
    setAutoSelectedPeriodIds(allAutoIds);

    // Dias da semana (sábado incluso se tiver)
    const defaultDays = ["SEG", "TER", "QUA", "QUI", "SEX"];
    const autoWeekDays = selectedClassGroup.hasSaturday === true
        ? [...defaultDays, "SAB"]
        : [...defaultDays];

    setForm((prev) => ({
      ...prev,
      weekDays: autoWeekDays,
      periodIds: allAutoIds,
    }));
  }, [form.classGroupId]); // eslint-disable-line

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
    const canUseSaturday = selectedClassGroup && selectedClassGroup.hasSaturday === true;
    if (code === "SAB" && !canUseSaturday) return;

    setForm((prev) => {
      const alreadySelected = prev.weekDays.includes(code);
      let newWeekDays = alreadySelected
          ? prev.weekDays.filter((d) => d !== code)
          : [...prev.weekDays, code];

      let newPeriodIds = [...prev.periodIds];

      if (code === "SAB" && !alreadySelected && canUseSaturday) {
        const saturdayIds = activePeriods.filter((p) => isSaturdayOnlyPeriod(p)).map((p) => p.id);
        newPeriodIds = [...new Set([...newPeriodIds, ...saturdayIds])];
      }

      if (code === "SAB" && alreadySelected) {
        const saturdayIds = activePeriods.filter((p) => isSaturdayOnlyPeriod(p)).map((p) => p.id);
        newPeriodIds = newPeriodIds.filter((id) => !saturdayIds.includes(id));
      }

      return { ...prev, weekDays: newWeekDays, periodIds: newPeriodIds };
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
        if (isAutoSelected) {
          setAutoSelectedPeriodIds((ids) => ids.filter((id) => id !== periodId));
        }
        return { ...prev, periodIds: prev.periodIds.filter((id) => id !== periodId) };
      }
      return { ...prev, periodIds: [...prev.periodIds, periodId] };
    });
  }

  function selectAllShiftPeriods() {
    // Períodos normais do turno
    const shiftPeriodIds = shiftPeriods.map((p) => p.id);

    // Períodos de sábado
    let saturdayPeriodIds = [];
    if (selectedClassGroup?.hasSaturday === true) {
      saturdayPeriodIds = activePeriods
          .filter((p) => isSaturdayOnlyPeriod(p))
          .map((p) => p.id);
    }

    const allAutoIds = [...shiftPeriodIds, ...saturdayPeriodIds];
    setAutoSelectedPeriodIds(allAutoIds);

    const defaultDays = ["SEG", "TER", "QUA", "QUI", "SEX"];
    const autoWeekDays = selectedClassGroup?.hasSaturday === true
        ? [...defaultDays, "SAB"]
        : [...defaultDays];

    setForm((prev) => ({
      ...prev,
      weekDays: autoWeekDays,
      periodIds: allAutoIds,
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

  const shiftLabel = useMemo(() => {
    if (!selectedClassGroup) return null;
    const map = {
      MORNING: "Manhã",
      AFTERNOON: "Tarde",
      EVENING: "Noite",
      YEAR_1: "1º Ano (Noite)",
      YEAR_2: "2º Ano (Noite)",
    };
    return map[selectedClassGroup.shift] || selectedClassGroup.shift;
  }, [selectedClassGroup]);

  const saturdayPeriods = useMemo(
      () => activePeriods.filter(isSaturdayOnlyPeriod),
      [activePeriods]
  );

  // Função para tentar recarregar os dados
  const handleRetry = () => {
    setLoadingPage(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    async function loadData() {
      try {
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
  };

  // Estado de loading
  if (loadingPage) {
    return (
        <LoadingState
            activePage="ReservaRecorrente"
            heroTag="Painel Operacional"
            heroTitle="Reserva Recorrente"
            heroDescription="Cadastre reservas recorrentes para turmas durante o semestre."
            description="Carregando informações..."
        />
    );
  }

  // Estado de erro
  if (error) {
    return (
        <ErrorState
            error={error}
            title="Erro ao carregar página"
            onRetry={handleRetry}
            onBack={() => navigate("/")}
            activePage="ReservaRecorrente"
            heroTag="Painel Operacional"
            heroTitle="Reserva Recorrente"
            heroDescription="Cadastre reservas recorrentes para turmas durante o semestre."
        />
    );
  }

  return (
      <>
        <Navbar activePage="ReservaRecorrente" />
        <PageHero
            variant="SolicitaReserva"
            tag="Painel Operacional"
            title="Reserva Recorrente"
            description="Cadastre reservas recorrentes para turmas durante o semestre."
        />

        <div className="content-solicitarReserva" style={{background: "#FAFAFA"}}>

          {/* PAINEL ESQUERDO — calendário */}
          <div className="div-calendario" style={{boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px"}}>
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

                  // Verifica se o dia está selecionado
                  const code = jsDoWToCode[d.getDay()];
                  if (code && form.weekDays.includes(code)) {
                    return "dia-recorrente2"; // Classe que pinta o quadrado
                  }
                  return null;
                }}
                tileContent={null}
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

            <div className="reservas-feitas2" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <h4 style={{ margin: 0 }}>
                  Reservas Cadastradas: {filteredRecurringBookings.length}
                </h4>

                {/* Filtro por curso */}
                {totalCourses > 0 && (
                    <select
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid #6B6B6B",
                          color: "#1A1A1A",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "0.8rem",
                          background: "white",
                          cursor: "pointer",
                        }}
                        className={"sozinho"}
                    >
                      <option value="">Todos os cursos</option>
                      {Object.entries(reservationsByCourse).map(([course, count]) => (
                          <option key={course} value={course}>
                            {course} ({count})
                          </option>
                      ))}
                    </select>
                )}
              </div>

              <div className="lista-horarios" style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "300px",
                overflowY: "auto",
                paddingRight: "4px"
              }}>
                {filteredRecurringBookings.length === 0 ? (
                    <div style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#6b7280",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      fontSize: "0.85rem"
                    }}>
                      {filterCourse
                          ? `Nenhuma reserva encontrada para o curso "${filterCourse}".`
                          : "Nenhuma reserva recorrente cadastrada."}
                    </div>
                ) : (
                    filteredRecurringBookings.map((item) => (
                        <div key={item.id} style={{
                          background: "#fafafa",
                          boxShadow: "0 1px 4px rgba(0,0,0,.1)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          transition: "all 0.2s"
                        }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            color: "#1f2937",
                            marginBottom: "4px"
                          }}>
                            {item.classGroupLabel || "Turma não definida"}
                          </div>
                          <div style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px"
                          }}>
                            <span>{item.roomName || "Sala não definida"}</span>
                            <span style={{
                              background: "#e5e7eb",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "0.65rem"
                            }}>
              {item.weekDays?.length || 0} dias na semana
            </span>
                          </div>
                        </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO — formulário */}
          <div className="div-forms-reserva" style={{boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px"}}>
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
                    const disabled = dia === "SAB" && (!selectedClassGroup || selectedClassGroup.hasSaturday !== true);
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
                              border: selected ? "2px solid #dc2626" : "1px solid #d1d5db",
                              backgroundColor: selected ? "#fecaca" : disabled ? "#e5e7eb" : "white",
                              color: selected ? "#991b1b" : disabled ? "#9ca3af" : "#374151",
                              fontWeight: selected ? 600 : 400,
                              cursor: disabled ? "not-allowed" : "pointer",
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
              <div className="form-group-periodo">
                <label>Períodos:</label>

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
      <span style={{ fontSize: "0.8rem", color: "#1d4ed8" }}>
        ✓ Períodos e dias do turno da <strong>{shiftLabel}</strong> pré-selecionados automaticamente.
      </span>
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

                {/* Dropdown de períodos */}
                <div className="period-dropdown">
                  <button
                      type="button"
                      className="period-dropdown-button"
                      onClick={() => setPeriodDropdownOpen(prev => !prev)}
                      disabled={!selectedClassGroup}
                  >
                    {form.periodIds.length === 0
                        ? "Selecione os períodos"
                        : `${form.periodIds.length} período${form.periodIds.length > 1 ? "s" : ""} selecionado${form.periodIds.length > 1 ? "s" : ""}`}
                    <span className="dropdown-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                         className="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                  </button>

                  {periodDropdownOpen && (
                      <div className="period-dropdown-options">
                        {!selectedClassGroup ? (
                            <small>Selecione uma turma para ver os períodos disponíveis.</small>
                        ) : (
                            <>
                              <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", background: "white" }}
                                    onClick={() => {
                                      const shiftIds = shiftPeriods.map((p) => p.id);
                                      const satIds = form.weekDays.includes("SAB")
                                          ? activePeriods.filter(isSaturdayOnlyPeriod).map((p) => p.id)
                                          : [];
                                      setForm((prev) => ({ ...prev, periodIds: [...new Set([...shiftIds, ...satIds])] }));
                                    }}
                                >
                                  Selecionar todos do turno
                                </button>
                                <button
                                    type="button"
                                    style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", background: "white" }}
                                    onClick={() => {
                                      const allIds = activePeriods.map((p) => p.id);
                                      setForm((prev) => ({ ...prev, periodIds: [...new Set([...allIds])] }));
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

                              {/* Agrupar períodos por turno */}
                              {["MORNING", "AFTERNOON", "EVENING"].map((shiftType) => {
                                const shiftPeriodsList = activePeriods.filter(p =>
                                    !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === shiftType
                                );
                                if (shiftPeriodsList.length === 0) return null;

                                const shiftDisplayName =
                                    shiftType === "MORNING" ? "Manhã" :
                                        shiftType === "AFTERNOON" ? "Tarde" : "Noite";

                                const isAutoShift = selectedClassGroup?.shift === shiftType;

                                return (
                                    <div key={shiftType}>
                                      <div style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: isAutoShift ? "#16a34a" : "#6b7280",
                                        marginTop: "8px",
                                        marginBottom: "6px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                      }}>
                                        {shiftDisplayName}
                                        {isAutoShift && (
                                            <span style={{ fontSize: "9px", background: "#dcfce7", color: "#16a34a", padding: "2px 6px", borderRadius: "10px" }}>
                      turno da turma
                    </span>
                                        )}
                                      </div>

                                      {shiftPeriodsList.map((period) => {
                                        const isChecked = form.periodIds.includes(period.id);
                                        const isAuto = isAutoShift && autoSelectedPeriodIds.includes(period.id);
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
                                );
                              })}

                              {/* Períodos de sábado */}
                              {saturdayPeriods.length > 0 && (
                                  <>
                                    <div style={{
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: "#6b7280",
                                      marginTop: "12px",
                                      marginBottom: "6px",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px"
                                    }}>Sábado
                                    </div>
                                    {saturdayPeriods.map((period) => {
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
                                  </>
                              )}
                            </>
                        )}
                      </div>
                  )}
                </div>

                {/* Resumo dos períodos selecionados */}
                {form.periodIds.length > 0 && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#1d4ed8", marginBottom: "6px" }}>
                        Período{form.periodIds.length !== 1 ? "s" : ""} selecionado{form.periodIds.length !== 1 ? "s" : ""}:
                      </div>

                      {/* Manhã */}
                      {activePeriods.filter(p => form.periodIds.includes(p.id) && !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === "MORNING").length > 0 && (
                          <>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#1d4ed8", marginTop: "11px", marginBottom: "4px" }}> </div>
                            {activePeriods
                                .filter((p) => form.periodIds.includes(p.id) && !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === "MORNING")
                                .sort((a, b) => a.startTime?.localeCompare(b.startTime))
                                .map((p) => (
                                    <div key={p.id} style={{ fontSize: "14px", color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontWeight: 600, minWidth: "35px" }}>{p.name || p.periodName}</span>
                                      <span style={{ color: "#1d4ed8" }}>
                {p.startTime?.slice(0, 5)} <span style={{ fontWeight: 500 }}>até</span> {p.endTime?.slice(0, 5)}
              </span>
                                    </div>
                                ))}
                          </>
                      )}

                      {/* Tarde */}
                      {activePeriods.filter(p => form.periodIds.includes(p.id) && !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === "AFTERNOON").length > 0 && (
                          <>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#3b82f6", marginTop: "11px", marginBottom: "4px" }}> </div>
                            {activePeriods
                                .filter((p) => form.periodIds.includes(p.id) && !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === "AFTERNOON")
                                .sort((a, b) => a.startTime?.localeCompare(b.startTime))
                                .map((p) => (
                                    <div key={p.id} style={{ fontSize: "14px", color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontWeight: 600, minWidth: "35px" }}>{p.name || p.periodName}</span>
                                      <span style={{ color: "#1d4ed8" }}>
                {p.startTime?.slice(0, 5)} <span style={{ fontWeight: 500 }}>até</span> {p.endTime?.slice(0, 5)}
              </span>
                                    </div>
                                ))}
                          </>
                      )}

                      {/* Noite */}
                      {activePeriods.filter(p => form.periodIds.includes(p.id) && !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === "EVENING").length > 0 && (
                          <>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#a855f7", marginTop: "11px", marginBottom: "4px" }}> </div>
                            {activePeriods
                                .filter((p) => form.periodIds.includes(p.id) && !isSaturdayOnlyPeriod(p) && getPeriodShift(p) === "EVENING")
                                .sort((a, b) => a.startTime?.localeCompare(b.startTime))
                                .map((p) => (
                                    <div key={p.id} style={{ fontSize: "14px", color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontWeight: 600, minWidth: "35px" }}>{p.name || p.periodName}</span>
                                      <span style={{ color: "#1d4ed8" }}>
                {p.startTime?.slice(0, 5)} <span style={{ fontWeight: 500 }}>até</span> {p.endTime?.slice(0, 5)}
              </span>
                                    </div>
                                ))}
                          </>
                      )}

                      {/* Sábado */}
                      {activePeriods.filter(p => form.periodIds.includes(p.id) && isSaturdayOnlyPeriod(p)).length > 0 && (
                          <>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", marginTop: "11px", marginBottom: "4px" }}> </div>
                            {activePeriods
                                .filter((p) => form.periodIds.includes(p.id) && isSaturdayOnlyPeriod(p))
                                .sort((a, b) => a.startTime?.localeCompare(b.startTime))
                                .map((p) => (
                                    <div key={p.id} style={{ fontSize: "14px", color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontWeight: 600, minWidth: "35px" }}>{p.name || p.periodName}</span>
                                      <span style={{ color: "#1d4ed8" }}>
                {p.startTime?.slice(0, 5)} <span style={{ fontWeight: 500 }}>até</span> {p.endTime?.slice(0, 5)}
              </span>
                                    </div>
                                ))}
                          </>
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