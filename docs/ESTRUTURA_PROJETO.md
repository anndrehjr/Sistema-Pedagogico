# Estrutura do projeto

```
Sistema-Pedagogico/
├─ README.md                      apresentação do projeto
├─ package.json                   dependências e scripts (dev, build, start, lint, test)
├─ next.config.ts                 cabeçalhos de segurança (CSP, HSTS...) e configuração do Next.js
├─ tsconfig.json · eslint.config.mjs · postcss.config.mjs
├─ .env.example                   variáveis ilustrativas, sem segredos
├─ docs/
│   ├─ ARQUITETURA.md · MAPEAMENTO_FUNCIONALIDADES.md · SEGURANCA.md · INSTALACAO.md · ESTRUTURA_PROJETO.md
│   ├─ DOCUMENTACAO_FUNCIONAL.md  documentação funcional (exibida dentro do sistema)
│   └─ screenshots/               capturas da DEMONSTRAÇÃO (dados fictícios)
├─ sql/                           migrações 001–011 do banco oficial (referência histórica)
├─ public/                        arquivos estáticos
└─ src/
    ├─ middleware.ts              valida e renova a sessão em cada requisição
    ├─ app/
    │   ├─ layout.tsx · globals.css   layout raiz, faixa de demonstração, tema
    │   ├─ login/ · trocar-senha/     acesso
    │   ├─ analytics/                 visão executiva
    │   ├─ dashboard/                 painel e módulos
    │   │   ├─ escolas/[id]/ · aluno/[id]/
    │   │   ├─ diario/ · avaliacoes/ · alunos/ · relatorios/ · prova-paulista/
    │   │   ├─ usuarios/ · vinculos-professores/ · logs/ · documentacao/
    │   │   └─ ajustar-notas/ · ranking/ · relatorio-notas-baixas/ · caderno-notas/
    │   │      planejamento-recuperacao/ · projecao-notas/   (restritos)
    │   └─ api/                       30 rotas: auth, alunos, notas, diario, avaliacoes, recuperacoes,
    │                                 relatorios, prova-paulista, usuarios, professor-vinculos, logs,
    │                                 dashboard/*, ranking-alunos, caderno-dev, dev/ajuste-notas ...
    ├─ components/
    │   ├─ escola-dashboard/          painel: KPIs, abas, gráficos, heatmap, alertas, seletores
    │   ├─ analytics/                 visão executiva: cartões, tabelas e modais
    │   └─ TopBar, Modal, ThemeToggle, StyledSelect, BannerDemo, ContasDemo ...
    ├─ lib/
    │   ├─ db.ts                      camada de banco (nesta versão: PGlite em memória)
    │   ├─ auth.ts · requireAuth.ts · permissions.ts · rateLimit.ts · audit.ts
    │   ├─ analytics/                 cálculo de indicadores (com testes)
    │   ├─ ranking/                   posições do ranking
    │   └─ avaliacoes · recuperacao · notas-batch · projecao-notas · relatorios · caderno-dev
    ├─ services/                      sessão e autenticação no cliente
    ├─ types/                         tipos e matriz de permissões (roles.ts)
    └─ demo/                          SOMENTE da versão pública
        ├─ schema.ts                  esquema do banco (sem dados)
        ├─ seed.ts                    dados fictícios com sorteio de semente fixa
        ├─ seed.test.ts               testes do banco de demonstração
        └─ constantes.ts              identificador da escola fictícia
```

## Convenções

- Testes ficam ao lado do código (`*.test.ts`) e usam `node:test`.
- Regras de negócio ficam em `src/lib`, fora de componentes de interface.
- Cada rota de API valida entrada, autentica, checa a permissão e só então consulta o banco.
- Nomes de arquivos, funções e textos da interface estão em português, como o domínio do sistema.
