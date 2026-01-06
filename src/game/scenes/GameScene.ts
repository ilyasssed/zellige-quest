import Phaser from 'phaser';
import { JUMP_VELOCITY, SANDAL_SPEED, PLAYER_SPEED } from '../config';

interface GameState {
  score: number;
  lives: number;
  hasPowerUp: boolean;
}

interface PlatformData {
  x: number;
  y: number;
  width: number;
}

const LEVEL_WIDTH = 2000;
const LEVEL_HEIGHT = 400;
const GROUND_Y = LEVEL_HEIGHT - 32; // Ground level for player feet

// Jump physics constants (calculated from game config values)
const PLAYER_GRAVITY = 1400; // 800 world + 600 player
const JUMP_VELOCITY_VALUE = 450; // absolute value
const MAX_JUMP_HEIGHT = (JUMP_VELOCITY_VALUE * JUMP_VELOCITY_VALUE) / (2 * PLAYER_GRAVITY); // ~72px
const JUMP_TIME = (2 * JUMP_VELOCITY_VALUE) / PLAYER_GRAVITY; // ~0.64s
const MAX_HORIZONTAL_JUMP = 200 * JUMP_TIME; // ~128px (using PLAYER_SPEED value)

// Platform height constants
const PLATFORM_HEIGHT = 32; // Height of a platform tile
const STEP = 20; // Base unit for horizontal spacing (in pixels)

// Level heights (from ground) - obstacles stack based on their size
const LEVEL_1_Y = GROUND_Y - MAX_JUMP_HEIGHT * 0.9; // Jump height from ground
const LEVEL_2_Y = LEVEL_1_Y - (2 * PLATFORM_HEIGHT); // Level 1 + 2 obstacle heights
const LEVEL_3_Y = LEVEL_2_Y - (2 * PLATFORM_HEIGHT); // Level 2 + 2 obstacle heights

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private sweets!: Phaser.Physics.Arcade.Group;
  private teas!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private sandals!: Phaser.Physics.Arcade.Group;
  
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  
  private gameState: GameState = {
    score: 0,
    lives: 3,
    hasPowerUp: false,
  };

  private scoreText!: Phaser.GameObjects.Text;
  private livesContainer!: Phaser.GameObjects.Container;
  private powerUpIndicator!: Phaser.GameObjects.Container;
  
  private canThrow = true;
  private isInvulnerable = false;
  private isGameOver = false;
  private playerSpeed = 200;
  private soundtrack?: Phaser.Sound.BaseSound;
  
  private platformData: PlatformData[] = [];
  private isPaused = false;
  private pauseMenu?: Phaser.GameObjects.Container;
  private soundButton?: Phaser.GameObjects.Container;
  private pauseButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset game state
    this.gameState = { score: 0, lives: 3, hasPowerUp: false };
    this.isInvulnerable = false;
    this.canThrow = true;
    this.isGameOver = false;

    // Set world bounds for horizontal level
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    // Create background
    this.createBackground();

    // Create ground (full level width) - positioned higher
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < LEVEL_WIDTH + 64; x += 64) {
      const tile = this.ground.create(x, LEVEL_HEIGHT - 16, 'ground') as Phaser.Physics.Arcade.Sprite;
      tile.refreshBody();
    }

    // Create platforms
    this.platforms = this.physics.add.staticGroup();
    this.createLevel();

    // Create groups
    this.sweets = this.physics.add.group();
    this.teas = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.sandals = this.physics.add.group();

    // Create player with PNG sprite (static by default)
    this.player = this.physics.add.sprite(100, LEVEL_HEIGHT - 32, 'player-static');
    this.player.setOrigin(0.5, 1); // Anchor at bottom-center so feet stay on ground
    this.player.setScale(0.15);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setGravityY(600);
    
    // Adjust physics body to align with bottom of sprite
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const spriteHeight = this.player.height;
    const spriteWidth = this.player.width;
    // Body covers most of sprite, offset from top-left of original texture
    playerBody.setSize(spriteWidth * 0.6, spriteHeight * 0.9);
    playerBody.setOffset(spriteWidth * 0.2, spriteHeight * 0.1);

    // Camera follows player horizontally
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0);
    this.cameras.main.setDeadzone(200, LEVEL_HEIGHT);

    // Collisions
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms, this.enemyHitPlatform, undefined, this);

    // Overlaps
    this.physics.add.overlap(this.player, this.sweets, this.collectSweet, undefined, this);
    this.physics.add.overlap(this.player, this.teas, this.collectTea, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);
    this.physics.add.overlap(this.sandals, this.enemies, this.sandalHitEnemy, undefined, this);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // HUD (fixed to camera)
    this.createHUD();

    // Spawn level objects
    this.spawnLevelObjects();

    // Play soundtrack (looping)
    this.soundtrack = this.sound.get('soundtrack');
    if (!this.soundtrack) {
      this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: 0.5 });
    }
    if (!this.soundtrack.isPlaying) {
      this.soundtrack.play();
    }

    // Create control buttons (sound + pause)
    this.createControlButtons();

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  createControlButtons(): void {
    const camWidth = this.cameras.main.width;
    
    // Sound toggle button
    this.soundButton = this.add.container(camWidth - 90, 30);
    this.soundButton.setScrollFactor(0);
    this.soundButton.setDepth(100);
    
    const soundBg = this.add.graphics();
    soundBg.fillStyle(0x000000, 0.6);
    soundBg.fillRoundedRect(-20, -20, 40, 40, 8);
    
    const isMuted = this.sound.mute;
    const soundIcon = this.add.text(0, 0, isMuted ? '🔇' : '🔊', {
      fontSize: '20px',
    });
    soundIcon.setOrigin(0.5);
    soundIcon.setName('soundIcon');
    
    this.soundButton.add([soundBg, soundIcon]);
    this.soundButton.setSize(40, 40);
    this.soundButton.setInteractive({ useHandCursor: true });
    
    this.soundButton.on('pointerdown', () => {
      this.sound.mute = !this.sound.mute;
      const icon = this.soundButton?.getByName('soundIcon') as Phaser.GameObjects.Text;
      if (icon) {
        icon.setText(this.sound.mute ? '🔇' : '🔊');
      }
    });

    // Pause button
    this.pauseButton = this.add.container(camWidth - 40, 30);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(100);
    
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x000000, 0.6);
    pauseBg.fillRoundedRect(-20, -20, 40, 40, 8);
    
    const pauseIcon = this.add.text(0, 0, '⏸️', {
      fontSize: '20px',
    });
    pauseIcon.setOrigin(0.5);
    
    this.pauseButton.add([pauseBg, pauseIcon]);
    this.pauseButton.setSize(40, 40);
    this.pauseButton.setInteractive({ useHandCursor: true });
    
    this.pauseButton.on('pointerdown', () => {
      this.togglePause();
    });

    // ESC key to pause
    this.input.keyboard?.on('keydown-ESC', () => {
      this.togglePause();
    });
  }

  togglePause(): void {
    if (this.isGameOver) return;
    
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.hidePauseMenu();
    }
  }

  showPauseMenu(): void {
    const { width, height } = this.cameras.main;
    
    this.pauseMenu = this.add.container(width / 2, height / 2);
    this.pauseMenu.setScrollFactor(0);
    this.pauseMenu.setDepth(200);
    
    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    
    // Menu background
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x2F1F0F, 1);
    menuBg.fillRoundedRect(-120, -100, 240, 200, 16);
    menuBg.lineStyle(3, 0xD4A574);
    menuBg.strokeRoundedRect(-120, -100, 240, 200, 16);
    
    // Paused title
    const title = this.add.text(0, -70, 'PAUSED', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#D4A574',
    });
    title.setOrigin(0.5);
    
    // Resume button
    const resumeBtn = this.createMenuButton(0, -20, '▶ Resume', () => {
      this.togglePause();
    });
    
    // Retry button
    const retryBtn = this.createMenuButton(0, 30, '↻ Retry', () => {
      this.hidePauseMenu();
      this.scene.restart();
    });
    
    // Main Menu button
    const menuBtn = this.createMenuButton(0, 80, '🏠 Main Menu', () => {
      this.hidePauseMenu();
      this.scene.start('MenuScene');
    });
    
    this.pauseMenu.add([overlay, menuBg, title, resumeBtn, retryBtn, menuBtn]);
  }

  createMenuButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x8B2942, 1);
    bg.fillRoundedRect(-90, -18, 180, 36, 8);
    
    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#FFFFFF',
    });
    label.setOrigin(0.5);
    
    btn.add([bg, label]);
    btn.setSize(180, 36);
    btn.setInteractive({ useHandCursor: true });
    
    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, scale: 1.05, duration: 100 });
    });
    
    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, scale: 1, duration: 100 });
    });
    
    btn.on('pointerdown', callback);
    
    return btn;
  }

  hidePauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = undefined;
    }
  }

  createBackground(): void {
    const bgTexture = this.textures.get('background');
    const bgWidth = bgTexture.getSourceImage().width;
    const bgHeight = bgTexture.getSourceImage().height;
    
    // Scale to fit level height while maintaining aspect ratio
    const scale = LEVEL_HEIGHT / bgHeight;
    const scaledWidth = bgWidth * scale;
    
    // Calculate how many tiles needed to cover LEVEL_WIDTH
    const tilesNeeded = Math.ceil(LEVEL_WIDTH / scaledWidth) + 1;
    
    // Add yellow sky behind the background
    const sky = this.add.rectangle(LEVEL_WIDTH / 2, LEVEL_HEIGHT / 2, LEVEL_WIDTH, LEVEL_HEIGHT, 0xfdcb6e);
    sky.setOrigin(0.5, 0.5);
    
    // Place background images side by side with 70% opacity
    for (let i = 0; i < tilesNeeded; i++) {
      const bg = this.add.image(i * scaledWidth, 0, 'background');
      bg.setOrigin(0, 0);
      bg.setScale(scale);
      bg.setAlpha(0.7);
    }
  }

  createLevel(): void {
    // Generate platforms procedurally based on jump physics
    this.platformData = this.generatePlatforms();
    
    // Create platform sprites with varying widths
    this.platformData.forEach(data => {
      // Create multiple platform tiles for wider platforms
      const tileCount = Math.ceil(data.width / 64);
      for (let i = 0; i < tileCount; i++) {
        const platform = this.platforms.create(
          data.x + (i * 64) - ((tileCount - 1) * 32), 
          data.y, 
          'platform'
        ) as Phaser.Physics.Arcade.Sprite;
        platform.refreshBody();
      }
    });
  }

  generatePlatforms(): PlatformData[] {
    const platforms: PlatformData[] = [];
    const MIN_SAME_LEVEL_SPACING = STEP * 20; // 20 steps minimum between same level
    const MIN_ADJACENT_LEVEL_DIFF = STEP * 4; // 4 steps min for adjacent levels
    const MAX_ADJACENT_LEVEL_DIFF = STEP * 6; // 6 steps max for adjacent levels
    
    // Level Y positions
    const levelYs = [LEVEL_1_Y, LEVEL_2_Y, LEVEL_3_Y];
    
    // Track last X position for each level
    const lastXByLevel: number[] = [-MIN_SAME_LEVEL_SPACING, -MIN_SAME_LEVEL_SPACING, -MIN_SAME_LEVEL_SPACING];
    
    let currentX = 150;
    
    while (currentX < LEVEL_WIDTH - 150) {
      // Pick a random level (1, 2, or 3 -> index 0, 1, 2)
      const level = Math.floor(Math.random() * 3);
      const levelY = levelYs[level];
      
      // Calculate minimum X based on constraints
      let minX = currentX + 60; // Base minimum spacing
      let maxX = LEVEL_WIDTH - 150; // Default max
      
      // Same level constraint: must be at least 20 steps from last on same level
      const sameLevelMinX = lastXByLevel[level] + MIN_SAME_LEVEL_SPACING;
      minX = Math.max(minX, sameLevelMinX);
      
      // Adjacent level constraint: must be between 4 and 6 steps from an adjacent level platform
      const adjacentLevels = level === 0 ? [1] : level === 2 ? [1] : [0, 2];
      
      // For level 2 and 3, we need a "stepping stone" from below
      let hasNearbyAdjacent = false;
      for (const adjLevel of adjacentLevels) {
        const adjLastX = lastXByLevel[adjLevel];
        // Check if there's an adjacent platform we can position relative to
        if (adjLastX > 0) {
          const adjMinX = adjLastX + MIN_ADJACENT_LEVEL_DIFF;
          const adjMaxX = adjLastX + MAX_ADJACENT_LEVEL_DIFF;
          
          // Check if valid range exists
          if (adjMinX <= LEVEL_WIDTH - 150 && adjMaxX >= minX) {
            hasNearbyAdjacent = true;
            // Position this platform between 4-6 steps from the adjacent
            minX = Math.max(minX, adjMinX);
            maxX = Math.min(maxX, adjMaxX);
            break;
          }
        }
      }
      
      // For higher levels, skip if no nearby adjacent platform to jump from
      if (level > 0 && !hasNearbyAdjacent) {
        // Try placing a lower level platform first
        const lowerLevel = level - 1;
        const lowerY = levelYs[lowerLevel];
        const lowerMinX = Math.max(currentX + 60, lastXByLevel[lowerLevel] + MIN_SAME_LEVEL_SPACING);
        
        if (lowerMinX < LEVEL_WIDTH - 150) {
          const width = 64 * (1 + Math.floor(Math.random() * 3));
          platforms.push({ x: lowerMinX, y: lowerY, width });
          lastXByLevel[lowerLevel] = lowerMinX;
          currentX = lowerMinX + 40;
        } else {
          currentX += 80;
        }
        continue;
      }
      
      if (minX >= LEVEL_WIDTH - 150 || minX > maxX) {
        currentX += 80;
        continue;
      }
      
      // Random X position within valid range
      const finalX = minX + Math.random() * (maxX - minX);
      
      // Random width (1-3 tiles wide)
      const width = 64 * (1 + Math.floor(Math.random() * 3));
      
      platforms.push({ x: finalX, y: levelY, width });
      lastXByLevel[level] = finalX;
      currentX = finalX + 40 + Math.random() * 60;
    }
    
    // Sort by X position for proper spawning
    platforms.sort((a, b) => a.x - b.x);
    
    return platforms;
  }

  spawnLevelObjects(): void {
    // Spawn sweets on reachable locations
    this.spawnSweets();
    
    // Tea power-up - place on a mid-level platform
    const midPlatform = this.platformData[Math.floor(this.platformData.length / 2)];
    if (midPlatform) {
      const tea = this.teas.create(midPlatform.x, midPlatform.y - 30, 'tea') as Phaser.Physics.Arcade.Sprite;
      (tea.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      tea.setScale(1.2);
      this.tweens.add({
        targets: tea,
        y: tea.y - 10,
        alpha: 0.8,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Enemies - place on ground between platforms
    this.spawnEnemies();
  }

  spawnSweets(): void {
    const safeJumpHeight = MAX_JUMP_HEIGHT * 0.85;
    
    // Place sweets on platforms
    this.platformData.forEach((platform, index) => {
      // 70% chance to place a sweet on each platform
      if (Math.random() < 0.7) {
        const sweet = this.sweets.create(platform.x, platform.y - 30, 'chebakia') as Phaser.Physics.Arcade.Sprite;
        (sweet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.tweens.add({
          targets: sweet,
          y: sweet.y - 5,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
    
    // Place some sweets in jump arcs between platforms (collectible mid-air)
    for (let i = 0; i < this.platformData.length - 1; i++) {
      if (Math.random() < 0.5) {
        const current = this.platformData[i];
        const next = this.platformData[i + 1];
        const midX = (current.x + next.x) / 2;
        // Place at jump apex height from lower platform
        const lowerY = Math.max(current.y, next.y);
        const sweetY = lowerY - safeJumpHeight * 0.7;
        
        const sweet = this.sweets.create(midX, sweetY, 'chebakia') as Phaser.Physics.Arcade.Sprite;
        (sweet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.tweens.add({
          targets: sweet,
          y: sweet.y - 5,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
    
    // Place a few ground-level sweets (easy to collect while running)
    for (let x = 300; x < LEVEL_WIDTH - 200; x += 400 + Math.random() * 200) {
      // Check if this position is clear of platforms
      const isClear = !this.platformData.some(p => Math.abs(p.x - x) < 100);
      if (isClear && Math.random() < 0.6) {
        const sweet = this.sweets.create(x, GROUND_Y - safeJumpHeight * 0.5, 'chebakia') as Phaser.Physics.Arcade.Sprite;
        (sweet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.tweens.add({
          targets: sweet,
          y: sweet.y - 5,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  spawnEnemies(): void {
    // Place enemies on the ground in gaps between platforms
    const enemyPositions: { x: number; direction: number }[] = [];
    
    for (let i = 0; i < this.platformData.length - 1; i++) {
      const current = this.platformData[i];
      const next = this.platformData[i + 1];
      const gapX = (current.x + next.x) / 2;
      
      // Only spawn in larger gaps
      if (next.x - current.x > 150 && Math.random() < 0.6) {
        enemyPositions.push({ x: gapX, direction: Math.random() < 0.5 ? 1 : -1 });
      }
    }
    
    enemyPositions.forEach(pos => {
      const enemy = this.enemies.create(pos.x, GROUND_Y - 20, 'cockroach') as Phaser.Physics.Arcade.Sprite;
      enemy.setSize(26, 18);
      enemy.setOffset(3, 5);
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(80 * pos.direction);
      body.setBounce(0, 0);
      enemy.setData('direction', pos.direction);
      if (pos.direction < 0) enemy.setFlipX(true);
    });
  }

  enemyHitPlatform(
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const body = enemySprite.body as Phaser.Physics.Arcade.Body;
    
    // Reverse direction when hitting platform from side
    if (body.touching.left || body.touching.right) {
      const newDirection = body.touching.left ? 1 : -1;
      body.setVelocityX(80 * newDirection);
      enemySprite.setFlipX(newDirection < 0);
      enemySprite.setData('direction', newDirection);
    }
  }

  createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.4);
    hudBg.fillRoundedRect(10, 10, 180, 50, 8);
    hudBg.setScrollFactor(0);

    this.scoreText = this.add.text(20, 18, 'Score: 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#FFD700',
    });
    this.scoreText.setScrollFactor(0);

    this.livesContainer = this.add.container(20, 42);
    this.livesContainer.setScrollFactor(0);
    this.updateLivesDisplay();

    this.powerUpIndicator = this.add.container(680, 30);
    this.powerUpIndicator.setScrollFactor(0);
    const powerUpBg = this.add.graphics();
    powerUpBg.fillStyle(0x228B22, 0.9);
    powerUpBg.fillRoundedRect(-60, -15, 120, 30, 8);
    const powerUpText = this.add.text(0, 0, 'X = THROW', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#FFFFFF',
    });
    powerUpText.setOrigin(0.5);
    this.powerUpIndicator.add([powerUpBg, powerUpText]);
    this.powerUpIndicator.setVisible(false);
  }

  updateLivesDisplay(): void {
    this.livesContainer.removeAll(true);
    for (let i = 0; i < this.gameState.lives; i++) {
      const heart = this.add.image(i * 22, 0, 'heart');
      heart.setScale(0.8);
      this.livesContainer.add(heart);
    }
  }

  collectSweet(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    sweet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const sweetSprite = sweet as Phaser.Physics.Arcade.Sprite;
    this.tweens.add({
      targets: sweetSprite,
      scale: 0,
      alpha: 0,
      y: sweetSprite.y - 30,
      duration: 200,
      onComplete: () => sweetSprite.destroy(),
    });
    this.gameState.score += 100;
    this.scoreText.setText(`Score: ${this.gameState.score}`);
  }

  collectTea(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    tea: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const teaSprite = tea as Phaser.Physics.Arcade.Sprite;
    teaSprite.destroy();
    this.gameState.hasPowerUp = true;
    this.powerUpIndicator.setVisible(true);
    this.cameras.main.flash(200, 50, 205, 50);
    this.gameState.score += 500;
    this.scoreText.setText(`Score: ${this.gameState.score}`);
  }

  handleEnemyCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;

    if (playerBody.velocity.y > 0 && playerBody.bottom < enemyBody.center.y) {
      this.defeatEnemy(enemySprite);
      playerBody.setVelocityY(-300);
    } else if (!this.isInvulnerable) {
      this.takeDamage();
    }
  }

  defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    this.tweens.add({
      targets: enemy,
      scaleY: 0.2,
      alpha: 0,
      duration: 300,
      onComplete: () => enemy.destroy(),
    });
    this.gameState.score += 200;
    this.scoreText.setText(`Score: ${this.gameState.score}`);
  }

  throwSandal(): void {
    if (!this.gameState.hasPowerUp || !this.canThrow) return;
    this.canThrow = false;

    const direction = this.player.flipX ? -1 : 1;
    const sandal = this.sandals.create(
      this.player.x + (30 * direction),
      this.player.y,
      'sandal'
    ) as Phaser.Physics.Arcade.Sprite;

    const sandalBody = sandal.body as Phaser.Physics.Arcade.Body;
    sandalBody.setAllowGravity(false);
    sandalBody.setVelocityX(SANDAL_SPEED * direction);
    if (direction < 0) sandal.setFlipX(true);

    this.tweens.add({
      targets: sandal,
      angle: 360 * direction,
      duration: 300,
      repeat: -1,
    });

    this.time.delayedCall(1500, () => {
      if (sandal.active) sandal.destroy();
    });

    this.time.delayedCall(400, () => {
      this.canThrow = true;
    });
  }

  sandalHitEnemy(
    sandal: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const sandalSprite = sandal as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    sandalSprite.destroy();
    this.defeatEnemy(enemySprite);
  }

  takeDamage(): void {
    this.isInvulnerable = true;
    this.gameState.lives--;
    this.updateLivesDisplay();

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 10,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isInvulnerable = false;
      },
    });

    this.cameras.main.shake(200, 0.01);

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  gameOver(): void {
    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0xff0000);

    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', { score: this.gameState.score });
    });
  }

  update(): void {
    if (this.isGameOver || this.isPaused) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down;

    // Horizontal movement
    const isMoving = this.cursors.left.isDown || this.cursors.right.isDown;
    
    if (this.cursors.left.isDown) {
      body.setVelocityX(-this.playerSpeed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(this.playerSpeed);
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    // Play walk animation or show static frame
    if (isMoving) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'player-walk') {
        this.player.anims.play('player-walk');
      }
    } else {
      this.player.anims.stop();
      this.player.setTexture('player-static');
    }


    // Jump
    if ((this.cursors.space.isDown || this.cursors.up.isDown) && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
    }

    // Throw sandal
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && this.gameState.hasPowerUp) {
      this.throwSandal();
    }

    // Update enemy movement (reverse at world bounds)
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      
      if (enemy.x <= 50 || enemy.x >= LEVEL_WIDTH - 50) {
        const newDirection = enemy.x <= 50 ? 1 : -1;
        enemyBody.setVelocityX(80 * newDirection);
        enemy.setFlipX(newDirection < 0);
      }
    });

    // Check win
    if (this.player.x >= LEVEL_WIDTH - 100) {
      this.gameState.score += 1000;
      this.gameOver();
    }

    // Cleanup off-screen sandals
    this.sandals.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.x < 0 || sprite.x > LEVEL_WIDTH) sprite.destroy();
    });
  }
}
