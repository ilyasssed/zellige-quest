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
    this.load.image('sweet', '/images/sweet.png');
    this.load.image('cockroach', '/images/cockroach.png');
    this.load.image('sandal', '/images/projectile.png');
    this.load.image('platform', '/images/table.png');

    // Generate sound effects
    this.generateMunchSound();
    this.generateOuchSound();
    this.generateEnemyDeathSound();

    // Generate all game graphics
    this.generateGameAssets();
  }

  generateGameAssets(): void {
    this.generateGroundSprite();
    this.generateLanternSprite();
    this.generateArchSprite();
    this.generateHeartSprite();
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

  generateMunchSound(): void {
    // Generate a simple munch/crunch sound using Web Audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.15;
    const samples = Math.floor(sampleRate * duration);
    const buffer = audioContext.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      // Crunchy noise with decay
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 20);
      const crunch = Math.sin(t * 800) * Math.exp(-t * 15) * 0.5;
      data[i] = (noise + crunch) * 0.5;
    }

    // Convert to WAV and create data URL
    const wavBlob = this.bufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    this.load.audio('munch', url);
  }

  generateOuchSound(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3;
    const samples = Math.floor(sampleRate * duration);
    const buffer = audioContext.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      // Descending "ouch" tone
      const freq = 400 - t * 600;
      const tone = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * 8);
      data[i] = tone * 0.4;
    }

    const wavBlob = this.bufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    this.load.audio('ouch', url);
  }

  generateEnemyDeathSound(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.25;
    const samples = Math.floor(sampleRate * duration);
    const buffer = audioContext.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      // Squish/splat sound - descending with noise
      const freq = 200 - t * 400;
      const tone = Math.sin(t * Math.max(freq, 50) * Math.PI * 2) * Math.exp(-t * 12);
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.3;
      data[i] = (tone + noise) * 0.4;
    }

    const wavBlob = this.bufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    this.load.audio('enemyDeath', url);
  }

  bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const data = buffer.getChannelData(0);
    const samples = data.length;
    const dataSize = samples * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
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
