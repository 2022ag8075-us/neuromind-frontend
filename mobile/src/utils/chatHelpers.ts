export const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;
export const PINNED_KEY = "@pinned_messages";
export const OFFLINE_QUEUE_KEY = "@offline_queue";