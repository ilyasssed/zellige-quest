import Phaser from 'phaser';
import { PLAYER_SPEED, JUMP_VELOCITY, SANDAL_SPEED } from '../config';

interface GameState {
  score: number;
  lives: number;
  hasPowerUp: boolean;
  level: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private sweets!: Phaser.Physics.Arcade.Group;
  private teas!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private sandals!: Phaser.Physics.Arcade.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  
  private gameState: GameState = {
    score: 0,
    lives: 3,
    hasPowerUp: false,
    level: 1,
  };

  private scoreText!: Phaser.GameObjects.Text;
  private livesContainer!: Phaser.GameObjects.Container;
  private powerUpIndicator!: Phaser.GameObjects.Container;
  
  private attackKey!: Phaser.Input.Keyboard.Key;
  private canThrow = true;
  private isInvulnerable = false;
  
  private touchStartX = 0;
  private touchStartY = 0;
  private isTouching = false;

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
      level: 1,
    };
    this.isInvulnerable = false;
    this.canThrow = true;

    // Create parallax background
    this.createBackground(width, height);

    // Create ground
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < width + 128; x += 64) {
      const tile = this.ground.create(x, height - 32, 'ground') as Phaser.Physics.Arcade.Sprite;
      tile.setScale(1).refreshBody();
    }

    // Create platforms
    this.platforms = this.physics.add.staticGroup();
    this.createLevel();

    // Create collectibles
    this.sweets = this.physics.add.group();
    this.teas = this.physics.add.group();
    this.createCollectibles();

    // Create enemies
    this.enemies = this.physics.add.group();
    this.createEnemies();

    // Create sandals group
    this.sandals = this.physics.add.group();

    // Create player
    this.player = this.physics.add.sprite(100, height - 150, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setSize(20, 40);
    this.player.setOffset(6, 8);

    // Collisions
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);

    // Overlaps
    this.physics.add.overlap(
      this.player,
      this.sweets,
      this.collectSweet,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.teas,
      this.collectTea,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handleEnemyCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.sandals,
      this.enemies,
      this.sandalHitEnemy,
      undefined,
      this
    );

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // Touch controls
    this.setupTouchControls();

    // HUD
    this.createHUD();

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
      const lantern = this.add.image(
        80 + i * 140,
        60 + Math.sin(i * 0.8) * 20,
        'lantern'
      );
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

  createLevel(): void {
    const { width, height } = this.cameras.main;

    // Platform layout
    const platformPositions = [
      { x: 200, y: height - 150 },
      { x: 350, y: height - 220 },
      { x: 500, y: height - 150 },
      { x: 650, y: height - 280 },
      { x: 150, y: height - 320 },
      { x: 400, y: height - 380 },
      { x: 600, y: height - 420 },
      { x: 250, y: height - 480 },
    ];

    platformPositions.forEach(pos => {
      const platform = this.platforms.create(pos.x, pos.y, 'platform') as Phaser.Physics.Arcade.Sprite;
      platform.refreshBody();
    });
  }

  createCollectibles(): void {
    const { height } = this.cameras.main;

    // Chebakia sweets
    const sweetPositions = [
      { x: 200, y: height - 190 },
      { x: 350, y: height - 260 },
      { x: 500, y: height - 190 },
      { x: 150, y: height - 360 },
      { x: 400, y: height - 420 },
      { x: 600, y: height - 460 },
      { x: 300, y: height - 100 },
      { x: 700, y: height - 100 },
    ];

    sweetPositions.forEach(pos => {
      const sweet = this.sweets.create(pos.x, pos.y, 'chebakia') as Phaser.Physics.Arcade.Sprite;
      (sweet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.tweens.add({
        targets: sweet,
        y: sweet.y - 5,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Mint tea power-ups
    const teaPositions = [
      { x: 650, y: height - 320 },
      { x: 250, y: height - 520 },
    ];

    teaPositions.forEach(pos => {
      const tea = this.teas.create(pos.x, pos.y, 'tea') as Phaser.Physics.Arcade.Sprite;
      (tea.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      tea.setScale(1.2);
      this.tweens.add({
        targets: tea,
        y: tea.y - 8,
        angle: 5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  createEnemies(): void {
    const { width, height } = this.cameras.main;

    const enemyPositions = [
      { x: 400, y: height - 80, speed: 50 },
      { x: 600, y: height - 80, speed: 70 },
      { x: 200, y: height - 180, speed: 40 },
      { x: 500, y: height - 180, speed: 60 },
    ];

    enemyPositions.forEach(pos => {
      const enemy = this.enemies.create(pos.x, pos.y, 'cockroach') as Phaser.Physics.Arcade.Sprite;
      enemy.setData('speed', pos.speed);
      enemy.setData('direction', 1);
      enemy.setBounce(0);
      enemy.setSize(28, 20);
      enemy.setOffset(2, 6);
    });
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

  setupTouchControls(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
      this.isTouching = true;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const deltaY = this.touchStartY - pointer.y;
      
      // Swipe up to jump
      if (deltaY > 50 && this.player.body!.touching.down) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(JUMP_VELOCITY);
      }
      
      this.isTouching = false;
    });
  }

  collectSweet(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    sweet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const sweetSprite = sweet as Phaser.Physics.Arcade.Sprite;
    
    // Collection effect
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

    // Power-up effect on player
    this.player.setTint(0x32CD32);
    
    // Flash effect
    this.cameras.main.flash(200, 50, 205, 50);

    // Big score bonus
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
      playerBody.setVelocityY(-250); // Bounce
    } else if (!this.isInvulnerable) {
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

    // Knockback
    const knockbackDir = this.player.flipX ? 150 : -150;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(knockbackDir, -200);

    // Camera shake
    this.cameras.main.shake(200, 0.01);

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  throwSandal(): void {
    if (!this.gameState.hasPowerUp || !this.canThrow) return;

    this.canThrow = false;
    
    const direction = this.player.flipX ? -1 : 1;
    const sandal = this.sandals.create(
      this.player.x + direction * 20,
      this.player.y,
      'sandal'
    ) as Phaser.Physics.Arcade.Sprite;
    
    const sandalBody = sandal.body as Phaser.Physics.Arcade.Body;
    sandalBody.setAllowGravity(false);
    sandalBody.setVelocityX(SANDAL_SPEED * direction);
    sandal.setFlipX(direction < 0);

    // Spinning animation
    this.tweens.add({
      targets: sandal,
      angle: direction > 0 ? 360 : -360,
      duration: 500,
      repeat: -1,
    });

    // Destroy after distance
    this.time.delayedCall(1000, () => {
      if (sandal.active) {
        sandal.destroy();
      }
    });

    // Cooldown
    this.time.delayedCall(300, () => {
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

  gameOver(): void {
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', { score: this.gameState.score });
    });
  }

  update(): void {
    if (!this.player || !this.player.body) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Horizontal movement
    if (this.cursors.left.isDown) {
      body.setVelocityX(-PLAYER_SPEED);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(PLAYER_SPEED);
      this.player.setFlipX(false);
    } else if (this.isTouching) {
      // Touch controls
      const pointer = this.input.activePointer;
      const { width } = this.cameras.main;
      
      if (pointer.x < width / 3) {
        body.setVelocityX(-PLAYER_SPEED);
        this.player.setFlipX(true);
      } else if (pointer.x > (width * 2) / 3) {
        body.setVelocityX(PLAYER_SPEED);
        this.player.setFlipX(false);
      } else {
        body.setVelocityX(0);
      }
    } else {
      body.setVelocityX(0);
    }

    // Jumping
    if ((this.cursors.up.isDown || this.cursors.space.isDown) && body.touching.down) {
      body.setVelocityY(JUMP_VELOCITY);
    }

    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.throwSandal();
    }

    // Update enemies
    this.enemies.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy || !enemy.body) return true;
      
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      const speed = enemy.getData('speed') as number;
      let direction = enemy.getData('direction') as number;

      // Simple patrol
      if (enemy.x < 100 || (enemyBody.blocked.left)) {
        direction = 1;
        enemy.setData('direction', 1);
        enemy.setFlipX(false);
      } else if (enemy.x > 700 || (enemyBody.blocked.right)) {
        direction = -1;
        enemy.setData('direction', -1);
        enemy.setFlipX(true);
      }

      enemyBody.setVelocityX(speed * direction);
      return true;
    });

    // Check fall death
    if (this.player.y > 650) {
      this.takeDamage();
      this.player.setPosition(100, 400);
    }
  }
}
