import { notFound, redirect } from "next/navigation";
import { TeamDashboard } from "@/components/teams/team-dashboard";
import { getTeamDetailData } from "@/lib/team-data";
import { createClient } from "@/utils/supabase/server";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ created?: string; joined?: string }>;
};

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
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
        : null;

  return <TeamDashboard data={data} notice={notice} />;
}
