// 0396's original wrapping coordinate lookup. Normal in-city selection is a
// nine-cell lattice; the sentinels outside it are not a modulo-128 world.
const beaconLookup = new Uint8Array(256);
let index = 0xbd;
let value = 0xb8;
do {
  value = (value + 9) & 255;
  for (let count = 0; count < 9; ++count) {
    beaconLookup[index] = value;
    index = (index + 1) & 255;
  }
} while (value !== 0xbd);

const signedWord = value => (value << 16) >> 16;

// 8450, with original word boundaries. Arguments describe the selected source
// cell, not every tower in a world. The full native fixture checks this function.
export function beaconSample(x, y, height, fx = 0, fy = 0, kind = 1, strength = 255) {
  x &= 65535;
  y &= 65535;
  height &= 65535;
  const column = beaconLookup[x >> 8];
  const row = beaconLookup[y >> 8];
  const empty = { column, row, power: 0 };
  if (signedWord(height) >= 11616 || column >= 128 || row >= 128 || kind !== 1) return empty;
  const dx = signedWord((x - column * 256) * 16 + ((fx & 255) >> 4) - 2048);
  const dy = signedWord((y - row * 256) * 16 + ((fy & 255) >> 4) - 2048);
  const dz = signedWord(height * 2 - 4800);
  const squared = (dx * dx + dy * dy + dz * dz) >>> 0;
  const denominator = (Math.max(256, (squared >>> 14) & 65535) + 1024) & 65535;
  const power = Math.floor((strength & 255) * 65793 / denominator);
  if (!denominator || power > 65535) throw new RangeError('Original beacon division is outside its valid range');
  return { column, row, power };
}

export function uprightCaeroLift(power, braking = false) {
  // 802D gives 16382 at zero pitch/roll using the original sine table.
  // No pitched-drive deduction is needed for this deliberately level example.
  const uprightProjection = 16382;
  const lift = (uprightProjection * power) >> 16;
  return (braking ? Math.min(lift, 255) : lift) >> 1;
}

for (const lab of document.querySelectorAll('[data-beacon-lab]')) {
  const offsetInput = lab.querySelector('[data-offset]');
  const heightInput = lab.querySelector('[data-height]');
  const strengthInput = lab.querySelector('[data-strength]');
  const engineInput = lab.querySelector('[data-engine]');
  const brakeInput = lab.querySelector('[data-brake]');
  const canvas = lab.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) continue;
  const format = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 5 });
  lab.querySelector('.engine-demo-controls').hidden = false;
  canvas.hidden = false;
  let drawnWidth = 0;

  function sourceAt(offset, height, leftStrength) {
    const x = 54 * 256 + 128 + Math.round(offset * 256);
    const strength = beaconLookup[x >> 8] === 54 ? leftStrength : 255;
    return beaconSample(x, 63 * 256 + 128, height, 0, 0, 1, strength);
  }

  function draw() {
    const offset = Number(offsetInput.value);
    const height = Number(heightInput.value);
    const strength = Number(strengthInput.value);
    for (const [name, number] of [['offset', offset], ['height', height], ['strength', strength]]) {
      lab.querySelector(`[data-${name}-value]`).textContent = format.format(number);
    }
    const sample = sourceAt(offset, height, strength);
    const incoming = engineInput.checked ? sample.power : 0;
    const lift = uprightCaeroLift(incoming, brakeInput.checked);
    lab.querySelector('[data-beacon-result]').textContent =
      `Selected tower: (${sample.column}, ${sample.row}). Raw power ${format.format(sample.power)}; ` +
      `engine receives ${format.format(incoming)}. Upright ${brakeInput.checked ? 'braked' : 'manual'} ` +
      `lift contribution +${format.format(lift)}.`;

    // Draw in CSS pixels so the chart's labels stay readable on a narrow screen.
    const width = Math.max(280, Math.round(canvas.getBoundingClientRect().width));
    const heightPixels = width < 500 ? 260 : 320;
    const pixelRatio = window.devicePixelRatio || 1;
    drawnWidth = width;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(heightPixels * pixelRatio);
    canvas.style.height = `${heightPixels}px`;
    context.scale(pixelRatio, pixelRatio);
    const left = 57, right = width - 16, top = 45, bottom = heightPixels - 65;
    const xPixel = cells => left + (right - left) * cells / 9;
    const yPixel = power => bottom - (bottom - top) * power / 14000;
    context.fillStyle = '#101923';
    context.fillRect(0, 0, width, heightPixels);
    context.fillStyle = '#e4eced';
    context.font = '14px system-ui';
    context.textAlign = 'left';
    context.fillText('Raw beacon power', left, 26);
    context.fillStyle = '#a9bbc4';
    context.font = '12px system-ui';
    for (const power of [0, 6000, 13000]) {
      context.strokeStyle = '#344957';
      context.beginPath();
      context.moveTo(left, yPixel(power));
      context.lineTo(right, yPixel(power));
      context.stroke();
      context.textAlign = 'right';
      context.fillText(format.format(power), left - 9, yPixel(power) + 5);
    }
    context.strokeStyle = '#c993a6';
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(xPixel(4.5), top);
    context.lineTo(xPixel(4.5), bottom);
    context.stroke();
    context.setLineDash([]);
    context.strokeStyle = '#ebca80';
    context.lineWidth = 2;
    context.beginPath();
    for (let i = 0; i <= 288; ++i) {
      const p = sourceAt(i / 32, height, strength).power;
      if (i) context.lineTo(xPixel(i / 32), yPixel(p));
      else context.moveTo(xPixel(0), yPixel(p));
    }
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(xPixel(offset), yPixel(sample.power), 5, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 1;
    context.fillStyle = '#a9bbc4';
    for (const [x, label, align] of [[0, '0', 'left'], [4.5, '4.5', 'center'], [9, '9', 'right']]) {
      context.textAlign = align;
      context.fillText(label, xPixel(x), bottom + 26);
    }
    context.textAlign = 'center';
    context.fillText('Distance from left tower (cells)', (left + right) / 2, heightPixels - 13);
  }

  lab.addEventListener('input', draw);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (Math.max(280, Math.round(canvas.getBoundingClientRect().width)) !== drawnWidth) draw();
    }).observe(canvas);
  }
  draw();
}
