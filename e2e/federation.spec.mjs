import { test, expect } from "@playwright/test";
import {
  installFakeWebSocket,
  mockApi,
  seedAuthenticatedSession,
  studentCreatedEvent,
} from "./helpers.mjs";

async function setup(page, options = {}) {
  page.on("console", (message) => {
    if (message.type() === "error") console.error("[browser console]", message.text());
  });
  page.on("pageerror", (error) =>
    console.error("[browser page error]", error.stack ?? error.message),
  );
  if (options.authenticated !== false) await seedAuthenticatedSession(page);
  const api = await mockApi(page, { sessionExpired: options.sessionExpired });
  const socket = await installFakeWebSocket(page);
  return { api, socket };
}

test("host loads all five real remotes through federation navigation", async ({ page }) => {
  await setup(page);
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Módulos da secretaria" })).toBeVisible();

  const modules = [
    { label: "Estudantes", heading: "Vínculos que acompanham cada trajetória." },
    { label: "Instituições", heading: "Uma rede de instituições, um só lugar." },
    { label: "Atividade", heading: "Atividade do sistema." },
    { label: "Dashboard", heading: "O pulso da operação." },
    { label: "Admin", heading: "Pessoas e permissões." },
  ];

  for (const module of modules) {
    await page.getByRole("link", { name: new RegExp(module.label) }).click();
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1, name: module.heading }),
    ).toBeVisible();
  }
});

test("student form creates a record through the real remote", async ({ page }) => {
  const { api } = await setup(page);
  await page.goto("/estudantes");

  await page.getByLabel("Nome completo").fill("Ana E2E");
  await page.getByLabel("Instituição").selectOption("institution-e2e");
  await page.getByRole("button", { name: /Cadastrar estudante/ }).click();

  await expect(page.getByRole("heading", { name: "Ana E2E" })).toBeVisible();
  expect(
    api.requests.some(
      (request) =>
        request.method === "POST" &&
        request.pathname === "/students" &&
        request.postData === JSON.stringify({ name: "Ana E2E", institutionId: "institution-e2e" }),
    ),
  ).toBe(true);
});

test("WebSocket event appears in Activity and refreshes Dashboard", async ({ page }) => {
  const { api, socket } = await setup(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Estudantes" }).locator("..").locator("strong"),
  ).toHaveText("0");

  const student = {
    id: "student-from-event",
    name: "Evento E2E",
    institutionId: "institution-e2e",
    status: "active",
  };
  const event = studentCreatedEvent(student);
  api.students.unshift(student);
  api.history.unshift(event);
  await socket.send(event);

  await expect(
    page.getByRole("heading", { name: "Estudantes" }).locator("..").locator("strong"),
  ).toHaveText("1");
  await page.getByRole("link", { name: /Atividade/ }).click();
  await expect(page.getByText("Estudante cadastrado")).toBeVisible();
  await expect(page.getByText("e2e-correlation")).toBeVisible();
});

test("failed remote displays the shell error boundary", async ({ page }) => {
  await setup(page);
  await page.route("http://127.0.0.1:4279/assets/remoteEntry.js", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("link", { name: /Admin/ }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar este módulo agora.",
  );
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});

test("401 API response shows an expired-session message", async ({ page }) => {
  await setup(page, { sessionExpired: true });
  await page.goto("/estudantes");

  await expect(page.getByText("Sua sessão expirou. Entre novamente.")).toBeVisible();
});

test("unauthenticated session shows the login form", async ({ page }) => {
  await setup(page, { authenticated: false });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Login necessário" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
