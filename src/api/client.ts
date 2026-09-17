/**
 * Camada única de acesso à API.
 *
 * Nenhum componente chama fetch direto: assim o token, o tratamento de erro
 * e o comportamento em caso de sessão expirada ficam num lugar só.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8180";

const CHAVE_TOKEN = "elofit.token";

export function lerToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function gravarToken(token: string) {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function apagarToken() {
  localStorage.removeItem(CHAVE_TOKEN);
}

/** Erro com o status HTTP junto, para a tela decidir o que mostrar. */
export class ErroDaApi extends Error {
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// O AuthContext registra aqui o que fazer quando o token morre.
let aoPerderSessao: (() => void) | null = null;

export function registrarPerdaDeSessao(callback: () => void) {
  aoPerderSessao = callback;
}

/**
 * O backend responde erro de dois jeitos:
 *   regra de negócio →  { "erro": "Já existe uma conta com este e-mail" }
 *   validação de DTO →  { "email": "must be a well-formed email address" }
 * Esta função achata os dois numa frase só.
 */
function extrairMensagem(corpo: unknown): string | null {
  if (!corpo || typeof corpo !== "object") return null;

  const registro = corpo as Record<string, string>;
  if (typeof registro.erro === "string") return registro.erro;

  const mensagens = Object.values(registro).filter((v) => typeof v === "string");
  return mensagens.length > 0 ? mensagens.join(". ") : null;
}

export async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  const token = lerToken();

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    // fetch só rejeita quando a requisição nem saiu: backend fora do ar,
    // DNS, CORS bloqueado. Erro de HTTP (400, 500) resolve normalmente.
    throw new ErroDaApi(0, "Não foi possível falar com o servidor.");
  }

  if (resposta.status === 401) {
    aoPerderSessao?.();
    throw new ErroDaApi(401, "Sua sessão expirou. Entre de novo.");
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ErroDaApi(
      resposta.status,
      extrairMensagem(corpo) ?? "Não foi possível completar a ação.",
    );
  }

  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}

export const api = {
  get: <T>(caminho: string) => requisitar<T>(caminho),

  post: <T>(caminho: string, corpo?: unknown) =>
    requisitar<T>(caminho, {
      method: "POST",
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),

  put: <T>(caminho: string, corpo?: unknown) =>
    requisitar<T>(caminho, {
      method: "PUT",
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),

  patch: <T>(caminho: string, corpo?: unknown) =>
    requisitar<T>(caminho, {
      method: "PATCH",
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
};
