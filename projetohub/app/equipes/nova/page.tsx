import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { CreateTeamForm } from "@/components/teams/create-team-form";
import { ThemeControl } from "@/components/theme-control";
import { createClient } from "@/utils/supabase/server";

export default async function NewTeamPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login?next=/equipes/nova");
  }

  return (
    <main className="workspace-shell">
      <div className="dashboard-grid-bg" aria-hidden="true" />
      <div className="dashboard-glow dashboard-glow-one" aria-hidden="true" />

      <header className="workspace-header">
        <Link className="brand" href="/" aria-label="Voltar ao ProjetoHub">
          <BrandMark />
          <span>ProjetoHub</span>
        </Link>
        <ThemeControl />
      </header>

      <section className="team-form-layout">
        <div className="team-form-intro">
          <span className="dashboard-eyebrow">Nova equipe</span>
          <h1>Comece organizando o trabalho.</h1>
          <p>
            Você será o líder e poderá convidar integrantes, definir cargos e
            distribuir tarefas depois da criação.
          </p>
          <div className="team-form-role-note">
            <strong>Seu cargo inicial</strong>
            <span>Líder da equipe</span>
          </div>
        </div>

        <CreateTeamForm />
      </section>
    </main>
  );
}
