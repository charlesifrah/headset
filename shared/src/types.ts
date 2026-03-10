export type PerceptionMode = 'garden' | 'fire';

export type RoomStatus = 'waiting' | 'playing' | 'ended';

export type HiddenScore = {
  totalReduction: number;
  criticalSaves: number;
  actionTimeMs: number;
  chainPreventions: number;
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

export type ZoneContributor = {
  playerId: string;
  contribution: number;
  timestamp: number;
};

export type ZoneState = {
  id: string;
  x: number;
  y: number;
  instability: number;
  lastContributors: ZoneContributor[];
};

export type Room = {
  id: string;
  status: RoomStatus;
  createdAt: number;
  roundEndsAt: number | null;
  players: PlayerState[];
  zones: ZoneState[];
};

// State snapshot sent to clients each broadcast tick
export type StateSnapshot = {
  players: PlayerState[];
  zones: ZoneState[];
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
  mappings: { gardenLabel: string; fireLabel: string; value: number }[];
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
  room_created: (data: { roomId: string; playerId: string; role: PerceptionMode }) => void;
  room_joined: (data: { roomId: string; playerId: string; role: PerceptionMode }) => void;
  player_joined: (data: { playerId: string }) => void;
  match_countdown: (data: { seconds: number }) => void;
  match_start: (data: { roundEndsAt: number; serverTime: number }) => void;
  state_snapshot: (data: StateSnapshot) => void;
  event_feed: (data: { messageKey: string; zoneId: string; playerId: string }) => void;
  round_end: (data: RoundEndPayload) => void;
  reveal_payload: (data: RevealPayload) => void;
  error: (data: { message: string }) => void;
}
