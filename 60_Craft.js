/*******************************
 * Sheets & Sorcery — Craft
 *******************************/

function craftAxe() { craft_({ item: "🪓", name: "Топор", cost: { wood: 2, stone: 1 } }); }
function craftPick() { craft_({ item: "⛏️", name: "Кирка", cost: { wood: 1, stone: 2 } }); }
function craftSword() { craft_({ item: "🗡️", name: "Меч", cost: { wood: 1, stone: 1, gold: 1 }, stat: { atk: +1 } }); }
function craftShield() { craft_({ item: "🛡️", name: "Щит", cost: { wood: 1, stone: 1 }, stat: { armor: +1 } }); }

function craft_(spec) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  const cur = getPlayerResources_(ss, actor.row);
  for (const k in spec.cost) {
    if ((cur[k] || 0) < spec.cost[k]) {
      writeHistory_(ss, actor.name, "❌", `Не хватает для ${spec.item}`, costToString_(spec.cost), "");
      return;
    }
  }

  for (const k in spec.cost) addResource_(ss, actor.row, k, -spec.cost[k]);

  addItem_(ss, actor.name, spec.item, `crafted: ${spec.name}`);
  if (spec.stat?.atk) addStat_(ss, actor.row, "atk", spec.stat.atk);
  if (spec.stat?.armor) addStat_(ss, actor.row, "armor", spec.stat.armor);

  setStatus_(ss, actor.row, "🔨");
  writeHistory_(ss, actor.name, "✅", spec.item, costToString_(spec.cost), "");

  syncToolFlags_(ss);
  updateFog();
}

function refreshCraftSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet_(ss, CFG.SHEETS.craft);
  sh.clear();

  sh.getRange(1, 1, 1, 4).setValues([["Предмет", "Цена", "Эффект", "Где используется"]]);
  const rows = [
    ["🪓 Топор", "🪵2 🪨1", "+ к рубке леса", "🪵 Рубка леса"],
    ["⛏️ Кирка", "🪵1 🪨2", "+ к каменоломне", "🪨 Каменоломня"],
    ["🗡️ Меч", "🪵1 🪨1 💰1", "⚔️Atk +1", "бой (позже)"],
    ["🛡️ Щит", "🪵1 🪨1", "🛡️Armor +1", "бой (позже)"],
    ["🏠 Дом", "🪵5 🪨3 💰2", "точка базы", "строительство"],
  ];
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
}