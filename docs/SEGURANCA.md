# Segurança e proteção de dados

O sistema oficial trata dados de alunos, que são menores de idade e protegidos pela LGPD. Por isso este documento separa o que existe no **sistema oficial** do que vale para este **repositório público**.

## 1. O que este repositório NÃO contém

- Dados reais de alunos, responsáveis ou professores (nomes, matrículas, notas, documentos, contatos).
- Nome real da escola, identificadores internos reais ou endereços de servidor.
- Senhas, chaves, tokens, arquivos `.env` reais ou credenciais de qualquer serviço.
- Backups, dumps ou logs do banco oficial.
- Scripts de importação de dados escolares e rotinas de backup do ambiente oficial.
- Capturas de tela do sistema real.

Os arquivos que traziam dados escolares embutidos, e os scripts que os importavam, **foram excluídos** da versão pública.

## 2. Como a demonstração é isolada

- O banco é um PostgreSQL **em memória** (PGlite), criado a cada inicialização do servidor. Não há URL de conexão nem rede envolvida.
- Todos os dados vêm de `src/demo/seed.ts`: nomes sorteados de listas genéricas, notas geradas por sorteador com semente fixa, e-mails no domínio `demo.exemplo`.
- A senha das contas de demonstração (`demo1234`) é **pública de propósito** e só vale para esse banco.
- O segredo de sessão padrão (`segredo-publico-somente-para-demonstracao-nao-usar-em-producao`) também é público e só protege sessões do banco fictício. Em qualquer implantação, defina `JWT_SECRET`.
- Uma faixa no topo de todas as telas informa que se trata de demonstração.
- A escola fictícia traz "(DEMONSTRAÇÃO)" no nome.

## 3. Proteções do sistema oficial presentes no código

| Área | Medida |
|---|---|
| Senhas | `bcrypt` (via `bcryptjs`); mínimo de 8 caracteres na troca; troca obrigatória após senha temporária |
| Sessão | JWT (`jose`) em cookie `httpOnly`, `sameSite=lax`, `secure` em produção; 8 horas (30 dias se "lembrar acesso") |
| Revogação | `session_version` do usuário e tabela `tokens_revogados`: redefinir senha ou desativar usuário derruba as sessões antigas |
| Força bruta | bloqueio após 5 tentativas inválidas em 15 minutos, por e-mail e IP |
| Mensagens | a falha de login responde sempre "E-mail ou senha inválidos", sem revelar se o e-mail existe |
| Autorização | matriz única de permissões; escopo por escola, turma e disciplina em cada consulta; ninguém administra perfil acima do seu |
| Entrada | validação de tipos, tamanhos e UUIDs nas rotas de escrita |
| SQL | consultas sempre parametrizadas (sem concatenação de texto) |
| Integridade | restrições `CHECK`, chaves estrangeiras, gatilhos e transações |
| Cabeçalhos | `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Auditoria | `logs_acesso` registra login, falhas, bloqueios, criação de usuário, redefinição de senha, cadastro de aluno, lançamentos e exportações |
| Contêiner | execução como usuário sem privilégios |

## 4. Ajuste excepcional de notas

O ajuste em lote só é liberado ao Dev Master ou a uma conta Multi-Escolas cujo e-mail conste na variável de ambiente `AJUSTE_NOTAS_EMAILS`. Nenhum e-mail está escrito no código.

## 5. Verificações feitas antes da publicação

- Varredura por e-mails, CPF, telefones e endereços IP em todo o projeto: nenhum dado real encontrado (os e-mails restantes são do domínio fictício `demo.exemplo`).
- Varredura por nomes próprios, domínios e identificadores da escola real: nenhum encontrado no código; o único endereço real mencionado é o do sistema oficial, na documentação, por escolha do autor.
- Conferência de que nenhum arquivo `.env`, backup ou dump está no repositório.
- Conferência de que o histórico Git publicado não contém dados escolares.

## 6. Orientações a quem for reutilizar o código

1. Defina um `JWT_SECRET` forte e exclusivo.
2. Troque o banco em memória pelo PostgreSQL real (reimplementando `src/lib/db.ts` com a biblioteca `postgres`) e remova `src/demo` e as contas de demonstração.
3. Nunca versionar `.env`, dumps ou planilhas de alunos.
4. Aplicar a política de retenção e as bases legais exigidas pela LGPD para dados de menores.

## 7. Reportar um problema de segurança

Abra um contato privado com o autor (veja o README). Não publique detalhes de vulnerabilidades em issues públicas.
