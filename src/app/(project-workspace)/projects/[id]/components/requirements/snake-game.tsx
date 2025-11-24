'use client';

import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const GRID_SIZE = 30;
const CELL_SIZE = 18;
const INITIAL_SPEED = 150;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Generate random food position
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    directionRef.current = 'RIGHT';
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    setGameStarted(true);
  }, [generateFood]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver || isPaused) return;

      const key = e.key;
      const currentDirection = directionRef.current;

      if (key === 'ArrowUp' && currentDirection !== 'DOWN') {
        directionRef.current = 'UP';
      } else if (key === 'ArrowDown' && currentDirection !== 'UP') {
        directionRef.current = 'DOWN';
      } else if (key === 'ArrowLeft' && currentDirection !== 'RIGHT') {
        directionRef.current = 'LEFT';
      } else if (key === 'ArrowRight' && currentDirection !== 'LEFT') {
        directionRef.current = 'RIGHT';
      } else if (key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver, isPaused]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = { ...head };

        // Move head based on direction
        switch (directionRef.current) {
          case 'UP':
            newHead.y -= 1;
            break;
          case 'DOWN':
            newHead.y += 1;
            break;
          case 'LEFT':
            newHead.x -= 1;
            break;
          case 'RIGHT':
            newHead.x += 1;
            break;
        }

        // Wrap around walls (appear on opposite side)
        if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
        if (newHead.x >= GRID_SIZE) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
        if (newHead.y >= GRID_SIZE) newHead.y = 0;

        // Check self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(prev => prev + 10);
          setFood(generateFood(newSnake));
          return newSnake;
        }

        // Remove tail if no food eaten
        newSnake.pop();
        return newSnake;
      });
    }, INITIAL_SPEED);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameStarted, gameOver, isPaused, food, generateFood]);

  // Draw game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Modern arcade colors with vibrant neon aesthetics
    const isDarkMode = document.documentElement.classList.contains('dark');
    const backgroundColor = isDarkMode ? '#0f0f23' : '#f8fafc';
    const gridColor = isDarkMode ? '#1e293b' : '#cbd5e1';
    const snakeColor = '#10b981'; // Vibrant emerald
    const snakeHeadColor = '#06d6a0'; // Bright cyan-green
    const snakeShadowColor = '#059669'; // Deep emerald
    const foodColor = '#ff006e'; // Hot pink
    const foodGlowColor = '#ff4d8f'; // Pink glow

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake with modern styling
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;
      const size = CELL_SIZE - 3;
      const radius = 4;

      if (index === 0) {
        // Head with gradient and glow
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, snakeHeadColor);
        gradient.addColorStop(1, snakeColor);
        ctx.fillStyle = gradient;
      } else {
        // Body segments with subtle gradient
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, snakeColor);
        gradient.addColorStop(1, snakeShadowColor);
        ctx.fillStyle = gradient;
      }

      // Rounded rectangles for modern look
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, size, size, radius);
      ctx.fill();

      // Add subtle inner glow for head
      if (index === 0) {
        ctx.strokeStyle = snakeHeadColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw food with glow effect
    const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
    const foodRadius = CELL_SIZE / 2 - 2;

    // Outer glow
    const glowGradient = ctx.createRadialGradient(foodX, foodY, foodRadius * 0.3, foodX, foodY, foodRadius * 1.5);
    glowGradient.addColorStop(0, foodColor + '80');
    glowGradient.addColorStop(0.5, foodGlowColor + '40');
    glowGradient.addColorStop(1, foodGlowColor + '00');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius * 1.5, 0, 2 * Math.PI);
    ctx.fill();

    // Main food circle
    const foodGradient = ctx.createRadialGradient(
      foodX - foodRadius * 0.3,
      foodY - foodRadius * 0.3,
      0,
      foodX,
      foodY,
      foodRadius
    );
    foodGradient.addColorStop(0, foodGlowColor);
    foodGradient.addColorStop(1, foodColor);
    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, 2 * Math.PI);
    ctx.fill();
  }, [snake, food]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      {/* Game Info */}
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="text-sm">
          <span className="font-semibold">Score:</span> {score}
        </div>
        <div className="flex gap-2">
          {!gameStarted ? (
            <Button onClick={resetGame} size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start Game
            </Button>
          ) : (
            <>
              <Button onClick={() => setIsPaused(!isPaused)} size="sm" variant="outline">
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button onClick={resetGame} size="sm" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="border-2 border-border rounded-lg"
        />

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Game Over!</h3>
              <p className="text-muted-foreground mb-4">Final Score: {score}</p>
              <Button onClick={resetGame}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {isPaused && !gameOver && gameStarted && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Paused</h3>
              <p className="text-sm text-muted-foreground">Press Space or Resume to continue</p>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {!gameStarted && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Snake Game</h3>
              <p className="text-sm text-muted-foreground mb-4">Click Start Game to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Use arrow keys to move • Space to pause • Walls wrap around • Eat the pink food to grow!</p>
      </div>
    </div>
  );
}

