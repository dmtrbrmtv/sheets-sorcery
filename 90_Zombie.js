/*******************************
 * Sheets & Sorcery — Zombie
 *******************************/

function handleEncounter_(ss, actorName) {
	const actor = readPlayers_(ss).find((p) => p.name === actorName);
	if (!actor) return;

	const tile = readBaseTile_(ss, actor.x, actor.y);
	if (!tile) return;

	if (tile === CFG.ZOMBIE.aliveTile) {
		resolveZombieFight_(ss, actor);
	}
}

function resolveZombieFight_(ss, actor) {
	const fresh = readPlayers_(ss).find((p) => p.name === actor.name);
	if (!fresh) return;

	const d = CFG.ZOMBIE.diceSides;

	const rollP = randInt_(1, d);
	const rollZ = randInt_(1, d);

	const pScore = rollP + (fresh.atk || 0);
	const zScore = rollZ + CFG.ZOMBIE.atk;

	const diff = pScore - zScore;

	const armor = Number(fresh.armor || 0);
	const baseDmg = 3;
	const dmg = Math.max(1, baseDmg - armor);

	const diceInfo = `🎲${rollP}+⚔️${fresh.atk}=${pScore} vs 🎲${rollZ}+🧟${CFG.ZOMBIE.atk}=${zScore} | 🧟 HP:${CFG.ZOMBIE.hp}`;

	if (diff >= 2) {
		killZombie_(ss, fresh, diceInfo);
		return;
	}

	if (diff >= 0) {
		const newHp = (fresh.hp || 0) - 1;
		setPlayerHp_(ss, fresh.row, newHp);
		setStatus_(ss, fresh.row, "💢🧟");
		writeHistory_(ss, fresh.name, `❤️-1 (HP:${newHp}/${fresh.maxhp || 10})`, `Отбился от 🧟`, diceInfo, "");
		if (newHp <= 0) handleDeath_(ss, fresh.name, "🧟");
		return;
	}

	const newHp = (fresh.hp || 0) - dmg;
	setPlayerHp_(ss, fresh.row, newHp);
	setStatus_(ss, fresh.row, "💢🧟");
	writeHistory_(ss, fresh.name, `❤️-${dmg} (HP:${newHp}/${fresh.maxhp || 10})`, `Получил удар от 🧟`, diceInfo, "");
	if (newHp <= 0) handleDeath_(ss, fresh.name, "🧟");
}

function killZombie_(ss, actor, diceInfo) {
	setBaseTile_(ss, actor.x, actor.y, CFG.ZOMBIE.graveTile);
	addTimer_(ss, actor.x, actor.y, CFG.ZOMBIE.aliveTile, CFG.ZOMBIE.respawnDays, "zombie", actor.name);

	const gold = randInt_(CFG.ZOMBIE.goldMin, CFG.ZOMBIE.goldMax);
	addResource_(ss, actor.row, "gold", gold);

	let item = "";
	if (Math.random() < CFG.ZOMBIE.itemChance) {
		item = CFG.ZOMBIE.lootItems[randInt_(0, CFG.ZOMBIE.lootItems.length - 1)];
		addItem_(ss, actor.name, item, "loot: zombie");
	}

	setStatus_(ss, actor.row, "⚔️");

	const got = item ? `💰+${gold} 🎁${item}` : `💰+${gold}`;
	const mapInfo = `${diceInfo} | ❤️ ${actor.hp}/${actor.maxhp || 10}`;
	writeHistory_(
		ss,
		actor.name,
		got,
		`⚔️ Убил 🧟 (HP:${CFG.ZOMBIE.hp}) → ${CFG.ZOMBIE.graveTile}`,
		mapInfo,
		`⏱️${CFG.ZOMBIE.respawnDays}`,
	);

	syncToolFlags_(ss);
}

function handleDeath_(ss, actorName, reasonEmoji) {
	const actor = readPlayers_(ss).find((p) => p.name === actorName);
	if (!actor) return;

	setPlayerHp_(ss, actor.row, actor.maxhp || 10);
	setPlayerMoves_(ss, actor.row, 0);
	setStatus_(ss, actor.row, "☠️");

	const hosp = a1ToXY_(CFG.RESPAWN.hospitalA1);
	if (hosp) {
		setPlayerXYMoves_(ss, actor.row, hosp.x, hosp.y, 0);
	}

	writeHistory_(ss, actor.name, "☠️", `Погиб от ${reasonEmoji || "💀"} → 🏥`, "", "");
}
