import { notFound, redirect } from "next/navigation";
import { TeamDashboard } from "@/components/teams/team-dashboard";
import { getTeamDetailData } from "@/lib/team-data";
import { createClient } from "@/utils/supabase/server";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ created?: string; joined?: string; drive?: string }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function driveNotice(result: string | undefined) {
  const messages: Record<string, string> = {
    connected: "Google Drive conectado. A pasta da equipe já está disponível em Arquivos.",
    cancelled: "A conexão com o Google Drive foi cancelada.",
    forbidden: "Somente líderes e colíderes podem conectar o Google Drive.",
    invalid_state: "A autorização do Google expirou. Inicie a conexão novamente.",
    missing_scope: "A permissão necessária do Google Drive não foi concedida.",
    missing_refresh_token: "O Google não retornou uma autorização permanente. Tente conectar novamente.",
    error: "Não foi possível concluir a conexão com o Google Drive. Tente novamente.",
  };
  return result ? messages[result] ?? null : null;
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(teamId)) notFound();

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect(`/login?next=/equipes/${teamId}`);
  }

  const data = await getTeamDetailData(supabase, authData.claims.sub, teamId);
  if (!data) notFound();

  const notice =
    query.created === "1"
      ? "Equipe criada. Agora você pode convidar participantes e distribuir tarefas."
      : query.joined === "1"
        ? "Você entrou na equipe."
        : driveNotice(query.drive);

  return <TeamDashboard data={data} notice={notice} />;
}
