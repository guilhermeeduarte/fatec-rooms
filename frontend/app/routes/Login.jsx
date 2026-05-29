import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
    return null;
}

export default function Login() {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ email: "", senha: "" });
    const navigate = useNavigate();

    function handleChange(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function parseLoginError(message, status) {
        if (!message || status === 401) {
            return status === 401
                ? "E-mail ou senha incorretos. Verifique seus dados e tente novamente."
                : "Erro no login. Tente novamente mais tarde.";
        }
        const text = message.toLowerCase();
        if (text.includes("usuário ou senha inválidos") || text.includes("credenciais"))
            return "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
        if (text.includes("cadastro ainda não foi aprovado") || text.includes("não foi aprovado"))
            return "Seu cadastro ainda não foi aprovado por um coordenador. Aguarde aprovação antes de entrar.";
        if (text.includes("enabled") || text.includes("bloqueado"))
            return "Sua conta está bloqueada. Entre em contato com o coordenador.";
        return message;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!form.email.trim() || !form.senha.trim()) {
            setError("Preencha e-mail e senha para continuar.");
            return;
        }

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email, password: form.senha }),
            });

            if (!response.ok) {
                let errorMessage = "Erro no login";
                try {
                    const errorData = await response.json();
                    errorMessage = parseLoginError(errorData.message || errorData.error || "", response.status);
                } catch {
                    const text = await response.text();
                    errorMessage = parseLoginError(text, response.status);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
            localStorage.setItem("authlevel", data.authlevel);
            setSubmitted(true);

            if (data.authlevel === 1) navigate("/coordenador");
            else navigate("/professor");
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <>
            <Navbar activePage="Login" />

            <PageHero
                className="page-hero-cadastro"
                tag="Área de Login"
                title="Login do Usuário"
                description="Acesse sua conta para acessar o sistema."
            />

            <div className="content plok" style={{boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px",marginTop: "2em", marginBottom: "3em"}}>
                {submitted ? (
                    <div className="success-msg">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3>Login realizado com sucesso!</h3>
                        <p>Redirecionando...</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="error-msg">
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group-cadastro">
                                <label>E-mail institucional</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Ex: joao@professor.cps.sp.gov.br"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group-cadastro">
                                <label>Senha</label>
                                <div className="input-with-icon">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="senha"
                                        placeholder="Digite sua senha"
                                        value={form.senha}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                             stroke-width="2" stroke-linecap="round"
                                                             stroke-linejoin="round"
                                                             className="lucide lucide-eye-off-icon lucide-eye-off">
                                            <path
                                                d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                                            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                                            <path
                                                d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                                            <path d="m2 2 20 20"/>
                                        </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                                      className="lucide lucide-eye-icon lucide-eye">
                                            <path
                                                d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-submit-cadastro">
                                Entrar
                            </button>
                        </form>

                        <div style={{textAlign: "center", marginTop: 8 }}>
                            <a className={"see-all"}
                                href="/esqueci-senha"
                                onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
                                onMouseOut={(e) => (e.target.style.textDecoration = "none")}
                            >
                                Esqueci minha senha
                            </a>
                        </div>
                        <div className="cadastro-link">
                            <h3>Não possui cadastro?</h3>
                            <p>Crie sua conta para começar a utilizar o sistema.</p>
                            <a href="/cadastro" className="btn-submit-cadastro">
                                Cadastrar-se
                            </a>
                        </div>
                    </>
                )}
            </div>

            <Footer />
        </>
    );
}