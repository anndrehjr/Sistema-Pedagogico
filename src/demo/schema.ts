// Esquema do banco (somente ESTRUTURA, sem nenhum dado), extraído com pg_dump --schema-only.
// Usado para criar o PostgreSQL em memória do modo demonstração.
export const SCHEMA_SQL = `
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: calcular_validar_recuperacao(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_validar_recuperacao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  mat public.matriculas%ROWTYPE;
  grupo text;
BEGIN
  SELECT * INTO mat FROM public.matriculas WHERE id = NEW.matricula_id;
  IF mat.id IS NULL OR mat.escola_id <> NEW.escola_id OR mat.turma_id <> NEW.turma_id
     OR mat.ano_letivo <> NEW.ano_letivo THEN
    RAISE EXCEPTION 'Recuperação não corresponde à matrícula';
  END IF;
  SELECT grupo_pedagogico INTO grupo FROM public.turmas WHERE id = NEW.turma_id AND escola_id = NEW.escola_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.matriz_disciplinas md
    WHERE md.escola_id = NEW.escola_id AND md.etapa = grupo
      AND md.disciplina_id = NEW.disciplina_id AND md.ativo = true
  ) THEN RAISE EXCEPTION 'Disciplina fora da matriz da recuperação'; END IF;
  NEW.nota_final := CASE NEW.criterio
    WHEN 'MAIOR_NOTA' THEN greatest(NEW.nota_anterior, NEW.nota_recuperacao)
    WHEN 'MEDIA_ARITMETICA' THEN round((NEW.nota_anterior + NEW.nota_recuperacao) / 2, 2)
    ELSE NEW.nota_recuperacao
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: preencher_validar_nota_matricula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preencher_validar_nota_matricula() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  matricula public.matriculas%ROWTYPE;
BEGIN
  IF NEW.matricula_id IS NULL THEN
    SELECT m.* INTO matricula
    FROM public.matriculas m
    WHERE m.escola_id = NEW.escola_id
      AND m.aluno_id = NEW.aluno_id
      AND m.turma_id = NEW.turma_id
      AND m.ano_letivo = NEW.ano_letivo
    ORDER BY CASE WHEN m.status = 'ATIVA' THEN 0 ELSE 1 END
    LIMIT 1;
    NEW.matricula_id := matricula.id;
  ELSE
    SELECT m.* INTO matricula FROM public.matriculas m WHERE m.id = NEW.matricula_id;
  END IF;

  IF matricula.id IS NULL
     OR matricula.escola_id <> NEW.escola_id
     OR matricula.aluno_id <> NEW.aluno_id
     OR matricula.turma_id <> NEW.turma_id
     OR matricula.ano_letivo <> NEW.ano_letivo THEN
    RAISE EXCEPTION 'A nota não corresponde à matrícula anual informada';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sincronizar_aluno_com_matriculas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sincronizar_aluno_com_matriculas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  aluno_alvo uuid := COALESCE(NEW.aluno_id, OLD.aluno_id);
  matricula_atual record;
BEGIN
  SELECT m.status,m.turma_id,m.numero_chamada INTO matricula_atual
  FROM matriculas m WHERE m.aluno_id=aluno_alvo
  ORDER BY (m.status='ATIVA') DESC,m.ano_letivo DESC,m.updated_at DESC,m.created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    UPDATE alunos SET status='INATIVO',ativo=false WHERE id=aluno_alvo;
  ELSIF matricula_atual.status='ATIVA' THEN
    UPDATE alunos SET status='ATIVO',ativo=true,turma_id=matricula_atual.turma_id,
      numero_chamada=matricula_atual.numero_chamada WHERE id=aluno_alvo;
  ELSE
    UPDATE alunos SET status=CASE matricula_atual.status
      WHEN 'TRANSFERIDA' THEN 'TRANSFERIDO'
      WHEN 'CONCLUIDA' THEN 'CONCLUIDO'
      ELSE 'INATIVO' END,ativo=false WHERE id=aluno_alvo;
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;


--
-- Name: validar_avaliacao_escopo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_avaliacao_escopo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  grupo text;
BEGIN
  SELECT t.grupo_pedagogico INTO grupo
  FROM public.turmas t
  WHERE t.id = NEW.turma_id AND t.escola_id = NEW.escola_id AND t.ativo = true;
  IF grupo IS NULL THEN RAISE EXCEPTION 'Turma inválida para a avaliação'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.matriz_disciplinas md
    JOIN public.disciplinas d ON d.id = md.disciplina_id
    WHERE md.escola_id = NEW.escola_id AND md.etapa = grupo
      AND md.disciplina_id = NEW.disciplina_id AND md.ativo = true AND d.ativo = true
  ) THEN RAISE EXCEPTION 'Disciplina fora da matriz da turma'; END IF;
  NEW.nome := btrim(NEW.nome);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: validar_matricula_escopo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_matricula_escopo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = NEW.aluno_id AND a.escola_id = NEW.escola_id
  ) THEN
    RAISE EXCEPTION 'Aluno não pertence à escola da matrícula';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.turmas t
    WHERE t.id = NEW.turma_id AND t.escola_id = NEW.escola_id
  ) THEN
    RAISE EXCEPTION 'Turma não pertence à escola da matrícula';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: validar_professor_vinculo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_professor_vinculo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  turma_grupo text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = NEW.professor_id
      AND u.escola_id = NEW.escola_id
      AND u.role = 'PROFESSOR'
      AND u.ativo = true
  ) THEN
    RAISE EXCEPTION 'O vínculo exige um professor ativo da mesma escola';
  END IF;

  SELECT t.grupo_pedagogico INTO turma_grupo
  FROM public.turmas t
  WHERE t.id = NEW.turma_id AND t.escola_id = NEW.escola_id AND t.ativo = true;

  IF turma_grupo IS NULL THEN
    RAISE EXCEPTION 'A turma do vínculo não pertence à escola ou está inativa';
  END IF;

  IF NEW.disciplina_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.matriz_disciplinas md
    JOIN public.disciplinas d ON d.id = md.disciplina_id
    WHERE md.escola_id = NEW.escola_id
      AND md.etapa = turma_grupo
      AND md.disciplina_id = NEW.disciplina_id
      AND md.ativo = true
      AND d.ativo = true
  ) THEN
    RAISE EXCEPTION 'A disciplina não pertence à matriz da turma';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validar_resultado_avaliacao(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_resultado_avaliacao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  av public.avaliacoes%ROWTYPE;
  mat public.matriculas%ROWTYPE;
BEGIN
  SELECT * INTO av FROM public.avaliacoes WHERE id = NEW.avaliacao_id;
  SELECT * INTO mat FROM public.matriculas WHERE id = NEW.matricula_id;
  IF av.id IS NULL OR mat.id IS NULL OR mat.escola_id <> av.escola_id
     OR mat.turma_id <> av.turma_id OR mat.ano_letivo <> av.ano_letivo THEN
    RAISE EXCEPTION 'Resultado não corresponde à avaliação e à matrícula';
  END IF;
  IF NEW.nota IS NOT NULL AND (NEW.nota < 0 OR NEW.nota > av.nota_maxima) THEN
    RAISE EXCEPTION 'Resultado fora da escala da avaliação';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alunos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alunos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    nome text NOT NULL,
    numero_chamada integer NOT NULL,
    status text DEFAULT 'ATIVO'::text NOT NULL,
    em_atencao boolean DEFAULT false NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT alunos_numero_chamada_positivo CHECK ((numero_chamada > 0)),
    CONSTRAINT alunos_status_valido CHECK ((status = ANY (ARRAY['ATIVO'::text, 'TRANSFERIDO'::text, 'INATIVO'::text, 'CONCLUIDO'::text, 'ABANDONO'::text])))
);


--
-- Name: avaliacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avaliacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    disciplina_id uuid NOT NULL,
    ano_letivo integer NOT NULL,
    bimestre integer NOT NULL,
    nome text NOT NULL,
    tipo text DEFAULT 'PROVA'::text NOT NULL,
    peso numeric(8,2) DEFAULT 1 NOT NULL,
    nota_maxima numeric(8,2) DEFAULT 10 NOT NULL,
    data_avaliacao date,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT avaliacoes_ano_valido CHECK (((ano_letivo >= 2000) AND (ano_letivo <= 2100))),
    CONSTRAINT avaliacoes_bimestre_valido CHECK (((bimestre >= 1) AND (bimestre <= 4))),
    CONSTRAINT avaliacoes_nome_valido CHECK (((char_length(btrim(nome)) >= 2) AND (char_length(btrim(nome)) <= 120))),
    CONSTRAINT avaliacoes_nota_maxima_valida CHECK (((nota_maxima > (0)::numeric) AND (nota_maxima <= (100)::numeric))),
    CONSTRAINT avaliacoes_peso_valido CHECK (((peso > (0)::numeric) AND (peso <= (100)::numeric))),
    CONSTRAINT avaliacoes_tipo_valido CHECK ((tipo = ANY (ARRAY['ATIVIDADE'::text, 'PROVA'::text, 'TRABALHO'::text, 'SIMULADO'::text, 'OUTRA'::text])))
);


--
-- Name: dev_caderno_componentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_caderno_componentes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caderno_id uuid NOT NULL,
    nome text NOT NULL,
    ordem integer NOT NULL,
    peso numeric(7,4),
    nota_maxima numeric(5,2) DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dev_caderno_componentes_nome_check CHECK (((char_length(btrim(nome)) >= 1) AND (char_length(btrim(nome)) <= 60))),
    CONSTRAINT dev_caderno_componentes_nota_maxima_check CHECK (((nota_maxima > (0)::numeric) AND (nota_maxima <= (100)::numeric))),
    CONSTRAINT dev_caderno_componentes_ordem_check CHECK (((ordem >= 1) AND (ordem <= 20))),
    CONSTRAINT dev_caderno_componentes_peso_check CHECK (((peso IS NULL) OR ((peso > (0)::numeric) AND (peso <= (100)::numeric))))
);


--
-- Name: dev_caderno_resultados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_caderno_resultados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caderno_id uuid NOT NULL,
    componente_id uuid NOT NULL,
    matricula_id uuid NOT NULL,
    nota numeric(6,2) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dev_caderno_resultados_nota_check CHECK (((nota >= (0)::numeric) AND (nota <= (100)::numeric)))
);


--
-- Name: dev_cadernos_notas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_cadernos_notas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    disciplina_id uuid NOT NULL,
    ano_letivo integer NOT NULL,
    bimestre integer NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dev_cadernos_notas_ano_letivo_check CHECK (((ano_letivo >= 2000) AND (ano_letivo <= 2100))),
    CONSTRAINT dev_cadernos_notas_bimestre_check CHECK (((bimestre >= 1) AND (bimestre <= 4)))
);


--
-- Name: disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    etapa text DEFAULT 'AMBOS'::text NOT NULL,
    serie_especifica text,
    CONSTRAINT disciplinas_etapa_valida CHECK ((etapa = ANY (ARRAY['AMBOS'::text, 'FUNDAMENTAL'::text, 'MEDIO'::text])))
);


--
-- Name: escolas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escolas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cidade text,
    estado text,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    ano_letivo integer,
    bimestre_atual integer
);


--
-- Name: logs_acesso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_acesso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    acao text NOT NULL,
    tabela text,
    registro_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    usuario_email text,
    role text,
    escola_id uuid,
    tela text,
    ip text,
    user_agent text,
    dados_anteriores jsonb,
    dados_novos jsonb,
    sucesso boolean DEFAULT true NOT NULL
);


--
-- Name: matriculas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matriculas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    ano_letivo integer NOT NULL,
    numero_chamada integer NOT NULL,
    status text DEFAULT 'ATIVA'::text NOT NULL,
    data_inicio date DEFAULT CURRENT_DATE NOT NULL,
    data_fim date,
    motivo_fim text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT matriculas_ano_valido CHECK (((ano_letivo >= 2000) AND (ano_letivo <= 2100))),
    CONSTRAINT matriculas_numero_positivo CHECK ((numero_chamada > 0)),
    CONSTRAINT matriculas_periodo_valido CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio))),
    CONSTRAINT matriculas_status_valido CHECK ((status = ANY (ARRAY['ATIVA'::text, 'TRANSFERIDA'::text, 'CONCLUIDA'::text, 'CANCELADA'::text])))
);


--
-- Name: matriz_disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matriz_disciplinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    etapa text NOT NULL,
    codigo text NOT NULL,
    disciplina_id uuid NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    disciplina_id uuid NOT NULL,
    ano_letivo integer NOT NULL,
    bimestre integer NOT NULL,
    nota numeric NOT NULL,
    status text DEFAULT 'NORMAL'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    matricula_id uuid NOT NULL,
    origem_calculo text DEFAULT 'LANCAMENTO_MANUAL'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notas_ano_letivo_intervalo CHECK (((ano_letivo >= 2000) AND (ano_letivo <= 2100))),
    CONSTRAINT notas_bimestre_intervalo CHECK (((bimestre >= 1) AND (bimestre <= 4))),
    CONSTRAINT notas_nota_intervalo CHECK (((nota >= (0)::numeric) AND (nota <= (10)::numeric))),
    CONSTRAINT notas_origem_calculo_valida CHECK ((origem_calculo = ANY (ARRAY['LANCAMENTO_MANUAL'::text, 'AVALIACOES'::text, 'RECUPERACAO'::text]))),
    CONSTRAINT notas_status_valido CHECK ((status = ANY (ARRAY['NORMAL'::text, 'RECUPERACAO'::text, 'CONSELHO'::text, 'AJUSTE'::text])))
);


--
-- Name: professor_vinculos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.professor_vinculos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    professor_id uuid NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    disciplina_id uuid,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prova_paulista_resultados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prova_paulista_resultados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    ano_letivo integer NOT NULL,
    bimestre smallint NOT NULL,
    disciplina_codigo character varying(16) NOT NULL,
    percentual_acertos numeric(5,2) NOT NULL,
    fonte character varying(120) DEFAULT 'Importação de planilha'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prova_paulista_resultados_ano_letivo_check CHECK (((ano_letivo >= 2000) AND (ano_letivo <= 2100))),
    CONSTRAINT prova_paulista_resultados_bimestre_check CHECK (((bimestre >= 1) AND (bimestre <= 4))),
    CONSTRAINT prova_paulista_resultados_percentual_acertos_check CHECK (((percentual_acertos >= (0)::numeric) AND (percentual_acertos <= (100)::numeric)))
);


--
-- Name: recuperacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recuperacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    matricula_id uuid NOT NULL,
    disciplina_id uuid NOT NULL,
    ano_letivo integer NOT NULL,
    bimestre integer NOT NULL,
    tipo text DEFAULT 'BIMESTRAL'::text NOT NULL,
    criterio text DEFAULT 'MAIOR_NOTA'::text NOT NULL,
    nota_anterior numeric(4,2) NOT NULL,
    nota_recuperacao numeric(4,2) NOT NULL,
    nota_final numeric(4,2) NOT NULL,
    observacao text,
    aplicado boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recuperacoes_ano_valido CHECK (((ano_letivo >= 2000) AND (ano_letivo <= 2100))),
    CONSTRAINT recuperacoes_bimestre_valido CHECK (((bimestre >= 1) AND (bimestre <= 4))),
    CONSTRAINT recuperacoes_criterio_valido CHECK ((criterio = ANY (ARRAY['MAIOR_NOTA'::text, 'MEDIA_ARITMETICA'::text, 'SUBSTITUICAO'::text]))),
    CONSTRAINT recuperacoes_notas_validas CHECK ((((nota_anterior >= (0)::numeric) AND (nota_anterior <= (10)::numeric)) AND ((nota_recuperacao >= (0)::numeric) AND (nota_recuperacao <= (10)::numeric)) AND ((nota_final >= (0)::numeric) AND (nota_final <= (10)::numeric)))),
    CONSTRAINT recuperacoes_tipo_valido CHECK ((tipo = ANY (ARRAY['PARALELA'::text, 'BIMESTRAL'::text, 'FINAL'::text])))
);


--
-- Name: resultados_avaliacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resultados_avaliacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    avaliacao_id uuid NOT NULL,
    matricula_id uuid NOT NULL,
    nota numeric(8,2),
    ausente boolean DEFAULT false NOT NULL,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT resultados_avaliacoes_presenca CHECK ((((ausente = true) AND (nota IS NULL)) OR ((ausente = false) AND (nota IS NOT NULL))))
);


--
-- Name: tentativas_login; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tentativas_login (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    ip text NOT NULL,
    sucesso boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tokens_revogados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens_revogados (
    jti uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revogado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: turmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turmas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escola_id uuid NOT NULL,
    nome text NOT NULL,
    etapa text NOT NULL,
    ano_serie integer NOT NULL,
    periodo text NOT NULL,
    total_ativos integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    serie_codigo text,
    grupo_pedagogico text NOT NULL,
    CONSTRAINT turmas_ano_serie_intervalo CHECK (((ano_serie >= 1) AND (ano_serie <= 9))),
    CONSTRAINT turmas_etapa_valida CHECK ((etapa = ANY (ARRAY['EF'::text, 'EM'::text]))),
    CONSTRAINT turmas_total_ativos_nao_negativo CHECK ((total_ativos >= 0))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    escola_id uuid,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    auth_id uuid,
    senha_hash text,
    is_dev_master boolean DEFAULT false NOT NULL,
    deve_trocar_senha boolean DEFAULT false NOT NULL,
    session_version integer DEFAULT 0 NOT NULL,
    CONSTRAINT usuarios_role_valida CHECK ((role = ANY (ARRAY['DEV_MASTER'::text, 'SUPER_ADMIN'::text, 'ADMIN_ESCOLA'::text, 'PROFESSOR'::text, 'LEITOR'::text]))),
    CONSTRAINT usuarios_session_version_valida CHECK ((session_version >= 0))
);


--
-- Name: alunos alunos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alunos
    ADD CONSTRAINT alunos_pkey PRIMARY KEY (id);


--
-- Name: avaliacoes avaliacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_pkey PRIMARY KEY (id);


--
-- Name: dev_caderno_componentes dev_caderno_componentes_caderno_id_ordem_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_componentes
    ADD CONSTRAINT dev_caderno_componentes_caderno_id_ordem_key UNIQUE (caderno_id, ordem);


--
-- Name: dev_caderno_componentes dev_caderno_componentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_componentes
    ADD CONSTRAINT dev_caderno_componentes_pkey PRIMARY KEY (id);


--
-- Name: dev_caderno_resultados dev_caderno_resultados_componente_id_matricula_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_resultados
    ADD CONSTRAINT dev_caderno_resultados_componente_id_matricula_id_key UNIQUE (componente_id, matricula_id);


--
-- Name: dev_caderno_resultados dev_caderno_resultados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_resultados
    ADD CONSTRAINT dev_caderno_resultados_pkey PRIMARY KEY (id);


--
-- Name: dev_cadernos_notas dev_cadernos_notas_created_by_turma_id_disciplina_id_ano_le_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cadernos_notas
    ADD CONSTRAINT dev_cadernos_notas_created_by_turma_id_disciplina_id_ano_le_key UNIQUE (created_by, turma_id, disciplina_id, ano_letivo, bimestre);


--
-- Name: dev_cadernos_notas dev_cadernos_notas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cadernos_notas
    ADD CONSTRAINT dev_cadernos_notas_pkey PRIMARY KEY (id);


--
-- Name: disciplinas disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_pkey PRIMARY KEY (id);


--
-- Name: escolas escolas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escolas
    ADD CONSTRAINT escolas_pkey PRIMARY KEY (id);


--
-- Name: logs_acesso logs_acesso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_acesso
    ADD CONSTRAINT logs_acesso_pkey PRIMARY KEY (id);


--
-- Name: matriculas matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);


--
-- Name: matriz_disciplinas matriz_disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriz_disciplinas
    ADD CONSTRAINT matriz_disciplinas_pkey PRIMARY KEY (id);


--
-- Name: notas notas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_pkey PRIMARY KEY (id);


--
-- Name: notas notas_unicidade; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_unicidade UNIQUE (aluno_id, disciplina_id, bimestre, ano_letivo);


--
-- Name: professor_vinculos professor_vinculos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professor_vinculos
    ADD CONSTRAINT professor_vinculos_pkey PRIMARY KEY (id);


--
-- Name: prova_paulista_resultados prova_paulista_resultados_escola_id_turma_id_ano_letivo_bim_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prova_paulista_resultados
    ADD CONSTRAINT prova_paulista_resultados_escola_id_turma_id_ano_letivo_bim_key UNIQUE (escola_id, turma_id, ano_letivo, bimestre, disciplina_codigo);


--
-- Name: prova_paulista_resultados prova_paulista_resultados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prova_paulista_resultados
    ADD CONSTRAINT prova_paulista_resultados_pkey PRIMARY KEY (id);


--
-- Name: recuperacoes recuperacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_pkey PRIMARY KEY (id);


--
-- Name: recuperacoes recuperacoes_unicidade; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_unicidade UNIQUE (matricula_id, disciplina_id, ano_letivo, bimestre, tipo);


--
-- Name: resultados_avaliacoes resultados_avaliacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultados_avaliacoes
    ADD CONSTRAINT resultados_avaliacoes_pkey PRIMARY KEY (id);


--
-- Name: resultados_avaliacoes resultados_avaliacoes_unicidade; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultados_avaliacoes
    ADD CONSTRAINT resultados_avaliacoes_unicidade UNIQUE (avaliacao_id, matricula_id);


--
-- Name: tentativas_login tentativas_login_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tentativas_login
    ADD CONSTRAINT tentativas_login_pkey PRIMARY KEY (id);


--
-- Name: tokens_revogados tokens_revogados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens_revogados
    ADD CONSTRAINT tokens_revogados_pkey PRIMARY KEY (jti);


--
-- Name: tokens_revogados tokens_revogados_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens_revogados
    ADD CONSTRAINT tokens_revogados_token_hash_key UNIQUE (token_hash);


--
-- Name: turmas turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_alunos_escola_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alunos_escola_id ON public.alunos USING btree (escola_id);


--
-- Name: idx_alunos_turma_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alunos_turma_id ON public.alunos USING btree (turma_id);


--
-- Name: idx_avaliacoes_contexto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avaliacoes_contexto ON public.avaliacoes USING btree (escola_id, turma_id, disciplina_id, ano_letivo, bimestre, ativo);


--
-- Name: idx_avaliacoes_relatorios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avaliacoes_relatorios ON public.avaliacoes USING btree (escola_id, ano_letivo, turma_id, disciplina_id, bimestre) WHERE (ativo = true);


--
-- Name: idx_dev_caderno_resultados_caderno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_caderno_resultados_caderno ON public.dev_caderno_resultados USING btree (caderno_id, matricula_id);


--
-- Name: idx_dev_cadernos_contexto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_cadernos_contexto ON public.dev_cadernos_notas USING btree (created_by, escola_id, ano_letivo, bimestre);


--
-- Name: idx_disciplinas_escola_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disciplinas_escola_id ON public.disciplinas USING btree (escola_id);


--
-- Name: idx_logs_acesso_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_acesso_created_at ON public.logs_acesso USING btree (created_at DESC);


--
-- Name: idx_logs_acesso_escola; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_acesso_escola ON public.logs_acesso USING btree (escola_id);


--
-- Name: idx_logs_acesso_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_acesso_usuario ON public.logs_acesso USING btree (usuario_id);


--
-- Name: idx_matriculas_escola_ano_turma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matriculas_escola_ano_turma ON public.matriculas USING btree (escola_id, ano_letivo, turma_id, status);


--
-- Name: idx_matriz_escola_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matriz_escola_id ON public.matriz_disciplinas USING btree (escola_id);


--
-- Name: idx_notas_aluno_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_aluno_id ON public.notas USING btree (aluno_id);


--
-- Name: idx_notas_disciplina_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_disciplina_id ON public.notas USING btree (disciplina_id);


--
-- Name: idx_notas_escola_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_escola_id ON public.notas USING btree (escola_id);


--
-- Name: idx_notas_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_matricula ON public.notas USING btree (matricula_id);


--
-- Name: idx_notas_relatorios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_relatorios ON public.notas USING btree (escola_id, ano_letivo, turma_id, disciplina_id, bimestre, aluno_id);


--
-- Name: idx_notas_turma_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_turma_id ON public.notas USING btree (turma_id);


--
-- Name: idx_professor_vinculos_professor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_professor_vinculos_professor ON public.professor_vinculos USING btree (professor_id, escola_id) WHERE (ativo = true);


--
-- Name: idx_prova_paulista_consulta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prova_paulista_consulta ON public.prova_paulista_resultados USING btree (escola_id, ano_letivo, bimestre, turma_id);


--
-- Name: idx_recuperacoes_contexto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recuperacoes_contexto ON public.recuperacoes USING btree (escola_id, turma_id, disciplina_id, ano_letivo, bimestre);


--
-- Name: idx_recuperacoes_relatorios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recuperacoes_relatorios ON public.recuperacoes USING btree (escola_id, ano_letivo, turma_id, disciplina_id, bimestre, matricula_id) WHERE (aplicado = true);


--
-- Name: idx_resultados_avaliacoes_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resultados_avaliacoes_matricula ON public.resultados_avaliacoes USING btree (matricula_id, avaliacao_id);


--
-- Name: idx_tentativas_login_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tentativas_login_email ON public.tentativas_login USING btree (email, created_at DESC);


--
-- Name: idx_tentativas_login_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tentativas_login_ip ON public.tentativas_login USING btree (ip, created_at DESC);


--
-- Name: idx_tokens_revogados_expira; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_revogados_expira ON public.tokens_revogados USING btree (expires_at);


--
-- Name: idx_tokens_revogados_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_revogados_expires ON public.tokens_revogados USING btree (expires_at);


--
-- Name: idx_tokens_revogados_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_revogados_hash ON public.tokens_revogados USING btree (token_hash);


--
-- Name: idx_turmas_escola_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turmas_escola_id ON public.turmas USING btree (escola_id);


--
-- Name: idx_usuarios_escola_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_escola_id ON public.usuarios USING btree (escola_id);


--
-- Name: idx_usuarios_unico_dev_master; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_usuarios_unico_dev_master ON public.usuarios USING btree (is_dev_master) WHERE (is_dev_master = true);


--
-- Name: uq_alunos_turma_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_alunos_turma_numero ON public.alunos USING btree (turma_id, numero_chamada);


--
-- Name: uq_disciplinas_nome_normalizado_ativa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_disciplinas_nome_normalizado_ativa ON public.disciplinas USING btree (escola_id, lower(regexp_replace(TRIM(BOTH FROM nome), '\\s+'::text, ' '::text, 'g'::text))) WHERE (ativo = true);


--
-- Name: uq_matriculas_aluno_turma_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_matriculas_aluno_turma_ano ON public.matriculas USING btree (aluno_id, turma_id, ano_letivo);


--
-- Name: uq_matriculas_ativa_aluno_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_matriculas_ativa_aluno_ano ON public.matriculas USING btree (aluno_id, ano_letivo) WHERE (status = 'ATIVA'::text);


--
-- Name: uq_matriculas_ativa_chamada; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_matriculas_ativa_chamada ON public.matriculas USING btree (turma_id, ano_letivo, numero_chamada) WHERE (status = 'ATIVA'::text);


--
-- Name: uq_matriz_escola_etapa_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_matriz_escola_etapa_codigo ON public.matriz_disciplinas USING btree (escola_id, etapa, codigo);


--
-- Name: uq_matriz_escola_etapa_disciplina; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_matriz_escola_etapa_disciplina ON public.matriz_disciplinas USING btree (escola_id, etapa, disciplina_id);


--
-- Name: uq_notas_matricula_disciplina_bimestre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_notas_matricula_disciplina_bimestre ON public.notas USING btree (matricula_id, disciplina_id, bimestre);


--
-- Name: uq_professor_vinculo_disciplina; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_professor_vinculo_disciplina ON public.professor_vinculos USING btree (professor_id, escola_id, turma_id, disciplina_id) WHERE (disciplina_id IS NOT NULL);


--
-- Name: uq_professor_vinculo_geral; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_professor_vinculo_geral ON public.professor_vinculos USING btree (professor_id, escola_id, turma_id) WHERE (disciplina_id IS NULL);


--
-- Name: uq_turmas_escola_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_turmas_escola_nome ON public.turmas USING btree (escola_id, nome);


--
-- Name: recuperacoes trg_calcular_validar_recuperacao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calcular_validar_recuperacao BEFORE INSERT OR UPDATE ON public.recuperacoes FOR EACH ROW EXECUTE FUNCTION public.calcular_validar_recuperacao();


--
-- Name: notas trg_preencher_validar_nota_matricula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_preencher_validar_nota_matricula BEFORE INSERT OR UPDATE OF escola_id, turma_id, aluno_id, ano_letivo, matricula_id ON public.notas FOR EACH ROW EXECUTE FUNCTION public.preencher_validar_nota_matricula();


--
-- Name: matriculas trg_sincronizar_aluno_matricula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sincronizar_aluno_matricula AFTER INSERT OR DELETE OR UPDATE OF status, turma_id, numero_chamada, ano_letivo ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.sincronizar_aluno_com_matriculas();


--
-- Name: avaliacoes trg_validar_avaliacao_escopo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_avaliacao_escopo BEFORE INSERT OR UPDATE ON public.avaliacoes FOR EACH ROW EXECUTE FUNCTION public.validar_avaliacao_escopo();


--
-- Name: matriculas trg_validar_matricula_escopo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_matricula_escopo BEFORE INSERT OR UPDATE ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.validar_matricula_escopo();


--
-- Name: professor_vinculos trg_validar_professor_vinculo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_professor_vinculo BEFORE INSERT OR UPDATE ON public.professor_vinculos FOR EACH ROW EXECUTE FUNCTION public.validar_professor_vinculo();


--
-- Name: resultados_avaliacoes trg_validar_resultado_avaliacao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_resultado_avaliacao BEFORE INSERT OR UPDATE ON public.resultados_avaliacoes FOR EACH ROW EXECUTE FUNCTION public.validar_resultado_avaliacao();


--
-- Name: alunos alunos_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alunos
    ADD CONSTRAINT alunos_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: alunos alunos_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alunos
    ADD CONSTRAINT alunos_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);


--
-- Name: avaliacoes avaliacoes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: avaliacoes avaliacoes_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: avaliacoes avaliacoes_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: avaliacoes avaliacoes_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);


--
-- Name: dev_caderno_componentes dev_caderno_componentes_caderno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_componentes
    ADD CONSTRAINT dev_caderno_componentes_caderno_id_fkey FOREIGN KEY (caderno_id) REFERENCES public.dev_cadernos_notas(id) ON DELETE CASCADE;


--
-- Name: dev_caderno_resultados dev_caderno_resultados_caderno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_resultados
    ADD CONSTRAINT dev_caderno_resultados_caderno_id_fkey FOREIGN KEY (caderno_id) REFERENCES public.dev_cadernos_notas(id) ON DELETE CASCADE;


--
-- Name: dev_caderno_resultados dev_caderno_resultados_componente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_resultados
    ADD CONSTRAINT dev_caderno_resultados_componente_id_fkey FOREIGN KEY (componente_id) REFERENCES public.dev_caderno_componentes(id) ON DELETE CASCADE;


--
-- Name: dev_caderno_resultados dev_caderno_resultados_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_caderno_resultados
    ADD CONSTRAINT dev_caderno_resultados_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: dev_cadernos_notas dev_cadernos_notas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cadernos_notas
    ADD CONSTRAINT dev_cadernos_notas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: dev_cadernos_notas dev_cadernos_notas_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cadernos_notas
    ADD CONSTRAINT dev_cadernos_notas_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id) ON DELETE RESTRICT;


--
-- Name: dev_cadernos_notas dev_cadernos_notas_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cadernos_notas
    ADD CONSTRAINT dev_cadernos_notas_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id) ON DELETE CASCADE;


--
-- Name: dev_cadernos_notas dev_cadernos_notas_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cadernos_notas
    ADD CONSTRAINT dev_cadernos_notas_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE;


--
-- Name: disciplinas disciplinas_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: matriculas matriculas_aluno_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_aluno_fkey FOREIGN KEY (aluno_id) REFERENCES public.alunos(id);


--
-- Name: matriculas matriculas_escola_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_escola_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: matriculas matriculas_turma_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_turma_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);


--
-- Name: matriz_disciplinas matriz_disciplinas_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriz_disciplinas
    ADD CONSTRAINT matriz_disciplinas_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: matriz_disciplinas matriz_disciplinas_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriz_disciplinas
    ADD CONSTRAINT matriz_disciplinas_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: notas notas_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.alunos(id);


--
-- Name: notas notas_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: notas notas_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: notas notas_matricula_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_matricula_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id);


--
-- Name: notas notas_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);


--
-- Name: professor_vinculos professor_vinculos_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professor_vinculos
    ADD CONSTRAINT professor_vinculos_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: professor_vinculos professor_vinculos_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professor_vinculos
    ADD CONSTRAINT professor_vinculos_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: professor_vinculos professor_vinculos_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professor_vinculos
    ADD CONSTRAINT professor_vinculos_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.usuarios(id);


--
-- Name: professor_vinculos professor_vinculos_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professor_vinculos
    ADD CONSTRAINT professor_vinculos_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);


--
-- Name: prova_paulista_resultados prova_paulista_resultados_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prova_paulista_resultados
    ADD CONSTRAINT prova_paulista_resultados_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: prova_paulista_resultados prova_paulista_resultados_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prova_paulista_resultados
    ADD CONSTRAINT prova_paulista_resultados_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id) ON DELETE CASCADE;


--
-- Name: prova_paulista_resultados prova_paulista_resultados_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prova_paulista_resultados
    ADD CONSTRAINT prova_paulista_resultados_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE;


--
-- Name: recuperacoes recuperacoes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: recuperacoes recuperacoes_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: recuperacoes recuperacoes_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: recuperacoes recuperacoes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id);


--
-- Name: recuperacoes recuperacoes_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacoes
    ADD CONSTRAINT recuperacoes_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id);


--
-- Name: resultados_avaliacoes resultados_avaliacoes_avaliacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultados_avaliacoes
    ADD CONSTRAINT resultados_avaliacoes_avaliacao_id_fkey FOREIGN KEY (avaliacao_id) REFERENCES public.avaliacoes(id);


--
-- Name: resultados_avaliacoes resultados_avaliacoes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultados_avaliacoes
    ADD CONSTRAINT resultados_avaliacoes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id);


--
-- Name: turmas turmas_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- Name: usuarios usuarios_escola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES public.escolas(id);


--
-- PostgreSQL database dump complete
--


`
