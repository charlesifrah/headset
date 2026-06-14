import { memo } from 'react';
import type { GameContext } from '../App';
import type { PerceptionMode, StateSnapshot } from '@shared-field/shared';
import { INSTABILITY_MAX } from '@shared-field/shared';
import { getRoleName } from '../perception/perceptionMapper';
import { translateScore } from '../perception/uiTranslator';

type ScoreLine = { label: string; value: number | string };

// Pre-derived, display-ready HUD state. Decoupling this from the raw snapshot
// lets GameScreen skip HUD updates when none of the *visible* values changed,
// so the HUD no longer reconciles 6-7×/sec just because positions moved.
export type HudModel = {
  timeLeft: number;
  healthPct: number;
  myScore: ScoreLine[];
  partnerScore: ScoreLine[] | null;
};

export function deriveHud(snapshot: StateSnapshot, gameCtx: GameContext): HudModel {
  const me = snapshot.players.find((p) => p.id === gameCtx.playerId);
  const partner = snapshot.players.find((p) => p.id !== gameCtx.playerId);

  const timeLeft = snapshot.roundEndsAt
    ? Math.max(0, Math.ceil((snapshot.roundEndsAt - snapshot.serverTime) / 1000))
    : 0;

  const totalInstability = snapshot.zones.reduce((sum, z) => sum + z.instability, 0);
  const maxTotal = snapshot.zones.length * INSTABILITY_MAX;
  const healthPct = maxTotal > 0
    ? Math.round(((maxTotal - totalInstability) / maxTotal) * 100)
    : 100;

  return {
    timeLeft,
    healthPct,
    myScore: me ? translateScore(me.score, gameCtx.role).all : [],
    partnerScore: partner ? translateScore(partner.score, gameCtx.role).all : null,
  };
}

function sameScore(a: ScoreLine[] | null, b: ScoreLine[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    // Labels are static per role; only the values change.
    if (a[i].value !== b[i].value) return false;
  }
  return true;
}

// True when two HUD models would render identically — used to hold the previous
// reference so the memoized HUD doesn't re-render.
export function hudEqual(a: HudModel | null, b: HudModel): boolean {
  if (!a) return false;
  return (
    a.timeLeft === b.timeLeft &&
    a.healthPct === b.healthPct &&
    sameScore(a.myScore, b.myScore) &&
    sameScore(a.partnerScore, b.partnerScore)
  );
}

type Props = {
  role: PerceptionMode;
  hud: HudModel | null;
};

function GameHUDComponent({ role, hud }: Props) {
  if (!hud) return null;

  const { timeLeft, healthPct, myScore, partnerScore } = hud;

  const healthColor =
    healthPct > 70 ? '#4ade80' :
    healthPct > 40 ? '#fbbf24' :
    '#ef4444';

  const isGarden = role === 'garden';
  const roleIcon = isGarden ? '\u{1F331}' : '\u{1F692}';

  return (
    <div style={styles.overlay}>
      {/* Top bar: role + timer + health */}
      <div style={styles.topBar}>
        <div style={styles.roleChip}>
          <span style={styles.roleIcon}>{roleIcon}</span>
          {getRoleName(role)}
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
          {myScore.map((s) => (
            <div key={s.label} style={styles.scoreLine}>
              <span style={styles.scoreLineLabel}>{s.label}</span>
              <span style={styles.scoreLineValue}>{s.value}</span>
            </div>
          ))}
        </div>

        {partnerScore && (
          <div style={{ ...styles.scorePanelInner, opacity: 0.6 }}>
            <div style={styles.scoreHeader}>Partner</div>
            {partnerScore.map((s) => (
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

// Memoized: GameScreen feeds a stable `hud` reference (held via hudEqual) and a
// primitive `role`, so this only re-renders when a displayed value changes.
export const GameHUD = memo(GameHUDComponent);

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
