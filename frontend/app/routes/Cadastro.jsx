import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
    return null;
}

export default function Cadastro() {
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        nome: "",
        email: "",
        /* areaAtuacao: "",
         cargo: "",*/
        senha: "",
        confirmarSenha: "",
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
                    </div>
                ) : (
                    <>
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
                            {/* <div className="form-group">
                                <label>Àrea de atuação </label>
                                <select name="AreaAtuacao" value={form.areaAtuacao} onChange={handleChange}>
                                    <option value="">Selecione a Área de atuação</option>
                                    <option>Administrativo</option>
                                    <option>Coordenação</option>
                                    <option>Diretoria</option>
                                    <option>Docência</option>
                                    <option>Secretaria</option>
                                </select>
                            </div> */}
                            {/* <div className="form-group">
                                <label>Cargo </label>
                                <select name="cargo" value={form.cargo} onChange={handleChange}>
                                    <option value="">Selecione o Cargo</option>
                                    <option>Coordenador</option>
                                    <option>Diretor</option>
                                    <option>Professor</option>
                                </select>
                            </div> */}
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
