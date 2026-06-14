import { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { GameContext } from '../App';
import { AvatarCanvas } from './AvatarCanvas';

type Props = {
  gameCtx: GameContext;
  onMatchStart: () => void;
};

export function WaitingRoom({ gameCtx, onMatchStart }: Props) {
  const [partnerConnected, setPartnerConnected] = useState(gameCtx.initialPartnerPresent);
  const [iAmReady, setIAmReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState<'url' | 'code' | null>(null);

  // The inviter created the room and was alone at first. The invitee joined
  // into an already-populated room. Only the invitee presses Play; the inviter
  // is implicitly ready (server-side) and just waits.
  const isInviter = !gameCtx.initialPartnerPresent;

  useEffect(() => {
    const onPlayerJoined = (data: { playerId: string }) => {
      if (data.playerId !== gameCtx.playerId) setPartnerConnected(true);
    };
    const onCountdown = (data: { seconds: number }) => setCountdown(data.seconds);
    const onStart = () => onMatchStart();

    socket.on('player_joined', onPlayerJoined);
    socket.on('match_countdown', onCountdown);
    socket.on('match_start', onStart);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('match_countdown', onCountdown);
      socket.off('match_start', onStart);
    };
  }, [onMatchStart, gameCtx.playerId]);

  const handlePlay = () => {
    if (iAmReady) return;
    setIAmReady(true);
    socket.emit('player_ready');
  };

  const isGarden = gameCtx.role === 'garden';
  const accentColor = isGarden ? '#4ade80' : '#f97316';

  const inviteUrl = `${window.location.origin}/?room=${gameCtx.roomId}`;

  const copy = async (text: string, kind: 'url' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
    } catch {
      // Clipboard write can fail (e.g. insecure context); surface a manual select fallback.
      setCopied(null);
    }
  };

  return (
    <div style={styles.container}>
      {!partnerConnected ? (
        <>
          <h2 style={styles.heading}>Invite a Friend</h2>
          <p style={styles.subHeading}>Send them this link — or share the code</p>

          <div style={styles.inviteCard}>
            <div style={styles.urlRow}>
              <span style={styles.urlText} title={inviteUrl}>{inviteUrl}</span>
              <button
                style={{
                  ...styles.copyBtn,
                  background: copied === 'url' ? '#4ade80' : '#334155',
                  color: copied === 'url' ? '#0b0f19' : '#eee',
                }}
                onClick={() => copy(inviteUrl, 'url')}
              >
                {copied === 'url' ? 'Copied' : 'Copy Link'}
              </button>
            </div>

            <div style={styles.orDivider}>
              <span style={styles.orLine} />
              <span style={styles.orLabel}>or share code</span>
              <span style={styles.orLine} />
            </div>

            <button
              style={styles.codeButton}
              onClick={() => copy(gameCtx.roomId, 'code')}
              title="Click to copy"
            >
              <span style={styles.codeLabel}>Room Code</span>
              <span style={styles.code}>{gameCtx.roomId}</span>
              <span style={{
                ...styles.codeCopiedTag,
                opacity: copied === 'code' ? 1 : 0,
              }}>
                Copied
              </span>
            </button>
          </div>

          <div style={styles.statusBlock}>
            <div style={styles.statusRow}>
              <div style={{ ...styles.dot, background: '#4ade80' }} />
              <span>You — connected</span>
            </div>
            <div style={styles.statusRow}>
              <div style={{ ...styles.dot, background: '#475569' }} />
              <span>Partner — waiting...</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Rules briefing */}
          <div style={styles.avatarSection}>
            <AvatarCanvas mode={gameCtx.role} isLocal={true} size={96} />
          </div>

          <h2 style={{ ...styles.roleTitle, color: accentColor }}>
            {isGarden ? 'Garden Keeper' : 'Fire Fighter'}
          </h2>

          <div style={{
            ...styles.rulesCard,
            borderColor: accentColor + '40',
          }}>
            <p style={styles.ruleIntro}>
              {isGarden
                ? 'You see a garden. Your partner sees something else entirely.'
                : 'You see fires. Your partner sees something else entirely.'}
            </p>

            <div style={styles.rulesList}>
              <div style={styles.rule}>
                <span style={{ ...styles.ruleIcon, color: accentColor }}>
                  {isGarden ? '\u{1F331}' : '\u{1F525}'}
                </span>
                <span style={styles.ruleText}>
                  {isGarden
                    ? 'Zones are garden patches. When they turn brown, they need water.'
                    : 'Zones are fire sectors. When they glow red, they need spraying.'}
                </span>
              </div>

              <div style={styles.rule}>
                <span style={{ ...styles.ruleIcon, color: accentColor }}>{'\u{1F3AF}'}</span>
                <span style={styles.ruleText}>
                  Move close to a zone and <strong>click & hold</strong> to {isGarden ? 'water' : 'spray'} it.
                </span>
              </div>

              <div style={styles.rule}>
                <span style={{ ...styles.ruleIcon, color: accentColor }}>{'\u{26A0}\u{FE0F}'}</span>
                <span style={styles.ruleText}>
                  If a zone stays critical too long, it <strong>spreads</strong> to neighbors — causing a chain reaction.
                </span>
              </div>

              <div style={styles.rule}>
                <span style={{ ...styles.ruleIcon, color: accentColor }}>{'\u{1F91D}'}</span>
                <span style={styles.ruleText}>
                  Your partner is helping too — in their own way. Work together to keep the field stable.
                </span>
              </div>

              <div style={styles.rule}>
                <span style={{ ...styles.ruleIcon, color: accentColor }}>{'\u{2728}'}</span>
                <span style={styles.ruleText}>
                  After the round, you'll discover what your partner <em>really</em> saw.
                </span>
              </div>
            </div>
          </div>

          <div style={styles.controlsRow}>
            <div style={styles.controlItem}>
              <span style={styles.controlKey}>Mouse</span>
              <span style={styles.controlDesc}>Move character</span>
            </div>
            <div style={styles.controlItem}>
              <span style={styles.controlKey}>Click & Hold</span>
              <span style={styles.controlDesc}>{isGarden ? 'Water zone' : 'Spray zone'}</span>
            </div>
            <div style={styles.controlItem}>
              <span style={styles.controlKey}>WASD</span>
              <span style={styles.controlDesc}>Keyboard move</span>
            </div>
          </div>

          {countdown !== null ? (
            <p style={styles.countdown}>Starting in {countdown}...</p>
          ) : isInviter ? (
            <div style={styles.playSection}>
              <p style={styles.playStatus}>Waiting for partner to press Play...</p>
            </div>
          ) : (
            <div style={styles.playSection}>
              <button
                style={{
                  ...styles.playBtn,
                  background: iAmReady
                    ? '#334155'
                    : `linear-gradient(90deg, ${accentColor}, #fbbf24)`,
                  color: iAmReady ? '#cbd5e1' : '#0b0f19',
                  cursor: iAmReady ? 'default' : 'pointer',
                }}
                onClick={handlePlay}
                disabled={iAmReady}
              >
                {iAmReady ? 'Ready' : 'Play'}
              </button>
              <p style={styles.playStatus}>
                {iAmReady ? 'Starting...' : 'Read the rules, then press Play when ready'}
              </p>
            </div>
          )}
        </>
      )}
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
    gap: 12,
    overflow: 'auto',
  },
  heading: {
    fontSize: 28,
    fontWeight: 600,
    margin: 0,
  },
  subHeading: {
    fontSize: 14,
    opacity: 0.5,
    margin: 0,
    marginBottom: 4,
  },
  inviteCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    background: '#1e293b',
    padding: 18,
    borderRadius: 14,
    gap: 14,
    width: '100%',
    maxWidth: 460,
  },
  urlRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
  },
  urlText: {
    flex: 1,
    background: '#0f172a',
    padding: '12px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#cbd5e1',
    border: '1px solid #334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
  },
  copyBtn: {
    padding: '0 18px',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
    whiteSpace: 'nowrap' as const,
    letterSpacing: 0.5,
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.08)',
  },
  orLabel: {
    fontSize: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    opacity: 0.4,
  },
  codeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#0f172a',
    padding: '14px 32px',
    borderRadius: 10,
    gap: 4,
    cursor: 'pointer',
    border: '1px solid #334155',
    transition: 'border-color 0.2s, background 0.2s',
    position: 'relative',
    color: '#eee',
  },
  codeLabel: {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    opacity: 0.5,
  },
  code: {
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: 8,
  },
  codeCopiedTag: {
    position: 'absolute' as const,
    top: 6,
    right: 10,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: '#4ade80',
    transition: 'opacity 0.2s',
  },
  statusBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 8,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },

  // --- Rules briefing ---
  avatarSection: {
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: 1,
  },
  rulesCard: {
    background: '#1e293b',
    borderRadius: 16,
    border: '1px solid',
    padding: '18px 22px',
    maxWidth: 460,
    width: '100%',
  },
  ruleIntro: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
    margin: '0 0 14px 0',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  rule: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleIcon: {
    fontSize: 18,
    flexShrink: 0,
    width: 24,
    textAlign: 'center' as const,
  },
  ruleText: {
    fontSize: 13,
    lineHeight: 1.5,
    opacity: 0.8,
  },

  // --- Controls ---
  controlsRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  controlItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  controlKey: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    background: '#334155',
    padding: '4px 10px',
    borderRadius: 6,
  },
  controlDesc: {
    fontSize: 11,
    opacity: 0.5,
  },

  countdown: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fbbf24',
    marginTop: 8,
  },
  playSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  playBtn: {
    padding: '14px 56px',
    fontSize: 18,
    fontWeight: 700,
    border: 'none',
    borderRadius: 12,
    letterSpacing: 1,
    transition: 'background 0.2s, color 0.2s',
  },
  playStatus: {
    fontSize: 13,
    opacity: 0.55,
    margin: 0,
    fontStyle: 'italic',
    textAlign: 'center' as const,
  },
};
