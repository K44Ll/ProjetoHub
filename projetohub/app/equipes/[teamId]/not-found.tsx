import Link from "next/link";

export default function TeamNotFound() {
  return (
    <main className="workspace-shell team-not-found">
      <section className="dashboard-empty-state">
        <h1>Equipe não encontrada</h1>
        <p>Ela não existe ou sua conta não participa desta equipe.</p>
        <Link href="/">Voltar ao painel</Link>
      </section>
    </main>
  );
}
