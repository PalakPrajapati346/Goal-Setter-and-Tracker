import { prisma } from "./prisma";

export async function writeAudit(params: {
  entity: string;
  entityId: string;
  action: string;
  detail?: string;
  actorId: string;
}) {
  await prisma.auditLog.create({
    data: {
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      detail: params.detail,
      actorId: params.actorId,
    },
  });
}
