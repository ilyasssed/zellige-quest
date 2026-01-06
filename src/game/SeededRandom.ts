/**
 * Seeded Random Number Generator
 * Uses a simple mulberry32 algorithm for reproducible random sequences.
 * Change the seed to get different spawn patterns.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number = 12345) {
    this.state = seed;
  }

  /**
   * Reset the generator with a new seed
   */
  setSeed(seed: number): void {
    this.state = seed;
  }

  /**
   * Get the current seed
   */
  getSeed(): number {
    return this.state;
  }

  /**
   * Generate a random float between 0 and 1
   */
  random(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random integer between min (inclusive) and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random float between min and max
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Shuffle an array in place
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Default game seed - change this value to get different spawn patterns
export const GAME_SEED = 42;
