import type { InstituicaoRepository, Instituicao } from "../instituicao-repository";
import type { InstituicaoId } from "../tipos";

export class InMemoryInstituicaoRepository implements InstituicaoRepository {
  private items = new Map<InstituicaoId, Instituicao>();

  constructor(initial: Instituicao[] = []) {
    for (const i of initial) this.items.set(i.id, i);
  }

  async create(i: Omit<Instituicao, "status">): Promise<Instituicao> {
    const inst: Instituicao = { ...i, status: "ativo" };
    this.items.set(inst.id, inst);
    return inst;
  }

  async findById(id: InstituicaoId): Promise<Instituicao | null> {
    return this.items.get(id) ?? null;
  }

  async update(id: InstituicaoId, patch: Partial<Instituicao>): Promise<void> {
    const cur = this.items.get(id);
    if (!cur) throw new Error("instituicao not found");
    this.items.set(id, { ...cur, ...patch });
  }

  async inactivate(id: InstituicaoId): Promise<void> {
    const cur = this.items.get(id);
    if (!cur) throw new Error("instituicao not found");
    cur.status = "inativo";
    this.items.set(id, cur);
  }

  async delete(id: InstituicaoId): Promise<void> {
    this.items.delete(id);
  }

  async list(): Promise<Instituicao[]> {
    return Array.from(this.items.values());
  }
}
