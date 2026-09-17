# EloFit Web — passo 2: registrar corrida

## Instalação

Dentro de `elofit-web`, antes de copiar os arquivos:

```
npm install react-router-dom
```

Depois copie o `src/` deste pacote por cima do existente.

## Arquivos novos

```
src/
├── componentes/
│   ├── Layout.tsx         → cabeçalho com abas, herdado por toda tela logada
│   └── RotaProtegida.tsx  → barra quem não está logado
├── ganchos/
│   └── useRequisicao.ts   → carregando / erro / dados, para não repetir useEffect
├── api/corridas.ts        → chamadas de /api/corridas
├── paginas/Corridas.tsx   → formulário + histórico
└── tempo.ts               → formatação de pace, duração e data
```

## Arquivos alterados

- `App.tsx` — agora usa react-router
- `paginas/Entrar.tsx` — redireciona depois do login
- `paginas/Inicio.tsx` — placeholder do dashboard
- `tipos.ts` — Corrida e Comparativo
- `styles.css` — estilos da moldura e da lista
