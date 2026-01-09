import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x8B2942, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '32px Amatic SC',
        color: '#8B2942',
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xD4A574, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load player static and walking frames
    this.load.image('player-static', '/images/player-static.png');
    for (let i = 1; i <= 9; i++) {
      this.load.image(`player-moving${i}`, `/images/player-moving${i}.png`);
    }
    this.load.audio('soundtrack', '/audio/soundtrack.mp3');
    this.load.image('background', '/images/background.png');
    this.load.image('tea', '/images/tea.png');
    this.load.image('cockroach', '/images/cockroach.png');

    // Generate all game graphics
    this.generateGameAssets();
  }

  generateGameAssets(): void {
    this.generateChebakiaSprite();
    this.generateSandalSprite();
    this.generatePlatformSprite();
    this.generateGroundSprite();
    this.generateLanternSprite();
    this.generateArchSprite();
    this.generateHeartSprite();
  }

  generateChebakiaSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xCD853F);
    graphics.fillCircle(12, 12, 4);
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const x = 12 + Math.cos(angle) * 7;
      const y = 12 + Math.sin(angle) * 7;
      graphics.fillCircle(x, y, 4);
    }
    graphics.fillStyle(0xDAA520);
    graphics.fillCircle(12, 12, 3);
    graphics.generateTexture('chebakia', 24, 24);
    graphics.destroy();
  }

  generateSandalSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xD4A574);
    graphics.fillRoundedRect(2, 6, 20, 12, 4);
    graphics.fillStyle(0x8B2942);
    graphics.fillRect(8, 8, 8, 2);
    graphics.fillRect(10, 10, 4, 4);
    graphics.fillStyle(0xD4A574);
    graphics.fillTriangle(22, 12, 28, 10, 22, 8);
    graphics.generateTexture('sandal', 30, 20);
    graphics.destroy();
  }

  generatePlatformSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Orange brick pattern like reference
    const brickColor = 0xCC6B2C;
    const brickDark = 0xA85520;
    const mortarColor = 0x8B4513;
    
    // Fill mortar/grout background
    graphics.fillStyle(mortarColor);
    graphics.fillRect(0, 0, 64, 32);
    
    // Draw brick pattern - two rows
    const brickWidth = 28;
    const brickHeight = 12;
    const gap = 3;
    
    // Row 1 - full bricks
    for (let x = 0; x < 64; x += brickWidth + gap) {
      graphics.fillStyle(brickColor);
      graphics.fillRoundedRect(x + 2, 2, brickWidth, brickHeight, 2);
      // Highlight
      graphics.fillStyle(0xE07830);
      graphics.fillRect(x + 4, 4, brickWidth - 4, 3);
      // Shadow
      graphics.fillStyle(brickDark);
      graphics.fillRect(x + 4, brickHeight - 2, brickWidth - 4, 2);
    }
    
    // Row 2 - offset bricks
    for (let x = -14; x < 64; x += brickWidth + gap) {
      graphics.fillStyle(brickColor);
      graphics.fillRoundedRect(x + 2, 17, brickWidth, brickHeight, 2);
      // Highlight
      graphics.fillStyle(0xE07830);
      graphics.fillRect(x + 4, 19, brickWidth - 4, 3);
      // Shadow
      graphics.fillStyle(brickDark);
      graphics.fillRect(x + 4, 17 + brickHeight - 2, brickWidth - 4, 2);
    }
    
    graphics.generateTexture('platform', 64, 32);
    graphics.destroy();
  }

  generateGroundSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Orange brick pattern like reference
    const brickColor = 0xCC6B2C;
    const brickDark = 0xA85520;
    const mortarColor = 0x8B4513;
    
    // Fill mortar/grout background
    graphics.fillStyle(mortarColor);
    graphics.fillRect(0, 0, 64, 64);
    
    // Draw brick pattern - 4 rows
    const brickWidth = 28;
    const brickHeight = 12;
    const gap = 3;
    
    for (let row = 0; row < 4; row++) {
      const yPos = row * (brickHeight + gap) + 2;
      const offset = row % 2 === 0 ? 0 : -14;
      
      for (let x = offset; x < 64; x += brickWidth + gap) {
        graphics.fillStyle(brickColor);
        graphics.fillRoundedRect(x + 2, yPos, brickWidth, brickHeight, 2);
        // Highlight
        graphics.fillStyle(0xE07830);
        graphics.fillRect(x + 4, yPos + 2, brickWidth - 4, 3);
        // Shadow
        graphics.fillStyle(brickDark);
        graphics.fillRect(x + 4, yPos + brickHeight - 2, brickWidth - 4, 2);
      }
    }
    
    graphics.generateTexture('ground', 64, 64);
    graphics.destroy();
  }

  generateLanternSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(10, 0, 12, 4);
    graphics.fillStyle(0x8B2942);
    graphics.fillRect(6, 4, 20, 6);
    graphics.fillRect(4, 10, 24, 32);
    graphics.fillRect(6, 42, 20, 6);
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(8, 14, 6, 24);
    graphics.fillRect(18, 14, 6, 24);
    graphics.generateTexture('lantern', 32, 48);
    graphics.destroy();
  }

  generateArchSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(0, 48, 16, 80);
    graphics.fillRect(112, 48, 16, 80);
    graphics.fillStyle(0xD4A574);
    graphics.beginPath();
    graphics.arc(64, 48, 64, Math.PI, 0, false);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x87CEEB);
    graphics.beginPath();
    graphics.arc(64, 48, 48, Math.PI, 0, false);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x8B2942);
    graphics.fillRect(4, 56, 8, 8);
    graphics.fillRect(116, 56, 8, 8);
    graphics.generateTexture('arch', 128, 128);
    graphics.destroy();
  }

  generateHeartSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xC41E3A);
    graphics.fillCircle(8, 8, 6);
    graphics.fillCircle(16, 8, 6);
    graphics.fillTriangle(2, 10, 22, 10, 12, 22);
    graphics.generateTexture('heart', 24, 24);
    graphics.destroy();
  }

  create(): void {
    // Create player walk animation
    if (!this.anims.exists('player-walk')) {
      this.anims.create({
        key: 'player-walk',
        frames: [
          { key: 'player-moving1' },
          { key: 'player-moving2' },
          { key: 'player-moving3' },
          { key: 'player-moving4' },
          { key: 'player-moving5' },
          { key: 'player-moving6' },
          { key: 'player-moving7' },
          { key: 'player-moving8' },
          { key: 'player-moving9' },
        ],
        frameRate: 12,
        repeat: -1,
      });
    }

    this.scene.start('MenuScene');
  }
}
