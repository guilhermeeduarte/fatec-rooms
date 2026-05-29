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

        if (!senha) return setErro("Digite a nova senha.");
        if (strength < 2) return setErro("Senha fraca.");
        if (senha !== confirma) return setErro("As senhas não coincidem.");

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
                throw new Error();
            }

            setSucesso(true);
        } catch {
            setErro("Erro ao redefinir senha.");
        } finally {
            setLoading(false);
        }
    }

    if (isInvalid) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Navbar activePage="Login" />

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                    <div className="confirm-modal" style={{ maxWidth: "400px", margin: "0 auto" }}>
                        <div className="confirm-icon" style={{ background: "#fee2e2" }}>
                            !
                        </div>
                        <h2>Link inválido ou expirado</h2>
                        <p>
                            O link de redefinição de senha é inválido ou já expirou.
                            <br />
                            <span style={{ fontSize: "0.8rem", color: "#dc2626", display: "block", marginTop: "8px" }}>
                                Solicite um novo link de recuperação.
                            </span>
                        </p>
                        <div className="confirm-buttons">
                            <button
                                className="btn-action btn-danger"
                                onClick={() => navigate("/esqueci-senha")}
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

    if (sucesso) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Navbar activePage="Login" />

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                    <div className="confirm-modal" style={{ maxWidth: "400px", margin: "0 auto" }}>
                        <div className="confirm-icon" style={{ background: "#dcfce7" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                                 fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
                                 strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h2>Senha redefinida com sucesso!</h2>
                        <p>
                            Sua senha foi atualizada.
                            <br />
                            <span style={{ fontSize: "0.8rem", color: "#16a34a", display: "block", marginTop: "8px" }}>
                                Agora você pode fazer login com sua nova senha.
                            </span>
                        </p>
                        <div className="confirm-buttons">
                            <button
                                className="btn-action btn-success"
                                onClick={() => navigate("/")}
                            >
                                Ir para o login
                            </button>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar activePage="Login" />

            <PageHero
                tag="Segurança"
                title="Redefinir Senha"
                description="Crie uma nova senha segura"
            />

            <div className="content">
                {erro && <div className="error-msg">{erro}</div>}

                <form onSubmit={handleSubmit} className="form-reset-senha">

                    <div className="form-group-cadastro">
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
                                {showSenha ? "🙈" : "👁️"}
                            </button>
                        </div>

                        {senha.length > 0 && (
                            <div style={{ fontSize: "0.75rem", color: strength >= 3 ? "#16a34a" : strength >= 2 ? "#f59e0b" : "#dc2626", marginTop: "4px" }}>
                                Força: {strengthLabels[strength]}
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
                                placeholder="Repita a nova senha"
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirma(v => !v)}
                            >
                                {showConfirma ? "🙈" : "👁️"}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-submit-cadastro" disabled={loading}>
                        {loading ? "Salvando..." : "Salvar nova senha"}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                    <a className="see-all" href="/">Voltar para o Login</a>
                </div>
            </div>

            <Footer />
        </div>
    );
}