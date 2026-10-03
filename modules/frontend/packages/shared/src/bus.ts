import { useEffect, useRef } from "react";
import type { DomainConnection } from "./events";
import type { EventPayloadMap } from "./events";

export type BusChannelMap = {
  "cmd:navigate": { path: string; moduleId?: string };
  "evt:navigate": { path: string; moduleId?: string };
  "domain:connection": DomainConnection;
};

type ChannelName = keyof BusChannelMap | keyof EventPayloadMap;
type BusListener = (payload: unknown) => void;
type QueuedBusEvent = {
  payload: unknown;
  expiresAt: number;
};

type MfeBusState = {
  listeners: Map<string, Set<BusListener>>;
  queues: Map<string, QueuedBusEvent[]>;
};

type GlobalMfeBus = typeof globalThis & {
  __mfeBus?: MfeBusState;
};

function getBus(): MfeBusState {
  const globalState = globalThis as GlobalMfeBus;
  if (!globalState.__mfeBus) {
    globalState.__mfeBus = { listeners: new Map(), queues: new Map() };
  }
  return globalState.__mfeBus;
}

function channelKey(moduleId: string, channel: string) {
  return `${moduleId}:${channel}`;
}

function drainQueue(moduleId: string, channel: string, listeners: Set<BusListener>) {
  const bus = getBus();
  const key = channelKey(moduleId, channel);
  const queue = bus.queues.get(key) ?? [];
  bus.queues.delete(key);
  const now = Date.now();

  for (const item of queue) {
    if (item.expiresAt <= now) continue;
    for (const listener of listeners) listener(item.payload);
  }
}

export function dispatch<TChannel extends ChannelName>(
  moduleId: string,
  channel: TChannel,
  payload: TChannel extends keyof EventPayloadMap
    ? EventPayloadMap[TChannel]
    : TChannel extends keyof BusChannelMap
      ? BusChannelMap[TChannel]
      : unknown,
  options: { ttl?: number } = {},
): void {
  const bus = getBus();
  const key = channelKey(moduleId, String(channel));
  const listeners = bus.listeners.get(key);

  if (listeners && listeners.size > 0) {
    for (const listener of listeners) listener(payload);
    return;
  }

  const queue = bus.queues.get(key) ?? [];
  const ttl = options.ttl ?? 10000;
  const entry: QueuedBusEvent = { payload, expiresAt: Date.now() + ttl };

  if (queue.length >= 100) queue.shift();
  queue.push(entry);
  bus.queues.set(key, queue);
}

export function listen<TChannel extends ChannelName>(
  moduleId: string,
  channel: TChannel,
  handler: (payload: TChannel extends keyof EventPayloadMap
    ? EventPayloadMap[TChannel]
    : TChannel extends keyof BusChannelMap
      ? BusChannelMap[TChannel]
      : unknown) => void,
): () => void {
  const bus = getBus();
  const key = channelKey(moduleId, String(channel));
  const listeners = bus.listeners.get(key) ?? new Set<BusListener>();
  listeners.add(handler as BusListener);
  bus.listeners.set(key, listeners);
  drainQueue(moduleId, String(channel), listeners);

  return () => {
    const current = bus.listeners.get(key);
    if (!current) return;
    current.delete(handler as BusListener);
    if (current.size === 0) {
      bus.listeners.delete(key);
    }
  };
}

export function useDispatch(moduleId: string) {
  return useRef({
    dispatch: <TChannel extends ChannelName>(channel: TChannel, payload: unknown, options?: { ttl?: number }) =>
      dispatch(moduleId, channel, payload as never, options),
  }).current.dispatch;
}

export function useListen<TChannel extends ChannelName>(
  moduleId: string,
  channel: TChannel,
  handler: (payload: TChannel extends keyof EventPayloadMap
    ? EventPayloadMap[TChannel]
    : TChannel extends keyof BusChannelMap
      ? BusChannelMap[TChannel]
      : unknown) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return listen(moduleId, channel, (payload) => {
      handlerRef.current(payload as never);
    });
  }, [channel, moduleId]);
}
