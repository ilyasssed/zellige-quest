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
  private sweets!: Phaser.Physics.Arcade.Group;
  private teas!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private sandals!: Phaser.Physics.Arcade.Group;
  
  private gameState: GameState = {
    score: 0,
    lives: 3,
    hasPowerUp: false,
  };

  private scoreText!: Phaser.GameObjects.Text;
  private livesContainer!: Phaser.GameObjects.Container;
  private powerUpIndicator!: Phaser.GameObjects.Container;
  
  private attackKey!: Phaser.Input.Keyboard.Key;
  private canThrow = true;
  private isInvulnerable = false;
  private isGameOver = false;
  
  private gameSpeed = 250;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private difficultyTimer!: Phaser.Time.TimerEvent;
  private scoreTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Reset game state
    this.gameState = {
      score: 0,
      lives: 3,
      hasPowerUp: false,
    };
    this.isInvulnerable = false;
    this.canThrow = true;
    this.isGameOver = false;
    this.gameSpeed = 250;

    // Create parallax background
    this.createBackground(width, height);

    // Create ground
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < width + 128; x += 64) {
      const tile = this.ground.create(x, height - 32, 'ground') as Phaser.Physics.Arcade.Sprite;
      tile.setScale(1).refreshBody();
    }

    // Create groups
    this.sweets = this.physics.add.group();
    this.teas = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.obstacles = this.physics.add.group();
    this.sandals = this.physics.add.group();

    // Create player (positioned on the left side)
    this.player = this.physics.add.sprite(100, height - 100, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setSize(20, 40);
    this.player.setOffset(6, 8);
    this.player.setGravityY(400);

    // Collisions
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.obstacles, this.ground);

    // Overlaps
    this.physics.add.overlap(this.player, this.sweets, this.collectSweet, undefined, this);
    this.physics.add.overlap(this.player, this.teas, this.collectTea, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleCollision, undefined, this);
    this.physics.add.overlap(this.sandals, this.enemies, this.sandalHitEnemy, undefined, this);

    // Input - Space or click/tap to jump
    this.input.keyboard?.on('keydown-SPACE', () => this.jump());
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    
    // Touch/click to jump
    this.input.on('pointerdown', () => this.jump());

    // HUD
    this.createHUD();

    // Start spawning obstacles and collectibles
    this.startSpawning();

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  createBackground(width: number, height: number): void {
    // Sky gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xFDF5E6, 0xFDF5E6, 1);
    bg.fillRect(0, 0, width, height);

    // Background arches (far layer)
    for (let i = 0; i < 4; i++) {
      const arch = this.add.image(100 + i * 250, height - 180, 'arch');
      arch.setScale(2);
      arch.setAlpha(0.2);
      arch.setTint(0xD4A574);
    }

    // Floating lanterns
    for (let i = 0; i < 6; i++) {
      const lantern = this.add.image(80 + i * 140, 60 + Math.sin(i * 0.8) * 20, 'lantern');
      lantern.setScale(0.6);
      lantern.setAlpha(0.7);
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

  createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.3);
    hudBg.fillRoundedRect(10, 10, 200, 50, 8);

    // Score
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Amatic SC',
      fontSize: '28px',
      color: '#FFD700',
    });

    // Lives
    this.livesContainer = this.add.container(20, 45);
    this.updateLivesDisplay();

    // Power-up indicator
    this.powerUpIndicator = this.add.container(680, 30);
    const powerUpBg = this.add.graphics();
    powerUpBg.fillStyle(0x228B22, 0.8);
    powerUpBg.fillRoundedRect(-50, -15, 100, 30, 8);
    const powerUpText = this.add.text(0, 0, '🍵 POWERED UP!', {
      fontFamily: 'Amiri',
      fontSize: '12px',
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

  startSpawning(): void {
    // Spawn objects
    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      callback: this.spawnObject,
      callbackScope: this,
      loop: true,
    });

    // Increase difficulty over time
    this.difficultyTimer = this.time.addEvent({
      delay: 8000,
      callback: () => {
        this.gameSpeed = Math.min(this.gameSpeed + 25, 450);
        // Restart spawn timer with faster delay
        if (this.spawnTimer.delay > 600) {
          const newDelay = this.spawnTimer.delay - 50;
          this.spawnTimer.remove();
          this.spawnTimer = this.time.addEvent({
            delay: newDelay,
            callback: this.spawnObject,
            callbackScope: this,
            loop: true,
          });
        }
      },
      callbackScope: this,
      loop: true,
    });

    // Score increases over time (survival bonus)
    this.scoreTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isGameOver) {
          this.gameState.score += 10;
          this.scoreText.setText(`Score: ${this.gameState.score}`);
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  spawnObject(): void {
    if (this.isGameOver) return;

    const { width, height } = this.cameras.main;
    const rand = Math.random();

    if (rand < 0.35) {
      // Spawn chebakia (sweet) - at ground level or slightly above
      const yPos = height - 80 - Math.random() * 40;
      const sweet = this.sweets.create(width + 50, yPos, 'chebakia') as Phaser.Physics.Arcade.Sprite;
      const body = sweet.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setVelocityX(-this.gameSpeed);

      this.tweens.add({
        targets: sweet,
        y: sweet.y - 8,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (rand < 0.45) {
      // Spawn tea power-up
      const tea = this.teas.create(width + 50, height - 100, 'tea') as Phaser.Physics.Arcade.Sprite;
      const body = tea.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setVelocityX(-this.gameSpeed);
      tea.setScale(1.2);

      this.tweens.add({
        targets: tea,
        y: tea.y - 10,
        alpha: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (rand < 0.75) {
      // Spawn cockroach enemy
      const enemy = this.enemies.create(width + 50, height - 80, 'cockroach') as Phaser.Physics.Arcade.Sprite;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setVelocityX(-this.gameSpeed - 30);
      enemy.setSize(28, 20);
      enemy.setOffset(2, 6);
    } else {
      // Spawn obstacle (pot/vase)
      const obstacle = this.obstacles.create(width + 50, height - 80, 'platform') as Phaser.Physics.Arcade.Sprite;
      const body = obstacle.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setVelocityX(-this.gameSpeed);
      obstacle.setScale(0.8);
    }
  }

  jump(): void {
    if (this.isGameOver) return;
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.touching.down || body.blocked.down) {
      body.setVelocityY(JUMP_VELOCITY);
      
      // Jump squash and stretch animation
      this.tweens.add({
        targets: this.player,
        scaleX: 0.8,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
      });
    } else if (this.gameState.hasPowerUp) {
      // Throw sandal when in air with power-up
      this.throwSandal();
    }
  }

  throwSandal(): void {
    if (!this.gameState.hasPowerUp || !this.canThrow) return;

    this.canThrow = false;

    const sandal = this.sandals.create(this.player.x + 30, this.player.y, 'sandal') as Phaser.Physics.Arcade.Sprite;
    const sandalBody = sandal.body as Phaser.Physics.Arcade.Body;
    sandalBody.setAllowGravity(false);
    sandalBody.setVelocityX(SANDAL_SPEED);

    // Spinning animation
    this.tweens.add({
      targets: sandal,
      angle: 360,
      duration: 300,
      repeat: -1,
    });

    // Destroy after distance
    this.time.delayedCall(1500, () => {
      if (sandal.active) sandal.destroy();
    });

    // Cooldown
    this.time.delayedCall(400, () => {
      this.canThrow = true;
    });
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

    // Score popup
    const popup = this.add.text(sweetSprite.x, sweetSprite.y, '+100', {
      fontFamily: 'Amatic SC',
      fontSize: '24px',
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

    const popup = this.add.text(teaSprite.x, teaSprite.y, 'POWER UP! +500', {
      fontFamily: 'Amatic SC',
      fontSize: '28px',
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

    // Check if player is jumping on enemy
    if (playerBody.velocity.y > 0 && playerBody.y < enemyBody.y - 10) {
      this.defeatEnemy(enemySprite);
      playerBody.setVelocityY(-250);
    } else if (!this.isInvulnerable) {
      this.takeDamage();
    }
  }

  handleObstacleCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    obstacle: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    if (!this.isInvulnerable) {
      const obstacleSprite = obstacle as Phaser.Physics.Arcade.Sprite;
      obstacleSprite.destroy();
      this.takeDamage();
    }
  }

  defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    this.tweens.add({
      targets: enemy,
      scale: 0,
      angle: 180,
      duration: 300,
      onComplete: () => enemy.destroy(),
    });

    this.gameState.score += 200;
    this.scoreText.setText(`Score: ${this.gameState.score}`);

    const popup = this.add.text(enemy.x, enemy.y, '+200', {
      fontFamily: 'Amatic SC',
      fontSize: '24px',
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

    // Flash player
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

    // Camera shake
    this.cameras.main.shake(200, 0.01);

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  gameOver(): void {
    this.isGameOver = true;
    this.spawnTimer.destroy();
    this.difficultyTimer.destroy();
    this.scoreTimer.destroy();

    this.physics.pause();
    this.player.setTint(0xff0000);

    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', { score: this.gameState.score });
    });
  }

  update(): void {
    if (this.isGameOver) return;

    // Throw sandal with X key
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && this.gameState.hasPowerUp) {
      this.throwSandal();
    }

    // Clean up off-screen objects
    [this.sweets, this.teas, this.enemies, this.obstacles].forEach(group => {
      group.getChildren().forEach((child) => {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (sprite.x < -100) sprite.destroy();
      });
    });

    this.sandals.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.x > this.cameras.main.width + 100) sprite.destroy();
    });
  }
}
