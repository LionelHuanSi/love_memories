'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  Plus,
  ArrowLeft,
  Share2,
  Maximize2,
  LayoutDashboard,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Calendar,
  MapPin,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface CosmicMemory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string;
  location_label: string | null;
  type: string;
  memory_media: Array<{
    id: string;
    storage_path: string;
    thumbnail_path?: string | null;
  }>;
}

/**
 * =====================================================================
 * CẤU HÌNH BẦU TRỜI SAO 3D (STARFIELD CONFIGURATION)
 * Bạn có thể tự do chỉnh sửa số sao, tốc độ xoay, kích thước sao tại đây:
 * =====================================================================
 */
export const STARFIELD_CONFIG = {
  // 1. Số lượng ngôi sao trong vũ trụ (Bạn có thể tăng/giảm tùy thích: 5000, 8000, 12000...)
  starCount: 7000,

  // 2. Tốc độ tự động xoay của bầu trời sao
  rotationSpeedY: 0.0002, // Tốc độ xoay ngang (trục Y). Tăng lên 0.001 nếu muốn quay nhanh hơn
  rotationSpeedX: 0.0002, // Tốc độ xoay dọc (trục X)

  // 3. Tương tác chuột (Góc nhìn Parallax 3D)
  parallaxIntensity: 28,    // Độ nhạy dịch chuyển camera theo chuột (càng lớn càng nghiêng nhiều)
  parallaxSmoothness: 0.08,  // Độ mượt (0.02 rất mượt, 0.1 di chuyển tức thì)

  // 4. Kích thước & Độ sáng của các ngôi sao
  starSizeMultiplier: 1.0,  // Tỉ lệ phóng to/thu nhỏ toàn bộ sao (ví dụ: 1.2 là lớn hơn 20%)
  minStarPointSize: 1.4,    // Kích thước tối thiểu của hạt sao li ti (pixel)
  maxStarPointSize: 110.0,  // Kích thước tối đa của đại cự tinh phát quang lớn

  // 5. Khoảng cách Camera quan sát vũ trụ
  cameraDistance: 600,      // Khoảng cách camera (càng lớn thì góc nhìn càng bao quát)
  cameraFov: 75,            // Góc nhìn trường ảnh FOV (độ rộng ống kính, 75 độ chuẩn thiên văn)

  // 6. Phạm vi phân bố cụm thiên hà
  clusterRadius: 680,       // Bán kính cụm sao dày đặc ở trung tâm
  clusterSpreadRatio: 0.65,  // 72% sao tập trung ở cụm trung tâm, 28% sao trải rộng bao la ra 4 góc
  deepFieldRange: 2400,     // Độ rộng trải dài của không gian sâu

  // 7. Mưa sao băng (Shooting Stars)
  shootingStarsEnabled: true,
  shootingStarIntervalMin: 2.0, // Thời gian tối thiểu giữa các đợt sao băng (giây)
  shootingStarIntervalMax: 5.5, // Thời gian tối đa giữa các đợt sao băng (giây)

  // 8. Bảng thông số Telemetry (Mặc định: false - đã tắt hoàn toàn theo yêu cầu của bạn)
  showTelemetryBadge: false,

  // 9. Hình nền tùy chọn (Custom Wallpaper)
  // Đường dẫn ảnh trong thư mục /public (hoặc URL ngoài). Đặt '' để tắt hình nền.
  backgroundImage: '/wallpaper.jpg',
  backgroundDimOpacity: 1.5, // Độ làm dịu (0.0: sáng nguyên bản, 0.35: vừa vặn làm nổi bật sao, 0.7: tối dịu)

  // 10. Khoảng cách / Độ trải rộng giữa các ngôi sao ký ức (Node Spacing)
  // Mặc định: 1.0 (chuẩn)
  // Tăng lên (ví dụ: 1.25, 1.4, 1.6...) nếu bạn muốn các ngôi sao cách xa nhau ra hơn
  // Giảm xuống (ví dụ: 0.85, 0.75...) nếu bạn muốn các ngôi sao gom lại gần nhau hơn
  nodeSpreadMultiplier: 1.25,
};

export type StarfieldConfig = typeof STARFIELD_CONFIG;

interface CosmicGalaxy3DProps {
  initialMemories: CosmicMemory[];
  publicTitle?: string;
  tagline?: string;
  daysTogether?: number | null;
  relationshipStartDate?: string | null;
  coupleNames?: string;
  isMember?: boolean;
  musicUrl?: string | null;
  // Tùy chọn cấu hình sao từ bên ngoài (nếu truyền vào thì ưu tiên, không thì dùng STARFIELD_CONFIG)
  config?: Partial<StarfieldConfig>;
}

// Responsive Camera Distance: Pulls camera back smoothly when aspect ratio is narrower (mobile, portrait, shrunk window)
function getResponsiveCameraDistance(width: number, height: number, baseDistance: number = 720): number {
  const aspect = width / Math.max(height, 1);
  const baseAspect = 16 / 9; // ~1.778

  if (aspect >= baseAspect) {
    return baseDistance;
  }
  // Smoothly pull back camera as aspect narrows without over-shrinking
  const ratio = baseAspect / aspect;
  return baseDistance * Math.min(1.75, Math.max(1.0, Math.pow(ratio, 0.72)));
}

// Base spine control points defining the graceful winding cascading S-curve path from Top-Left to Bottom-Right ("uốn lượn")
const BASE_TIMELINE_SPINE_POINTS = [
  new THREE.Vector3(-235, 245, 20),
  new THREE.Vector3(-110, 180, 28),
  new THREE.Vector3(-35, 70, 34),
  new THREE.Vector3(-10, -30, 32),
  new THREE.Vector3(85, -140, 28),
  new THREE.Vector3(210, -245, 20),
];

function getTimelineCurve(multiplier: number = 1.0): THREE.CatmullRomCurve3 {
  const scaledPoints = BASE_TIMELINE_SPINE_POINTS.map(
    (p) => new THREE.Vector3(p.x * multiplier, p.y * multiplier, p.z)
  );
  return new THREE.CatmullRomCurve3(scaledPoints, false, 'centripetal', 0.2);
}

// Cache equidistant points per (total + multiplier) to guarantee 100% equal spacing between consecutive stars
const cachedTimelinePoints = new Map<string, THREE.Vector3[]>();

function getChronologicalTimelineNode(index: number, totalMemories: number, multiplier: number = 1.0): THREE.Vector3 {
  const total = Math.max(totalMemories, 1);
  const cacheKey = `${total}_${multiplier}`;
  let points = cachedTimelinePoints.get(cacheKey);
  if (!points || points.length !== total) {
    const curve = getTimelineCurve(multiplier);
    if (total === 1) {
      points = [curve.getPointAt(0.5)];
    } else {
      // getSpacedPoints(total - 1) divides the curve into (total - 1) EQUIDISTANT segments
      // so every consecutive star has the EXACT same arc-length distance!
      points = curve.getSpacedPoints(total - 1);
    }
    cachedTimelinePoints.set(cacheKey, points);
  }

  const pt = points[index] || points[0];
  return pt.clone();
}

// Safe resolver for memory photos (Google Drive, local /uploads, external URLs, or fallback)
export function resolveCosmicPhotoUrl(path?: string | null): string {
  if (!path) return '/fallback-photo.jpg';
  if (path.includes('drive.google.com')) {
    const match = path.match(/\/d\/([a-zA-Z0-9_-]+)/) || path.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
    }
  }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/') || path.startsWith('data:')) {
    return path;
  }
  return '/fallback-photo.jpg';
}

// Generate Radiant 4-Point Diamond Starburst Lens Flare for Sparkling Memory Stars ("nhấp nháy")
function createRadiantStarTexture(color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  // 1. Soft radial corona aura
  const coronaGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
  coronaGrad.addColorStop(0, '#ffffff');
  coronaGrad.addColorStop(0.18, '#ffffff');
  coronaGrad.addColorStop(0.38, color);
  coronaGrad.addColorStop(0.72, 'rgba(167, 139, 250, 0.18)');
  coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // 2. Horizontal diffraction spike (bright diamond needle flare)
  const hGrad = ctx.createLinearGradient(cx - 120, cy, cx + 120, cy);
  hGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  hGrad.addColorStop(0.38, color);
  hGrad.addColorStop(0.5, '#ffffff');
  hGrad.addColorStop(0.62, color);
  hGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 120, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Vertical diffraction spike
  const vGrad = ctx.createLinearGradient(cx, cy - 120, cx, cy + 120);
  vGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  vGrad.addColorStop(0.38, color);
  vGrad.addColorStop(0.5, '#ffffff');
  vGrad.addColorStop(0.62, color);
  vGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = vGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 3.5, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Subtle 45-degree diagonal cross rays
  ctx.beginPath();
  ctx.ellipse(cx, cy, 55, 1.8, Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 55, 1.8, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 5. Blazing pure white diamond core
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.6, '#ffffff');
  coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

// Generate Clean, Non-Blinding Soft Radial Glow for Memory Nodes
function createCleanNodeGlowTexture(color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const cx = 64;
  const cy = 64;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, color);
  grad.addColorStop(0.6, 'rgba(167, 139, 250, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Generate smooth circular particle texture for background stars
function createCircleParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.6, 'rgba(220, 200, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 1. Texture vệt đuôi sao băng phát sáng dạng gradient mượt mà
function createMeteorTailTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 64);

  // Tạo vệt sáng vuốt từ trái (đuôi mờ dần về 0) sang phải (đầu sáng rực)
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(167, 243, 208, 0)');
  grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.15)');
  grad.addColorStop(0.65, 'rgba(167, 139, 250, 0.55)');
  grad.addColorStop(0.92, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 1)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.quadraticCurveTo(128, 20, 256, 26);
  ctx.lineTo(256, 38);
  ctx.quadraticCurveTo(128, 44, 0, 32);
  ctx.closePath();
  ctx.fill();

  // Thêm lõi sáng rực chạy dọc sống lưng
  const coreGrad = ctx.createLinearGradient(48, 0, 256, 0);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  coreGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.7)');
  coreGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, 32);
  ctx.lineTo(256, 32);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 2. Texture hào quang tia sáng hình chữ thập (Starburst / Lens Flare) cho mũi sao băng
function createMeteorHeadTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);

  // Quầng phát quang tròn bao quanh
  const radGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  radGrad.addColorStop(0.2, 'rgba(186, 230, 253, 0.85)');
  radGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.35)');
  radGrad.addColorStop(0.85, 'rgba(167, 139, 250, 0.08)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  // 4 tia sáng nhọn chữ thập (Diffraction Spikes)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(64, 12);
  ctx.lineTo(64, 116);
  ctx.moveTo(12, 64);
  ctx.lineTo(116, 64);
  ctx.stroke();

  // 2 tia chéo nhỏ tinh tế
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(34, 34);
  ctx.lineTo(94, 94);
  ctx.moveTo(94, 34);
  ctx.lineTo(34, 94);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 3. Texture hạt bụi sao băng lấp lánh (Sparkling Ember)
function createStardustSparkTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  const radGrad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  radGrad.addColorStop(0.35, 'rgba(196, 181, 253, 0.8)');
  radGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.25)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 4. Tạo hình học dải ruy băng 4 đỉnh quay theo camera (Ribbon Quad)
function createRibbonQuadGeometry(): { geo: THREE.BufferGeometry; positions: Float32Array } {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(12);
  const uvs = new Float32Array([
    0, 0, // Tail Left
    0, 1, // Tail Right
    1, 0, // Head Left
    1, 1, // Head Right
  ]);
  const indices = new Uint16Array([
    0, 1, 2,
    2, 1, 3,
  ]);

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return { geo, positions };
}

// Synthesise soothing cosmic romantic audio chords with Web Audio API
class AmbientCosmicSound {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timer: number | null = null;

  start() {
    if (this.isPlaying) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isPlaying = true;

      const chords = [
        [146.83, 220.0, 277.18, 329.63, 440.0], // Dmaj9
        [185.0, 220.0, 277.18, 369.99, 440.0], // F#m7
        [123.47, 185.0, 246.94, 293.66, 369.99], // Bm7
        [196.0, 246.94, 293.66, 392.0, 440.0], // Gmaj7
      ];

      let chordIndex = 0;
      const playNextChord = () => {
        if (!this.isPlaying || !this.ctx) return;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;

        currentChord.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(650, this.ctx.currentTime);

          const now = this.ctx.currentTime;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.035, now + 1.8);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 6.0);
        });

        this.timer = window.setTimeout(playNextChord, 4200);
      };

      playNextChord();
    } catch (e) {
      console.warn('AudioContext not allowed yet:', e);
    }
  }

  playChime() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const notes = [587.33, 880.0, 1174.66, 1760.0];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

        const startTime = this.ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.04, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.3);
      });
    } catch { }
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }
}

export interface CosmicPalette {
  id: string;
  name: string;
  hex: number;
  colorStr: string;
  glowStr: string;
  twDot: string;
  twBorderHover: string;
}

export const COSMIC_PALETTES: CosmicPalette[] = [
  {
    id: 'rose',
    name: 'Rose Starlight',
    hex: 0xf472b6, // Rose Pink
    colorStr: '#f472b6',
    glowStr: '#f43f5e',
    twDot: 'bg-pink-400 shadow-[0_0_8px_#f472b6]',
    twBorderHover: 'group-hover:border-pink-400/90',
  },
  {
    id: 'gold',
    name: 'Solar Amber',
    hex: 0xfbbf24, // Warm Gold
    colorStr: '#fbbf24',
    glowStr: '#f59e0b',
    twDot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    twBorderHover: 'group-hover:border-amber-400/90',
  },
  {
    id: 'cyan',
    name: 'Celestial Cyan',
    hex: 0x38bdf8, // Sky Cyan
    colorStr: '#38bdf8',
    glowStr: '#0284c7',
    twDot: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
    twBorderHover: 'group-hover:border-sky-400/90',
  },
  {
    id: 'violet',
    name: 'Nebula Lavender',
    hex: 0xc084fc, // Soft Violet
    colorStr: '#c084fc',
    glowStr: '#9333ea',
    twDot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
    twBorderHover: 'group-hover:border-purple-400/90',
  },
  {
    id: 'emerald',
    name: 'Aurora Mint',
    hex: 0x34d399, // Emerald Mint
    colorStr: '#34d399',
    glowStr: '#059669',
    twDot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    twBorderHover: 'group-hover:border-emerald-400/90',
  },
  {
    id: 'coral',
    name: 'Cosmic Coral',
    hex: 0xfb923c, // Peach Coral
    colorStr: '#fb923c',
    glowStr: '#ea580c',
    twDot: 'bg-orange-400 shadow-[0_0_8px_#fb923c]',
    twBorderHover: 'group-hover:border-orange-400/90',
  },
];

export default function CosmicGalaxy3D({
  initialMemories,
  publicTitle = 'Our Little Universe',
  tagline = 'Một vũ trụ nhỏ, lưu giữ những vì sao ký ức của riêng chúng mình',
  daysTogether = null,
  relationshipStartDate = null,
  coupleNames = 'Leo Messi ♡ Football',
  isMember = true,
  musicUrl = null,
  config = {},
}: CosmicGalaxy3DProps) {
  // Kết hợp cấu hình người dùng truyền vào với cấu hình mặc định
  const cfg = { ...STARFIELD_CONFIG, ...config };

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  // Memories & Interaction state
  const [memories, setMemories] = useState<CosmicMemory[]>(initialMemories);
  const [activeMemory, setActiveMemory] = useState<CosmicMemory | null>(null);
  const [hoveredMemory, setHoveredMemory] = useState<CosmicMemory | null>(null);
  const hoveredMemoryIdRef = useRef<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const [wishToast, setWishToast] = useState<string | null>(null);
  const [fullPhotoView, setFullPhotoView] = useState<string | null>(null);
  const [fullPhotoIndex, setFullPhotoIndex] = useState<number | null>(null);

  // Hero & Storytelling mode state
  const [showHero, setShowHero] = useState(false);
  const showHeroRef = useRef(false);
  const [showConstellations, setShowConstellations] = useState(true);
  const showConstellationsRef = useRef(true);
  const constellationGroupRef = useRef<THREE.Group | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const tourTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Controls
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const soundRef = useRef<AmbientCosmicSound | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const memoryObjectsRef = useRef<
    Array<{
      mesh: THREE.Object3D;
      memory: CosmicMemory;
      position: THREE.Vector3;
      sphere: THREE.Mesh;
      innerCore: THREE.Mesh;
      ring: THREE.Mesh;
      hitMesh: THREE.Mesh;
      starburstSprite: THREE.Sprite;
      auraSprite: THREE.Sprite;
      baseStarburstScale: number;
      baseAuraScale: number;
    }>
  >([]);

  // DOM label refs for floating 3D star name tags & polaroids
  const starLabelsRef = useRef<Array<HTMLDivElement | null>>([]);

  // Active Memory & Floating 3D Cards References
  const activeMemoryRef = useRef<CosmicMemory | null>(null);
  const activeStarPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const photoCardsRef = useRef<Array<HTMLDivElement | null>>([]);

  // Manual shooting star trigger callback ref
  const triggerShootingStarsRef = useRef<(() => void) | null>(null);

  // Dynamic Camera state (calibrated to cfg.cameraDistance)
  const cameraStateRef = useRef({
    currentPos: new THREE.Vector3(0, 0, cfg.cameraDistance),
    targetPos: new THREE.Vector3(0, 0, cfg.cameraDistance),
    currentLookAt: new THREE.Vector3(0, 0, 0),
    targetLookAt: new THREE.Vector3(0, 0, 0),
    isTransitioning: false,
    transitionProgress: 1,
    orbitRadius: cfg.cameraDistance,
    orbitAngleY: 0,
    orbitAngleX: 0,
    isDragging: false,
    prevPointerX: 0,
    prevPointerY: 0,
    parallaxX: 0,
    parallaxY: 0,
  });

  // Sync constellation and hero visibility
  useEffect(() => {
    showConstellationsRef.current = showConstellations;
    if (constellationGroupRef.current) {
      constellationGroupRef.current.visible = showConstellations;
    }
  }, [showConstellations]);

  useEffect(() => {
    showHeroRef.current = showHero;
  }, [showHero]);

  // Chronologically sorted memories (earliest milestone -> most recent moment)
  const sortedMemories = useMemo(() => {
    return [...memories].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [memories]);

  // Calculate 3D position along the single chronological starlight timeline
  const getMemoryCoordinates = useCallback((index: number, total: number = sortedMemories.length) => {
    return getChronologicalTimelineNode(index, total, cfg.nodeSpreadMultiplier ?? 1.0);
  }, [sortedMemories.length, cfg.nodeSpreadMultiplier]);

  // Initialize Sound & Autoplay with gentle volume (0.2)
  useEffect(() => {
    soundRef.current = new AmbientCosmicSound();
    const SOFT_VOLUME = 0.2; // Âm lượng nhỏ dịu dàng (20%)

    const tryStartAudio = () => {
      if (bgAudioRef.current) {
        bgAudioRef.current.volume = SOFT_VOLUME;
        bgAudioRef.current
          .play()
          .then(() => {
            setIsAudioPlaying(true);
            removeInteractionListeners();
          })
          .catch(() => {
            // Autoplay blocked by browser policy until interaction
          });
      } else if (soundRef.current) {
        soundRef.current.start();
        setIsAudioPlaying(true);
        removeInteractionListeners();
      }
    };

    const handleFirstInteraction = () => {
      tryStartAudio();
    };

    const removeInteractionListeners = () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    // 1. Initial autoplay attempt
    tryStartAudio();

    // 2. Fallback listener on first user interaction if blocked by autoplay policy
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      removeInteractionListeners();
      soundRef.current?.stop();
    };
  }, [musicUrl]);

  const toggleSound = () => {
    if (musicUrl && bgAudioRef.current) {
      if (isAudioPlaying) {
        bgAudioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        bgAudioRef.current.volume = 0.2;
        bgAudioRef.current
          .play()
          .then(() => {
            setIsAudioPlaying(true);
          })
          .catch(() => {
            const playing = soundRef.current?.toggle() || false;
            setIsAudioPlaying(playing);
          });
      }
      return;
    }

    if (soundRef.current) {
      const playing = soundRef.current.toggle();
      setIsAudioPlaying(playing);
    }
  };

  // Fly camera to a specific memory in 3D
  const flyToMemory = useCallback((memory: CosmicMemory) => {
    const memObj = memoryObjectsRef.current.find((item) => item.memory.id === memory.id);
    if (!memObj || !cameraRef.current) return;

    soundRef.current?.playChime();
    setActiveMemory(memory);
    activeMemoryRef.current = memory;
    setShowHero(false); // Auto collapse hero when diving into a star

    const starPos = memObj.position;
    activeStarPosRef.current.copy(starPos);

    // Set fly-in destination: right in front of the star (z + 32, y + 1)
    const flyPos = starPos.clone().add(new THREE.Vector3(0, 1, 32));

    const state = cameraStateRef.current;
    state.targetPos.copy(flyPos);
    state.targetLookAt.copy(starPos);
    state.orbitAngleY = 0;
    state.orbitAngleX = 0;
    state.isTransitioning = true;
    state.transitionProgress = 0;
  }, [setActiveMemory, setShowHero]);

  // Fly back out to the panoramic galaxy orbit
  const flyBackToGalaxy = useCallback(() => {
    setActiveMemory(null);
    activeMemoryRef.current = null;

    const state = cameraStateRef.current;
    const r = state.orbitRadius;
    const x = r * Math.sin(state.orbitAngleY) * Math.cos(state.orbitAngleX);
    const y = r * Math.sin(state.orbitAngleX);
    const z = r * Math.cos(state.orbitAngleY) * Math.cos(state.orbitAngleX);

    state.targetPos.set(x, y, z);
    state.targetLookAt.set(0, 0, 0);
    state.isTransitioning = true;
    state.transitionProgress = 0;
  }, [setActiveMemory]);

  // Guided Story Tour Logic (Chronological sequence: First milestone -> Present)
  const startStoryTour = () => {
    if (sortedMemories.length === 0) return;
    setIsTourActive(true);
    setTourIndex(0);
    setIsTourPaused(false);
    setShowHero(false);
    if (!isAudioPlaying && soundRef.current) {
      soundRef.current.start();
      setIsAudioPlaying(true);
    }
    flyToMemory(sortedMemories[0]);
  };

  const stopStoryTour = useCallback(() => {
    setIsTourActive(false);
    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    flyBackToGalaxy();
  }, [flyBackToGalaxy, setIsTourActive]);

  const nextTourStep = useCallback(() => {
    if (tourIndex < sortedMemories.length - 1) {
      const nextIdx = tourIndex + 1;
      setTourIndex(nextIdx);
      flyToMemory(sortedMemories[nextIdx]);
    } else {
      stopStoryTour();
      setWishToast('✦ Bạn đã hoàn thành chuyến du hành qua các vì sao ký ức ♡');
      setTimeout(() => setWishToast(null), 4000);
    }
  }, [tourIndex, sortedMemories, flyToMemory, stopStoryTour, setTourIndex, setWishToast]);

  const prevTourStep = () => {
    if (tourIndex > 0) {
      const prevIdx = tourIndex - 1;
      setTourIndex(prevIdx);
      flyToMemory(sortedMemories[prevIdx]);
    }
  };

  // Auto advance tour every 7.5 seconds if not paused
  useEffect(() => {
    if (isTourActive && !isTourPaused) {
      tourTimerRef.current = setTimeout(() => {
        nextTourStep();
      }, 7500);
    }
    return () => {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    };
  }, [isTourActive, isTourPaused, nextTourStep]);

  // Make a Starlight Wish Easter Egg
  const handleMakeWish = () => {
    soundRef.current?.playChime();
    triggerShootingStarsRef.current?.();
    setWishToast('✦ Nguyện ước cho tình yêu của chúng ta mãi sáng ngời như muôn vì sao ♡');
    setTimeout(() => {
      setWishToast(null);
    }, 4500);
  };

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Adjust orbit distance according to aspect ratio so the entire galaxy timeline is perfectly framed
    const idealRadius = getResponsiveCameraDistance(width, height, cfg.cameraDistance);
    cameraStateRef.current.orbitRadius = idealRadius;
    cameraStateRef.current.currentPos.set(0, 0, idealRadius);
    cameraStateRef.current.targetPos.set(0, 0, idealRadius);

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(cfg.cameraFov, width / height, 0.1, 3500);
    camera.position.copy(cameraStateRef.current.currentPos);
    cameraRef.current = camera;

    // 2. WebGL Renderer with graceful fallback
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0); // Đảm bảo nền canvas trong suốt 100% để hiển thị ảnh nền
      rendererRef.current = renderer;
    } catch (e) {
      console.warn('WebGL initialization warning:', e);
      return;
    }

    // Helper textures for clean glowing nodes
    const circleParticleTexture = createCircleParticleTexture();
    const cosmicPaletteTextures = COSMIC_PALETTES.map((p) => ({
      glow: createCleanNodeGlowTexture(p.glowStr || p.colorStr),
      starburst: createRadiantStarTexture(p.colorStr),
    }));

    // 3. Hệ thống Ngôi Sao Đa Phổ Thiên Văn (Harvard Spectra: O, B, A, F, G, K, M)
    const starCount = cfg.starCount;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    // Bảng màu 7 quang phổ thiên văn học chuẩn xác (Harvard O, B, A, F, G, K, M)
    const spectralTypes = [
      { color: new THREE.Color('#9bb0ff'), weight: 0.12 }, // Type O: Xanh lam sâu (Hot)
      { color: new THREE.Color('#b8c7ff'), weight: 0.16 }, // Type B: Xanh lam nhạt
      { color: new THREE.Color('#ffffff'), weight: 0.22 }, // Type A: Trắng tinh khiết
      { color: new THREE.Color('#f8f7ff'), weight: 0.18 }, // Type F: Vàng trắng
      { color: new THREE.Color('#ffe5b4'), weight: 0.14 }, // Type G: Vàng mặt trời
      { color: new THREE.Color('#ffaa55'), weight: 0.10 }, // Type K: Cam ấm áp
      { color: new THREE.Color('#ff5533'), weight: 0.08 }, // Type M: Đỏ cam (Cool)
    ];

    // Explicit Prominent Giant Stars with Soft Radiant Halos (matching reference image)
    const prominentStars = [
      { pos: [-430, -45, 30], color: new THREE.Color('#ffffff'), size: 66.0 }, // Big white halo star on mid-left
      { pos: [540, -240, 30], color: new THREE.Color('#ffffff'), size: 54.0 }, // Bottom right bright halo star
      { pos: [-200, 10, -10], color: new THREE.Color('#ffd27d'), size: 48.0 }, // Upper mid-left warm gold star
      { pos: [-310, -190, -20], color: new THREE.Color('#d8e6ff'), size: 42.0 }, // Lower-mid left soft blue star
      { pos: [210, 160, -15], color: new THREE.Color('#9bb0ff'), size: 38.0 }, // Upper right blue star
      { pos: [350, 35, 10], color: new THREE.Color('#f8f7ff'), size: 36.0 }, // Mid-right star
      { pos: [25, -45, -5], color: new THREE.Color('#ffd79c'), size: 36.0 }, // Near core golden star
      { pos: [-80, 175, -30], color: new THREE.Color('#ff6644'), size: 32.0 }, // Upper red-orange star
      { pos: [-135, -90, 15], color: new THREE.Color('#ffffff'), size: 32.0 }, // Core white star
      { pos: [110, -160, 20], color: new THREE.Color('#b8c7ff'), size: 30.0 }, // Lower right blue star
      { pos: [-380, 120, -40], color: new THREE.Color('#ffffff'), size: 30.0 }, // Upper left white star
      { pos: [420, -110, -20], color: new THREE.Color('#ffe5b4'), size: 32.0 }, // Right golden star
    ];

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;

      if (i < prominentStars.length) {
        const p = prominentStars[i];
        starPositions[idx] = p.pos[0];
        starPositions[idx + 1] = p.pos[1];
        starPositions[idx + 2] = p.pos[2];

        starColors[idx] = p.color.r;
        starColors[idx + 1] = p.color.g;
        starColors[idx + 2] = p.color.b;

        starSizes[i] = p.size * cfg.starSizeMultiplier;
        continue;
      }

      // Phân bố cụm sao thiên hà (Galactic cluster core + wide cosmic space)
      let x: number;
      let y: number;
      let z: number;

      if (Math.random() < cfg.clusterSpreadRatio) {
        // Cụm thiên hà tự nhiên ở trung tâm trải rộng khắp màn hình
        const r = Math.pow(Math.random(), 1.08) * cfg.clusterRadius + 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2.0 * Math.random() - 1.0);

        x = r * Math.sin(phi) * Math.cos(theta) * 1.35; // Trải rộng theo chiều ngang màn hình
        y = r * Math.sin(phi) * Math.sin(theta) * 0.95;
        z = r * Math.cos(phi) * 0.95;
      } else {
        // Không gian bao la bên ngoài phủ kín các góc
        x = (Math.random() - 0.5) * cfg.deepFieldRange;
        y = (Math.random() - 0.5) * (cfg.deepFieldRange * 0.625);
        z = (Math.random() - 0.5) * (cfg.deepFieldRange * 0.75);
      }

      starPositions[idx] = x;
      starPositions[idx + 1] = y;
      starPositions[idx + 2] = z;

      // Chọn màu theo tỷ lệ phổ
      const randVal = Math.random();
      let accum = 0;
      let chosenColor = spectralTypes[2].color;
      for (const st of spectralTypes) {
        accum += st.weight;
        if (randVal <= accum) {
          chosenColor = st.color;
          break;
        }
      }

      starColors[idx] = chosenColor.r;
      starColors[idx + 1] = chosenColor.g;
      starColors[idx + 2] = chosenColor.b;

      // Phân bổ kích thước sao chân thực
      const randSize = Math.random();
      let sizeVal: number;
      if (randSize > 0.965) {
        sizeVal = 5.5 + Math.random() * 5.0; // Sao sáng nổi bật
      } else if (randSize > 0.88) {
        sizeVal = 3.2 + Math.random() * 2.8; // Sao tầm trung
      } else {
        sizeVal = 1.6 + Math.random() * 2.0; // Sao li ti khắp vũ trụ
      }

      starSizes[i] = sizeVal * cfg.starSizeMultiplier;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    // Custom ShaderMaterial cho hạt sao tròn mịn, có quầng sáng và tâm trắng rực rỡ
    const starMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (420.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, ${cfg.minStarPointSize.toFixed(1)}, ${cfg.maxStarPointSize.toFixed(1)});
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          if (vSize > 22.0) {
            // Large prominent star with realistic soft atmospheric Airy halo
            float halo = pow(clamp(1.0 - dist * 2.0, 0.0, 1.0), 1.4);
            float core = smoothstep(0.16, 0.0, dist);
            vec3 finalColor = mix(vColor, vec3(1.0), core * 0.95);
            float alpha = clamp(halo * 0.75 + core * 0.95, 0.0, 1.0);
            gl_FragColor = vec4(finalColor, alpha);
          } else {
            // Normal star: crisp circular point with intense white core
            float intensity = smoothstep(0.5, 0.03, dist);
            float core = smoothstep(0.2, 0.0, dist);
            vec3 finalColor = mix(vColor, vec3(1.0), core * 0.9);
            gl_FragColor = vec4(finalColor, intensity * 0.96);
          }
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 4. Build Memory Nodes (Radiant Sparkling Stars with Diamond Starburst Flares - "nhấp nháy")
    const starsGroup = new THREE.Group();
    scene.add(starsGroup);

    const memoryObjects: Array<{
      mesh: THREE.Object3D;
      memory: CosmicMemory;
      position: THREE.Vector3;
      sphere: THREE.Mesh;
      innerCore: THREE.Mesh;
      ring: THREE.Mesh;
      hitMesh: THREE.Mesh;
      starburstSprite: THREE.Sprite;
      auraSprite: THREE.Sprite;
      baseStarburstScale: number;
      baseAuraScale: number;
    }> = [];
    const starCoords: THREE.Vector3[] = [];

    sortedMemories.forEach((mem, index) => {
      const pos = getMemoryCoordinates(index, sortedMemories.length);
      starCoords.push(pos);

      const isMilestone = mem.type === 'milestone';
      const palette = COSMIC_PALETTES[index % COSMIC_PALETTES.length];
      const tex = cosmicPaletteTextures[index % cosmicPaletteTextures.length];

      // Soft aura texture & radiant starburst flare from rich cosmic palette ("các chòm sao màu khác nhau")
      const glowTex = tex.glow;
      const starburstTex = tex.starburst;
      const nodeColorHex = palette.hex;

      const starObjGroup = new THREE.Group();
      starObjGroup.position.copy(pos);

      // 1. Radiant 4-Point Diamond Starburst Flare ("đốm sao rõ ràng và lấp lánh")
      const starburstMat = new THREE.SpriteMaterial({
        map: starburstTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.92,
      });
      const starburstSprite = new THREE.Sprite(starburstMat);
      const baseStarburstScale = isMilestone ? 42.0 : 34.0;
      starburstSprite.scale.set(baseStarburstScale, baseStarburstScale, 1);
      starObjGroup.add(starburstSprite);

      // 2. Soft Corona Aura Halo
      const auraMat = new THREE.SpriteMaterial({
        map: glowTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.7,
      });
      const auraSprite = new THREE.Sprite(auraMat);
      const baseAuraScale = isMilestone ? 24.0 : 19.0;
      auraSprite.scale.set(baseAuraScale, baseAuraScale, 1);
      starObjGroup.add(auraSprite);

      // 3. Solid Sphere Core (Vivid theme color)
      const sphereGeo = new THREE.SphereGeometry(isMilestone ? 4.8 : 3.6, 24, 24);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: nodeColorHex,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      starObjGroup.add(sphere);

      // 4. White-Hot Diamond Center Core
      const innerCoreGeo = new THREE.SphereGeometry(isMilestone ? 2.5 : 1.9, 16, 16);
      const innerCoreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
      starObjGroup.add(innerCore);

      // 5. Delicate Orbital Ring (Identifies this node as a distinct interactive memory)
      const ringGeo = new THREE.RingGeometry(
        isMilestone ? 5.2 : 4.2,
        isMilestone ? 6.2 : 5.0,
        32
      );
      const ringMat = new THREE.MeshBasicMaterial({
        color: nodeColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.36;
      ring.rotation.y = Math.PI * 0.14;
      starObjGroup.add(ring);

      // 6. Point light illumination for local cosmic glow
      const pointLight = new THREE.PointLight(nodeColorHex, 1.2, 70);
      starObjGroup.add(pointLight);

      // 7. Generous invisible hit zone for smooth clicking / tapping directly on the 3D star node
      const hitGeo = new THREE.SphereGeometry(18, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData.memory = mem;
      starObjGroup.add(hitMesh);

      starObjGroup.userData.memory = mem;
      sphere.userData.memory = mem;
      innerCore.userData.memory = mem;
      ring.userData.memory = mem;
      starburstSprite.userData.memory = mem;

      starsGroup.add(starObjGroup);
      memoryObjects.push({
        mesh: starObjGroup,
        memory: mem,
        position: pos,
        sphere,
        innerCore,
        ring,
        hitMesh,
        starburstSprite,
        auraSprite,
        baseStarburstScale,
        baseAuraScale,
      });
    });

    memoryObjectsRef.current = memoryObjects;

    // 5. Single Continuous Chronological Starlight Ribbon (Timeline Stream - "một đường theo time, chứ k phải 1 vòng")
    const constellationGroup = new THREE.Group();
    constellationGroup.visible = showConstellationsRef.current;
    constellationGroupRef.current = constellationGroup;
    scene.add(constellationGroup);

    const pulseSprites: Array<{ sprite: THREE.Sprite; curve: THREE.Curve<THREE.Vector3>; phase: number }> = [];

    // Main Chronological Ribbon: Radiant starlight string connecting directly between star nodes ("sợi dây nối giữa các node")
    if (starCoords.length >= 2) {
      // Connect sequential nodes with a smooth centripetal spline passing directly through each star center
      const timelineCurve = new THREE.CatmullRomCurve3(starCoords, false, 'centripetal', 0.15);

      // 1. Outer radiant cosmic nebula glow tube (wide luminous aura)
      const outerRibbonGeo = new THREE.TubeGeometry(timelineCurve, 160, 2.4, 8, false);
      const outerRibbonMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });
      const outerRibbonMesh = new THREE.Mesh(outerRibbonGeo, outerRibbonMat);
      constellationGroup.add(outerRibbonMesh);

      // 2. Middle vibrant neon rose-pink beam
      const midRibbonGeo = new THREE.TubeGeometry(timelineCurve, 160, 1.2, 8, false);
      const midRibbonMat = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const midRibbonMesh = new THREE.Mesh(midRibbonGeo, midRibbonMat);
      constellationGroup.add(midRibbonMesh);

      // 3. Inner white-hot laser starlight core
      const innerRibbonGeo = new THREE.TubeGeometry(timelineCurve, 160, 0.55, 6, false);
      const innerRibbonMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
      });
      const innerRibbonMesh = new THREE.Mesh(innerRibbonGeo, innerRibbonMat);
      constellationGroup.add(innerRibbonMesh);

      // 4. Starlight Photons Gliding smoothly along the timeline from node to node
      for (let p = 0; p < 5; p++) {
        const pulseMat = new THREE.SpriteMaterial({
          map: circleParticleTexture,
          color: new THREE.Color('#ffffff'),
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.95,
        });
        const pulseSprite = new THREE.Sprite(pulseMat);
        pulseSprite.scale.set(6.5, 6.5, 1);
        constellationGroup.add(pulseSprite);
        pulseSprites.push({
          sprite: pulseSprite,
          curve: timelineCurve,
          phase: p / 5,
        });
      }
    }

    // 6. High-End Lightweight Shooting Stars System (Tapered Ribbon Mesh + Starburst Flare + Sparkling Embers)
    const meteorTailTex = createMeteorTailTexture();
    const meteorHeadTex = createMeteorHeadTexture();
    const stardustSparkTex = createStardustSparkTexture();

    interface EmberParticle {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      sprite: THREE.Sprite;
      active: boolean;
    }

    interface ShootingStarItem {
      active: boolean;
      timer: number;
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      duration: number;
      elapsed: number;
      headSprite: THREE.Sprite;
      headMat: THREE.SpriteMaterial;
      trailMesh: THREE.Mesh;
      trailGeo: THREE.BufferGeometry;
      trailPositions: Float32Array;
      trailMat: THREE.MeshBasicMaterial;
      embers: EmberParticle[];
      nextEmberIndex: number;
      lastDropTime: number;
    }

    const shootingStars: ShootingStarItem[] = [];
    const shootingStarCount = 4;

    for (let i = 0; i < shootingStarCount; i++) {
      const { geo: trailGeo, positions: trailPositions } = createRibbonQuadGeometry();

      const trailMat = new THREE.MeshBasicMaterial({
        map: meteorTailTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      scene.add(trailMesh);

      const headMat = new THREE.SpriteMaterial({
        map: meteorHeadTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const headSprite = new THREE.Sprite(headMat);
      headSprite.scale.set(14, 14, 1);
      scene.add(headSprite);

      // 6 stardust embers per meteor
      const embers: EmberParticle[] = [];
      for (let j = 0; j < 6; j++) {
        const emberMat = new THREE.SpriteMaterial({
          map: stardustSparkTex,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const emberSprite = new THREE.Sprite(emberMat);
        emberSprite.scale.set(2.4, 2.4, 1);
        scene.add(emberSprite);

        embers.push({
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          life: 0,
          maxLife: 0.35,
          sprite: emberSprite,
          active: false,
        });
      }

      shootingStars.push({
        active: false,
        timer: 1.0 + i * 1.8,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        duration: 0.85,
        elapsed: 0,
        headSprite,
        headMat,
        trailMesh,
        trailGeo,
        trailPositions,
        trailMat,
        embers,
        nextEmberIndex: 0,
        lastDropTime: 0,
      });
    }

    // Callback to manually trigger a burst of shooting stars (e.g. from Wish button)
    triggerShootingStarsRef.current = () => {
      shootingStars.forEach((ss, i) => {
        ss.active = true;
        ss.elapsed = 0;
        ss.duration = 0.75 + i * 0.15;
        ss.lastDropTime = 0;

        const startX = -240 + i * 130 + (Math.random() - 0.5) * 60;
        const startY = 160 + Math.random() * 50;
        const startZ = -90 + (Math.random() - 0.5) * 80;
        ss.startPos.set(startX, startY, startZ);

        const dirX = 220 + Math.random() * 90;
        const dirY = -(140 + Math.random() * 60);
        const dirZ = 80 + (Math.random() - 0.5) * 60;
        ss.endPos.set(startX + dirX, startY + dirY, startZ + dirZ);

        ss.headMat.opacity = 0;
        ss.trailMat.opacity = 0;
      });
    };

    // 7. Glowing Tethers for Floating Photos around Active Star
    const maxTethers = 8;
    const tethersGeo = new THREE.BufferGeometry();
    const tethersPositions = new Float32Array(maxTethers * 6);
    tethersGeo.setAttribute('position', new THREE.BufferAttribute(tethersPositions, 3));
    const tethersMat = new THREE.LineBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const tethersLine = new THREE.LineSegments(tethersGeo, tethersMat);
    scene.add(tethersLine);

    // Raycaster for hover and click interaction
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 6 };
    const mouse = new THREE.Vector2();

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Tự động xoay chậm toàn bộ bầu trời sao (theo tốc độ cấu hình)
      starField.rotation.y += cfg.rotationSpeedY;
      starField.rotation.x += cfg.rotationSpeedX;

      // Di chuyển mượt mà theo con trỏ chuột (Góc nhìn Parallax độ sâu)
      const px = cameraStateRef.current.parallaxX;
      const py = cameraStateRef.current.parallaxY;
      starField.position.x = THREE.MathUtils.lerp(starField.position.x, px * (cfg.parallaxIntensity * 0.4), cfg.parallaxSmoothness);
      starField.position.y = THREE.MathUtils.lerp(starField.position.y, py * (cfg.parallaxIntensity * 0.4), cfg.parallaxSmoothness);

      // Vivid rhythmic twinkling ("nhấp nháy") of memory stars & ring rotation
      memoryObjects.forEach((item, idx) => {
        const isHovered = hoveredMemoryIdRef.current === item.memory.id;
        const hoverBoost = isHovered ? 1.4 : 1.0;

        // Multi-harmonic twinkling waves for organic, living star glint
        const twinkleFast = Math.sin(time * 4.2 + idx * 2.3);
        const twinkleSlow = Math.sin(time * 1.6 + idx * 1.2);
        const twinkleSpark = Math.sin(time * 8.5 + idx * 3.7);

        // Twinkle factor oscillates between ~0.8 and ~1.35
        const twinkle = 1.0 + (twinkleFast * 0.18 + twinkleSlow * 0.12 + (twinkleSpark > 0.65 ? 0.22 : 0)) * hoverBoost;

        // 1. Starburst diamond flare: dynamic scale, shimmering ray angle, pulsing opacity
        const currentBurstScale = item.baseStarburstScale * twinkle;
        item.starburstSprite.scale.set(currentBurstScale, currentBurstScale, 1);
        item.starburstSprite.material.opacity = Math.min(1.0, (0.72 + twinkleFast * 0.2 + twinkleSlow * 0.08) * hoverBoost);
        item.starburstSprite.material.rotation = time * 0.08 + idx * 0.5;

        // 2. Soft aura halo
        const currentAuraScale = item.baseAuraScale * (0.95 + twinkleSlow * 0.15) * hoverBoost;
        item.auraSprite.scale.set(currentAuraScale, currentAuraScale, 1);
        item.auraSprite.material.opacity = Math.min(1.0, (0.62 + twinkleFast * 0.18) * hoverBoost);

        // 3. Central sphere and gleaming diamond core
        const sphereScale = (1.0 + twinkleSlow * 0.08) * hoverBoost;
        item.sphere.scale.set(sphereScale, sphereScale, sphereScale);
        const coreScale = (1.0 + twinkleFast * 0.28) * hoverBoost;
        item.innerCore.scale.set(coreScale, coreScale, coreScale);

        // 4. Delicate orbital ring rotation & gentle breathing
        item.ring.scale.set(sphereScale, sphereScale, sphereScale);
        item.ring.rotation.z = time * 0.22 + idx * 0.7;
      });

      // Animate travelling starlight pulse sparkles along chronological curve
      pulseSprites.forEach(({ sprite, curve, phase }) => {
        const tPulse = (time * 0.14 + phase) % 1;
        const pulsePos = curve.getPoint(tPulse);
        sprite.position.copy(pulsePos);
        const pulseScale = 4.8 + Math.sin(time * 5.0 + phase * 6.28) * 1.5;
        sprite.scale.set(pulseScale, pulseScale, 1);
      });

      // Animate Shooting Stars (Mưa Sao Băng cao cấp - Tapered Ribbon + Starburst + Bụi sao lấp lánh)
      if (cfg.shootingStarsEnabled) {
        shootingStars.forEach((ss) => {
          if (!ss.active) {
            ss.timer -= delta;
            if (ss.timer <= 0) {
              ss.active = true;
              ss.elapsed = 0;
              ss.duration = 0.75 + Math.random() * 0.45;
              ss.lastDropTime = 0;

              // Vị trí xuất phát ngẫu nhiên trên bầu trời cao
              const startX = (Math.random() - 0.5) * 620;
              const startY = 140 + Math.random() * 90;
              const startZ = (Math.random() - 0.5) * 520;
              ss.startPos.set(startX, startY, startZ);

              // Quỹ đạo chéo xé gió tự nhiên
              const dirX = (Math.random() > 0.4 ? 1 : -1) * (210 + Math.random() * 140);
              const dirY = -(140 + Math.random() * 70);
              const dirZ = (Math.random() - 0.5) * 160;
              ss.endPos.set(startX + dirX, startY + dirY, startZ + dirZ);

              ss.headMat.opacity = 0;
              ss.trailMat.opacity = 0;
            }
          } else {
            ss.elapsed += delta;
            const progress = Math.min(1, ss.elapsed / ss.duration);

            const currentHead = new THREE.Vector3().lerpVectors(ss.startPos, ss.endPos, progress);
            const tailLength = 0.32;
            const tailProgress = Math.max(0, progress - tailLength);
            const currentTail = new THREE.Vector3().lerpVectors(ss.startPos, ss.endPos, tailProgress);

            // Dải Ribbon 3D luôn xoay vuông góc với hướng nhìn camera (Camera-facing Ribbon)
            const forward = new THREE.Vector3().subVectors(currentHead, currentTail);
            if (forward.lengthSq() > 0.001) {
              forward.normalize();
              const toCam = new THREE.Vector3().subVectors(camera.position, currentHead).normalize();
              const side = new THREE.Vector3().crossVectors(forward, toCam).normalize();

              // Đầu sao băng rộng 4.2 units, vuốt nhọn ở đuôi 0.25 units
              const headW = 4.2;
              const tailW = 0.25;

              // Đỉnh 0 & 1: Đuôi sao băng (trái & phải)
              ss.trailPositions[0] = currentTail.x - side.x * tailW;
              ss.trailPositions[1] = currentTail.y - side.y * tailW;
              ss.trailPositions[2] = currentTail.z - side.z * tailW;

              ss.trailPositions[3] = currentTail.x + side.x * tailW;
              ss.trailPositions[4] = currentTail.y + side.y * tailW;
              ss.trailPositions[5] = currentTail.z + side.z * tailW;

              // Đỉnh 2 & 3: Đầu sao băng (trái & phải)
              ss.trailPositions[6] = currentHead.x - side.x * headW;
              ss.trailPositions[7] = currentHead.y - side.y * headW;
              ss.trailPositions[8] = currentHead.z - side.z * headW;

              ss.trailPositions[9] = currentHead.x + side.x * headW;
              ss.trailPositions[10] = currentHead.y + side.y * headW;
              ss.trailPositions[11] = currentHead.z + side.z * headW;

              ss.trailGeo.attributes.position.needsUpdate = true;
            }

            ss.headSprite.position.copy(currentHead);

            // Đường cong sáng dịu hình Sin (sáng bùng lên ở giữa rồi dịu tắt)
            const alpha = Math.sin(progress * Math.PI);
            ss.headMat.opacity = Math.min(1, alpha * 1.5);
            ss.trailMat.opacity = alpha * 0.95;
            const headScale = 14 * (0.8 + 0.4 * alpha);
            ss.headSprite.scale.set(headScale, headScale, 1);

            // Rơi rớt bụi sao lấp lánh (Stardust Sparks) phía sau
            if (ss.elapsed - ss.lastDropTime > 0.045 && progress < 0.88) {
              const ember = ss.embers[ss.nextEmberIndex % ss.embers.length];
              ss.nextEmberIndex++;
              ember.active = true;
              ember.life = 0;
              ember.maxLife = 0.32 + Math.random() * 0.18;
              ember.pos.copy(currentHead).add(new THREE.Vector3(
                (Math.random() - 0.5) * 3.0,
                (Math.random() - 0.5) * 3.0,
                (Math.random() - 0.5) * 3.0
              ));
              ember.vel.set(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12 - 6,
                (Math.random() - 0.5) * 12
              );
              ember.sprite.position.copy(ember.pos);
              ember.sprite.material.opacity = 0.95;
              ss.lastDropTime = ss.elapsed;
            }

            if (progress >= 1) {
              ss.active = false;
              ss.headMat.opacity = 0;
              ss.trailMat.opacity = 0;
              ss.timer =
                cfg.shootingStarIntervalMin +
                Math.random() * (cfg.shootingStarIntervalMax - cfg.shootingStarIntervalMin);
            }
          }

          // Cập nhật các hạt bụi sao bay chậm lại và mờ dần
          ss.embers.forEach((emb) => {
            if (emb.active) {
              emb.life += delta;
              if (emb.life >= emb.maxLife) {
                emb.active = false;
                emb.sprite.material.opacity = 0;
              } else {
                const ratio = 1 - emb.life / emb.maxLife;
                emb.pos.addScaledVector(emb.vel, delta);
                emb.sprite.position.copy(emb.pos);
                emb.sprite.material.opacity = ratio * 0.9;
                const sc = 2.4 * ratio;
                emb.sprite.scale.set(sc, sc, 1);
              }
            }
          });
        });
      }

      // Project 3D Star Coordinates to Screen for 2D Labels & Mini Polaroids
      if (!activeMemoryRef.current && !showHeroRef.current && showConstellationsRef.current) {
        memoryObjects.forEach((item, idx) => {
          const el = starLabelsRef.current[idx];
          if (!el) return;

          const screenPos = item.position.clone().project(camera);
          const isVisible = screenPos.z < 1;

          if (isVisible) {
            const rawX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const rawY = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            const dist = camera.position.distanceTo(item.position);
            const scale = Math.max(0.72, Math.min(1.05, 750 / dist));

            // Place card tightly adjacent to its star node (close to node, alternating left/right)
            const isLeft = idx % 2 === 0;
            const offsetX = isLeft ? -18 : 18;
            const rawTargetX = rawX + offsetX;

            const cardWidthEst = 140 * scale;
            const paddingX = 14;
            const x = isLeft
              ? Math.max(cardWidthEst + paddingX, rawTargetX)
              : Math.min(window.innerWidth - cardWidthEst - paddingX, rawTargetX);

            const y = Math.max(65, Math.min(window.innerHeight - 65, rawY));

            el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(${isLeft ? '-100%' : '0%'}, -50%) scale(${scale})`;
            el.style.opacity = '1';
          } else {
            el.style.opacity = '0';
          }
        });
      } else {
        // Hide constellation labels when zoomed into a memory or when constellations disabled
        starLabelsRef.current.forEach((el) => {
          if (el) el.style.opacity = '0';
        });
      }

      // Smooth Camera Transitions
      const state = cameraStateRef.current;
      if (state.isTransitioning) {
        state.transitionProgress = Math.min(1, state.transitionProgress + delta * 2.2);
        const ease = 0.5 - Math.cos(state.transitionProgress * Math.PI) / 2;

        state.currentPos.lerpVectors(state.currentPos, state.targetPos, ease * 0.4 + 0.08);
        state.currentLookAt.lerpVectors(state.currentLookAt, state.targetLookAt, ease * 0.4 + 0.08);

        camera.position.copy(state.currentPos);
        camera.lookAt(state.currentLookAt);

        if (state.transitionProgress >= 1) {
          state.currentPos.copy(state.targetPos);
          state.currentLookAt.copy(state.targetLookAt);
          camera.position.copy(state.targetPos);
          camera.lookAt(state.targetLookAt);
          state.isTransitioning = false;
        }
      } else if (!activeMemoryRef.current) {
        // Smooth orbit navigation with subtle mouse parallax
        const r = state.orbitRadius;
        const parallaxOffsetX = state.parallaxX * cfg.parallaxIntensity;
        const parallaxOffsetY = state.parallaxY * cfg.parallaxIntensity;
        const targetX = r * Math.sin(state.orbitAngleY) * Math.cos(state.orbitAngleX) + parallaxOffsetX;
        const targetY = r * Math.sin(state.orbitAngleX) + parallaxOffsetY;
        const targetZ = r * Math.cos(state.orbitAngleY) * Math.cos(state.orbitAngleX);

        state.currentPos.lerp(new THREE.Vector3(targetX, targetY, targetZ), cfg.parallaxSmoothness);
        state.currentLookAt.lerp(new THREE.Vector3(0, 0, 0), cfg.parallaxSmoothness);

        camera.position.copy(state.currentPos);
        camera.lookAt(state.currentLookAt);
      }

      // Update 3D Floating Photo Cards & Tether Filaments around active memory
      if (activeMemoryRef.current) {
        const starPos = activeStarPosRef.current;
        const mediaList = activeMemoryRef.current.memory_media || [];
        const itemsCount = Math.max(mediaList.length, 1);

        const isMobile = window.innerWidth < 640;
        let offsets: Array<{ x: number; y: number; tilt: number; scale: number }> = [];

        if (itemsCount === 1) {
          offsets = [{ x: 0, y: 0, tilt: 0, scale: isMobile ? 0.8 : 0.95 }];
        } else if (itemsCount === 2) {
          const sepX = isMobile ? 120 : 175;
          offsets = [
            { x: -sepX, y: 0, tilt: -3, scale: isMobile ? 0.65 : 0.88 },
            { x: sepX, y: 0, tilt: 3, scale: isMobile ? 0.65 : 0.88 },
          ];
        } else if (itemsCount === 3) {
          const sepX = isMobile ? 105 : 230;
          offsets = [
            { x: -sepX, y: isMobile ? 12 : 8, tilt: -5, scale: isMobile ? 0.58 : 0.8 },
            { x: 0, y: isMobile ? -8 : -14, tilt: 0, scale: isMobile ? 0.62 : 0.84 },
            { x: sepX, y: isMobile ? 12 : 8, tilt: 5, scale: isMobile ? 0.58 : 0.8 },
          ];
        } else if (itemsCount === 4) {
          const sepX = isMobile ? 85 : 180;
          offsets = [
            { x: -sepX * 1.5, y: isMobile ? 16 : 12, tilt: -6, scale: isMobile ? 0.54 : 0.72 },
            { x: -sepX * 0.5, y: isMobile ? -4 : -8, tilt: -2, scale: isMobile ? 0.56 : 0.75 },
            { x: sepX * 0.5, y: isMobile ? -4 : -8, tilt: 2, scale: isMobile ? 0.56 : 0.75 },
            { x: sepX * 1.5, y: isMobile ? 16 : 12, tilt: 6, scale: isMobile ? 0.54 : 0.72 },
          ];
        } else {
          const count = itemsCount;
          const maxSpread = Math.min(window.innerWidth * 0.78, count * (isMobile ? 90 : 170));
          const step = maxSpread / (count - 1);
          const startX = -maxSpread / 2;
          offsets = Array.from({ length: count }, (_, i) => {
            const x = startX + i * step;
            const t = count <= 1 ? 0.5 : i / (count - 1);
            const y = -Math.sin(t * Math.PI) * (isMobile ? 12 : 20);
            const tilt = (t - 0.5) * 12;
            const scale = isMobile ? 0.52 : Math.max(0.62, 0.78 - count * 0.02);
            return { x, y, tilt, scale };
          });
        }

        const anchorX = window.innerWidth / 2;
        const anchorY = window.innerHeight * 0.44;

        for (let i = 0; i < maxTethers; i++) {
          if (i < itemsCount) {
            const off = offsets[i % offsets.length];
            const bobY = Math.sin(time * 1.8 + i * 1.5) * 5;
            const bobX = Math.cos(time * 1.2 + i * 1.2) * 2.5;

            const screenX = anchorX + off.x + bobX;
            const screenY = anchorY + off.y + bobY;

            // 3D Tether filament connecting star to floating polaroid card
            const ndcX = (screenX / window.innerWidth) * 2 - 1;
            const ndcY = -(screenY / window.innerHeight) * 2 + 1;
            const cardWorldPos = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
            const dir = cardWorldPos.sub(camera.position).normalize();
            const tetherEndWorld = camera.position.clone().add(dir.multiplyScalar(28));

            const pIdx = i * 6;
            tethersPositions[pIdx] = starPos.x;
            tethersPositions[pIdx + 1] = starPos.y;
            tethersPositions[pIdx + 2] = starPos.z;
            tethersPositions[pIdx + 3] = tetherEndWorld.x;
            tethersPositions[pIdx + 4] = tetherEndWorld.y;
            tethersPositions[pIdx + 5] = tetherEndWorld.z;

            const el = photoCardsRef.current[i];
            if (el) {
              el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%) rotate(${off.tilt}deg) scale(${off.scale})`;
              el.style.opacity = '1';
            }
          } else {
            const pIdx = i * 6;
            tethersPositions[pIdx] = starPos.x;
            tethersPositions[pIdx + 1] = starPos.y;
            tethersPositions[pIdx + 2] = starPos.z;
            tethersPositions[pIdx + 3] = starPos.x;
            tethersPositions[pIdx + 4] = starPos.y;
            tethersPositions[pIdx + 5] = starPos.z;

            const el = photoCardsRef.current[i];
            if (el) {
              el.style.opacity = '0';
            }
          }
        }
        tethersGeo.attributes.position.needsUpdate = true;
        tethersMat.opacity = THREE.MathUtils.lerp(tethersMat.opacity, 0.45, 0.1);
      } else {
        tethersMat.opacity = 0;
        for (let i = 0; i < maxTethers; i++) {
          const el = photoCardsRef.current[i];
          if (el) el.style.opacity = '0';
        }
      }

      renderer.render(scene, camera);
    };

    render();

    // 9. Pointer and Drag Orbit Events
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerStartTime = 0;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      pointerStartX = clientX;
      pointerStartY = clientY;
      pointerStartTime = Date.now();

      cameraStateRef.current.isDragging = true;
      cameraStateRef.current.prevPointerX = clientX;
      cameraStateRef.current.prevPointerY = clientY;
      setShowHero(false); // Collapses hero when user begins interacting
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Mouse Parallax (gentle on mobile/smaller screens to prevent drift)
      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = -(clientY / window.innerHeight) * 2 + 1;
      cameraStateRef.current.parallaxX = normX;
      cameraStateRef.current.parallaxY = normY;

      const state = cameraStateRef.current;
      if (state.isDragging) {
        const deltaX = clientX - state.prevPointerX;
        const deltaY = clientY - state.prevPointerY;

        if (!activeMemoryRef.current) {
          state.orbitAngleY -= deltaX * 0.004;
          state.orbitAngleX = Math.max(-0.95, Math.min(0.95, state.orbitAngleX + deltaY * 0.004));
        } else {
          state.orbitAngleY -= deltaX * 0.0025;
          state.orbitAngleX = Math.max(-0.5, Math.min(0.5, state.orbitAngleX + deltaY * 0.0025));
        }

        state.prevPointerX = clientX;
        state.prevPointerY = clientY;
      }

      // Hover Raycasting over memory stars (only when not actively zoomed into one)
      if (!activeMemoryRef.current && !state.isDragging && 'clientX' in e) {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const interactiveMeshes: THREE.Object3D[] = [];
        memoryObjects.forEach((m) => {
          interactiveMeshes.push(m.hitMesh);
          interactiveMeshes.push(m.sphere);
        });
        const intersects = raycaster.intersectObjects(interactiveMeshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const mem = hit.userData.memory as CosmicMemory;
          setHoveredMemory(mem);
          hoveredMemoryIdRef.current = mem.id;
          setHoveredPos({ x: clientX, y: clientY });
          if (containerRef.current) containerRef.current.style.cursor = 'pointer';
        } else {
          setHoveredMemory(null);
          hoveredMemoryIdRef.current = null;
          setHoveredPos(null);
          if (containerRef.current) containerRef.current.style.cursor = 'default';
        }
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      cameraStateRef.current.isDragging = false;

      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

      const moveDist = Math.hypot(clientX - pointerStartX, clientY - pointerStartY);
      const elapsed = Date.now() - pointerStartTime;

      // Click/Tap directly on a 3D star node to trigger event ("gắn liền với sự kiện")
      if (moveDist < 9 && elapsed < 450 && cameraRef.current) {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);

        const interactiveMeshes: THREE.Object3D[] = [];
        memoryObjects.forEach((m) => {
          interactiveMeshes.push(m.hitMesh);
          interactiveMeshes.push(m.sphere);
          interactiveMeshes.push(m.innerCore);
        });

        const intersects = raycaster.intersectObjects(interactiveMeshes, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const mem = hit.userData.memory as CosmicMemory;
          if (mem) {
            flyToMemory(mem);
          }
        } else if (activeMemoryRef.current) {
          flyBackToGalaxy();
        }
      }
    };

    // Responsive Window Resize - Keeps entire galaxy timeline perfectly framed without distortion
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);

      const idealR = getResponsiveCameraDistance(w, h, cfg.cameraDistance);
      cameraStateRef.current.orbitRadius = idealR;

      if (!activeMemoryRef.current) {
        cameraStateRef.current.targetPos.z = idealR;
        cameraStateRef.current.currentPos.z = idealR;
        cameraRef.current.position.z = idealR;
      }
    };

    const domElement = canvasRef.current;
    domElement.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    domElement.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);

      domElement.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      domElement.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      circleParticleTexture.dispose();
      cosmicPaletteTextures.forEach((tex) => {
        tex.glow.dispose();
        tex.starburst.dispose();
      });
      meteorTailTex.dispose();
      meteorHeadTex.dispose();
      stardustSparkTex.dispose();
      shootingStars.forEach((ss) => {
        ss.trailGeo.dispose();
        ss.trailMat.dispose();
        ss.headMat.dispose();
        ss.embers.forEach((emb) => emb.sprite.material.dispose());
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memories, activeMemory, getMemoryCoordinates, flyToMemory, flyBackToGalaxy]);

  const handleShare = async () => {
    if (!activeMemory) return;
    const shareUrl = `${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeMemory.title,
          text: `Vì sao kỷ niệm: ${activeMemory.title} ♡`,
          url: shareUrl,
        });
      } catch { }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none touch-none select-none text-zinc-100 bg-cover bg-center bg-no-repeat transition-all duration-700"
      style={cfg.backgroundImage ? {
        backgroundImage: `radial-gradient(ellipse at center, rgba(10, 14, 30, ${cfg.backgroundDimOpacity * 0.4}) 0%, rgba(5, 7, 18, ${cfg.backgroundDimOpacity * 0.85}) 100%), url("${cfg.backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { backgroundColor: '#000000' }}
    >
      {/* 1. Fullscreen WebGL 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-[1] touch-none overscroll-none"
      />

      {/* 2. Astronomical Telemetry Badge (Tùy chọn cấu hình cfg.showTelemetryBadge - mặc định false) */}
      {!activeMemory && cfg.showTelemetryBadge && (
        <div className="fixed top-5 left-5 z-20 pointer-events-auto animate-fade-in select-none">
          <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-[#070b15]/75 border border-white/15 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8] animate-pulse" />
              <span className="font-mono text-xs sm:text-sm tracking-widest italic text-zinc-100 font-semibold">
                STARS: {cfg.starCount.toLocaleString()}
              </span>
            </div>
            <div className="font-mono text-xs sm:text-sm tracking-widest italic text-zinc-300 font-semibold pl-[18px]">
              SPECTRA: ALL
            </div>
          </div>
        </div>
      )}

      {/* 3. Top-Right Header HUD Controls */}
      {!activeMemory && (
        <header className="absolute top-0 right-0 z-20 flex items-center gap-2 p-4 sm:p-5 pointer-events-auto animate-fade-in">
          {/* Couple Pill: Click to open Love Story Modal */}
          <button
            type="button"
            onClick={() => setShowHero(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#070b15]/80 hover:bg-[#12192e]/90 border border-white/15 hover:border-pink-400/50 backdrop-blur-xl shadow-lg transition-all text-xs font-medium group"
            title="Mở câu chuyện tình yêu"
          >
            <span className="text-pink-200 font-serif">{coupleNames}</span>
            {daysTogether !== null && (
              <>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-300">
                  <strong className="text-pink-300">{daysTogether}</strong> ngày
                </span>
              </>
            )}
          </button>

          {/* Constellation Lines Toggle */}
          <button
            type="button"
            onClick={() => setShowConstellations((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all backdrop-blur-md shadow-lg ${showConstellations
              ? 'bg-violet-900/70 border-violet-400 text-white shadow-[0_0_15px_rgba(167,139,250,0.35)]'
              : 'bg-[#070b15]/80 border-white/15 text-zinc-300 hover:text-white hover:border-violet-400/60'
              }`}
            title="Bật/Tắt chòm sao ký ức"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span className="hidden sm:inline">Chòm sao</span>
          </button>

          {/* Guided Tour Trigger */}
          <button
            type="button"
            onClick={isTourActive ? stopStoryTour : startStoryTour}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all backdrop-blur-md shadow-lg ${isTourActive
              ? 'bg-violet-900/70 border-violet-400 text-white shadow-[0_0_15px_rgba(167,139,250,0.35)]'
              : 'bg-[#070b15]/80 border-white/15 text-zinc-300 hover:text-white hover:border-violet-400/60'
              }`}
            title="Du hành tự động qua các mốc kỷ niệm"
          >
            <Compass className={`w-3.5 h-3.5 ${isTourActive ? 'animate-spin' : 'text-violet-400'}`} />
            <span className="hidden sm:inline">Hành trình</span>
          </button>

          {/* Wish Easter Egg Trigger */}
          <button
            type="button"
            onClick={handleMakeWish}
            className="px-3 py-1.5 rounded-full bg-pink-950/40 hover:bg-pink-900/60 border border-pink-400/35 text-pink-200 text-xs font-medium flex items-center gap-1.5 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:scale-105 active:scale-95"
            title="Thả sao băng ước nguyện"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-spin" />
            <span className="hidden sm:inline">Sao băng</span>
          </button>

          {/* Ambient Cosmic Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-full border text-xs font-medium flex items-center transition-all backdrop-blur-md shadow-lg ${isAudioPlaying
              ? 'bg-violet-950/70 border-violet-400/50 text-violet-200'
              : 'bg-[#070b15]/80 border-white/15 text-zinc-400 hover:text-white'
              }`}
            title="Bật/Tắt nhạc không gian lãng mạn"
          >
            {isAudioPlaying ? (
              <Volume2 className="w-4 h-4 text-violet-300 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Studio Management Link */}
          <Link
            href="/studio"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#070b15]/80 hover:bg-[#12192e]/90 border border-white/15 hover:border-violet-400 text-zinc-300 hover:text-white text-xs font-medium backdrop-blur-md shadow-lg transition-all"
            title="Quản lý kỷ niệm (Studio)"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Studio</span>
          </Link>
        </header>
      )}

      {/* 3. Visual Hero Section: Romantic Narrative Centerpiece (Auto-collapsible) */}
      {showHero && !activeMemory && !isTourActive && (
        <section
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm pointer-events-auto text-center animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHero(false);
          }}
        >
          <div className="relative max-w-lg w-full rounded-2xl bg-[#0a0e1d]/90 border border-white/20 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(167,139,250,0.25)] space-y-4">
            {/* Close / Collapse Button */}
            <button
              type="button"
              onClick={() => setShowHero(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Khám phá vũ trụ 3D"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-medium tracking-[0.25em] text-violet-300 uppercase">
              <Sparkles className="w-3 h-3 text-pink-300" />
              <span>{publicTitle.toUpperCase()}</span>
              <Sparkles className="w-3 h-3 text-pink-300" />
            </div>

            {/* Couple Title */}
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide glow-text">
              {coupleNames}
            </h1>

            {/* Emotional Tagline */}
            <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed max-w-md mx-auto italic">
              &quot;{tagline}&quot;
            </p>

            {/* Grand Love Counter Card */}
            {daysTogether !== null && (
              <div className="py-2.5 px-4 rounded-none bg-gradient-to-r from-pink-950/30 via-violet-950/40 to-pink-950/30 border border-pink-400/25 inline-flex items-center gap-3 shadow-inner">
                <Heart className="w-5 h-5 text-pink-400 fill-pink-400 animate-pulse" />
                <div className="text-left">
                  <div className="text-base sm:text-lg font-bold text-pink-200">
                    {daysTogether} <span className="text-xs font-normal text-zinc-400">ngày bên nhau</span>
                  </div>
                  {relationshipStartDate && (
                    <div className="text-[10px] text-zinc-400">
                      Từ ngày {formatDate(relationshipStartDate)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={startStoryTour}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs sm:text-sm font-medium shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-violet-200" />
                <span>Hành trình tình yêu ✦</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. Floating 3D Star Name Tags & Mini Polaroids on Star Map */}
      {!activeMemory && !showHero &&
        sortedMemories.map((mem, idx) => {
          const palette = COSMIC_PALETTES[idx % COSMIC_PALETTES.length];
          const firstPhoto = mem.memory_media && mem.memory_media.length > 0 ? mem.memory_media[0] : null;
          const isLeft = idx % 2 === 0;

          return (
            <div
              key={mem.id}
              ref={(el) => {
                starLabelsRef.current[idx] = el;
              }}
              onClick={() => flyToMemory(mem)}
              className="fixed top-0 left-0 z-20 pointer-events-auto will-change-transform transition-opacity duration-300 group cursor-pointer"
              style={{ opacity: 0 }}
            >
              <div className={`flex flex-col ${isLeft ? 'items-end' : 'items-start'} gap-1.5`}>
                {/* Square photo sits cleanly above the badge */}
                {firstPhoto && (
                  <div
                    className={`w-18 h-18 sm:w-20 sm:h-20 bg-white/95 p-1 rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.85)] border border-white/60 ${palette.twBorderHover} group-hover:scale-105 transition-all duration-300`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveCosmicPhotoUrl(firstPhoto.thumbnail_path || firstPhoto.storage_path)}
                      alt={mem.title}
                      className="w-full h-full object-cover rounded-[2px] bg-black/40"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/fallback-photo.jpg';
                      }}
                    />
                  </div>
                )}

                {/* Glassmorphic Badge Tag */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a0e1c]/90 hover:bg-[#141b33] border border-white/20 ${palette.twBorderHover} backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.9)] text-[11px] text-zinc-100 hover:text-white transition-all transform group-hover:scale-105 ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${palette.twDot}`} />
                  <span className="font-medium tracking-wide truncate max-w-[130px] sm:max-w-[200px] group-hover:max-w-none transition-all">
                    {mem.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

      {/* 5. Rich Hover Memory Preview Card */}
      {hoveredMemory && hoveredPos && !activeMemory && (
        <div
          className="fixed z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 w-64 rounded-none bg-[#0b0e1d]/90 border border-violet-500/35 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(167,139,250,0.25)] p-3 animate-fade-in"
          style={{ left: hoveredPos.x, top: hoveredPos.y - 12 }}
        >
          {/* Card Thumbnail */}
          {hoveredMemory.memory_media && hoveredMemory.memory_media.length > 0 && (
            <div className="w-full h-28 rounded-none overflow-hidden bg-black/60 mb-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveCosmicPhotoUrl(
                  hoveredMemory.memory_media[0].thumbnail_path ||
                  hoveredMemory.memory_media[0].storage_path
                )}
                alt={hoveredMemory.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/fallback-photo.jpg';
                }}
              />
            </div>
          )}

          {/* Date */}
          <div className="flex items-center justify-end text-[10px] text-zinc-400 mb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-zinc-500" />
              {formatDate(hoveredMemory.event_date)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xs font-serif font-bold text-white line-clamp-1 mb-1">
            {hoveredMemory.title}
          </h3>

          {/* Location if present */}
          {hoveredMemory.location_label && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-1">
              <MapPin className="w-2.5 h-2.5 text-pink-400" />
              <span className="truncate">{hoveredMemory.location_label}</span>
            </div>
          )}

          {/* Description Excerpt */}
          {hoveredMemory.description && (
            <p className="text-[11px] text-zinc-300 italic line-clamp-2 font-light">
              &quot;{hoveredMemory.description}&quot;
            </p>
          )}
        </div>
      )}

      {/* 6. Wish Toast Easter Egg Notification */}
      {wishToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none px-5 py-2.5 rounded-full bg-[#181126]/90 border border-pink-400/60 backdrop-blur-xl text-xs text-pink-100 flex items-center gap-2 shadow-[0_0_30px_rgba(244,63,94,0.45)] animate-fade-in">
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse" />
          <span>{wishToast}</span>
        </div>
      )}



      {/* 9. 3D FLOATING PHOTOS SUSPENDED AROUND THE STAR (No Popup!) */}
      {activeMemory && (
        <div className="fixed inset-0 pointer-events-none z-30 select-none animate-fade-in">
          {/* Top Bar for active memory: Back Button & Actions */}
          <div className="pointer-events-auto absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between">
            <button
              type="button"
              onClick={flyBackToGalaxy}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0a0e1c]/85 border border-white/15 text-zinc-200 hover:text-white hover:border-violet-400 backdrop-blur-xl shadow-2xl transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trở lại bầu trời sao</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                className={`p-2 rounded-full border text-xs font-medium flex items-center transition-all backdrop-blur-md shadow-lg ${isAudioPlaying
                  ? 'bg-violet-950/70 border-violet-400/50 text-violet-200'
                  : 'bg-[#0a0e1c]/85 border-white/15 text-zinc-400 hover:text-white'
                  }`}
                title="Bật/Tắt nhạc không gian lãng mạn"
              >
                {isAudioPlaying ? (
                  <Volume2 className="w-4 h-4 text-violet-300 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0a0e1c]/85 border border-white/15 text-zinc-300 hover:text-white hover:border-pink-400 backdrop-blur-xl shadow-2xl transition-all text-xs font-medium"
              >
                <Share2 className="w-3.5 h-3.5 text-pink-400" />
                <span>{copiedLink ? 'Đã sao chép link!' : 'Chia sẻ vì sao ♡'}</span>
              </button>
            </div>
          </div>

          {/* 3D Floating Photo Cards suspended in zero gravity around the star */}
          {(activeMemory.memory_media && activeMemory.memory_media.length > 0
            ? activeMemory.memory_media
            : [{ id: 'love-note-placeholder', storage_path: '', thumbnail_path: '', isNote: true }]
          ).map((item, idx) => {
            const isLoveNote = 'isNote' in item && Boolean((item as { isNote?: boolean }).isNote);
            const photo = !isLoveNote ? item : null;

            return (
              <div
                key={item.id || idx}
                ref={(el) => {
                  photoCardsRef.current[idx] = el;
                }}
                className="pointer-events-auto absolute top-0 left-0 select-none will-change-transform transition-opacity duration-300 group cursor-pointer"
                style={{ opacity: 0 }}
              >
                {isLoveNote ? (
                  <div className="w-48 sm:w-56 rounded-none bg-white/95 border border-white/60 p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.15)] backdrop-blur-xl hover:scale-105 transition-all text-zinc-800">
                    <div className="text-xs text-pink-600 font-serif font-medium mb-1.5">
                      <span>Khoảnh khắc yêu thương</span>
                    </div>
                    <p className="text-xs text-zinc-700 italic leading-relaxed line-clamp-4">
                      &quot;{activeMemory.description || 'Mỗi khoảnh khắc bên nhau đều là một vì sao vô giá trong dải ngân hà...'}&quot;
                    </p>
                    <div className="text-[10px] text-zinc-500 mt-2 text-right">
                      {formatDate(activeMemory.event_date)}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (photo) {
                        setFullPhotoIndex(idx);
                        setFullPhotoView(photo.storage_path);
                      }
                    }}
                    className="relative rounded-none bg-white p-2.5 sm:p-3 pb-6 sm:pb-7 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.15)] border border-white/60 hover:scale-110 hover:shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300"
                  >
                    <div className="w-44 sm:w-56 aspect-[1/1] rounded-none overflow-hidden bg-zinc-900 border border-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveCosmicPhotoUrl(photo?.thumbnail_path || photo?.storage_path)}
                        alt={activeMemory.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/fallback-photo.jpg';
                        }}
                      />
                    </div>

                    <div className="pt-2 sm:pt-2.5 px-1 text-center">
                      <span className="font-serif text-xs sm:text-[13px] text-zinc-800 font-medium tracking-wide truncate block max-w-full">
                        {activeMemory.title}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom Narrative Floating Bar with stacked Tour Controls */}
          <div className="pointer-events-auto absolute bottom-5 inset-x-0 mx-auto max-w-xl px-4 animate-fade-in z-30 flex flex-col items-center gap-2.5">
            {/* Guided Story Tour Controls Bar (stacked cleanly above narrative card) */}
            {isTourActive && (
              <div className="w-full max-w-md rounded-full bg-[#0b0e1d]/90 border border-violet-400/50 py-2 px-4 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(167,139,250,0.3)] flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                  <span>Hành trình ký ức • {tourIndex + 1}/{sortedMemories.length}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={prevTourStep}
                    disabled={tourIndex === 0}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors"
                    title="Kỷ niệm trước"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTourPaused(!isTourPaused)}
                    className="p-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-md shadow-violet-600/50"
                    title={isTourPaused ? 'Tiếp tục du hành' : 'Tạm dừng du hành'}
                  >
                    {isTourPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={nextTourStep}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Kỷ niệm tiếp theo"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={stopStoryTour}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-colors ml-1"
                    title="Dừng du hành"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Narrative Card */}
            <div className="w-full rounded-2xl bg-[#0a0e1d]/85 border border-white/15 p-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-center space-y-1.5 relative">
              <button
                type="button"
                onClick={flyBackToGalaxy}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors p-1"
                title="Đóng"
                aria-label="Đóng"
              >
                ✕
              </button>

              <div className="flex items-center justify-center">
                <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide glow-text">
                  {activeMemory.title}
                </h2>
              </div>

              <p className="text-[11px] text-zinc-400">
                {formatDate(activeMemory.event_date)}
                {activeMemory.location_label && ` • ${activeMemory.location_label}`}
              </p>

              {activeMemory.description && (
                <p className="text-xs text-zinc-300 line-clamp-3 max-w-md mx-auto italic font-light pt-0.5 leading-relaxed">
                  &quot;{activeMemory.description}&quot;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. Fullscreen Image Lightbox Modal */}
      {(fullPhotoView || fullPhotoIndex !== null) && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setFullPhotoView(null);
            setFullPhotoIndex(null);
          }}
        >
          <div
            className="relative max-w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                fullPhotoIndex !== null && activeMemory?.memory_media && activeMemory.memory_media[fullPhotoIndex]
                  ? resolveCosmicPhotoUrl(
                    activeMemory.memory_media[fullPhotoIndex].storage_path ||
                    activeMemory.memory_media[fullPhotoIndex].thumbnail_path
                  )
                  : fullPhotoView || ''
              }
              alt="Toàn màn hình"
              className="max-w-full max-h-[82vh] object-contain rounded-none shadow-2xl"
            />
            {activeMemory?.memory_media && activeMemory.memory_media.length > 1 && (
              <div className="flex items-center gap-4 mt-3 text-white text-xs select-none">
                <button
                  type="button"
                  onClick={() =>
                    setFullPhotoIndex((prev) =>
                      prev !== null && prev > 0 ? prev - 1 : activeMemory.memory_media.length - 1
                    )
                  }
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  Trước
                </button>
                <span className="text-zinc-400 font-mono">
                  {(fullPhotoIndex ?? 0) + 1} / {activeMemory.memory_media.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFullPhotoIndex((prev) =>
                      prev !== null && prev < activeMemory.memory_media.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setFullPhotoView(null);
              setFullPhotoIndex(null);
            }}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

      {/* 12. Background Audio Element */}
      {musicUrl && (
        <audio
          ref={(el) => {
            bgAudioRef.current = el;
            if (el) {
              el.volume = 0.2;
            }
          }}
          src={
            musicUrl.includes('drive.google.com')
              ? `https://drive.google.com/uc?export=download&id=${musicUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || musicUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || ''}`
              : musicUrl
          }
          loop
          autoPlay
          preload="auto"
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onEnded={() => setIsAudioPlaying(false)}
        />
      )}
    </div>
  );
}
