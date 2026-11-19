# Mapeamento de funcionalidades

Levantamento de todos os módulos do Sistema Pedagógico, feito a partir do código-fonte e da documentação funcional do sistema oficial.

**Legenda de situação (na versão pública de demonstração)**

- **Funcional:** a página abre, consulta o banco fictício e o comportamento foi exercitado nos testes de fumaça.
- **Funcional (escrita testada):** além de consultar, a gravação foi exercitada ponta a ponta.
- **Interno:** recurso exclusivo do Dev Master, ainda não exposto aos demais perfis.
- **Fora da versão pública:** existe no sistema oficial, mas foi retirado deste repositório por segurança.

> Verificação feita na demonstração: 41 rotas e páginas respondem sem erro de servidor, o login dos 5 perfis funciona e a gravação foi exercitada no **cadastro de aluno** (com transação, regra de número de chamada e bloqueio por perfil). As demais gravações usam o mesmo mecanismo de transação, mas **não** foram exercitadas uma a uma.

## 1. Módulos

### 1.1 Acesso e sessão

| Item | Detalhe |
|---|---|
| Rotas | `/login`, `/trocar-senha`; APIs `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/trocar-senha` |
| Ações | entrar, sair, trocar senha (mínimo de 8 caracteres), "lembrar acesso por 30 dias" (padrão: 8 horas) |
| Perfis | todos |
| Banco | `usuarios`, `tentativas_login`, `tokens_revogados`, `logs_acesso` |
| Situação | Funcional (escrita testada: login e recusa de senha errada) |
| Fluxo | e-mail e senha → bloqueio após 5 tentativas inválidas em 15 min → cookie `httpOnly` → redireciona ao início do perfil; se a senha é temporária, exige troca antes |

### 1.2 Painel pedagógico da escola

| Item | Detalhe |
|---|---|
| Rotas | `/dashboard`, `/dashboard/escolas/[id]`; APIs `/api/dashboard/{kpis,ranking,tendencia,heatmap,comparativo,distribuicao,disciplinas-criticas}` |
| Componentes | `escola-dashboard/*`: `DashboardConteudo`, `KPICardsReal`, `TabsDashboard`, `GraficosVisaoGeral`, `ListaTurmas`, `DisciplinasCriticas`, `PainelAlertas`, `HeatmapPedagogico`, `TendenciaBimestres`, `ComparativoBimestres`, `BimestreSeletor`, `TurmaSeletor` |
| Ações | alternar abas (Visão Geral, Turmas, Disciplinas, Alertas, Heatmap), filtrar por turma e bimestre, abrir o aluno a partir do heatmap, ocultar nomes |
| Perfis | todos, limitados ao escopo (professor: só turmas vinculadas) |
| Banco | `escolas`, `turmas`, `alunos`, `matriculas`, `notas`, `disciplinas`, `matriz_disciplinas` |
| Situação | Funcional |

### 1.3 Visão executiva

| Item | Detalhe |
|---|---|
| Rota | `/analytics` |
| Componentes | `analytics/*`: `ResumoCards`, `TabelaComparativa`, `RecomposicaoCard`, modais de pré-reprovados, zona de atenção, total de alunos, média geral, ranking de turmas e disciplinas, evolução das turmas |
| Ações | cartões clicáveis que abrem modais, separação Fundamental/Médio, evolução entre bimestres |
| Perfis | todos, conforme escola |
| Lógica | `lib/analytics/*` (`buildExecutivo`, `buildRiscoAcademico`, `buildHeatmapPedagogico`, `indiceComposto`...) com testes unitários |
| Situação | Funcional |

### 1.4 Perfil individual do aluno

| Item | Detalhe |
|---|---|
| Rota | `/dashboard/aluno/[id]` |
| Ações | ver notas por disciplina e bimestre, situação (regular, atenção, pré-reprovado) |
| Banco | `alunos`, `matriculas`, `notas`, `disciplinas` |
| Situação | Funcional |

### 1.5 Diário de classe

| Item | Detalhe |
|---|---|
| Rotas | `/dashboard/diario`; APIs `/api/diario`, `/api/notas` |
| Ações | escolher turma, disciplina e bimestre; lançar e salvar notas por matrícula anual |
| Perfis | quem tem `manageNotas`: Dev Master, Multi-Escolas, Direção, Professor (nas disciplinas vinculadas) |
| Banco | `notas`, `matriculas`, `matriz_disciplinas`; gatilho que valida a nota contra a matrícula |
| Situação | Funcional |

### 1.6 Avaliações e recuperação

| Item | Detalhe |
|---|---|
| Rotas | `/dashboard/avaliacoes`; APIs `/api/avaliacoes`, `/api/recuperacoes` |
| Ações | criar e desativar avaliações (peso, nota máxima, tipo), salvar resultados por aluno, registrar recuperação |
| Banco | `avaliacoes`, `resultados_avaliacoes`, `recuperacoes`, `notas`; gatilhos de escopo e de cálculo da recuperação |
| Situação | Funcional |

### 1.7 Gestão de alunos

| Item | Detalhe |
|---|---|
| Rotas | `/dashboard/alunos`; APIs `/api/alunos`, `/api/alunos/[id]` |
| Ações | cadastrar aluno em turma, número de chamada único por turma, transferir ou inativar sem apagar histórico |
| Perfis | quem tem `manageUsuarios` (Dev Master, Multi-Escolas, Direção) |
| Banco | `alunos`, `matriculas`, `turmas`, `logs_acesso` |
| Situação | **Funcional (escrita testada)** |

### 1.8 Usuários e vínculos de professores

| Item | Detalhe |
|---|---|
| Rotas | `/dashboard/usuarios`, `/dashboard/vinculos-professores`; APIs `/api/usuarios`, `/api/usuarios/[id]`, `/api/usuarios/[id]/resetar-senha`, `/api/professor-vinculos` |
| Ações | criar usuário, redefinir senha (gera senha temporária e revoga sessões), ativar/desativar, vincular professor a turma e disciplina |
| Regras | ninguém administra um perfil acima do seu; Direção atua só na própria escola |
| Banco | `usuarios`, `professor_vinculos`; gatilho que exige professor ativo da mesma escola |
| Situação | Funcional |

### 1.9 Relatórios oficiais

| Item | Detalhe |
|---|---|
| Rota | `/dashboard/relatorios`; API `/api/relatorios` |
| Ações | filtrar, exportar CSV, imprimir ou salvar em PDF; a exportação é auditada |
| Lógica | `lib/relatorios.ts` (com testes) |
| Situação | Funcional |

### 1.10 Prova Paulista

| Item | Detalhe |
|---|---|
| Rota | `/dashboard/prova-paulista`; API `/api/prova-paulista` |
| Ações | consultar o painel da avaliação externa; importar planilha `.xlsx` (perfis de gestão) |
| Regra | os percentuais **não** entram no boletim nem nas médias |
| Banco | `prova_paulista_resultados` |
| Situação | Funcional na consulta; **importação de planilha não exercitada** na demonstração |

### 1.11 Logs de auditoria

| Item | Detalhe |
|---|---|
| Rota | `/dashboard/logs`; API `/api/logs` |
| Ações registradas | login/logout/falha/bloqueio, usuário criado, senha redefinida/alterada, aluno cadastrado, avaliação criada/desativada, nota atualizada na recuperação, vínculo de professor, relatório exportado, notas ajustadas em lote, Prova Paulista importada |
| Perfis | Dev Master e Multi-Escolas |
| Situação | Funcional |

### 1.12 Ajuste de notas em lote

| Item | Detalhe |
|---|---|
| Rota | `/dashboard/ajustar-notas`; API `/api/dev/ajuste-notas` |
| Acesso | Dev Master, ou conta Multi-Escolas cujo e-mail esteja em `AJUSTE_NOTAS_EMAILS` |
| Garantias | gravação em transação única, nota anterior e nova auditadas |
| Situação | Funcional (abre e consulta); gravação em lote não exercitada |

### 1.13 Recursos internos do Dev Master

| Módulo | Rota | API | Situação |
|---|---|---|---|
| Ranking dos alunos | `/dashboard/ranking` | `/api/ranking-alunos` | Interno |
| Notas abaixo de 5,0 | `/dashboard/relatorio-notas-baixas` | `/api/relatorio-notas-baixas` | Interno |
| Caderno particular de notas | `/dashboard/caderno-notas` | `/api/caderno-dev` | Interno |
| Planejamento de recuperação | `/dashboard/planejamento-recuperacao` | `/api/planejamento-recuperacao` | Interno |
| Projeção de notas | `/dashboard/projecao-notas` | `/api/projecao-notas` | Interno |

### 1.14 Documentação dentro do sistema

Rota `/dashboard/documentacao`: exibe [`DOCUMENTACAO_FUNCIONAL.md`](DOCUMENTACAO_FUNCIONAL.md) formatado. Funcional.

## 2. Matriz de acesso (resumo)

| Módulo | Dev Master | Multi-Escolas | Direção | Professor | Leitor |
|---|:-:|:-:|:-:|:-:|:-:|
| Painéis e perfil do aluno | ✔ | ✔ | ✔ | ✔ (vinculadas) | ✔ |
| Diário e avaliações | ✔ | ✔ | ✔ | ✔ (vinculadas) | — |
| Gestão de alunos | ✔ | ✔ | ✔ | — | — |
| Usuários e vínculos | ✔ | ✔ | ✔ (própria escola) | — | — |
| Relatórios e Prova Paulista | ✔ | ✔ | ✔ | ✔ | ✔ |
| Logs de auditoria | ✔ | ✔ | — | — | — |
| Ajuste em lote | ✔ | só por lista | — | — | — |
| Módulos internos | ✔ | — | — | — | — |

## 3. Mapa de navegação

```
/login ──► (senha temporária?) ──► /trocar-senha
   │
   └─► Início do perfil
        ├─ /dashboard ─► /dashboard/escolas/[id]  (painel: Visão Geral · Turmas · Disciplinas · Alertas · Heatmap)
        │                    └─► /dashboard/aluno/[id]  (perfil do aluno)
        ├─ /analytics  (visão executiva) ─► modais de detalhe ─► /dashboard/escolas/[id]
        ├─ Barra superior
        │    ├─ Diário            /dashboard/diario
        │    ├─ Avaliações        /dashboard/avaliacoes
        │    ├─ Relatórios        /dashboard/relatorios
        │    ├─ Prova Paulista    /dashboard/prova-paulista
        │    ├─ Alunos            /dashboard/alunos
        │    ├─ Usuários          /dashboard/usuarios ─► /dashboard/vinculos-professores
        │    ├─ Logs              /dashboard/logs
        │    ├─ Ajustar notas     /dashboard/ajustar-notas      (restrito)
        │    ├─ Documentação      /dashboard/documentacao
        │    └─ Internos (Dev Master): ranking · notas-baixas · caderno-notas · planejamento-recuperacao · projecao-notas
        └─ Tema claro/escuro · Sair
```

## 4. Resumo numérico do código

- 20 páginas, 30 rotas de API, 37 componentes, 19 tabelas, 7 gatilhos, cerca de 17 mil linhas de TypeScript/TSX.
- 72 testes automatizados.
