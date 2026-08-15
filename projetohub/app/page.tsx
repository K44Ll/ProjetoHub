import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getDashboardData } from "@/lib/dashboard-data";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const metadata = data.claims.user_metadata;
  const userId = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  const name =
    metadata &&
    typeof metadata === "object" &&
    "full_name" in metadata &&
    typeof metadata.full_name === "string" &&
    metadata.full_name.trim()
      ? metadata.full_name
      : email.split("@")[0] || "Estudante";

  const dashboardData = await getDashboardData(supabase, userId);

  return <DashboardHome user={{ name, email }} data={dashboardData} />;
}
