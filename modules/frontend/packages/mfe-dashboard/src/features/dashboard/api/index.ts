import { requestJson } from "@mfe/shared";
import { z } from "zod";

const institutionSchema = z.object({ id: z.string(), status: z.string() });
const studentSchema = z.object({ id: z.string(), status: z.string() });
const enrollmentSchema = z.object({ id: z.string(), status: z.string() });

const dashboardDataSchema = z.object({
  institutions: z.array(institutionSchema),
  students: z.array(studentSchema),
  enrollments: z.array(enrollmentSchema),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

export async function getDashboardData(apiUrl: string): Promise<DashboardData> {
  const [institutions, students, enrollments] = await Promise.all([
    requestJson(
      `${apiUrl}/institutions`,
      z.array(institutionSchema),
      {},
      "Não foi possível atualizar os indicadores.",
    ),
    requestJson(
      `${apiUrl}/students`,
      z.array(studentSchema),
      {},
      "Não foi possível atualizar os indicadores.",
    ),
    requestJson(
      `${apiUrl}/enrollments`,
      z.array(enrollmentSchema),
      {},
      "Não foi possível atualizar os indicadores.",
    ),
  ]);

  return dashboardDataSchema.parse({ institutions, students, enrollments });
}
