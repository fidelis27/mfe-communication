import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatch, listen, useListen } from "./bus";

type BusTestState = {
  listeners: Map<string, Set<(payload: unknown) => void>>;
  queues: Map<string, unknown[]>;
};

function busState(): BusTestState | undefined {
  return (globalThis as typeof globalThis & { __mfeBus?: BusTestState }).__mfeBus;
}

describe("shared event bus", () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, "__mfeBus");
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "__mfeBus");
  });

  it("delivers immediately and buffers before a listener exists", () => {
    const handler = vi.fn();

    dispatch("student", "evt:navigate", { path: "/instituicoes" });
    expect(busState()?.queues.get("student:evt:navigate")).toHaveLength(1);

    const unsubscribe = listen("student", "evt:navigate", handler);
    expect(handler).toHaveBeenCalledWith({ path: "/instituicoes" });
    unsubscribe();
  });

  it("removes queued events after the first listener receives them", () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    dispatch("student", "evt:navigate", { path: "/instituicoes" });

    const unsubscribe = listen("student", "evt:navigate", firstListener);
    expect(firstListener).toHaveBeenCalledTimes(1);
    unsubscribe();

    const unsubscribeAgain = listen("student", "evt:navigate", secondListener);
    expect(secondListener).not.toHaveBeenCalled();
    unsubscribeAgain();
  });

  it("fans out an event to every listener without buffering it", () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    const unsubscribeFirst = listen("student", "evt:navigate", firstListener);
    const unsubscribeSecond = listen("student", "evt:navigate", secondListener);

    dispatch("student", "evt:navigate", { path: "/instituicoes" });

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(busState()?.queues.get("student:evt:navigate")).toBeUndefined();
    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("drops expired messages and respects the queue cap", () => {
    dispatch(
      "domain",
      "STUDENT_CREATED",
      { id: "a", name: "Ana", institutionId: "institution-1", status: "active" },
      { ttl: 5 },
    );
    dispatch(
      "domain",
      "STUDENT_CREATED",
      { id: "b", name: "Bia", institutionId: "institution-1", status: "active" },
      { ttl: 5 },
    );

    const received: Array<{ id: string }> = [];
    const unsubscribe = listen("domain", "STUDENT_CREATED", (payload) => received.push(payload));
    expect(received.map(({ id }) => id)).toEqual(["a", "b"]);

    for (let index = 0; index < 110; index += 1) {
      dispatch("domain", "STUDENT_CREATED", {
        id: `item-${index}`,
        name: `Student ${index}`,
        institutionId: "institution-1",
        status: "active",
      });
    }

    const queue = busState()?.queues.get("domain:STUDENT_CREATED") ?? [];
    expect(queue.length).toBeLessThanOrEqual(100);

    unsubscribe();
  });

  it("uses a singleton bus and clears listeners on unmount", () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const firstUnsubscribe = listen("host", "cmd:navigate", firstListener);
    const secondUnsubscribe = listen("host", "cmd:navigate", secondListener);

    dispatch("host", "cmd:navigate", { path: "/admin" });
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);

    firstUnsubscribe();
    secondUnsubscribe();

    expect(busState()?.listeners.get("host:cmd:navigate")?.size).toBeUndefined();
  });

  it("runs the hook cleanup when the component unmounts", () => {
    const remove = vi.fn();
    const listener = vi.fn();

    const { unmount } = renderHook(({ moduleId, channel }) => {
      useListen(moduleId, channel, listener);
      return { remove: () => remove() };
    }, {
      initialProps: { moduleId: "demo", channel: "evt:navigate" as const },
    });

    act(() => {
      dispatch("demo", "evt:navigate", { path: "/dashboard" });
    });
    expect(listener).toHaveBeenCalledWith({ path: "/dashboard" });

    unmount();
    act(() => {
      dispatch("demo", "evt:navigate", { path: "/dashboard" });
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
