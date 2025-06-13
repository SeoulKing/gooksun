import { Region, Skill } from './types';

// 한국 지도의 12개 거점 정의 (모바일 최적화 - 겹침 방지)
export const INITIAL_REGIONS: Region[] = [
  {
    id: 'seoul',
    name: '서울',
    x: 300,  // 중앙
    y: 200,  
    radius: 30,
    owner: 'player',
    troopCount: 20,
    baseGrowthRate: 2
  },
  {
    id: 'taebaek',
    name: '태백',
    x: 450,  // 오른쪽 위
    y: 180,  
    radius: 22,
    owner: 'neutral',
    troopCount: 5,
    baseGrowthRate: 1
  },
  {
    id: 'icheon',
    name: '이천',
    x: 380,  // 서울 오른쪽 아래
    y: 240,  
    radius: 22,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  },
  {
    id: 'busan',
    name: '부산',
    x: 450,  // 오른쪽 아래
    y: 450,  
    radius: 25,
    owner: 'neutral',
    troopCount: 8,
    baseGrowthRate: 1
  },
  {
    id: 'redbase',
    name: '세상',
    x: 520,  // 맨 오른쪽
    y: 300,  
    radius: 35,
    owner: 'red',
    troopCount: 30,
    baseGrowthRate: 3
  },
  {
    id: 'yongin',
    name: '용인',
    x: 240,  // 서울 왼쪽 아래
    y: 260,  
    radius: 22,
    owner: 'neutral',
    troopCount: 6,
    baseGrowthRate: 1
  },
  {
    id: 'gapyeong',
    name: '가평',
    x: 340,  // 서울 오른쪽 위
    y: 130,  
    radius: 22,
    owner: 'neutral',
    troopCount: 3,
    baseGrowthRate: 1
  },
  {
    id: 'hwaseong',
    name: '화성',
    x: 180,  // 왼쪽 중간
    y: 320,  
    radius: 22,
    owner: 'neutral',
    troopCount: 5,
    baseGrowthRate: 1
  },
  {
    id: 'goseong',
    name: '고성',
    x: 380,  // 부산 위쪽
    y: 400,  
    radius: 22,
    owner: 'neutral',
    troopCount: 3,
    baseGrowthRate: 1
  },
  {
    id: 'buan',
    name: '부안',
    x: 220,  // 왼쪽 아래
    y: 380,  
    radius: 22,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  },
  {
    id: 'ganghwa',
    name: '강화',
    x: 240,  // 서울 왼쪽
    y: 160,  
    radius: 22,
    owner: 'neutral',
    troopCount: 4,
    baseGrowthRate: 1
  },
  {
    id: 'namyangju',
    name: '남양주',
    x: 360,  // 서울 오른쪽
    y: 160,  
    radius: 22,
    owner: 'neutral',
    troopCount: 5,
    baseGrowthRate: 1
  },
  {
    id: 'yesan',
    name: '예산',
    x: 280,  // 서울 아래
    y: 320,  
    radius: 22,
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
  CANVAS_WIDTH: 600,  // 800 → 600으로 더 축소 (모바일 최적화)
  CANVAS_HEIGHT: 700, // 600 → 700으로 세로 확장 (여유 공간)
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
  AUTO_DISCONNECT_TIME: 5000, // 5초 후 자동 연결 해제
  MAX_ATTACK_DURATION: 5000 // 최대 공격 지속 시간 5초
}; 