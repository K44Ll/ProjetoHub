import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { InviteAcceptForm } from "@/components/teams/invite-accept-form";
import { ThemeControl } from "@/components/theme-control";
import { createClient } from "@/utils/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const roleLabels: Record<string, string> = {
  reader: "Leitor",
  editor: "Editor",
  co_leader: "Colíder",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!uuidPattern.test(token)) notFound();

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError || !authData?.claims) {
    redirect(`/login?next=/convite/${token}`);
  }

  const { data, error } = await supabase
    .rpc("get_team_invite", { invite_token: token })
    .maybeSingle();
  if (error || !data) notFound();

  return (
    <main className="invite-page">
      <div className="dashboard-grid-bg" aria-hidden="true" />
      <header className="workspace-header">
        <Link className="brand" href="/">
          <BrandMark />
          <span>ProjetoHub</span>
        </Link>
        <ThemeControl />
      </header>
      <section className="invite-card">
        <span className="dashboard-eyebrow">Convite de equipe</span>
        <h1>{data.team_name}</h1>
        <p className="invite-subject">{data.subject}{data.topic ? ` · ${data.topic}` : ""}</p>
        <dl>
          <div><dt>Sua função</dt><dd>{roleLabels[data.invite_role] ?? data.invite_role}</dd></div>
          <div><dt>Válido até</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(data.expires_at))}</dd></div>
        </dl>
        {data.is_available ? (
          <InviteAcceptForm token={token} />
        ) : (
          <div className="invite-unavailable" role="alert">Este convite expirou, foi revogado ou atingiu o limite de entradas.</div>
        )}
        <Link className="invite-back" href="/">Voltar ao painel</Link>
      </section>
    </main>
  );
}
