import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  ActivityItem,
  DashboardData,
  DashboardTask,
  TeamRole,
  TeamStatus,
  TeamSummary,
  TaskPriority,
  TaskStatus,
} from "@/types/app";

type AppSupabaseClient = SupabaseClient<Database>;

function objectDetail(details: Json, key: string) {
  if (
    details &&
    typeof details === "object" &&
    !Array.isArray(details) &&
    typeof details[key] === "string"
  ) {
    return details[key];
  }

  return null;
}

export async function getDashboardData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<DashboardData> {
  const referenceTime = new Date().toISOString();
  const { data: memberships, error: membershipsError } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (membershipsError) {
    throw new Error(`Não foi possível carregar suas equipes: ${membershipsError.message}`);
  }

  if (!memberships.length) {
    return { referenceTime, teams: [], assignedTasks: [], recentActivities: [] };
  }

  const teamIds = memberships.map((membership) => membership.team_id);

  const [teamsResult, membersResult, tasksResult, activitiesResult] =
    await Promise.all([
      supabase.from("teams").select("*").in("id", teamIds),
      supabase.from("team_members").select("team_id").in("team_id", teamIds),
      supabase
        .from("tasks")
        .select("id, team_id, title, assigned_to, due_at, priority, status")
        .in("team_id", teamIds),
      supabase
        .from("activity_events")
        .select("id, team_id, actor_id, event_type, details, created_at")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const firstError =
    teamsResult.error ??
    membersResult.error ??
    tasksResult.error ??
    activitiesResult.error;

  if (firstError) {
    throw new Error(`Não foi possível carregar o painel: ${firstError.message}`);
  }

  const teamRows = teamsResult.data ?? [];
  const memberRows = membersResult.data ?? [];
  const taskRows = tasksResult.data ?? [];
  const activityRows = activitiesResult.data ?? [];

  const teamsById = new Map(teamRows.map((team) => [team.id, team]));
  const rolesByTeamId = new Map(
    memberships.map((membership) => [
      membership.team_id,
      membership.role as TeamRole,
    ]),
  );

  const memberCountByTeam = new Map<string, number>();
  for (const member of memberRows) {
    memberCountByTeam.set(
      member.team_id,
      (memberCountByTeam.get(member.team_id) ?? 0) + 1,
    );
  }

  const now = Date.parse(referenceTime);
  const taskStatsByTeam = new Map<
    string,
    { total: number; completed: number; overdue: number }
  >();

  for (const task of taskRows) {
    const stats = taskStatsByTeam.get(task.team_id) ?? {
      total: 0,
      completed: 0,
      overdue: 0,
    };
    stats.total += 1;
    if (task.status === "completed") {
      stats.completed += 1;
    } else if (task.due_at && Date.parse(task.due_at) < now) {
      stats.overdue += 1;
    }
    taskStatsByTeam.set(task.team_id, stats);
  }

  const photoPaths = teamRows
    .map((team) => team.photo_path)
    .filter((path): path is string => Boolean(path));
  const signedUrlByPath = new Map<string, string>();

  if (photoPaths.length) {
    const { data: signedPhotos } = await supabase.storage
      .from("team-photos")
      .createSignedUrls(photoPaths, 60 * 60);

    for (const photo of signedPhotos ?? []) {
      if (photo.path && photo.signedUrl) {
        signedUrlByPath.set(photo.path, photo.signedUrl);
      }
    }
  }

  const teams: TeamSummary[] = memberships.flatMap((membership) => {
    const team = teamsById.get(membership.team_id);
    if (!team) {
      return [];
    }

    const stats = taskStatsByTeam.get(team.id) ?? {
      total: 0,
      completed: 0,
      overdue: 0,
    };

    return [
      {
        id: team.id,
        name: team.name,
        subject: team.subject,
        topic: team.topic,
        description: team.description,
        teacherName: team.teacher_name,
        deliveryAt: team.delivery_at,
        photoUrl: team.photo_path
          ? (signedUrlByPath.get(team.photo_path) ?? null)
          : null,
        status: team.status as TeamStatus,
        role: rolesByTeamId.get(team.id) ?? "reader",
        memberCount: memberCountByTeam.get(team.id) ?? 0,
        taskCount: stats.total,
        completedTaskCount: stats.completed,
        overdueTaskCount: stats.overdue,
      },
    ];
  });

  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  const assignedTasks: DashboardTask[] = taskRows
    .filter((task) => task.assigned_to === userId && task.status !== "completed")
    .map((task) => ({
      id: task.id,
      teamId: task.team_id,
      teamName: teamNameById.get(task.team_id) ?? "",
      title: task.title,
      dueAt: task.due_at,
      priority: task.priority as TaskPriority,
      status: task.status as TaskStatus,
    }))
    .toSorted((left, right) => {
      if (!left.dueAt) return 1;
      if (!right.dueAt) return -1;
      return Date.parse(left.dueAt) - Date.parse(right.dueAt);
    });

  const actorIds = Array.from(
    new Set(
      activityRows
        .map((activity) => activity.actor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const actorNames = new Map<string, string>();

  if (actorIds.length) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);

    for (const actor of actors ?? []) {
      actorNames.set(actor.id, actor.full_name);
    }
  }

  const recentActivities: ActivityItem[] = activityRows.map(
    (activity) => ({
      id: activity.id,
      teamId: activity.team_id,
      teamName: teamNameById.get(activity.team_id) ?? "",
      actorName: activity.actor_id
        ? (actorNames.get(activity.actor_id) ?? null)
        : null,
      eventType: activity.event_type,
      title: objectDetail(activity.details, "title") ?? objectDetail(activity.details, "name"),
      createdAt: activity.created_at,
    }),
  );

  return { referenceTime, teams, assignedTasks, recentActivities };
}
