import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
    return null;
}

export default function Contato() {
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        email: "",
        senha: "",
    });

    function handleChange(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        setSubmitted(true);
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

            <div className="content">

                {/* Formulário de Login */}
                {submitted ? (
                    <div className="success-msg">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group-cadastro">
                                <label>E-mail institucional</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Ex:joao@professor.cps.sp.gov.br"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        
                            <div className="form-group-cadastro">
                                <label>senha</label>
                                <input
                                    type="password"
                                    name="senha"
                                    placeholder="Digite sua senha"
                                    value={form.senha}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-submit-cadastro">
                                Entrar
                            </button>
                        </form>

                        <div className="cadastro-link">
                            <h3>Não possui cadastro?</h3>
                            <p>Crie sua conta para começar a ultilizar o sistema.</p>

                            
                            <a href="/cadastro">Cadastrar-se</a>
                        </div>

                    </>
                )}
            </div>

            <Footer />
        </>
    );
}
