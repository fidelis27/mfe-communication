import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addGroupMember,
  createGroup,
  createUser,
  getGroupCandidates,
  getGroupMembers,
  getGroups,
  getInstitutions,
  getUsers,
  removeGroupMember,
  updateGroupMemberRole,
  updateUserStatus,
} from "./index";

describe("admin feature API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads resources and performs admin mutations through the matching endpoints", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/users") && !init?.method) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: "user-1",
                name: "Ana",
                email: "ana@example.test",
                status: "active",
                superAdmin: false,
              },
            ]),
          ),
        );
      }
      if (url.endsWith("/users") && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "user-2",
              name: "Bia",
              email: "bia@example.test",
              status: "active",
              superAdmin: false,
            }),
            { status: 201 },
          ),
        );
      }
      if (url.endsWith("/institutions")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "inst-1", name: "Escola", status: "active" }])),
        );
      }
      if (url.endsWith("/groups") && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "group-1",
              institutionId: "inst-1",
              name: "Grupo",
            }),
          ),
        );
      }
      if (url.endsWith("/groups")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: "group-1",
                institutionId: "inst-1",
                institutionName: "Escola",
                name: "Grupo",
              },
            ]),
          ),
        );
      }
      if (url.endsWith("/members") && init?.method !== "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { userId: "user-1", userName: "Ana", userEmail: "ana@example.test", role: "admin" },
            ]),
          ),
        );
      }
      if (url.endsWith("/members") && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              userId: "user-2",
              groupId: "group-1",
              institutionId: "inst-1",
              role: "member",
            }),
            { status: 201 },
          ),
        );
      }
      if (url.endsWith("/members/user-2") && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              userId: "user-2",
              groupId: "group-1",
              institutionId: "inst-1",
              role: "admin",
            }),
          ),
        );
      }
      if (url.endsWith("/candidates")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "user-2", name: "Bia", email: "bia@example.test" }])),
        );
      }
      if (url.endsWith("/users/user-1") && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "user-1",
              name: "Ana",
              email: "ana@example.test",
              status: "inactive",
              superAdmin: false,
            }),
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getUsers("https://api.test")).resolves.toHaveLength(1);
    await expect(getInstitutions("https://api.test")).resolves.toHaveLength(1);
    await expect(getGroups("https://api.test")).resolves.toHaveLength(1);
    await expect(getGroupMembers("https://api.test", "group-1")).resolves.toHaveLength(1);
    await expect(getGroupCandidates("https://api.test", "group-1")).resolves.toHaveLength(1);
    await expect(
      createUser("https://api.test", {
        name: "Bia",
        email: "bia@example.test",
        superAdmin: false,
      }),
    ).resolves.toMatchObject({ id: "user-2" });
    await expect(
      createGroup("https://api.test", { institutionId: "inst-1", name: "Grupo" }),
    ).resolves.toMatchObject({ id: "group-1" });
    await expect(
      addGroupMember("https://api.test", "group-1", { userId: "user-2", role: "member" }),
    ).resolves.toMatchObject({ role: "member" });
    await expect(
      updateGroupMemberRole("https://api.test", "group-1", "user-2", "admin"),
    ).resolves.toMatchObject({ role: "admin" });
    await removeGroupMember("https://api.test", "group-1", "user-2");
    await expect(updateUserStatus("https://api.test", "user-1", "inactive")).resolves.toMatchObject(
      { status: "inactive" },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/groups/group-1/members/user-2",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/users/user-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "inactive" }),
      }),
    );
  });
});
