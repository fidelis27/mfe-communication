import type { InstitutionId } from "./types";

export interface Institution {
  id: InstitutionId;
  name: string;
  cnpj?: string;
  status: "active" | "inactive";
}

export interface InstitutionRepository {
  create(i: Omit<Institution, "status">): Promise<Institution>;
  findById(id: InstitutionId): Promise<Institution | null>;
  update(id: InstitutionId, patch: Partial<Institution>): Promise<void>;
  inactivate(id: InstitutionId): Promise<void>;
  delete(id: InstitutionId): Promise<void>;
  list(): Promise<Institution[]>;
}
