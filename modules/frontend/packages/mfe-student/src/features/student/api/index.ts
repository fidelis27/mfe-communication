import {
  institutionSchema,
  requestJson,
  studentSchema,
  type Institution,
  type Student,
} from "@mfe/shared";
import { z } from "zod";

const institutionsSchema = z.array(institutionSchema);
const studentsSchema = z.array(studentSchema);

export function getInstitutions(apiUrl: string, signal?: AbortSignal): Promise<Institution[]> {
  return requestJson(
    `${apiUrl}/institutions`,
    institutionsSchema,
    { signal },
    "Não foi possível carregar as instituições.",
  );
}

export function getStudents(apiUrl: string, signal?: AbortSignal): Promise<Student[]> {
  return requestJson(
    `${apiUrl}/students`,
    studentsSchema,
    { signal },
    "Não foi possível carregar os estudantes.",
  );
}

export function createStudent(
  apiUrl: string,
  input: { name: string; institutionId: string },
): Promise<Student> {
  return requestJson(
    `${apiUrl}/students`,
    studentSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Não foi possível cadastrar o estudante.",
  );
}
