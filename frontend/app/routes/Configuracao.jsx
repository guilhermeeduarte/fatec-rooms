import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import { CalendarCheck,Clock, Users, Bell, ShieldCheck, ChevronRight } from "lucide-react";

const API_URL = "/api";

export default function Configuracao() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [prazo, setPrazo] = useState(7);
    const [editando, setEditando] = useState(false);
    const [valorTemp, setValorTemp] = useState(prazo);

    const token = localStorage.getItem("token");
    const authlevel = localStorage.getItem("authlevel");

    useEffect(() => {
        // Verificar se é coordenador
        if (authlevel !== "1") {
            navigate("/");
            return;
        }

        async function fetchConfig() {
            try {
                const response = await fetch(`${API_URL}/config/booking/min-advance-days`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Erro ao carregar configurações");
                }

                const data = await response.json();
                setPrazo(data.days || 7);
                setValorTemp(data.days || 7);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchConfig();
    }, [navigate, token, authlevel]);

    const handleSalvar = async () => {
        if (valorTemp < 1) return;
        
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_URL}/config/booking/min-advance-days`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ days: valorTemp }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao salvar configuração");
            }

            const data = await response.json();
            setPrazo(data.days);
            setEditando(false);
            setSuccess("Configuração salva com sucesso!");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelar = () => {
        setValorTemp(prazo);
        setEditando(false);
        setError(null);
        setSuccess(null);
    };

    if (loading) {
        return (
            <>
                <Navbar activePage="configuracao" />
                <div className="content">Carregando configurações...</div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar activePage="configuracao" />

            <PageHero
                className="page-hero"
                tag="Área de Configuração"
                title="Configurações do sistema"
                description="Gerencie suas preferências e configurações do sistema."
            />

            <div className="content-config">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {/* CARD */}
                <h2 className="secao-titulo">Reservas</h2>

                <div className="card">

                    {/* LADO ESQUERDO */}
                    <div className="card-left">
                    
                        <div className="icon-box">
                            <CalendarCheck size={28} />
                        </div>

                        <div className="card-info">
                            <h3>Prazo de antecedência</h3>
                            <p>
                            Defina com quantos dias de antecedência uma sala pode ser reservada
                            </p>
                        </div>

                    </div>

                    {/* LADO DIREITO */}
                    {!editando ? (
                    <div className="card-right">
                        <span className="badge">{prazo} dias</span>

                        <button className="btn-editar" onClick={() => setEditando(true)}>
                        Editar
                        </button>
                    </div>
                    ) : (
                    <div className="card-right">
                        <div className="input-group">
                            <input
                                type="number"
                                value={valorTemp}
                                onChange={(e) => setValorTemp(Number(e.target.value))}
                                min="1"
                            />
                            <span>dias</span>
                        </div>

                        <div className="botoes">
                            <button className="btn-cancelar" onClick={handleCancelar} disabled={saving}>
                                Cancelar
                            </button>
                            <button className="btn-salvar" onClick={handleSalvar} disabled={saving}>
                                {saving ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                    )}
                </div>

                {/* Outras configuraçoes */}

                <h2 className="secao-titulo">Outras configurações</h2>

                <div className="outras-config">

                <div className="config-grid">

                    <div className="config-item">
                    <div className="config-left">
                        <div className="icon-box">
                        <Clock size={22} />
                        </div>
                        <div>
                        <h4>Horários de funcionamento</h4>
                        <p>Defina os horários e dias disponíveis para reservas.</p>
                        </div>
                    </div>

                    <ChevronRight />
                    </div>

                    <div className="config-item">
                    <div className="config-left">
                        <div className="icon-box">
                        <Users size={22} />
                        </div>
                        <div>
                        <h4>Restrições de reservas</h4>
                        <p>Configure limites e regras de utilização.</p>
                        </div>
                    </div>

                    <ChevronRight />
                    </div>

                    <div className="config-item">
                    <div className="config-left">
                        <div className="icon-box">
                        <Bell size={22} />
                        </div>
                        <div>
                        <h4>Notificações</h4>
                        <p>Gerencie avisos e comunicações do sistema.</p>
                        </div>
                    </div>

                    <ChevronRight />
                    </div>

                    <div className="config-item">
                    <div className="config-left">
                        <div className="icon-box">
                        <ShieldCheck size={22} />
                        </div>
                        <div>
                        <h4>Permissões</h4>
                        <p>Configure quem pode reservar e aprovar.</p>
                        </div>
                    </div>

                    <ChevronRight />
                    </div>

                </div>
                </div>
            </div>




            <Footer />


        </>


    );

}