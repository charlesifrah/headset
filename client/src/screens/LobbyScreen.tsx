import { useState, useEffect, useMemo } from 'react';
import { socket } from '../socket';
import type { GameContext } from '../App';
import { FieldPreview } from './FieldPreview';

type Props = {
  onJoined: (ctx: GameContext) => void;
  onDev: () => void;
};

const STEPS = [
  { icon: '❗', title: 'Zones need you', text: 'Watch for the warning marks.' },
  { icon: '🏃', title: 'Rush in & hold', text: 'Calm them before they spread.' },
  { icon: '🤝', title: 'Team up', text: '75 seconds to keep the field alive.' },
];

export function LobbyScreen({ onJoined }: Props) {
  const [mode, setMode] = useState<'idle' | 'creating' | 'joining'>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  // Drifting motes: ambiguous enough to read as pollen or embers.
  const motes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 8,
        duration: 9 + Math.random() * 10,
        delay: -Math.random() * 18,
        drift: (Math.random() - 0.5) * 120,
        hueDelay: -Math.random() * 8,
      })),
    [],
  );

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onCreated = (data: { roomId: string; playerId: string; role: 'garden' | 'fire'; partnerPresent: boolean }) => {
      onJoined({
        roomId: data.roomId,
        playerId: data.playerId,
        role: data.role,
        initialPartnerPresent: data.partnerPresent,
      });
    };
    const onJoinedRoom = (data: { roomId: string; playerId: string; role: 'garden' | 'fire'; partnerPresent: boolean }) => {
      onJoined({
        roomId: data.roomId,
        playerId: data.playerId,
        role: data.role,
        initialPartnerPresent: data.partnerPresent,
      });
    };
    const onError = (data: { message: string }) => {
      setError(data.message);
      setMode('idle');
    };

    socket.on('room_created', onCreated);
    socket.on('room_joined', onJoinedRoom);
    socket.on('error', onError);

    // Auto-join when arriving via ?room=XXXX invite link
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('room')?.toUpperCase();
    if (incoming) {
      setRoomCode(incoming);
      setMode('joining');
      // Strip the param so a refresh after disconnect doesn't loop-rejoin
      window.history.replaceState({}, '', window.location.pathname);
      const tryJoin = () => socket.emit('join_room', incoming);
      if (socket.connected) tryJoin();
      else socket.once('connect', tryJoin);
    }

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
    <div className="lobby">
      <style>{css}</style>

      <div className="lobby-glow" aria-hidden />
      <div className="lobby-motes" aria-hidden>
        {motes.map((m) => (
          <span
            key={m.id}
            className="mote"
            style={{
              left: `${m.left}%`,
              width: m.size,
              height: m.size,
              animationDuration: `${m.duration}s, 8s`,
              animationDelay: `${m.delay}s, ${m.hueDelay}s`,
              ['--drift' as string]: `${m.drift}px`,
            }}
          />
        ))}
      </div>

      <main className="lobby-content">
        <div className="hero">
        <div className="intro">
          <div className="badge">2 players · 75 seconds · 1 big twist</div>

          <h1 className="title">headset.life</h1>

          <p className="tagline">
            You and a friend. Same field. Same clock.
            <br />
            <strong>But are you really playing the same game?</strong>
          </p>
        </div>

        <div className="preview">
          <FieldPreview />
        </div>

        <div className="actions">
          <button className="play-btn" onClick={handleCreate} disabled={mode !== 'idle'}>
            {mode === 'creating' ? 'Setting up…' : mode === 'joining' ? 'Joining…' : '▶  Play Now'}
          </button>

          {!showJoin ? (
            <button className="link-btn" onClick={() => setShowJoin(true)} disabled={mode !== 'idle'}>
              Got a room code from a friend?
            </button>
          ) : (
            <div className="join-row">
              <input
                className="code-input"
                placeholder="CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <button
                className="join-btn"
                onClick={handleJoin}
                disabled={mode !== 'idle' || !roomCode.trim()}
              >
                Join
              </button>
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </div>
        </div>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step" style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
              <span className="step-icon">{s.icon}</span>
              <span className="step-title">{s.title}</span>
              <span className="step-text">{s.text}</span>
            </li>
          ))}
        </ol>

        <p className="footnote">Free · No download · You'll get a link to invite a friend</p>
      </main>
    </div>
  );
}

const css = `
  .lobby {
    position: relative;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    background: radial-gradient(ellipse at 50% 120%, #1f2a1c 0%, #151a2e 45%, #0b0f19 100%);
  }

  .lobby-glow {
    position: fixed;
    inset: -20%;
    background:
      radial-gradient(circle at 30% 40%, rgba(74, 222, 128, 0.18), transparent 40%),
      radial-gradient(circle at 70% 60%, rgba(249, 115, 22, 0.18), transparent 40%);
    animation: swirl 18s ease-in-out infinite alternate;
    pointer-events: none;
  }

  .lobby-motes { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
  .mote {
    position: absolute;
    bottom: -20px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 12px 2px currentColor;
    color: #4ade80;
    opacity: 0;
    animation-name: rise, hue;
    animation-timing-function: linear, ease-in-out;
    animation-iteration-count: infinite, infinite;
    animation-direction: normal, alternate;
  }

  .lobby-content {
    position: relative;
    z-index: 1;
    min-height: 100%;
    max-width: 1040px;
    margin: 0 auto;
    padding: 40px 16px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    text-align: center;
  }

  .hero {
    width: 100%;
    max-width: 560px;
    display: grid;
    grid-template-areas: 'intro' 'preview' 'actions';
    justify-items: center;
    gap: 22px;
  }
  .intro { grid-area: intro; display: flex; flex-direction: column; align-items: center; gap: 22px; }
  .preview {
    grid-area: preview;
    width: 100%;
    max-width: 440px;
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 6px rgba(255, 255, 255, 0.03);
    animation: fadeUp 0.6s 0.25s ease both;
  }
  .actions { grid-area: actions; }

  @media (min-width: 900px) {
    .hero {
      max-width: none;
      grid-template-columns: 1fr 1fr;
      grid-template-areas: 'intro preview' 'actions preview';
      align-items: center;
      column-gap: 56px;
      row-gap: 28px;
    }
    .hero .intro { align-items: flex-start; text-align: left; align-self: end; }
    .hero .actions { align-items: flex-start; justify-self: start; align-self: start; }
    .hero .preview { max-width: 480px; transform: rotate(1.5deg); }
    .lobby .steps { max-width: 720px; }
  }

  .badge {
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.8);
    animation: fadeUp 0.6s ease both;
  }

  .title {
    font-size: clamp(48px, 13vw, 84px);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    background: linear-gradient(100deg, #4ade80, #facc15, #f97316, #facc15, #4ade80);
    background-size: 300% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 6px 24px rgba(250, 204, 21, 0.25));
    animation: fadeUp 0.6s 0.1s ease both, shimmer 8s linear infinite;
  }

  .tagline {
    font-size: clamp(17px, 4.4vw, 21px);
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.72);
    animation: fadeUp 0.6s 0.2s ease both;
  }
  .tagline strong { color: #fff; font-weight: 600; }

  .actions {
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-top: 6px;
    animation: fadeUp 0.6s 0.3s ease both;
  }

  .play-btn {
    width: 100%;
    padding: 20px 32px;
    font-family: inherit;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #10140f;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    background: linear-gradient(135deg, #4ade80 0%, #facc15 55%, #f97316 100%);
    box-shadow: 0 6px 0 #a16207, 0 14px 40px rgba(250, 204, 21, 0.35);
    transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.2s;
    animation: pulse 2.2s ease-in-out 1.2s infinite;
  }
  .play-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-2px); }
  .play-btn:active:not(:disabled) { transform: translateY(5px); box-shadow: 0 1px 0 #a16207, 0 6px 20px rgba(250, 204, 21, 0.3); }
  .play-btn:disabled { cursor: default; animation: none; filter: saturate(0.6) brightness(0.85); }

  .link-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
    padding: 6px;
  }
  .link-btn:hover:not(:disabled) { color: #fff; }

  .join-row { display: flex; gap: 8px; width: 100%; animation: fadeUp 0.3s ease both; }
  .code-input {
    flex: 1;
    min-width: 0;
    padding: 14px 12px;
    font-family: inherit;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 8px;
    text-align: center;
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-radius: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  .code-input:focus { border-color: #facc15; }
  .code-input::placeholder { color: rgba(255, 255, 255, 0.25); }
  .join-btn {
    padding: 0 24px;
    font-family: inherit;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-radius: 14px;
    cursor: pointer;
  }
  .join-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.2); }
  .join-btn:disabled { opacity: 0.45; cursor: default; }

  .error {
    color: #fca5a5;
    background: rgba(248, 113, 113, 0.12);
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 14px;
  }

  .steps {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    margin-top: 18px;
  }
  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 8px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    animation: fadeUp 0.5s ease both;
  }
  .step-icon { font-size: 26px; margin-bottom: 2px; }
  .step-title { font-size: 15px; font-weight: 600; color: #fff; }
  .step-text { font-size: 13px; color: rgba(255, 255, 255, 0.55); line-height: 1.3; }

  .footnote { font-size: 12px; color: rgba(255, 255, 255, 0.35); }

  @media (max-width: 420px) {
    .steps { grid-template-columns: 1fr; }
    .step { flex-direction: row; gap: 10px; padding: 10px 14px; text-align: left; }
    .step-icon { font-size: 22px; margin: 0; }
    .step-title { white-space: nowrap; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: 0% center; }
    100% { background-position: 300% center; }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 6px 0 #a16207, 0 14px 40px rgba(250, 204, 21, 0.35); }
    50% { box-shadow: 0 6px 0 #a16207, 0 14px 60px rgba(250, 204, 21, 0.6); }
  }
  @keyframes swirl {
    from { transform: rotate(0deg) scale(1); }
    to { transform: rotate(25deg) scale(1.1); }
  }
  @keyframes rise {
    0% { transform: translate(0, 0); opacity: 0; }
    10% { opacity: 0.5; }
    85% { opacity: 0.3; }
    100% { transform: translate(var(--drift), -110vh); opacity: 0; }
  }
  @keyframes hue {
    from { background: #4ade80; color: #4ade80; }
    to { background: #fb923c; color: #fb923c; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lobby *, .lobby-glow { animation: none !important; }
    .mote { display: none; }
  }
`;
