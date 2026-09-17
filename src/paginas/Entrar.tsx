import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAutenticacao } from "../auth/AuthContext";
import { ErroDaApi } from "../api/client";
import type { TipoAtleta } from "../tipos";

type Modo = "entrar" | "cadastrar";

const TIPOS: { valor: TipoAtleta; rotulo: string }[] = [
  { valor: "HIBRIDO", rotulo: "Os dois" },
  { valor: "SO_FORCA", rotulo: "Força" },
  { valor: "SO_CORRIDA", rotulo: "Corrida" },
];

export default function Entrar() {
  const autenticacao = useAutenticacao();
  const local = useLocation();

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [tipoAtleta, setTipoAtleta] = useState<TipoAtleta>("HIBRIDO");

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cadastrando = modo === "cadastrar";

  // Já logado (ou acabou de logar): sai daqui. O `de` traz a rota que a
  // pessoa tentou abrir antes de ser mandada para o login.
  if (autenticacao.usuario) {
    const destino = (local.state as { de?: string } | null)?.de ?? "/";
    return <Navigate to={destino} replace />;
  }

  function trocarModo() {
    setModo(cadastrando ? "entrar" : "cadastrar");
    setErro(null);
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      if (cadastrando) {
        await autenticacao.cadastrar({ email, senha, nome, tipoAtleta });
      } else {
        await autenticacao.entrar(email, senha);
      }
      // Não navegamos aqui: com o usuário no contexto, o redirecionamento
      // lá em cima assume no próximo render.
    } catch (problema) {
      setErro(
        problema instanceof ErroDaApi
          ? problema.message
          : "Algo deu errado. Tente de novo.",
      );
      setEnviando(false);
    }
  }

  return (
    <div className="entrada">
      <aside className="entrada__vitrine">
        <p className="marca">EloFit</p>

        <div className="vitrine__numeros">
          <div className="vitrine__medida">
            <span className="numero vitrine__valor">1.240 kg</span>
            <span className="vitrine__legenda">de volume nesta semana</span>
          </div>
          <div className="vitrine__medida">
            <span className="numero vitrine__valor vitrine__valor--corrida">
              5&apos;32&quot;
            </span>
            <span className="vitrine__legenda">por km na última corrida</span>
          </div>
        </div>

        <p className="vitrine__rodape">
          Musculação e corrida no mesmo lugar, com os seus amigos vendo o que
          você escolher mostrar.
        </p>
      </aside>

      <main className="entrada__painel">
        <form className="formulario" onSubmit={aoEnviar} noValidate>
          <h1 className="formulario__titulo">
            {cadastrando ? "Criar sua conta" : "Entrar no EloFit"}
          </h1>
          <p className="formulario__apoio">
            {cadastrando
              ? "Leva menos de um minuto."
              : "Continue de onde você parou."}
          </p>

          {erro && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}

          {cadastrando && (
            <label className="campo">
              <span className="campo__rotulo">Nome</span>
              <input
                className="campo__entrada"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="campo">
            <span className="campo__rotulo">E-mail</span>
            <input
              className="campo__entrada"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="campo">
            <span className="campo__rotulo">Senha</span>
            <input
              className="campo__entrada"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={cadastrando ? "new-password" : "current-password"}
              required
            />
            {cadastrando && (
              <span className="campo__ajuda">Mínimo de 8 caracteres.</span>
            )}
          </label>

          {cadastrando && (
            <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="campo__rotulo">O que você treina?</legend>
              <div className="opcoes">
                {TIPOS.map((tipo) => (
                  <label className="opcao" key={tipo.valor}>
                    <input
                      type="radio"
                      name="tipoAtleta"
                      value={tipo.valor}
                      checked={tipoAtleta === tipo.valor}
                      onChange={() => setTipoAtleta(tipo.valor)}
                    />
                    <span>{tipo.rotulo}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button className="botao" type="submit" disabled={enviando}>
            {enviando
              ? "Aguarde..."
              : cadastrando
                ? "Criar conta"
                : "Entrar"}
          </button>

          <p className="alternar">
            {cadastrando ? "Já tem conta? " : "Ainda não tem conta? "}
            <button type="button" onClick={trocarModo}>
              {cadastrando ? "Entrar" : "Criar agora"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
