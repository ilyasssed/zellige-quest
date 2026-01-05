import { ChevronLeft, ChevronRight, ArrowUp, Target } from 'lucide-react';

interface MobileControlsProps {
  onLeftPress: () => void;
  onLeftRelease: () => void;
  onRightPress: () => void;
  onRightRelease: () => void;
  onJump: () => void;
  onAttack: () => void;
}

const MobileControls = ({
  onLeftPress,
  onLeftRelease,
  onRightPress,
  onRightRelease,
  onJump,
  onAttack,
}: MobileControlsProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-between items-end pointer-events-none md:hidden">
      {/* Left controls - Movement */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          onTouchStart={onLeftPress}
          onTouchEnd={onLeftRelease}
          onMouseDown={onLeftPress}
          onMouseUp={onLeftRelease}
          className="w-16 h-16 rounded-full bg-moroccan-maroon/80 backdrop-blur flex items-center justify-center text-moroccan-cream active:scale-95 transition-transform border-2 border-moroccan-gold"
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onTouchStart={onRightPress}
          onTouchEnd={onRightRelease}
          onMouseDown={onRightPress}
          onMouseUp={onRightRelease}
          className="w-16 h-16 rounded-full bg-moroccan-maroon/80 backdrop-blur flex items-center justify-center text-moroccan-cream active:scale-95 transition-transform border-2 border-moroccan-gold"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Right controls - Actions */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          onTouchStart={onAttack}
          onClick={onAttack}
          className="w-14 h-14 rounded-full bg-moroccan-teal/80 backdrop-blur flex items-center justify-center text-moroccan-cream active:scale-95 transition-transform border-2 border-moroccan-gold"
        >
          <Target size={24} />
        </button>
        <button
          onTouchStart={onJump}
          onClick={onJump}
          className="w-16 h-16 rounded-full bg-moroccan-gold/90 backdrop-blur flex items-center justify-center text-moroccan-maroon active:scale-95 transition-transform border-2 border-moroccan-maroon"
        >
          <ArrowUp size={32} />
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
