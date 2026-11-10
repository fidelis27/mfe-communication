import {
  adminUserSchema,
  groupMembershipSchema,
  groupSchema,
  institutionSummarySchema,
  requestJson,
  requestVoid,
  userSummarySchema,
  type AdminUser,
  type GroupCandidate,
  type GroupMembership,
  type GroupSummary,
  type InstitutionSummary,
  type MembershipRole,
} from "@mfe/shared";
import { z } from "zod";

z.config({ jitless: true });

const usersSchema = z.array(adminUserSchema);
const institutionsSchema = z.array(institutionSummarySchema);
const groupsSchema = z.array(groupSchema);
const membershipsSchema = z.array(groupMembershipSchema);
const candidatesSchema = z.array(userSummarySchema);
const createdGroupSchema = z.object({ id: z.string() });
const membershipMutationSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
  institutionId: z.string(),
  role: z.enum(["admin", "member"]),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
});

export function getUsers(apiUrl: string, signal?: AbortSignal): Promise<AdminUser[]> {
  return requestJson(
    `${apiUrl}/users`,
    usersSchema,
    { signal },
    "Não foi possível carregar as pessoas.",
  );
}

export function getInstitutions(
  apiUrl: string,
  signal?: AbortSignal,
): Promise<InstitutionSummary[]> {
  return requestJson(
    `${apiUrl}/institutions`,
    institutionsSchema,
    { signal },
    "Não foi possível carregar as instituições.",
  );
}

export function getGroups(apiUrl: string, signal?: AbortSignal): Promise<GroupSummary[]> {
  return requestJson(
    `${apiUrl}/groups`,
    groupsSchema,
    { signal },
    "Não foi possível carregar os grupos.",
  );
}

export function getGroupMembers(
  apiUrl: string,
  groupId: string,
  signal?: AbortSignal,
): Promise<GroupMembership[]> {
  return requestJson(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/members`,
    membershipsSchema,
    { signal },
    "Não foi possível carregar os membros.",
  );
}

export function getGroupCandidates(
  apiUrl: string,
  groupId: string,
  signal?: AbortSignal,
): Promise<GroupCandidate[]> {
  return requestJson(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/candidates`,
    candidatesSchema,
    { signal },
    "Não foi possível carregar as pessoas disponíveis.",
  );
}

export function createUser(
  apiUrl: string,
  input: { name: string; email: string; superAdmin: boolean },
): Promise<AdminUser> {
  return requestJson(
    `${apiUrl}/users`,
    adminUserSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Não foi possível cadastrar a pessoa.",
  );
}

export function createGroup(
  apiUrl: string,
  input: { institutionId: string; name: string },
): Promise<{ id: string }> {
  return requestJson(
    `${apiUrl}/groups`,
    createdGroupSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Não foi possível criar o grupo.",
  );
}

export function addGroupMember(
  apiUrl: string,
  groupId: string,
  input: { userId: string; role: MembershipRole },
): Promise<z.infer<typeof membershipMutationSchema>> {
  return requestJson(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/members`,
    membershipMutationSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Não foi possível adicionar o membro.",
  );
}

export function updateGroupMemberRole(
  apiUrl: string,
  groupId: string,
  userId: string,
  role: MembershipRole,
): Promise<z.infer<typeof membershipMutationSchema>> {
  return requestJson(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    membershipMutationSchema,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
    "Não foi possível atualizar o papel.",
  );
}

export function removeGroupMember(apiUrl: string, groupId: string, userId: string): Promise<void> {
  return requestVoid(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
    "Não foi possível remover o membro.",
  );
}

export function updateUserStatus(
  apiUrl: string,
  userId: string,
  status: string,
): Promise<AdminUser> {
  return requestJson(
    `${apiUrl}/users/${encodeURIComponent(userId)}`,
    adminUserSchema,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    "Não foi possível atualizar o status.",
  );
}
