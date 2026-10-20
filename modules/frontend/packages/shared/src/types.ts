export type UserId = string;
export type InstitutionId = string;
export type GroupId = string;
export type MembershipRole = "admin" | "member";

export interface UserSummary {
  id: UserId;
  name: string;
  email: string;
}

export interface AuthIdentity {
  userId: UserId;
  email: string | null;
  name: string | null;
  roles: string[];
}

export interface AdminUser extends UserSummary {
  status: string;
  superAdmin: boolean;
}

export interface InstitutionSummary {
  id: InstitutionId;
  name: string;
  cnpj?: string | null;
  status?: string;
}

export interface GroupSummary {
  id: GroupId;
  institutionId: InstitutionId;
  institutionName: string;
  name: string;
}

export interface GroupMembership {
  userId: UserId;
  userName: string;
  userEmail: string;
  role: MembershipRole;
}

export type GroupCandidate = UserSummary;
