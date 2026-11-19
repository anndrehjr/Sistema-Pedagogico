/**
 * Dados 100% FICTÍCIOS do modo demonstração.
 *
 * Nada aqui vem do sistema escolar real: a escola, as turmas, os alunos (nomes sorteados a partir de
 * listas genéricas), as notas e as contas de acesso são gerados por um sorteador com semente fixa,
 * de modo que a demonstração é sempre a mesma. Qualquer semelhança com pessoas reais é coincidência.
 */
import type { PGlite } from '@electric-sql/pglite'
import bcrypt from 'bcryptjs'
import { ESCOLA_DEMO_ID } from './constantes'

export const SENHA_DEMO = 'demo1234'

export const CONTAS_DEMO = [
  { nome: 'Desenvolvedor Demo', email: 'dev@demo.exemplo', role: 'DEV_MASTER' },
  { nome: 'Administrador Multi-Escolas Demo', email: 'multi@demo.exemplo', role: 'SUPER_ADMIN' },
  { nome: 'Direção Demo', email: 'direcao@demo.exemplo', role: 'ADMIN_ESCOLA' },
  { nome: 'Professor Demo', email: 'professor@demo.exemplo', role: 'PROFESSOR' },
  { nome: 'Leitor Demo', email: 'leitor@demo.exemplo', role: 'LEITOR' },
] as const

const PRIMEIROS = [
  'Ana', 'Beatriz', 'Bruno', 'Camila', 'Carlos', 'Clara', 'Daniel', 'Débora', 'Eduardo', 'Elisa', 'Felipe', 'Fernanda',
  'Gabriel', 'Giovana', 'Guilherme', 'Helena', 'Henrique', 'Isabela', 'João', 'Julia', 'Larissa', 'Leonardo', 'Letícia',
  'Lucas', 'Luiza', 'Marcos', 'Mariana', 'Mateus', 'Miguel', 'Natália', 'Nicolas', 'Olívia', 'Paulo', 'Rafael', 'Rebeca',
  'Renata', 'Samuel', 'Sofia', 'Thiago', 'Valentina', 'Vitor', 'Yasmin',
]
const SOBRENOMES = [
  'Almeida', 'Araújo', 'Barbosa', 'Cardoso', 'Carvalho', 'Castro', 'Costa', 'Dias', 'Fernandes', 'Ferreira', 'Gomes',
  'Lima', 'Lopes', 'Machado', 'Martins', 'Melo', 'Moreira', 'Nascimento', 'Nogueira', 'Oliveira', 'Pereira', 'Ramos',
  'Ribeiro', 'Rocha', 'Santos', 'Silva', 'Souza', 'Teixeira', 'Vieira', 'Azevedo',
]

const DISCIPLINAS = [
  { codigo: 'C01', nome: 'Língua Portuguesa', etapa: 'AMBOS' },
  { codigo: 'C02', nome: 'Matemática', etapa: 'AMBOS' },
  { codigo: 'C03', nome: 'Ciências', etapa: 'FUNDAMENTAL' },
  { codigo: 'C04', nome: 'História', etapa: 'AMBOS' },
  { codigo: 'C05', nome: 'Geografia', etapa: 'AMBOS' },
  { codigo: 'C06', nome: 'Inglês', etapa: 'AMBOS' },
  { codigo: 'C07', nome: 'Arte', etapa: 'AMBOS' },
  { codigo: 'C08', nome: 'Educação Física', etapa: 'AMBOS' },
  { codigo: 'C09', nome: 'Biologia', etapa: 'MEDIO' },
  { codigo: 'C10', nome: 'Física', etapa: 'MEDIO' },
  { codigo: 'C11', nome: 'Química', etapa: 'MEDIO' },
  { codigo: 'C12', nome: 'Filosofia e Sociologia', etapa: 'MEDIO' },
]
const MATRIZ_EF = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08']
const MATRIZ_EM = ['C01', 'C02', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12']

const TURMAS = [
  { nome: '6º Ano A', etapa: 'EF', ano: 6, periodo: 'MANHÃ' },
  { nome: '7º Ano A', etapa: 'EF', ano: 7, periodo: 'MANHÃ' },
  { nome: '8º Ano A', etapa: 'EF', ano: 8, periodo: 'MANHÃ' },
  { nome: '9º Ano A', etapa: 'EF', ano: 9, periodo: 'MANHÃ' },
  { nome: '1ª Série A', etapa: 'EM', ano: 1, periodo: 'MANHÃ' },
  { nome: '2ª Série A', etapa: 'EM', ano: 2, periodo: 'MANHÃ' },
  { nome: '3ª Série A', etapa: 'EM', ano: 3, periodo: 'NOITE' },
] as const

const ALUNOS_POR_TURMA = 22
const ANO_LETIVO = 2026

/** Sorteador determinístico (mulberry32): a demonstração é sempre idêntica. */
function criarSorteio(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normal(r: () => number, media: number, desvio: number) {
  const u = Math.max(r(), 1e-9)
  const v = r()
  return media + desvio * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export async function semearDadosFicticios(db: PGlite): Promise<void> {
  const r = criarSorteio(20260522)
  const um = async <T extends Record<string, unknown>>(texto: string, params: unknown[] = []) =>
    (await db.query<T>(texto, params)).rows[0]

  await db.query(
    `INSERT INTO escolas (id, nome, cidade, estado, ativo, ano_letivo, bimestre_atual)
     VALUES ($1, 'Escola Estadual Modelo Horizonte (DEMONSTRAÇÃO)', 'Cidade Exemplo', 'SP', true, $2, 2)`,
    [ESCOLA_DEMO_ID, ANO_LETIVO]
  )

  // Disciplinas e matriz curricular por etapa
  const discId = new Map<string, string>()
  for (const d of DISCIPLINAS) {
    const row = await um<{ id: string }>(
      `INSERT INTO disciplinas (escola_id, codigo, nome, ativo, etapa) VALUES ($1,$2,$3,true,$4) RETURNING id`,
      [ESCOLA_DEMO_ID, d.codigo, d.nome, d.etapa]
    )
    discId.set(d.codigo, row.id)
  }
  for (const [etapa, codigos] of [['EF', MATRIZ_EF], ['EM', MATRIZ_EM]] as const) {
    for (const codigo of codigos) {
      await db.query(
        `INSERT INTO matriz_disciplinas (escola_id, etapa, codigo, disciplina_id, ativo) VALUES ($1,$2,$3,$4,true)`,
        [ESCOLA_DEMO_ID, etapa, codigo, discId.get(codigo)]
      )
    }
  }

  // Contas de demonstração (senha pública, válida somente neste banco em memória)
  const hash = await bcrypt.hash(SENHA_DEMO, 4)
  const usuarioId = new Map<string, string>()
  for (const c of CONTAS_DEMO) {
    const escola = c.role === 'DEV_MASTER' || c.role === 'SUPER_ADMIN' ? null : ESCOLA_DEMO_ID
    const row = await um<{ id: string }>(
      `INSERT INTO usuarios (nome, email, role, escola_id, ativo, senha_hash, is_dev_master, deve_trocar_senha)
       VALUES ($1,$2,$3,$4,true,$5,$6,false) RETURNING id`,
      [c.nome, c.email, c.role, escola, hash, c.role === 'DEV_MASTER']
    )
    usuarioId.set(c.role, row.id)
  }

  // Turmas, alunos, matrículas e notas
  const turmaIds: { id: string; etapa: 'EF' | 'EM'; nome: string }[] = []
  for (const t of TURMAS) {
    const turma = await um<{ id: string }>(
      `INSERT INTO turmas (escola_id, nome, etapa, ano_serie, periodo, total_ativos, ativo, grupo_pedagogico)
       VALUES ($1,$2,$3,$4,$5,0,true,$3) RETURNING id`,
      [ESCOLA_DEMO_ID, t.nome, t.etapa, t.ano, t.periodo]
    )
    turmaIds.push({ id: turma.id, etapa: t.etapa, nome: t.nome })

    const usados = new Set<string>()
    const notasLinhas: string[] = []
    for (let n = 1; n <= ALUNOS_POR_TURMA; n++) {
      let nome = ''
      do {
        nome = `${PRIMEIROS[Math.floor(r() * PRIMEIROS.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]}`
      } while (usados.has(nome))
      usados.add(nome)

      const aluno = await um<{ id: string }>(
        `INSERT INTO alunos (escola_id, turma_id, nome, numero_chamada, status, em_atencao, ativo)
         VALUES ($1,$2,$3,$4,'ATIVO',false,true) RETURNING id`,
        [ESCOLA_DEMO_ID, turma.id, nome, n]
      )
      const mat = await um<{ id: string }>(
        `INSERT INTO matriculas (escola_id, aluno_id, turma_id, ano_letivo, numero_chamada, status, data_inicio)
         VALUES ($1,$2,$3,$4,$5,'ATIVA','2026-02-02') RETURNING id`,
        [ESCOLA_DEMO_ID, aluno.id, turma.id, ANO_LETIVO, n]
      )

      const habilidade = normal(r, 6.6, 1.5)
      const tendencia = normal(r, 0.2, 0.55) // evolução individual do 1º para o 2º bimestre
      let soma = 0
      let qtd = 0
      for (const codigo of t.etapa === 'EF' ? MATRIZ_EF : MATRIZ_EM) {
        const afinidade = normal(r, 0, 0.9)
        for (const bim of [1, 2]) {
          const bruto = habilidade + afinidade + normal(r, 0, 0.6) + (bim === 2 ? tendencia : 0)
          const v = Math.min(10, Math.max(1, Math.round(bruto * 10) / 10))
          soma += v
          qtd++
          notasLinhas.push(`('${ESCOLA_DEMO_ID}','${turma.id}','${aluno.id}','${discId.get(codigo)}',${ANO_LETIVO},${bim},${v},'${mat.id}')`)
        }
      }
      if (soma / qtd < 5) await db.query(`UPDATE alunos SET em_atencao = true WHERE id = $1`, [aluno.id])
    }
    for (let i = 0; i < notasLinhas.length; i += 400) {
      await db.exec(
        `INSERT INTO notas (escola_id, turma_id, aluno_id, disciplina_id, ano_letivo, bimestre, nota, matricula_id)
         VALUES ${notasLinhas.slice(i, i + 400).join(',')}`
      )
    }
    await db.query(`UPDATE turmas SET total_ativos = $2 WHERE id = $1`, [turma.id, ALUNOS_POR_TURMA])
  }

  // Professor demo vinculado às turmas do Ensino Fundamental (Matemática e Língua Portuguesa)
  const professor = usuarioId.get('PROFESSOR')
  for (const t of turmaIds.filter((x) => x.etapa === 'EF')) {
    for (const codigo of ['C01', 'C02']) {
      await db.query(
        `INSERT INTO professor_vinculos (professor_id, escola_id, turma_id, disciplina_id, ativo) VALUES ($1,$2,$3,$4,true)`,
        [professor, ESCOLA_DEMO_ID, t.id, discId.get(codigo)]
      )
    }
  }
}
