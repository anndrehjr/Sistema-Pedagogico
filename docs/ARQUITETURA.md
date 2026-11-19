# Arquitetura

## Visão geral

Aplicação **Next.js 16 (App Router)** com páginas renderizadas no servidor, rotas de API (`/api/*`) e um middleware de sessão. Os dados ficam em **PostgreSQL**; a interface é feita em **React 19** com **Tailwind CSS 4**.

```
Navegador
   │  HTTPS
   ▼
Next.js
 ├─ middleware.ts            valida o cookie de sessão e renova a sessão
 ├─ app/**/page.tsx          páginas (Server Components) + componentes de cliente
 ├─ app/api/**/route.ts      30 endpoints: autenticação, dados, relatórios, administração
 ├─ components/              interface: painéis, gráficos, modais, barra superior
 └─ lib/                     regras de negócio, autenticação, relatórios, auditoria
        │
        ▼
   lib/db.ts  ──►  Produção:  PostgreSQL 16 (biblioteca `postgres`)
              └─►  Este repo: PGlite (PostgreSQL em WebAssembly, em memória) + dados fictícios
```

## Camadas

### Interface (`src/components`, `src/app`)
- Painéis em abas, cartões de indicadores (KPIs), gráficos (Recharts), heatmap, modais, tema claro/escuro e layout responsivo.
- Páginas de dados são **Server Components**: consultam o banco no servidor e entregam HTML pronto; telas interativas usam componentes de cliente que chamam `/api/*`.

### Regras de negócio (`src/lib`)
- `analytics/`: cálculo de média, risco acadêmico, distribuição por faixa, heatmap e índice composto. Funções puras, com testes unitários.
- `avaliacoes.ts`, `recuperacao.ts`, `notas-batch.ts`, `projecao-notas.ts`, `relatorios.ts`: regras de avaliações, recuperação, lote e relatórios, também testadas.
- `permissions.ts` e `types/roles.ts`: **matriz única de permissões** (capabilities) usada por menus, páginas e APIs.

### Acesso a dados (`src/lib/db.ts`)
O código escreve consultas SQL em *template string* (`db\`SELECT ... ${valor}\``), sempre **parametrizadas**. Há também `db.begin(async (tx) => ...)` para **transações** e um auxiliar de inserção em lote.

Na versão pública, esse mesmo módulo é implementado sobre o PGlite. Como a interface é a mesma, **nenhuma consulta das rotas foi alterada**.

### Banco de dados
19 tabelas, restrições `CHECK` (nota entre 0 e 10, bimestre de 1 a 4, papéis válidos...), chaves estrangeiras e **7 gatilhos em PL/pgSQL**:

| Gatilho | O que garante |
|---|---|
| `validar_matricula_escopo` | aluno e turma pertencem à escola da matrícula |
| `preencher_validar_nota_matricula` | a nota corresponde à matrícula anual do aluno |
| `sincronizar_aluno_com_matriculas` | situação e turma do aluno seguem a matrícula vigente |
| `validar_professor_vinculo` | vínculo exige professor ativo da mesma escola e disciplina da matriz |
| `validar_avaliacao_escopo`, `validar_resultado_avaliacao` | avaliações e resultados dentro do escopo correto |
| `calcular_validar_recuperacao` | cálculo e validação da recuperação |

O histórico de evolução do esquema do sistema oficial está em `sql/` (migrações 001 a 011), mantido como referência. A demonstração carrega um **retrato do esquema atual, sem dados** (`src/demo/schema.ts`).

## Modo de demonstração

1. Na primeira consulta, `db.ts` cria um banco PGlite em memória.
2. Carrega o esquema (`schema.ts`) e popula dados fictícios (`seed.ts`) com sorteio de semente fixa: 1 escola, 7 turmas, 12 disciplinas, 154 alunos, notas de 2 bimestres, 5 contas.
3. Todas as rotas funcionam normalmente sobre esse banco.
4. Ao reiniciar o servidor, tudo volta ao estado inicial.

Nada é lido de, nem enviado para, nenhum serviço externo.

## Decisões de projeto

- **Integridade no banco.** Validar só na API deixa brechas; gatilhos e `CHECK` impedem dado inconsistente mesmo vindo de outro caminho.
- **Permissões centralizadas.** Evita que menu, página e API discordem sobre quem pode o quê.
- **Escopo em toda consulta.** Escola, turma e disciplina entram na cláusula `WHERE`, não apenas no menu.
- **Transações** em operações com várias gravações, para nunca deixar metade da operação feita.
- **Auditoria** das ações sensíveis em `logs_acesso`.
- **Camada de banco substituível**, o que permitiu publicar uma demonstração fiel sem expor dados.

## Implantação do sistema oficial

Imagem Docker baseada em Node 24 Alpine, executada como usuário sem privilégios (`npm run build` e `npm start`), em uma VPS própria, com PostgreSQL 16 em contêiner separado. Essa infraestrutura **não** faz parte deste repositório.
