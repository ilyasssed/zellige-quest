import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private blinkTimer?: Phaser.Time.TimerEvent;
  private pressStartText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Solid background color
    this.cameras.main.setBackgroundColor('#2d1b4e');

    // Decorative lanterns from the game
    for (let i = 0; i < 5; i++) {
      const lantern = this.add.image(80 + i * 160, 30, 'lantern');
      lantern.setScale(0.5);
      lantern.setAlpha(0.6);
      this.tweens.add({
        targets: lantern,
        y: lantern.y - 8,
        duration: 2000 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Ground decoration at bottom
    for (let x = 0; x < width + 64; x += 64) {
      const tile = this.add.image(x, height - 20, 'ground');
      tile.setScale(0.6);
      tile.setAlpha(0.4);
    }

    // Decorative arches in background
    const arch1 = this.add.image(100, height - 80, 'arch');
    arch1.setScale(0.8);
    arch1.setAlpha(0.25);
    
    const arch2 = this.add.image(width - 100, height - 80, 'arch');
    arch2.setScale(0.8);
    arch2.setAlpha(0.25);

    // Floating collectibles as decoration
    const sweet1 = this.add.image(80, 120, 'chebakia');
    sweet1.setScale(1.5);
    sweet1.setAlpha(0.7);
    this.tweens.add({
      targets: sweet1,
      angle: 360,
      duration: 4000,
      repeat: -1,
    });

    const tea = this.add.image(width - 80, 130, 'tea');
    tea.setScale(1.2);
    tea.setAlpha(0.7);
    this.tweens.add({
      targets: tea,
      y: tea.y - 10,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Game title
    const title = this.add.text(width / 2, 80, 'MOROCCAN WEDDING RUN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#D4A574',
      stroke: '#8B2942',
      strokeThickness: 4,
      align: 'center',
    });
    title.setOrigin(0.5);

    // Start button
    const buttonContainer = this.add.container(width / 2, 160);
    
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x8B2942, 1);
    buttonBg.fillRoundedRect(-70, -20, 140, 40, 10);
    buttonBg.lineStyle(2, 0xD4A574);
    buttonBg.strokeRoundedRect(-70, -20, 140, 40, 10);
    
    const buttonText = this.add.text(0, 0, 'START', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    });
    buttonText.setOrigin(0.5);
    
    buttonContainer.add([buttonBg, buttonText]);
    buttonContainer.setSize(140, 40);
    buttonContainer.setInteractive({ useHandCursor: true });

    buttonContainer.on('pointerover', () => {
      this.tweens.add({
        targets: buttonContainer,
        scale: 1.1,
        duration: 100,
      });
    });

    buttonContainer.on('pointerout', () => {
      this.tweens.add({
        targets: buttonContainer,
        scale: 1,
        duration: 100,
      });
    });

    buttonContainer.on('pointerdown', () => this.startGame());

    // "Press Start" blinking text
    this.pressStartText = this.add.text(width / 2, 210, 'PRESS ENTER OR CLICK START', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#888888',
    });
    this.pressStartText.setOrigin(0.5);

    // Blinking effect
    this.blinkTimer = this.time.addEvent({
      delay: 600,
      callback: () => {
        if (this.pressStartText) {
          this.pressStartText.visible = !this.pressStartText.visible;
        }
      },
      loop: true,
    });

    // Copyright
    const copyright = this.add.text(width / 2, height - 10, '© 2026 MOROCCAN GAMES', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#444444',
    });
    copyright.setOrigin(0.5);

    // Keyboard input - Enter to start
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());

    // Start background music
    if (!this.sound.get('soundtrack')?.isPlaying) {
      const music = this.sound.add('soundtrack', { loop: true, volume: 0.4 });
      music.play();
    }

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  startGame(): void {
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
    }

    this.cameras.main.flash(200, 255, 255, 255);
    
    this.time.delayedCall(300, () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });
  }
}
