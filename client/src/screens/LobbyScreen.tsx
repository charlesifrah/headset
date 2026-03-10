import { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { GameContext } from '../App';

type Props = {
  onJoined: (ctx: GameContext) => void;
  onDev: () => void;
};

export function LobbyScreen({ onJoined, onDev }: Props) {
  const [mode, setMode] = useState<'idle' | 'creating' | 'joining'>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onCreated = (data: { roomId: string; playerId: string; role: 'garden' | 'fire' }) => {
      onJoined({ roomId: data.roomId, playerId: data.playerId, role: data.role });
    };
    const onJoinedRoom = (data: { roomId: string; playerId: string; role: 'garden' | 'fire' }) => {
      onJoined({ roomId: data.roomId, playerId: data.playerId, role: data.role });
    };
    const onError = (data: { message: string }) => {
      setError(data.message);
      setMode('idle');
    };

    socket.on('room_created', onCreated);
    socket.on('room_joined', onJoinedRoom);
    socket.on('error', onError);

    return () => {
      socket.off('room_created', onCreated);
      socket.off('room_joined', onJoinedRoom);
      socket.off('error', onError);
    };
  }, [onJoined]);

  const handleCreate = () => {
    setError('');
    setMode('creating');
    socket.emit('create_room');
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setError('');
    setMode('joining');
    socket.emit('join_room', roomCode.trim().toUpperCase());
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>headset.life</h1>
      <p style={styles.subtitle}>A game of shared consequences</p>

      <div style={styles.actions}>
        <button
          style={styles.button}
          onClick={handleCreate}
          disabled={mode !== 'idle'}
        >
          {mode === 'creating' ? 'Creating...' : 'Create Game'}
        </button>

        <div style={styles.divider}>or</div>

        <div style={styles.joinRow}>
          <input
            style={styles.input}
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            style={styles.button}
            onClick={handleJoin}
            disabled={mode !== 'idle' || !roomCode.trim()}
          >
            {mode === 'joining' ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button style={styles.devBtn} onClick={onDev}>Dev Preview</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 700,
    letterSpacing: -1,
    background: 'linear-gradient(135deg, #4ade80, #f97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 32,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 320,
  },
  button: {
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    borderRadius: 12,
    background: '#334155',
    color: '#eee',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s',
  },
  divider: {
    opacity: 0.4,
    fontSize: 14,
  },
  joinRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 4,
    textAlign: 'center' as const,
    border: '2px solid #334155',
    borderRadius: 12,
    background: 'transparent',
    color: '#eee',
    outline: 'none',
  },
  error: {
    color: '#f87171',
    fontSize: 14,
    marginTop: 8,
  },
  devBtn: {
    position: 'fixed' as const,
    bottom: 16,
    right: 16,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.35)',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
};
