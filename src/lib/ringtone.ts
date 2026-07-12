// Synthesized phone ringtone using WebAudio (no external asset needed).

let ctx: AudioContext | null = null;
let stopper: (() => void) | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Plays a classic "ring...ring...pause" loop until stopRingtone() is called. */
export function startRingtone() {
  stopRingtone();
  const ac = getCtx();
  const master = ac.createGain();
  master.gain.value = 0.15;
  master.connect(ac.destination);

  let cancelled = false;
  const scheduleRing = (startAt: number) => {
    // Two tones — 480Hz + 440Hz — the classic US ringback pair.
    for (const freq of [440, 480]) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(1, startAt + 0.05);
      g.gain.setValueAtTime(1, startAt + 1.9);
      g.gain.linearRampToValueAtTime(0, startAt + 2);
      osc.connect(g).connect(master);
      osc.start(startAt);
      osc.stop(startAt + 2.05);
    }
  };

  const period = 4; // 2s ring, 2s silence
  let t = ac.currentTime + 0.05;
  scheduleRing(t);
  const interval = window.setInterval(() => {
    if (cancelled) return;
    t = ac.currentTime + 0.05;
    scheduleRing(t);
  }, period * 1000);

  stopper = () => {
    cancelled = true;
    window.clearInterval(interval);
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.1);
    setTimeout(() => master.disconnect(), 200);
  };

  // Vibrate loop as a companion signal
  try {
    navigator.vibrate?.([600, 400, 600, 2000]);
    const vib = window.setInterval(() => {
      try { navigator.vibrate?.([600, 400, 600, 2000]); } catch { /* */ }
    }, 3600);
    const prev = stopper;
    stopper = () => { window.clearInterval(vib); try { navigator.vibrate?.(0); } catch { /* */ } prev(); };
  } catch { /* */ }
}

export function stopRingtone() {
  if (stopper) {
    stopper();
    stopper = null;
  }
}