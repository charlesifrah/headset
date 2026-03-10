import { useState, useEffect, useMemo } from 'react';
import type { GameContext } from '../App';
import type { RevealPayload } from '@shared-field/shared';
import { AvatarCanvas } from './AvatarCanvas';
import { GamePreview } from './GamePreview';

type Props = {
  gameCtx: GameContext;
  data: RevealPayload;
  onPlayAgain: () => void;
};

type Phase = 0 | 1 | 2 | 3 | 4;

const SHOWCASE_INSTABILITIES = [8, 30, 55, 82, 95, 18, 45, 72, 12];

export function RevealScreen({ gameCtx, data, onPlayAgain }: Props) {
  const [phase, setPhase] = useState<Phase>(0);
  const [visibleMappings, setVisibleMappings] = useState(0);

  const isGarden = gameCtx.role === 'garden';

  const showcaseZones = useMemo(
    () => data.zones.map((z, i) => ({
      ...z,
      instability: SHOWCASE_INSTABILITIES[i % SHOWCASE_INSTABILITIES.length],
    })),
    [data.zones],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 800));
    timers.push(setTimeout(() => setPhase(2), 2600));
    timers.push(setTimeout(() => setPhase(3), 4200));
    timers.push(setTimeout(() => {
      setPhase(4);
      data.mappings.forEach((_, i) => {
        timers.push(setTimeout(() => setVisibleMappings(i + 1), 500 * (i + 1)));
      });
    }, 5600));
    return () => timers.forEach(clearTimeout);
  }, [data.mappings]);

  const fmt = (v: number) => Math.round(v);

  const yourMode = isGarden ? 'garden' as const : 'fire' as const;
  const partnerMode = isGarden ? 'fire' as const : 'garden' as const;

  return (
    <div style={styles.page}>
      {/* Background split: full 50/50 game previews */}
      <div style={{
        ...styles.bgSplit,
        opacity: phase >= 1 ? 1 : 0,
      }}>
        <div style={styles.bgHalf}>
          <GamePreview mode={yourMode} zones={showcaseZones} />
          <div style={styles.bgOverlay} />
        </div>
        <div style={styles.bgDivider} />
        <div style={styles.bgHalf}>
          <GamePreview mode={partnerMode} zones={showcaseZones} />
          <div style={styles.bgOverlay} />
        </div>
      </div>

      <div style={styles.content}>
        {/* --- Cards row --- */}
        <div style={styles.cardsRow}>
          {/* Your view */}
          <div style={{
            ...styles.cardWrap,
            opacity: phase >= 0 ? 1 : 0,
            transform: phase >= 0 ? 'translateY(0)' : 'translateY(30px)',
          }}>
            <span style={styles.cardLabel}>You saw</span>
            <div style={{
              ...styles.card,
              borderColor: isGarden ? '#4ade80' : '#f97316',
              background: isGarden
                ? 'linear-gradient(160deg, rgba(5,46,22,0.92), rgba(20,83,45,0.92))'
                : 'linear-gradient(160deg, rgba(28,25,23,0.92), rgba(69,26,3,0.92))',
            }}>
              <div style={styles.avatarWrap}>
                <AvatarCanvas mode={yourMode} isLocal={true} size={72} />
              </div>
              <h3 style={{
                ...styles.viewTitle,
                color: isGarden ? '#4ade80' : '#f97316',
              }}>
                {isGarden ? 'Garden' : 'Fire'} View
              </h3>
              <div style={styles.scoreList}>
                {data.mappings.map((m) => (
                  <div key={m.gardenLabel} style={styles.scoreLine}>
                    <span style={styles.scoreKey}>
                      {isGarden ? m.gardenLabel : m.fireLabel}
                    </span>
                    <span style={styles.scoreVal}>{fmt(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Partner's view */}
          <div style={{
            ...styles.cardWrap,
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(30px)',
          }}>
            <span style={styles.cardLabel}>Partner saw</span>
            <div style={{
              ...styles.card,
              borderColor: !isGarden ? '#4ade80' : '#f97316',
              background: !isGarden
                ? 'linear-gradient(160deg, rgba(5,46,22,0.92), rgba(20,83,45,0.92))'
                : 'linear-gradient(160deg, rgba(28,25,23,0.92), rgba(69,26,3,0.92))',
            }}>
              <div style={styles.avatarWrap}>
                <AvatarCanvas mode={partnerMode} isLocal={false} size={72} />
              </div>
              <h3 style={{
                ...styles.viewTitle,
                color: !isGarden ? '#4ade80' : '#f97316',
              }}>
                {!isGarden ? 'Garden' : 'Fire'} View
              </h3>
              <div style={styles.scoreList}>
                {data.mappings.map((m) => (
                  <div key={m.fireLabel} style={styles.scoreLine}>
                    <span style={styles.scoreKey}>
                      {!isGarden ? m.gardenLabel : m.fireLabel}
                    </span>
                    <span style={styles.scoreVal}>{fmt(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- "Wait..." then "Same Actions" --- */}
        {phase >= 2 && (
          <div style={{
            ...styles.mergeSection,
            opacity: phase >= 2 ? 1 : 0,
          }}>
            <div style={styles.mergeTitle}>
              {phase < 3 ? 'Wait...' : 'Same Actions'}
            </div>
            {phase >= 3 && <div style={styles.dividerLine} />}
          </div>
        )}

        {/* --- Mapping rows --- */}
        {phase >= 4 && (
          <div style={styles.mappingBox}>
            {data.mappings.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.mappingRow,
                  opacity: i < visibleMappings ? 1 : 0,
                  transform: i < visibleMappings
                    ? 'translateY(0) scale(1)'
                    : 'translateY(12px) scale(0.95)',
                }}
              >
                <span style={{ ...styles.mapSide, color: isGarden ? '#4ade80' : '#f97316', textAlign: 'right' as const }}>
                  {isGarden ? m.gardenLabel : m.fireLabel}
                </span>
                <span style={styles.mapValue}>{fmt(m.value)}</span>
                <span style={{ ...styles.mapSide, color: isGarden ? '#f97316' : '#4ade80', textAlign: 'left' as const }}>
                  {isGarden ? m.fireLabel : m.gardenLabel}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* --- Tagline + Play Again --- */}
        {phase >= 4 && visibleMappings >= data.mappings.length && (
          <div style={styles.footer}>
            <p style={styles.tagline}>
              You were acting on the same system, through different realities.
            </p>
            <button style={styles.btn} onClick={onPlayAgain}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'auto',
    background: '#0b0f19',
  },

  // --- Background split game previews ---
  bgSplit: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    transition: 'opacity 1.5s ease',
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgHalf: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bgDivider: {
    width: 2,
    background: 'rgba(255,255,255,0.08)',
    zIndex: 1,
    flexShrink: 0,
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.25)',
    pointerEvents: 'none',
  },

  // --- Foreground content ---
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 20px',
    gap: 24,
    minHeight: '100%',
  },

  cardsRow: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cardWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.4,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '16px 24px 20px',
    borderRadius: 16,
    border: '2px solid',
    minWidth: 200,
    backdropFilter: 'blur(8px)',
  },

  avatarWrap: {
    marginBottom: 2,
  },

  viewTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
  },
  scoreList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    width: '100%',
  },
  scoreLine: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
  },
  scoreKey: {
    fontSize: 12,
    opacity: 0.6,
  },
  scoreVal: {
    fontSize: 12,
    fontWeight: 700,
  },

  // --- Merge section ---
  mergeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    transition: 'opacity 0.6s ease',
  },
  mergeTitle: {
    fontSize: 26,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #4ade80, #fbbf24, #f97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  dividerLine: {
    width: 200,
    height: 2,
    background: 'linear-gradient(90deg, #4ade80, #f97316)',
    borderRadius: 1,
    opacity: 0.5,
  },

  // --- Mappings ---
  mappingBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: 'rgba(15,23,42,0.9)',
    backdropFilter: 'blur(8px)',
    borderRadius: 14,
    padding: '12px 0',
    minWidth: 380,
  },
  mappingRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
    borderBottom: '1px solid rgba(30,41,59,0.4)',
  },
  mapSide: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
  },
  mapValue: {
    width: 56,
    textAlign: 'center' as const,
    fontSize: 18,
    fontWeight: 800,
    flexShrink: 0,
    color: '#fbbf24',
  },

  // --- Footer ---
  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    animation: 'fadeUp 0.8s ease forwards',
  },
  tagline: {
    fontSize: 14,
    opacity: 0.5,
    fontStyle: 'italic',
    textAlign: 'center' as const,
    maxWidth: 380,
    lineHeight: 1.6,
    margin: 0,
  },
  btn: {
    padding: '14px 40px',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    borderRadius: 12,
    color: '#111',
    cursor: 'pointer',
    background: 'linear-gradient(90deg, #4ade80, #fbbf24, #f97316, #4ade80)',
    backgroundSize: '200% auto',
    animation: 'shimmer 3s linear infinite',
  },
};
