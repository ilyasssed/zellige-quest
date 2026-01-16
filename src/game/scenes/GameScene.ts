import Phaser from "phaser";
import { JUMP_VELOCITY, SANDAL_SPEED, PLAYER_SPEED } from "../config";

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

// 1. REDUCED LEVEL WIDTH (Shorter Level)
const LEVEL_WIDTH = 4000;
const LEVEL_HEIGHT = 400;
const GROUND_Y = LEVEL_HEIGHT - 32;

const PLAYER_GRAVITY = 1400;
const JUMP_VELOCITY_VALUE = 450;
const MAX_JUMP_HEIGHT = (JUMP_VELOCITY_VALUE * JUMP_VELOCITY_VALUE) / (2 * PLAYER_GRAVITY);

const PLATFORM_HEIGHT = 32;
const STEP_PIXELS = 20;
const PLATFORM_SCALE = 0.15;
const DOOR_SCALE = 0.2;

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
    this.gameState = { score: 0, lives: 3, hasPowerUp: false };
    this.isInvulnerable = false;
    this.canThrow = true;
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.platformData = [];
    this.itemsToSpawn = [];

    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.createBackground();

    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < LEVEL_WIDTH + 64; x += 64) {
      const tile = this.ground.create(x, LEVEL_HEIGHT - 16, "ground") as Phaser.Physics.Arcade.Sprite;
      tile.refreshBody();
    }

    this.buildDesignedLevel();

    this.platforms = this.physics.add.staticGroup();
    this.createPlatforms();

    this.sweets = this.physics.add.group();
    this.teas = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.sandals = this.physics.add.group();

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

    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0);
    this.cameras.main.setDeadzone(200, LEVEL_HEIGHT);

    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    // Enemy touches platform -> call enemyHitPlatform
    this.physics.add.collider(this.enemies, this.platforms, this.enemyHitPlatform, undefined, this);

    this.physics.add.overlap(this.player, this.sweets, this.collectSweet, undefined, this);
    this.physics.add.overlap(this.player, this.teas, this.collectTea, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);
    this.physics.add.overlap(this.sandals, this.enemies, this.sandalHitEnemy, undefined, this);

    if (this.door) {
      this.physics.add.overlap(this.player, this.door, this.handleReachDoor, undefined, this);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    this.createHUD();
    this.spawnLevelObjects();

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
  addSinglePlatform(startX: number, y: number, width: number, itemType?: "sweet" | "tea"): number {
    const centerX = startX + width / 2;
    this.platformData.push({ x: centerX, y, width });

    if (itemType === "sweet") {
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
    return startX + width;
  }

  createBlock1(startX: number): number {
    const STANDARD_WIDTH = 128;
    const GAP_SMALL = 50 * 1.5;
    let cursor = startX;
    cursor = this.addSinglePlatform(cursor, LEVEL_1_Y, STANDARD_WIDTH, "sweet");
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_2_Y, STANDARD_WIDTH, "sweet");
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_1_Y, STANDARD_WIDTH, "sweet");
    return cursor;
  }

  createBlock2(startX: number): number {
    const STANDARD_WIDTH = 128;
    const DOUBLE_WIDTH = 256;
    const GAP_SMALL = 50 * 1.5;
    let cursor = startX;
    cursor = this.addSinglePlatform(cursor, LEVEL_1_Y, STANDARD_WIDTH, "sweet");
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_2_Y, DOUBLE_WIDTH, "sweet");
    cursor += GAP_SMALL;
    cursor = this.addSinglePlatform(cursor, LEVEL_3_Y, STANDARD_WIDTH, "sweet");
    return cursor;
  }

  buildDesignedLevel(): void {
    const STANDARD_WIDTH = 128;
    const CHAR_WIDTH = 50;

    const GAP_1_5_CHAR = CHAR_WIDTH * 1.5;
    const GAP_10_STEPS = 10 * STEP_PIXELS;
    const GAP_20_STEPS = 20 * STEP_PIXELS;
    const GAP_5_STEPS = 5 * STEP_PIXELS;

    let cursor = 200;

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

    // Door at end of level bounds
    this.createDoor(LEVEL_WIDTH - 200);
  }

  createDoor(x: number): void {
    const yAdjustment = -16;
    this.door = this.physics.add.sprite(x, GROUND_Y + yAdjustment, "door1");
    this.door.setDepth(0);
    this.door.setScale(DOOR_SCALE);
    this.door.setOrigin(0.5, 1);
    this.door.setImmovable(true);
    (this.door.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.door.refreshBody();
  }

  handleReachDoor(): void {
    if (this.isLevelComplete) return;
    if (Math.abs(this.player.x - this.door.x) > 20) {
      return;
    }

    this.isLevelComplete = true;
    this.door.play("door-open");

    this.player.setVelocityX(0);
    this.player.anims.stop();
    this.player.setTexture("player-static");
    // 2. REMOVED GREEN TINT
    // this.player.setTint(0x00ff00);

    this.time.delayedCall(1000, () => {
      this.gameState.score += 1000;
      this.scene.start("GameOverScene", { score: this.gameState.score });
    });
  }

  addItemData(x: number, y: number, type: "sweet" | "tea"): void {
    this.itemsToSpawn.push({ x, y: y - 50, type });
  }

  createPlatforms(): void {
    const texture = this.textures.get("platform");
    const originalHeight = texture.getSourceImage().height;
    const targetHeight = originalHeight * PLATFORM_SCALE;

    this.platformData.forEach((data) => {
      const platform = this.platforms.create(data.x, data.y, "platform") as Phaser.Physics.Arcade.Sprite;
      platform.setDisplaySize(data.width, targetHeight);
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

        const hitWidth = width * 0.4;
        const hitHeight = height * 0.5;
        enemy.setSize(hitWidth, hitHeight);
        enemy.setOffset((width - hitWidth) / 2, height - hitHeight);

        const body = enemy.body as Phaser.Physics.Arcade.Body;
        body.setBounce(0, 0);

        // 3. FIXED MOVEMENT: Random direction at start, does not follow player
        const direction = Math.random() < 0.5 ? 1 : -1;
        body.setVelocityX(80 * direction);
        enemy.setData("direction", direction);
        enemy.setFlipX(direction < 0);

        // 4. ADDED HP
        enemy.setData("hp", 1); // 1 life point
      }
    }
  }

  // Called when Enemy hits a Platform (Wall)
  enemyHitPlatform(
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const body = enemySprite.body as Phaser.Physics.Arcade.Body;

    // Only bounce if hitting the SIDE of a platform (blocked left/right)
    if (body.blocked.left || body.blocked.right || body.touching.left || body.touching.right) {
      const currentDir = enemySprite.getData("direction");
      const newDir = -currentDir;

      body.setVelocityX(80 * newDir);
      enemySprite.setFlipX(newDir < 0);
      enemySprite.setData("direction", newDir);
    }
  }

  handleEnemyCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;

    // 5. IMPROVED STOMP LOGIC
    // Player is falling
    const isFalling = playerBody.velocity.y > 0;
    // Player's feet are above enemy's feet (more forgiving than center)
    // We allow hitting anywhere on the top 70% of the enemy
    const isAbove = playerBody.bottom <= enemyBody.bottom - enemyBody.height * 0.3;

    if (isFalling && isAbove) {
      this.defeatEnemy(enemySprite);
      // Small bounce to prevent falling through
      playerBody.setVelocityY(-350);
    } else if (!this.isInvulnerable) {
      this.takeDamage();
    }
  }

  defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    // 6. HEALTH LOGIC
    let hp = enemy.getData("hp");
    hp--;
    enemy.setData("hp", hp);

    if (hp <= 0) {
      this.sound.play("enemyDeath", { volume: 0.5 });
      // Disable body so it can't kill you while dying animation plays
      enemy.disableBody();

      this.tweens.add({
        targets: enemy,
        scaleY: 0.2,
        alpha: 0,
        duration: 300,
        onComplete: () => enemy.destroy(),
      });
      this.gameState.score += 200;
      this.scoreText.setText(`Score: ${this.gameState.score}`);
    } else {
      // Hit effect (blink red) if not dead yet (for future bosses)
      enemy.setTint(0xff0000);
      this.time.delayedCall(100, () => enemy.clearTint());
    }
  }

  update(): void {
    if (this.isGameOver || this.isPaused || this.isLevelComplete) return;

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

    // UPDATE ENEMY PATROL
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;

      // Patrol Check: World Bounds
      // If enemy hits left (50px) or right (LEVEL_WIDTH - 50) edges of world
      if ((enemy.x <= 50 && enemyBody.velocity.x < 0) || (enemy.x >= LEVEL_WIDTH - 50 && enemyBody.velocity.x > 0)) {
        const currentDir = enemy.getData("direction");
        const newDir = -currentDir;

        enemyBody.setVelocityX(80 * newDir);
        enemy.setFlipX(newDir < 0);
        enemy.setData("direction", newDir);
      }
      // Note: We REMOVED the "Target Player" logic block here.
    });

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

  // --- Helper methods (collectSweet, collectTea, takeDamage, gameOver, etc.) remain unchanged ---
  collectSweet(player: any, sweet: any): void {
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

  collectTea(player: any, tea: any): void {
    const teaSprite = tea as Phaser.Physics.Arcade.Sprite;
    teaSprite.destroy();
    this.gameState.hasPowerUp = true;
    this.powerUpIndicator.setVisible(true);
    this.cameras.main.flash(200, 50, 205, 50);
    this.gameState.score += 500;
    this.scoreText.setText(`Score: ${this.gameState.score}`);
    this.sound.play("munch", { volume: 0.6 });
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
    sandal.setData({ startY: startY, startX: startX, amplitude: amplitude, frequency: 0.05 });
    this.tweens.add({ targets: sandal, angle: 360 * direction, duration: 300, repeat: -1 });
    this.time.delayedCall(1500, () => {
      if (sandal.active) sandal.destroy();
    });
    this.time.delayedCall(400, () => {
      this.canThrow = true;
    });
  }

  sandalHitEnemy(sandal: any, enemy: any): void {
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
      .text(20, 18, "Score: 0", { fontFamily: '"Press Start 2P", monospace', fontSize: "12px", color: "#FFD700" })
      .setScrollFactor(0);
    this.livesContainer = this.add.container(20, 42).setScrollFactor(0);
    this.updateLivesDisplay();
    this.powerUpIndicator = this.add.container(680, 30).setScrollFactor(0);
    const powerUpBg = this.add.graphics();
    powerUpBg.fillStyle(0x228b22, 0.9);
    powerUpBg.fillRoundedRect(-60, -15, 120, 30, 8);
    const powerUpText = this.add
      .text(0, 0, "X = THROW", { fontFamily: '"Press Start 2P", monospace', fontSize: "10px", color: "#FFFFFF" })
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

  createControlButtons(): void {
    // ... (Keep existing button code)
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
    this.soundButton.on("pointerdown", () => {
      this.sound.mute = !this.sound.mute;
      const icon = this.soundButton?.getByName("soundIcon") as Phaser.GameObjects.Text;
      if (icon) icon.setText(this.sound.mute ? "🔇" : "🔊");
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
    // ... (Keep existing pause menu code)
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
      .text(0, -70, "PAUSED", { fontFamily: '"Press Start 2P", monospace', fontSize: "20px", color: "#D4A574" })
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
      .text(0, 0, text, { fontFamily: '"Press Start 2P", monospace', fontSize: "10px", color: "#FFFFFF" })
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
}
