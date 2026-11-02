import palettes from '../public/data/graphics-lighting.json';

// B73C: signed IDIV truncation, followed by the original half-shade bias.
export function distanceShade(row, shade, count = 60) {
  const step = Math.trunc((shade - 1) * 256 / (count - 1));
  return (shade * 256 + 128 - row * step) >> 8;
}

for (const figure of document.querySelectorAll('[data-comparison]')) {
  const controls = figure.querySelector('.comparison-controls');
  const image = figure.querySelector('img');
  const caption = figure.querySelector('[data-comparison-caption]');
  controls.hidden = false;
  for (const button of controls.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      image.src = button.dataset.image;
      image.alt = `Controlled native-renderer fountain view: ${button.dataset.caption.toLowerCase()}`;
      caption.textContent = button.dataset.caption;
      for (const other of controls.querySelectorAll('button')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
    });
  }
}

for (const demo of document.querySelectorAll('[data-lighting-demo]')) {
  const paletteControl = demo.querySelector('[data-palette]');
  const rampControl = demo.querySelector('[data-ramp]');
  const shadeControl = demo.querySelector('[data-shade]');
  const depthControl = demo.querySelector('[data-depth]');
  const lightControl = demo.querySelector('[data-light]');
  const canvas = demo.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) continue;
  demo.querySelector('.engine-demo-controls').hidden = false;
  canvas.hidden = false;
  const rgb = colour => `rgb(${colour.join(' ')})`;
  function draw() {
    const palette = palettes[paletteControl.value];
    const ramp = Number(rampControl.value);
    const shade = Number(shadeControl.value);
    const depth = Number(depthControl.value);
    const halon = paletteControl.value === 'halon';
    lightControl.disabled = halon;
    const light = halon ? 255 : Number(lightControl.value);
    const row = Math.min(((depth + 16 * (255 - light)) & 65535) >> 8, 59);
    const outputShade = distanceShade(row, shade);
    const index = ramp * 32 + outputShade;
    for (const [name, value] of [['shade', shade], ['depth', depth], ['light', light]]) {
      demo.querySelector(`[data-${name}-value]`).textContent = value;
    }
    context.fillStyle = '#101923';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const left = 18, width = 684, top = 24, barHeight = 80;
    for (let i = 0; i < 60; ++i) {
      const x = Math.round(left + i * width / 60);
      const next = Math.round(left + (i + 1) * width / 60);
      context.fillStyle = rgb(palette[ramp * 32 + distanceShade(i, shade)]);
      context.fillRect(x, top, next - x, barHeight);
    }
    const selected = left + (row + 0.5) * width / 60;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.strokeRect(left + row * width / 60, top - 3, width / 60, barHeight + 6);
    context.fillStyle = '#ebca80';
    context.beginPath();
    context.moveTo(selected, top + barHeight + 10);
    context.lineTo(selected - 8, top + barHeight + 23);
    context.lineTo(selected + 8, top + barHeight + 23);
    context.closePath();
    context.fill();
    context.fillStyle = '#d6e2e6';
    context.font = '20px system-ui';
    context.textAlign = 'left';
    context.fillText('row 0 · near', left, 164);
    context.textAlign = 'right';
    context.fillText('row 59 · far', left + width, 164);
    demo.querySelector('[data-light-result]').textContent =
      `Row ${row}: authored shade ${shade} → shade ${outputShade}. ` +
      `Palette index ${index} (0x${index.toString(16).padStart(2, '0').toUpperCase()}), source RGB ${palette[index].join(', ')}.` +
      (halon ? ' Halon uses full light independently of beacons.' : ` Beacon strength ${light}.`);
  }
  for (const control of [paletteControl, rampControl, shadeControl, depthControl, lightControl]) {
    control.addEventListener('input', draw);
    control.addEventListener('change', draw);
  }
  draw();
}
