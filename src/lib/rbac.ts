import { Role } from "@prisma/client";

export function can(role: Role | undefined, allowed: Role[]) {
  return !!role && allowed.includes(role);
}
