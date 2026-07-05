export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type ScoreEvent = {
  id: number;
  type: "rose" | "gift" | "manual" | "reset" | "system";
  giftName: string;
  sender: string;
  quantity: number;
  delta: number;
  scoreAfter: number;
  at: number;
};

export type StateSnapshot = {
  username: string;
  score: number;
  rosePoints: number;
  giftPoints: number;
  roseCount: number;
  giftCount: number;
  status: ConnectionStatus;
  statusMessage: string;
  roomId: string;
  viewerCount: number;
  likeCount: number;
};
