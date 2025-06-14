// @ts-ignore
import Phaser from 'phaser';
import { Region, Connection, Attack, GameState, MovingTroop } from './types';
import { INITIAL_REGIONS, SKILLS, GAME_CONFIG } from './gameData';

export class GameScene extends Phaser.Scene {
  private gameState!: GameState;
  private regionGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private attackGraphics!: Phaser.GameObjects.Graphics;
  private dragLine!: Phaser.GameObjects.Graphics;
  private regionTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private regionNameTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private isDragging = false;
  private dragStartRegion: Region | null = null;
  private _resourceFlowTimer!: Phaser.Time.TimerEvent;
  private _passiveExpTimer!: Phaser.Time.TimerEvent;
  private _aiTimer!: Phaser.Time.TimerEvent;
  private animationTime = 0; // 애니메이션 시간 추적

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.initGameState();
    this.createBackground();
    this.createRegions();
    this.setupInputHandlers();
    this.startTimers();
    this.updateUI();
    this.showStartMessage();
    this.setupDevButtons(); // 개발용 버튼 설정
  }

  private initGameState() {
    const regions = new Map<string, Region>();
    INITIAL_REGIONS.forEach(region => {
      regions.set(region.id, { ...region });
    });

    this.gameState = {
      gameStartTime: Date.now(),
      isGameOver: false,
      isPaused: false,
      regions,
      player: {
        level: 1,
        exp: 0,
        expToNext: GAME_CONFIG.BASE_EXP_TO_LEVEL,
        skills: [],
        growthRateMultiplier: 1,
        productionRateMultiplier: 1,
        attackPowerMultiplier: 1,
        defenseMultiplier: 1,
        transmissionSpeedMultiplier: 1,
        maxConnectionDistance: GAME_CONFIG.MAX_CONNECTION_DISTANCE,
        maxConnectionsPerRegion: 1
      },
      connections: [],
      dragConnection: {
        fromRegion: null,
        isActive: false
      },
      attacks: [],
      movingTroops: [] // 전역 이동 중인 병력 관리
    };
  }

  private createBackground() {
    // 전체 화면을 연한 베이지색으로 칠하기 (더 큰 영역으로)
    this.cameras.main.setBackgroundColor('#F5F5DC');
    const bg = this.add.rectangle(-500, -500, GAME_CONFIG.CANVAS_WIDTH * 3, GAME_CONFIG.CANVAS_HEIGHT * 3, 0xF5F5DC);
    bg.setOrigin(0, 0);
    
    // 한국 지도 윤곽선 그리기 (약간 더 어두운 베이지로)
    const graphics = this.add.graphics();
    this.drawKoreaOutline(graphics);

    this.regionGraphics = this.add.graphics();
    this.connectionGraphics = this.add.graphics();
    this.attackGraphics = this.add.graphics();
    this.dragLine = this.add.graphics();
  }

  private drawKoreaOutline(graphics: Phaser.GameObjects.Graphics) {
    graphics.lineStyle(3, 0x8B7D6B); // 선 두께를 조금 줄임
    graphics.fillStyle(0xE6E6C2); // 연한 베이지
    
    // 한국 지도 남한 윤곽선 (모바일 최적화 - 모든 지역이 내부에 위치)
    graphics.beginPath();
    
    // 서해안 (서쪽) - 왼쪽 여백 확보
    graphics.moveTo(160, 130);  // 시작점
    graphics.lineTo(150, 190);  // 서해안 상부
    graphics.lineTo(140, 250);  // 서해안 중부
    graphics.lineTo(150, 310);  // 서해안 남부
    graphics.lineTo(170, 370);  // 서해안 하부
    graphics.lineTo(190, 430);  // 목포 근처
    
    // 남해안 (남쪽) - 아래쪽 여백 확보  
    graphics.lineTo(250, 480);  // 전남 남해안
    graphics.lineTo(330, 490);  // 경남 남해안 중부
    graphics.lineTo(410, 480);  // 경남 남해안 동부
    graphics.lineTo(460, 470);  // 부산 근처
    graphics.lineTo(480, 440);  // 울산 근처
    
    // 동해안 (동쪽) - 오른쪽 경계
    graphics.lineTo(470, 400);  // 동해남부
    graphics.lineTo(460, 340);  // 동해중부
    graphics.lineTo(450, 280);  // 동해북부  
    graphics.lineTo(440, 220);  // 강원도 동해안
    graphics.lineTo(430, 160);  // 속초 근처
    
    // 북쪽 경계 - 위쪽 여백 확보
    graphics.lineTo(380, 120);  // DMZ 동쪽
    graphics.lineTo(340, 110);  // DMZ 중부
    graphics.lineTo(290, 115);  // DMZ 서쪽
    graphics.lineTo(250, 125);  // 개성 근처
    graphics.lineTo(200, 130);  // 파주 근처
    graphics.lineTo(160, 130);  // 시작점으로 복귀
    
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    // 제주도 추가 (위치 조정)
    graphics.fillStyle(0xD2B48C);
    graphics.fillEllipse(250, 580, 30, 15); // 제주도를 더 아래로
    graphics.strokeEllipse(250, 580, 30, 15);
  }

  private createRegions() {
    this.gameState.regions.forEach(region => {
      this.drawRegion(region);
    });
  }

  private drawRegion(region: Region) {
    const graphics = this.regionGraphics;
    
    // 거점 원 그리기
    let fillColor: number;
    let strokeColor: number;
    
    switch (region.owner) {
      case 'player':
        fillColor = 0x3498db;
        strokeColor = 0x2980b9;
        break;
      case 'red':
        fillColor = 0xe74c3c;
        strokeColor = 0xc0392b;
        break;
      default:
        fillColor = 0x95a5a6;
        strokeColor = 0x7f8c8d;
    }

    graphics.fillStyle(fillColor);
    graphics.lineStyle(6, strokeColor);
    graphics.fillCircle(region.x, region.y, region.radius);
    graphics.strokeCircle(region.x, region.y, region.radius);

    // 기존 텍스트 완전히 제거 (잔상 방지)
    this.clearRegionTexts(region.id);
    
    // 병력 수 텍스트 (새로 생성)
    const troopText = this.add.text(region.x, region.y, Math.floor(region.troopCount).toString(), {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Noto Sans KR, Arial'
    }).setOrigin(0.5);

    // 거점 이름 (원과 훨씬 더 가깝게)
    const nameY = region.y - region.radius - 10;
    const nameText = this.add.text(region.x, nameY, region.name, {
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2,
      fontFamily: 'Noto Sans KR, Arial'
    }).setOrigin(0.5);

    this.regionTexts.set(region.id, troopText);
    this.regionNameTexts.set(region.id, nameText);
  }

  private clearRegionTexts(regionId: string) {
    const existingTroopText = this.regionTexts.get(regionId);
    if (existingTroopText) {
      existingTroopText.destroy();
      this.regionTexts.delete(regionId);
    }
    
    const existingNameText = this.regionNameTexts.get(regionId);
    if (existingNameText) {
      existingNameText.destroy();
      this.regionNameTexts.delete(regionId);
    }
  }

  private drawConnections() {
    this.connectionGraphics.clear();
    
    this.gameState.connections.forEach(connection => {
      const fromRegion = this.gameState.regions.get(connection.fromRegionId);
      const toRegion = this.gameState.regions.get(connection.toRegionId);
      
      if (fromRegion && toRegion) {
        const lineColor = this.getConnectionColor(fromRegion.owner);
        
        this.connectionGraphics.lineStyle(6, lineColor, 0.8);
        this.connectionGraphics.beginPath();
        this.connectionGraphics.moveTo(fromRegion.x, fromRegion.y);
        this.connectionGraphics.lineTo(toRegion.x, toRegion.y);
        this.connectionGraphics.strokePath();
        
        this.drawArrow(fromRegion, toRegion, lineColor);
      }
    });
  }

  private getConnectionColor(owner: string): number {
    switch (owner) {
      case 'red': return 0xe74c3c;
      case 'player': return 0x3498db;
      default: return 0x27ae60;
    }
  }

  private drawArrow(fromRegion: Region, toRegion: Region, color: number) {
    const dx = toRegion.x - fromRegion.x;
    const dy = toRegion.y - fromRegion.y;
    const angle = Math.atan2(dy, dx);
    
    const arrowX = toRegion.x - Math.cos(angle) * (toRegion.radius + 10);
    const arrowY = toRegion.y - Math.sin(angle) * (toRegion.radius + 10);
    
    const arrowSize = 15;
    this.connectionGraphics.fillStyle(color);
    this.connectionGraphics.beginPath();
    this.connectionGraphics.moveTo(arrowX, arrowY);
    this.connectionGraphics.lineTo(
      arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
      arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.connectionGraphics.lineTo(
      arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
      arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.connectionGraphics.closePath();
    this.connectionGraphics.fillPath();
  }

  private drawAttacks() {
    this.attackGraphics.clear();
    
    // 공격선 그리기
    this.gameState.attacks.forEach(attack => {
      const fromRegion = this.gameState.regions.get(attack.fromRegionId);
      const toRegion = this.gameState.regions.get(attack.toRegionId);
      
      if (fromRegion && toRegion) {
        const lineColor = this.getConnectionColor(fromRegion.owner);
        
        this.attackGraphics.lineStyle(8, lineColor, 0.6);
        this.attackGraphics.beginPath();
        this.attackGraphics.moveTo(fromRegion.x, fromRegion.y);
        this.attackGraphics.lineTo(toRegion.x, toRegion.y);
        this.attackGraphics.strokePath();
        
        this.drawLargeArrow(fromRegion, toRegion, lineColor);
      }
    });
    
    // 실제 이동 중인 병력들 그리기
    this.gameState.movingTroops.forEach(troop => {
      if (!troop.hasArrived) {
        this.drawMovingTroop(troop);
      }
    });
  }

  private drawMovingTroop(troop: MovingTroop) {
    const troopColor = troop.owner === 'red' ? 0xe74c3c : 0x3498db;
    const troopSize = 10; // 고정 크기
    
    this.attackGraphics.lineStyle(3, 0xFFFFFF, 0.9);
    this.attackGraphics.fillStyle(troopColor);
    this.attackGraphics.fillCircle(troop.x, troop.y, troopSize);
    this.attackGraphics.strokeCircle(troop.x, troop.y, troopSize);
    
    // 이동 방향 꼬리 효과
    const tailLength = 12;
    const dx = troop.targetX - troop.x;
    const dy = troop.targetY - troop.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const tailX = troop.x - (dx / distance) * tailLength;
      const tailY = troop.y - (dy / distance) * tailLength;
      
      this.attackGraphics.lineStyle(4, troopColor, 0.7);
      this.attackGraphics.beginPath();
      this.attackGraphics.moveTo(tailX, tailY);
      this.attackGraphics.lineTo(troop.x, troop.y);
      this.attackGraphics.strokePath();
    }
  }

  private drawLargeArrow(fromRegion: Region, toRegion: Region, color: number) {
    const dx = toRegion.x - fromRegion.x;
    const dy = toRegion.y - fromRegion.y;
    const angle = Math.atan2(dy, dx);
    
    const midX = (fromRegion.x + toRegion.x) / 2;
    const midY = (fromRegion.y + toRegion.y) / 2;
    
    const arrowSize = 20 + Math.sin(this.animationTime * 0.005) * 3;
    
    this.attackGraphics.fillStyle(color);
    this.attackGraphics.lineStyle(3, 0xFFFFFF, 0.8);
    this.attackGraphics.beginPath();
    this.attackGraphics.moveTo(midX, midY);
    this.attackGraphics.lineTo(
      midX - arrowSize * Math.cos(angle - Math.PI / 6),
      midY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.attackGraphics.lineTo(
      midX - arrowSize * 0.6 * Math.cos(angle),
      midY - arrowSize * 0.6 * Math.sin(angle)
    );
    this.attackGraphics.lineTo(
      midX - arrowSize * Math.cos(angle + Math.PI / 6),
      midY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.attackGraphics.closePath();
    this.attackGraphics.fillPath();
    this.attackGraphics.strokePath();
  }

  private setupInputHandlers() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const region = this.getRegionAtPosition(pointer.x, pointer.y);
      if (region && region.owner === 'player' && region.troopCount > 1) {
        this.isDragging = true;
        this.dragStartRegion = region;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.dragStartRegion) {
        this.drawDragLine(this.dragStartRegion, pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.dragStartRegion) {
        const targetRegion = this.getRegionAtPosition(pointer.x, pointer.y);
        
        if (targetRegion && targetRegion !== this.dragStartRegion) {
          this.issueAttack(this.dragStartRegion, targetRegion);
        }
        
        this.clearDragLine();
        this.isDragging = false;
        this.dragStartRegion = null;
      }
    });
  }

  private getRegionAtPosition(x: number, y: number): Region | null {
    for (const region of this.gameState.regions.values()) {
      const distance = Phaser.Math.Distance.Between(x, y, region.x, region.y);
      if (distance <= region.radius) {
        return region;
      }
    }
    return null;
  }

  private drawDragLine(fromRegion: Region, toX: number, toY: number) {
    this.dragLine.clear();
    const targetRegion = this.getRegionAtPosition(toX, toY);
    
    let lineColor = 0xe74c3c; // 빨간색 (무효)
    
    if (targetRegion && targetRegion !== fromRegion) {
      const existingAttacksFromRegion = this.gameState.attacks.filter(
        attack => attack.fromRegionId === fromRegion.id
      ).length;
      
      const existingConnectionsFromRegion = this.gameState.connections.filter(
        conn => conn.fromRegionId === fromRegion.id
      ).length;
      
      if (existingAttacksFromRegion === 0 && existingConnectionsFromRegion < this.gameState.player.maxConnectionsPerRegion) {
        lineColor = 0x27ae60; // 초록색 (유효)
      }
    }
    
    this.dragLine.lineStyle(4, lineColor, 0.7);
    this.dragLine.beginPath();
    this.dragLine.moveTo(fromRegion.x, fromRegion.y);
    this.dragLine.lineTo(toX, toY);
    this.dragLine.strokePath();
  }

  private clearDragLine() {
    this.dragLine.clear();
  }

  private issueAttack(fromRegion: Region, toRegion: Region) {
    if (fromRegion.owner !== 'player' || fromRegion.troopCount <= 1) return;
    
    // 연결 제한 확인
    const existingAttacksFromRegion = this.gameState.attacks.filter(
      attack => attack.fromRegionId === fromRegion.id
    ).length;
    
    const existingConnectionsFromRegion = this.gameState.connections.filter(
      conn => conn.fromRegionId === fromRegion.id
    ).length;
    
    if (existingAttacksFromRegion > 0 || existingConnectionsFromRegion >= this.gameState.player.maxConnectionsPerRegion) {
      return;
    }
    
    // 기존 공격 확인
    const existingAttack = this.gameState.attacks.find(
      attack => attack.fromRegionId === fromRegion.id && attack.toRegionId === toRegion.id
    );
    
    if (existingAttack) return;
    
    // 거리 계산 및 공격 생성
    const distance = Math.sqrt(
      Math.pow(toRegion.x - fromRegion.x, 2) + 
      Math.pow(toRegion.y - fromRegion.y, 2)
    );
    
    const duration = (distance / GAME_CONFIG.ATTACK_SPEED) * 1000;
    const totalTroopsToSend = Math.floor((fromRegion.troopCount - 1) * 0.8);
    
    if (totalTroopsToSend <= 0) return;
    
    const currentTime = Date.now();
    const attack: Attack = {
      fromRegionId: fromRegion.id,
      toRegionId: toRegion.id,
      troopCount: totalTroopsToSend,
      progress: 0,
      duration: duration,
      lastTroopSendTime: currentTime, // 시작 시간을 현재 시간으로 설정
      totalTroopsToSend: totalTroopsToSend,
      troopsSent: 0,
      movingTroops: []
    };
    
    this.gameState.attacks.push(attack);
    
    const connection: Connection = {
      fromRegionId: fromRegion.id,
      toRegionId: toRegion.id,
      isActive: true,
      createdTime: currentTime
    };
    
    this.gameState.connections.push(connection);
  }

  private startTimers() {
    this._resourceFlowTimer = this.time.addEvent({
      delay: GAME_CONFIG.GROWTH_INTERVAL,
      callback: this.processResourceFlow,
      callbackScope: this,
      loop: true
    });

    this._passiveExpTimer = this.time.addEvent({
      delay: GAME_CONFIG.PASSIVE_EXP_RATE * 1000,
      callback: () => this.addExp(1),
      callbackScope: this,
      loop: true
    });

    this._aiTimer = this.time.addEvent({
      delay: GAME_CONFIG.AI_ACTION_INTERVAL,
      callback: this.aiTurnWithDynamicInterval,
      callbackScope: this,
      loop: true
    });
  }

  private processResourceFlow() {
    this.gameState.regions.forEach(region => {
      if (region.owner !== 'neutral') {
        let growthRate = region.baseGrowthRate;
        
        if (region.owner === 'player') {
          growthRate *= this.gameState.player.productionRateMultiplier;
        }
        
        region.troopCount += growthRate;
      }
    });
  }

  private aiTurnWithDynamicInterval() {
    this.aiTurn();
    
    // 플레이어 지역 수에 따라 AI 간격 동적 조정
    const playerRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner === 'player');
    
    const isLateGame = playerRegions.length >= 4; // 4개 이상부터 후반부
    const newInterval = isLateGame ? 1500 : 3000; // 후반부: 1.5초, 초반부: 3초
    
    // 현재 타이머와 간격이 다르면 타이머 재생성
    if (this._aiTimer.delay !== newInterval) {
      this._aiTimer.destroy();
      this._aiTimer = this.time.addEvent({
        delay: newInterval,
        callback: this.aiTurnWithDynamicInterval,
        callbackScope: this,
        loop: true
      });
    }
  }

  private aiTurn() {
    const redRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner === 'red' && r.troopCount > 3); // 최소 병력 3으로 낮춤
    
    const playerRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner === 'player');
    
    const neutralRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner === 'neutral');
    
    if (redRegions.length === 0) return;
    
    // 게임 후반부 판단 (플레이어가 4개 이상 지역 점령 시로 낮춤)
    const isLateGame = playerRegions.length >= 4;
    
    // 후반부에는 더 공격적으로 변함
    const minTroopCount = isLateGame ? 2 : 4; // 후반부에는 2개만 있어도 공격
    const attackRatio = isLateGame ? 0.9 : 0.7; // 후반부에는 90% 병력 투입
    
    for (const attackerRegion of redRegions) {
      if (attackerRegion.troopCount < minTroopCount) continue;
      
      // 기존 공격이 있는지 확인
      const existingAttack = this.gameState.attacks.find(
        attack => attack.fromRegionId === attackerRegion.id
      );
      
      if (existingAttack) continue; // 이미 공격 중이면 스킵
      
      let targetRegions: Region[] = [];
      
      if (isLateGame) {
        // 후반부: 플레이어 지역만 타겟 (중립 지역 무시)
        targetRegions = playerRegions.filter(r => 
          this.getDistance(attackerRegion, r) <= GAME_CONFIG.MAX_CONNECTION_DISTANCE * 2 // 연결 거리 2배로 확장
        );
        
        // 플레이어 지역이 없으면 가장 가까운 플레이어 지역 공격
        if (targetRegions.length === 0 && playerRegions.length > 0) {
          const closestPlayer = playerRegions.reduce((closest, current) => 
            this.getDistance(attackerRegion, current) < this.getDistance(attackerRegion, closest) 
              ? current : closest
          );
          targetRegions = [closestPlayer];
        }
      } else {
        // 초반부: 중립 지역 우선, 하지만 플레이어도 견제
        const nearbyNeutral = neutralRegions.filter(r => 
          this.getDistance(attackerRegion, r) <= GAME_CONFIG.MAX_CONNECTION_DISTANCE
        );
        const nearbyPlayer = playerRegions.filter(r => 
          this.getDistance(attackerRegion, r) <= GAME_CONFIG.MAX_CONNECTION_DISTANCE
        );
        
        // 30% 확률로 플레이어 공격, 70% 확률로 중립 공격
        if (nearbyPlayer.length > 0 && Math.random() < 0.3) {
          targetRegions = nearbyPlayer;
        } else {
          targetRegions = nearbyNeutral.length > 0 ? nearbyNeutral : nearbyPlayer;
        }
      }
      
      if (targetRegions.length === 0) continue;
      
      // 타겟 선정 로직 개선
      let target: Region;
      if (isLateGame && targetRegions.some(r => r.owner === 'player')) {
        // 후반부: 가장 약한 플레이어 지역 우선
        const playerTargets = targetRegions.filter(r => r.owner === 'player');
        target = playerTargets.reduce((weakest, current) => 
          current.troopCount < weakest.troopCount ? current : weakest
        );
      } else {
        // 초반부: 가장 가까운 약한 지역
        target = targetRegions.reduce((best, current) => {
          const currentScore = current.troopCount - this.getDistance(attackerRegion, current) * 0.1;
          const bestScore = best.troopCount - this.getDistance(attackerRegion, best) * 0.1;
          return currentScore < bestScore ? current : best;
        });
      }
      
      // 공격 가능성 판단 - 후반부에는 매우 공격적
      const shouldAttack = isLateGame ? 
        attackerRegion.troopCount >= target.troopCount * 0.5 : // 후반부: 50%만 있어도 공격
        attackerRegion.troopCount > target.troopCount * 0.8;   // 초반부: 80% 우위 필요
      
      if (shouldAttack) {
        const distance = this.getDistance(attackerRegion, target);
        const duration = (distance / GAME_CONFIG.ATTACK_SPEED) * 1000;
        const totalTroopsToSend = Math.floor((attackerRegion.troopCount - 1) * attackRatio);
        
        if (totalTroopsToSend > 0) {
          const currentTime = Date.now();
          const attack: Attack = {
            fromRegionId: attackerRegion.id,
            toRegionId: target.id,
            troopCount: totalTroopsToSend,
            progress: 0,
            duration: duration,
            lastTroopSendTime: currentTime,
            totalTroopsToSend: totalTroopsToSend,
            troopsSent: 0,
            movingTroops: []
          };
          
          this.gameState.attacks.push(attack);
          
          const connection: Connection = {
            fromRegionId: attackerRegion.id,
            toRegionId: target.id,
            isActive: true,
            createdTime: currentTime
          };
          
          this.gameState.connections.push(connection);
          
          // 후반부에는 한 번에 여러 공격 허용, 초반부는 하나씩
          if (!isLateGame) break;
        }
      }
    }
  }
  
  private getDistance(region1: Region, region2: Region): number {
    return Math.sqrt(
      Math.pow(region2.x - region1.x, 2) + 
      Math.pow(region2.y - region1.y, 2)
    );
  }

  private updateAttacks(delta: number) {
    const currentTime = Date.now();
    
    this.gameState.attacks = this.gameState.attacks.filter(attack => {
      attack.progress += delta / attack.duration;
      
      const fromRegion = this.gameState.regions.get(attack.fromRegionId);
      const toRegion = this.gameState.regions.get(attack.toRegionId);
      if (!fromRegion || !toRegion) return false;
      
      // 5초 시간 제한 확인 - 공격 시작부터 5초
      const elapsedTime = currentTime - attack.lastTroopSendTime;
      if (elapsedTime >= GAME_CONFIG.MAX_ATTACK_DURATION) {
        return false; // 5초 경과 시 공격 종료
      }
      
      // 개별 믿음 전송 - 첫 번째 전송 이후부터 0.8초 간격
      if (attack.troopsSent === 0) {
        // 첫 번째 믿음 즉시 전송
        if (attack.troopCount > 0 && fromRegion.troopCount > 1) {
          fromRegion.troopCount -= 1;
          attack.troopCount -= 1;
          attack.troopsSent += 1;
          
          const newTroop: MovingTroop = {
            id: `${attack.fromRegionId}_${attack.toRegionId}_${Date.now()}`,
            fromRegionId: attack.fromRegionId,
            toRegionId: attack.toRegionId,
            x: fromRegion.x,
            y: fromRegion.y,
            targetX: toRegion.x,
            targetY: toRegion.y,
            speed: GAME_CONFIG.ATTACK_SPEED,
            hasArrived: false,
            owner: fromRegion.owner as 'player' | 'red'
          };
          
          this.gameState.movingTroops.push(newTroop);
        }
      } else {
        // 전송 간격 계산 - 플레이어면 전송 속도 적용
        const baseInterval = GAME_CONFIG.TROOP_SEND_INTERVAL;
        const actualInterval = fromRegion.owner === 'player' ? 
          baseInterval * this.gameState.player.transmissionSpeedMultiplier : 
          baseInterval;
        
        const nextSendTime = attack.lastTroopSendTime + attack.troopsSent * actualInterval;
        
        if (currentTime - nextSendTime >= actualInterval) {
          // 이후 믿음들은 계산된 간격으로 전송
          if (attack.troopCount > 0 && fromRegion.troopCount > 1) {
            fromRegion.troopCount -= 1;
            attack.troopCount -= 1;
            attack.troopsSent += 1;
            
            const newTroop: MovingTroop = {
              id: `${attack.fromRegionId}_${attack.toRegionId}_${Date.now()}`,
              fromRegionId: attack.fromRegionId,
              toRegionId: attack.toRegionId,
              x: fromRegion.x,
              y: fromRegion.y,
              targetX: toRegion.x,
              targetY: toRegion.y,
              speed: GAME_CONFIG.ATTACK_SPEED,
              hasArrived: false,
              owner: fromRegion.owner as 'player' | 'red'
            };
            
            this.gameState.movingTroops.push(newTroop);
          }
        }
      }
      
      // 공격 종료 조건 확인 - 모든 믿음이 전송되고 도착했을 때만
      if (attack.troopCount <= 0) {
        const relatedMovingTroops = this.gameState.movingTroops.filter(
          troop => troop.fromRegionId === attack.fromRegionId && 
                  troop.toRegionId === attack.toRegionId &&
                  !troop.hasArrived
        );
        
        // 전송할 믿음도 없고, 이동 중인 믿음도 없을 때만 공격 종료
        if (relatedMovingTroops.length === 0) {
          return false;
        }
      }
      
      // 시간 초과로도 공격 종료하지만, 이동 중인 믿음이 있으면 계속 유지
      if (attack.progress >= 1) {
        const relatedMovingTroops = this.gameState.movingTroops.filter(
          troop => troop.fromRegionId === attack.fromRegionId && 
                  troop.toRegionId === attack.toRegionId &&
                  !troop.hasArrived
        );
        
        if (relatedMovingTroops.length === 0) {
          return false;
        }
      }
      return true;
    });
    
    this.updateMovingTroops(delta);
  }

  private updateMovingTroops(delta: number) {
    this.gameState.movingTroops = this.gameState.movingTroops.filter(troop => {
      if (troop.hasArrived) return false;
      
      const dx = troop.targetX - troop.x;
      const dy = troop.targetY - troop.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= troop.speed * (delta / 1000)) {
        troop.x = troop.targetX;
        troop.y = troop.targetY;
        troop.hasArrived = true;
        
        this.handleTroopArrival(troop);
        return false;
      } else {
        const moveDistance = troop.speed * (delta / 1000);
        troop.x += (dx / distance) * moveDistance;
        troop.y += (dy / distance) * moveDistance;
        return true;
      }
    });
  }

  private handleTroopArrival(troop: MovingTroop) {
    const toRegion = this.gameState.regions.get(troop.toRegionId);
    if (!toRegion) return;
    
    if (toRegion.owner === troop.owner) {
      toRegion.troopCount += 1;
      return;
    }
    
    const defenderTroops = Math.floor(toRegion.troopCount);
    let attackPower = 1;
    let defensePower = 1;
    
    if (troop.owner === 'player') {
      attackPower = this.gameState.player.attackPowerMultiplier;
    }
    
    // 플레이어 지역이 방어할 때 defenseMultiplier 적용
    if (toRegion.owner === 'player' && troop.owner === 'red') {
      defensePower = this.gameState.player.defenseMultiplier;
    }
    
    // 방어 시 실제 방어력 = 방어자 병력 * 방어 배수
    const effectiveDefense = defenderTroops * defensePower;
    
    if (effectiveDefense > attackPower) {
      // 방어 성공 - 공격력만큼 방어력에서 차감
      const actualDamage = attackPower / defensePower;
      toRegion.troopCount -= actualDamage;
    } else {
      // 공격 성공 - 지역 점령
      const previousOwner = toRegion.owner;
      toRegion.owner = troop.owner;
      toRegion.troopCount = 1;
      
      if (toRegion.owner === 'player' && previousOwner !== 'player') {
        this.addExp(GAME_CONFIG.REGION_CAPTURE_EXP);
      }
    }
  }

  private addExp(amount: number) {
    const expBoostSkill = this.gameState.player.skills.find(s => s.id === 'exp_boost');
    const finalAmount = expBoostSkill ? amount * 1.5 : amount;
    
    this.gameState.player.exp += finalAmount;
    
    if (this.gameState.player.exp >= this.gameState.player.expToNext) {
      this.levelUp();
    }
  }

  private levelUp() {
    this.gameState.player.level++;
    this.gameState.player.exp -= this.gameState.player.expToNext;
    this.gameState.player.expToNext = GAME_CONFIG.BASE_EXP_TO_LEVEL * this.gameState.player.level;
    
    this.showSkillSelection();
  }

  private showSkillSelection() {
    this.scene.pause();
    
    const modal = document.getElementById('level-up-modal') as HTMLElement;
    const skillOptions = document.getElementById('skill-options') as HTMLElement;
    
    skillOptions.innerHTML = '';
    
    const availableSkills = SKILLS.filter(skill => 
      !this.gameState.player.skills.some(ps => ps.id === skill.id)
    );
    
    const selectedSkills = availableSkills
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, availableSkills.length));

    selectedSkills.forEach(skill => {
      const button = document.createElement('button');
      button.className = 'skill-button';
      button.innerHTML = `<strong>${skill.name}</strong><br>${skill.description}`;
      button.onclick = () => {
        this.selectSkill(skill);
        modal.style.display = 'none';
        this.scene.resume();
      };
      skillOptions.appendChild(button);
    });

    modal.style.display = 'block';
  }

  private selectSkill(skill: any) {
    this.gameState.player.skills.push(skill);
    skill.apply(this.gameState.player);
  }

  private showStartMessage() {
    const startText = this.add.text(GAME_CONFIG.CANVAS_WIDTH / 2, 80, 
      '🙏 서울에서 시작! 드래그해서 믿음을 나눠주세요!',
      {
        fontSize: '16px',
        color: '#000000',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 3,
        align: 'center',
        fontFamily: 'Noto Sans KR, Arial'
      }
    ).setOrigin(0.5);

    this.time.delayedCall(4000, () => {
      startText.destroy();
    });
  }

  update(_time: number, delta: number) {
    if (this.gameState.isGameOver) return;
    
    this.animationTime += delta;
    this.updateRegionDisplay();
    this.drawConnections();
    this.updateAttacks(delta);
    this.updateConnections();
    this.drawAttacks();
    this.updateUI();
    this.checkWinCondition();
    this.checkLoseCondition();
  }

  private updateRegionDisplay() {
    this.regionGraphics.clear();
    this.gameState.regions.forEach(region => {
      this.drawRegion(region);
    });
  }

  private updateUI() {
    const levelElement = document.getElementById('level');
    const expElement = document.getElementById('exp');
    const timerElement = document.getElementById('timer');
    
    if (levelElement) levelElement.textContent = this.gameState.player.level.toString();
    if (expElement) expElement.textContent = `${Math.floor(this.gameState.player.exp)}/${this.gameState.player.expToNext}`;
    
    if (timerElement) {
      const elapsed = Math.floor((Date.now() - this.gameState.gameStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  private checkWinCondition() {
    const nonRedBaseRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.id !== 'redbase');
    
    const playerRegions = nonRedBaseRegions.filter(r => r.owner === 'player');
    
    if (playerRegions.length === nonRedBaseRegions.length && !this.gameState.isGameOver) {
      this.gameState.isGameOver = true;
      this.showGameOverScreen('승리!');
    }
  }

  private checkLoseCondition() {
    const playerRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner === 'player');
    
    if (playerRegions.length === 0 && !this.gameState.isGameOver) {
      this.gameState.isGameOver = true;
      this.showGameOverScreen('패배!');
    }
  }

  private showGameOverScreen(result: string) {
    this.scene.pause();
    
    const modal = document.getElementById('game-over-modal') as HTMLElement;
    const clearTimeElement = document.getElementById('clear-time') as HTMLElement;
    const titleElement = modal.querySelector('h2') as HTMLElement;
    
    modal.classList.remove('defeat');
    
    if (result === '패배!') {
      modal.classList.add('defeat');
      titleElement.textContent = '💔 패배!';
      
      // 패배 메시지 동적 생성
      let messageP = modal.querySelector('p:first-of-type') as HTMLElement;
      if (!messageP) {
        messageP = document.createElement('p');
        modal.insertBefore(messageP, clearTimeElement.parentElement);
      }
      messageP.textContent = '세상의 유혹에 넘어졌습니다...';
      messageP.style.fontWeight = 'bold';
      messageP.style.fontSize = '16px';
      messageP.style.margin = '15px 0 20px 0';
    } else {
      titleElement.textContent = '🎊 승리!';
      
      // 승리 메시지 동적 생성
      let messageP = modal.querySelector('p:first-of-type') as HTMLElement;
      if (!messageP) {
        messageP = document.createElement('p');
        modal.insertBefore(messageP, clearTimeElement.parentElement);
      }
      messageP.textContent = '한국이 하나님의 나라가 되었습니다!';
      messageP.style.fontWeight = 'bold';
      messageP.style.fontSize = '16px';
      messageP.style.margin = '15px 0 20px 0';
    }
    
    const elapsed = Math.floor((Date.now() - this.gameState.gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    clearTimeElement.textContent = `완주 시간: ${minutes}분 ${seconds}초`;
    modal.style.display = 'block';
    
    this.setupGameOverButtons();
  }

  private setupGameOverButtons() {
    const restartButton = document.getElementById('restart-game') as HTMLButtonElement;
    if (restartButton) {
      restartButton.onclick = () => this.restartGame();
    }
  }

  private restartGame() {
    const modal = document.getElementById('game-over-modal') as HTMLElement;
    modal.style.display = 'none';
    
    this.scene.resume();
    this.scene.restart();
  }

  private updateConnections() {
    this.gameState.connections = this.gameState.connections.filter(connection => {
      const relatedAttack = this.gameState.attacks.find(
        attack => attack.fromRegionId === connection.fromRegionId && 
                 attack.toRegionId === connection.toRegionId
      );
      
      // 관련된 공격이 없으면 연결 해제
      if (!relatedAttack) {
        // 하지만 아직 이동 중인 믿음이 있다면 연결 유지
        const relatedMovingTroops = this.gameState.movingTroops.filter(
          troop => troop.fromRegionId === connection.fromRegionId && 
                  troop.toRegionId === connection.toRegionId &&
                  !troop.hasArrived
        );
        
        if (relatedMovingTroops.length > 0) {
          return true; // 이동 중인 믿음이 있으면 연결 유지
        }
        
        return false; // 이동 중인 믿음도 없으면 연결 해제
      }
      
      // 공격이 있다면 모든 믿음이 전송되었는지 확인
      if (relatedAttack.troopCount <= 0) {
        const relatedMovingTroops = this.gameState.movingTroops.filter(
          troop => troop.fromRegionId === connection.fromRegionId && 
                  troop.toRegionId === connection.toRegionId &&
                  !troop.hasArrived
        );
        
        // 모든 믿음이 도착했으면 연결 해제
        if (relatedMovingTroops.length === 0) {
          return false;
        }
      }
      
      return true;
    });
  }

  private setupDevButtons() {
    const instantWinButton = document.getElementById('instant-win');
    if (instantWinButton) {
      instantWinButton.onclick = () => {
        if (!this.gameState.isGameOver) {
          this.gameState.isGameOver = true;
          this.showGameOverScreen('승리!');
        }
      };
    }

    const instantLoseButton = document.getElementById('instant-lose');
    if (instantLoseButton) {
      instantLoseButton.onclick = () => {
        if (!this.gameState.isGameOver) {
          this.gameState.isGameOver = true;
          this.showGameOverScreen('패배!');
        }
      };
    }
  }
} 