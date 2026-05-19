export enum MessageStatus {
  SENDING = "sending",
  SENT = "sent",
  ERROR = "error",
  PENDING = "pending",
  STREAMING = "streaming",
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: MessageStatus;
  pinned?: boolean;
  isStreaming?: boolean;
  streamingText?: string;
  isRegenerating?: boolean;
  mood?: any; // will be refined later
  createdAt?: number;
  imageUri?: string;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  initialLoading: boolean;
  refreshing: boolean;
  error: string | null;
}

export type ChatAction =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: { id: string; updates: Partial<Message> } }
  | { type: "REMOVE_MESSAGE"; payload: string }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_INITIAL_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };