import { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { GameContext } from '../App';
import { AvatarCanvas } from './AvatarCanvas';

type Props = {
  gameCtx: GameContext;
  onMatchStart: () => void;
};

export function WaitingRoom({ gameCtx, onMatchStart }: Props) {
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const onPlayerJoined = () => setPartnerConnected(true);
    const onCountdown = (data: { seconds: number }) => setCountdown(data.seconds);
    const onStart = () => onMatchStart();

    socket.on('player_joined', onPlayerJoined);
    socket.on('match_countdown', onCountdown);
    socket.on('match_start', onStart);

    socket.emit('player_ready');

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('match_countdown', onCountdown);
      socket.off('match_start', onStart);
    };
  }, [onMatchStart]);

  const isGarden = gameCtx.role === 'garden';
  const accentColor = isGarden ? '#4ade80' : '#f97316';

  return (
    <div style={styles.container}>
      {!partnerConnected ? (
        <>
          <h2 style={styles.heading}>Waiting for Partner</h2>
          <div style={styles.codeBox}>
            <span style={styles.codeLabel}>Room Code</span>
            <span style={styles.code}>{gameCtx.roomId}</span>
          </div>
          <div style={styles.statusRow}>
            <div style={{ ...styles.dot, background: '#4ade80' }} />
            <span>You — connected</span>
          </div>
          <div style={styles.statusRow}>
            <div style={{ ...styles.dot, background: '#475569' }} />
            <span>Partner — waiting...</span>
          </div>
          <p style={styles.hint}>Share the room code with a friend to start</p>
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
          ) : (
            <p style={styles.readyText}>Get ready...</p>
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
    marginBottom: 8,
  },
  codeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#1e293b',
    padding: '16px 32px',
    borderRadius: 12,
    gap: 4,
  },
  codeLabel: {
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    opacity: 0.5,
  },
  code: {
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: 8,
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
  hint: {
    fontSize: 13,
    opacity: 0.4,
    marginTop: 16,
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
  readyText: {
    fontSize: 16,
    opacity: 0.4,
    fontStyle: 'italic',
    marginTop: 8,
  },
};
