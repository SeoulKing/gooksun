export interface Region {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  owner: 'neutral' | 'player' | 'red';
  troopCount: number;
  baseGrowthRate: number;
}

export interface Player {
  level: number;
  exp: number;
  expToNext: number;
  skills: Skill[];
  growthRateMultiplier: number;
  productionRateMultiplier: number;
  attackPowerMultiplier: number;
  maxConnectionDistance: number;
  maxConnectionsPerRegion: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  apply: (player: Player) => void;
}

export interface Connection {
  fromRegionId: string;
  toRegionId: string;
  isActive: boolean;
  createdTime: number;
}

export interface MovingTroop {
  id: string;
  fromRegionId: string;
  toRegionId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  hasArrived: boolean;
  owner: 'player' | 'red';
}

export interface Attack {
  fromRegionId: string;
  toRegionId: string;
  troopCount: number;
  progress: number;
  duration: number;
  lastTroopSendTime: number;
  totalTroopsToSend: number;
  troopsSent: number;
  movingTroops: MovingTroop[];
}

export interface GameState {
  gameStartTime: number;
  isGameOver: boolean;
  isPaused: boolean;
  regions: Map<string, Region>;
  player: Player;
  connections: Connection[];
  dragConnection: {
    fromRegion: Region | null;
    isActive: boolean;
  };
  attacks: Attack[];
  movingTroops: MovingTroop[];
} 