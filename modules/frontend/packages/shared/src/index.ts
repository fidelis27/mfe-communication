import type { DomainEvent } from "./events";

export type InstitutionEvent = DomainEvent<
  "INSTITUTION_CREATED" | "INSTITUTION_UPDATED" | "INSTITUTION_INACTIVATED"
>;

export type StudentEvent = DomainEvent<"STUDENT_CREATED" | "STUDENT_UPDATED">;

export * from "./events";
export * from "./bus";
export * from "./auth";
export * from "./types";
export * from "./sentry";
