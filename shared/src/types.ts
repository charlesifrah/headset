export type PerceptionMode = 'garden' | 'fire';

export type RoomStatus = 'waiting' | 'playing' | 'ended';

export type HiddenScore = {
  totalReduction: number;
};

export type PlayerState = {
  id: string;
  socketId: string;
  role: PerceptionMode;
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  isActing: boolean;
  score: HiddenScore;
};

export type ZoneState = {
  id: string;
  x: number;
  y: number;
  instability: number;
};

export type Room = {
  id: string;
  status: RoomStatus;
  createdAt: number;
  roundEndsAt: number | null;
  players: PlayerState[];
  zones: ZoneState[];
};

// Lean per-player view sent in live snapshots. Deliberately excludes `role` and
// `socketId`: broadcasting `role` would let a player inspect the reveal twist
// (which worldview their partner has) via devtools mid-game. `score` is kept
// because the in-game HUD shows it, translated into the viewer's own worldview.
export type SnapshotPlayer = {
  id: string;
  x: number;
  y: number;
  isActing: boolean;
  score: HiddenScore;
};

// Lean zone view sent in live snapshots — just what the client renders.
export type SnapshotZone = {
  id: string;
  x: number;
  y: number;
  instability: number;
};

// State snapshot sent to clients each broadcast tick
export type StateSnapshot = {
  players: SnapshotPlayer[];
  zones: SnapshotZone[];
  roundEndsAt: number | null;
  serverTime: number;
};

export type RoundEndPayload = {
  players: PlayerState[];
  zones: ZoneState[];
  duration: number;
};

export type RevealPayload = {
  gardenPlayer: {
    id: string;
    score: HiddenScore;
  };
  firePlayer: {
    id: string;
    score: HiddenScore;
  };
  zones: ZoneState[];
};

// --- Socket event types ---

export interface ClientToServerEvents {
  create_room: () => void;
  join_room: (roomCode: string) => void;
  player_ready: () => void;
  input_move: (data: { x: number; y: number }) => void;
  input_action_start: (data: { aimX: number; aimY: number }) => void;
  input_action_stop: () => void;
  request_reveal: () => void;
}

export interface ServerToClientEvents {
  room_created: (data: { roomId: string; playerId: string; role: PerceptionMode; partnerPresent: boolean }) => void;
  room_joined: (data: { roomId: string; playerId: string; role: PerceptionMode; partnerPresent: boolean }) => void;
  player_joined: (data: { playerId: string }) => void;
  partner_ready: (data: { playerId: string }) => void;
  match_countdown: (data: { seconds: number }) => void;
  match_start: (data: { roundEndsAt: number; serverTime: number }) => void;
  state_snapshot: (data: StateSnapshot) => void;
  event_feed: (data: { messageKey: string; zoneId: string; playerId: string }) => void;
  round_end: (data: RoundEndPayload) => void;
  reveal_payload: (data: RevealPayload) => void;
  error: (data: { message: string }) => void;
}
