import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

export default function RedefinirSenha() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");
    const isInvalid = !token;

    const [senha, setSenha] = useState("");
    const [confirma, setConfirma] = useState("");
    const [showSenha, setShowSenha] = useState(false);
    const [showConfirma, setShowConfirma] = useState(false);
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [showTokenError, setShowTokenError] = useState(false);

    function getStrength(pass) {
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    }

    const strength = getStrength(senha);
    const strengthLabels = ["", "Fraca", "Regular", "Boa", "Forte"];

    async function handleSubmit(e) {
        e.preventDefault();
        setErro("");

        if (!senha) {
            setErro("Digite a nova senha.");
            return;
        }
        if (strength < 2) {
            setErro("Senha muito fraca. Use pelo menos 8 caracteres, incluindo letras maiúsculas, números e símbolos.");
            return;
        }
        if (senha !== confirma) {
            setErro("As senhas não coincidem.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/users/password/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    newPassword: senha
                }),
            });

            if (!response.ok) {
                if (response.status === 400 || response.status === 401) {
                    setShowTokenError(true);
                    return;
                }
                throw new Error();
            }

            setSucesso(true);
        } catch {
            setErro("Erro ao redefinir senha. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    // Tela de link inválido/expirado - com nova estilização
    if (isInvalid || showTokenError) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Navbar activePage="Login" />

                <PageHero
                    tag="Segurança"
                    title="Redefinir Senha"
                    description="Link inválido ou expirado"
                />

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                    <div className="confirm-modal" style={{
                        boxShadow: "0 1px 4px rgba(0,0,0,.1)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "20px",
                        maxWidth: "500px",
                        width: "100%",
                        margin: "0 auto",
                        padding: "2rem",
                        paddingBottom: "0",
                        textAlign: "center"
                    }}>
                        <div className="confirm-icon" style={{ background: "#fee2e2", width: "64px", height: "64px" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                                 fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"
                                 strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>Link inválido ou expirado</h2>
                        <p style={{ fontSize: "1rem", lineHeight: "1.5", color: "#374151" }}>
                            O link de redefinição de senha é inválido ou já expirou.
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "#dc2626", marginTop: "8px", padding: "12px", borderRadius: "8px" }}>
                            Solicite um novo link de recuperação.
                        </p>
                        <div className="confirm-buttons" style={{ marginTop: "1.5rem" }}>
                            <button
                                className="btn-action btn-danger"
                                onClick={() => navigate("/esqueci-senha")}
                                style={{ padding: "10px 24px", fontSize: "0.9rem" }}
                            >
                                Solicitar novo link
                            </button>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    // Tela de sucesso - com nova estilização
    if (sucesso) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Navbar activePage="Login" />

                <PageHero
                    tag="Segurança"
                    title="Redefinir Senha"
                    description="Senha redefinida com sucesso"
                />

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                    <div className="confirm-modal" style={{
                        boxShadow: "0 1px 4px rgba(0,0,0,.1)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "20px",
                        maxWidth: "500px",
                        width: "100%",
                        margin: "0 auto",
                        padding: "2rem",
                        textAlign: "center"
                    }}>
                        <div className="confirm-icon" style={{ background: "#dcfce7", width: "64px", height: "64px" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                                 fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
                                 strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>Senha redefinida com sucesso!</h2>
                        <p style={{ fontSize: "1rem", lineHeight: "1.5", color: "#374151" }}>
                            Sua senha foi atualizada.
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "#16a34a", marginTop: "8px", padding: "12px", borderRadius: "8px" }}>
                            Agora você pode fazer login com sua nova senha.
                        </p>
                        <div className="confirm-buttons" style={{ marginTop: "1.5rem" }}>
                            <button
                                className="btn-action btn-success"
                                onClick={() => navigate("/")}
                                style={{ padding: "1em", fontSize: "0.9rem" }}
                            >
                                Voltar para o login
                            </button>
                        </div>
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
                title="Redefinir Senha"
                description="Crie uma nova senha segura"
            />

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="content plok" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.1)", maxWidth: "1200px", width: "100%", border: "1px solid #e5e7eb", paddingTop: "2em", paddingBottom: "2em", borderRadius: "20px", marginTop: "2em", marginBottom: "3em" }}>
                    <form onSubmit={handleSubmit} className="form-reset-senha">
                        <div className="form-group-cadastro">
                            {erro && (
                                <div style={{
                                    background: "#fee2e2",
                                    border: "1px solid #fecaca",
                                    borderRadius: "8px",
                                    padding: "12px 16px",
                                    margin: "1em 0em",
                                    color: "#b91c1c",
                                    fontSize: "0.85rem",
                                    fontWeight: 500
                                }}>
                                    {erro}
                                </div>
                            )}
                            <label>Nova senha</label>

                            <div className="input-with-icon">
                                <input
                                    type={showSenha ? "text" : "password"}
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    placeholder="Digite sua nova senha"
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowSenha(v => !v)}
                                >
                                    {showSenha ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                                            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                                            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                                            <path d="m2 2 20 20"/>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {senha.length > 0 && (
                                <div style={{
                                    fontSize: "0.7rem",
                                    color: strength >= 3 ? "#16a34a" : strength >= 2 ? "#f59e0b" : "#dc2626",
                                    marginTop: "4px",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    display: "inline-block"
                                }}>
                                    Senha: {strengthLabels[strength]}
                                </div>
                            )}
                        </div>

                        <div className="form-group-cadastro">
                            <label>Confirmar nova senha</label>

                            <div className="input-with-icon">
                                <input
                                    type={showConfirma ? "text" : "password"}
                                    value={confirma}
                                    onChange={(e) => setConfirma(e.target.value)}
                                    placeholder="Digite novamente"
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirma(v => !v)}
                                >
                                    {showConfirma ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                                            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                                            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                                            <path d="m2 2 20 20"/>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {confirma && senha !== confirma && (
                                <div style={{
                                    fontSize: "0.7rem",
                                    color: "#dc2626",
                                    marginTop: "4px",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    display: "inline-block"
                                }}>
                                    As senhas não coincidem
                                </div>
                            )}

                            <button type="submit" className="btn-submit-cadastro" disabled={loading} style={{ margin: "2em 0em", padding: "12px 24px", width: "100%", fontSize: "1rem" }}>
                                {loading ? "Salvando..." : "Salvar nova senha"}
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