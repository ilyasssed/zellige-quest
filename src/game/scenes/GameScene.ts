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
const DOOR_SCALE = 0.2; // Scale for the door

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
    this.player.setDepth(10);

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
    const GAP_5_STEPS = 5 * STEP_PIXELS; // 100px

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
    // --- HOW TO ADAPT THIS ---
    // Change 'yAdjustment' to move the door up or down.
    // - 10 : Moves the door UP by 10 pixels
    // + 10 : Moves the door DOWN by 10 pixels
    //   0  : Sits exactly on the calculated ground line
    const yAdjustment = -16;

    // Create the door sprite
    // We add the adjustment to GROUND_Y
    this.door = this.physics.add.sprite(x, GROUND_Y + yAdjustment, "door1");

    // Depth 0: Background
    // Depth 1: Platforms/Items
    // Depth 10: Player (default is usually effectively higher because it's created last)
    this.door.setDepth(0);
    // ---------------------

    // --- SCALING ---
    // Change DOOR_SCALE at the top of the file to change size
    this.door.setScale(DOOR_SCALE);

    // --- ANCHOR POINT ---
    // (0.5, 1) means:
    // 0.5 = Center horizontally
    // 1   = Bottom vertically
    // This ensures the "feet" of the door sit on the Y coordinate
    this.door.setOrigin(0.5, 1);

    this.door.setImmovable(true);
    (this.door.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Refresh body to match scale/position
    this.door.refreshBody();
  }

  handleReachDoor(): void {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;

    // Play the open animation defined in BootScene
    this.door.play("door-open");

    // Stop player
    this.physics.pause();
    this.player.setTint(0x00ff00);

    // Wait 1s then finish level
    this.time.delayedCall(1000, () => {
      this.gameState.score += 1000;
      this.scene.start("GameOverScene", { score: this.gameState.score });
    });
  }

  addItemData(x: number, y: number, type: "sweet" | "tea"): void {
    this.itemsToSpawn.push({ x, y: y - 50, type });
  }

  createPlatforms(): void {
    // Logic to create 1 single table sprite stretched to fit width
    const texture = this.textures.get("platform");
    const originalHeight = texture.getSourceImage().height;
    const targetHeight = originalHeight * PLATFORM_SCALE;

    this.platformData.forEach((data) => {
      // Create sprite at center
      const platform = this.platforms.create(data.x, data.y, "platform") as Phaser.Physics.Arcade.Sprite;

      // Stretch to fit logical width
      platform.setDisplaySize(data.width, targetHeight);

      // Update physics body
      platform.refreshBody();
    });
  }

  spawnLevelObjects(): void {
    this.itemsToSpawn.forEach((item) => {
      if (item.type === "sweet") {
        this.createSweet(item.x, item.y);
      } else if (item.type === "tea") {
        this.createTea(item.x, item.y);
      }
    });
    this.spawnEnemies();
  }

  createSweet(x: number, y: number): void {
    const sweet = this.sweets.create(x, y, "sweet") as Phaser.Physics.Arcade.Sprite;
    sweet.setScale(0.2);
    (sweet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.tweens.add({
      targets: sweet,
      y: sweet.y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createTea(x: number, y: number): void {
    const tea = this.teas.create(x, y, "tea") as Phaser.Physics.Arcade.Sprite;
    tea.setScale(0.3);
    (tea.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.tweens.add({
      targets: tea,
      y: tea.y - 10,
      alpha: 0.8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  spawnEnemies(): void {
    const numEnemies = Math.floor(LEVEL_WIDTH / 600);
    const spacing = LEVEL_WIDTH / (numEnemies + 1);

    for (let i = 1; i <= numEnemies; i++) {
      const x = spacing * i;
      if (x > 300) {
        const enemy = this.enemies.create(x, GROUND_Y - 100, "cockroach") as Phaser.Physics.Arcade.Sprite;

        const width = enemy.width;
        const height = enemy.height;
        enemy.setScale(0.1);

        // --- FIXED HITBOX: Made narrower to prevent weird jump kills ---
        const hitWidth = width * 0.4;
        const hitHeight = height * 0.5;

        enemy.setSize(hitWidth, hitHeight);
        enemy.setOffset((width - hitWidth) / 2, height - hitHeight);
        // -------------------------------------------------------------

        const body = enemy.body as Phaser.Physics.Arcade.Body;
        body.setBounce(0, 0);

        const direction = this.player.x > x ? 1 : -1;
        body.setVelocityX(80 * direction);
        enemy.setData("direction", direction);
        enemy.setFlipX(direction < 0);
      }
    }
  }

  createControlButtons(): void {
    const camWidth = this.cameras.main.width;
    this.soundButton = this.add.container(camWidth - 90, 30);
    this.soundButton.setScrollFactor(0).setDepth(100);
    const soundBg = this.add.graphics();
    soundBg.fillStyle(0x000000, 0.6);
    soundBg.fillRoundedRect(-20, -20, 40, 40, 8);
    const isMuted = this.sound.mute;
    const soundIcon = this.add.text(0, 0, isMuted ? "🔇" : "🔊", { fontSize: "20px" });
    soundIcon.setOrigin(0.5).setName("soundIcon");
    this.soundButton.add([soundBg, soundIcon]);
    this.soundButton.setSize(40, 40).setInteractive({ useHandCursor: true });

    this.soundButton.on("pointerover", () => {
      this.tweens.add({ targets: this.soundButton, scale: 1.1, duration: 100 });
    });
    this.soundButton.on("pointerout", () => {
      this.tweens.add({ targets: this.soundButton, scale: 1, duration: 100 });
    });
    this.soundButton.on("pointerdown", () => {
      this.sound.mute = !this.sound.mute;
      const icon = this.soundButton?.getByName("soundIcon") as Phaser.GameObjects.Text;
      if (icon) icon.setText(this.sound.mute ? "🔇" : "🔊");
      this.tweens.add({ targets: this.soundButton, scale: 0.9, duration: 50, yoyo: true });
    });

    this.pauseButton = this.add.container(camWidth - 40, 30);
    this.pauseButton.setScrollFactor(0).setDepth(100);
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x000000, 0.6);
    pauseBg.fillRoundedRect(-20, -20, 40, 40, 8);
    const pauseIcon = this.add.text(0, 0, "⏸️", { fontSize: "20px" });
    pauseIcon.setOrigin(0.5);
    this.pauseButton.add([pauseBg, pauseIcon]);
    this.pauseButton.setSize(40, 40).setInteractive({ useHandCursor: true });
    this.pauseButton.on("pointerdown", () => this.togglePause());
    this.input.keyboard?.on("keydown-ESC", () => this.togglePause());
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
    this.pauseMenu = this.add
      .container(width / 2, height / 2)
      .setScrollFactor(0)
      .setDepth(200);
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x2f1f0f, 1);
    menuBg.fillRoundedRect(-120, -100, 240, 200, 16);
    menuBg.lineStyle(3, 0xd4a574);
    menuBg.strokeRoundedRect(-120, -100, 240, 200, 16);
    const title = this.add
      .text(0, -70, "PAUSED", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "20px",
        color: "#D4A574",
      })
      .setOrigin(0.5);
    const resumeBtn = this.createMenuButton(0, -20, "▶ Resume", () => this.togglePause());
    const retryBtn = this.createMenuButton(0, 30, "↻ Retry", () => {
      this.hidePauseMenu();
      this.scene.restart();
    });
    const menuBtn = this.createMenuButton(0, 80, "🏠 Main Menu", () => {
      this.hidePauseMenu();
      this.scene.start("MenuScene");
    });
    this.pauseMenu.add([overlay, menuBg, title, resumeBtn, retryBtn, menuBtn]);
  }

  createMenuButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x8b2942, 1);
    bg.fillRoundedRect(-90, -18, 180, 36, 8);
    const label = this.add
      .text(0, 0, text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "10px",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);
    btn.add([bg, label]).setSize(180, 36).setInteractive({ useHandCursor: true });
    btn.on("pointerover", () => this.tweens.add({ targets: btn, scale: 1.05, duration: 100 }));
    btn.on("pointerout", () => this.tweens.add({ targets: btn, scale: 1, duration: 100 }));
    btn.on("pointerdown", callback);
    return btn;
  }

  hidePauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = undefined;
    }
  }

  createBackground(): void {
    const bgTexture = this.textures.get("background");
    const bgWidth = bgTexture.getSourceImage().width;
    const bgHeight = bgTexture.getSourceImage().height;
    const scale = LEVEL_HEIGHT / bgHeight;
    const scaledWidth = bgWidth * scale;
    const tilesNeeded = Math.ceil(LEVEL_WIDTH / scaledWidth) + 1;
    const sky = this.add.rectangle(LEVEL_WIDTH / 2, LEVEL_HEIGHT / 2, LEVEL_WIDTH, LEVEL_HEIGHT, 0xfdcb6e);
    sky.setOrigin(0.5, 0.5);
    for (let i = 0; i < tilesNeeded; i++) {
      const bg = this.add.image(i * scaledWidth, 0, "background");
      bg.setOrigin(0, 0).setScale(scale).setAlpha(0.7);
    }
  }

  enemyHitPlatform(
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const body = enemySprite.body as Phaser.Physics.Arcade.Body;
    const platformBody = (platform as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
    if (body.touching.left || body.touching.right) {
      const enemyBottom = body.bottom;
      const platformTop = platformBody.top;
      if (enemyBottom > platformTop) {
        const newDirection = body.touching.left ? 1 : -1;
        body.setVelocityX(80 * newDirection);
        enemySprite.setFlipX(newDirection < 0);
        enemySprite.setData("direction", newDirection);
      }
    }
  }

  collectSweet(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    sweet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
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
    tea: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    const teaSprite = tea as Phaser.Physics.Arcade.Sprite;
    teaSprite.destroy();
    this.gameState.hasPowerUp = true;
    this.powerUpIndicator.setVisible(true);
    this.cameras.main.flash(200, 50, 205, 50);
    this.gameState.score += 500;
    this.scoreText.setText(`Score: ${this.gameState.score}`);
    this.sound.play("munch", { volume: 0.6 });
  }

  handleEnemyCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;
    const isFalling = playerBody.velocity.y > 0;
    const isAbove = playerBody.bottom <= enemyBody.center.y;
    if (isFalling && isAbove) {
      this.defeatEnemy(enemySprite);
      playerBody.setVelocityY(-350);
    } else if (!this.isInvulnerable) {
      this.takeDamage();
    }
  }

  defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    this.sound.play("enemyDeath", { volume: 0.5 });
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
    const startX = this.player.x + 30 * direction;
    const startY = this.player.y;
    const sandal = this.sandals.create(startX, startY, "sandal") as Phaser.Physics.Arcade.Sprite;
    sandal.setScale(0.1);
    const sandalBody = sandal.body as Phaser.Physics.Arcade.Body;
    sandalBody.setAllowGravity(false);
    sandalBody.setVelocityX(300 * direction);
    if (direction < 0) sandal.setFlipX(true);
    const amplitude = this.player.displayHeight / 2;
    sandal.setData({
      startY: startY,
      startX: startX,
      amplitude: amplitude,
      frequency: 0.05,
    });
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
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    (sandal as Phaser.Physics.Arcade.Sprite).destroy();
    this.defeatEnemy(enemy as Phaser.Physics.Arcade.Sprite);
  }

  takeDamage(): void {
    this.isInvulnerable = true;
    this.gameState.lives--;
    this.updateLivesDisplay();
    this.sound.play("ouch", { volume: 0.6 });
    this.player.setTint(0xff0000);
    this.time.delayedCall(150, () => this.player.clearTint());
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
    if (this.gameState.lives <= 0) this.gameOver();
  }

  gameOver(): void {
    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1000, () => {
      this.scene.start("GameOverScene", { score: this.gameState.score });
    });
  }

  createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.4);
    hudBg.fillRoundedRect(10, 10, 180, 50, 8);
    hudBg.setScrollFactor(0);
    this.scoreText = this.add
      .text(20, 18, "Score: 0", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: "#FFD700",
      })
      .setScrollFactor(0);
    this.livesContainer = this.add.container(20, 42).setScrollFactor(0);
    this.updateLivesDisplay();
    this.powerUpIndicator = this.add.container(680, 30).setScrollFactor(0);
    const powerUpBg = this.add.graphics();
    powerUpBg.fillStyle(0x228b22, 0.9);
    powerUpBg.fillRoundedRect(-60, -15, 120, 30, 8);
    const powerUpText = this.add
      .text(0, 0, "X = THROW", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "10px",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);
    this.powerUpIndicator.add([powerUpBg, powerUpText]).setVisible(false);
  }

  updateLivesDisplay(): void {
    this.livesContainer.removeAll(true);
    for (let i = 0; i < this.gameState.lives; i++) {
      const heart = this.add.image(i * 22, 0, "heart").setScale(0.8);
      this.livesContainer.add(heart);
    }
  }

  update(): void {
    if (this.isGameOver || this.isPaused) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down;
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
    if (isMoving) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== "player-walk") {
        this.player.anims.play("player-walk");
      }
    } else {
      this.player.anims.stop();
      this.player.setTexture("player-static");
    }
    if ((this.cursors.space.isDown || this.cursors.up.isDown) && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
    }
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && this.gameState.hasPowerUp) {
      this.throwSandal();
    }
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      if (enemy.x <= 50 || enemy.x >= LEVEL_WIDTH - 50) {
        const newDirection = enemy.x <= 50 ? 1 : -1;
        enemyBody.setVelocityX(80 * newDirection);
        enemy.setFlipX(newDirection < 0);
        enemy.setData("direction", newDirection);
      } else {
        const currentDirection = enemy.getData("direction") as number;
        const targetDirection = this.player.x > enemy.x ? 1 : -1;
        if (currentDirection !== targetDirection) {
          enemy.setData("direction", targetDirection);
          enemyBody.setVelocityX(80 * targetDirection);
          enemy.setFlipX(targetDirection < 0);
        }
      }
    });

    // NOTE: Removed previous Level Width win check here.
    // The door overlap logic now handles the win condition.

    this.sandals.getChildren().forEach((child) => {
      const sandal = child as Phaser.Physics.Arcade.Sprite;
      const startX = sandal.getData("startX");
      const startY = sandal.getData("startY");
      const amplitude = sandal.getData("amplitude");
      const freq = sandal.getData("frequency");
      if (typeof startX === "number") {
        const distanceTraveled = Math.abs(sandal.x - startX);
        const yOffset = Math.abs(Math.sin(distanceTraveled * freq)) * amplitude;
        sandal.y = startY - yOffset;
      }
      if (sandal.x < 0 || sandal.x > LEVEL_WIDTH) {
        sandal.destroy();
      }
    });
  }
}
