import type { GroupId, InstitutionId, MemberGroup, UserId } from "./types";

export interface MemberGroupRepository {
  findByUserAndInstitution(userId: UserId, institutionId: InstitutionId): Promise<MemberGroup[]>;
  findByUserAndGroup(userId: UserId, groupId: GroupId): Promise<MemberGroup | null>;
}
