import type { MemberGroupRepository } from "../member-group-repository";
import type { MemberGroup, GroupId, UserId, InstitutionId } from "../types";

export class InMemoryMemberGroupRepository implements MemberGroupRepository {
  private items: MemberGroup[] = [];

  constructor(initial: MemberGroup[] = []) {
    this.items = [...initial];
  }

  async findByUserAndInstitution(userId: UserId, institutionId: InstitutionId): Promise<MemberGroup[]> {
    return this.items.filter((m) => m.userId === userId && m.groupId.includes(institutionId));
  }

  async findByUserAndGroup(userId: UserId, groupId: GroupId): Promise<MemberGroup | null> {
    return this.items.find((m) => m.userId === userId && m.groupId === groupId) ?? null;
  }

  add(m: MemberGroup) {
    this.items.push(m);
  }
}
