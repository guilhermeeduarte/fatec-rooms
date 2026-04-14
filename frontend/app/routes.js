// routes.js
import { index, route } from "@react-router/dev/routes";


export default [
  index("routes/Login.jsx"),
  route("contato", "routes/Contato.jsx"),
  route("coordenador", "routes/Coordenador.jsx"),
  route("cadastro", "routes/Cadastro.jsx"),
  route("confirmar", "routes/Confirmar.jsx")
];