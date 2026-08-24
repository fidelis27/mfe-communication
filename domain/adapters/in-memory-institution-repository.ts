import type { InstitutionRepository, Institution } from "../institution-repository";
import type { InstitutionId } from "../types";

export class InMemoryInstitutionRepository implements InstitutionRepository {
  private items = new Map<InstitutionId, Institution>();

  constructor(initial: Institution[] = []) {
    for (const i of initial) this.items.set(i.id, i);
  }

  async create(i: Omit<Institution, "status">): Promise<Institution> {
    const inst: Institution = { ...i, status: "active" };
    this.items.set(inst.id, inst);
    return inst;
  }

  async findById(id: InstitutionId): Promise<Institution | null> {
    return this.items.get(id) ?? null;
  }

  async update(id: InstitutionId, patch: Partial<Institution>): Promise<void> {
    const cur = this.items.get(id);
    if (!cur) throw new Error("institution not found");
    this.items.set(id, { ...cur, ...patch });
  }

  async inactivate(id: InstitutionId): Promise<void> {
    const cur = this.items.get(id);
    if (!cur) throw new Error("institution not found");
    cur.status = "inactive";
    this.items.set(id, cur);
  }

  async delete(id: InstitutionId): Promise<void> {
    this.items.delete(id);
  }

  async list(): Promise<Institution[]> {
    return Array.from(this.items.values());
  }
}
