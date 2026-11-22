// Behrang Lab animation config (bpm drives the beat-locked motion; the page can change it before the engine starts).
const PROJECT = { duration: 4, bpm: +(new URLSearchParams(location.search).get('bpm') || 120), offset: 0 };
