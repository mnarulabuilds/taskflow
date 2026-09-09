-- AlterEnum: TaskStatus - add new statuses
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'BACKLOG';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- AlterEnum: InviteStatus - add DECLINED
ALTER TYPE "InviteStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

-- AlterEnum: ActivityType - add member events
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'MEMBER_REMOVED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'MEMBER_ROLE_CHANGED';

-- AlterEnum: NotificationType - add TASK_MENTION
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_MENTION';

-- AlterTable: Task - add position
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_projectId_status_position_idx" ON "Task"("projectId", "status", "position");

-- CreateTable: UserPreferences
CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notifyTaskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "notifyTaskComment" BOOLEAN NOT NULL DEFAULT true,
    "notifyDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvite" BOOLEAN NOT NULL DEFAULT true,
    "notifyMention" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferences_userId_key" ON "UserPreferences"("userId");

ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: FavoriteProject
CREATE TABLE IF NOT EXISTS "FavoriteProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteProject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FavoriteProject_userId_projectId_key" ON "FavoriteProject"("userId", "projectId");

ALTER TABLE "FavoriteProject" ADD CONSTRAINT "FavoriteProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteProject" ADD CONSTRAINT "FavoriteProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: TaskSubtask
CREATE TABLE IF NOT EXISTS "TaskSubtask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaskSubtask_taskId_position_idx" ON "TaskSubtask"("taskId", "position");

ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Label
CREATE TABLE IF NOT EXISTS "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Label_workspaceId_name_key" ON "Label"("workspaceId", "name");

ALTER TABLE "Label" ADD CONSTRAINT "Label_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: TaskLabel
CREATE TABLE IF NOT EXISTS "TaskLabel" (
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "TaskLabel_pkey" PRIMARY KEY ("taskId","labelId")
);

ALTER TABLE "TaskLabel" ADD CONSTRAINT "TaskLabel_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskLabel" ADD CONSTRAINT "TaskLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
