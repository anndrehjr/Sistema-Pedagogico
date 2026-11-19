# Instalação e execução

## Requisitos

- **Node.js 20 ou superior** (o sistema oficial usa Node 24) e **npm**.
- Nenhum banco de dados é necessário: a demonstração usa um PostgreSQL em memória.
- Acesso à internet na instalação e no primeiro *build* (as fontes do Google são baixadas pelo Next.js).

## Instalação

```bash
git clone https://github.com/anndrehjr/Sistema-Pedagogico.git
cd Sistema-Pedagogico
npm install
```

## Executar em desenvolvimento

```bash
npm run dev
```

Acesse <http://localhost:3000>. Na tela de login há atalhos para as contas de demonstração (senha `demo1234` em todas):

| Conta | Perfil |
|---|---|
| `dev@demo.exemplo` | Dev Master |
| `multi@demo.exemplo` | Administrador Multi-Escolas |
| `direcao@demo.exemplo` | Direção/Coordenação |
| `professor@demo.exemplo` | Professor |
| `leitor@demo.exemplo` | Somente leitura |

## Gerar a versão de produção

```bash
npm run build
npm start          # porta 3000; use  npx next start -p 3105  para outra porta
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` se quiser alterar algo. **Todas são opcionais na demonstração.**

| Variável | Para que serve | Padrão na demonstração |
|---|---|---|
| `JWT_SECRET` | segredo de assinatura das sessões | segredo público de demonstração |
| `NEXT_PUBLIC_ESCOLA_ID` | escola aberta por padrão | escola fictícia |
| `AJUSTE_NOTAS_EMAILS` | e-mails Multi-Escolas autorizados ao ajuste em lote | vazio (só o Dev Master) |

## Testes e verificações

```bash
npm test           # 72 testes
npm run lint       # ESLint
npx tsc --noEmit   # tipos
```

Os testes incluem o banco de demonstração (`src/demo/seed.test.ts`): esquema carregado, regras do banco ativas, contas e ausência de dados reais.

## Problemas comuns

- **"Port 3000 is in use":** rode em outra porta com `npx next dev -p 3001`.
- **Os dados "voltaram" ao reiniciar:** é o comportamento esperado; o banco da demonstração vive só na memória do servidor.
- **Erro ao baixar fontes no build:** o `next build` precisa de internet na primeira execução.
