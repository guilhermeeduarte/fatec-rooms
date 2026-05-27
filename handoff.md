# Handoff – Sistema de Reserva de Laboratórios

## Resumo do Projeto

**Sistema web** para gerenciamento de reservas de laboratórios, salas de aula e espaços acadêmicos.  
Desenvolvido para uma faculdade, permite que **professores** solicitem reservas, visualizem seus agendamentos e editem motivos. **Coordenadores** têm visão completa de todas as reservas, podendo aprovar ou rejeitar solicitações. A aplicação também suporta **reservas recorrentes** (ex: toda semana) e bloqueia automaticamente **feriados** e **semanas de avaliação**.

**Principais funcionalidades implementadas:**
- Calendário interativo com cores de status (aprovada, pendente, cancelada, feriado, avaliação).
- Grade de salas x horários para seleção de múltiplos períodos em uma data.
- Filtros avançados (pessoa, sala, andar, matéria, período, curso) nas telas “Minhas Reservas” (professor) e “Todas as Reservas” (coordenador).
- Aprovação/rejeição de reservas por coordenadores.
- Edição de motivo e cancelamento de reservas (apenas pelo criador, enquanto pendente).
- Popups de confirmação e erro.

## Tecnologias Utilizadas

### Frontend
- **React 18** (functional components + hooks: useState, useEffect, custom hooks)
- **React Router DOM** – navegação entre páginas (login, solicitar reserva, minhas reservas, todas reservas, etc.)
- **react-calendar** – componente de calendário com suporte a tileClassName e tileDisabled
- **CSS3** – layout responsivo com Flexbox, Grid, tabelas com scroll, classes modulares
- **Fetch API** – comunicação com backend (sem bibliotecas externas)

### Backend (inferido, não modificado)
- **Java Spring Boot** (API REST)
- **Banco de dados relacional** (MySQL/PostgreSQL) – tabelas: rooms, bookings, periods, recurring_bookings, holidays, semesters, users
- **Autenticação JWT** – token armazenado no localStorage, enviado no header `Authorization: Bearer`

### Endpoints utilizados
| Método | Endpoint | Descrição |
|--------|----------|------------|
| GET | `/api/rooms` | Lista todas as salas (bookable=1) |
| GET | `/api/bookings/my` | Reservas do usuário logado |
| GET | `/api/bookings/all` | Todas as reservas (coordenador) |
| GET | `/api/bookings/availability?roomId=&date=` | Períodos disponíveis de uma sala/data |
| POST | `/api/bookings` | Criar nova reserva (requer roomId, periodIds, bookingDate, subject, notes) |
| PATCH | `/api/bookings/{id}/notes` | Editar motivo |
| PATCH | `/api/bookings/{id}/cancel` | Cancelar reserva |
| PATCH | `/api/bookings/{id}/approve` | Aprovar reserva (coordenador) |
| PATCH | `/api/bookings/{id}/reject` | Rejeitar reserva (coordenador) |
| GET | `/api/holidays` | Lista feriados com datas e nomes |
| GET | `/api/semesters` | Semestres ativos (para semanas de avaliação) |
| GET | `/api/semesters/{id}/exam-weeks` | Intervalos de datas de avaliação |

## Estrutura de Arquivos (relevante)

src/
├── pages/
│ ├── SolicitaReserva.js (calendário + grade + formulário)
│ ├── EditarReserva.js (minhas reservas + filtros)
│ ├── TodasReservas.js (coordenador: todas reservas + aprovação)
│ ├── Login.js
│ └── ...
├── components/
│ ├── Navbar.js
│ ├── PageHero.js
│ ├── Footer.js
│ └── Popup.js
├── styles/
│ └── global.css (inclui classes .grade-tabela, .filtros-avancados, etc.)
text



## Como Executar o Projeto (ambiente de desenvolvimento)
```bash
# Frontend (React)
npm install
npm start   # porta 3000

# Backend (Spring Boot) – assumindo que já esteja rodando em porta 8080
./mvnw spring-boot:run