/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Camada de banco da VERSÃO PÚBLICA (modo demonstração).
 *
 * Em produção o sistema usa PostgreSQL real (biblioteca `postgres`). Aqui, o mesmo código de
 * consultas roda sobre um PostgreSQL em memória (PGlite, WebAssembly) que é criado a cada
 * inicialização do servidor com o esquema real (sem dados) e com dados 100% FICTÍCIOS.
 * Não existe conexão com nenhum banco externo nem com o ambiente escolar real.
 *
 * Compatível com o subconjunto da API da biblioteca `postgres` que o sistema usa:
 *   db`SELECT ... ${valor}`            consulta com parâmetros
 *   db<Tipo[]>`...`                    consulta tipada
 *   db.begin(async (tx) => { ... })    transação
 *   tx(linhas, "col1", "col2")         inserção em lote:  INSERT INTO t ${tx(linhas, "a", "b")}
 */
import { PGlite } from '@electric-sql/pglite'
import { SCHEMA_SQL } from '../demo/schema'
import { semearDadosFicticios } from '../demo/seed'

type Linha = Record<string, any>

interface Executor {
  query<T = Linha>(texto: string, params?: unknown[]): Promise<{ rows: T[] }>
}

/** Marca de "lista de linhas para INSERT" (equivalente a sql(linhas, ...colunas)). */
class InsercaoEmLote {
  constructor(
    readonly linhas: Linha[],
    readonly colunas: string[]
  ) {}
}

const g = globalThis as unknown as { __demoDb?: Promise<PGlite> }

function abrirBanco(): Promise<PGlite> {
  if (!g.__demoDb) {
    g.__demoDb = (async () => {
      // int8 (count(*), etc.) como texto, igual ao comportamento da biblioteca `postgres` usada em produção
      const banco = new PGlite({ parsers: { 20: (v: string) => v } })
      await banco.exec(SCHEMA_SQL)
      await banco.exec('SET search_path TO public, pg_catalog') // o pg_dump zera o search_path
      await semearDadosFicticios(banco)
      return banco
    })()
  }
  return g.__demoDb
}

function normalizar(v: unknown): unknown {
  return v === undefined ? null : v
}

function montar(strings: TemplateStringsArray, valores: unknown[]): { texto: string; params: unknown[] } {
  let texto = strings[0]
  const params: unknown[] = []
  valores.forEach((v, i) => {
    if (v instanceof InsercaoEmLote) {
      const cols = v.colunas.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ')
      const grupos = v.linhas.map((linha) => {
        const marcas = v.colunas.map((c) => {
          params.push(normalizar(linha[c]))
          return `$${params.length}`
        })
        return `(${marcas.join(', ')})`
      })
      texto += `(${cols}) VALUES ${grupos.join(', ')}`
    } else {
      params.push(normalizar(v))
      texto += `$${params.length}`
    }
    texto += strings[i + 1]
  })
  return { texto, params }
}

export interface Tx {
  <T extends readonly unknown[] = Linha[]>(strings: TemplateStringsArray, ...valores: unknown[]): Promise<T>
  (linhas: Linha[] | Linha, ...colunas: string[]): InsercaoEmLote
}

function criarCliente(executor: () => Promise<Executor>): Tx {
  function cliente(primeiro: any, ...resto: any[]): any {
    if (Array.isArray(primeiro) && 'raw' in primeiro) {
      const { texto, params } = montar(primeiro as TemplateStringsArray, resto)
      return executor().then(async (ex) => (await ex.query<Linha>(texto, params)).rows)
    }
    return new InsercaoEmLote(Array.isArray(primeiro) ? primeiro : [primeiro], resto as string[])
  }
  return cliente as Tx
}

const base = criarCliente(abrirBanco)

type Db = Tx & { begin<T>(fn: (tx: Tx) => Promise<T>): Promise<T> }

const db = base as Db
db.begin = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
  const banco = await abrirBanco()
  return banco.transaction(async (t) => fn(criarCliente(async () => t as unknown as Executor)))
}

export default db
