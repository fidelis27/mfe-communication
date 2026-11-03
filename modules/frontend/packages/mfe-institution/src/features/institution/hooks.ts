import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Institution } from "@mfe/shared";
import { createInstitution, getInstitutions } from "./api";

export const institutionQueryKeys = {
  institutions: (apiUrl: string) => ["institutions", apiUrl] as const,
};

export function useInstitutions(apiUrl: string) {
  return useQuery({
    queryKey: institutionQueryKeys.institutions(apiUrl),
    queryFn: ({ signal }) => getInstitutions(apiUrl, signal),
    retry: false,
  });
}

export function useCreateInstitution(apiUrl: string) {
  const queryClient = useQueryClient();
  const queryKey = institutionQueryKeys.institutions(apiUrl);

  return useMutation({
    mutationFn: (input: { name: string; cnpj: string }) => createInstitution(apiUrl, input),
    onSuccess: async (institution) => {
      const current = queryClient.getQueryData<Institution[]>(queryKey);
      if (!current) {
        await queryClient.invalidateQueries({ queryKey });
        return;
      }

      queryClient.setQueryData<Institution[]>(
        queryKey,
        current.some((item) => item.id === institution.id) ? current : [institution, ...current],
      );
    },
  });
}
