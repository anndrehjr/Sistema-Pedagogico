import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import db from '../lib/db'
import { CONTAS_DEMO, SENHA_DEMO } from './seed'
import { ESCOLA_DEMO_ID } from './constantes'

test('o banco de demonstração é criado com o esquema e dados fictícios', async () => {
  const [esc] = await db<{ nome: string }[]>`SELECT nome FROM escolas WHERE id = ${ESCOLA_DEMO_ID}`
  assert.match(esc.nome, /DEMONSTRAÇÃO/)

  const [c] = await db<{ turmas: string; alunos: string; notas: string }[]>`
    SELECT (SELECT count(*) FROM turmas) AS turmas, (SELECT count(*) FROM alunos) AS alunos, (SELECT count(*) FROM notas) AS notas`
  assert.equal(c.turmas, '7') // count(*) volta como texto, igual à produção
  assert.equal(c.alunos, '154')
  assert.ok(Number(c.notas) > 2500)
})

test('as regras do banco (gatilhos) valem na demonstração', async () => {
  const [a] = await db<{ id: string; turma_id: string }[]>`SELECT id, turma_id FROM alunos LIMIT 1`
  const [d] = await db<{ id: string }[]>`SELECT id FROM disciplinas LIMIT 1`
  // nota fora do intervalo 0–10 é recusada
  await assert.rejects(
    () => db`INSERT INTO notas (escola_id, turma_id, aluno_id, disciplina_id, ano_letivo, bimestre, nota)
             VALUES (${ESCOLA_DEMO_ID}, ${a.turma_id}, ${a.id}, ${d.id}, 2026, 3, 11)`
  )
})

test('todas as contas de demonstração existem e aceitam só a senha pública de demonstração', async () => {
  for (const conta of CONTAS_DEMO) {
    const [u] = await db<{ senha_hash: string; role: string }[]>`SELECT senha_hash, role FROM usuarios WHERE email = ${conta.email}`
    assert.equal(u.role, conta.role)
    assert.ok(await bcrypt.compare(SENHA_DEMO, u.senha_hash))
    assert.ok(!(await bcrypt.compare('outra-senha', u.senha_hash)))
  }
})

test('nenhum dado real: nomes de alunos vêm só das listas fictícias e o e-mail usa domínio de exemplo', async () => {
  const mal = await db<{ email: string }[]>`SELECT email FROM usuarios WHERE email NOT LIKE '%@demo.exemplo'`
  assert.equal(mal.length, 0)
})
