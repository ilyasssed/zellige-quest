import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number }): void {
    this.finalScore = data.score || 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2F1F0F, 0x2F1F0F, 0x5C3D2E, 0x5C3D2E, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative pattern overlay
    for (let i = 0; i < 20; i++) {
      const lantern = this.add.image(
        Math.random() * width,
        Math.random() * height,
        'lantern'
      );
      lantern.setScale(0.3 + Math.random() * 0.3);
      lantern.setAlpha(0.15);
    }

    // Game Over text
    const gameOverShadow = this.add.text(width / 2 + 4, height / 3 + 4, 'Game Over', {
      fontFamily: 'Amatic SC',
      fontSize: '72px',
      color: '#000000',
    });
    gameOverShadow.setOrigin(0.5);
    gameOverShadow.setAlpha(0.3);

    const gameOverText = this.add.text(width / 2, height / 3, 'Game Over', {
      fontFamily: 'Amatic SC',
      fontSize: '72px',
      color: '#8B2942',
    });
    gameOverText.setOrigin(0.5);

    // Score display
    const scoreContainer = this.add.container(width / 2, height / 2);
    
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0xD4A574, 0.3);
    scoreBg.fillRoundedRect(-120, -40, 240, 80, 16);
    scoreBg.lineStyle(3, 0xD4A574);
    scoreBg.strokeRoundedRect(-120, -40, 240, 80, 16);

    const scoreLabel = this.add.text(0, -15, 'Final Score', {
      fontFamily: 'Amiri',
      fontSize: '20px',
      color: '#D4A574',
    });
    scoreLabel.setOrigin(0.5);

    const scoreValue = this.add.text(0, 18, this.finalScore.toString(), {
      fontFamily: 'Amatic SC',
      fontSize: '48px',
      color: '#FFD700',
    });
    scoreValue.setOrigin(0.5);

    scoreContainer.add([scoreBg, scoreLabel, scoreValue]);

    // Animated sweets falling
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 300, () => {
        const sweet = this.add.image(
          100 + Math.random() * (width - 200),
          -50,
          'chebakia'
        );
        sweet.setScale(1.5);
        this.tweens.add({
          targets: sweet,
          y: height + 50,
          angle: 360,
          duration: 3000 + Math.random() * 2000,
          ease: 'Sine.easeIn',
          onComplete: () => sweet.destroy(),
        });
      });
    }

    // Retry button
    const retryButton = this.add.container(width / 2 - 90, height - 120);
    
    const retryBg = this.add.graphics();
    retryBg.fillStyle(0x8B2942, 1);
    retryBg.fillRoundedRect(-60, -25, 120, 50, 12);
    retryBg.lineStyle(3, 0xD4A574);
    retryBg.strokeRoundedRect(-60, -25, 120, 50, 12);
    
    const retryText = this.add.text(0, 0, '↻ Retry', {
      fontFamily: 'Amatic SC',
      fontSize: '32px',
      color: '#FDF5E6',
    });
    retryText.setOrigin(0.5);
    
    retryButton.add([retryBg, retryText]);
    retryButton.setSize(120, 50);
    retryButton.setInteractive({ useHandCursor: true });

    retryButton.on('pointerover', () => {
      this.tweens.add({ targets: retryButton, scale: 1.1, duration: 100 });
    });

    retryButton.on('pointerout', () => {
      this.tweens.add({ targets: retryButton, scale: 1, duration: 100 });
    });

    retryButton.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });

    // Menu button
    const menuButton = this.add.container(width / 2 + 90, height - 120);
    
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x1E8A88, 1);
    menuBg.fillRoundedRect(-60, -25, 120, 50, 12);
    menuBg.lineStyle(3, 0xD4A574);
    menuBg.strokeRoundedRect(-60, -25, 120, 50, 12);
    
    const menuText = this.add.text(0, 0, '🏠 Menu', {
      fontFamily: 'Amatic SC',
      fontSize: '32px',
      color: '#FDF5E6',
    });
    menuText.setOrigin(0.5);
    
    menuButton.add([menuBg, menuText]);
    menuButton.setSize(120, 50);
    menuButton.setInteractive({ useHandCursor: true });

    menuButton.on('pointerover', () => {
      this.tweens.add({ targets: menuButton, scale: 1.1, duration: 100 });
    });

    menuButton.on('pointerout', () => {
      this.tweens.add({ targets: menuButton, scale: 1, duration: 100 });
    });

    menuButton.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MenuScene');
      });
    });

    // Fade in
    this.cameras.main.fadeIn(500);
  }
}
