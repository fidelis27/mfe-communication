export type ListState = "loading" | "ready" | "empty" | "error";
export type AdminTab = "people" | "groups";

export type Notice = {
  id: number;
  kind: "success" | "error";
  message: string;
};

export type UserFormErrors = Partial<Record<"name" | "email" | "form", string>>;
export type GroupFormErrors = Partial<Record<"institutionId" | "name" | "form", string>>;
export type MemberFormErrors = Partial<Record<"userId" | "role" | "form", string>>;

export type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => Promise<void>;
};
