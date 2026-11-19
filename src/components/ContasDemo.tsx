"use client";

const CONTAS = [
  { rotulo: "Dev Master", email: "dev@demo.exemplo" },
  { rotulo: "Administrador Multi-Escolas", email: "multi@demo.exemplo" },
  { rotulo: "Direção/Coordenação", email: "direcao@demo.exemplo" },
  { rotulo: "Professor", email: "professor@demo.exemplo" },
  { rotulo: "Somente leitura", email: "leitor@demo.exemplo" },
];

/** Atalho do modo demonstração: preenche o formulário com uma conta fictícia (senha pública de demonstração). */
export function ContasDemo({ onEscolher }: { onEscolher: (email: string, senha: string) => void }) {
  return (
    <section
      aria-label="Contas de demonstração"
      className="mt-4 rounded-xl border p-4 text-sm"
      style={{ borderColor: "var(--border, #27272a)", background: "var(--bg-card, #18181b)" }}
    >
      <p className="mb-2 font-semibold">Contas de demonstração</p>
      <p className="mb-3 text-xs opacity-70">
        Dados 100% fictícios. Senha de todas: <code>demo1234</code>. Escolha um perfil para ver o que cada um acessa.
      </p>
      <div className="flex flex-wrap gap-2">
        {CONTAS.map((c) => (
          <button
            key={c.email}
            type="button"
            onClick={() => onEscolher(c.email, "demo1234")}
            className="rounded-lg border px-3 py-1.5 text-xs hover:opacity-80"
            style={{ borderColor: "var(--border, #3f3f46)" }}
          >
            {c.rotulo}
          </button>
        ))}
      </div>
    </section>
  );
}
