import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

export default function EsqueciSenha() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro("");

        if (!email) {
            return setErro("Digite seu email.");
        }

        setLoading(true);

        try {
            const response = await fetch("/api/users/password/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error();
            }

            setSucesso(true);
        } catch {
            setErro("Erro ao enviar solicitação. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    // Tela de sucesso
    if (sucesso) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Navbar activePage="Login" />

                <PageHero
                    tag="Segurança"
                    title="Verifique seu email"
                    description="Enviamos um link de recuperação para sua caixa de entrada"
                />

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem"}}>
                    <div className="confirm-modal" style={{
                        boxShadow: "0 1px 4px rgba(0,0,0,.1)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "20px",
                        maxWidth: "500px",
                        width: "100%",
                        margin: "0 auto",
                        padding: "2rem",
                        paddingBottom: "0",
                    }}>
                        <div className="confirm-icon" style={{ background: "#dcfce7", width: "64px", height: "64px" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                                 fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
                                 strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>Solicitação enviada!</h2>
                        <p style={{ fontSize: "1rem", lineHeight: "1.5", color: "#374151" }}>
                            Enviamos um link de recuperação para <strong>{email}</strong>.
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "#16a34a", marginTop: "8px", padding: "12px", borderRadius: "8px" }}>
                            Verifique sua caixa de entrada e também o spam.
                        </p>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    // Tela do formulário
    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar activePage="Login" />

            <PageHero
                tag="Segurança"
                title="Esqueci minha senha"
                description="Informe seu email para receber o link de recuperação"
            />

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="content plok" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px", marginBottom: "3em", width: "100%", maxWidth: "800px" }}>
                    {erro && <div className="error-msg">{erro}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group-cadastro">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Digite seu email"
                                required
                            />

                            <button
                                type="submit"
                                className="btn-submit-cadastro"
                                disabled={loading}
                                style={{ width: "100%", marginTop: "1rem" }}
                            >
                                {loading ? "Enviando..." : "Enviar link de recuperação"}
                            </button>

                            <div style={{ textAlign: "center", marginTop: "1em" }}>
                                <a className="see-all" href="/">Voltar para o Login</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <Footer />
        </div>
    );
}