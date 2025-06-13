import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../dist')));

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// 모든 라우트를 메인 페이지로 리다이렉트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🎮 한국 지도 전략 게임 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`🌐 http://localhost:${PORT} 에서 게임을 즐기세요!`);
}); 