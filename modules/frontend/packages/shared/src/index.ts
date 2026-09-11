export type InstitutionEvent = {
  type: "INSTITUTION_CREATED" | "INSTITUTION_UPDATED" | "INSTITUTION_INACTIVATED";
  payload: { id: string; name?: string };
  occurredAt: string;
};

export type StudentEvent = {
  type: "STUDENT_CREATED" | "STUDENT_UPDATED";
  payload: { id: string; institutionId: string };
  occurredAt: string;
};

export * from "./types";
