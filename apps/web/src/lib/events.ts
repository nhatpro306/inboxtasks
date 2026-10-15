import { useEffect } from "react";

export type AppEvent =
  | { type: "tasks:changed" }
  | { type: "suggestions:changed" };

export type EventType = AppEvent["type"];
export type EventCallback = () => void;

class AppEventBus extends EventTarget {
  emit(type: EventType) {
    this.dispatchEvent(new CustomEvent(type));
  }
  on(type: EventType, cb: EventCallback) {
    this.addEventListener(type, cb);
    return () => this.removeEventListener(type, cb);
  }
}

export const appEvents = new AppEventBus();

export function useAppEventListener(type: EventType, callback: EventCallback) {
  useEffect(() => {
    return appEvents.on(type, callback);
  }, [type, callback]);
}
