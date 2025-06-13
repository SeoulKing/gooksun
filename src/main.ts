// @ts-ignore
import Phaser from 'phaser';
import { GameScene } from './gameScene';
import { GAME_CONFIG } from './gameData';

const config: any = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.CANVAS_WIDTH,
  height: GAME_CONFIG.CANVAS_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

// 게임 인스턴스 생성
const game = new Phaser.Game(config);

// 전역 객체에 게임 인스턴스 저장 (디버깅용)
(window as any).game = game; 