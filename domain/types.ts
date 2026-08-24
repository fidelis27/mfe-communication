export type UserId = string;
export type GroupId = string;
export type InstitutionId = string;

export type GroupRole = "admin" | "member";
export type UserStatus = "active" | "inactive";

export interface User {
  id: UserId;
  name: string;
  email: string;
  status: UserStatus;
  superAdmin: boolean;
}

export interface Group {
  id: GroupId;
  institutionId: InstitutionId;
}

export interface MemberGroup {
  userId: UserId;
  groupId: GroupId;
  role: GroupRole;
}
