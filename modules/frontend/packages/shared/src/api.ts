import { z } from "zod";
import { authenticatedFetch } from "./auth";

export type ApiErrorKind = "http" | "network" | "invalid_json" | "invalid_response";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly backendMessage?: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      kind: ApiErrorKind;
      status?: number;
      backendMessage?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.backendMessage = options.backendMessage;
    this.cause = options.cause;
  }
}

export async function requestJson<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  options: RequestInit = {},
  fallbackMessage = "Não foi possível concluir a solicitação.",
): Promise<z.output<TSchema>> {
  const response = await fetchResponse(url, options, fallbackMessage);
  if (!response.ok) {
    throw await createHttpError(response, fallbackMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new ApiError("O servidor retornou uma resposta JSON inválida.", {
      kind: "invalid_json",
      status: response.status,
      cause: error,
    });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("A resposta do servidor não corresponde ao formato esperado.", {
      kind: "invalid_response",
      status: response.status,
      cause: parsed.error,
    });
  }

  return parsed.data;
}

export async function requestVoid(
  url: string,
  options: RequestInit = {},
  fallbackMessage = "Não foi possível concluir a solicitação.",
): Promise<void> {
  const response = await fetchResponse(url, options, fallbackMessage);
  if (!response.ok) {
    throw await createHttpError(response, fallbackMessage);
  }
}

async function fetchResponse(
  url: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<Response> {
  try {
    return await authenticatedFetch(url, options);
  } catch (error) {
    if (isAbortError(error)) throw error;

    throw new ApiError(fallbackMessage, {
      kind: "network",
      cause: error,
    });
  }
}

async function createHttpError(response: Response, fallbackMessage: string): Promise<ApiError> {
  const backendMessage = await readBackendMessage(response);
  const message = getFriendlyMessage(response.status, backendMessage, fallbackMessage);

  return new ApiError(message, {
    kind: "http",
    status: response.status,
    backendMessage,
  });
}

async function readBackendMessage(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;

    const payload = body as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    return undefined;
  } catch {
    return undefined;
  }
}

function getFriendlyMessage(
  status: number,
  backendMessage: string | undefined,
  fallbackMessage: string,
): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "O recurso solicitado não foi encontrado.";
  if (status === 429) return "Muitas solicitações. Aguarde um momento e tente novamente.";
  if (status >= 500) return "O serviço está temporariamente indisponível. Tente novamente.";
  return backendMessage ?? fallbackMessage;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
