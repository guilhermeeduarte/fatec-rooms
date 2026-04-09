import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
    return null;
}

export default function Cadastro() {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
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
        if (form.senha !== form.confirmarSenha) {
            setError("As senhas não coincidem.");
            return;
        }
        try {
            const [firstname, ...lastnameParts] = form.nome.split(' ');
            const lastname = lastnameParts.join(' ');
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstname: firstname,
                    lastname: lastname,
                    email: form.email,
                    username: form.email.split('@')[0], // Usar parte antes do @ como username
                    password: form.senha,
                    displayname: form.nome
                })
            });
            if (!response.ok) {
                let errorMessage = 'Erro no cadastro';
                try {
                    const errorData = await response.text(); // register retorna String, não JSON
                    errorMessage = errorData || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || `Erro ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            const message = await response.text();
            setSubmitted(true);
            setTimeout(() => navigate('/'), 3000); // Redirecionar para login após 3 segundos
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <>
            <Navbar activePage="Cadastro" />

            <PageHero
                className="page-hero-cadastro"
                tag="Área de Cadastro"
                title="Cadastro do Usuário"
                description="Crie sua conta para acessar o sistema."
            />

            <div className="content">

                {/* Formulário de cadastro */}
                {submitted ? (
                    <div className="success-msg">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3>Cadastro realizado com sucesso!</h3>
                        <p>Seu cadastro ficará pendente de aprovação por um coordenador. Você será redirecionado para o login em breve.</p>
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
                                <label>Nome completo</label>
                                <input
                                    type="text"
                                    name="nome"
                                    placeholder="Ex: João Silva"
                                    value={form.nome}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group-cadastro">
                                <label>E-mail institucional</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="joao@professor.cps.sp.gov.br"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group-cadastro">
                                <label>Crie sua senha</label>
                                <input
                                    type="password"
                                    name="senha"
                                    placeholder="Digite sua senha"
                                    value={form.senha}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group-cadastro">
                                <label>Confirme sua senha</label>
                                <input
                                    type="password"
                                    name="confirmarSenha"
                                    placeholder="Confirme sua senha"
                                    value={form.confirmarSenha}
                                    onChange={handleChange}
                                    required
                                />
                            </div>


                            <button type="submit" className="btn-submit-cadastro">
                                Cadastrar-se
                            </button>
                        </form>
                    </>
                )}
            </div>

            <Footer />
        </>
    );
}
