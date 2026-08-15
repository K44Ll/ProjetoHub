"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeControl } from "@/components/theme-control";
import { createClient } from "@/utils/supabase/client";
import type {
  ActivityItem,
  DashboardData,
  DashboardTask,
  TeamRole,
  TeamSummary,
} from "@/types/app";

type DashboardHomeProps = {
  user: {
    email: string;
    name: string;
  };
  data: DashboardData;
};

type IconName =
  | "calendar"
  | "check"
  | "clock"
  | "folder"
  | "logout"
  | "plus"
  | "sparkles"
  | "users";

const roleLabels: Record<TeamRole, string> = {
  reader: "Leitor",
  editor: "Editor",
  co_leader: "Colíder",
  leader: "Líder",
};

const activityLabels: Record<string, string> = {
  team_created: "criou a equipe",
  member_joined: "entrou na equipe",
  member_role_changed: "alterou a função de um participante",
  task_created: "criou uma tarefa",
  task_submitted: "entregou uma tarefa para revisão",
  task_completed: "concluiu uma tarefa",
  task_status_changed: "alterou o status de uma tarefa",
  report_generated: "gerou um relatório de contribuição",
  comment_created: "comentou em uma tarefa",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    calendar: (
      <>
        <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
        <path d="M8 13h3v3H8z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    folder: <path d="M3 6h7l2 2h9v11H3V6Z" />,
    logout: <path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" />,
    plus: <path d="M12 5v14M5 12h14" />,
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
        <path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-2.2A4.8 4.8 0 0 1 8.3 12h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.5a3 3 0 0 1 0 5.8M17 13a4.5 4.5 0 0 1 3.5 4.4V19" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function progressFor(team: TeamSummary) {
  return team.taskCount
    ? Math.round((team.completedTaskCount / team.taskCount) * 100)
    : 0;
}

function daysUntil(value: string, referenceTime: string) {
  return Math.ceil((Date.parse(value) - Date.parse(referenceTime)) / 86_400_000);
}

export function DashboardHome({ user, data }: DashboardHomeProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [activeView, setActiveView] = useState<"overview" | "pending">(
    "overview",
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  const firstName = user.name.trim().split(/\s+/)[0] || "estudante";
  const userInitials = getInitials(user.name) || "PH";
  const pendingTeams = data.teams
    .filter((team) => team.status === "active" && team.deliveryAt)
    .toSorted(
      (left, right) =>
        Date.parse(left.deliveryAt ?? "") - Date.parse(right.deliveryAt ?? ""),
    );
  const nextDelivery = pendingTeams[0] ?? null;
  const completedTasks = data.teams.reduce(
    (total, team) => total + team.completedTaskCount,
    0,
  );
  const overdueTasks = data.teams.reduce(
    (total, team) => total + team.overdueTaskCount,
    0,
  );

  async function handleSignOut() {
    setIsSigningOut(true);
    setAccountMessage("");

    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      setAccountMessage("Não foi possível sair agora. Tente novamente.");
      setIsSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid-bg" aria-hidden="true" />
      <div className="dashboard-glow dashboard-glow-one" aria-hidden="true" />
      <div className="dashboard-glow dashboard-glow-two" aria-hidden="true" />

      <header className="dashboard-header">
        <Link className="brand" href="/" aria-label="ProjetoHub — página inicial">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>ProjetoHub</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Navegação principal">
          <button
            className={activeView === "overview" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("overview")}
          >
            Visão geral
          </button>
          <button
            className={activeView === "pending" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("pending")}
          >
            Projetos pendentes
            <span>{pendingTeams.length}</span>
          </button>
        </nav>

        <div className="dashboard-header-actions">
          <ThemeControl />
          <div className="profile-menu-wrap">
            <button
              className="profile-trigger"
              type="button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span>{userInitials}</span>
              <span className="profile-trigger-copy">
                <strong>{user.name}</strong>
                <small>Minha conta</small>
              </span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m6 8 4 4 4-4" />
              </svg>
            </button>

            {profileOpen ? (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-heading">
                  <span>{userInitials}</span>
                  <div>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                </div>
                <div className="profile-plan">
                  <span>Conta estudante</span>
                  <small>Perfil conectado</small>
                </div>
                {accountMessage ? (
                  <p className="profile-error" role="alert">
                    {accountMessage}
                  </p>
                ) : null}
                <button
                  className="profile-signout"
                  type="button"
                  role="menuitem"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                >
                  <Icon name="logout" />
                  {isSigningOut ? "Saindo..." : "Sair desta sessão"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <div>
            <span className="dashboard-eyebrow">Seu espaço de trabalho</span>
            <h1>Olá, {firstName}.</h1>
            <p>
              {data.assignedTasks.length
                ? `Você tem ${data.assignedTasks.length} tarefa${data.assignedTasks.length === 1 ? "" : "s"} aguardando sua participação.`
                : "Você não possui tarefas pendentes no momento."}
            </p>
          </div>
          <Link className="dashboard-primary-button" href="/equipes/nova">
            <Icon name="plus" />
            Criar nova equipe
          </Link>
        </div>

        {activeView === "overview" ? (
          <Overview
            teams={data.teams}
            assignedTasks={data.assignedTasks}
            activities={data.recentActivities}
            completedTasks={completedTasks}
            overdueTasks={overdueTasks}
            nextDelivery={nextDelivery}
            referenceTime={data.referenceTime}
            onShowPending={() => setActiveView("pending")}
          />
        ) : (
          <PendingProjects teams={pendingTeams} referenceTime={data.referenceTime} />
        )}
      </section>
    </main>
  );
}

function Overview({
  teams,
  assignedTasks,
  activities,
  completedTasks,
  overdueTasks,
  nextDelivery,
  referenceTime,
  onShowPending,
}: {
  teams: TeamSummary[];
  assignedTasks: DashboardTask[];
  activities: ActivityItem[];
  completedTasks: number;
  overdueTasks: number;
  nextDelivery: TeamSummary | null;
  referenceTime: string;
  onShowPending: () => void;
}) {
  const activeTeams = teams.filter((team) => team.status === "active").length;

  return (
    <div className="overview-layout">
      <section className="overview-main">
        <div className="metric-grid" aria-label="Resumo da sua conta">
          <MetricCard
            icon="users"
            value={teams.length}
            label="Equipes"
            note={teams.length ? `${activeTeams} ativas` : "Nenhuma cadastrada"}
            tone="indigo"
          />
          <MetricCard
            icon="folder"
            value={activeTeams}
            label="Projetos ativos"
            note={activeTeams ? "Com trabalho em andamento" : "Nenhum em andamento"}
            tone="pink"
          />
          <MetricCard
            icon="check"
            value={completedTasks}
            label="Tarefas concluídas"
            note={completedTasks ? "Registradas pelas equipes" : "Nenhuma registrada"}
            tone="green"
          />
          <MetricCard
            icon="clock"
            value={overdueTasks}
            label="Tarefas atrasadas"
            note={overdueTasks ? "Precisam de atenção" : "Nada em atraso"}
            tone="amber"
          />
        </div>

        <section className="dashboard-panel teams-section">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Colaboração</span>
              <h2>Suas equipes</h2>
            </div>
          </div>

          {teams.length ? (
            <div className="team-list">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="users"
              title="Nenhuma equipe cadastrada"
              description="Crie uma equipe para começar a organizar integrantes, tarefas e prazos."
              actionHref="/equipes/nova"
              actionLabel="Criar primeira equipe"
            />
          )}
        </section>
      </section>

      <aside className="overview-sidebar">
        {nextDelivery?.deliveryAt ? (
          <NextDelivery team={nextDelivery} referenceTime={referenceTime} onShowPending={onShowPending} />
        ) : (
          <section className="next-delivery-card next-delivery-empty">
            <div className="next-delivery-topline">
              <span>
                <Icon name="calendar" /> Próxima entrega
              </span>
            </div>
            <div className="sidebar-empty-icon">
              <Icon name="calendar" />
            </div>
            <h2>Nenhuma entrega agendada</h2>
            <p>As datas das suas equipes aparecerão aqui.</p>
          </section>
        )}

        <section className="dashboard-panel focus-card">
          <div className="panel-heading compact">
            <div>
              <span className="panel-kicker">Responsabilidades</span>
              <h2>Suas tarefas</h2>
            </div>
            <Icon name="sparkles" />
          </div>
          {assignedTasks.length ? (
            <ul>
              {assignedTasks.slice(0, 4).map((task) => (
                <li key={task.id}>
                  <span className="focus-check" />
                  <div>
                    <Link href={`/equipes/${task.teamId}?task=${task.id}`}>
                      {task.title}
                    </Link>
                    <small>
                      {task.teamName}
                      {task.dueAt ? ` · ${dateFormatter.format(new Date(task.dueAt))}` : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="compact-empty-state">Nenhuma tarefa pendente.</div>
          )}
        </section>

        <section className="dashboard-panel activity-card">
          <div className="panel-heading compact">
            <div>
              <span className="panel-kicker">Atualizações</span>
              <h2>Atividade recente</h2>
            </div>
          </div>
          {activities.length ? (
            <div className="activity-list">
              {activities.slice(0, 5).map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="compact-empty-state">Nenhuma atividade registrada.</div>
          )}
        </section>
      </aside>
    </div>
  );
}

function TeamCard({ team }: { team: TeamSummary }) {
  const progress = progressFor(team);

  return (
    <Link className="team-card team-card-link" href={`/equipes/${team.id}`}>
      <div
        className={`team-symbol${team.photoUrl ? " has-photo" : ""}`}
        style={team.photoUrl ? { backgroundImage: `url(${team.photoUrl})` } : undefined}
      >
        {team.photoUrl ? null : getInitials(team.name)}
      </div>
      <div className="team-copy">
        <div className="team-title-line">
          <div>
            <h3>{team.name}</h3>
            <p>{team.topic || team.subject}</p>
          </div>
          <span>{roleLabels[team.role]}</span>
        </div>
        <div className="team-progress-line">
          <div className="team-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
        </div>
        <div className="team-meta">
          <span>{team.memberCount} integrante{team.memberCount === 1 ? "" : "s"}</span>
          <span>{team.taskCount} tarefa{team.taskCount === 1 ? "" : "s"}</span>
        </div>
      </div>
    </Link>
  );
}

function NextDelivery({
  team,
  referenceTime,
  onShowPending,
}: {
  team: TeamSummary;
  referenceTime: string;
  onShowPending: () => void;
}) {
  const progress = progressFor(team);
  const remainingDays = team.deliveryAt ? daysUntil(team.deliveryAt, referenceTime) : 0;

  return (
    <section className="next-delivery-card">
      <div className="next-delivery-topline">
        <span>
          <Icon name="calendar" /> Próxima entrega
        </span>
        <strong className={remainingDays < 0 ? "is-overdue" : ""}>
          {remainingDays < 0
            ? `${Math.abs(remainingDays)} dia${Math.abs(remainingDays) === 1 ? "" : "s"} de atraso`
            : `${remainingDays} dia${remainingDays === 1 ? "" : "s"}`}
        </strong>
      </div>
      <p>{team.deliveryAt ? dateTimeFormatter.format(new Date(team.deliveryAt)) : ""}</p>
      <h2>{team.name}</h2>
      <span className="next-delivery-team">{team.subject}</span>
      <div className="next-delivery-progress">
        <div>
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{progress}%</strong>
      </div>
      <button type="button" onClick={onShowPending}>
        Ver projetos pendentes <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function MetricCard({
  icon,
  value,
  label,
  note,
  tone,
}: {
  icon: IconName;
  value: number;
  label: string;
  note: string;
  tone: "amber" | "green" | "indigo" | "pink";
}) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-icon">
        <Icon name={icon} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
      <small>{note}</small>
    </article>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const text = activityLabels[activity.eventType] ?? "registrou uma atividade";

  return (
    <Link className="dashboard-activity" href={`/equipes/${activity.teamId}`}>
      <span>{activity.actorName ? getInitials(activity.actorName) : "PH"}</span>
      <div>
        <strong>
          {activity.actorName || "Sistema"} {text}
          {activity.title ? `: ${activity.title}` : ""}
        </strong>
        <small>
          {activity.teamName} · {dateTimeFormatter.format(new Date(activity.createdAt))}
        </small>
      </div>
    </Link>
  );
}

function PendingProjects({ teams, referenceTime }: { teams: TeamSummary[]; referenceTime: string }) {
  const dueThisWeek = teams.filter((team) => {
    if (!team.deliveryAt) return false;
    const days = daysUntil(team.deliveryAt, referenceTime);
    return days >= 0 && days <= 7;
  }).length;

  return (
    <section className="dashboard-panel pending-section">
      <div className="panel-heading pending-heading">
        <div>
          <span className="panel-kicker">Calendário de entregas</span>
          <h2>Projetos pendentes</h2>
          <p>Organizados pela data de entrega mais próxima.</p>
        </div>
        <div className="pending-summary">
          <span>
            <strong>{teams.length}</strong> pendentes
          </span>
          <span>
            <strong>{dueThisWeek}</strong> nesta semana
          </span>
        </div>
      </div>

      {teams.length ? (
        <div className="pending-list">
          {teams.map((team) => {
            const remainingDays = team.deliveryAt ? daysUntil(team.deliveryAt, referenceTime) : 0;
            const progress = progressFor(team);
            return (
              <Link className="pending-project" href={`/equipes/${team.id}`} key={team.id}>
                <div className={`project-date${remainingDays < 0 ? " project-date-high" : ""}`}>
                  <strong>
                    {team.deliveryAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          timeZone: "America/Sao_Paulo",
                        }).format(new Date(team.deliveryAt))
                      : "—"}
                  </strong>
                  <span>
                    {team.deliveryAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          month: "short",
                          timeZone: "America/Sao_Paulo",
                        }).format(new Date(team.deliveryAt))
                      : ""}
                  </span>
                </div>
                <div className="project-main">
                  <div className="project-title-row">
                    <div>
                      <span>{team.subject}</span>
                      <h3>{team.name}</h3>
                    </div>
                    {team.overdueTaskCount ? (
                      <span className="project-status is-overdue">
                        {team.overdueTaskCount} tarefa{team.overdueTaskCount === 1 ? "" : "s"} atrasada{team.overdueTaskCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="project-status">Em andamento</span>
                    )}
                  </div>
                  <div className="project-progress-row">
                    <div>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="project-footer">
                    <span>
                      <Icon name="clock" />
                      {remainingDays < 0
                        ? `Entrega atrasada há ${Math.abs(remainingDays)} dia${Math.abs(remainingDays) === 1 ? "" : "s"}`
                        : `Entrega em ${remainingDays} dia${remainingDays === 1 ? "" : "s"}`}
                    </span>
                    <span>
                      {team.memberCount} integrante{team.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="folder"
          title="Nenhum projeto pendente"
          description="As equipes ativas com data de entrega aparecerão nesta área."
        />
      )}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: IconName;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="dashboard-empty-state">
      <span>
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref}>{actionLabel}</Link>
      ) : null}
    </div>
  );
}
