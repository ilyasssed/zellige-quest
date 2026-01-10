import Phaser from "phaser";
import { JUMP_VELOCITY, SANDAL_SPEED, PLAYER_SPEED } from "../config";

// Define our own simple interface for the data we generate
interface PlatformData {
  x: number;
  y: number;
  width: number;
}

interface ItemData {
  x: number;
  y: number;
  type: "sweet" | "tea";
}

interface GameState {
  score: number;
  lives: number;
  hasPowerUp: boolean;
}

// Increased width to fit the specific sequence
const LEVEL_WIDTH = 6000;
const LEVEL_HEIGHT = 400;
const GROUND_Y = LEVEL_HEIGHT - 32;

// Physics constants
const PLAYER_GRAVITY = 1400;
const JUMP_VELOCITY_VALUE = 450;
const MAX_JUMP_HEIGHT = (JUMP_VELOCITY_VALUE * JUMP_VELOCITY_VALUE) / (2 * PLAYER_GRAVITY);

// Dimensions
const PLATFORM_HEIGHT = 32;
const STEP_PIXELS = 20; // 1 step = 20px
const PLATFORM_SCALE = 0.15; // Scale for the table image (as requested in original code)

// Level Y positions
const LEVEL_1_Y = GROUND_Y - MAX_JUMP_HEIGHT * 0.9;
const LEVEL_2_Y = LEVEL_1_Y - 2 * PLATFORM_HEIGHT;
const LEVEL_3_Y = LEVEL_2_Y - 2 * PLATFORM_HEIGHT;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private sweets!: Phaser.Physics.Arcade.Group;
  private teas!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private sandals!: Phaser.Physics.Arcade.Group;
  
  // Door properties
  private door!: Phaser.Physics.Arcade.Sprite;
  private isLevelComplete = false;

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

  // Arrays to hold our manual design data
  private platformData: PlatformData[] = [];
  private itemsToSpawn: ItemData[] = [];

  private isPaused = false;
  private pauseMenu?: Phaser.GameObjects.Container;
  private soundButton?: Phaser.GameObjects.Container;
  private pauseButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // Reset state
    this.gameState = { score: 0, lives: 3, hasPowerUp: false };
    this.isInvulnerable = false;
    this.canThrow = true;
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.platformData = [];
    this.itemsToSpawn = [];

    // World bounds
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    this.createBackground();

    // Ground
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < LEVEL_WIDTH + 64; x += 64) {
      const tile = this.ground.create(x, LEVEL_HEIGHT - 16, "ground") as Phaser.Physics.Arcade.Sprite;
      tile.refreshBody();
    }

    // 1. Calculate the designed level positions
    this.buildDesignedLevel();

    // 2. Create the platforms
    this.platforms = this.physics.add.staticGroup();
    this.createPlatforms();

    // Groups
    this.sweets = this.physics.add.group();
    this.teas = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.sandals = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(100, GROUND_Y - 64, "player-static");
    this.player.setOrigin(0.5, 1);
    this.player.setScale(0.15);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setGravityY(600);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const spriteHeight = this.player.height;
    const spriteWidth = this.player.width;
    playerBody.setSize(spriteWidth * 0.6, spriteHeight * 0.9);
    playerBody.setOffset(spriteWidth * 0.2, spriteHeight * 0.1);
    this.player.body.updateFromGameObject();

    // Camera
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
    
    // Door Overlap
    if (this.door) {
        this.physics.add.overlap(this.player, this.door, this.handleReachDoor, undefined, this);
    }

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // HUD
    this.createHUD();

    // 3. Spawn the items (using calculated positions)
    this.spawnLevelObjects();

    // Soundtrack
    this.soundtrack = this.sound.get("soundtrack");
    if (!this.soundtrack) {
      this.soundtrack = this.sound.add("soundtrack", { loop: true, volume: 0.5 });
    }
    if (!this.soundtrack.isPlaying) {
      this.soundtrack.play();
    }

    this.createControlButtons();
    this.cameras.main.fadeIn(500);
  }

  // --- REUSABLE BLOCK LOGIC ---

  // Helper: Adds a platform. Returns the Right Edge (End Point)
  addSinglePlatform(startX: number, y: number, width: number, itemType?: "sweet" | "tea"): number {
    const centerX = startX + width / 2;
    this.platformData.push({ x: centerX, y, width });

    if (itemType === "sweet") {
      // 2 sweets on double width, 1 on standard
      if (width > 200) { 
        const sep = width / 2;
        this.addItemData(centerX - sep / 2, y, "sweet");
        this.addItemData(centerX + sep / 2, y, "sweet");
      } else {
        this.addItemData(centerX, y, "sweet");
      }
    } else if (itemType === "tea") {
      this.addItemData(centerX, y, "tea");
    }

    return startX + width; // Return End X
  }

  // BLOCK 1: Lvl 1 -> Lvl 2 -> Lvl 1 (All Standard Width)
  createBlock1(startX: number): number {
    const STANDARD_WIDTH = 128;
    const CHAR_WIDTH = 50;
    const GAP_SMALL = CHAR_WIDTH * 1.5; 

    let cursor = startX;

    // Platform 1 (Lvl 1)
    cursor = this.addSinglePlatform(cursor, LEVEL_1_Y, STANDARD_WIDTH, "sweet");
    
    // Platform 2 (Lvl 2)
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_2_Y, STANDARD_WIDTH, "sweet");

    // Platform 3 (Lvl 1)
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_1_Y, STANDARD_WIDTH, "sweet");

    return cursor; 
  }

  // BLOCK 2: Lvl 1 -> Lvl 2 (Double) -> Lvl 3 (Standard)
  createBlock2(startX: number): number {
    const STANDARD_WIDTH = 128;
    const DOUBLE_WIDTH = 256;
    const CHAR_WIDTH = 50;
    const GAP_SMALL = CHAR_WIDTH * 1.5; 

    let cursor = startX;

    // Platform 1 (Lvl 1)
    cursor = this.addSinglePlatform(cursor, LEVEL_1_Y, STANDARD_WIDTH, "sweet");

    // Platform 2 (Lvl 2 - Double Width)
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_2_Y, DOUBLE_WIDTH, "sweet");

    // Platform 3 (Lvl 3)
    cursor += GAP_SMALL;
    // NOTE: Removed "tea" from here as you requested only one tea in the middle
    cursor = this.addSinglePlatform(cursor, LEVEL_3_Y, STANDARD_WIDTH, "sweet");

    return cursor;
  }

  // --- MAIN LEVEL BUILDER ---
  buildDesignedLevel(): void {
    const STANDARD_WIDTH = 128;
    const CHAR_WIDTH = 50;
    
    // Spacings
    const GAP_1_5_CHAR = CHAR_WIDTH * 1.5; // ~75px
    const GAP_10_STEPS = 10 * STEP_PIXELS; // 200px
    const GAP_20_STEPS = 20 * STEP_PIXELS; // 400px
    const GAP_5_STEPS = 5 * STEP_PIXELS;   // 100px

    let cursor = 200; // Start X

    // 1. Block 1
    cursor = this.createBlock1(cursor);

    // 2. Gap (1.5x Char Width)
    cursor += GAP_1_5_CHAR;

    // 3. Single Platform (Level 2) with TEA
    cursor = this.addSinglePlatform(cursor, LEVEL_2_Y, STANDARD_WIDTH, "tea");

    // 4. Gap (10 Steps)
    cursor += GAP_10_STEPS;

    // 5. Block 2
    cursor = this.createBlock2(cursor);

    // 6. Gap (20 Steps)
    cursor += GAP_20_STEPS;

    // 7. Block 2
    cursor = this.createBlock2(cursor);

    // 8. Gap (5 Steps)
    cursor += GAP_5_STEPS;

    // 9. Block 1
    cursor = this.createBlock1(cursor);

    // --- Create Door at End ---
    this.createDoor(cursor + 200);
  }

  createDoor(x: number): void {
    // Create the door sprite using 'door1' (closed state)
    this.door = this.physics.add.sprite(x, GROUND_Y, 'door1');
    this.door.setOrigin(0.5, 1);
    this.door.setImmovable(true);
    (this.door.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  handleReachDoor(): void {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;

    // Play the open animation defined in BootScene
    this.door.play('door-open');

    // Stop player
    this.physics.pause();
    this.player.setTint(0x00ff00);

    // Wait 1s then finish level
    this.time.delayedCall(1000, () => {
        this.gameState.score += 1000;
        this.scene.start("GameOverScene", { score: this.gameState.score });
    });