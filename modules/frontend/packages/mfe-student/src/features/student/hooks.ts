import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Student } from "@mfe/shared";
import { createStudent, getInstitutions, getStudents } from "./api";

export const studentQueryKeys = {
  students: (apiUrl: string) => ["students", apiUrl] as const,
  institutions: (apiUrl: string) => ["institutions", apiUrl] as const,
};

export function useStudents(apiUrl: string) {
  return useQuery({
    queryKey: studentQueryKeys.students(apiUrl),
    queryFn: ({ signal }) => getStudents(apiUrl, signal),
    retry: false,
  });
}

export function useInstitutions(apiUrl: string) {
  return useQuery({
    queryKey: studentQueryKeys.institutions(apiUrl),
    queryFn: ({ signal }) => getInstitutions(apiUrl, signal),
    retry: false,
  });
}

export function useCreateStudent(apiUrl: string) {
  const queryClient = useQueryClient();
  const queryKey = studentQueryKeys.students(apiUrl);

  return useMutation({
    mutationFn: (input: { name: string; institutionId: string }) => createStudent(apiUrl, input),
    onSuccess: async (student) => {
      const current = queryClient.getQueryData<Student[]>(queryKey);
      if (!current) {
        await queryClient.invalidateQueries({ queryKey });
        return;
      }

      queryClient.setQueryData<Student[]>(
        queryKey,
        current.some((item) => item.id === student.id) ? current : [student, ...current],
      );
    },
  });
}
