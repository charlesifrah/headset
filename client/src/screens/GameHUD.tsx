import type { GameContext } from '../App';
import type { StateSnapshot } from '@shared-field/shared';
import { INSTABILITY_MAX } from '@shared-field/shared';
import { getRoleName } from '../perception/perceptionMapper';
import { translateScore } from '../perception/uiTranslator';

type Props = {
  gameCtx: GameContext;
  snapshot: StateSnapshot | null;
};

export function GameHUD({ gameCtx, snapshot }: Props) {
  if (!snapshot) return null;

  const me = snapshot.players.find((p) => p.id === gameCtx.playerId);
  const partner = snapshot.players.find((p) => p.id !== gameCtx.playerId);

  const timeLeft = snapshot.roundEndsAt
    ? Math.max(0, Math.ceil((snapshot.roundEndsAt - snapshot.serverTime) / 1000))
    : 0;

  const totalInstability = snapshot.zones.reduce((sum, z) => sum + z.instability, 0);
  const maxTotal = snapshot.zones.length * INSTABILITY_MAX;
  const healthPct = Math.round(((maxTotal - totalInstability) / maxTotal) * 100);

  const healthColor =
    healthPct > 70 ? '#4ade80' :
    healthPct > 40 ? '#fbbf24' :
    '#ef4444';

  const isGarden = gameCtx.role === 'garden';
  const myScore = me ? translateScore(me.score, gameCtx.role) : null;
  const partnerScore = partner ? translateScore(partner.score, gameCtx.role) : null;

  const roleIcon = isGarden ? '\u{1F331}' : '\u{1F692}';

  return (
    <div style={styles.overlay}>
      {/* Top bar: role + timer + health */}
      <div style={styles.topBar}>
        <div style={styles.roleChip}>
          <span style={styles.roleIcon}>{roleIcon}</span>
          {getRoleName(gameCtx.role)}
        </div>

        <div style={styles.timerWrap}>
          <span style={{
            ...styles.timer,
            color: timeLeft <= 10 ? '#ef4444' : '#fbbf24',
          }}>
            {timeLeft}s
          </span>
        </div>

        <div style={styles.healthChip}>
          <span style={styles.healthLabel}>Field</span>
          <div style={styles.healthBarBg}>
            <div style={{
              ...styles.healthBarFill,
              width: `${healthPct}%`,
              background: healthColor,
            }} />
          </div>
          <span style={{ ...styles.healthPct, color: healthColor }}>{healthPct}%</span>
        </div>
      </div>

      {/* Score panel */}
      <div style={styles.scorePanel}>
        <div style={styles.scorePanelInner}>
          <div style={styles.scoreHeader}>Your Score</div>
          {myScore && myScore.all.map((s) => (
            <div key={s.label} style={styles.scoreLine}>
              <span style={styles.scoreLineLabel}>{s.label}</span>
              <span style={styles.scoreLineValue}>{s.value}</span>
            </div>
          ))}
        </div>

        {partnerScore && (
          <div style={{ ...styles.scorePanelInner, opacity: 0.6 }}>
            <div style={styles.scoreHeader}>Partner</div>
            {partnerScore.all.map((s) => (
              <div key={s.label} style={styles.scoreLine}>
                <span style={styles.scoreLineLabel}>{s.label}</span>
                <span style={styles.scoreLineValue}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px 0',
  },
  roleChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    background: '#0f172add',
    padding: '4px 10px',
    borderRadius: 16,
  },
  roleIcon: {
    fontSize: 14,
  },
  timerWrap: {
    textAlign: 'center' as const,
  },
  timer: {
    fontSize: 24,
    fontWeight: 700,
  },
  healthChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#0f172add',
    padding: '4px 10px',
    borderRadius: 16,
  },
  healthLabel: {
    fontSize: 10,
    opacity: 0.5,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  healthBarBg: {
    width: 60,
    height: 5,
    background: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s, background 0.3s',
  },
  healthPct: {
    fontSize: 11,
    fontWeight: 600,
    minWidth: 28,
    textAlign: 'right' as const,
  },
  scorePanel: {
    display: 'flex',
    gap: 6,
    padding: '0 12px',
  },
  scorePanelInner: {
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172acc',
    borderRadius: 10,
    padding: '6px 10px',
    gap: 2,
    minWidth: 130,
  },
  scoreHeader: {
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    opacity: 0.4,
    marginBottom: 1,
  },
  scoreLine: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },
  scoreLineLabel: {
    fontSize: 11,
    opacity: 0.65,
  },
  scoreLineValue: {
    fontSize: 11,
    fontWeight: 700,
  },
};
