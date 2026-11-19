/** Faixa fixa que deixa claro, em todas as telas, que esta é a versão pública de demonstração. */
export function BannerDemo() {
  return (
    <div
      role="note"
      className="w-full px-4 py-1.5 text-center text-xs font-medium"
      style={{ background: "#78350f", color: "#fef3c7" }}
    >
      VERSÃO DE DEMONSTRAÇÃO · todos os dados são fictícios e ficam apenas na memória do servidor · nenhuma informação
      escolar real
    </div>
  );
}
