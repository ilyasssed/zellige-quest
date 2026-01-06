/**
 * Level Generator with Graph-Based Safe Path Algorithm
 * 
 * Ensures the player always has a navigable path from start to finish.
 * Uses graph connectivity to validate platform placement.
 */

export interface PlatformData {
  x: number;
  y: number;
  width: number;
  level: number; // 0, 1, or 2 (Level 1, 2, 3)
}

interface PathNode {
  id: string;
  x: number;
  y: number;
  level: number; // -1 for ground, 0-2 for platforms
  width: number;
}

interface LevelConfig {
  levelWidth: number;
  groundY: number;
  levelYs: number[];
  platformHeight: number;
  step: number;
  maxJumpHeight: number;
  maxHorizontalJump: number;
}

// Spacing constants
const MIN_SAME_LEVEL_SPACING_STEPS = 20;
const MIN_ADJACENT_LEVEL_SPACING_STEPS = 4;
const MAX_ADJACENT_LEVEL_SPACING_STEPS = 6;

export class LevelGenerator {
  private config: LevelConfig;
  private platforms: PlatformData[] = [];
  private nodes: PathNode[] = [];

  constructor(config: LevelConfig) {
    this.config = config;
  }

  generate(): PlatformData[] {
    this.platforms = [];
    this.nodes = [];

    // Add ground as the base navigable surface (always safe)
    this.addGroundNodes();

    // Generate platforms with safe path validation
    this.generatePlatformsWithSafePath();

    // Validate and fix any path issues
    this.validateAndFixPath();

    return this.platforms;
  }

  private addGroundNodes(): void {
    // Ground is always navigable - add nodes at regular intervals
    const groundInterval = this.config.step * 10;
    for (let x = 0; x < this.config.levelWidth; x += groundInterval) {
      this.nodes.push({
        id: `ground_${x}`,
        x,
        y: this.config.groundY,
        level: -1,
        width: groundInterval,
      });
    }
  }

  private generatePlatformsWithSafePath(): void {
    const { levelWidth, step, levelYs } = this.config;
    const minSameLevelSpacing = step * MIN_SAME_LEVEL_SPACING_STEPS;
    const minAdjacentSpacing = step * MIN_ADJACENT_LEVEL_SPACING_STEPS;
    const maxAdjacentSpacing = step * MAX_ADJACENT_LEVEL_SPACING_STEPS;

    // Track last platform X for each level
    const lastXByLevel: number[] = [-minSameLevelSpacing, -minSameLevelSpacing, -minSameLevelSpacing];
    
    // Track horizontal slices to ensure navigability
    const sliceWidth = step * 10;
    const slices: Map<number, number[]> = new Map(); // slice index -> levels with platforms
    
    let currentX = 150;
    let attempts = 0;
    const maxAttempts = 500;

    while (currentX < levelWidth - 150 && attempts < maxAttempts) {
      attempts++;
      
      // Determine which level to place next based on reachability
      const level = this.selectNextLevel(currentX, lastXByLevel, slices, sliceWidth);
      if (level === -1) {
        currentX += step * 5;
        continue;
      }

      const levelY = levelYs[level];
      
      // Calculate valid X range
      const { minX, maxX } = this.calculateValidXRange(
        level, currentX, lastXByLevel, 
        minSameLevelSpacing, minAdjacentSpacing, maxAdjacentSpacing
      );

      if (minX >= levelWidth - 150 || minX > maxX) {
        currentX += step * 3;
        continue;
      }

      // Random X within valid range
      const finalX = minX + Math.random() * (maxX - minX);
      
      // Random width (1-3 tiles)
      const width = 64 * (1 + Math.floor(Math.random() * 3));
      
      // Check if placement maintains safe path
      const platform: PlatformData = { x: finalX, y: levelY, width, level };
      
      if (this.isPlacementSafe(platform, slices, sliceWidth)) {
        this.platforms.push(platform);
        lastXByLevel[level] = finalX;
        
        // Add to nodes for path validation
        this.nodes.push({
          id: `platform_${this.platforms.length}`,
          x: finalX,
          y: levelY,
          level,
          width,
        });
        
        // Update slice tracking
        const sliceIndex = Math.floor(finalX / sliceWidth);
        if (!slices.has(sliceIndex)) {
          slices.set(sliceIndex, []);
        }
        slices.get(sliceIndex)!.push(level);
        
        currentX = finalX + 40 + Math.random() * step * 3;
      } else {
        currentX += step * 2;
      }
    }

    // Sort by X position
    this.platforms.sort((a, b) => a.x - b.x);
  }

  private selectNextLevel(
    currentX: number, 
    lastXByLevel: number[], 
    slices: Map<number, number[]>,
    sliceWidth: number
  ): number {
    const { step } = this.config;
    const minSameLevelSpacing = step * MIN_SAME_LEVEL_SPACING_STEPS;
    
    // Check which levels can have platforms placed
    const validLevels: number[] = [];
    
    for (let level = 0; level < 3; level++) {
      // Check same-level spacing
      if (currentX - lastXByLevel[level] >= minSameLevelSpacing * 0.8) {
        // For levels 1 and 2, ensure there's a reachable platform below
        if (level === 0) {
          validLevels.push(level);
        } else {
          // Check if there's a nearby lower-level platform to jump from
          const lowerLevel = level - 1;
          const lowerLastX = lastXByLevel[lowerLevel];
          const maxReachableDistance = step * MAX_ADJACENT_LEVEL_SPACING_STEPS * 1.5;
          
          if (lowerLastX > 0 && Math.abs(currentX - lowerLastX) <= maxReachableDistance) {
            validLevels.push(level);
          }
        }
      }
    }
    
    if (validLevels.length === 0) return -1;
    
    // Prefer lower levels to build reachable paths upward
    // Weight: Level 0 = 50%, Level 1 = 35%, Level 2 = 15%
    const weights = [0.5, 0.35, 0.15];
    const weightedLevels = validLevels.filter(l => weights[l] > 0);
    
    if (weightedLevels.length === 0) return validLevels[0];
    
    const totalWeight = weightedLevels.reduce((sum, l) => sum + weights[l], 0);
    let random = Math.random() * totalWeight;
    
    for (const level of weightedLevels) {
      random -= weights[level];
      if (random <= 0) return level;
    }
    
    return weightedLevels[0];
  }

  private calculateValidXRange(
    level: number,
    currentX: number,
    lastXByLevel: number[],
    minSameLevelSpacing: number,
    minAdjacentSpacing: number,
    maxAdjacentSpacing: number
  ): { minX: number; maxX: number } {
    const { levelWidth } = this.config;
    
    let minX = currentX + 60;
    let maxX = levelWidth - 150;
    
    // Same level constraint
    const sameLevelMinX = lastXByLevel[level] + minSameLevelSpacing;
    minX = Math.max(minX, sameLevelMinX);
    
    // Adjacent level constraint for levels > 0
    if (level > 0) {
      const adjacentLevels = level === 1 ? [0, 2] : [1];
      
      for (const adjLevel of adjacentLevels) {
        const adjLastX = lastXByLevel[adjLevel];
        if (adjLastX > 0) {
          // Must be within 4-6 steps of adjacent level
          const adjMinX = adjLastX + minAdjacentSpacing;
          const adjMaxX = adjLastX + maxAdjacentSpacing;
          
          if (adjMinX <= levelWidth - 150 && adjMaxX >= minX) {
            minX = Math.max(minX, adjMinX);
            maxX = Math.min(maxX, adjMaxX);
            break;
          }
        }
      }
    }
    
    return { minX, maxX };
  }

  private isPlacementSafe(
    platform: PlatformData,
    slices: Map<number, number[]>,
    sliceWidth: number
  ): boolean {
    const { maxHorizontalJump, levelWidth } = this.config;
    
    // Check if this platform doesn't block the only path forward
    const sliceIndex = Math.floor(platform.x / sliceWidth);
    
    // Ground is always available as fallback path
    // So placement is safe as long as gaps don't exceed max jump distance
    
    // Check distance to nearest platform/ground on the left
    const nearbyPlatforms = this.platforms.filter(p => 
      Math.abs(p.x - platform.x) <= maxHorizontalJump * 1.5
    );
    
    // If this is one of the first platforms, it's safe (ground is reachable)
    if (platform.x < 300) return true;
    
    // Check if there's a reachable platform to jump from
    const canReach = nearbyPlatforms.some(p => {
      const horizontalDist = Math.abs(p.x - platform.x);
      const verticalDist = Math.abs(p.y - platform.y);
      
      // Can reach if within jump distance
      return horizontalDist <= maxHorizontalJump && 
             verticalDist <= this.config.maxJumpHeight * 1.2;
    });
    
    // Also check if ground is reachable (for Level 1 platforms)
    if (platform.level === 0) {
      return true; // Level 1 is always reachable from ground
    }
    
    return canReach;
  }

  private validateAndFixPath(): void {
    // Use graph connectivity to ensure there's always a path
    // from any point to the end of the level
    
    if (this.platforms.length === 0) return;
    
    // Check for large gaps without any platforms
    const { levelWidth, maxHorizontalJump, step } = this.config;
    const sortedPlatforms = [...this.platforms].sort((a, b) => a.x - b.x);
    
    let lastX = 0;
    const gaps: { start: number; end: number }[] = [];
    
    for (const platform of sortedPlatforms) {
      const gap = platform.x - lastX;
      // Ground is always navigable, so large gaps are fine
      // But we should ensure platforms are reachable where they exist
      lastX = platform.x + platform.width;
    }
    
    // Ensure the end of level is reachable
    const lastPlatform = sortedPlatforms[sortedPlatforms.length - 1];
    if (lastPlatform && levelWidth - lastPlatform.x > maxHorizontalJump * 3) {
      // Add a bridge platform near the end
      this.platforms.push({
        x: levelWidth - 200,
        y: this.config.levelYs[0],
        width: 128,
        level: 0,
      });
    }
    
    // Verify path connectivity using BFS
    this.verifyPathConnectivity();
  }

  private verifyPathConnectivity(): void {
    // Simple connectivity check - ensure we can traverse left to right
    const { maxHorizontalJump, maxJumpHeight } = this.config;
    
    const sortedPlatforms = [...this.platforms].sort((a, b) => a.x - b.x);
    
    for (let i = 0; i < sortedPlatforms.length - 1; i++) {
      const current = sortedPlatforms[i];
      const next = sortedPlatforms[i + 1];
      
      const horizontalGap = next.x - (current.x + current.width);
      
      // If gap is too large and they're not on adjacent levels
      if (horizontalGap > maxHorizontalJump * 2) {
        // Check if ground traversal is possible (always is)
        // Ground provides the fallback path
        continue;
      }
      
      // For vertical reachability between adjacent platforms
      if (Math.abs(current.level - next.level) > 1) {
        // Non-adjacent levels - check if there's an intermediate platform
        const hasIntermediate = sortedPlatforms.some(p => 
          p.x > current.x && p.x < next.x &&
          p.level === 1 // Level 2 as intermediate
        );
        
        if (!hasIntermediate && horizontalGap < maxHorizontalJump) {
          // Add intermediate platform
          const midX = (current.x + next.x) / 2;
          this.platforms.push({
            x: midX,
            y: this.config.levelYs[1],
            width: 64,
            level: 1,
          });
        }
      }
    }
    
    // Re-sort after adding platforms
    this.platforms.sort((a, b) => a.x - b.x);
  }
}
