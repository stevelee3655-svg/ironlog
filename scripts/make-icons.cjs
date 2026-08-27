/*
 * IronLog 아이콘 생성기.
 *
 * 왜 있나: vite.config.ts의 매니페스트가 /icons/icon-192x192.png 를 가리키는데
 * 그 파일이 **한 번도 존재한 적이 없었다.** 배포본에서 요청하면 HTML이 돌아온다.
 * 그래서 폰 홈 화면에 추가하면 아이콘이 비어 있었다.
 *
 * 이 저장소에는 SVG 래스터라이저가 없고(sharp·resvg 모두 없음) 그 하나를 위해
 * 의존성을 늘리고 싶지 않다. icon.svg는 사각형과 원뿐이라 직접 그리는 편이 싸다.
 * 색은 Stripe DESIGN.md 값을 쓴다(캔버스 흰색, canvas-soft, hairline, 인디고).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const INDIGO = [0x53, 0x3a, 0xfd];   // colors.primary
const CANVAS = [0xff, 0xff, 0xff];   // colors.canvas
const SOFT = [0xf6, 0xf9, 0xfc];     // colors.canvas-soft
const HAIRLINE = [0xe3, 0xe8, 0xee]; // colors.hairline

/** 512 기준 좌표를 size 기준으로 옮긴다. icon.svg의 도형을 그대로 옮겨 적었다. */
function drawIcon(size) {
  const s = size / 512;
  const px = Buffer.alloc(size * size * 3);

  const put = (x, y, c) => {
    const i = (y * size + x) * 3;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
  };

  // 배경
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, CANVAS);

  // 원 (테두리 포함)
  const cx = 256 * s, cy = 256 * s, r = 210 * s, rIn = (210 - 3) * s;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= rIn) put(x, y, SOFT);
      else if (d <= r) put(x, y, HAIRLINE);
    }
  }

  // 바벨 — icon.svg의 rect 다섯 개 (모서리 둥글기는 이 크기에서 눈에 안 띄어 생략)
  const rects = [
    [130, 196, 22, 120],
    [160, 216, 14, 80],
    [360, 196, 22, 120],
    [338, 216, 14, 80],
    [174, 248, 164, 16]
  ];
  for (const [rx, ry, rw, rh] of rects) {
    const x0 = Math.round(rx * s), y0 = Math.round(ry * s);
    const x1 = Math.round((rx + rw) * s), y1 = Math.round((ry + rh) * s);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x >= 0 && x < size && y >= 0 && y < size) put(x, y, INDIGO);
      }
    }
  }
  return px;
}

// ── 최소 PNG 인코더 ───────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // 필터 없음
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // 채널당 8비트
  ihdr[9] = 2;  // 트루컬러
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = process.argv[2];
fs.mkdirSync(path.join(outDir, 'icons'), { recursive: true });
for (const [size, file] of [
  [180, 'apple-touch-icon.png'],
  [192, 'icons/icon-192x192.png'],
  [512, 'icons/icon-512x512.png']
]) {
  const buf = encodePng(drawIcon(size), size);
  fs.writeFileSync(path.join(outDir, file), buf);
  console.log(file, buf.length + ' bytes');
}
