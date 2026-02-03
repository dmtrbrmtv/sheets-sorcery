/*******************************
 * Sheets & Sorcery — Menu
 *******************************/

function onOpen() {
	SpreadsheetApp.getUi()
		.createMenu("🧙 Sheets & Sorcery")
		.addItem("🧰 Setup — первый запуск", "setupFirstRun")
		.addItem("🧲 Sync Base — запомнить тайлы с 🗺 Карта", "syncBaseFromMap")
		.addSeparator()
		.addItem("🌫️ Обновить туман", "updateFog")
		.addItem("📍 Прыгнуть к себе", "jumpToMe")
		.addSeparator()
		.addItem("🟢 Active — только я", "setActiveOnlyMe")
		.addItem("🟢 Active — первые 5", "setActiveFirst5")
		.addSeparator()
		.addItem("⬆️ Move N", "moveN")
		.addItem("⬇️ Move S", "moveS")
		.addItem("⬅️ Move W", "moveW")
		.addItem("➡️ Move E", "moveE")
		.addItem("⏸️ Пропустить ход", "waitTurn")
		.addSeparator()
		.addItem("🪵 Рубка леса (🌲/🌳/🌿/🌱)", "doChopWood")
		.addItem("⛏️ Каменоломня (🗻/🪨/🧱)", "doQuarry")
		.addItem("🏹 Охота (🦌/🐗/🐇)", "doHunt")
		.addItem("🎣 Рыбалка (рядом 🌊)", "doFish")
		.addSeparator()
		.addItem("🏠 Дом (🪵5 🪨3 💰2)", "buildHouse")
		.addSeparator()
		.addItem("🔨 Крафт: 🪓 Топор (🪵2 🪨1)", "craftAxe")
		.addItem("🔨 Крафт: ⛏️ Кирка (🪵1 🪨2)", "craftPick")
		.addItem("🔨 Крафт: 🗡️ Меч (🪵1 🪨1 💰1)", "craftSword")
		.addItem("🔨 Крафт: 🛡️ Щит (🪵1 🪨1)", "craftShield")
		.addItem("📜 Крафт — обновить", "refreshCraftSheet")
		.addSeparator()
		.addItem("🎆 Новый день (мастер)", "newDayMaster")
		.addItem("⏩ Пропустить неделю", "skipWeek")
		.addToUi();
}
