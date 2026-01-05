import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private blinkTimer?: Phaser.Time.TimerEvent;
  private pressStartText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Solid dark background (Nintendo style)
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Character sprite from uploaded image - centered
    const characters = this.add.image(width / 2, height / 2 - 20, 'menuCharacters');
    characters.setScale(0.6);
    
    // Subtle float animation
    this.tweens.add({
      targets: characters,
      y: characters.y - 8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Game title - pixel style
    const title = this.add.text(width / 2, 60, 'MOROCCAN WEDDING RUN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#D4A574',
      stroke: '#8B2942',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // "Press Start" blinking text
    this.pressStartText = this.add.text(width / 2, height - 80, 'PRESS START', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.pressStartText.setOrigin(0.5);

    // Blinking effect
    this.blinkTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        if (this.pressStartText) {
          this.pressStartText.visible = !this.pressStartText.visible;
        }
      },
      loop: true,
    });

    // Copyright style text at bottom
    const copyright = this.add.text(width / 2, height - 30, '© 2026 MOROCCAN GAMES', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#666666',
    });
    copyright.setOrigin(0.5);

    // Input handlers
    this.input.keyboard?.on('keydown', this.startGame, this);
    this.input.on('pointerdown', this.startGame, this);

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  startGame(): void {
    // Stop blink timer
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
    }

    // Flash effect before starting
    this.cameras.main.flash(200, 255, 255, 255);
    
    this.time.delayedCall(300, () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });
  }
}
