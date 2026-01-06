/**
 * Level Generator - Simple Random Platform Placement
 * 
 * Generates 5 random platforms distributed across the level.
 */

import { SeededRandom } from "./SeededRandom";

export interface PlatformData {
  x: number;
  y: number;
  width: number;
  level: number; // 0, 1, or 2 (Level 1, 2, 3)
}

interface LevelConfig {
  levelWidth: number;
  groundY: number;
  levelYs: number[];
  platformHeight: number;
  step: number;
  maxJumpHeight: number;
  maxHorizontalJump: number;
  minPlatforms?: number;
  maxPlatforms?: number;
  seed?: number;
}

export class LevelGenerator {
  private config: LevelConfig;
  private platforms: PlatformData[] = [];
  private rng: SeededRandom;

  constructor(config: LevelConfig) {
    this.config = config;
    this.rng = new SeededRandom(config.seed ?? 12345);
  }

  generate(): PlatformData[] {
    this.platforms = [];

    // Generate exactly 5 random platforms spread across the level
    this.generateRandomPlatforms();

    return this.platforms;
  }

  private generateRandomPlatforms(): void {
    const { levelWidth, levelYs } = this.config;
    const platformCount = 5;
    
    // Divide level into 5 sections for even distribution
    const sectionWidth = (levelWidth - 400) / platformCount;
    
    for (let i = 0; i < platformCount; i++) {
      // Random X within this section
      const sectionStart = 200 + i * sectionWidth;
      const x = sectionStart + this.rng.random() * (sectionWidth - 100);
      
      // Random level (0, 1, or 2)
      const level = this.rng.randomInt(0, 2);
      const y = levelYs[level];
      
      // Random width (1-3 tiles)
      const width = 64 * (1 + Math.floor(this.rng.random() * 3));
      
      this.platforms.push({ x, y, width, level });
    }

    // Sort by X position
    this.platforms.sort((a, b) => a.x - b.x);
  }
}
