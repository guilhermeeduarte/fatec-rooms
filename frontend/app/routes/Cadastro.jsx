import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
    return null;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const DOMINIOS_PERMITIDOS = [
    "professor.cps.sp.gov.br",
    "cps.sp.gov.br",
    "fatec.sp.gov.br",
    "gmail.com",
];

function validateEmail(email) {
    if (!email || email.trim().length === 0) {
        return "Informe seu e-mail institucional.";
    }
    if (email.includes("..")) {
        return "O e-mail não pode conter pontos consecutivos.";
    }
    if (!EMAIL_REGEX.test(email)) {
        return "Formato de e-mail inválido (ex: joao@professor.cps.sp.gov.br).";
    }
    const domain = email.split("@")[1].toLowerCase();
    if (!DOMINIOS_PERMITIDOS.includes(domain)) {
        return "Apenas e-mails institucionais são permitidos (ex: joao@professor.cps.sp.gov.br).";
    }
    return null;
}

function validateNome(nome) {
    const parts = nome.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Informe seu nome completo.";
    if (parts.length < 2) return "Informe nome e sobrenome (ex: João Silva).";
    if (parts.some((p) => p.length < 2)) return "Cada parte do nome deve ter ao menos 2 letras.";
    if (/[0-9]/.test(nome)) return "O nome não pode conter números.";
    return null;
}

function validateSenha(senha) {
    if (!senha || senha.length === 0) return "Informe uma senha.";
    if (senha.length < 6) return "A senha deve ter ao menos 6 caracteres.";
    if (senha.length > 64) return "A senha deve ter no máximo 64 caracteres.";
    if (/^(.)\1+$/.test(senha)) return "A senha não pode conter caracteres repetidos.";
    if (senha.includes(" ")) return "A senha não pode conter espaços.";
    return null;
}

function parseRegisterError(message, status) {
    if (!message) return "Erro no cadastro. Tente novamente mais tarde.";

    if (status === 400) {
        if (message.includes("Username") || message.includes("username")) {
            return "Usuário já cadastrado. Este e-mail já está em uso.";
        }
        if (message.includes("Email") || message.includes("email")) {
            return "E-mail já cadastrado. Use outro endereço ou faça login.";
        }
        return "Dados inválidos. Verifique se o e-mail já não está cadastrado.";
    }

    if (message.includes("Username já está em uso")) {
        return "Usuário já cadastrado. Verifique seu e-mail institucional ou use outro login.";
    }
    if (message.includes("E-mail já está em uso")) {
        return "E-mail já cadastrado. Use outro endereço ou faça login.";
    }
    if (message.includes("Senha deve ter ao menos 6 caracteres")) {
        return "A senha deve ter ao menos 6 caracteres.";
    }
    if (message.toLowerCase().includes("notblank") || message.toLowerCase().includes("invalid")) {
        return "Preencha todos os campos corretamente.";
    }

    return message;
}

export default function Cadastro() {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [showSenha, setShowSenha] = useState(false);
    const [showConfirmSenha, setShowConfirmSenha] = useState(false);
    const [form, setForm] = useState({
        nome: "",
        email: "",
        senha: "",
        confirmarSenha: "",
    });
    const navigate = useNavigate();

    function handleChange(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        const nomeNormalizado = form.nome
            .trim()
            .split(/\s+/)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(" ");

        const nomeError = validateNome(form.nome);
        if (nomeError) { setError(nomeError); return; }

        const emailError = validateEmail(form.email.trim());
        if (emailError) { setError(emailError); return; }

        const senhaError = validateSenha(form.senha);
        if (senhaError) { setError(senhaError); return; }

        if (!form.confirmarSenha || form.confirmarSenha.length === 0) {
            setError("Confirme sua senha.");
            return;
        }
        if (form.senha !== form.confirmarSenha) {
            setError("As senhas não coincidem. Verifique e tente novamente.");
            return;
        }

        try {
            const nameParts = nomeNormalizado.trim().split(/\s+/).filter(Boolean);
            const [firstname, ...lastnameParts] = nameParts;
            const lastname = lastnameParts.join(" ");

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstname,
                    lastname,
                    email: form.email.trim(),
                    username: form.email.split("@")[0],
                    password: form.senha,
                    displayname: nomeNormalizado,
                }),
            });

            if (!response.ok) {
                let errorMessage = "";
                let status = response.status;

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || "";
                } catch (e) {
                    errorMessage = await response.text();
                }

                if (status === 400) {
                    if (errorMessage.includes("email") || errorMessage.includes("Email")) {
                        throw new Error("Este e-mail já está cadastrado. Use outro endereço ou faça login.");
                    }
                    if (errorMessage.includes("username") || errorMessage.includes("Username")) {
                        throw new Error("Este usuário já está cadastrado. Verifique seu e-mail ou faça login.");
                    }
                }

                throw new Error(parseRegisterError(errorMessage, status));
            }

            await response.text();
            setSubmitted(true);
            setTimeout(() => navigate("/"), 5000);
        } catch (err) {
            setError(err.message);
        }
    }

    // Tela de sucesso - com a mesma estilização do EsqueciSenha
    if (submitted) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Navbar activePage="Cadastro" />

                <PageHero
                    className="page-hero-cadastro"
                    tag="Área de Cadastro"
                    title="Cadastro do Usuário"
                    description="Crie sua conta para acessar o sistema."
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
                        <div className="confirm-icon" style={{ background: "#dcfce7", width: "64px", height: "64px" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                                 fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
                                 strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>Cadastro realizado com sucesso!</h2>
                        <p style={{ fontSize: "1rem", lineHeight: "1.5", color: "#374151" }}>
                            Seu cadastro ficará pendente até ser aprovado por um coordenador.
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "#16a34a", marginTop: "8px", padding: "12px", borderRadius: "8px" }}>
                            Você será redirecionado para o login em breve.
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
            <Navbar activePage="Cadastro" />

            <PageHero
                className="page-hero-cadastro"
                tag="Área de Cadastro"
                title="Cadastro do Usuário"
                description="Crie sua conta para acessar o sistema."
            />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="content plok" style={{width: "100%", maxWidth: "1200px", boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px", marginTop: "2em", marginBottom: "3em"}}>
                    {error && (
                        <div className="error-msg">
                            <p>{error}</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group-cadastro">
                            <label>Nome completo</label>
                            <input
                                type="text"
                                name="nome"
                                placeholder="Ex: João Silva"
                                value={form.nome}
                                onChange={handleChange}
                                required
                            />
                            <small className="form-help">Informe nome e sobrenome, sem números.</small>
                        </div>
                        <div className="form-group-cadastro">
                            <label>E-mail institucional</label>
                            <input
                                type="text"
                                name="email"
                                placeholder="joao@professor.cps.sp.gov.br"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                            <small className="form-help">Use seu e-mail institucional válido.</small>
                        </div>
                        <div className="form-group-cadastro">
                            <label>Crie sua senha</label>
                            <div className="input-with-icon">
                                <input
                                    type={showSenha ? "text" : "password"}
                                    name="senha"
                                    placeholder="Digite sua senha"
                                    value={form.senha}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowSenha((prev) => !prev)}
                                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showSenha ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                      strokeWidth="2" strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      className="lucide lucide-eye-off-icon lucide-eye-off">
                                        <path
                                            d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                                        <path
                                            d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                                        <path d="m2 2 20 20"/>
                                    </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                  className="lucide lucide-eye-icon lucide-eye">
                                        <path
                                            d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>}
                                </button>
                            </div>
                            <small className="form-help">Mínimo 6 caracteres, sem espaços ou repetições.</small>
                        </div>
                        <div className="form-group-cadastro">
                            <label>Confirme sua senha</label>
                            <div className="input-with-icon">
                                <input
                                    type={showConfirmSenha ? "text" : "password"}
                                    name="confirmarSenha"
                                    placeholder="Confirme sua senha"
                                    value={form.confirmarSenha}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmSenha((prev) => !prev)}
                                    aria-label={showConfirmSenha ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showConfirmSenha ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off-icon lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-submit-cadastro">
                            Cadastrar-se
                        </button>
                        <div style={{ textAlign: "center", marginTop: "1em" }}>
                            <a className="see-all" href="/">Voltar para o Login</a>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
}