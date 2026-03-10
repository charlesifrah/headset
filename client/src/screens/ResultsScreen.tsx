import { useEffect, useState } from 'react';
import type { GameContext } from '../App';
import type { RoundEndPayload, RevealPayload } from '@shared-field/shared';
import { socket } from '../socket';
import { translateScore } from '../perception/uiTranslator';
import { getRoleName } from '../perception/perceptionMapper';

type Props = {
  gameCtx: GameContext;
  data: RoundEndPayload;
  onReveal: (data: RevealPayload) => void;
};

export function ResultsScreen({ gameCtx, data, onReveal }: Props) {
  const [showScores, setShowScores] = useState(false);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    const onRevealPayload = (payload: RevealPayload) => onReveal(payload);
    socket.on('reveal_payload', onRevealPayload);

    const t1 = setTimeout(() => setShowScores(true), 600);
    const t2 = setTimeout(() => setShowBtn(true), 1800);

    return () => {
      socket.off('reveal_payload', onRevealPayload);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onReveal]);

  const me = data.players.find((p) => p.id === gameCtx.playerId);
  const partner = data.players.find((p) => p.id !== gameCtx.playerId);
  const myScore = me ? translateScore(me.score, gameCtx.role) : null;
  const partnerScore = partner ? translateScore(partner.score, gameCtx.role) : null;
  const isGarden = gameCtx.role === 'garden';
  const roleIcon = isGarden ? '\u{1F331}' : '\u{1F692}';

  const handleReveal = () => {
    socket.emit('request_reveal');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>{roleIcon}</span>
        <h2 style={styles.heading}>Round Complete</h2>
        <span style={{
          ...styles.roleTag,
          color: isGarden ? '#4ade80' : '#f97316',
        }}>
          {getRoleName(gameCtx.role)}
        </span>
      </div>

      <div style={{
        ...styles.scores,
        opacity: showScores ? 1 : 0,
        transform: showScores ? 'translateY(0)' : 'translateY(20px)',
      }}>
        {myScore && (
          <div style={{
            ...styles.card,
            borderColor: isGarden ? '#4ade8040' : '#f9731640',
          }}>
            <span style={styles.cardLabel}>Your Performance</span>
            {myScore.all.map((s) => (
              <div key={s.label} style={styles.stat}>
                <span style={styles.statLabel}>{s.label}</span>
                <span style={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
        {partnerScore && (
          <div style={{ ...styles.card, borderColor: '#a78bfa40' }}>
            <span style={styles.cardLabel}>Partner</span>
            {partnerScore.all.map((s) => (
              <div key={s.label} style={styles.stat}>
                <span style={styles.statLabel}>{s.label}</span>
                <span style={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        ...styles.revealSection,
        opacity: showBtn ? 1 : 0,
        transform: showBtn ? 'translateY(0)' : 'translateY(16px)',
      }}>
        <p style={styles.tease}>
          But what was your partner <em>really</em> doing?
        </p>
        <button style={styles.revealBtn} onClick={handleReveal}>
          Reveal the Truth
        </button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
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
    gap: 20,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 40,
  },
  heading: {
    fontSize: 30,
    fontWeight: 700,
    margin: 0,
  },
  roleTag: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  scores: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
    transition: 'all 0.8s ease',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    background: '#1e293b',
    borderRadius: 14,
    padding: '18px 22px',
    minWidth: 190,
    gap: 8,
    border: '1px solid',
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    opacity: 0.4,
    marginBottom: 2,
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.65,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 700,
  },
  revealSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    transition: 'all 0.8s ease',
  },
  tease: {
    fontSize: 15,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  revealBtn: {
    padding: '16px 48px',
    fontSize: 18,
    fontWeight: 700,
    border: 'none',
    borderRadius: 14,
    color: '#111',
    cursor: 'pointer',
    background: 'linear-gradient(90deg, #4ade80, #fbbf24, #f97316, #4ade80)',
    backgroundSize: '200% auto',
    animation: 'shimmer 3s linear infinite',
  },
};
