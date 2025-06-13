import { Region, Skill } from './types';

// 한국 지도의 12개 거점 정의
export const INITIAL_REGIONS: Region[] = [
  {
    id: 'seoul',
    name: '서울',
    x: 500,
    y: 280,
    radius: 35,
    owner: 'player',
    troopCount: 20,
    baseGrowthRate: 2
  },
  {
    id: 'taebaek',
    name: '태백',
    x: 650,
    y: 280,
    radius: 25,
    owner: 'neutral',
    troopCount: 5,
    baseGrowthRate: 1
  },
  {
    id: 'icheon',
    name: '이천',
    x: 580,
    y: 340,
    radius: 25,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  },
  {
    id: 'busan',
    name: '부산',
    x: 710,
    y: 580,
    radius: 28,
    owner: 'neutral',
    troopCount: 8,
    baseGrowthRate: 1
  },
  {
    id: 'redbase',
    name: '세상',
    x: 900,
    y: 350,
    radius: 40,
    owner: 'red',
    troopCount: 30,
    baseGrowthRate: 3
  },
  {
    id: 'yongin',
    name: '용인',
    x: 460,
    y: 360,
    radius: 25,
    owner: 'neutral',
    troopCount: 6,
    baseGrowthRate: 1
  },
  {
    id: 'gapyeong',
    name: '가평',
    x: 520,
    y: 180,
    radius: 25,
    owner: 'neutral',
    troopCount: 3,
    baseGrowthRate: 1
  },
  {
    id: 'hwaseong',
    name: '화성',
    x: 380,
    y: 420,
    radius: 25,
    owner: 'neutral',
    troopCount: 5,
    baseGrowthRate: 1
  },
  {
    id: 'goseong',
    name: '고성',
    x: 600,
    y: 560,
    radius: 25,
    owner: 'neutral',
    troopCount: 3,
    baseGrowthRate: 1
  },
  {
    id: 'buan',
    name: '부안',
    x: 400,
    y: 500,
    radius: 25,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  },
  {
    id: 'ganghwa',
    name: '강화',
    x: 420,
    y: 260,
    radius: 25,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  },
  {
    id: 'namyangju',
    name: '남양주',
    x: 580,
    y: 200,
    radius: 25,
    owner: 'neutral',
    troopCount: 5,
    baseGrowthRate: 1
  },
  {
    id: 'yesan',
    name: '예산',
    x: 500,
    y: 440,
    radius: 25,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  }
];

// 스킬 정의
export const SKILLS: Skill[] = [
  {
    id: 'troopProduction',
    name: '📈 믿음 성장',
    description: '내 지역의 믿음 성장 속도 +50%',
    apply: (player) => {
      player.productionRateMultiplier += 0.5;
    }
  },
  {
    id: 'attackPower',
    name: '⚔️ 진리의 검',
    description: '내 믿음 1개가 적 2개를 이김',
    apply: (player) => {
      player.attackPowerMultiplier = 2;
    }
  },
  {
    id: 'connectionDistance',
    name: '🌐 믿음 전파',
    description: '연결 가능 거리 +50%',
    apply: (player) => {
      player.maxConnectionDistance += 100;
    }
  },
  {
    id: 'multiConnection',
    name: '🔗 다중 전도',
    description: '한 지역에서 2개 지역과 동시 연결',
    apply: (player) => {
      player.maxConnectionsPerRegion += 1;
    }
  },
  {
    id: 'resourceFlow',
    name: '💰 풍성한 복',
    description: '모든 자원 흐름 +50%',
    apply: (player) => {
      player.growthRateMultiplier += 0.5;
    }
  },
  {
    id: 'expBoost',
    name: '📚 지혜 증가',
    description: '모든 경험치 획득 +50%',
    apply: (_player) => {
      // 이 효과는 경험치 획득 시 적용됩니다
    }
  }
];

// 게임 상수들
export const GAME_CONFIG = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 800,
  GROWTH_INTERVAL: 2000, // 2초마다 자원 흐름
  CONNECTION_TRANSFER_RATE: 0.1, // 연결당 10% 자원 전송
  ATTACK_SPEED: 30, // 병력표시원 속도 (픽셀/초)
  TROOP_SEND_INTERVAL: 800, // 0.8초마다 1개 병력 전송
  BASE_EXP_TO_LEVEL: 100,
  PASSIVE_EXP_RATE: 5, // 5초마다 1 경험치
  REGION_CAPTURE_EXP: 30,
  AI_ACTION_INTERVAL: 4000, // AI 행동 간격 4초
  TARGET_CLEAR_TIME: 300, // 목표 클리어 시간 5분
  MAX_CONNECTION_DISTANCE: 200, // 최대 연결 가능 거리
  AUTO_DISCONNECT_TIME: 5000 // 5초 후 자동 연결 해제
}; 