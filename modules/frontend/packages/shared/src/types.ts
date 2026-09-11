export type UserId = string;
export type InstitutionId = string;
export type GroupId = string;

export interface UserSummary {
  id: UserId;
  name: string;
  email: string;
}
