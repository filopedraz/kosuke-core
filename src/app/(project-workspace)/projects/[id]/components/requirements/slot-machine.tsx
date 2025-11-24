'use client';

import { Button } from '@/components/ui/button';
import { Minus, Play, Plus, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SYMBOLS = ['7', 'BAR', '⭐', '💎', '🔔', '🍒', '🍋'] as const;
const INITIAL_CREDITS = 1000;
const BET_AMOUNTS = [10, 25, 50, 100];

type Symbol = (typeof SYMBOLS)[number];

interface SlotStats {
  totalSpins: number;
  totalWins: number;
  totalWinnings: number;
  biggestWin: number;
  highScore: number;
}

const PAYOUT_TABLE: Record<Symbol, number> = {
  '7': 100,
  BAR: 50,
  '⭐': 25,
  '💎': 15,
  '🔔': 10,
  '🍒': 5,
  '🍋': 3,
};

// Symbol weights for realistic slot machine odds
const SYMBOL_WEIGHTS: Record<Symbol, number> = {
  '7': 1, // Rarest
  BAR: 2,
  '⭐': 3,
  '💎': 4,
  '🔔': 5,
  '🍒': 6,
  '🍋': 8, // Most common
};

export default function SlotMachine() {
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [betAmount, setBetAmount] = useState(BET_AMOUNTS[0]);
  const [reels, setReels] = useState<[Symbol, Symbol, Symbol]>(['🍒', '🍋', '💎']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<SlotStats>({
    totalSpins: 0,
    totalWins: 0,
    totalWinnings: 0,
    biggestWin: 0,
    highScore: INITIAL_CREDITS,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const spinningRef = useRef(false);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Play sound effect using Web Audio API
  const playSound = useCallback((type: 'spin' | 'win' | 'lose') => {
    if (!soundEnabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'spin') {
      oscillator.frequency.value = 200;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } else if (type === 'win') {
      // Ascending arpeggio for win
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } else if (type === 'lose') {
      oscillator.frequency.value = 150;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    }
  }, [soundEnabled]);

  // Weighted random symbol selection
  const getRandomSymbol = useCallback((): Symbol => {
    const weightedSymbols: Symbol[] = [];
    SYMBOLS.forEach(symbol => {
      const weight = SYMBOL_WEIGHTS[symbol];
      for (let i = 0; i < weight; i++) {
        weightedSymbols.push(symbol);
      }
    });
    return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
  }, []);

  // Check for winning combination
  const checkWin = useCallback((spinReels: [Symbol, Symbol, Symbol]): number => {
    if (spinReels[0] === spinReels[1] && spinReels[1] === spinReels[2]) {
      return PAYOUT_TABLE[spinReels[0]] * betAmount;
    }
    return 0;
  }, [betAmount]);

  // Spin the reels
  const spin = useCallback(async () => {
    if (isSpinning || credits < betAmount || spinningRef.current) return;

    spinningRef.current = true;
    setIsSpinning(true);
    setLastWin(0);
    setCredits(prev => prev - betAmount);

    playSound('spin');

    // Animate reels spinning
    const spinDuration = 2000;
    const spinInterval = 50;
    const spinSteps = spinDuration / spinInterval;
    let currentStep = 0;

    const spinAnimation = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
      currentStep++;

      if (currentStep >= spinSteps) {
        clearInterval(spinAnimation);

        // Final result
        const finalReels: [Symbol, Symbol, Symbol] = [
          getRandomSymbol(),
          getRandomSymbol(),
          getRandomSymbol(),
        ];
        setReels(finalReels);

        // Check for win
        const winAmount = checkWin(finalReels);
        setLastWin(winAmount);

        if (winAmount > 0) {
          setCredits(prev => {
            const newCredits = prev + winAmount;
            setStats(prevStats => ({
              ...prevStats,
              totalSpins: prevStats.totalSpins + 1,
              totalWins: prevStats.totalWins + 1,
              totalWinnings: prevStats.totalWinnings + winAmount,
              biggestWin: Math.max(prevStats.biggestWin, winAmount),
              highScore: Math.max(prevStats.highScore, newCredits),
            }));
            return newCredits;
          });
          playSound('win');
        } else {
          setStats(prevStats => ({
            ...prevStats,
            totalSpins: prevStats.totalSpins + 1,
          }));
          playSound('lose');
        }

        setIsSpinning(false);
        spinningRef.current = false;
      }
    }, spinInterval);
  }, [isSpinning, credits, betAmount, playSound, getRandomSymbol, checkWin]);

  // Reset game
  const resetGame = () => {
    setCredits(INITIAL_CREDITS);
    setBetAmount(BET_AMOUNTS[0]);
    setReels(['🍒', '🍋', '💎']);
    setLastWin(0);
    setStats({
      totalSpins: 0,
      totalWins: 0,
      totalWinnings: 0,
      biggestWin: 0,
      highScore: INITIAL_CREDITS,
    });
  };

  // Handle bet amount changes
  const increaseBet = () => {
    const currentIndex = BET_AMOUNTS.indexOf(betAmount);
    if (currentIndex < BET_AMOUNTS.length - 1) {
      setBetAmount(BET_AMOUNTS[currentIndex + 1]);
    }
  };

  const decreaseBet = () => {
    const currentIndex = BET_AMOUNTS.indexOf(betAmount);
    if (currentIndex > 0) {
      setBetAmount(BET_AMOUNTS[currentIndex - 1]);
    }
  };

  // Handle spacebar to spin
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isSpinning && credits >= betAmount) {
        e.preventDefault();
        spin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSpinning, credits, betAmount, spin]);

  const winRate = stats.totalSpins > 0 ? ((stats.totalWins / stats.totalSpins) * 100).toFixed(1) : '0.0';
  const isOutOfCredits = credits < BET_AMOUNTS[0];

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center h-full gap-8 p-8">
      {/* Main Game Area */}
      <div className="flex flex-col items-center gap-8 flex-1">
        {/* Header Info */}
        <div className="flex items-center justify-between w-full max-w-2xl">
          <div className="text-sm space-y-1">
            <div className="font-semibold text-lg">
              Credits: <span className="text-primary">{credits}</span>
            </div>
            <div className="text-muted-foreground">High Score: {stats.highScore}</div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button onClick={resetGame} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Slot Machine */}
        <div className="relative bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 rounded-2xl p-8 shadow-2xl">
          {/* Reels Container */}
          <div className="flex gap-4 mb-8">
            {reels.map((symbol, index) => (
              <div
                key={index}
                className={`reel-container relative w-32 h-40 bg-gradient-to-b from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-4 border-purple-500/50 rounded-xl shadow-inner overflow-hidden ${
                  isSpinning ? 'spinning' : ''
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`reel-symbol text-6xl font-bold transition-all duration-300 ${
                      isSpinning ? 'blur-sm' : ''
                    } ${lastWin > 0 ? 'winning-symbol' : ''}`}
                  >
                    {symbol}
                  </div>
                </div>

                {/* Reel glow effect */}
                {lastWin > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          {/* Win Display */}
          {lastWin > 0 && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold px-6 py-2 rounded-full shadow-lg animate-bounce">
              WIN! +{lastWin} Credits!
            </div>
          )}

          {/* Out of Credits Overlay */}
          {isOutOfCredits && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Out of Credits!</h3>
                <Button onClick={resetGame} size="lg">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {/* Bet Amount */}
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-semibold">Bet Amount:</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={decreaseBet}
                size="sm"
                variant="outline"
                disabled={isSpinning || betAmount === BET_AMOUNTS[0]}
                className="h-9 w-9 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-20 text-center font-bold text-lg">{betAmount}</div>
              <Button
                onClick={increaseBet}
                size="sm"
                variant="outline"
                disabled={isSpinning || betAmount === BET_AMOUNTS[BET_AMOUNTS.length - 1]}
                className="h-9 w-9 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Spin Button */}
          <Button
            onClick={spin}
            disabled={isSpinning || credits < betAmount}
            size="lg"
            className="w-full text-lg font-bold h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isSpinning ? (
              'SPINNING...'
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                SPIN ({betAmount} Credits)
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">Press Spacebar to spin</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total Spins</div>
            <div className="text-lg font-bold">{stats.totalSpins}</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
            <div className="text-lg font-bold">{winRate}%</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total Won</div>
            <div className="text-lg font-bold text-green-500">+{stats.totalWinnings}</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Biggest Win</div>
            <div className="text-lg font-bold text-yellow-500">{stats.biggestWin}</div>
          </div>
        </div>
      </div>

      {/* Payout Table - Right Side */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="sticky top-8">
          <h4 className="text-sm font-semibold mb-4 text-center">Payout Table</h4>
          <div className="flex flex-col gap-3">
            {Object.entries(PAYOUT_TABLE)
              .sort((a, b) => b[1] - a[1])
              .map(([symbol, multiplier]) => (
                <div
                  key={symbol}
                  className="flex items-center justify-between bg-card border-2 rounded-lg px-4 py-3 hover:border-purple-500/50 transition-colors"
                >
                  <span className="text-2xl">
                    {symbol} {symbol} {symbol}
                  </span>
                  <span className="font-bold text-xl text-primary">{multiplier}x</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-blur {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-100%);
          }
        }

        .reel-container.spinning .reel-symbol {
          animation: spin-blur 0.1s linear infinite;
        }

        .winning-symbol {
          animation: pulse-glow 0.5s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(234, 179, 8, 0.8));
        }

        @keyframes pulse-glow {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

