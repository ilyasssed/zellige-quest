import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
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

    // Load character sprite image
    this.load.image('menuCharacters', '/src/assets/game-characters.png');

    // Generate all game graphics
    this.generateGameAssets();
  }

  generateGameAssets(): void {
    // Player sprite (Moroccan character in wedding clothes)
    this.generatePlayerSprite();
    
    // Chebakia (sweet collectible)
    this.generateChebakiaSprite();
    
    // Mint tea power-up
    this.generateTeaSprite();
    
    // Sandal projectile
    this.generateSandalSprite();
    
    // Cockroach enemy
    this.generateCockroachSprite();
    
    // Platform tiles
    this.generatePlatformSprite();
    
    // Ground tiles
    this.generateGroundSprite();
    
    // Decorative elements
    this.generateLanternSprite();
    this.generateArchSprite();
    
    // UI elements
    this.generateHeartSprite();
  }

  generatePlayerSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Character body with djellaba (maroon)
    graphics.fillStyle(0x8B2942);
    graphics.fillRect(8, 16, 16, 28);
    
    // Djellaba details (gold trim)
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(8, 16, 16, 3);
    graphics.fillRect(14, 16, 4, 28);
    
    // Head
    graphics.fillStyle(0xDEB887);
    graphics.fillRect(10, 4, 12, 14);
    
    // Fez (tarbouche)
    graphics.fillStyle(0xC41E3A);
    graphics.fillRect(10, 0, 12, 6);
    graphics.fillStyle(0x000000);
    graphics.fillRect(15, 0, 2, 2);
    
    // Eyes
    graphics.fillStyle(0x000000);
    graphics.fillRect(12, 10, 2, 2);
    graphics.fillRect(18, 10, 2, 2);
    
    // Feet
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(8, 42, 6, 6);
    graphics.fillRect(18, 42, 6, 6);
    
    graphics.generateTexture('player', 32, 48);
    graphics.destroy();
  }

  generateChebakiaSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Chebakia - flower-shaped Moroccan cookie
    graphics.fillStyle(0xCD853F);
    // Center
    graphics.fillCircle(12, 12, 4);
    // Petals
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const x = 12 + Math.cos(angle) * 7;
      const y = 12 + Math.sin(angle) * 7;
      graphics.fillCircle(x, y, 4);
    }
    // Honey glaze
    graphics.fillStyle(0xDAA520);
    graphics.fillCircle(12, 12, 3);
    
    graphics.generateTexture('chebakia', 24, 24);
    graphics.destroy();
  }

  generateTeaSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Moroccan tea glass
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(8, 4, 16, 4);
    
    // Glass body
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(6, 8, 20, 20);
    
    // Tea (green)
    graphics.fillStyle(0x228B22);
    graphics.fillRect(8, 12, 16, 14);
    
    // Mint leaves
    graphics.fillStyle(0x32CD32);
    graphics.fillCircle(16, 14, 3);
    graphics.fillCircle(12, 16, 2);
    
    // Steam
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRect(12, 2, 2, 4);
    graphics.fillRect(18, 0, 2, 4);
    
    graphics.generateTexture('tea', 32, 32);
    graphics.destroy();
  }

  generateSandalSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Balgha (Moroccan slipper)
    graphics.fillStyle(0xD4A574);
    graphics.fillRoundedRect(2, 6, 20, 12, 4);
    
    // Decorative pattern
    graphics.fillStyle(0x8B2942);
    graphics.fillRect(8, 8, 8, 2);
    graphics.fillRect(10, 10, 4, 4);
    
    // Pointed toe
    graphics.fillStyle(0xD4A574);
    graphics.fillTriangle(22, 12, 28, 10, 22, 8);
    
    graphics.generateTexture('sandal', 30, 20);
    graphics.destroy();
  }

  generateCockroachSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Body
    graphics.fillStyle(0x3D2914);
    graphics.fillEllipse(16, 16, 24, 16);
    
    // Head
    graphics.fillStyle(0x2F1F0F);
    graphics.fillCircle(4, 16, 6);
    
    // Antennae
    graphics.lineStyle(2, 0x2F1F0F);
    graphics.lineBetween(2, 12, 0, 4);
    graphics.lineBetween(6, 12, 8, 4);
    
    // Legs
    graphics.lineStyle(2, 0x2F1F0F);
    graphics.lineBetween(10, 20, 6, 28);
    graphics.lineBetween(16, 22, 16, 30);
    graphics.lineBetween(22, 20, 26, 28);
    graphics.lineBetween(10, 12, 6, 4);
    graphics.lineBetween(22, 12, 26, 4);
    
    // Eyes
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(2, 14, 2);
    graphics.fillCircle(6, 14, 2);
    graphics.fillStyle(0x000000);
    graphics.fillCircle(1, 14, 1);
    graphics.fillCircle(5, 14, 1);
    
    graphics.generateTexture('cockroach', 32, 32);
    graphics.destroy();
  }

  generatePlatformSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Zellige tile pattern
    graphics.fillStyle(0x1E8A88);
    graphics.fillRect(0, 0, 64, 32);
    
    // Pattern overlay
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRect(0, 0, 32, 16);
    graphics.fillRect(32, 16, 32, 16);
    
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(2, 2, 12, 12);
    graphics.fillRect(18, 2, 12, 12);
    graphics.fillRect(34, 18, 12, 12);
    graphics.fillRect(50, 18, 12, 12);
    
    // Border
    graphics.lineStyle(2, 0x8B2942);
    graphics.strokeRect(0, 0, 64, 32);
    
    graphics.generateTexture('platform', 64, 32);
    graphics.destroy();
  }

  generateGroundSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Ground with zellige pattern
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 0, 64, 64);
    
    // Zellige star pattern
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
    
    // Top border
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(0, 0, 64, 4);
    
    graphics.generateTexture('ground', 64, 64);
    graphics.destroy();
  }

  generateLanternSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Moroccan lantern
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(10, 0, 12, 4);
    
    graphics.fillStyle(0x8B2942);
    graphics.fillRect(6, 4, 20, 6);
    graphics.fillRect(4, 10, 24, 32);
    graphics.fillRect(6, 42, 20, 6);
    
    // Glass panels (glowing)
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(8, 14, 6, 24);
    graphics.fillRect(18, 14, 6, 24);
    
    graphics.generateTexture('lantern', 32, 48);
    graphics.destroy();
  }

  generateArchSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Moroccan arch
    graphics.fillStyle(0xD4A574);
    graphics.fillRect(0, 48, 16, 80);
    graphics.fillRect(112, 48, 16, 80);
    
    // Arch curve
    graphics.fillStyle(0xD4A574);
    graphics.beginPath();
    graphics.arc(64, 48, 64, Math.PI, 0, false);
    graphics.closePath();
    graphics.fillPath();
    
    // Inner arch (cutout effect)
    graphics.fillStyle(0x87CEEB);
    graphics.beginPath();
    graphics.arc(64, 48, 48, Math.PI, 0, false);
    graphics.closePath();
    graphics.fillPath();
    
    // Decorative pattern
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
