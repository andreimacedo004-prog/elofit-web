import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { ErroDaApi } from "../api/client";
import {
  adicionarSerie,
  alternarConclusao,
  buscarTreino,
  editarSerie,
  finalizarTreino,
  iniciarTreino,
  listarExercicios,
  listarTreinos,
  removerSerie,
} from "../api/treinos";
import { iniciarSessaoDeRotina, listarRotinas } from "../api/rotinas";
import { useRequisicao } from "../ganchos/useRequisicao";
import {
  descreverDuracaoTreino,
  formatarData,
  formatarDescanso,
  segundosEntre,
} from "../tempo";
import { agruparPorExercicio, descreverSerie } from "../treino";
import type { Serie, Treino } from "../tipos";

// Guardar o id da sessão aberta sobrevive a um F5 no meio do treino —
// cenário comum, já que a pessoa fica com o celular na mão entre as séries.
const CHAVE_SESSAO = "elofit.treinoAberto";

export default function Treinos() {
  const [treino, setTreino] = useState<Treino | null>(null);
  const [restaurando, setRestaurando] = useState(
    () => localStorage.getItem(CHAVE_SESSAO) !== null,
  );
  // true só quando a sessão acabou de ser aberta nesta visita — é o que
  // decide se o cronômetro de descanso pode contar a partir do registro do
  // backend (uma sessão de rotina nasce com todas as séries já criadas,
  // então isso não pode valer como "descanso" até a pessoa agir de verdade).
  const [recemAberta, setRecemAberta] = useState(false);

  const historico = useRequisicao(listarTreinos);

  // Retoma a sessão aberta ao entrar na tela.
  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_SESSAO);
    if (!salvo) return;

    buscarTreino(Number(salvo))
      .then(setTreino)
      .catch(() => localStorage.removeItem(CHAVE_SESSAO))
      .finally(() => setRestaurando(false));
  }, []);

  function abrirSessao(nova: Treino) {
    localStorage.setItem(CHAVE_SESSAO, String(nova.id));
    setRecemAberta(true);
    setTreino(nova);
  }

  async function encerrarSessao() {
    if (!treino) return;
    await finalizarTreino(treino.id);
    localStorage.removeItem(CHAVE_SESSAO);
    setTreino(null);
    await historico.recarregar();
  }

  if (restaurando) return <div className="carregando">Carregando...</div>;

  return (
    <div className="pagina">
      <header className="pagina__topo">
        <h1 className="pagina__titulo">Treino</h1>
        <p className="pagina__apoio">
          {treino
            ? "Série a série. Você fecha o treino quando terminar."
            : "Comece uma sessão para registrar as séries."}
        </p>
      </header>

      {treino ? (
        <SessaoAberta
          treino={treino}
          recemAberta={recemAberta}
          aoAtualizar={setTreino}
          aoEncerrar={encerrarSessao}
        />
      ) : (
        <NovaSessao aoComecar={abrirSessao} />
      )}

      <section>
        <h2 className="secao__titulo">Treinos anteriores</h2>

        {historico.carregando && <p className="vazio">Carregando...</p>}
        {historico.erro && <p className="erro">{historico.erro}</p>}
        {historico.dados?.length === 0 && (
          <p className="vazio">Nenhum treino registrado ainda.</p>
        )}

        <ul className="lista">
          {historico.dados
            ?.filter((t) => t.id !== treino?.id)
            .map((t) => (
              <TreinoAnterior treino={t} key={t.id} />
            ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- Iniciar ---------------- */

function NovaSessao({ aoComecar }: { aoComecar: (t: Treino) => void }) {
  const [modo, setModo] = useState<"livre" | "rotina">("livre");

  return (
    <section className="cartao">
      <div className="janelas" role="group" aria-label="Como começar">
        <button
          type="button"
          className={modo === "livre" ? "janela janela--ativa" : "janela"}
          onClick={() => setModo("livre")}
        >
          Treino livre
        </button>
        <button
          type="button"
          className={modo === "rotina" ? "janela janela--ativa" : "janela"}
          onClick={() => setModo("rotina")}
        >
          A partir de uma rotina
        </button>
      </div>

      {modo === "livre" ? (
        <ComecarLivre aoComecar={aoComecar} />
      ) : (
        <ComecarDeRotina aoComecar={aoComecar} />
      )}
    </section>
  );
}

function ComecarLivre({ aoComecar }: { aoComecar: (t: Treino) => void }) {
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      aoComecar(await iniciarTreino(titulo.trim()));
    } catch (problema) {
      setErro(
        problema instanceof ErroDaApi
          ? problema.message
          : "Não foi possível começar o treino.",
      );
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate>
      {erro && <p className="erro">{erro}</p>}

      <label className="campo">
        <span className="campo__rotulo">O que você vai treinar hoje?</span>
        <input
          className="campo__entrada"
          type="text"
          placeholder="Peito e tríceps"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </label>

      <button
        className="botao"
        type="submit"
        disabled={titulo.trim().length === 0 || enviando}
      >
        {enviando ? "Abrindo..." : "Começar treino"}
      </button>
    </form>
  );
}

/**
 * Começa a sessão a partir de uma rotina salva: o backend ja devolve as
 * series pre-preenchidas com a ultima carga usada, entao aqui so escolhemos
 * qual rotina e abrimos a sessao.
 */
function ComecarDeRotina({ aoComecar }: { aoComecar: (t: Treino) => void }) {
  const rotinas = useRequisicao(listarRotinas);
  const [rotinaId, setRotinaId] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function comecar() {
    if (rotinaId === "") return;
    setErro(null);
    setEnviando(true);

    try {
      aoComecar(await iniciarSessaoDeRotina(Number(rotinaId)));
    } catch (problema) {
      setErro(
        problema instanceof ErroDaApi
          ? problema.message
          : "Não foi possível iniciar a sessão.",
      );
      setEnviando(false);
    }
  }

  if (rotinas.carregando) return <p className="vazio">Carregando rotinas...</p>;
  if (rotinas.erro) return <p className="erro">{rotinas.erro}</p>;

  if (rotinas.dados?.length === 0) {
    return (
      <div>
        <p className="vazio">Você ainda não tem nenhuma rotina.</p>
        <Link className="botao botao--link" to="/rotinas">
          Criar rotina
        </Link>
      </div>
    );
  }

  return (
    <div>
      {erro && <p className="erro">{erro}</p>}

      <label className="campo">
        <span className="campo__rotulo">Rotina</span>
        <select
          className="campo__entrada"
          value={rotinaId}
          onChange={(e) =>
            setRotinaId(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">Escolha uma rotina</option>
          {rotinas.dados?.map((rotina) => (
            <option value={rotina.id} key={rotina.id}>
              {rotina.nome}
            </option>
          ))}
        </select>
      </label>

      <button
        className="botao"
        type="button"
        onClick={comecar}
        disabled={rotinaId === "" || enviando}
      >
        {enviando ? "Abrindo..." : "Começar treino"}
      </button>

      <Link className="botao botao--link botao--contorno" to="/rotinas">
        Gerenciar rotinas
      </Link>
    </div>
  );
}

/* ---------------- Sessão em andamento ---------------- */

function SessaoAberta({
  treino,
  recemAberta,
  aoAtualizar,
  aoEncerrar,
}: {
  treino: Treino;
  recemAberta: boolean;
  aoAtualizar: (t: Treino) => void;
  aoEncerrar: () => Promise<void>;
}) {
  const catalogo = useRequisicao(() => listarExercicios());

  const [exercicioId, setExercicioId] = useState<number | "">("");
  const [repeticoes, setRepeticoes] = useState("");
  const [carga, setCarga] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  // Timestamp local da última ação de verdade (série adicionada ou marcada
  // como feita). Tem prioridade sobre o registradaEm do backend, que numa
  // sessão de rotina é só "quando a sessão foi criada", não "quando a
  // pessoa fez a série".
  const [ultimaAcaoLocal, setUltimaAcaoLocal] = useState<string | null>(null);

  // Agrupa por grupo muscular para o <select> ficar navegável com 36 itens.
  const porGrupo = useMemo(() => {
    const grupos: Record<string, { id: number; nome: string }[]> = {};

    for (const exercicio of catalogo.dados?.content ?? []) {
      const grupo = exercicio.grupoMuscular ?? "Outros";
      (grupos[grupo] ??= []).push({ id: exercicio.id, nome: exercicio.nome });
    }
    return grupos;
  }, [catalogo.dados]);

  // Base do cronômetro de descanso. Uma sessão recém-aberta só ganha um
  // horário depois de uma ação de verdade (ultimaAcaoLocal); uma sessão
  // restaurada (F5 no meio do treino) pode confiar no registradaEm que já
  // veio do backend.
  const descansoDesde = useMemo(() => {
    if (ultimaAcaoLocal) return ultimaAcaoLocal;
    if (recemAberta) return null;

    const marcados = treino.series
      .map((s) => s.registradaEm)
      .filter((valor): valor is string => valor !== null);

    return marcados.length > 0 ? marcados[marcados.length - 1] : null;
  }, [treino.series, recemAberta, ultimaAcaoLocal]);

  // O backend recebe o número da série; contamos quantas já existem
  // deste exercício nesta sessão para não pedir isso ao usuário.
  const proximoNumero = useMemo(() => {
    if (exercicioId === "") return 1;
    return (
      treino.series.filter((s) => s.exercicioId === exercicioId).length + 1
    );
  }, [treino.series, exercicioId]);

  async function aoAdicionar(evento: FormEvent) {
    evento.preventDefault();
    if (exercicioId === "") return;

    setErro(null);
    setEnviando(true);

    try {
      await adicionarSerie(treino.id, {
        exercicioId: Number(exercicioId),
        numeroSerie: proximoNumero,
        repeticoes: Number(repeticoes),
        cargaKg: carga.trim() ? Number(carga.replace(",", ".")) : undefined,
      });

      // Recarrega a sessão inteira em vez de emendar a série na lista:
      // assim o volume total vem calculado pelo backend, sem duas contas
      // (uma aqui, outra lá) que podem divergir.
      aoAtualizar(await buscarTreino(treino.id));
      setUltimaAcaoLocal(new Date().toISOString());

      // Exercício e carga ficam: a próxima série quase sempre é do mesmo
      // movimento com o mesmo peso.
    } catch (problema) {
      setErro(
        problema instanceof ErroDaApi
          ? problema.message
          : "Não foi possível adicionar a série.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const recarregarSessao = useCallback(async () => {
    aoAtualizar(await buscarTreino(treino.id));
  }, [treino.id, aoAtualizar]);

  const podeAdicionar =
    exercicioId !== "" && Number(repeticoes) > 0 && !enviando;

  return (
    <>
      <section className="cartao cartao--ativo">
        <div className="sessao__topo">
          <div>
            <h2 className="sessao__titulo">{treino.titulo}</h2>
            <p className="sessao__meta">
              {treino.series.length}{" "}
              {treino.series.length === 1 ? "série" : "séries"}
            </p>
          </div>
          <button
            className="botao botao--contorno"
            onClick={async () => {
              setEncerrando(true);
              await aoEncerrar();
            }}
            disabled={encerrando}
          >
            {encerrando ? "Fechando..." : "Finalizar"}
          </button>
        </div>

        {descansoDesde && <DescansoAtual desde={descansoDesde} />}

        {treino.series.length > 0 && (
          <ul className="series">
            {treino.series.map((serie) => (
              <LinhaDeSerie
                key={serie.id}
                serie={serie}
                treinoId={treino.id}
                aoMudar={recarregarSessao}
                aoFalhar={setErro}
                aoConcluir={() => setUltimaAcaoLocal(new Date().toISOString())}
              />
            ))}
          </ul>
        )}

        <form onSubmit={aoAdicionar} className="adicionar" noValidate>
          {erro && <p className="erro">{erro}</p>}

          {catalogo.erro && <p className="erro">{catalogo.erro}</p>}

          {catalogo.dados?.content.length === 0 && (
            <p className="vazio">
              O catálogo de exercícios está vazio. Rode a migration
              V2__exercicios_iniciais.sql no backend.
            </p>
          )}

          <label className="campo">
            <span className="campo__rotulo">Exercício</span>
            <select
              className="campo__entrada"
              value={exercicioId}
              onChange={(e) =>
                setExercicioId(e.target.value === "" ? "" : Number(e.target.value))
              }
              disabled={catalogo.carregando}
            >
              <option value="">
                {catalogo.carregando ? "Carregando..." : "Escolha um exercício"}
              </option>
              {Object.entries(porGrupo).map(([grupo, exercicios]) => (
                <optgroup label={grupo} key={grupo}>
                  {exercicios.map((exercicio) => (
                    <option value={exercicio.id} key={exercicio.id}>
                      {exercicio.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="grade-campos grade-campos--duas">
            <label className="campo">
              <span className="campo__rotulo">Repetições</span>
              <input
                className="campo__entrada"
                type="text"
                inputMode="numeric"
                placeholder="10"
                value={repeticoes}
                onChange={(e) => setRepeticoes(e.target.value)}
              />
            </label>

            <label className="campo">
              <span className="campo__rotulo">Carga (kg)</span>
              <input
                className="campo__entrada"
                type="text"
                inputMode="decimal"
                placeholder="60"
                value={carga}
                onChange={(e) => setCarga(e.target.value)}
              />
              <span className="campo__ajuda">Deixe vazio se for peso do corpo.</span>
            </label>
          </div>

          <button className="botao" type="submit" disabled={!podeAdicionar}>
            {enviando
              ? "Adicionando..."
              : `Adicionar série ${proximoNumero}`}
          </button>
        </form>
      </section>
    </>
  );
}


/* ---------------- Histórico ---------------- */

/**
 * Mostra o treino como ele foi feito: exercício por exercício, com as séries
 * em sequência. É o que a pessoa quer conferir antes de repetir o treino —
 * quanto levantou da última vez e quanto descansou entre as séries.
 */
function TreinoAnterior({ treino }: { treino: Treino }) {
  const grupos = agruparPorExercicio(treino.series);
  const duracao = descreverDuracaoTreino(treino.duracaoMinutos);

  return (
    <li className="linha treino-anterior">
      <div className="treino-anterior__topo">
        <span className="treino-anterior__titulo">{treino.titulo}</span>
        <span className="treino-anterior__data">{formatarData(treino.data)}</span>
      </div>

      {grupos.length === 0 ? (
        <p className="treino-anterior__vazio">Nenhuma série registrada.</p>
      ) : (
        <ul className="exercicios">
          {grupos.map((grupo) => (
            <li className="exercicio" key={grupo.exercicioId}>
              <span className="exercicio__nome">{grupo.exercicioNome}</span>

              <span className="exercicio__series">
                {grupo.series.map((serie, indice) => (
                  <span className="numero" key={serie.id}>
                    {indice > 0 && <span className="exercicio__separador">·</span>}
                    {descreverSerie(serie)}
                  </span>
                ))}
              </span>

              {grupo.descansoMedioSegundos !== null && (
                <span className="exercicio__descanso">
                  descanso {formatarDescanso(grupo.descansoMedioSegundos)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {duracao && <p className="treino-anterior__duracao">{duracao}</p>}
    </li>
  );
}


/**
 * Conta o tempo desde a última série registrada.
 *
 * Derivamos de um timestamp em vez de incrementar um contador a cada tick:
 * se a aba ficar em segundo plano, o navegador segura o setInterval e um
 * contador ficaria atrasado. Com o cálculo por diferença, ao voltar o número
 * está certo.
 */
function DescansoAtual({ desde }: { desde: string }) {
  const [segundos, setSegundos] = useState(
    () => segundosEntre(desde, new Date().toISOString()) ?? 0,
  );
  const referencia = useRef(desde);

  useEffect(() => {
    referencia.current = desde;
    setSegundos(segundosEntre(desde, new Date().toISOString()) ?? 0);

    const intervalo = setInterval(() => {
      setSegundos(
        segundosEntre(referencia.current, new Date().toISOString()) ?? 0,
      );
    }, 1000);

    return () => clearInterval(intervalo);
  }, [desde]);

  return (
    <p className="descanso">
      <span className="descanso__rotulo">Descansando há</span>
      <span className="numero descanso__valor">{formatarDescanso(segundos)}</span>
    </p>
  );
}


/* ---------------- Série (visualizar e corrigir) ---------------- */

/**
 * Cada série alterna entre leitura e edição no mesmo lugar.
 *
 * Abrir uma tela separada para corrigir um número seria demais para o
 * contexto: a pessoa está de pé na academia, com o celular numa mão.
 */
function LinhaDeSerie({
  serie,
  treinoId,
  aoMudar,
  aoFalhar,
  aoConcluir,
}: {
  serie: Serie;
  treinoId: number;
  aoMudar: () => Promise<void>;
  aoFalhar: (mensagem: string) => void;
  aoConcluir: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [repeticoes, setRepeticoes] = useState(String(serie.repeticoes));
  const [carga, setCarga] = useState(
    serie.cargaKg !== null ? String(serie.cargaKg) : "",
  );
  const [ocupado, setOcupado] = useState(false);

  function abrirEdicao() {
    setRepeticoes(String(serie.repeticoes));
    setCarga(serie.cargaKg !== null ? String(serie.cargaKg) : "");
    setEditando(true);
  }

  async function salvar() {
    const reps = Number(repeticoes);
    if (!reps || reps <= 0) {
      aoFalhar("As repetições precisam ser maiores que zero.");
      return;
    }

    setOcupado(true);
    try {
      await editarSerie(treinoId, serie.id, {
        repeticoes: reps,
        cargaKg: carga.trim() ? Number(carga.replace(",", ".")) : undefined,
      });
      await aoMudar();
      setEditando(false);
    } catch {
      aoFalhar("Não foi possível salvar a correção.");
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    setOcupado(true);
    try {
      await removerSerie(treinoId, serie.id);
      await aoMudar();
    } catch {
      aoFalhar("Não foi possível remover a série.");
      setOcupado(false);
    }
  }

  async function marcar() {
    setOcupado(true);
    try {
      const atualizada = await alternarConclusao(treinoId, serie.id);
      if (atualizada.concluida) aoConcluir();
      await aoMudar();
    } catch {
      aoFalhar("Não foi possível marcar a série.");
    } finally {
      setOcupado(false);
    }
  }

  if (editando) {
    return (
      <li className="serie serie--editando">
        <span className="serie__nome serie__nome--edicao">
          {serie.exercicioNome}
          <span className="serie__indice"> série {serie.numeroSerie}</span>
        </span>

        <div className="serie__campos">
          <label className="serie__campo">
            <span>Reps</span>
            <input
              className="campo__entrada"
              type="text"
              inputMode="numeric"
              value={repeticoes}
              onChange={(e) => setRepeticoes(e.target.value)}
              autoFocus
            />
          </label>

          <label className="serie__campo">
            <span>Carga</span>
            <input
              className="campo__entrada"
              type="text"
              inputMode="decimal"
              value={carga}
              onChange={(e) => setCarga(e.target.value)}
            />
          </label>
        </div>

        <div className="serie__acoes">
          <button className="acao acao--primaria" onClick={salvar} disabled={ocupado}>
            Salvar
          </button>
          <button className="acao" onClick={() => setEditando(false)} disabled={ocupado}>
            Cancelar
          </button>
          <button className="acao acao--remover" onClick={remover} disabled={ocupado}>
            Remover
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="serie">
      <label className="serie__marcar">
        <input
          type="checkbox"
          checked={serie.concluida}
          onChange={marcar}
          disabled={ocupado}
        />
        <span className="serie__nome">
          {serie.exercicioNome}
          <span className="serie__indice"> série {serie.numeroSerie}</span>
        </span>
      </label>

      <button
        className="numero serie__carga serie__carga--editavel"
        onClick={abrirEdicao}
        title="Corrigir esta série"
      >
        {serie.repeticoes}
        {serie.cargaKg !== null && ` × ${serie.cargaKg} kg`}
      </button>
    </li>
  );
}
