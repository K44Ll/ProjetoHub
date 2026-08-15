"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addTaskCommentAction,
  createInviteAction,
  createTaskAction,
  generateReportAction,
  removeMemberAction,
  reviewTaskAction,
  revokeInviteAction,
  submitTaskAction,
  updateMemberRoleAction,
  updateTeamAction,
} from "@/app/actions/team";
import { BrandMark } from "@/components/brand-mark";
import { ThemeControl } from "@/components/theme-control";
import type {
  ActionState,
  ActivityItem,
  TaskComment,
  TaskStatus,
  TeamDetailData,
  TeamInvite,
  TeamMember,
  TeamReport,
  TeamRole,
  TeamTask,
} from "@/types/app";
import { initialActionState } from "@/types/app";

type Tab = "tasks" | "files" | "members" | "activity" | "reports" | "settings";

type DriveFileRecord = {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  isFolder: boolean;
  canDownload: boolean;
};

type DriveFilesResponse = {
  files?: DriveFileRecord[];
  error?: string;
  code?: string;
};

class DriveFilesRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "DriveFilesRequestError";
  }
}

async function fetchTeamDriveFiles(teamId: string) {
  const response = await fetch(`/api/teams/${teamId}/drive/files`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as DriveFilesResponse;
  if (!response.ok) {
    throw new DriveFilesRequestError(
      payload.error || "Não foi possível carregar os arquivos.",
      payload.code,
    );
  }
  return payload.files ?? [];
}

const roleLabels: Record<TeamRole, string> = {
  reader: "Leitor",
  editor: "Editor",
  co_leader: "Colíder",
  leader: "Líder",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  in_review: "Em revisão",
  completed: "Concluída",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

function formatDate(value: string | null, withTime = true) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TeamDashboard({ data, notice }: { data: TeamDetailData; notice: string | null }) {
  const [tab, setTab] = useState<Tab>("tasks");
  const canManage = data.currentRole === "leader" || data.currentRole === "co_leader";
  const isLeader = data.currentRole === "leader";
  const referenceTime = Date.parse(data.referenceTime);
  const overdueTasks = data.tasks.filter(
    (task) => task.status !== "completed" && task.dueAt && Date.parse(task.dueAt) < referenceTime,
  );

  return (
    <main className="team-workspace">
      <div className="dashboard-grid-bg" aria-hidden="true" />
      <header className="workspace-header team-workspace-header">
        <Link className="brand" href="/" aria-label="Voltar ao painel">
          <BrandMark />
          <span>ProjetoHub</span>
        </Link>
        <div className="team-header-actions">
          <Link className="team-back-link" href="/">← Minhas equipes</Link>
          <ThemeControl />
        </div>
      </header>

      <div className="team-workspace-content">
        {notice ? <div className="team-notice" role="status">{notice}</div> : null}
        <section className="team-hero">
          <div
            className={`team-hero-photo${data.team.photoUrl ? " has-photo" : ""}`}
            style={data.team.photoUrl ? { backgroundImage: `url(${data.team.photoUrl})` } : undefined}
            aria-hidden="true"
          >
            {!data.team.photoUrl ? initials(data.team.name) : null}
          </div>
          <div className="team-hero-main">
            <div className="team-hero-kicker">
              <span>{data.team.subject}</span>
              <span className="role-badge">{roleLabels[data.currentRole]}</span>
            </div>
            <h1>{data.team.name}</h1>
            {data.team.topic ? <p>{data.team.topic}</p> : null}
            <div className="team-hero-meta">
              <span>{data.team.memberCount} participante{data.team.memberCount === 1 ? "" : "s"}</span>
              <span>{data.team.completedTaskCount}/{data.team.taskCount} tarefas concluídas</span>
              <span>Entrega: {formatDate(data.team.deliveryAt)}</span>
            </div>
          </div>
        </section>

        {overdueTasks.length ? (
          <section className="overdue-callout" aria-label="Tarefas atrasadas">
            <strong>{overdueTasks.length} {overdueTasks.length === 1 ? "atraso exige" : "atrasos exigem"} atenção</strong>
            <div>
              {overdueTasks.map((task) => (
                <span key={task.id}>
                  <b>{task.assigneeName}</b> está com “{task.title}” atrasada desde {formatDate(task.dueAt)}.
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="team-tabs" aria-label="Áreas da equipe">
          {([
            ["tasks", "Tarefas"],
            ["files", "Arquivos"],
            ["members", "Participantes"],
            ["activity", "Atividade"],
            ["reports", "Relatórios"],
            ...(canManage ? [["settings", "Configurações"]] : []),
          ] as [Tab, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? "is-active" : ""}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "tasks" ? <TasksPanel data={data} canManage={canManage} /> : null}
        {tab === "files" ? <FilesPanel data={data} canManage={canManage} /> : null}
        {tab === "members" ? (
          <MembersPanel data={data} canManage={canManage} isLeader={isLeader} />
        ) : null}
        {tab === "activity" ? <ActivityPanel activities={data.activities} /> : null}
        {tab === "reports" ? <ReportsPanel data={data} canManage={canManage} /> : null}
        {tab === "settings" && canManage ? <SettingsPanel data={data} /> : null}
      </div>
    </main>
  );
}

function FilesPanel({ data, canManage }: { data: TeamDetailData; canManage: boolean }) {
  const router = useRouter();
  const canUpload = data.currentRole !== "reader";
  const [files, setFiles] = useState<DriveFileRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(data.drive.connected);
  const [uploading, setUploading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!data.drive.connected) return;
    setLoading(true);
    setError(null);

    try {
      const loadedFiles = await fetchTeamDriveFiles(data.team.id);
      setFiles(loadedFiles);
      setNeedsReconnect(false);
    } catch (loadError) {
      setNeedsReconnect(
        loadError instanceof DriveFilesRequestError &&
          loadError.code === "drive_reconnect_required",
      );
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os arquivos.",
      );
    } finally {
      setLoading(false);
    }
  }, [data.drive.connected, data.team.id]);

  useEffect(() => {
    if (!data.drive.connected) return;
    let cancelled = false;

    void fetchTeamDriveFiles(data.team.id)
      .then((loadedFiles) => {
        if (cancelled) return;
        setFiles(loadedFiles);
        setNeedsReconnect(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setNeedsReconnect(
          loadError instanceof DriveFilesRequestError &&
            loadError.code === "drive_reconnect_required",
        );
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os arquivos.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data.drive.connected, data.team.id]);

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setError("Escolha um arquivo antes de enviar.");
      return;
    }

    const form = event.currentTarget;
    const mimeType = selectedFile.type || "application/octet-stream";
    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const sessionResponse = await fetch(`/api/teams/${data.team.id}/drive/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFile.name,
          mimeType,
          size: selectedFile.size,
        }),
      });
      const session = (await sessionResponse.json()) as {
        uploadUrl?: string;
        error?: string;
      };
      if (!sessionResponse.ok || !session.uploadUrl) {
        throw new Error(session.error || "Não foi possível iniciar o envio.");
      }

      const uploadResponse = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: selectedFile,
      });
      if (!uploadResponse.ok) {
        throw new Error("O envio foi interrompido pelo Google Drive. Tente novamente.");
      }

      setMessage(`“${selectedFile.name}” foi enviado para a pasta da equipe.`);
      setSelectedFile(null);
      form.reset();
      await loadFiles();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar o arquivo.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function disconnectDrive() {
    const confirmed = window.confirm(
      "Desconectar o Google Drive desta equipe? Os arquivos continuarão na pasta do Drive.",
    );
    if (!confirmed) return;

    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${data.team.id}/drive/connection`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível desconectar o Google Drive.");
      }
      router.refresh();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Não foi possível desconectar o Google Drive.",
      );
      setDisconnecting(false);
    }
  }

  if (!data.drive.connected) {
    return (
      <section className="team-panel drive-panel">
        <div className="drive-empty-state">
          <div className="drive-logo" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="dashboard-eyebrow">Armazenamento da equipe</span>
          <h2>Conecte uma pasta do Google Drive</h2>
          <p>
            PDFs, apresentações, documentos e outros arquivos ficarão na pasta
            real da equipe e poderão ser acessados por aqui.
          </p>
          {canManage ? (
            <a
              className="primary-action drive-connect-button"
              href={`/api/integrations/google-drive/connect?teamId=${data.team.id}`}
            >
              Conectar Google Drive
            </a>
          ) : (
            <span className="permission-note">
              Um líder ou colíder precisa conectar a pasta primeiro.
            </span>
          )}
          <small>O ProjetoHub solicitará apenas acesso aos arquivos usados pela integração.</small>
        </div>
      </section>
    );
  }

  return (
    <section className="team-panel drive-panel">
      <div className="team-panel-heading drive-panel-heading">
        <div>
          <span className="dashboard-eyebrow">Google Drive</span>
          <h2>{data.drive.rootFolderName || "Arquivos da equipe"}</h2>
          <p>Conteúdo carregado diretamente da pasta conectada.</p>
        </div>
        <div className="drive-heading-actions">
          {data.drive.rootFolderId ? (
            <a
              className="compact-button"
              href={`https://drive.google.com/drive/folders/${data.drive.rootFolderId}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir no Drive
            </a>
          ) : null}
          {canManage ? (
            <button
              className="compact-button danger-button"
              type="button"
              onClick={disconnectDrive}
              disabled={disconnecting}
            >
              {disconnecting ? "Desconectando…" : "Desconectar"}
            </button>
          ) : null}
        </div>
      </div>

      {canUpload ? (
        <form className="drive-upload-form" onSubmit={uploadFile}>
          <label className="drive-file-picker">
            <span>{selectedFile ? selectedFile.name : "Escolher arquivo"}</span>
            <input
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              disabled={uploading}
            />
          </label>
          <div className="drive-upload-meta">
            <span>
              {selectedFile
                ? `${formatFileSize(selectedFile.size)} selecionados`
                : "PDF, Word, PowerPoint, imagens e outros formatos · até 250 MB"}
            </span>
            <button className="primary-action" type="submit" disabled={uploading || !selectedFile}>
              {uploading ? "Enviando ao Drive…" : "Enviar arquivo"}
            </button>
          </div>
        </form>
      ) : (
        <p className="permission-note drive-permission-note">
          Leitores podem abrir e baixar arquivos. Editores, colíderes e líderes também podem enviar.
        </p>
      )}

      <div className="drive-feedback" aria-live="polite">
        {message ? <p className="form-feedback is-success">{message}</p> : null}
        {error ? (
          <div className="drive-error" role="alert">
            <p>{error}</p>
            {needsReconnect && canManage ? (
              <a href={`/api/integrations/google-drive/connect?teamId=${data.team.id}`}>
                Reconectar Google Drive
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="drive-loading" role="status">
          <span className="button-spinner" aria-hidden="true" />
          Carregando arquivos reais do Drive…
        </div>
      ) : files.length ? (
        <div className="drive-file-list">
          <div className="drive-file-list-head" aria-hidden="true">
            <span>Nome</span>
            <span>Tamanho</span>
            <span>Modificado</span>
            <span>Ações</span>
          </div>
          {files.map((file) => (
            <article className="drive-file-row" key={file.id}>
              <span className={`drive-file-type${file.isFolder ? " is-folder" : ""}`}>
                {driveFileLabel(file)}
              </span>
              <div className="drive-file-name">
                <strong>{file.name}</strong>
                <span>{file.mimeType}</span>
              </div>
              <span className="drive-file-size">
                {file.isFolder ? "Pasta" : formatFileSize(file.size)}
              </span>
              <time>{file.modifiedTime ? formatDate(file.modifiedTime) : "Sem data"}</time>
              <div className="drive-file-actions">
                {file.webViewLink ? (
                  <a href={file.webViewLink} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                ) : null}
                {!file.isFolder && file.canDownload ? (
                  <a href={`/api/teams/${data.team.id}/drive/files/${file.id}/download`}>
                    Baixar
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : error ? null : (
        <EmptyPanel
          title="A pasta ainda está vazia"
          text={
            canUpload
              ? "Escolha o primeiro arquivo para iniciar o repositório da equipe."
              : "A equipe ainda não enviou nenhum arquivo."
          }
        />
      )}
    </section>
  );
}

function driveFileLabel(file: DriveFileRecord) {
  if (file.isFolder) return "DIR";
  const extension = file.name.includes(".") ? file.name.split(".").pop() : null;
  return extension && extension.length <= 5 ? extension.toUpperCase() : "ARQ";
}

function formatFileSize(value: string | number | null) {
  const bytes = typeof value === "string" ? Number(value) : value;
  if (bytes === null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(size)} ${unit}`;
}

function TasksPanel({ data, canManage }: { data: TeamDetailData; canManage: boolean }) {
  const contributors = data.members.filter((member) => member.role !== "reader");
  const grouped = useMemo(
    () => ({
      todo: data.tasks.filter((task) => task.status === "todo"),
      in_progress: data.tasks.filter((task) => task.status === "in_progress"),
      in_review: data.tasks.filter((task) => task.status === "in_review"),
      completed: data.tasks.filter((task) => task.status === "completed"),
    }),
    [data.tasks],
  );

  return (
    <section className="team-panel">
      <div className="team-panel-heading">
        <div><span className="dashboard-eyebrow">Execução</span><h2>Quadro de tarefas</h2></div>
        <span>{data.tasks.length} no total</span>
      </div>

      {canManage ? <CreateTaskForm teamId={data.team.id} members={contributors} /> : null}

      {data.tasks.length ? (
        <div className="task-board">
          {(Object.keys(grouped) as TaskStatus[]).map((status) => (
            <section className="task-column" key={status}>
              <header><h3>{statusLabels[status]}</h3><span>{grouped[status].length}</span></header>
              <div className="task-column-list">
                {grouped[status].length ? grouped[status].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    teamId={data.team.id}
                    currentUserId={data.currentUserId}
                    currentRole={data.currentRole}
                    comments={data.comments.filter((comment) => comment.taskId === task.id)}
                    canManage={canManage}
                    referenceTime={Date.parse(data.referenceTime)}
                  />
                )) : <p className="task-column-empty">Nenhuma tarefa</p>}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyPanel title="Nenhuma tarefa criada" text={canManage ? "Atribua a primeira tarefa a um participante acima." : "A liderança ainda não distribuiu tarefas."} />
      )}
    </section>
  );
}

function CreateTaskForm({ teamId, members }: { teamId: string; members: TeamMember[] }) {
  const [state, action] = useActionState(createTaskAction, initialActionState);

  return (
    <form
      action={action}
      className="team-inline-form create-task-form"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const local = form.elements.namedItem("due_local") as HTMLInputElement;
        const iso = form.elements.namedItem("due_at") as HTMLInputElement;
        iso.value = local.value ? new Date(local.value).toISOString() : "";
      }}
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="due_at" />
      <div className="form-title-row"><h3>Nova tarefa</h3><span>Líderes e colíderes podem atribuir</span></div>
      {members.length ? (
        <div className="task-form-grid">
          <label><span>Título</span><input name="title" required minLength={2} maxLength={160} /></label>
          <label><span>Responsável</span><select name="assigned_to" required>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {roleLabels[member.role]}</option>)}</select></label>
          <label><span>Prazo</span><input name="due_local" type="datetime-local" required /></label>
          <label><span>Prioridade</span><select name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
          <label className="task-form-description"><span>Descrição</span><textarea name="description" rows={3} maxLength={5000} /></label>
          <SubmitButton label="Atribuir tarefa" busyLabel="Atribuindo…" />
        </div>
      ) : <p className="form-guidance">Adicione um editor ou colíder antes de atribuir tarefas.</p>}
      <FormFeedback state={state} />
    </form>
  );
}

function TaskCard({ task, teamId, currentUserId, currentRole, comments, canManage, referenceTime }: {
  task: TeamTask;
  teamId: string;
  currentUserId: string;
  currentRole: TeamRole;
  comments: TaskComment[];
  canManage: boolean;
  referenceTime: number;
}) {
  const [open, setOpen] = useState(false);
  const overdue = task.status !== "completed" && Boolean(task.dueAt) && Date.parse(task.dueAt!) < referenceTime;
  const canComment = currentRole !== "reader";
  const canSubmit = task.assignedTo === currentUserId && currentRole !== "reader" && task.status !== "completed";

  return (
    <article className={`task-card${overdue ? " is-overdue" : ""}`}>
      <button className="task-card-open" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="task-card-badges"><span className={`priority-${task.priority}`}>{priorityLabels[task.priority]}</span>{overdue ? <span className="overdue-badge">Atrasada</span> : null}</div>
        <h4>{task.title}</h4>
        <p>{task.assigneeName}</p>
        <time>{formatDate(task.dueAt)}</time>
      </button>
      {open ? (
        <div className="task-card-details">
          {task.description ? <p>{task.description}</p> : null}
          {task.submissionText ? <div className="task-submission"><strong>Entrega enviada</strong><p>{task.submissionText}</p><small>{formatDate(task.submittedAt)}</small></div> : null}
          {canManage ? <ReviewTaskForm teamId={teamId} task={task} /> : null}
          {canSubmit ? <SubmitTaskForm teamId={teamId} taskId={task.id} /> : null}
          {comments.length ? <div className="task-comments"><strong>Comentários</strong>{comments.map((comment) => <p key={comment.id}><b>{comment.authorName}</b> {comment.content}<time>{formatDate(comment.createdAt)}</time></p>)}</div> : null}
          {canComment ? <CommentForm teamId={teamId} taskId={task.id} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function ReviewTaskForm({ teamId, task }: { teamId: string; task: TeamTask }) {
  const [state, action] = useActionState(reviewTaskAction, initialActionState);
  return (
    <form action={action} className="compact-action-form">
      <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="task_id" value={task.id} />
      <label><span>Alterar status</span><select name="status" defaultValue={task.status}><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="in_review">Em revisão</option><option value="completed">Concluída</option></select></label>
      <SubmitButton label="Salvar" busyLabel="Salvando…" compact />
      <FormFeedback state={state} />
    </form>
  );
}

function SubmitTaskForm({ teamId, taskId }: { teamId: string; taskId: string }) {
  const [state, action] = useActionState(submitTaskAction, initialActionState);
  return (
    <form action={action} className="compact-stack-form">
      <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="task_id" value={taskId} />
      <label><span>Enviar para revisão</span><textarea name="submission" rows={3} maxLength={5000} placeholder="Descreva sua entrega ou informe o link" /></label>
      <SubmitButton label="Enviar entrega" busyLabel="Enviando…" compact />
      <FormFeedback state={state} />
    </form>
  );
}

function CommentForm({ teamId, taskId }: { teamId: string; taskId: string }) {
  const [state, action] = useActionState(addTaskCommentAction, initialActionState);
  return (
    <form action={action} className="comment-form">
      <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="task_id" value={taskId} />
      <input name="content" required maxLength={3000} aria-label="Novo comentário" placeholder="Adicionar comentário" />
      <SubmitButton label="Publicar" busyLabel="…" compact />
      <FormFeedback state={state} />
    </form>
  );
}

function MembersPanel({ data, canManage, isLeader }: { data: TeamDetailData; canManage: boolean; isLeader: boolean }) {
  return (
    <section className="team-panel team-two-column">
      <div>
        <div className="team-panel-heading"><div><span className="dashboard-eyebrow">Hierarquia</span><h2>Participantes</h2></div><span>{data.members.length}</span></div>
        <div className="member-list">
          {data.members.map((member) => <MemberRow key={member.userId} member={member} teamId={data.team.id} isLeader={isLeader} currentUserId={data.currentUserId} />)}
        </div>
      </div>
      <aside>
        {canManage ? <InvitePanel teamId={data.team.id} invites={data.invites} referenceTime={data.referenceTime} /> : (
          <div className="permission-card"><strong>Convites</strong><p>Somente líderes e colíderes criam links de entrada.</p></div>
        )}
        <div className="role-guide">
          <h3>Permissões</h3>
          <p><b>Leitor:</b> acompanha a equipe.</p>
          <p><b>Editor:</b> comenta e entrega tarefas.</p>
          <p><b>Colíder:</b> gerencia tarefas e convites.</p>
          <p><b>Líder:</b> também altera cargos e participantes.</p>
        </div>
      </aside>
    </section>
  );
}

function MemberRow({ member, teamId, isLeader, currentUserId }: { member: TeamMember; teamId: string; isLeader: boolean; currentUserId: string }) {
  const [roleState, roleAction] = useActionState(updateMemberRoleAction, initialActionState);
  const [removeState, removeAction] = useActionState(removeMemberAction, initialActionState);
  const editable = isLeader && member.role !== "leader";

  return (
    <article className="member-row">
      <div className="member-avatar">{initials(member.name)}</div>
      <div className="member-identity"><strong>{member.name}{member.userId === currentUserId ? " (você)" : ""}</strong><span>Entrou em {formatDate(member.joinedAt, false)}</span></div>
      {editable ? (
        <div className="member-controls">
          <form action={roleAction}><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="member_id" value={member.userId} /><select name="role" defaultValue={member.role} aria-label={`Função de ${member.name}`}><option value="reader">Leitor</option><option value="editor">Editor</option><option value="co_leader">Colíder</option></select><SubmitButton label="Salvar" busyLabel="…" compact /></form>
          <form action={removeAction}><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="member_id" value={member.userId} /><SubmitButton label="Remover" busyLabel="…" compact danger /></form>
          <FormFeedback state={roleState.status !== "idle" ? roleState : removeState} />
        </div>
      ) : <span className="role-badge">{roleLabels[member.role]}</span>}
    </article>
  );
}

function InvitePanel({ teamId, invites, referenceTime }: { teamId: string; invites: TeamInvite[]; referenceTime: string }) {
  const [state, action] = useActionState(createInviteAction, initialActionState);
  return (
    <div className="invite-panel">
      <h3>Convidar por link</h3>
      <form action={action} className="invite-form">
        <input type="hidden" name="team_id" value={teamId} />
        <label><span>Função ao entrar</span><select name="role" defaultValue="editor"><option value="reader">Leitor</option><option value="editor">Editor</option><option value="co_leader">Colíder</option></select></label>
        <label><span>Validade</span><select name="expires_in_days" defaultValue="7"><option value="1">1 dia</option><option value="3">3 dias</option><option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option></select></label>
        <label><span>Limite de entradas</span><input type="number" name="max_uses" min={1} max={100} defaultValue={20} /></label>
        <SubmitButton label="Criar link" busyLabel="Criando…" />
      </form>
      <FormFeedback state={state} />
      {state.data?.invitePath ? <CopyInvite path={state.data.invitePath} /> : null}
      {invites.length ? <div className="invite-list">{invites.map((invite) => <InviteRow key={invite.id} invite={invite} teamId={teamId} referenceTime={Date.parse(referenceTime)} />)}</div> : <p className="form-guidance">Nenhum convite criado.</p>}
    </div>
  );
}

function CopyInvite({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="copy-invite"><input readOnly value={path} aria-label="Link do convite" /><button type="button" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setCopied(true); }}>{copied ? "Copiado" : "Copiar"}</button></div>;
}

function InviteRow({ invite, teamId, referenceTime }: { invite: TeamInvite; teamId: string; referenceTime: number }) {
  const [state, action] = useActionState(revokeInviteAction, initialActionState);
  const inactive = Boolean(invite.revokedAt) || Date.parse(invite.expiresAt) <= referenceTime || invite.useCount >= invite.maxUses;
  return (
    <div className="invite-row">
      <div><strong>{roleLabels[invite.role]}</strong><span>{invite.useCount}/{invite.maxUses} entradas · até {formatDate(invite.expiresAt)}</span></div>
      {!inactive ? <><CopyInvite path={`/convite/${invite.token}`} /><form action={action}><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="invite_id" value={invite.id} /><SubmitButton label="Revogar" busyLabel="…" compact danger /></form></> : <span className="inactive-label">Inativo</span>}
      <FormFeedback state={state} />
    </div>
  );
}

function ActivityPanel({ activities }: { activities: ActivityItem[] }) {
  return (
    <section className="team-panel">
      <div className="team-panel-heading"><div><span className="dashboard-eyebrow">Histórico</span><h2>Atividade da equipe</h2></div></div>
      {activities.length ? <div className="full-activity-list">{activities.map((activity) => <article key={activity.id}><span className="activity-dot" /><div><strong>{activity.actorName ?? "Sistema"}</strong><p>{activityText(activity)}</p></div><time>{formatDate(activity.createdAt)}</time></article>)}</div> : <EmptyPanel title="Nenhuma atividade registrada" text="As ações da equipe aparecerão aqui." />}
    </section>
  );
}

function activityText(activity: ActivityItem) {
  const subject = activity.title ? ` “${activity.title}”` : "";
  const labels: Record<string, string> = {
    team_created: "criou a equipe",
    member_joined: "entrou na equipe",
    member_role_changed: `alterou a função de${subject || " um participante"}`,
    task_created: `criou a tarefa${subject}`,
    task_updated: `atualizou a tarefa${subject}`,
    task_submitted: `enviou a tarefa${subject} para revisão`,
    task_completed: `concluiu a tarefa${subject}`,
    comment_created: `comentou na tarefa${subject}`,
    report_generated: `gerou o relatório${subject}`,
  };
  return labels[activity.eventType] ?? "realizou uma ação na equipe";
}

function ReportsPanel({ data, canManage }: { data: TeamDetailData; canManage: boolean }) {
  const [state, action] = useActionState(generateReportAction, initialActionState);
  return (
    <section className="team-panel">
      <div className="team-panel-heading"><div><span className="dashboard-eyebrow">Prestação de contas</span><h2>Relatórios de contribuição</h2></div></div>
      {canManage ? <form action={action} className="report-form"><input type="hidden" name="team_id" value={data.team.id} /><label><span>Início opcional</span><input type="date" name="period_start" /></label><label><span>Fim opcional</span><input type="date" name="period_end" /></label><SubmitButton label="Gerar relatório" busyLabel="Gerando…" /><FormFeedback state={state} /></form> : <p className="permission-note">Líderes e colíderes geram relatórios. Todos os participantes podem consultá-los.</p>}
      {data.reports.length ? <div className="report-list">{data.reports.map((report) => <ReportCard key={report.id} report={report} members={data.members} />)}</div> : <EmptyPanel title="Nenhum relatório gerado" text="Quando um relatório for gerado, ele consolidará tarefas, atrasos e comentários reais." />}
    </section>
  );
}

function ReportCard({ report, members }: { report: TeamReport; members: TeamMember[] }) {
  const [open, setOpen] = useState(false);
  const rows = Array.isArray(report.content.members) ? report.content.members.filter(isRecord) : [];
  const memberName = new Map(members.map((member) => [member.userId, member.name]));
  return (
    <article className="report-card">
      <button type="button" onClick={() => setOpen((value) => !value)}><div><strong>{report.title}</strong><span>Gerado em {formatDate(report.createdAt)}</span></div><span>{open ? "Fechar" : "Ver dados"}</span></button>
      {open ? <div className="report-table-wrap"><table><thead><tr><th>Participante</th><th>Atribuídas</th><th>Concluídas</th><th>Atrasadas</th><th>Comentários</th></tr></thead><tbody>{rows.map((row, index) => { const id = typeof row.user_id === "string" ? row.user_id : ""; return <tr key={id || index}><td>{typeof row.name === "string" ? row.name : memberName.get(id) ?? "Participante"}</td><td>{numberValue(row.tasks_assigned)}</td><td>{numberValue(row.tasks_completed)}</td><td className={numberValue(row.tasks_overdue) > 0 ? "has-overdue" : ""}>{numberValue(row.tasks_overdue)}</td><td>{numberValue(row.comments_added)}</td></tr>; })}</tbody></table>{rows.length ? null : <p className="form-guidance">Não havia participantes no período selecionado.</p>}</div> : null}
    </article>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function SettingsPanel({ data }: { data: TeamDetailData }) {
  const [state, action] = useActionState(updateTeamAction, initialActionState);
  return (
    <section className="team-panel settings-panel">
      <div className="team-panel-heading"><div><span className="dashboard-eyebrow">Equipe</span><h2>Informações do projeto</h2></div></div>
      <form
        action={action}
        onSubmit={(event) => {
          const form = event.currentTarget;
          const local = form.elements.namedItem("delivery_local") as HTMLInputElement;
          const iso = form.elements.namedItem("delivery_at") as HTMLInputElement;
          iso.value = local.value ? new Date(local.value).toISOString() : "";
        }}
      >
        <input type="hidden" name="team_id" value={data.team.id} /><input type="hidden" name="delivery_at" />
        <label><span>Matéria</span><input name="subject" required defaultValue={data.team.subject} maxLength={100} /></label>
        <label><span>Professor(a)</span><input name="teacher_name" defaultValue={data.team.teacherName ?? ""} maxLength={100} /></label>
        <label><span>Tema</span><input name="topic" defaultValue={data.team.topic ?? ""} maxLength={160} /></label>
        <label><span>Entrega</span><input name="delivery_local" type="datetime-local" required defaultValue={toLocalInput(data.team.deliveryAt)} /></label>
        <label className="settings-description"><span>Descrição</span><textarea name="description" rows={5} maxLength={2000} defaultValue={data.team.description ?? ""} /></label>
        <SubmitButton label="Salvar alterações" busyLabel="Salvando…" />
        <FormFeedback state={state} />
      </form>
    </section>
  );
}

function SubmitButton({ label, busyLabel, compact = false, danger = false }: { label: string; busyLabel: string; compact?: boolean; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`${compact ? "compact-button" : "primary-action"}${danger ? " danger-button" : ""}`} type="submit" disabled={pending}>{pending ? busyLabel : label}</button>;
}

function FormFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return <p className={`form-feedback is-${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>;
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return <div className="team-empty-panel"><strong>{title}</strong><p>{text}</p></div>;
}
