import { z } from "zod";

z.config({ jitless: true });

export type UserId = string;
export type InstitutionId = string;
export type GroupId = string;
export type MembershipRole = "admin" | "member";

export const userSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const authIdentitySchema = z.object({
  userId: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  roles: z.array(z.string()),
});
export type AuthIdentity = z.infer<typeof authIdentitySchema>;

export const adminUserSchema = userSummarySchema.extend({
  status: z.string(),
  superAdmin: z.boolean(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const institutionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cnpj: z.string().nullable().optional(),
  status: z.string().optional(),
});
export type Institution = z.infer<typeof institutionSchema>;

export const institutionSummarySchema = institutionSchema;
export type InstitutionSummary = z.infer<typeof institutionSummarySchema>;

export const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  institutionId: z.string(),
  status: z.string(),
});
export type Student = z.infer<typeof studentSchema>;

export const groupSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  institutionName: z.string(),
  name: z.string(),
});
export type GroupSummary = z.infer<typeof groupSchema>;

export const groupMembershipSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  role: z.enum(["admin", "member"]),
});
export type GroupMembership = z.infer<typeof groupMembershipSchema>;

export type GroupCandidate = UserSummary;
