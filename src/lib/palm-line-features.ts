// 손금 보조 특징을 위한 결정론적 영상 신호.
// 주요 3선은 별도 ONNX 세그멘테이션 모델을 사용하고, 이 모듈은 그 모델이
// 다루지 않는 후보 영역의 연구용 신호와 fallback 특징만 계산한다.
// 보조선은 선 종류를 확정하는 분류기가 아니며 고객 해석 근거로 직접 쓰지 않는다.
// 단순 Sobel 밀도만으로 clear를 만들지 않고, 어두운 주름의 양측 대비와
// 실제 연결 성분의 연속성을 함께 본다.

export interface EdgeBandSignal {
  /** 0~1. 밴드 내 강한 엣지 픽셀 비율 */
  density: number;
  /** 0~1. 주 방향으로 이어지는 폭/높이 비율 */
  span: number;
  /** true면 엣지 방향이 밴드 내에서 크게 휘어짐 */
  curved: boolean;
}

export interface VerticalCreaseSignal extends EdgeBandSignal {
  /** 0~1. 가장 긴 실제 연결 성분이 ROI 높이를 얼마나 이어지는지 */
  continuity: number;
  /** 0~1. 가장 긴 연결 성분이 ROI 가로폭을 얼마나 차지하는지.
   * 한 개의 세로 주름보다 너무 넓으면 여러 잔주름/텍스처가 붙은 신호일 가능성이 높다. */
  widthSpan: number;
  /** 0~1. 연결 성분의 평균 명암 대비. 확률/정확도가 아니다. */
  contrast: number;
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

/**
 * 세로 손금 후보를 단순 "경계 픽셀 수"가 아니라 실제 어두운 주름의 연결성으로 본다.
 * 그림자 한쪽 경계, 소금후추 노이즈, 서로 떨어진 짧은 조각이 clear로 승격되는 문제를 줄이기 위한 연구용 신호다.
 */
export function analyzeVerticalCreaseBand(
  imageData: ImageData,
  roi: { x: number; y: number; width: number; height: number },
): VerticalCreaseSignal {
  const { width: imgW, height: imgH, data } = imageData;
  const x0 = Math.max(0, Math.floor(roi.x));
  const y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(imgW, Math.floor(roi.x + roi.width));
  const y1 = Math.min(imgH, Math.floor(roi.y + roi.height));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  if (w < 7 || h < 12) return { density: 0, span: 0, curved: false, continuity: 0, widthSpan: 0, contrast: 0 };

  const cropped = new Uint8ClampedArray(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const srcStart = ((y0 + yy) * imgW + x0) * 4;
    cropped.set(data.subarray(srcStart, srcStart + w * 4), yy * w * 4);
  }
  const gray = toGrayscale(cropped, w, h);
  const candidate = new Uint8Array(w * h);
  const contrast = new Float32Array(w * h);
  const offset = Math.max(2, Math.round(w * 0.035));
  const minContrast = 10;

  for (let y = 1; y < h - 1; y++) {
    for (let x = offset; x < w - offset; x++) {
      const i = y * w + x;
      const leftContrast = gray[i - offset] - gray[i];
      const rightContrast = gray[i + offset] - gray[i];
      // 실제 어두운 주름은 양쪽 피부보다 가운데가 어두워야 한다.
      // 한쪽만 밝아지는 그림자/조명 경계는 여기서 탈락한다.
      const c = Math.min(leftContrast, rightContrast);
      if (c >= minContrast) {
        candidate[i] = 1;
        contrast[i] = c;
      }
    }
  }

  const seen = new Uint8Array(w * h);
  const maxDrift = Math.max(1, Math.round(w * 0.025));
  let bestRows = 0;
  let bestCols = 0;
  let bestCount = 0;
  let bestContrast = 0;

  for (let start = 0; start < candidate.length; start++) {
    if (!candidate[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let minY = h;
    let maxY = -1;
    let minX = w;
    let maxX = -1;
    let count = 0;
    let contrastSum = 0;

    while (stack.length) {
      const i = stack.pop()!;
      const y = Math.floor(i / w);
      const x = i - y * w;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      count++;
      contrastSum += contrast[i];

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -maxDrift; dx <= maxDrift; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const ni = ny * w + nx;
          if (candidate[ni] && !seen[ni]) {
            seen[ni] = 1;
            stack.push(ni);
          }
        }
      }
    }

    const rows = maxY >= minY ? maxY - minY + 1 : 0;
    const cols = maxX >= minX ? maxX - minX + 1 : 0;
    if (rows > bestRows || (rows === bestRows && count > bestCount)) {
      bestRows = rows;
      bestCols = cols;
      bestCount = count;
      bestContrast = count ? contrastSum / count : 0;
    }
  }

  const continuity = bestRows / h;
  const widthSpan = bestCols / w;
  const density = bestCount / (w * h);
  const contrastScore = Math.min(1, bestContrast / 40);
  return {
    density: Math.min(1, density * 30),
    span: continuity,
    curved: false,
    continuity,
    widthSpan,
    contrast: contrastScore,
  };
}


/**
 * 세로 방향으로 이어지는 선 후보를 보는 보조 신호.
 * 학습 모델의 분류 결과가 아니라 지정한 손바닥 영역의 실제 영상 에지 신호다.
 * 운명선·태양선·재물선 후보를 "있다"고 단정하는 용도가 아니라,
 * 후보가 충분히 선명한지/희미한지/보이지 않는지 구분하는 데만 쓴다.
 */
export function analyzeVerticalEdgeBand(
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

  if (w < 4 || h < 4) return { density: 0, span: 0, curved: false };

  const cropped = new Uint8ClampedArray(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const srcStart = ((y0 + yy) * imgW + x0) * 4;
    const dstStart = yy * w * 4;
    cropped.set(data.subarray(srcStart, srcStart + w * 4), dstStart);
  }

  const gray = toGrayscale(cropped, w, h);
  const { magnitude, angle } = sobel(gray, w, h);
  const threshold = 40;
  let verticalStrongCount = 0;
  const rowHasEdge = new Array<boolean>(h).fill(false);
  const angles: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (magnitude[i] <= threshold) continue;
      const a = angle[i];
      // 세로선의 경계는 gradient가 가로 방향에 가까워진다.
      const isVerticalEdge = Math.abs(Math.sin(a)) < 0.6;
      if (!isVerticalEdge) continue;
      verticalStrongCount++;
      rowHasEdge[y] = true;
      angles.push(a);
    }
  }

  const totalPixels = w * h;
  const density = totalPixels > 0 ? verticalStrongCount / totalPixels : 0;
  const spanRows = rowHasEdge.filter(Boolean).length;
  const span = h > 0 ? spanRows / h : 0;

  let curved = false;
  if (angles.length > 4) {
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
    const variance = angles.reduce((a, b) => a + (b - mean) ** 2, 0) / angles.length;
    curved = variance > 0.15;
  }

  return { density: Math.min(1, density * 25), span, curved };
}
