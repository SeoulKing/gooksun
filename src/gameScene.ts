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
  private resourceFlowTimer!: Phaser.Time.TimerEvent;
  private passiveExpTimer!: Phaser.Time.TimerEvent;
  private aiTimer!: Phaser.Time.TimerEvent;
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
    graphics.lineStyle(4, 0x8B7D6B); // 어두운 베이지
    graphics.fillStyle(0xE6E6C2); // 연한 베이지
    
    // 한국 지도 남한 윤곽선 (적군본부가 밖에 있도록 조정)
    graphics.beginPath();
    
    // 서해안 (서쪽)
    graphics.moveTo(350, 250);  // 강화도 근처
    graphics.lineTo(320, 300);  // 인천 근처
    graphics.lineTo(310, 380);  // 서해안 중부
    graphics.lineTo(330, 450);  // 서해안 남부
    graphics.lineTo(350, 520);  // 전남 서해안
    graphics.lineTo(380, 580);  // 목포 근처
    
    // 남해안 (남쪽)
    graphics.lineTo(450, 620);  // 전남 남해안
    graphics.lineTo(550, 650);  // 경남 남해안
    graphics.lineTo(650, 640);  // 부산 근처
    graphics.lineTo(720, 620);  // 울산 근처
    graphics.lineTo(780, 590);  // 동해남부선
    
    // 동해안 (동쪽) - 적군본부가 밖에 있도록 조정
    graphics.lineTo(800, 500);  // 경북 동해안
    graphics.lineTo(810, 400);  // 강원 동해안 남부
    graphics.lineTo(780, 300);  // 강원 동해안 중부
    graphics.lineTo(750, 200);  // 강원 동해안 북부
    graphics.lineTo(720, 120);  // 속초 근처
    
    // 북쪽 경계
    graphics.lineTo(650, 100);  // DMZ 동쪽
    graphics.lineTo(550, 110);  // DMZ 중부
    graphics.lineTo(450, 120);  // DMZ 서쪽
    graphics.lineTo(380, 150);  // 개성 근처
    graphics.lineTo(350, 200);  // 파주 근처
    graphics.lineTo(350, 250);  // 시작점으로 복귀
    
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    // 제주도 추가
    graphics.fillStyle(0xD2B48C);
    graphics.fillEllipse(420, 720, 60, 30);
    graphics.strokeEllipse(420, 720, 60, 30);
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
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      fontFamily: 'Noto Sans KR, Arial'
    }).setOrigin(0.5);

    // 거점 이름 (원과 훨씬 더 가깝게)
    const nameY = region.y - region.radius - 12; // 더 가깝게 (20에서 12로)
    const nameText = this.add.text(region.x, nameY, region.name, {
      fontSize: '14px', // 폰트 크기도 약간 줄여서 겹침 방지
      color: '#000000', // 베이지 배경에서 검은색이 더 잘 보임
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
    
    const attack: Attack = {
      fromRegionId: fromRegion.id,
      toRegionId: toRegion.id,
      troopCount: totalTroopsToSend,
      progress: 0,
      duration: duration,
      lastTroopSendTime: Date.now() - GAME_CONFIG.TROOP_SEND_INTERVAL,
      totalTroopsToSend: totalTroopsToSend,
      troopsSent: 0,
      movingTroops: []
    };
    
    this.gameState.attacks.push(attack);
    
    const connection: Connection = {
      fromRegionId: fromRegion.id,
      toRegionId: toRegion.id,
      isActive: true,
      createdTime: Date.now()
    };
    
    this.gameState.connections.push(connection);
  }

  private startTimers() {
    this.resourceFlowTimer = this.time.addEvent({
      delay: GAME_CONFIG.GROWTH_INTERVAL,
      callback: this.processResourceFlow,
      callbackScope: this,
      loop: true
    });

    this.passiveExpTimer = this.time.addEvent({
      delay: GAME_CONFIG.PASSIVE_EXP_RATE * 1000,
      callback: () => this.addExp(1),
      callbackScope: this,
      loop: true
    });

    this.aiTimer = this.time.addEvent({
      delay: GAME_CONFIG.AI_ACTION_INTERVAL,
      callback: this.aiTurn,
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

  private aiTurn() {
    const redRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner === 'red' && r.troopCount > 5);
    
    if (redRegions.length === 0) return;
    
    const attackerRegion = redRegions[Math.floor(Math.random() * redRegions.length)];
    const targetRegions = Array.from(this.gameState.regions.values())
      .filter(r => r.owner !== 'red');
    
    if (targetRegions.length === 0) return;
    
    const target = targetRegions[Math.floor(Math.random() * targetRegions.length)];
    
    const existingAttack = this.gameState.attacks.find(
      attack => attack.fromRegionId === attackerRegion.id
    );
    
    if (!existingAttack && attackerRegion.troopCount > target.troopCount) {
      const distance = Math.sqrt(
        Math.pow(target.x - attackerRegion.x, 2) + 
        Math.pow(target.y - attackerRegion.y, 2)
      );
      
      const duration = (distance / GAME_CONFIG.ATTACK_SPEED) * 1000;
      const totalTroopsToSend = Math.floor((attackerRegion.troopCount - 1) * 0.6);
      
      if (totalTroopsToSend > 0) {
        const attack: Attack = {
          fromRegionId: attackerRegion.id,
          toRegionId: target.id,
          troopCount: totalTroopsToSend,
          progress: 0,
          duration: duration,
          lastTroopSendTime: Date.now() - GAME_CONFIG.TROOP_SEND_INTERVAL,
          totalTroopsToSend: totalTroopsToSend,
          troopsSent: 0,
          movingTroops: []
        };
        
        this.gameState.attacks.push(attack);
        
        const connection: Connection = {
          fromRegionId: attackerRegion.id,
          toRegionId: target.id,
          isActive: true,
          createdTime: Date.now()
        };
        
        this.gameState.connections.push(connection);
      }
    }
  }

  private updateAttacks(delta: number) {
    const currentTime = Date.now();
    
    this.gameState.attacks = this.gameState.attacks.filter(attack => {
      attack.progress += delta / attack.duration;
      
      const fromRegion = this.gameState.regions.get(attack.fromRegionId);
      const toRegion = this.gameState.regions.get(attack.toRegionId);
      if (!fromRegion || !toRegion) return false;
      
      // 개별 믿음 전송
      if (currentTime - attack.lastTroopSendTime >= GAME_CONFIG.TROOP_SEND_INTERVAL) {
        if (attack.troopCount > 0 && fromRegion.troopCount > 1) {
          fromRegion.troopCount -= 1;
          attack.troopCount -= 1;
          attack.troopsSent += 1;
          attack.lastTroopSendTime = currentTime;
          
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
    if (troop.owner === 'player') {
      attackPower = this.gameState.player.attackPowerMultiplier;
    }
    
    if (defenderTroops > attackPower) {
      toRegion.troopCount -= attackPower;
    } else {
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
        fontSize: '20px',
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