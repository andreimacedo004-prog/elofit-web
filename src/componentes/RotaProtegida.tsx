import { Navigate, useLocation } from "react-router-dom";
import { useAutenticacao } from "../auth/AuthContext";
import type { ReactNode } from "react";

/**
 * Envolve as rotas que exigem login.
 *
 * O `state` guarda de onde a pessoa veio: assim, se ela abrir um link
 * direto para /corridas sem estar logada, volta para lá depois de entrar
 * em vez de cair no início.
 */
export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAutenticacao();
  const local = useLocation();

  if (carregando) return <div className="carregando">Carregando...</div>;

  if (!usuario) {
    return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  }

  return <>{children}</>;
}
