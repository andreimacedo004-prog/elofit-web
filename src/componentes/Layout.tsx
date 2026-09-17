import { NavLink, Outlet } from "react-router-dom";
import { useAutenticacao } from "../auth/AuthContext";

const ABAS = [
  { para: "/", rotulo: "Início" },
  { para: "/corridas", rotulo: "Corrida" },
  { para: "/treinos", rotulo: "Treino" },
];

export default function Layout() {
  const { usuario, sair } = useAutenticacao();

  return (
    <div className="moldura">
      <header className="cabecalho">
        <span className="marca marca--clara">EloFit</span>

        <nav className="abas">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={aba.para}
              end={aba.para === "/"}
              className={({ isActive }) =>
                isActive ? "aba aba--ativa" : "aba"
              }
            >
              {aba.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="cabecalho__conta">
          <span className="cabecalho__nome">{usuario?.nome}</span>
          <button className="link-sair" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      {/* O Outlet é onde o react-router encaixa a rota atual. */}
      <Outlet />
    </div>
  );
}
