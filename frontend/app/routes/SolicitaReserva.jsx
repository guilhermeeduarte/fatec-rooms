import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Calendar from "react-calendar";

export default function SolicitaReserva() {
    const navigate = useNavigate();

    const [modalOpen, setModalOpen] = useState(false);
    const [salas, setSalas] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [myBookings, setMyBookings] = useState([]);
    const [date, setDate] = useState(new Date());
    const [loadingPage, setLoadingPage] = useState(true);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [form, setForm] = useState({
        data: "",
        dataISO: "",
        espaco: "",
        roomId: null,
        periodId: "",
        motivo: "",
        curso: "",
        disciplina: "",
        naoSeAplica: false,
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        async function loadPageData() {
            try {
                setLoadingPage(true);
                setError(null);

                const [roomsResponse, bookingsResponse] = await Promise.all([
                    fetch("/api/rooms", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }),
                    fetch("/api/bookings/my", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }),
                ]);

                if (!roomsResponse.ok) {
                    throw new Error("Falha ao carregar salas.");
                }
                if (!bookingsResponse.ok) {
                    throw new Error("Falha ao carregar suas reservas.");
                }

                const roomsData = await roomsResponse.json();
                const bookingsData = await bookingsResponse.json();

                setSalas(roomsData || []);
                setMyBookings(bookingsData || []);
            } catch (err) {
                setError(err.message || "Erro ao carregar a página.");
            } finally {
                setLoadingPage(false);
            }
        }

        loadPageData();
    }, [navigate]);

    useEffect(() => {
        if (selectedRoom && form.dataISO) {
            fetchAvailability(selectedRoom.id, form.dataISO);
        }
    }, [selectedRoom, form.dataISO]);

    async function fetchAvailability(roomId, dataISO) {
        if (!roomId || !dataISO) {
            setAvailability(null);
            return;
        }

        const token = localStorage.getItem("token");
        setLoadingAvailability(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/bookings/availability?roomId=${roomId}&date=${dataISO}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Não foi possível carregar a disponibilidade.");
            }

            const data = await response.json();
            setAvailability(data);
        } catch (err) {
            setError(err.message || "Erro ao buscar disponibilidade.");
            setAvailability(null);
        } finally {
            setLoadingAvailability(false);
        }
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        setForm((prev) => {
            const next = {
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            };

            if (name === "naoSeAplica" && checked) {
                next.curso = "";
                next.disciplina = "";
            }

            return next;
        });
    }

    const roomStatusMap = myBookings.reduce((acc, booking) => {
        if (booking.bookingDate) {
            acc[booking.bookingDate] = booking.status;
        }
        return acc;
    }, {});

    function handleRoomSelect(room) {
        const dataISO = form.dataISO;
        if (!dataISO) {
            setError("Selecione uma data antes de escolher uma sala.");
            return;
        }

        setSelectedRoom(room);
        setForm((prev) => ({
            ...prev,
            espaco: room.name,
            roomId: room.id,
            periodId: "",
        }));
        setModalOpen(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!form.roomId || !form.periodId || !form.dataISO || !form.motivo) {
            setError("Preencha a data, sala, período e o motivo para solicitar a reserva.");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        const notes = form.naoSeAplica
            ? "Não se aplica"
            : [`Curso: ${form.curso || "-"}`, `Disciplina: ${form.disciplina || "-"}`].join(" | ");

        const body = {
            roomId: form.roomId,
            periodId: Number(form.periodId),
            bookingDate: form.dataISO,
            subject: form.motivo,
            notes,
        };

        try {
            setLoadingSubmit(true);
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Falha ao solicitar a reserva.");
            }

            const booking = await response.json();
            setSuccess("Reserva solicitada com sucesso. Aguarde aprovação.");
            setSelectedRoom(null);
            setAvailability(null);
            setForm((prev) => ({
                ...prev,
                espaco: "",
                roomId: null,
                periodId: "",
                motivo: "",
                curso: "",
                disciplina: "",
                naoSeAplica: false,
            }));
            await loadMyBookings(token);
        } catch (err) {
            setError(err.message || "Erro ao enviar a solicitação.");
        } finally {
            setLoadingSubmit(false);
        }
    }

    async function loadMyBookings(token) {
        try {
            const response = await fetch("/api/bookings/my", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Falha ao carregar suas reservas.");
            }

            const data = await response.json();
            setMyBookings(data || []);
        } catch (err) {
            setError(err.message || "Erro ao atualizar reservas.");
        }
    }

    const availablePeriods = availability?.periods?.filter((period) => period.available) || [];

    if (loadingPage) {
        return (
            <>
                <Navbar activePage="SolicitaReserva" />
                <PageHero
                    variant="SolicitaReserva"
                    tag="Painel Operacional"
                    title="Solicitação de Reserva"
                    description="Carregando dados de salas e reservas..."
                />
                <div className="content-solicitarReserva">
                    <div className="form-title">Carregando informações...</div>
                </div>
                <Footer />
            </>
        );
    }

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
                        onChange={(value) => {
                            setDate(value);
                            const dataISO = value.toISOString().split("T")[0];

                            setForm((prev) => ({
                                ...prev,
                                data: value.toLocaleDateString("pt-BR"),
                                dataISO,
                            }));
                            setSelectedRoom(null);
                            setAvailability(null);
                            setModalOpen(true);
                        }}
                        value={date}
                        tileClassName={({ date }) => {
                            const dataISO = date.toISOString().split("T")[0];
                            if (dataISO === form.dataISO) return "dia-selecionado";

                            const status = roomStatusMap[dataISO];
                            if (status === "APPROVED") return "dia-aceita";
                            if (status === "PENDING") return "dia-pendente";
                            if (status === "CANCELLED") return "dia-cancelada";
                            return null;
                        }}
                        locale="pt-BR"
                        formatShortWeekday={(locale, date) =>
                            date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
                        }
                    />

                    <div className="legenda">
                        <div><span className="box verde"></span> Aceita</div>
                        <div><span className="box amarelo"></span> Pendente</div>
                        <div><span className="box vermelho"></span> Cancelada</div>
                        <div><span className="box cinza"></span> Selecionado</div>
                    </div>

                    <div className="reservas-feitas">
                        <h4>Horários Reservados:</h4>
                        <div className="lista-horarios">
                            {myBookings.map((booking) => (
                                <p key={booking.id}>
                                    <span className="hora">
                                        {booking.bookingDate} • {booking.periodStart?.slice(0, 5) || "--:--"} - {booking.periodEnd?.slice(0, 5) || "--:--"}
                                    </span>
                                    <span className="prof">{booking.roomName}</span>
                                </p>
                            ))}
                            {myBookings.length === 0 && <p>Nenhuma reserva encontrada.</p>}
                        </div>
                    </div>
                </div>

                {modalOpen && (
                    <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                        <div className="modal-espacos" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-topo">
                                <h2>Espaços disponíveis</h2>
                                <button
                                    className="btn-close-modal"
                                    onClick={() => setModalOpen(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="lista-salas">
                                {salas.filter((sala) => sala.bookable === 1).map((sala) => (
                                    <button
                                        key={sala.id}
                                        className="btn-sala"
                                        type="button"
                                        onClick={() => handleRoomSelect(sala)}
                                    >
                                        <span className="sala-nome">{sala.name}</span>
                                        <span className="sala-andar">{sala.location || sala.notes || "Local não informado"}</span>
                                    </button>
                                ))}

                                {salas.filter((sala) => sala.bookable === 1).length === 0 && (
                                    <div className="sem-salas">
                                        Nenhuma sala ativa encontrada.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="div-forms-reserva">
                    <form onSubmit={handleSubmit}>
                        {error && <div className="form-title" style={{ color: "#b91c1c" }}>{error}</div>}
                        {success && <div className="form-title" style={{ color: "#166534" }}>{success}</div>}

                        <div className="form-group-reserva">
                            <label>Data e espaço selecionado:</label>
                            <div className="horario">
                                <input
                                    type="text"
                                    name="data"
                                    placeholder="DD/MM/AAAA"
                                    value={form.data}
                                    readOnly
                                    style={{ backgroundColor: "#cfcccc89" }}
                                />
                                <input
                                    type="text"
                                    name="espaco"
                                    placeholder="Selecione uma sala"
                                    value={form.espaco}
                                    readOnly
                                    style={{ backgroundColor: "#cfcccc89" }}
                                />
                            </div>
                        </div>

                        <div className="form-group-reserva">
                            <label>Período disponível:</label>
                            <select
                                name="periodId"
                                value={form.periodId}
                                onChange={handleChange}
                                disabled={!selectedRoom || loadingAvailability || availablePeriods.length === 0}
                            >
                                <option value="">Escolha um período</option>
                                {availablePeriods.map((period) => (
                                    <option key={period.periodId} value={period.periodId}>
                                        {period.periodName} — {period.startTime?.slice(0, 5)} às {period.endTime?.slice(0, 5)}
                                    </option>
                                ))}
                            </select>
                            {selectedRoom && !loadingAvailability && availablePeriods.length === 0 && (
                                <small>Nenhum período disponível para essa sala nesta data.</small>
                            )}
                        </div>

                        <div className="form-group-reserva">
                            <label>Motivo:</label>
                            <input
                                type="text"
                                name="motivo"
                                placeholder="Descreva o motivo da reserva"
                                value={form.motivo}
                                onChange={handleChange}
                                required
                            />
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
                                <option value="dsm">Desenvolvimento de Software Multiplataforma</option>
                                <option value="admin">Administração</option>
                                <option value="rh">Recursos Humanos</option>
                                <option value="ads">Análise e Desenvolvimento de Sistemas</option>
                                <option value="comex">Comércio Exterior</option>
                            </select>
                        </div>

                        <div className="form-group-reserva">
                            <label>Disciplina:</label>
                            <select
                                name="disciplina"
                                value={form.disciplina}
                                onChange={handleChange}
                                required={!form.naoSeAplica}
                                disabled={form.naoSeAplica}
                                style={{ backgroundColor: form.naoSeAplica ? "#cfcccc89" : "white" }}
                            >
                                <option value="">Selecione uma disciplina</option>
                                <option value="bd1">Banco de Dados I</option>
                                <option value="web2">Desenvolvimento Web II</option>
                                <option value="es1">Engenharia de Software I</option>
                                <option value="todas">Todas disciplinas do curso</option>
                            </select>
                        </div>

                        <div className="form-group-reserva-check">
                            <p>Caso a reserva não se aplique a um curso/disciplina, selecione a opção "Não se aplica"</p>
                            <input
                                type="checkbox"
                                name="naoSeAplica"
                                checked={form.naoSeAplica}
                                onChange={handleChange}
                            /> Não se aplica
                        </div>

                        <button type="submit" className="btn-submit-reserva" disabled={loadingSubmit}>
                            {loadingSubmit ? "Enviando..." : "Solicitar reserva"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </>
    );
}
