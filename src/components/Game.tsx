import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '@/game/config';

const Game = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [instanceKey, setInstanceKey] = useState(0);

  // Ensure the Phaser game fully restarts on hot updates (otherwise you can keep seeing an old build)
  useEffect(() => {
    if (import.meta.hot) {
      const dispose = () => setInstanceKey((k) => k + 1);
      import.meta.hot.accept(dispose);
    }
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      // Always destroy any existing instance before creating a new one
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      gameRef.current = new Phaser.Game({
        ...GAME_CONFIG,
        parent: containerRef.current,
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [instanceKey]);

  return (
    <div
      key={instanceKey}
      ref={containerRef}
      id="game-container"
      className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden moroccan-border shadow-2xl"
    />
  );
};

export default Game;
