import Phaser from 'phaser';
import { JUMP_VELOCITY, SANDAL_SPEED } from '../config';

interface GameState {
  score: number;
  lives: number;
  hasPowerUp: boolean;
}

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

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Reset game state
    this.gameState = { score: 0, lives: 3, hasPowerUp: false };
    this.isInvulnerable = false;
    this.canThrow = true;
    this.isGameOver = false;

    // Create static background
    this.createBackground(width, height);

    // Create ground (static)
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < width + 64; x += 64) {
      const tile = this.ground.create(x, height - 32, 'ground') as Phaser.Physics.Arcade.Sprite;
      tile.refreshBody();
    }

    // Create platforms (static)
    this.platforms = this.physics.add.staticGroup();
    this.createLevel();

    // Create groups
    this.sweets = this.physics.add.group();
    this.teas = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.sandals = this.physics.add.group();

    // Create player
    this.player = this.physics.add.sprite(100, height - 150, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setSize(20, 40);
    this.player.setOffset(6, 8);
    this.player.setGravityY(600);

    // Collisions
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);

    // Overlaps
    this.physics.add.overlap(this.player, this.sweets, this.collectSweet, undefined, this);
    this.physics.add.overlap(this.player, this.teas, this.collectTea, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);
    this.physics.add.overlap(this.sandals, this.enemies, this.sandalHitEnemy, undefined, this);

    // Input - Arrow keys for movement, Space for jump
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // HUD
    this.createHUD();

    // Spawn collectibles and enemies
    this.spawnLevelObjects();

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  createBackground(width: number, height: number): void {
    // Sky gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xFDF5E6, 0xFDF5E6, 1);
    bg.fillRect(0, 0, width, height);

    // Background arches
    for (let i = 0; i < 4; i++) {
      const arch = this.add.image(100 + i * 220, height - 180, 'arch');
      arch.setScale(1.8);
      arch.setAlpha(0.2);
    }

    // Floating lanterns
    for (let i = 0; i < 5; i++) {
      const lantern = this.add.image(80 + i * 170, 50 + Math.sin(i) * 20, 'lantern');
      lantern.setScale(0.6);
      lantern.setAlpha(0.6);
      this.tweens.add({
        targets: lantern,
        y: lantern.y - 10,
        duration: 2000 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  createLevel(): void {
    const { width, height } = this.cameras.main;

    // Create platforms at various positions
    const platformPositions = [
      { x: 200, y: height - 130 },
      { x: 350, y: height - 180 },
      { x: 500, y: height - 130 },
      { x: 650, y: height - 200 },
      { x: 150, y: height - 250 },
      { x: 450, y: height - 280 },
      { x: 600, y: height - 100 },
    ];

    platformPositions.forEach(pos => {
      const platform = this.platforms.create(pos.x, pos.y, 'platform') as Phaser.Physics.Arcade.Sprite;
      platform.refreshBody();
    });
  }

  spawnLevelObjects(): void {
    const { width, height } = this.cameras.main;

    // Spawn sweets on platforms and ground
    const sweetPositions = [
      { x: 200, y: height - 160 },
      { x: 350, y: height - 210 },
      { x: 500, y: height - 160 },
      { x: 650, y: height - 230 },
      { x: 150, y: height - 280 },
      { x: 300, y: height - 80 },
      { x: 550, y: height - 80 },
    ];

    sweetPositions.forEach(pos => {
      const sweet = this.sweets.create(pos.x, pos.y, 'chebakia') as Phaser.Physics.Arcade.Sprite;
      (sweet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.tweens.add({
        targets: sweet,
        y: sweet.y - 5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Spawn tea power-up
    const tea = this.teas.create(450, height - 310, 'tea') as Phaser.Physics.Arcade.Sprite;
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

    // Spawn enemies (cockroaches) that patrol
    const enemyPositions = [
      { x: 350, y: height - 80, range: 100 },
      { x: 600, y: height - 80, range: 80 },
      { x: 200, y: height - 160, range: 60 },
    ];

    enemyPositions.forEach(pos => {
      const enemy = this.enemies.create(pos.x, pos.y, 'cockroach') as Phaser.Physics.Arcade.Sprite;
      enemy.setSize(28, 20);
      enemy.setOffset(2, 6);
      (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);

      // Patrol behavior
      this.tweens.add({
        targets: enemy,
        x: enemy.x + pos.range,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Linear',
        onYoyo: () => enemy.setFlipX(true),
        onRepeat: () => enemy.setFlipX(false),
      });
    });
  }

  createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.4);
    hudBg.fillRoundedRect(10, 10, 180, 50, 8);

    this.scoreText = this.add.text(20, 18, 'Score: 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#FFD700',
    });

    this.livesContainer = this.add.container(20, 42);
    this.updateLivesDisplay();

    this.powerUpIndicator = this.add.container(680, 30);
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

    const popup = this.add.text(sweetSprite.x, sweetSprite.y, '+100', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#FFD700',
    });
    popup.setOrigin(0.5);
    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => popup.destroy(),
    });
  }

  collectTea(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    tea: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const teaSprite = tea as Phaser.Physics.Arcade.Sprite;
    teaSprite.destroy();

    this.gameState.hasPowerUp = true;
    this.powerUpIndicator.setVisible(true);
    this.player.setTint(0x32CD32);

    this.cameras.main.flash(200, 50, 205, 50);

    this.gameState.score += 500;
    this.scoreText.setText(`Score: ${this.gameState.score}`);

    const popup = this.add.text(teaSprite.x, teaSprite.y, 'POWER UP!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#32CD32',
    });
    popup.setOrigin(0.5);
    this.tweens.add({
      targets: popup,
      y: popup.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => popup.destroy(),
    });
  }

  handleEnemyCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;

    // Check if player is jumping on enemy (from above)
    if (playerBody.velocity.y > 0 && playerBody.bottom < enemyBody.center.y) {
      this.defeatEnemy(enemySprite);
      playerBody.setVelocityY(-300); // Bounce off
    } else if (!this.isInvulnerable) {
      this.takeDamage();
    }
  }

  defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Stop patrol tween
    this.tweens.killTweensOf(enemy);
    
    this.tweens.add({
      targets: enemy,
      scaleY: 0.2,
      alpha: 0,
      duration: 300,
      onComplete: () => enemy.destroy(),
    });

    this.gameState.score += 200;
    this.scoreText.setText(`Score: ${this.gameState.score}`);

    const popup = this.add.text(enemy.x, enemy.y, '+200', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#FF6347',
    });
    popup.setOrigin(0.5);
    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => popup.destroy(),
    });
  }

  throwSandal(): void {
    if (!this.gameState.hasPowerUp || !this.canThrow) return;

    this.canThrow = false;

    // Throw in the direction player is facing
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
    if (this.isGameOver) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down;

    // Horizontal movement with arrow keys
    if (this.cursors.left.isDown) {
      body.setVelocityX(-this.playerSpeed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(this.playerSpeed);
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    // Jump with space or up arrow
    if ((this.cursors.space.isDown || this.cursors.up.isDown) && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
    }

    // Throw sandal with X key when powered up
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && this.gameState.hasPowerUp) {
      this.throwSandal();
    }

    // Clean up off-screen sandals
    this.sandals.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.x < -50 || sprite.x > this.cameras.main.width + 50) {
        sprite.destroy();
      }
    });

    // Check win condition - all sweets collected
    if (this.sweets.countActive() === 0 && this.enemies.countActive() === 0) {
      this.gameState.score += 1000;
      this.gameOver();
    }
  }
}
