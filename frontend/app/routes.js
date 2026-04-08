// routes.js
import { index, route } from "@react-router/dev/routes";


export default [
  index("routes/Home.jsx"),
  route("contato", "routes/Contato.jsx"),
  route("diretor", "routes/Diretor.jsx"),
  route("cadastro", "routes/Cadastro.jsx"),
  route("login", "routes/Login.jsx"),

];