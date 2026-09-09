// 손금 "선 검출"을 위한 결정론적 엣지 휴리스틱.
// 검증된 오픈소스 선 세그멘테이션 모델이 없어(REUSE-FIRST 조사 결과 —
// 후보들은 학술/취미 단계이거나 라이선스·유지보수가 불명확) 직접 구현한다.
// Sobel 엣지 검출은 잘 알려진 표준 알고리즘이라 별도 라이브러리 없이
// 캔버스 픽셀 위에서 직접 계산한다. 정밀 선 분류가 아니라 "이 영역에
// 뚜렷한 가로 방향 선이 있는가"를 보는 저비용 신호로만 쓴다.

export interface EdgeBandSignal {
  /** 0~1. 밴드 내 강한 가로 엣지 픽셀 비율 */
  density: number;
  /** 0~1. 엣지가 이어지는 가로 폭 비율(길이 추정용) */
  span: number;
  /** true면 엣지 방향이 밴드 내에서 크게 휘어짐(곡선), false면 비교적 일정(직선) */
  curved: boolean;
}

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

// 3x3 Sobel 커널로 gx, gy를 구해 gradient 크기/방향을 픽셀별로 계산한다.
function sobel(gray: Float32Array, width: number, height: number) {
  const magnitude = new Float32Array(width * height);
  const angle = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] + gray[i - width + 1] +
        -2 * gray[i - 1] + 2 * gray[i + 1] +
        -gray[i + width - 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      magnitude[i] = Math.sqrt(gx * gx + gy * gy);
      angle[i] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, angle };
}

/**
 * 주어진 관심영역(ROI) 안에서 "가로로 이어지는 뚜렷한 선"이 있는지 신호를 뽑는다.
 * 손금선(생명선/두뇌선/감정선)은 대체로 손바닥을 가로지르는 형태라, 세로
 * 방향보다 가로~대각선 방향 엣지에 가중치를 준다.
 */
export function analyzeEdgeBand(
  imageData: ImageData,
  roi: { x: number; y: number; width: number; height: number },
): EdgeBandSignal {
  const { width: imgW, height: imgH, data } = imageData;
  const x0 = Math.max(0, Math.floor(roi.x));
  const y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(imgW, Math.floor(roi.x + roi.width));
  const y1 = Math.min(imgH, Math.floor(roi.y + roi.height));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);

  if (w < 4 || h < 4) {
    return { density: 0, span: 0, curved: false };
  }

  // ROI만 잘라 별도 버퍼로 만든 뒤 Sobel 적용 (전체 이미지 대비 계산량 절약)
  const cropped = new Uint8ClampedArray(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const srcStart = ((y0 + yy) * imgW + x0) * 4;
    const dstStart = yy * w * 4;
    cropped.set(data.subarray(srcStart, srcStart + w * 4), dstStart);
  }

  const gray = toGrayscale(cropped, w, h);
  const { magnitude, angle } = sobel(gray, w, h);

  const threshold = 40; // 경험적 임계값: 노이즈 대비 유의미한 엣지만 카운트
  let horizontalStrongCount = 0;
  const colHasEdge = new Array<boolean>(w).fill(false);
  const angles: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (magnitude[i] > threshold) {
        const a = angle[i];
        // gradient는 엣지에 수직이므로, gradient가 수직(위/아래)에 가까우면
        // 실제 엣지 라인은 가로 방향이라는 뜻.
        const isHorizontalEdge = Math.abs(Math.cos(a)) < 0.6;
        if (isHorizontalEdge) {
          horizontalStrongCount++;
          colHasEdge[x] = true;
          angles.push(a);
        }
      }
    }
  }

  const totalPixels = w * h;
  const density = totalPixels > 0 ? horizontalStrongCount / totalPixels : 0;
  const spanCols = colHasEdge.filter(Boolean).length;
  const span = w > 0 ? spanCols / w : 0;

  let curved = false;
  if (angles.length > 4) {
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
    const variance = angles.reduce((a, b) => a + (b - mean) ** 2, 0) / angles.length;
    curved = variance > 0.15;
  }

  return { density: Math.min(1, density * 25), span, curved };
}
