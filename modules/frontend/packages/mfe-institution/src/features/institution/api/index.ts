import { institutionSchema, requestJson, type Institution } from "@mfe/shared";
import { z } from "zod";

z.config({ jitless: true });

const institutionsSchema = z.array(institutionSchema);

export function getInstitutions(apiUrl: string, signal?: AbortSignal): Promise<Institution[]> {
  return requestJson(
    `${apiUrl}/institutions`,
    institutionsSchema,
    { signal },
    "Não foi possível carregar as instituições.",
  );
}

export function createInstitution(
  apiUrl: string,
  input: { name: string; cnpj: string },
): Promise<Institution> {
  return requestJson(
    `${apiUrl}/institutions`,
    institutionSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Não foi possível cadastrar a instituição.",
  );
}
