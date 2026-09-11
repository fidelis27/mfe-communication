import type { UserId, User } from "./types";

export interface NewUserData {
  id: UserId;
  name: string;
  email: string;
}

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUserData): Promise<User>;
  updateStatus(id: UserId, status: "active" | "inactive"): Promise<void>;
  promoteSuperAdmin(id: UserId, superAdmin: boolean): Promise<void>;
}
