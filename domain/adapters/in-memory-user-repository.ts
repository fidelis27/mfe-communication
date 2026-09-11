import type { NewUserData, UserRepository } from "../user-repository";
import type { User, UserId } from "../types";

export class InMemoryUserRepository implements UserRepository {
  private store = new Map<UserId, User>();

  constructor(initial: User[] = []) {
    for (const u of initial) this.store.set(u.id, u);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const u of this.store.values()) if (u.email === email) return u;
    return null;
  }

  async create(data: NewUserData): Promise<User> {
    const user: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      status: "active",
      superAdmin: false,
    };
    this.store.set(user.id, user);
    return user;
  }

  async updateStatus(id: UserId, status: "active" | "inactive"): Promise<void> {
    const u = this.store.get(id);
    if (!u) throw new Error("user not found");
    u.status = status as any;
    this.store.set(id, u);
  }

  async promoteSuperAdmin(id: UserId, superAdmin: boolean): Promise<void> {
    const u = this.store.get(id);
    if (!u) throw new Error("user not found");
    u.superAdmin = superAdmin;
    this.store.set(id, u);
  }
}
