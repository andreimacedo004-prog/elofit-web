import { api } from "./client";
import type { RespostaDeAutenticacao, TipoAtleta, Usuario } from "../tipos";

export function cadastrar(dados: {
  email: string;
  senha: string;
  nome: string;
  tipoAtleta: TipoAtleta;
}) {
  return api.post<RespostaDeAutenticacao>("/api/auth/cadastro", dados);
}

export function entrar(dados: { email: string; senha: string }) {
  return api.post<RespostaDeAutenticacao>("/api/auth/login", dados);
}

export function meuPerfil() {
  return api.get<Usuario>("/api/usuarios/eu");
}
