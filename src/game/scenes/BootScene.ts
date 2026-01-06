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

    // Load external assets - player sprites
    this.load.image('playerStatic', '/images/player-static.png');
    this.load.image('playerMoving1', '/images/player-moving1.png');
    this.load.image('playerMoving2', '/images/player-moving2.png');
    this.load.image('playerMoving3', '/images/player-moving3.png');
    this.load.image('playerMoving4', '/images/player-moving4.png');
    this.load.image('playerMoving5', '/images/player-moving5.png');
    this.load.image('playerMoving6', '/images/player-moving6.png');
    this.load.image('playerMoving7', '/images/player-moving7.png');
    this.load.image('playerMoving8', '/images/player-moving8.png');
    this.load.image('playerMoving9', '/images/player-moving9.png');
    this.load.audio('soundtrack', '/audio/soundtrack.mp3');

    // Generate all game graphics
    this.generateGameAssets();
  }

  generateGameAssets(): void {
    this.generateChebakiaSprite();
    this.generateTeaSprite();
    this.generateSandalSprite();
    this.generateCockroachSprite();
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

  generateTeaSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(8, 4, 16, 4);
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(6, 8, 20, 20);
    graphics.fillStyle(0x228B22);
    graphics.fillRect(8, 12, 16, 14);
    graphics.fillStyle(0x32CD32);
    graphics.fillCircle(16, 14, 3);
    graphics.fillCircle(12, 16, 2);
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRect(12, 2, 2, 4);
    graphics.fillRect(18, 0, 2, 4);
    graphics.generateTexture('tea', 32, 32);
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

  generateCockroachSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Body - oval shape
    graphics.fillStyle(0x3D2914);
    graphics.fillEllipse(16, 14, 26, 14);
    
    // Head
    graphics.fillStyle(0x2F1F0F);
    graphics.fillCircle(4, 14, 5);
    
    // Legs only (no antennae)
    graphics.lineStyle(2, 0x2F1F0F);
    graphics.lineBetween(8, 18, 4, 24);
    graphics.lineBetween(14, 20, 14, 26);
    graphics.lineBetween(20, 18, 24, 24);
    
    // Eyes
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(3, 12, 2);
    graphics.fillCircle(6, 12, 2);
    graphics.fillStyle(0x000000);
    graphics.fillCircle(2, 12, 1);
    graphics.fillCircle(5, 12, 1);
    
    graphics.generateTexture('cockroach', 32, 28);
    graphics.destroy();
  }

  generatePlatformSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x1E8A88);
    graphics.fillRect(0, 0, 64, 32);
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRect(0, 0, 32, 16);
    graphics.fillRect(32, 16, 32, 16);
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(2, 2, 12, 12);
    graphics.fillRect(18, 2, 12, 12);
    graphics.fillRect(34, 18, 12, 12);
    graphics.fillRect(50, 18, 12, 12);
    graphics.lineStyle(2, 0x8B2942);
    graphics.strokeRect(0, 0, 64, 32);
    graphics.generateTexture('platform', 64, 32);
    graphics.destroy();
  }

  generateGroundSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(4, 4, 24, 24);
    graphics.fillRect(36, 4, 24, 24);
    graphics.fillRect(4, 36, 24, 24);
    graphics.fillRect(36, 36, 24, 24);
    graphics.fillStyle(0x1E8A88);
    graphics.fillRect(8, 8, 16, 16);
    graphics.fillRect(40, 8, 16, 16);
    graphics.fillRect(8, 40, 16, 16);
    graphics.fillRect(40, 40, 16, 16);
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(0, 0, 64, 4);
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
    this.scene.start('MenuScene');
  }
}
