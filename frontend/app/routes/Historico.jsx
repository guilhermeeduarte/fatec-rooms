import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";


export default function Historico() {
    const navigate = useNavigate();
    const status = "Aprovado"; // ou "Aprovado"
    const getStatusClass = (status) => {
        switch (status) {
            case "Aprovado":
                return "status-aprovado";
            default:
                return "status-cancelado";
        }
    };

    return (
        <>
            <Navbar activePage="historico" />

            <PageHero
                variant="historico"
                tag="Histórico"
                title="Histórico de Reserva"
                description="Visualize o histórico de reserva."
            />
            <div className="spacer" />



            <div className="reservas-feitas-historico">
                <h4>Últimas Reservas:</h4>

                <div className="lista-horarios-historico">
                    
                    <div className="item-historico">
                    
                    <div className="row">
                        <span className="local-hisotirco">Sala 101</span>
                        <span className="hora-historico"> 10:30 - 11:50</span>
                        <span className="data-historico">12/04/26</span>

                    </div>

                    <div className="row">
                        <span className="prof-hisotirco">Prof.Jeferson</span>
                        <span className={`status-historico ${getStatusClass(status)}`}>
                            {status}
                        </span>                    
                    </div>

                    </div>

                </div>
            </div>
            

            <div className="spacer" />
            <Footer />
        </>

    
    );
}
