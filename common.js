// Speech + sound + confetti helpers
const Speak = (() => {
  let voices = [], token = 0, audio = null;
  const keep = [];
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const load = () => { if (synth) voices = synth.getVoices(); };
  load();
  if (synth) synth.onvoiceschanged = load;

  const find = (l) => voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(l));
  const hasGujarati = () => !!find('gu');

  function viaSynth(text, lang) {
    return new Promise(res => {
      if (!synth) return res();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(lang);
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang === 'gu' ? 'gu-IN' : 'en-IN'; }
      u.rate = 0.8; u.pitch = 1.1;
      keep.push(u); if (keep.length > 20) keep.shift();
      u.onend = u.onerror = () => res();
      synth.speak(u);
    });
  }

  // Pick an English voice from the same vendor as the Gujarati voice (e.g. both "Google"), so they sound alike
  function pickVoice(lang) {
    const gu = find('gu');
    if (lang === 'gu') return gu;
    const ens = voices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith('en'));
    if (gu) {
      const vendor = gu.name.split(' ')[0];
      const same = ens.find(v => v.name.startsWith(vendor) && /en[-_]in/i.test(v.lang)) || ens.find(v => v.name.startsWith(vendor));
      if (same) return same;
    }
    return ens.find(v => /en[-_]in/i.test(v.lang)) || ens[0];
  }

  // Online TTS used for BOTH languages, so it is always the same voice
  function viaOnline(text, lang) {
    return new Promise(res => {
      try {
        audio = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + (lang === 'gu' ? 'gu' : 'en') + '&q=' + encodeURIComponent(text));
        audio.onended = () => res();
        audio.onerror = () => viaSynth(text, lang).then(res);
        audio.play().catch(() => viaSynth(text, lang).then(res));
      } catch (e) { viaSynth(text, lang).then(res); }
    });
  }

  // One engine for everything: local voices if a Gujarati one exists, otherwise online for both languages
  function say(text, lang) {
    if (!hasGujarati() && navigator.onLine) return viaOnline(text, lang);
    return viaSynth(text, lang);
  }

  function stop() {
    token++;
    if (synth) synth.cancel();
    if (audio) { audio.pause(); audio = null; }
  }

  // play([{t:'text', l:'gu'|'en'}, ...]) one after another
  async function play(items) {
    stop();
    const my = token;
    for (const it of items) {
      if (my !== token) return;
      await say(it.t, it.l);
      await new Promise(r => setTimeout(r, 250));
    }
  }
  return { play, stop, hasGujarati, ready: () => voices.length > 0 };
})();

const FX = (() => {
  let ctx;
  function tone(freqs, dur = 0.12, type = 'sine') {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f;
        const t = ctx.currentTime + i * dur;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.6);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + dur * 1.7);
      });
    } catch (e) { }
  }
  const pop = () => tone([660], 0.08);
  const good = () => tone([523, 659, 784, 1046], 0.1);
  const bad = () => tone([300, 220], 0.15, 'triangle');

  function confetti(x, y, items = ['⭐', '🎉', '✨', '💖', '🌟', '🎈']) {
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = items[Math.floor(Math.random() * items.length)];
      const ang = Math.random() * Math.PI * 2, d = 90 + Math.random() * 160;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * d - 60 + 'px');
      s.style.fontSize = 22 + Math.random() * 22 + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
  }
  return { pop, good, bad, confetti };
})();

// Warn parents once if Gujarati voice isn't available offline
function voiceNote() {
  setTimeout(() => {
    const n = document.getElementById('voiceNote');
    if (n && !Speak.hasGujarati()) n.hidden = false;
  }, 1500);
}
