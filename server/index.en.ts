import express from "express";
import bodyParser from "body-parser";
import { authentication } from "../middleware/identity-middleware";
import { loadUserForAuthorization } from "../middleware/load-user-middleware";
import { requireInstitutionEditPermission } from "../middleware/authorization-middleware";
import { AuthorizationPolicy } from "../domain/authorization-policy";
import { InMemoryUserRepository } from "../domain/adapters/in-memory-user-repository";
import { InMemoryMemberGroupRepository } from "../domain/adapters/in-memory-member-group-repository";

const app = express();
app.use(bodyParser.json());

async function validateSession(req: any) {
  const id = req.headers["x-demo-user"] as string | undefined;
  if (!id) return null;
  return { userId: id };
}

const userRepo = new InMemoryUserRepository([
  { id: "u-super", name: "Super", email: "super@x", status: "active", superAdmin: true },
  { id: "u-admin", name: "Admin", email: "admin@x", status: "active", superAdmin: false },
]);

const members = new InMemoryMemberGroupRepository([
  { userId: "u-admin", groupId: "g-inst-A", role: "admin" },
]);

const policy = new AuthorizationPolicy(members);

app.use(authentication(validateSession));
app.use(loadUserForAuthorization(userRepo));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.put("/institutions/:institutionId", requireInstitutionEditPermission(policy), (req, res) => {
  res.json({ success: true, institution: req.params.institutionId });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3333;
app.listen(port, () => console.log(`server listening ${port}`));
