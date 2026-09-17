import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apagarToken,
  gravarToken,
  lerToken,
  registrarPerdaDeSessao,
} from "../api/client";
import * as auth from "../api/auth";
import type { TipoAtleta, Usuario } from "../tipos";

interface ContextoDeAutenticacao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: {
    email: string;
    senha: string;
    nome: string;
    tipoAtleta: TipoAtleta;
  }) => Promise<void>;
  sair: () => void;
}

const Contexto = createContext<ContextoDeAutenticacao | null>(null);

export function ProvedorDeAutenticacao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Começa carregando se existe token guardado: precisamos validá-lo
  // no servidor antes de decidir se a pessoa está logada de verdade.
  const [carregando, setCarregando] = useState(() => lerToken() !== null);

  const sair = useCallback(() => {
    apagarToken();
    setUsuario(null);
  }, []);

  // Se qualquer chamada levar 401, a sessão morreu: limpa tudo.
  useEffect(() => {
    registrarPerdaDeSessao(sair);
  }, [sair]);

  // Ao abrir o app com token guardado, confirma que ele ainda vale.
  // Sem isso, um token expirado deixaria a interface achando que está logada
  // até a primeira chamada falhar.
  useEffect(() => {
    if (lerToken() === null) return;

    let cancelado = false;

    auth
      .meuPerfil()
      .then((perfil) => {
        if (!cancelado) setUsuario(perfil);
      })
      .catch(() => {
        if (!cancelado) apagarToken();
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const aplicarSessao = useCallback(
    (resposta: { token: string; usuario: Usuario }) => {
      gravarToken(resposta.token);
      setUsuario(resposta.usuario);
    },
    [],
  );

  const valor = useMemo<ContextoDeAutenticacao>(
    () => ({
      usuario,
      carregando,
      entrar: async (email, senha) => {
        aplicarSessao(await auth.entrar({ email, senha }));
      },
      cadastrar: async (dados) => {
        aplicarSessao(await auth.cadastrar(dados));
      },
      sair,
    }),
    [usuario, carregando, aplicarSessao, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAutenticacao() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useAutenticacao precisa estar dentro de ProvedorDeAutenticacao");
  }
  return contexto;
}
