import { useState, useCallback } from 'react';
import type { PerceptionMode, RoundEndPayload, RevealPayload } from '@shared-field/shared';
import { LobbyScreen } from './screens/LobbyScreen';
import { WaitingRoom } from './screens/WaitingRoom';
import { GameScreen } from './screens/GameScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { RevealScreen } from './screens/RevealScreen';
import { DevPreview } from './screens/DevPreview';

export type Screen = 'lobby' | 'waiting' | 'game' | 'results' | 'reveal' | 'dev';

export type GameContext = {
  roomId: string;
  playerId: string;
  role: PerceptionMode;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameCtx, setGameCtx] = useState<GameContext | null>(null);
  const [roundEndData, setRoundEndData] = useState<RoundEndPayload | null>(null);
  const [revealData, setRevealData] = useState<RevealPayload | null>(null);

  const handleJoined = useCallback((ctx: GameContext) => {
    setGameCtx(ctx);
    setScreen('waiting');
  }, []);

  const handleMatchStart = useCallback(() => {
    setScreen('game');
  }, []);

  const handleRoundEnd = useCallback((data: RoundEndPayload) => {
    setRoundEndData(data);
    setScreen('results');
  }, []);

  const handleReveal = useCallback((data: RevealPayload) => {
    setRevealData(data);
    setScreen('reveal');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameCtx(null);
    setRoundEndData(null);
    setRevealData(null);
    setScreen('lobby');
  }, []);

  switch (screen) {
    case 'dev':
      return <DevPreview onBack={() => setScreen('lobby')} />;
    case 'lobby':
      return <LobbyScreen onJoined={handleJoined} onDev={() => setScreen('dev')} />;
    case 'waiting':
      return <WaitingRoom gameCtx={gameCtx!} onMatchStart={handleMatchStart} />;
    case 'game':
      return (
        <GameScreen
          gameCtx={gameCtx!}
          onRoundEnd={handleRoundEnd}
        />
      );
    case 'results':
      return (
        <ResultsScreen
          gameCtx={gameCtx!}
          data={roundEndData!}
          onReveal={handleReveal}
        />
      );
    case 'reveal':
      return (
        <RevealScreen
          gameCtx={gameCtx!}
          data={revealData!}
          onPlayAgain={handlePlayAgain}
        />
      );
  }
}
