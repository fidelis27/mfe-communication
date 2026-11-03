import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addGroupMember,
  createGroup,
  createUser,
  getGroupCandidates,
  getGroupMembers,
  getGroups,
  getInstitutions,
  getUsers,
  removeGroupMember,
  updateGroupMemberRole,
  updateUserStatus,
} from "./api";
import type { MembershipRole } from "@mfe/shared";

export const adminQueryKeys = {
  users: (apiUrl: string) => ["admin", "users", apiUrl] as const,
  institutions: (apiUrl: string) => ["admin", "institutions", apiUrl] as const,
  groups: (apiUrl: string) => ["admin", "groups", apiUrl] as const,
  members: (apiUrl: string, groupId: string) => ["admin", "members", apiUrl, groupId] as const,
  candidates: (apiUrl: string, groupId: string) =>
    ["admin", "candidates", apiUrl, groupId] as const,
};

export function useUsers(apiUrl: string, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.users(apiUrl),
    queryFn: ({ signal }) => getUsers(apiUrl, signal),
    enabled,
    retry: false,
  });
}

export function useInstitutions(apiUrl: string, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.institutions(apiUrl),
    queryFn: ({ signal }) => getInstitutions(apiUrl, signal),
    enabled,
    retry: false,
  });
}

export function useGroups(apiUrl: string) {
  return useQuery({
    queryKey: adminQueryKeys.groups(apiUrl),
    queryFn: ({ signal }) => getGroups(apiUrl, signal),
    retry: false,
  });
}

export function useGroupMembers(apiUrl: string, groupId: string) {
  return useQuery({
    queryKey: adminQueryKeys.members(apiUrl, groupId),
    queryFn: ({ signal }) => getGroupMembers(apiUrl, groupId, signal),
    enabled: Boolean(groupId),
    retry: false,
  });
}

export function useGroupCandidates(apiUrl: string, groupId: string) {
  return useQuery({
    queryKey: adminQueryKeys.candidates(apiUrl, groupId),
    queryFn: ({ signal }) => getGroupCandidates(apiUrl, groupId, signal),
    enabled: Boolean(groupId),
    retry: false,
  });
}

export function useCreateUser(apiUrl: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; superAdmin: boolean }) =>
      createUser(apiUrl, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.users(apiUrl) }),
  });
}

export function useCreateGroup(apiUrl: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { institutionId: string; name: string }) => createGroup(apiUrl, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(apiUrl) }),
  });
}

export function useAddGroupMember(apiUrl: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      input,
    }: {
      groupId: string;
      input: { userId: string; role: MembershipRole };
    }) => addGroupMember(apiUrl, groupId, input),
    onSuccess: (_result, { groupId }) => invalidateGroupMembers(queryClient, apiUrl, groupId),
  });
}

export function useUpdateGroupMemberRole(apiUrl: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      role,
    }: {
      groupId: string;
      userId: string;
      role: MembershipRole;
    }) => updateGroupMemberRole(apiUrl, groupId, userId, role),
    onSuccess: (_result, { groupId }) => invalidateGroupMembers(queryClient, apiUrl, groupId),
  });
}

export function useRemoveGroupMember(apiUrl: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      removeGroupMember(apiUrl, groupId, userId),
    onSuccess: (_result, { groupId }) => invalidateGroupMembers(queryClient, apiUrl, groupId),
  });
}

export function useUpdateUserStatus(apiUrl: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      updateUserStatus(apiUrl, userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.users(apiUrl) }),
  });
}

function invalidateGroupMembers(
  queryClient: ReturnType<typeof useQueryClient>,
  apiUrl: string,
  groupId: string,
) {
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.members(apiUrl, groupId) });
  return queryClient.invalidateQueries({ queryKey: adminQueryKeys.candidates(apiUrl, groupId) });
}
