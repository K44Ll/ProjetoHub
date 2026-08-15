export type TeamRole = "reader" | "editor" | "co_leader" | "leader";

export type TeamStatus = "active" | "completed" | "archived";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TeamSummary = {
  id: string;
  name: string;
  subject: string;
  topic: string | null;
  description: string | null;
  teacherName: string | null;
  deliveryAt: string | null;
  photoUrl: string | null;
  status: TeamStatus;
  role: TeamRole;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
};

export type DashboardTask = {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  dueAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
};

export type ActivityItem = {
  id: number;
  teamId: string;
  teamName: string;
  actorName: string | null;
  eventType: string;
  title: string | null;
  createdAt: string;
};

export type DashboardData = {
  referenceTime: string;
  teams: TeamSummary[];
  assignedTasks: DashboardTask[];
  recentActivities: ActivityItem[];
};

export type TeamMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: string;
};

export type TeamTask = {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string;
  assigneeName: string;
  createdBy: string;
  dueAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  submissionText: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type TeamInvite = {
  id: string;
  token: string;
  role: Exclude<TeamRole, "leader">;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
};

export type TeamReport = {
  id: string;
  title: string;
  createdAt: string;
  content: Record<string, unknown>;
};

export type TeamDriveConnection = {
  connected: boolean;
  connectedAt: string | null;
  rootFolderId: string | null;
  rootFolderName: string | null;
};

export type TeamDetailData = {
  team: TeamSummary;
  referenceTime: string;
  currentUserId: string;
  currentRole: TeamRole;
  members: TeamMember[];
  tasks: TeamTask[];
  comments: TaskComment[];
  activities: ActivityItem[];
  invites: TeamInvite[];
  reports: TeamReport[];
  drive: TeamDriveConnection;
};

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
  data?: Record<string, string>;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};
