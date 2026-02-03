// ===== Sheets & Sorcery: Audio System =====
// Одна музыка, ночью приглушается. SFX: шаги, удар, смерть, рубка, камень.

const SOUNDS_BASE = "./web/audio/sounds";
const DEFAULT_MUSIC_VOL = 0.2;
const DEFAULT_SFX_VOL = 0.08;
const NIGHT_MUSIC_MULT = 0.7;

const STORAGE_KEYS = {
	musicVol: "sheets-sorcery-audio-music",
	sfxVol: "sheets-sorcery-audio-sfx",
	muted: "sheets-sorcery-audio-muted",
};

let initialized = false;
let music = null;
let stepGrassSound = null;
let stepSound = null;
let hitSound = null;
let deathSound = null;
let deathPlayerSound = null;
let chopSound = null;
let quarrySound = null;
let currentPhase = null;
let musicVolume = DEFAULT_MUSIC_VOL;
let sfxVolume = DEFAULT_SFX_VOL;
let muted = false;

loadFromStorage();

function loadFromStorage() {
	try {
		const mv = localStorage.getItem(STORAGE_KEYS.musicVol);
		const sv = localStorage.getItem(STORAGE_KEYS.sfxVol);
		const m = localStorage.getItem(STORAGE_KEYS.muted);
		if (mv != null) musicVolume = Math.max(0, Math.min(1, parseFloat(mv)));
		if (sv != null) sfxVolume = Math.max(0, Math.min(1, parseFloat(sv)));
		if (m != null) muted = m === "true";
	} catch (_) {}
}

function saveToStorage() {
	try {
		localStorage.setItem(STORAGE_KEYS.musicVol, String(musicVolume));
		localStorage.setItem(STORAGE_KEYS.sfxVol, String(sfxVolume));
		localStorage.setItem(STORAGE_KEYS.muted, String(muted));
	} catch (_) {}
}

function createAudio(src, opts = {}) {
	try {
		const a = new Audio(src);
		a.preload = "auto";
		if (opts.loop) a.loop = true;
		return a;
	} catch (_) {
		return null;
	}
}

function loadMusic() {
	const a = createAudio(`${SOUNDS_BASE}/music_day.mp3`, { loop: true });
	if (!a) return;
	a.addEventListener("error", () => {
		a.src = `${SOUNDS_BASE}/music_day.wav`;
		a.addEventListener("error", () => {
			music = null;
		});
	});
	music = a;
}

const GRASS_TILES = new Set(["🌿", "🌾", "🌱", "⛳", "🌳", "🌲"]);

function loadSfx() {
	stepGrassSound = `${SOUNDS_BASE}/step_grass.wav`;
	stepSound = `${SOUNDS_BASE}/step.wav`;
	hitSound = `${SOUNDS_BASE}/hit.wav`;
	deathSound = `${SOUNDS_BASE}/death.wav`;
	deathPlayerSound = `${SOUNDS_BASE}/death_player.wav`;
	chopSound = `${SOUNDS_BASE}/chop.wav`;
	quarrySound = `${SOUNDS_BASE}/quarry.wav`;
}

function getEffectiveMusicVol() {
	if (muted) return 0;
	const mult = currentPhase === "night" || currentPhase === "dusk" ? NIGHT_MUSIC_MULT : 1;
	return Math.max(0, Math.min(1, musicVolume * mult));
}

function getEffectiveSfxVol() {
	if (muted) return 0;
	return Math.max(0, Math.min(1, sfxVolume));
}

function playSfx(url, vol = 1) {
	if (muted || !url) return;
	try {
		const a = new Audio(url);
		a.volume = Math.min(1, getEffectiveSfxVol() * vol);
		a.play().catch(() => {});
	} catch (_) {}
}

function init() {
	if (initialized) return;
	loadFromStorage();
	loadMusic();
	loadSfx();
	initialized = true;
}

function playMusic(phase) {
	if (!initialized || !music) return;
	currentPhase = phase;
	music.volume = getEffectiveMusicVol();
	if (music.paused) music.play().catch(() => {});
}

function playStep(tile) {
	if (!initialized) return;
	const url = tile && GRASS_TILES.has(tile) ? stepGrassSound : stepSound;
	playSfx(url, 0.07);
}

function playHit() {
	if (!initialized) return;
	playSfx(hitSound, 0.15);
}

function playDeath() {
	if (!initialized) return;
	playSfx(deathSound, 0.2);
}

function playPlayerDeath() {
	if (!initialized) return;
	playSfx(deathPlayerSound, 0.2);
}

function playChop() {
	if (!initialized) return;
	playSfx(chopSound, 0.12);
}

function playQuarry() {
	if (!initialized) return;
	playSfx(quarrySound, 0.12);
}

function setMusicVolume(v) {
	musicVolume = Math.max(0, Math.min(1, v));
	saveToStorage();
	if (music && !music.paused) music.volume = getEffectiveMusicVol();
}

function setSfxVolume(v) {
	sfxVolume = Math.max(0, Math.min(1, v));
	saveToStorage();
}

function mute(toggle) {
	muted = toggle;
	saveToStorage();
	if (music) {
		music.volume = getEffectiveMusicVol();
		if (muted) music.pause();
	}
}

function isMuted() {
	return muted;
}

function getMusicVolume() {
	return musicVolume;
}

function getSfxVolume() {
	return sfxVolume;
}

export const AudioManager = {
	init,
	playMusic,
	playStep,
	playHit,
	playDeath,
	playPlayerDeath,
	playChop,
	playQuarry,
	setMusicVolume,
	setSfxVolume,
	mute,
	isMuted,
	getMusicVolume,
	getSfxVolume,
};
