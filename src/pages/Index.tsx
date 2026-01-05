import Game from '@/components/Game';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-game-sky via-moroccan-cream to-moroccan-cream flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Geometric Moroccan patterns */}
        <div className="absolute top-0 left-0 w-64 h-64 opacity-10">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-moroccan-maroon">
            <polygon points="50,0 100,50 50,100 0,50" />
          </svg>
        </div>
        <div className="absolute top-20 right-10 w-32 h-32 opacity-10 animate-spin-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-moroccan-teal">
            <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" />
          </svg>
        </div>
        <div className="absolute bottom-40 left-10 w-24 h-24 opacity-10">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-moroccan-gold">
            <circle cx="50" cy="50" r="45" />
          </svg>
        </div>
      </div>

      {/* Header */}
      <header className="mb-6 text-center z-10">
        <h1 className="font-display text-4xl md:text-6xl text-moroccan-maroon drop-shadow-lg">
          🇲🇦 Moroccan Wedding Run
        </h1>
        <p className="font-body text-lg md:text-xl text-moroccan-terracotta mt-2">
          Collect sweets, drink tea, defeat cockroaches!
        </p>
      </header>

      {/* Game Container */}
      <main className="relative z-10 w-full max-w-4xl">
        <Game />
      </main>

      {/* Footer with controls info */}
      <footer className="mt-6 text-center z-10">
        <div className="bg-card/80 backdrop-blur rounded-lg px-6 py-3 moroccan-border">
          <p className="font-body text-sm text-foreground/80">
            <span className="hidden md:inline">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
              <kbd className="px-2 py-1 bg-muted rounded text-xs mx-1">→</kbd>
              Move |
              <kbd className="px-2 py-1 bg-muted rounded text-xs mx-1">SPACE</kbd>
              Jump |
              <kbd className="px-2 py-1 bg-muted rounded text-xs mx-1">X</kbd>
              Throw Sandals
            </span>
            <span className="md:hidden">
              Touch left/right to move • Swipe up to jump • Tap middle to throw
            </span>
          </p>
        </div>
        <p className="mt-4 font-body text-xs text-muted-foreground">
          A celebration of Moroccan culture 🎊
        </p>
      </footer>
    </div>
  );
};

export default Index;
