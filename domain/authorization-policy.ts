import type { InstitutionId, User } from "./types";
import type { MemberGroupRepository } from "./member-group-repository";

export class AuthorizationPolicy {
  constructor(private readonly members: MemberGroupRepository) {}

  async canEditInstitution(user: User, institutionId: InstitutionId): Promise<boolean> {
    if (user.superAdmin) return true;
    const role = await this.roleInInstitution(user.id, institutionId);
    return role === "admin";
  }

  async canReadInstitution(user: User, institutionId: InstitutionId): Promise<boolean> {
    if (user.superAdmin) return true;
    const role = await this.roleInInstitution(user.id, institutionId);
    return role !== null;
  }

  canCreateGroup(user: User): boolean {
    return user.superAdmin;
  }

  canManageUsers(user: User): boolean {
    return user.superAdmin;
  }

  async canManageGroup(user: User, groupId: string): Promise<boolean> {
    if (user.superAdmin) return true;
    const membership = await this.members.findByUserAndGroup(user.id, groupId);
    return membership?.role === "admin";
  }

  private async roleInInstitution(userId: string, institutionId: InstitutionId): Promise<"admin" | "member" | null> {
    const memberships = await this.members.findByUserAndInstitution(userId, institutionId);
    if (memberships.some((m) => m.role === "admin")) return "admin";
    if (memberships.length > 0) return "member";
    return null;
  }
}
