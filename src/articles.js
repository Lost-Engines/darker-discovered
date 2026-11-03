// Optional article controls; the text, tables and audio player work without JS.
const music = document.querySelector('[data-music-comparison]');
if (music) {
  const audio = music.querySelector('audio');
  const select = music.querySelector('[data-music-mode]');
  const status = music.querySelector('[data-music-status]');
  const download = music.querySelector('[data-music-download]');
  let change = 0;
  let position = 0;
  let resume = false;
  let loading = false;
  let pendingMetadata;
  music.querySelector('.engine-demo-controls').hidden = false;
  select.addEventListener('change', () => {
    const token = ++change;
    // Rapid switches retain the original phrase position while a file loads.
    if (!loading) {
      position = audio.ended ? 0 : audio.currentTime;
      resume = !audio.paused;
    }
    loading = true;
    audio.pause();
    const label = select.selectedOptions[0].textContent;
    const url = `https://lostengines.com/darker/analysis/audio/native-loops/${select.value}/group-6-loop.flac`;
    audio.setAttribute('aria-label', `Group 6 on ${label}`);
    download.href = url;
    status.textContent = `Loading ${label}…`;
    if (pendingMetadata) audio.removeEventListener('loadedmetadata', pendingMetadata);
    pendingMetadata = async () => {
      if (token !== change) return;
      audio.currentTime = Math.min(position, Math.max(0, audio.duration - 0.01));
      loading = false;
      status.textContent = `${label}. One complete loop, about 38.43 seconds.`;
      if (resume) {
        try { await audio.play(); }
        catch { if (token === change) status.textContent = `${label} is ready. Press Play to continue.`; }
      }
    };
    audio.addEventListener('loadedmetadata', pendingMetadata, {once: true});
    audio.src = url;
    audio.load();
  });
  audio.addEventListener('error', () => {
    loading = false;
    status.textContent = 'This audio could not be loaded. Try the FLAC link or the full listening collection.';
  });
}

const damageLab = document.querySelector('[data-damage-lab]');
if (damageLab) {
  const enemies = [
    {name: 'Skimma Supa', resistance: 40, shift: 0},
    {name: 'Oppressor', resistance: 45, shift: 1},
    {name: 'Assassin', resistance: 75, shift: 2},
    {name: 'Stalker', resistance: 60, shift: 1},
    {name: 'Terrablitz', resistance: 78, shift: 1},
  ];
  const enemy = damageLab.querySelector('[data-enemy]');
  const strength = damageLab.querySelector('[data-strength]');
  const gap = damageLab.querySelector('[data-gap]');
  const result = damageLab.querySelector('[data-damage-result]');
  function update() {
    const {name, resistance, shift} = enemies[Number(enemy.value)];
    const value = Number(strength.value);
    const seconds = Number(gap.value);
    const increment = value <= resistance ? 1 : value >= 2 * resistance ? 65536 :
      257 * Math.floor((256 * (value - resistance) + resistance) / resistance) + 1;
    const recovered = Math.floor(seconds * 1193180 / 2386) * 2 ** shift;
    damageLab.querySelector('[data-strength-value]').textContent = value;
    damageLab.querySelector('[data-gap-value]').textContent = seconds.toFixed(1);
    if (increment >= 65536) {
      result.textContent = `${name}: strength ${value} reaches twice its resistance (${2 * resistance}). One hit is fatal.`;
    } else if (recovered >= increment) {
      result.textContent = `${name}: each hit adds ${increment.toLocaleString('en-GB')} damage. It recovers all of that before the next hit at this spacing.`;
    } else {
      const hits = 1 + Math.ceil((65536 - increment) / (increment - recovered));
      result.textContent = `${name}: each hit adds ${increment.toLocaleString('en-GB')} damage; ${recovered.toLocaleString('en-GB')} recovers between hits. ${hits.toLocaleString('en-GB')} hits at this spacing reach fatal damage.`;
    }
  }
  damageLab.querySelector('.engine-demo-controls').hidden = false;
  damageLab.addEventListener('input', update);
  update();
}
