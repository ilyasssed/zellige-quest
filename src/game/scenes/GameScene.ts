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

// Increased width to fit designed level
const LEVEL_WIDTH = 3000;
const LEVEL_HEIGHT = 400;
const GROUND_Y = LEVEL_HEIGHT - 32;

// Physics constants
const PLAYER_GRAVITY = 1400;
const JUMP_VELOCITY_VALUE = 450;
const MAX_JUMP_HEIGHT = (JUMP_VELOCITY_VALUE * JUMP_VELOCITY_VALUE) / (2 * PLAYER_GRAVITY);

// Dimensions
const PLATFORM_HEIGHT = 32;
const STEP_PIXELS = 20; // 1 step = 20px

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

  // Defines the layout step-by-step
  buildDesignedLevel(): void {
    let currentX = 200; // Starting offset
    const STANDARD_WIDTH = 128; // ~2 tiles
    const DOUBLE_WIDTH = 256; // ~4 tiles

    // Reduced gap from 5 steps to 3 steps (60px instead of 100px)
    const gap3steps = 3 * STEP_PIXELS; // 60px

    // --- PART 1: The First 3 Platforms ---

    // 1. Platform at Level 1
    currentX += gap3steps;
    this.addPlatformData(currentX, LEVEL_1_Y, STANDARD_WIDTH);
    this.addItemData(currentX, LEVEL_1_Y, "sweet");

    // 2. Platform at Level 2 ("after it... same distance")
    currentX += STANDARD_WIDTH + gap3steps;
    this.addPlatformData(currentX, LEVEL_2_Y, STANDARD_WIDTH);
    this.addItemData(currentX, LEVEL_2_Y, "sweet");

    // 3. Platform at Level 1 ("same distance")
    currentX += STANDARD_WIDTH + gap3steps;
    this.addPlatformData(currentX, LEVEL_1_Y, STANDARD_WIDTH);
    this.addItemData(currentX, LEVEL_1_Y, "sweet");

    // --- PART 2: The Big Jump ---

    // "Then move for 20 steps"
    const gap20steps = 20 * STEP_PIXELS; // 400px
    currentX += STANDARD_WIDTH + gap20steps;

    // 4. Platform at Level 1 (Shortened to STANDARD_WIDTH)
    this.addPlatformData(currentX, LEVEL_1_Y, STANDARD_WIDTH);
    this.addItemData(currentX, LEVEL_1_Y, "sweet");

    // 5. Platform at Level 2 (Double Width)
    currentX += STANDARD_WIDTH + gap3steps;
    this.addPlatformData(currentX, LEVEL_2_Y, DOUBLE_WIDTH);

    // "Second having 2 sweets separated by half the platform size"
    const separation = DOUBLE_WIDTH / 2;
    this.addItemData(currentX - separation / 2, LEVEL_2_Y, "sweet");
    this.addItemData(currentX + separation / 2, LEVEL_2_Y, "sweet");

    // 6. Platform at Level 3
    currentX += DOUBLE_WIDTH + gap3steps;
    this.addPlatformData(currentX, LEVEL_3_Y, STANDARD_WIDTH);
    this.addItemData(currentX, LEVEL_3_Y, "tea");
  }

  // Helper to store platform coordinates
  addPlatformData(x: number, y: number, width: number): void {
    this.platformData.push({ x, y, width });
  }

  // Helper to store item coordinates
  addItemData(x: number, y: number, type: "sweet" | "tea"): void {
    // Items float slightly above the platform (y - 50)
    this.itemsToSpawn.push({ x, y: y - 50, type });
  }

  createPlatforms(): void {
    this.platformData.forEach((data) => {
      const tileWidth = 64;
      const tilesNeeded = Math.ceil(data.width / tileWidth);
      const startX = data.x - ((tilesNeeded - 1) * tileWidth) / 2;

      for (let i = 0; i < tilesNeeded; i++) {
        const platform = this.platforms.create(
          startX + i * tileWidth,
          data.y,
          "platform"
        ) as Phaser.Physics.Arcade.Sprite;
        platform.refreshBody();
      }
    });
  }

  spawnLevelObjects(): void {
    // Iterate through the manually designed list
    this.itemsToSpawn.forEach((item) => {
      if (item.type === "sweet") {
        this.createSweet(item.x, item.y);
      } else if (item.type === "tea") {
        this.createTea(item.x, item.y);
      }
    });

    // Enemies can still be random
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
    const numEnemies = 5;
    const spacing = LEVEL_WIDTH / (numEnemies + 1);

    for (let i = 1; i <= numEnemies; i++) {
      const x = spacing * i;
      if (x > 300) {
        const enemy = this.enemies.create(x, GROUND_Y - 100, "cockroach") as Phaser.Physics.Arcade.Sprite;

        const width = enemy.width;
        const height = enemy.height;
        enemy.setScale(0.1);

        const hitWidth = width * 0.6;
        const hitHeight = height * 0.5;

        enemy.setSize(hitWidth, hitHeight);
        enemy.setOffset((width - hitWidth) / 2, height - hitHeight);

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
    this.pauseMenu = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(200);
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x2f1f0f, 1);
    menuBg.fillRoundedRect(-120, -100, 240, 200, 16);
    menuBg.lineStyle(3, 0xd4a574);
    menuBg.strokeRoundedRect(-120, -100, 240, 200, 16);
    const title = this.add.text(0, -70, "PAUSED", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "20px",
      color: "#D4A574",
    }).setOrigin(0.5);
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
    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#FFFFFF",
    }).setOrigin(0.5);
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
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
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
    this.sound.play("munch", { volume: 0.6 });
  }

  handleEnemyCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
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
    sandalBody.setVelocityX(SANDAL_SPEED * direction);
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
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
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
    this.scoreText = this.add.text(20, 18, "Score: 0", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "12px",
      color: "#FFD700",
    }).setScrollFactor(0);
    this.livesContainer = this.add.container(20, 42).setScrollFactor(0);
    this.updateLivesDisplay();
    this.powerUpIndicator = this.add.container(680, 30).setScrollFactor(0);
    const powerUpBg = this.add.graphics();
    powerUpBg.fillStyle(0x228b22, 0.9);
    powerUpBg.fillRoundedRect(-60, -15, 120, 30, 8);
    const powerUpText = this.add.text(0, 0, "X = THROW", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#FFFFFF",
    }).setOrigin(0.5);
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
    if (this.player.x >= LEVEL_WIDTH - 100) {
      this.gameState.score += 1000;
      this.gameOver();
    }
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
