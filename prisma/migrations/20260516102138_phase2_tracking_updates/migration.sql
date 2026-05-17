-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('EMPLOYEE', 'MANAGER', 'ADMIN') NOT NULL,
    `department` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cycle` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4') NOT NULL,
    `year` INTEGER NOT NULL,
    `opensAt` DATETIME(3) NOT NULL,
    `closesAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SharedGoalDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `thrustArea` VARCHAR(191) NOT NULL,
    `uomType` ENUM('NUMERIC', 'PERCENT', 'TIMELINE', 'ZERO_BASED') NOT NULL,
    `direction` ENUM('MIN_HIGHER_BETTER', 'MAX_LOWER_BETTER') NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `primaryOwnerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoalSheet` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `managerId` VARCHAR(191) NULL,
    `cycleId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REWORK') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `lockedAt` DATETIME(3) NULL,

    INDEX `GoalSheet_managerId_idx`(`managerId`),
    INDEX `GoalSheet_status_idx`(`status`),
    UNIQUE INDEX `GoalSheet_employeeId_cycleId_key`(`employeeId`, `cycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Goal` (
    `id` VARCHAR(191) NOT NULL,
    `sheetId` VARCHAR(191) NOT NULL,
    `sharedDefId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `thrustArea` VARCHAR(191) NOT NULL,
    `uomType` ENUM('NUMERIC', 'PERCENT', 'TIMELINE', 'ZERO_BASED') NOT NULL,
    `direction` ENUM('MIN_HIGHER_BETTER', 'MAX_LOWER_BETTER') NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NULL,
    `weightPct` DECIMAL(5, 2) NOT NULL,
    `readOnlyTitleTarget` BOOLEAN NOT NULL DEFAULT false,
    `isPrimaryOwner` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Goal_sheetId_thrustArea_idx`(`sheetId`, `thrustArea`),
    INDEX `Goal_sheetId_idx`(`sheetId`),
    INDEX `Goal_sharedDefId_idx`(`sharedDefId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuarterlyGoalUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `period` ENUM('GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4') NOT NULL,
    `plannedTarget` VARCHAR(191) NULL,
    `actual` VARCHAR(191) NULL,
    `status` ENUM('NOT_STARTED', 'ON_TRACK', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `progressScore` DECIMAL(7, 4) NULL,
    `employComment` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `QuarterlyGoalUpdate_period_idx`(`period`),
    UNIQUE INDEX `QuarterlyGoalUpdate_goalId_period_key`(`goalId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckIn` (
    `id` VARCHAR(191) NOT NULL,
    `sheetId` VARCHAR(191) NOT NULL,
    `period` ENUM('GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4') NOT NULL,
    `managerId` VARCHAR(191) NOT NULL,
    `comment` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CheckIn_sheetId_period_key`(`sheetId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `detail` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedGoalDefinition` ADD CONSTRAINT `SharedGoalDefinition_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedGoalDefinition` ADD CONSTRAINT `SharedGoalDefinition_primaryOwnerId_fkey` FOREIGN KEY (`primaryOwnerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalSheet` ADD CONSTRAINT `GoalSheet_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalSheet` ADD CONSTRAINT `GoalSheet_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalSheet` ADD CONSTRAINT `GoalSheet_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `Cycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_sheetId_fkey` FOREIGN KEY (`sheetId`) REFERENCES `GoalSheet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_sharedDefId_fkey` FOREIGN KEY (`sharedDefId`) REFERENCES `SharedGoalDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuarterlyGoalUpdate` ADD CONSTRAINT `QuarterlyGoalUpdate_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `Goal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_sheetId_fkey` FOREIGN KEY (`sheetId`) REFERENCES `GoalSheet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
