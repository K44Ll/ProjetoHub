"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { ActionState, TaskPriority, TaskStatus, TeamRole } from "@/types/app";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const inviteRoles = new Set<TeamRole>(["reader", "editor", "co_leader"]);
const taskPriorities = new Set<TaskPriority>(["low", "medium", "high", "urgent"]);
const taskStatuses = new Set<TaskStatus>(["todo", "in_progress", "in_review", "completed"]);

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function errorState(message: string): ActionState {
  return { status: "error", message };
}

function successState(message: string, data?: Record<string, string>): ActionState {
  return { status: "success", message, data };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  return { supabase, userId: error ? undefined : userId };
}

export async function createInviteAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const role = textField(formData, "role") as TeamRole;
  const expiresInDays = Number(textField(formData, "expires_in_days"));
  const maxUses = Number(textField(formData, "max_uses"));

  if (!uuidPattern.test(teamId) || !inviteRoles.has(role)) {
    return errorState("Os dados do convite são inválidos.");
  }

  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    return errorState("O convite deve expirar entre 1 e 30 dias.");
  }

  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    return errorState("O limite de entradas deve ficar entre 1 e 100.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("team_invites")
    .insert({
      team_id: teamId,
      invited_by: userId,
      role,
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses,
    })
    .select("token")
    .single();

  if (error || !data) {
    return errorState("Não foi possível criar o convite. Verifique sua permissão.");
  }

  revalidatePath(`/equipes/${teamId}`);
  return successState("Convite criado. Copie o link e envie aos participantes.", {
    invitePath: `/convite/${data.token}`,
  });
}

export async function revokeInviteAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const inviteId = textField(formData, "invite_id");
  if (!uuidPattern.test(teamId) || !uuidPattern.test(inviteId)) {
    return errorState("Convite inválido.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { data, error } = await supabase
    .from("team_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("team_id", teamId)
    .select("id")
    .maybeSingle();

  if (error || !data) return errorState("Não foi possível revogar o convite.");
  revalidatePath(`/equipes/${teamId}`);
  return successState("Convite revogado.");
}

export async function acceptInviteAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = textField(formData, "token");
  if (!uuidPattern.test(token)) return errorState("Este convite é inválido.");

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { data: teamId, error } = await supabase.rpc("accept_team_invite", {
    invite_token: token,
  });

  if (error || !teamId) {
    return errorState("O convite expirou, foi revogado ou atingiu o limite de uso.");
  }

  revalidatePath("/");
  redirect(`/equipes/${teamId}?joined=1`);
}

export async function createTaskAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const title = textField(formData, "title");
  const description = textField(formData, "description");
  const assignedTo = textField(formData, "assigned_to");
  const dueAtValue = textField(formData, "due_at");
  const priority = textField(formData, "priority") as TaskPriority;

  if (!uuidPattern.test(teamId) || !uuidPattern.test(assignedTo)) {
    return errorState("Selecione um participante válido.");
  }
  if (title.length < 2 || title.length > 160) {
    return errorState("O título deve ter entre 2 e 160 caracteres.");
  }
  if (description.length > 5000) {
    return errorState("A descrição pode ter no máximo 5.000 caracteres.");
  }
  if (!taskPriorities.has(priority)) return errorState("Prioridade inválida.");
  if (!dueAtValue || Number.isNaN(Date.parse(dueAtValue))) {
    return errorState("Informe um prazo válido.");
  }

  const dueAt = new Date(dueAtValue);
  if (dueAt.getTime() <= Date.now()) return errorState("O prazo deve estar no futuro.");

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase.from("tasks").insert({
    team_id: teamId,
    title,
    description: description || null,
    assigned_to: assignedTo,
    created_by: userId,
    due_at: dueAt.toISOString(),
    priority,
  });

  if (error) {
    return errorState(
      error.message.includes("team delivery")
        ? "O prazo da tarefa não pode ultrapassar a entrega da equipe."
        : "Não foi possível criar a tarefa. Verifique o participante e o prazo.",
    );
  }

  revalidatePath(`/equipes/${teamId}`);
  revalidatePath("/");
  return successState("Tarefa atribuída com sucesso.");
}

export async function submitTaskAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const taskId = textField(formData, "task_id");
  const submission = textField(formData, "submission");
  if (!uuidPattern.test(teamId) || !uuidPattern.test(taskId)) {
    return errorState("Tarefa inválida.");
  }
  if (submission.length > 5000) {
    return errorState("A entrega pode ter no máximo 5.000 caracteres.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase.rpc("submit_task", {
    target_task_id: taskId,
    submission: submission || undefined,
  });

  if (error) return errorState("Esta tarefa não pode ser enviada por sua conta.");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath("/");
  return successState("Entrega enviada para revisão.");
}

export async function reviewTaskAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const taskId = textField(formData, "task_id");
  const status = textField(formData, "status") as TaskStatus;
  if (!uuidPattern.test(teamId) || !uuidPattern.test(taskId) || !taskStatuses.has(status)) {
    return errorState("Alteração de tarefa inválida.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { data, error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("team_id", teamId)
    .select("id")
    .maybeSingle();

  if (error || !data) return errorState("Não foi possível alterar a tarefa.");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath("/");
  return successState(status === "completed" ? "Tarefa aprovada." : "Status atualizado.");
}

export async function addTaskCommentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const taskId = textField(formData, "task_id");
  const content = textField(formData, "content");
  if (!uuidPattern.test(teamId) || !uuidPattern.test(taskId)) {
    return errorState("Tarefa inválida.");
  }
  if (!content || content.length > 3000) {
    return errorState("O comentário deve ter entre 1 e 3.000 caracteres.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    team_id: teamId,
    author_id: userId,
    content,
  });

  if (error) return errorState("Não foi possível publicar o comentário.");
  revalidatePath(`/equipes/${teamId}`);
  return successState("Comentário publicado.");
}

export async function updateMemberRoleAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const memberId = textField(formData, "member_id");
  const role = textField(formData, "role") as TeamRole;
  if (!uuidPattern.test(teamId) || !uuidPattern.test(memberId) || !inviteRoles.has(role)) {
    return errorState("Participante ou função inválida.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { data, error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("user_id", memberId)
    .select("user_id")
    .maybeSingle();

  if (error || !data) return errorState("Somente o líder pode alterar funções.");
  revalidatePath(`/equipes/${teamId}`);
  return successState("Função atualizada.");
}

export async function removeMemberAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const memberId = textField(formData, "member_id");
  if (!uuidPattern.test(teamId) || !uuidPattern.test(memberId)) {
    return errorState("Participante inválido.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");
  if (memberId === userId) return errorState("O líder não pode remover a própria conta.");

  const { data, error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", memberId)
    .select("user_id")
    .maybeSingle();

  if (error || !data) return errorState("Não foi possível remover o participante.");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath("/");
  return successState("Participante removido.");
}

export async function generateReportAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const startValue = textField(formData, "period_start");
  const endValue = textField(formData, "period_end");
  if (!uuidPattern.test(teamId)) return errorState("Equipe inválida.");

  const reportStart = startValue ? new Date(`${startValue}T00:00:00`) : null;
  const reportEnd = endValue ? new Date(`${endValue}T23:59:59.999`) : null;
  if (
    (reportStart && Number.isNaN(reportStart.getTime())) ||
    (reportEnd && Number.isNaN(reportEnd.getTime())) ||
    (reportStart && reportEnd && reportEnd < reportStart)
  ) {
    return errorState("O período do relatório é inválido.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase.rpc("generate_team_report", {
    target_team_id: teamId,
    report_start: reportStart?.toISOString(),
    report_end: reportEnd?.toISOString(),
  });

  if (error) return errorState("Não foi possível gerar o relatório.");
  revalidatePath(`/equipes/${teamId}`);
  return successState("Relatório gerado com os dados reais da equipe.");
}

export async function updateTeamAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = textField(formData, "team_id");
  const subject = textField(formData, "subject");
  const topic = textField(formData, "topic");
  const teacherName = textField(formData, "teacher_name");
  const description = textField(formData, "description");
  const deliveryAtValue = textField(formData, "delivery_at");
  if (!uuidPattern.test(teamId)) return errorState("Equipe inválida.");
  if (subject.length < 2 || subject.length > 100 || topic.length > 160) {
    return errorState("Revise a matéria e o tema informados.");
  }
  if (teacherName.length > 100 || description.length > 2000) {
    return errorState("Um dos campos ultrapassou o limite permitido.");
  }
  if (!deliveryAtValue || Number.isNaN(Date.parse(deliveryAtValue))) {
    return errorState("Informe uma data de entrega válida.");
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return errorState("Sua sessão expirou. Entre novamente.");

  const { data, error } = await supabase
    .from("teams")
    .update({
      subject,
      topic: topic || null,
      teacher_name: teacherName || null,
      description: description || null,
      delivery_at: new Date(deliveryAtValue).toISOString(),
    })
    .eq("id", teamId)
    .select("id")
    .maybeSingle();

  if (error || !data) return errorState("Não foi possível atualizar a equipe.");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath("/");
  return successState("Informações da equipe atualizadas.");
}
