import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xFDF5E6, 0xFDF5E6, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative arches in background
    for (let i = 0; i < 3; i++) {
      const arch = this.add.image(200 + i * 200, height - 100, 'arch');
      arch.setScale(1.5);
      arch.setAlpha(0.3);
    }

    // Floating lanterns
    for (let i = 0; i < 5; i++) {
      const lantern = this.add.image(
        100 + i * 150,
        80 + Math.sin(i) * 30,
        'lantern'
      );
      lantern.setScale(0.8);
      this.tweens.add({
        targets: lantern,
        y: lantern.y - 15,
        duration: 2000 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Title with shadow
    const titleShadow = this.add.text(width / 2 + 4, 104, '🇲🇦 Moroccan Wedding Run 🇲🇦', {
      fontFamily: 'Amatic SC',
      fontSize: '56px',
      color: '#000000',
    });
    titleShadow.setOrigin(0.5);
    titleShadow.setAlpha(0.3);

    const title = this.add.text(width / 2, 100, '🇲🇦 Moroccan Wedding Run 🇲🇦', {
      fontFamily: 'Amatic SC',
      fontSize: '56px',
      color: '#8B2942',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, 160, 'A Platformer Adventure', {
      fontFamily: 'Amiri',
      fontSize: '24px',
      color: '#D4A574',
    });
    subtitle.setOrigin(0.5);

    // Player preview
    const player = this.add.image(width / 2, height / 2, 'player');
    player.setScale(3);
    this.tweens.add({
      targets: player,
      y: player.y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Decorative collectibles around player
    const chebakia1 = this.add.image(width / 2 - 80, height / 2, 'chebakia');
    const chebakia2 = this.add.image(width / 2 + 80, height / 2, 'chebakia');
    const tea = this.add.image(width / 2 - 120, height / 2 + 30, 'tea');
    
    [chebakia1, chebakia2].forEach((item, i) => {
      item.setScale(2);
      this.tweens.add({
        targets: item,
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: 'Linear',
      });
    });
    
    tea.setScale(2);
    this.tweens.add({
      targets: tea,
      y: tea.y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Play button
    const playButton = this.add.container(width / 2, height - 150);
    
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x8B2942, 1);
    buttonBg.fillRoundedRect(-100, -30, 200, 60, 16);
    buttonBg.lineStyle(4, 0xD4A574);
    buttonBg.strokeRoundedRect(-100, -30, 200, 60, 16);
    
    const buttonText = this.add.text(0, 0, '▶ PLAY', {
      fontFamily: 'Amatic SC',
      fontSize: '40px',
      color: '#FDF5E6',
    });
    buttonText.setOrigin(0.5);
    
    playButton.add([buttonBg, buttonText]);
    playButton.setSize(200, 60);
    playButton.setInteractive({ useHandCursor: true });

    playButton.on('pointerover', () => {
      this.tweens.add({
        targets: playButton,
        scale: 1.1,
        duration: 100,
      });
    });

    playButton.on('pointerout', () => {
      this.tweens.add({
        targets: playButton,
        scale: 1,
        duration: 100,
      });
    });

    playButton.on('pointerdown', () => {
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('GameScene');
      });
    });

    // Instructions
    const instructions = this.add.text(width / 2, height - 60, 
      '← → to move | SPACE to jump | X to throw sandals', {
      fontFamily: 'Amiri',
      fontSize: '16px',
      color: '#666666',
    });
    instructions.setOrigin(0.5);

    // Mobile instructions
    const mobileInstructions = this.add.text(width / 2, height - 35,
      'Mobile: Touch left/right sides to move, swipe up to jump', {
      fontFamily: 'Amiri',
      fontSize: '14px',
      color: '#888888',
    });
    mobileInstructions.setOrigin(0.5);

    // Fade in
    this.cameras.main.fadeIn(500);
  }
}
