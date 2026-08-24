import type { InstitutionId } from "./types";

export interface Student {
  id: string;
  name: string;
  registration: string;
  institutionId: InstitutionId;
  birthDate?: string;
  status: "active" | "inactive";
}

export interface StudentRepository {
  create(a: Omit<Student, "status">): Promise<Student>;
  findById(id: string): Promise<Student | null>;
  findByRegistration(registration: string): Promise<Student | null>;
  findByInstitution(institutionId: InstitutionId): Promise<Student[]>;
  update(id: string, patch: Partial<Student>): Promise<void>;
  delete(id: string): Promise<void>;
}
