import { useEffect, useRef, useState } from 'react';
import type { GameContext } from '../App';
import type { RoundEndPayload, StateSnapshot } from '@shared-field/shared';
import { socket } from '../socket';
import { createPhaserGame } from '../game/PhaserGame';
import { GameHUD } from './GameHUD';
import { ZoneCanvas } from './ZoneCanvas';

type Props = {
  gameCtx: GameContext;
  onRoundEnd: (data: RoundEndPayload) => void;
};

export function GameScreen({ gameCtx, onRoundEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<Phaser.Game | null>(null);
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    const game = createPhaserGame(containerRef.current, gameCtx);
    gameRef.current = game;
    return () => { game.destroy(true); gameRef.current = null; };
  }, [gameCtx]);

  useEffect(() => {
    const onSnapshot   = (data: StateSnapshot)    => setSnapshot(data);
    const onRoundEndEvt = (data: RoundEndPayload) => onRoundEnd(data);
    socket.on('state_snapshot', onSnapshot);
    socket.on('round_end', onRoundEndEvt);
    return () => {
      socket.off('state_snapshot', onSnapshot);
      socket.off('round_end', onRoundEndEvt);
    };
  }, [onRoundEnd]);

  return (
    <div style={styles.wrapper}>
      {/* Phaser: solid background + zone circles + players */}
      <div ref={containerRef} style={styles.gameContainer} />

      {/* Transparent canvas on top: only flame/flower decorations */}
      <ZoneCanvas mode={gameCtx.role} zones={snapshot?.zones ?? []} />

      <GameHUD gameCtx={gameCtx} snapshot={snapshot} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  gameContainer: {
    position: 'absolute',
    inset: 0,
  },
};
