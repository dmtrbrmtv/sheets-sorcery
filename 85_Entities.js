/*******************************
 * Sheets & Sorcery — Animals + NPCs
 *******************************/

const ENTITIES_KEY = "entities";
const ANIMALS_KEY = "animals";
const NPCS_KEY = "npcs";

function getAnimals_() {
  const raw = PropertiesService.getDocumentProperties().getProperty(ANIMALS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function setAnimals_(arr) {
  PropertiesService.getDocumentProperties().setProperty(ANIMALS_KEY, JSON.stringify(arr));
}

function getNpcs_() {
  const raw = PropertiesService.getDocumentProperties().getProperty(NPCS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function setNpcs_(arr) {
  PropertiesService.getDocumentProperties().setProperty(NPCS_KEY, JSON.stringify(arr));
}

function spawnAnimals_(ss, w, h) {
  const baseVals = gridRange_(getSheet_(ss, CFG.SHEETS.base)).getValues();
  const animals = [];
  const maxCount = CFG.ANIMALS.maxCount || 5;

  for (let i = 0; i < maxCount; i++) {
    const type = Math.random() < 0.6 ? "small" : "big";
    const spec = CFG.ANIMALS[type];
    if (!spec) continue;

    for (let tries = 0; tries < 20; tries++) {
      const x = randInt_(1, w);
      const y = randInt_(1, h);
      const tile = baseTile_(baseVals[y - 1][x - 1]);
      if (spec.tiles && spec.tiles.has(tile)) {
        animals.push({ x, y, type, emoji: spec.emoji });
        break;
      }
    }
  }

  setAnimals_(animals);
}

function moveAnimals_(ss, w, h) {
  let animals = getAnimals_();
  if (!animals.length) return;

  const baseVals = gridRange_(getSheet_(ss, CFG.SHEETS.base)).getValues();
  const players = readPlayers_(ss);
  const playerCells = new Set(players.map(p => `${p.x},${p.y}`));
  const zombieTile = CFG.ZOMBIE && CFG.ZOMBIE.aliveTile;

  const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

  animals = animals.map(a => {
    const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
    for (const d of shuffled) {
      const nx = a.x + d.dx;
      const ny = a.y + d.dy;
      if (nx < 1 || ny < 1 || nx > w || ny > h) continue;
      const tile = baseTile_(baseVals[ny - 1][nx - 1]);
      if (CFG.BLOCKED && CFG.BLOCKED.has(tile)) continue;
      if (tile === zombieTile) continue;
      if (playerCells.has(`${nx},${ny}`)) continue;

      const spec = CFG.ANIMALS && CFG.ANIMALS[a.type];
      if (spec && spec.tiles && !spec.tiles.has(tile)) continue;

      return { ...a, x: nx, y: ny };
    }
    return a;
  });

  setAnimals_(animals);
}

function spawnNpcs_(ss, w, h) {
  const baseVals = gridRange_(getSheet_(ss, CFG.SHEETS.base)).getValues();
  const npcs = [];

  for (const [emoji, spec] of Object.entries(CFG.NPCS || {})) {
    if (!spec || !spec.tiles) continue;
    const count = emoji === "🧑🏾‍🌾" ? (Math.random() < (spec.spawnChance || 0.2) ? 1 : 0) : 1;
    for (let c = 0; c < count; c++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = randInt_(1, w);
        const y = randInt_(1, h);
        const tile = baseTile_(baseVals[y - 1][x - 1]);
        if (spec.tiles.has(tile)) {
          npcs.push({ x, y, emoji, hp: spec.hp || 3, atk: spec.atk || 1 });
          break;
        }
      }
    }
  }

  setNpcs_(npcs);
}

function moveNpcs_(ss, w, h) {
  let npcs = getNpcs_();
  if (!npcs.length) return;

  const baseVals = gridRange_(getSheet_(ss, CFG.SHEETS.base)).getValues();
  const players = readPlayers_(ss);
  const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

  npcs = npcs.map(npc => {
    const spec = CFG.NPCS && CFG.NPCS[npc.emoji];
    if (!spec || !spec.tiles) return npc;

    const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
    for (const d of shuffled) {
      const nx = npc.x + d.dx;
      const ny = npc.y + d.dy;
      if (nx < 1 || ny < 1 || nx > w || ny > h) continue;
      const tile = baseTile_(baseVals[ny - 1][nx - 1]);
      if (CFG.BLOCKED && CFG.BLOCKED.has(tile)) continue;
      if (!spec.tiles.has(tile)) continue;

      const playerHere = players.find(p => p.x === nx && p.y === ny);
      if (playerHere) {
        handleNpcAttack_(ss, npc, playerHere);
        return npc;
      }

      return { ...npc, x: nx, y: ny };
    }
    return npc;
  });

  setNpcs_(npcs);
}

function handleNpcEncounter_(ss, actorName) {
  const actor = readPlayers_(ss).find(p => p.name === actorName);
  if (!actor) return;
  const npc = getNpcs_().find(n => n.x === actor.x && n.y === actor.y);
  if (!npc) return;
  resolveNpcFight_(ss, actor, npc);
}

function resolveNpcFight_(ss, actor, npc) {
  const spec = CFG.NPCS && CFG.NPCS[npc.emoji];
  if (!spec) return;

  const rollP = randInt_(1, 6);
  const rollN = randInt_(1, 6);
  const pScore = rollP + (actor.atk || 0);
  const nScore = rollN + (npc.atk || 1);
  const diff = pScore - nScore;

  const armor = Number(actor.armor || 0);
  const dmg = Math.max(1, (npc.atk || 1) - armor);

  const diceInfo = `🎲${rollP}+⚔️${actor.atk}=${pScore} vs 🎲${rollN}+${npc.emoji}${npc.atk}=${nScore} | ${npc.emoji} HP:${npc.hp}/${spec.hp || 3}`;

  if (diff >= 2) {
    killNpc_(ss, actor, npc, diceInfo);
    return;
  }

  if (diff >= 0) {
    const newHp = (actor.hp || 0) - 1;
    setPlayerHp_(ss, actor.row, newHp);
    setStatus_(ss, actor.row, "💢");
    writeHistory_(ss, actor.name, `❤️-1 (HP:${newHp}/${actor.maxhp || 10})`, `Отбился от ${npc.emoji}`, diceInfo, "");
    if (newHp <= 0) handleDeath_(ss, actor.name, npc.emoji);
    return;
  }

  const newHp = (actor.hp || 0) - dmg;
  setPlayerHp_(ss, actor.row, newHp);
  setStatus_(ss, actor.row, "💢");
  writeHistory_(ss, actor.name, `❤️-${dmg} (HP:${newHp}/${actor.maxhp || 10})`, `Получил удар от ${npc.emoji}`, diceInfo, "");
  if (newHp <= 0) handleDeath_(ss, actor.name, npc.emoji);
}

function killNpc_(ss, actor, npc, diceInfo) {
  let npcs = getNpcs_().filter(n => !(n.x === npc.x && n.y === npc.y));
  setNpcs_(npcs);

  const gold = randInt_(1, 3);
  addResource_(ss, actor.row, "gold", gold);

  let item = "";
  if (Math.random() < 0.15) {
    const items = ["💉", "🧪", "🌿"];
    item = items[randInt_(0, items.length - 1)];
    addItem_(ss, actor.name, item, `loot: ${npc.emoji}`);
  }

  setStatus_(ss, actor.row, "⚔️");
  const got = item ? `💰+${gold} 🎁${item}` : `💰+${gold}`;
  const spec = CFG.NPCS && CFG.NPCS[npc.emoji];
  writeHistory_(ss, actor.name, got, `⚔️ Убил ${npc.emoji} (HP:${spec ? spec.hp : npc.hp})`, `${diceInfo} | ❤️ ${actor.hp}/${actor.maxhp || 10}`, "");
  syncToolFlags_(ss);
}

function handleNpcAttack_(ss, npc, player) {
  const spec = CFG.NPCS && CFG.NPCS[npc.emoji];
  if (!spec) return;
  const dmg = Math.max(1, (spec.atk || 1) - (player.armor || 0));
  const newHp = (player.hp || 1) - dmg;
  setPlayerHp_(ss, player.row, newHp);
  setStatus_(ss, player.row, "💢");
  writeHistory_(ss, player.name, `❤️-${dmg} (HP:${newHp}/${player.maxhp || 10})`, `${npc.emoji} атаковал!`, "", "");
  if (newHp <= 0) handleDeath_(ss, player.name, npc.emoji);
}

function ensureEntities_(ss, w, h) {
  if (getAnimals_().length === 0) spawnAnimals_(ss, w, h);
  if (getNpcs_().length === 0) spawnNpcs_(ss, w, h);
}
