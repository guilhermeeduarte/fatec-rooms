import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import Calendar from "react-calendar";

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr || "";

    const pad = (value) => String(value).padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function isActiveBooking(booking) {
    return !["CANCELLED", "REJECTED"].includes(booking.status);
}

function formatWeekdays(weekDays = []) {
    const weekdayMap = {
        MONDAY: "Seg",
        TUESDAY: "Ter",
        WEDNESDAY: "Qua",
        THURSDAY: "Qui",
        FRIDAY: "Sex",
        SATURDAY: "Sáb",
        SUNDAY: "Dom",
    };
    return weekDays.map((day) => weekdayMap[day] || day).join(", ");
}

export default function SolicitaReserva() {
    const navigate = useNavigate();

    const [modalOpen, setModalOpen] = useState(false);
    const [salas, setSalas] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [myBookings, setMyBookings] = useState([]);
    const [recurringBookings, setRecurringBookings] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [examDatesSet, setExamDatesSet] = useState(new Set());
    const [courses, setCourses] = useState([]); // Estado para armazenar os cursos
    const [date, setDate] = useState(new Date());
    const [loadingPage, setLoadingPage] = useState(true);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [showErrorPopup, setShowErrorPopup] = useState(false);

    // Suspensão de reservas
    const [bookingSuspended, setBookingSuspended] = useState(false);

    useEffect(() => {
        if (error) {
            setShowErrorPopup(true);
        }
    }, [error]);

    const [form, setForm] = useState({
        data: "", dataISO: "", espaco: "", roomId: null, motivo: "", curso: "", naoSeAplica: false,
    });
    const [selectedPeriodIds, setSelectedPeriodIds] = useState([]);
    const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }

        async function loadPageData() {
            try {
                setLoadingPage(true);
                setError(null);

                const headers = { Authorization: `Bearer ${token}` };
                const [roomsRes, bookingsRes, holidaysRes, semestersRes, coursesRes] = await Promise.all([
                    fetch("/api/rooms", { headers }),
                    fetch("/api/bookings/my", { headers }),
                    fetch("/api/holidays", { headers }),
                    fetch("/api/semesters", { headers }),
                    fetch("/api/courses", { headers }), // Buscar cursos
                ]);

                if (!roomsRes.ok) throw new Error("Falha ao carregar salas.");
                if (!bookingsRes.ok) throw new Error("Falha ao carregar suas reservas.");

                setSalas(await roomsRes.json() || []);
                setMyBookings(await bookingsRes.json() || []);

                if (holidaysRes.ok) {
                    const data = await holidaysRes.json();
                    setHolidays(Array.isArray(data) ? data : []);
                }

                // Carregar cursos
                if (coursesRes.ok) {
                    const coursesData = await coursesRes.json();
                    // Filtra apenas cursos ativos
                    const activeCourses = Array.isArray(coursesData)
                        ? coursesData.filter(course => course.active === true)
                        : [];
                    setCourses(activeCourses);
                } else {
                    console.warn("Não foi possível carregar os cursos.");
                }

                // Carrega reservas recorrentes ativas para exibição no histórico abaixo do calendário.
                try {
                    const recurringRes = await fetch("/api/recurring-bookings", { headers });
                    if (recurringRes.ok) {
                        const data = await recurringRes.json();
                        setRecurringBookings(data.content ?? data ?? []);
                    }
                } catch (err) {
                    console.warn("Não foi possível carregar reservas recorrentes.", err);
                }

                // Carregar semanas de avaliação dos semestres ativos
                if (semestersRes.ok) {
                    const semestersData = await semestersRes.json();
                    const activeSemesters = Array.isArray(semestersData) ? semestersData : (semestersData.content || []);
                    const examDates = new Set();

                    await Promise.all(
                        activeSemesters.map(async (semester) => {
                            if (semester.active !== 1) return;
                            try {
                                const examRes = await fetch(`/api/semesters/${semester.id}/exam-weeks`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                if (examRes.ok) {
                                    const weeks = await examRes.json();
                                    weeks.forEach(week => {
                                        const start = new Date(week.startDate);
                                        const end = new Date(week.endDate);
                                        const current = new Date(start);
                                        while (current <= end) {
                                            const iso = current.toISOString().split('T')[0];
                                            examDates.add(iso);
                                            current.setDate(current.getDate() + 1);
                                        }
                                    });
                                }
                            } catch (err) {
                                console.error(`Erro ao carregar exam-weeks do semestre ${semester.id}`, err);
                            }
                        })
                    );
                    setExamDatesSet(examDates);
                }

                // Verifica se as reservas estão suspensas
                try {
                    const suspResp = await fetch("/api/config/booking/suspend-teacher-bookings", { headers });
                    if (suspResp.ok) {
                        const suspData = await suspResp.json();
                        setBookingSuspended(suspData.suspended ?? false);
                    }
                } catch (err) {
                    console.warn("Erro ao verificar suspensão de reservas", err);
                }

            } catch (err) {
                setError(err.message || "Erro ao carregar a página.");
                setShowErrorPopup(true);
            } finally {
                setLoadingPage(false);
            }
        }
        loadPageData();
    }, [navigate]);

    useEffect(() => {
        if (selectedRoom && form.dataISO) fetchAvailability(selectedRoom.id, form.dataISO);
    }, [selectedRoom, form.dataISO]);

    async function fetchAvailability(roomId, dataISO) {
        if (!roomId || !dataISO) { setAvailability(null); return; }
        const token = localStorage.getItem("token");
        setLoadingAvailability(true);
        setError(null);
        try {
            const res = await fetch(`/api/bookings/availability?roomId=${roomId}&date=${dataISO}`, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error("Não foi possível carregar a disponibilidade.");
            setAvailability(await res.json());
        } catch (err) {
            setError(err.message || "Erro ao buscar disponibilidade.");
            setShowErrorPopup(true);
            setAvailability(null);
        } finally {
            setLoadingAvailability(false);
        }
    }

    const holidayDateSet = new Set(holidays.map((h) => h.holidayDate));
    const holidayByDate = {};
    holidays.forEach((h) => { holidayByDate[h.holidayDate] = h; });

    function isHolidayDate(iso) { return holidayDateSet.has(iso); }

    function getISOFromDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm(prev => {
            const next = { ...prev, [name]: type === "checkbox" ? checked : value };
            if (name === "naoSeAplica" && checked) next.curso = "";
            return next;
        });
    }

    function handlePeriodToggle(periodId) {
        setSelectedPeriodIds(prev =>
            prev.includes(periodId) ? prev.filter(id => id !== periodId) : [...prev, periodId]
        );
    }

    const roomStatusMap = myBookings.reduce((acc, booking) => {
        if (booking.bookingDate) acc[booking.bookingDate] = booking.status;
        return acc;
    }, {});

    const activeBookings = myBookings.filter(isActiveBooking);
    const activeRecurringBookings = recurringBookings.filter((booking) => booking.status === "ACTIVE");

    function handleRoomSelect(room) {
        if (!form.dataISO) { setError("Selecione uma data antes de escolher uma sala."); setShowErrorPopup(true); return; }
        setSelectedRoom(room);
        setForm(prev => ({ ...prev, espaco: room.name, roomId: room.id }));
        setSelectedPeriodIds([]);
        setPeriodDropdownOpen(false);
        setModalOpen(false);
    }

    function parseBackendError(errorText) {
        const minDaysMatch = errorText.match(/mínimo\s+(\d+)\s+dia/i);
        const earliestMatch = errorText.match(/(\d{4}-\d{2}-\d{2})/);
        if (minDaysMatch && earliestMatch) {
            const [year, month, day] = earliestMatch[1].split("-");
            return `A reserva deve ser feita com no mínimo ${minDaysMatch[1]} dia(s) de antecedência. Data mais próxima permitida: ${day}/${month}/${year}.`;
        }
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!form.roomId || selectedPeriodIds.length === 0 || !form.dataISO || !form.motivo) {
            setError("Preencha a data, sala, ao menos um período e o motivo.");
            setShowErrorPopup(true);
            return;
        }
        const selectedDate = new Date(form.dataISO + "T00:00:00");
        const today = new Date(); today.setHours(0,0,0,0);
        if (selectedDate < today) {
            setError("Não é possível fazer reservas em datas passadas.");
            setShowErrorPopup(true);
            return;
        }
        if (isHolidayDate(form.dataISO)) {
            const h = holidayByDate[form.dataISO];
            setError(`Não é possível reservar em feriados. "${h?.name || "Feriado"}" — ${form.data}.`);
            setShowErrorPopup(true);
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }

        // No handleSubmit, onde constrói o notes
        const notes = form.naoSeAplica
            ? form.motivo
            : `${form.motivo}\nCurso: ${form.curso || "-"}`;
        const body = {
            roomId: form.roomId,
            periodIds: selectedPeriodIds.map(Number),
            bookingDate: form.dataISO,
            subject: form.motivo,
            notes,
        };

        try {
            setLoadingSubmit(true);
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                let errorMessage = "Falha ao solicitar a reserva.";
                try {
                    const errorJson = await res.json();
                    errorMessage = errorJson.message || errorJson.error || errorMessage;
                } catch (e) {
                    errorMessage = await res.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }
            const totalPeriods = selectedPeriodIds.length;
            const successMessage = totalPeriods === 1
                ? "Reserva solicitada com sucesso. Aguarde aprovação."
                : `Reserva com ${totalPeriods} períodos solicitada com sucesso. Aguarde aprovação.`;
            setSuccess(successMessage);
            setShowPopup(true);
            setSelectedRoom(null);
            setAvailability(null);
            setSelectedPeriodIds([]);
            setPeriodDropdownOpen(false);
            setForm(prev => ({ ...prev, espaco: "", roomId: null, motivo: "", curso: "", naoSeAplica: false }));
            const updatedRes = await fetch("/api/bookings/my", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
            if (updatedRes.ok) setMyBookings(await updatedRes.json() || []);
        } catch (err) {
            let friendlyMessage = err.message || "Erro ao enviar a solicitação.";
            if (err.message.includes("suspended") || err.message.includes("suspensa")) {
                friendlyMessage = "As reservas estão temporariamente suspensas. Não é possível criar novas reservas no momento.";
            } else if (err.message.includes("400") || err.message.includes("Bad Request")) {
                friendlyMessage = "Operação não permitida no estado atual. Verifique se as reservas estão ativas.";
            }
            setError(friendlyMessage);
            setShowErrorPopup(true);
        } finally {
            setLoadingSubmit(false);
        }
    }

    const availablePeriods = availability?.periods?.filter(p => p.available) || [];

    if (loadingPage) return (
        <>
            <Navbar activePage="SolicitaReserva" />
            <PageHero variant="SolicitaReserva" tag="Painel Operacional" title="Solicitação de Reserva" description="Carregando..." />
            <div className="content-solicitarReserva"><div className="form-title">Carregando informações...</div></div>
            <Footer />
        </>
    );

    // Tela de bloqueio por suspensão
    if (bookingSuspended) return (
        <>
            <Navbar activePage="SolicitaReserva" />
            <PageHero
                variant="SolicitaReserva"
                tag="Painel Operacional"
                title="Solicitação de Reserva"
                description="As reservas estão temporariamente suspensas."
            />
            <div className="content-solicitarReserva">
                <div style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                }}>
                    <div style={{
                        width: "72px", height: "72px", borderRadius: "50%",
                        background: "#fee2e2", display: "flex",
                        alignItems: "center", justifyContent: "center",
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                    </div>
                    <h2 style={{ color: "#dc2626", margin: 0 }}>Reservas suspensas</h2>
                    <p style={{ color: "#555", maxWidth: "420px", margin: 0 }}>
                        O sistema de reservas está temporariamente indisponível. Entre em contato com a coordenação para mais informações.
                    </p>
                </div>
            </div>
            <Footer />
        </>
    );

    return (
        <>
            <Navbar activePage="SolicitaReserva" />
            <PageHero
                variant="SolicitaReserva"
                tag="Painel Operacional"
                title="Solicitação de Reserva"
                description="Gerencie as reservas de salas e visualize o histórico de solicitações."
            />

            <div className="content-solicitarReserva">
                <div className="div-calendario">
                    <div className="title-calendario">
                        <h3>Minhas Reservas:</h3>
                        <p>Selecione uma data para iniciar uma reserva.</p>
                    </div>

                    <Calendar
                        onChange={value => {
                            const isoDate = getISOFromDate(value);
                            const today = new Date(); today.setHours(0,0,0,0);
                            if (value < today) {
                                setError("Não é possível fazer reservas em datas passadas.");
                                setShowErrorPopup(true);
                                return;
                            }
                            if (isHolidayDate(isoDate)) {
                                setError(`Este dia é feriado: "${holidayByDate[isoDate]?.name || "Feriado"}". Selecione outra data.`);
                                setShowErrorPopup(true);
                                return;
                            }
                            setError(null);
                            setDate(value);
                            setForm(prev => ({ ...prev, data: value.toLocaleDateString("pt-BR"), dataISO: isoDate }));
                            setSelectedRoom(null);
                            setAvailability(null);
                            setSelectedPeriodIds([]);
                            setPeriodDropdownOpen(false);
                            setModalOpen(true);
                        }}
                        value={date}
                        tileDisabled={({ date: d, view }) => {
                            if (view !== "month") return false;
                            return isHolidayDate(getISOFromDate(d));
                        }}
                        tileClassName={({ date: d, view }) => {
                            if (view !== "month") return null;
                            const iso = getISOFromDate(d);
                            if (isHolidayDate(iso)) return "dia-feriado";
                            if (examDatesSet.has(iso)) return "dia-avaliacao";
                            if (iso === form.dataISO) return "dia-selecionado";
                            const st = roomStatusMap[iso];
                            if (st === "APPROVED") return "dia-aceita";
                            if (st === "PENDING") return "dia-pendente";
                            if (st === "CANCELLED") return "dia-cancelada";
                            return null;
                        }}
                        tileContent={({ date: d, view }) => {
                            if (view !== "month") return null;
                            const iso = getISOFromDate(d);
                            if (isHolidayDate(iso)) {
                                return <span title={holidayByDate[iso]?.name} style={{ fontSize: "0.6rem", display: "block", lineHeight: 1 }}></span>;
                            }
                            return null;
                        }}
                        locale="pt-BR"
                        formatShortWeekday={(locale, d) =>
                            d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
                        }
                    />

                    <div className="legenda">
                        <div><span className="box verde"></span> Aceita</div>
                        <div><span className="box amarelo"></span> Pendente</div>
                        <div><span className="box vermelho"></span> Cancelada</div>
                        <div><span className="box cinza"></span> Selecionado</div>
                        <div><span className="box laranja"></span> Feriado</div>
                        <div><span className="box magenta"></span> Avaliação</div>
                    </div>

                    <div className="reservas-feitas">
                        <h4>Horários Reservados:</h4>
                        <div className="lista-horarios">
                            {activeBookings.length === 0 && activeRecurringBookings.length === 0 && (
                                <p>Nenhuma reserva encontrada.</p>
                            )}

                            {activeBookings.map((booking) => {
                                const periods = booking.periods || [];
                                const first = periods[0];
                                const last = periods[periods.length - 1];
                                return (
                                    <p key={`booking-${booking.id}`}>
                                        <span className="hora">
                                            {formatDateTime(booking.bookingDate)} • {first?.periodStart?.slice(0, 5) || "--:--"} - {last?.periodEnd?.slice(0, 5) || "--:--"}
                                            {periods.length > 1 && ` (${periods.length} períodos)`}
                                        </span>
                                        <span className="prof">{booking.roomName}</span>
                                    </p>
                                );
                            })}

                            {activeRecurringBookings.map((booking) => {
                                const periods = booking.periods || [];
                                const first = periods[0];
                                const last = periods[periods.length - 1];
                                return (
                                    <p key={`recurring-${booking.id}`}>
                                        <span className="hora">
                                            Reserva recorrente • {formatWeekdays(booking.weekDays)} • {first?.periodStart?.slice(0, 5) || "--:--"} - {last?.periodEnd?.slice(0, 5) || "--:--"}
                                            {booking.activeInstances != null && booking.activeInstances > 0 && ` (${booking.activeInstances} instância${booking.activeInstances > 1 ? "s" : ""} ativa${booking.activeInstances > 1 ? "s" : ""})`}
                                        </span>
                                        <span className="prof">{booking.roomName}</span>
                                    </p>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {modalOpen && (
                    <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                        <div className="modal-espacos" onClick={e => e.stopPropagation()}>
                            <div className="modal-topo">
                                <h2>Espaços disponíveis</h2>
                                <button className="btn-close-modal" onClick={() => setModalOpen(false)}>×</button>
                            </div>
                            <div className="lista-salas">
                                {salas.filter(s => s.bookable === 1).map(sala => (
                                    <button key={sala.id} className="btn-sala" type="button" onClick={() => handleRoomSelect(sala)}>
                                        <span className="sala-nome">{sala.name}</span>
                                        <span className="sala-andar">{sala.location || sala.notes || "Local não informado"}</span>
                                    </button>
                                ))}
                                {salas.filter(s => s.bookable === 1).length === 0 && (
                                    <div className="sem-salas">Nenhuma sala ativa encontrada.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="div-forms-reserva">
                    <form onSubmit={handleSubmit}>

                        <div className="form-group-reserva">
                            <label>Data e espaço selecionado:</label>
                            <div className="horario">
                                <input type="text" name="data" placeholder="DD/MM/AAAA" value={form.data} readOnly style={{ backgroundColor: "#cfcccc89" }} />
                                <input type="text" name="espaco" placeholder="Selecione uma sala" value={form.espaco} readOnly style={{ backgroundColor: "#cfcccc89" }} />
                            </div>
                        </div>

                        <div className="form-group-reserva">
                            <label>Períodos disponíveis:</label>
                            <div className="period-dropdown">
                                <button
                                    type="button"
                                    className="period-dropdown-button"
                                    onClick={() => setPeriodDropdownOpen(prev => !prev)}
                                    disabled={!selectedRoom || loadingAvailability || availablePeriods.length === 0}
                                >
                                    {selectedPeriodIds.length === 0
                                        ? (loadingAvailability ? "Carregando períodos..." : "Selecione os períodos")
                                        : `${selectedPeriodIds.length} período${selectedPeriodIds.length > 1 ? "s" : ""} selecionado${selectedPeriodIds.length > 1 ? "s" : ""}`}
                                    <span className="dropdown-arrow">▾</span>
                                </button>

                                {periodDropdownOpen && (
                                    <div className="period-dropdown-options">
                                        {availablePeriods.length === 0 ? (
                                            <small>{selectedRoom ? "Nenhum período disponível para essa sala nesta data." : "Selecione uma sala para ver os períodos disponíveis."}</small>
                                        ) : (
                                            <>
                                                <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                                                    <button type="button" style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", background: "white" }} onClick={() => setSelectedPeriodIds(availablePeriods.map(p => p.periodId))}>Selecionar todos</button>
                                                    <button type="button" style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", background: "white" }} onClick={() => setSelectedPeriodIds([])}>Limpar</button>
                                                </div>
                                                {availablePeriods.map(period => (
                                                    <label key={period.periodId} className="period-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            value={period.periodId}
                                                            checked={selectedPeriodIds.includes(period.periodId)}
                                                            onChange={() => handlePeriodToggle(period.periodId)}
                                                        />
                                                        {period.periodName} — {period.startTime?.slice(0, 5)} às {period.endTime?.slice(0, 5)}
                                                    </label>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedPeriodIds.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                                    <strong>Selecionados:</strong>{" "}
                                    {availablePeriods
                                        .filter(p => selectedPeriodIds.includes(p.periodId))
                                        .sort((a, b) => a.startTime?.localeCompare(b.startTime))
                                        .map(p => `${p.startTime?.slice(0, 5)}–${p.endTime?.slice(0, 5)}`)
                                        .join(", ")}
                                </div>
                            )}
                        </div>

                        <div className="form-group-reserva">
                            <label>Motivo:</label>
                            <input type="text" name="motivo" placeholder="Descreva o motivo da reserva" value={form.motivo} onChange={handleChange} required />
                        </div>

                        <div className="form-group-reserva">
                            <label>Curso:</label>
                            <select
                                name="curso"
                                value={form.curso}
                                onChange={handleChange}
                                required={!form.naoSeAplica}
                                disabled={form.naoSeAplica}
                                style={{ backgroundColor: form.naoSeAplica ? "#cfcccc89" : "white" }}
                            >
                                <option value="">Selecione um curso</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.name}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group-reserva-check">
                            <p>Caso a reserva não se aplique a um curso, selecione a opção "Não se aplica"</p>
                            <input type="checkbox" name="naoSeAplica" checked={form.naoSeAplica} onChange={handleChange} /> Não se aplica
                        </div>

                        <button type="submit" className="btn-submit-reserva" disabled={loadingSubmit}>
                            {loadingSubmit ? "Enviando..." : "Solicitar reserva"}
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