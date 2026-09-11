import { describe, expect, it } from "vitest";
import { AuthorizationPolicy } from "./authorization-policy";
import type { MemberGroupRepository } from "./member-group-repository";
import type { MemberGroup, User } from "./types";

function createFakeRepo(members: MemberGroup[]): MemberGroupRepository {
  return {
    async findByUserAndInstitution(userId, institutionId) {
      return members.filter((m) => m.userId === userId && m.groupId.includes(institutionId));
    },
    async findByUserAndGroup(userId, groupId) {
      return members.find((m) => m.userId === userId && m.groupId === groupId) ?? null;
    },
  };
}

const superAdmin: User = { id: "u-super", name: "Super", email: "s@x", status: "active", superAdmin: true } as any;
const admin: User = { id: "u-admin", name: "Admin", email: "a@x", status: "active", superAdmin: false } as any;
const memberRead: User = { id: "u-member", name: "Member", email: "m@x", status: "active", superAdmin: false } as any;
const noLink: User = { id: "u-out", name: "Out", email: "o@x", status: "active", superAdmin: false } as any;

const members: MemberGroup[] = [
  { userId: "u-admin", groupId: "g-inst-A", role: "admin" },
  { userId: "u-member", groupId: "g-inst-A", role: "member" },
];

describe("AuthorizationPolicy", () => {
  const policy = new AuthorizationPolicy(createFakeRepo(members));

  it("super-admin can edit any institution", async () => {
    await expect(policy.canEditInstitution(superAdmin, "inst-B")).resolves.toBe(true);
  });

  it("group admin can edit their institution", async () => {
    await expect(policy.canEditInstitution(admin, "inst-A")).resolves.toBe(true);
  });

  it("group admin cannot edit other institutions", async () => {
    await expect(policy.canEditInstitution(admin, "inst-B")).resolves.toBe(false);
  });

  it("member can read but not edit their institution", async () => {
    await expect(policy.canReadInstitution(memberRead, "inst-A")).resolves.toBe(true);
    await expect(policy.canEditInstitution(memberRead, "inst-A")).resolves.toBe(false);
  });

  it("user without links cannot read or edit", async () => {
    await expect(policy.canReadInstitution(noLink, "inst-A")).resolves.toBe(false);
    await expect(policy.canEditInstitution(noLink, "inst-A")).resolves.toBe(false);
  });

  it("only super-admin can create groups", () => {
    expect(policy.canCreateGroup(superAdmin)).toBe(true);
    expect(policy.canCreateGroup(admin)).toBe(false);
  });

  it("group admin manages own group but not others", async () => {
    await expect(policy.canManageGroup(admin, "g-inst-A")).resolves.toBe(true);
    await expect(policy.canManageGroup(admin, "g-inst-B")).resolves.toBe(false);
  });
});
