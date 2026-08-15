import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  ActivityItem,
  TaskComment,
  TaskPriority,
  TaskStatus,
  TeamDetailData,
  TeamInvite,
  TeamMember,
  TeamReport,
  TeamRole,
  TeamStatus,
  TeamSummary,
  TeamTask,
} from "@/types/app";

type AppSupabaseClient = SupabaseClient<Database>;

function detailText(details: Json, key: string) {
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

function reportContent(content: Json): Record<string, unknown> {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    return content as Record<string, unknown>;
  }

  return {};
}

export async function getTeamDetailData(
  supabase: AppSupabaseClient,
  userId: string,
  teamId: string,
): Promise<TeamDetailData | null> {
  const [teamResult, membershipResult] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
    supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (teamResult.error || membershipResult.error) {
    throw new Error(
      `Não foi possível carregar a equipe: ${
        teamResult.error?.message ?? membershipResult.error?.message
      }`,
    );
  }

  if (!teamResult.data || !membershipResult.data) {
    return null;
  }

  const currentRole = membershipResult.data.role as TeamRole;
  const canManage = currentRole === "leader" || currentRole === "co_leader";

  const [membersResult, tasksResult, commentsResult, activitiesResult, invitesResult, reportsResult] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("user_id, role, joined_at")
        .eq("team_id", teamId)
        .order("joined_at"),
      supabase.from("tasks").select("*").eq("team_id", teamId).order("created_at"),
      supabase
        .from("task_comments")
        .select("id, task_id, author_id, content, created_at")
        .eq("team_id", teamId)
        .order("created_at"),
      supabase
        .from("activity_events")
        .select("id, actor_id, event_type, details, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(40),
      canManage
        ? supabase
            .from("team_invites")
            .select("id, token, role, expires_at, max_uses, use_count, revoked_at")
            .eq("team_id", teamId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("team_reports")
        .select("id, title, created_at, content")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
    ]);

  const firstError =
    membersResult.error ??
    tasksResult.error ??
    commentsResult.error ??
    activitiesResult.error ??
    invitesResult.error ??
    reportsResult.error;

  if (firstError) {
    throw new Error(`Não foi possível carregar os dados da equipe: ${firstError.message}`);
  }

  const memberRows = membersResult.data ?? [];
  const taskRows = tasksResult.data ?? [];
  const commentRows = commentsResult.data ?? [];
  const activityRows = activitiesResult.data ?? [];
  const inviteRows = invitesResult.data ?? [];
  const reportRows = reportsResult.data ?? [];

  const profileIds = Array.from(
    new Set([
      ...memberRows.map((member) => member.user_id),
      ...commentRows.map((comment) => comment.author_id),
      ...activityRows
        .map((activity) => activity.actor_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  );
  const profileById = new Map<string, { name: string; avatarPath: string | null }>();

  if (profileIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_path")
      .in("id", profileIds);

    if (profilesError) {
      throw new Error(`Não foi possível carregar os participantes: ${profilesError.message}`);
    }

    for (const profile of profiles) {
      profileById.set(profile.id, {
        name: profile.full_name,
        avatarPath: profile.avatar_path,
      });
    }
  }

  let photoUrl: string | null = null;
  if (teamResult.data.photo_path) {
    const { data: signedPhoto } = await supabase.storage
      .from("team-photos")
      .createSignedUrl(teamResult.data.photo_path, 60 * 60);
    photoUrl = signedPhoto?.signedUrl ?? null;
  }

  const members: TeamMember[] = memberRows.map((member) => ({
    userId: member.user_id,
    name: profileById.get(member.user_id)?.name ?? "Participante",
    avatarUrl: profileById.get(member.user_id)?.avatarPath ?? null,
    role: member.role as TeamRole,
    joinedAt: member.joined_at,
  }));
  const memberNameById = new Map(members.map((member) => [member.userId, member.name]));
  const now = Date.now();
  let completedTaskCount = 0;
  let overdueTaskCount = 0;

  const tasks: TeamTask[] = taskRows.map((task) => {
    if (task.status === "completed") {
      completedTaskCount += 1;
    } else if (task.due_at && Date.parse(task.due_at) < now) {
      overdueTaskCount += 1;
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assigned_to,
      assigneeName: memberNameById.get(task.assigned_to) ?? "Participante",
      createdBy: task.created_by,
      dueAt: task.due_at,
      priority: task.priority as TaskPriority,
      status: task.status as TaskStatus,
      submissionText: task.submission_text,
      submittedAt: task.submitted_at,
      completedAt: task.completed_at,
      createdAt: task.created_at,
    };
  });

  const team: TeamSummary = {
    id: teamResult.data.id,
    name: teamResult.data.name,
    subject: teamResult.data.subject,
    topic: teamResult.data.topic,
    description: teamResult.data.description,
    teacherName: teamResult.data.teacher_name,
    deliveryAt: teamResult.data.delivery_at,
    photoUrl,
    status: teamResult.data.status as TeamStatus,
    role: currentRole,
    memberCount: members.length,
    taskCount: tasks.length,
    completedTaskCount,
    overdueTaskCount,
  };

  const comments: TaskComment[] = commentRows.map((comment) => ({
    id: comment.id,
    taskId: comment.task_id,
    authorId: comment.author_id,
    authorName: profileById.get(comment.author_id)?.name ?? "Participante",
    content: comment.content,
    createdAt: comment.created_at,
  }));

  const activities: ActivityItem[] = activityRows.map((activity) => ({
    id: activity.id,
    teamId,
    teamName: team.name,
    actorName: activity.actor_id
      ? (profileById.get(activity.actor_id)?.name ?? null)
      : null,
    eventType: activity.event_type,
    title: detailText(activity.details, "title") ?? detailText(activity.details, "name"),
    createdAt: activity.created_at,
  }));

  const invites: TeamInvite[] = inviteRows.map((invite) => ({
    id: invite.id,
    token: invite.token,
    role: invite.role as TeamInvite["role"],
    expiresAt: invite.expires_at,
    maxUses: invite.max_uses,
    useCount: invite.use_count,
    revokedAt: invite.revoked_at,
  }));

  const reports: TeamReport[] = reportRows.map((report) => ({
    id: report.id,
    title: report.title,
    createdAt: report.created_at,
    content: reportContent(report.content),
  }));

  return {
    team,
    referenceTime: new Date(now).toISOString(),
    currentUserId: userId,
    currentRole,
    members,
    tasks,
    comments,
    activities,
    invites,
    reports,
  };
}
