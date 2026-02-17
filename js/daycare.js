// Daycare breeding system

// Get max eggs the player can have in daycare storage
function getMaxDaycareEggs() {
	const baseCapacity = DAYCARE_BALANCE.MAX_EGGS;
	const upgradeLevel = getUpgradeLevel('eggCapacityBoost') || 0;
	return baseCapacity + upgradeLevel;
}

// Get current daycare egg count
function getCurrentDaycareEggCount() {
	return getDaycareEggCount();
}

// Check if can add more eggs to daycare
function canAddMoreDaycareEggs() {
	return getCurrentDaycareEggCount() < getMaxDaycareEggs();
}

// Apply offline progress for daycare breeding
function applyOfflineDaycareProgress() {
	if (typeof isPaused === 'function' && isPaused()) {
		return;
	}

	const daycare = getDaycare();
	const lastActive = parseInt(localStorage.getItem('lastActiveTime'), 10);
	
	// No breeding in progress or no last active time
	if (!daycare.breeders[0] || !daycare.breeders[1] || !lastActive) {
		return;
	}

	const elapsedMs = Date.now() - lastActive;
	if (elapsedMs <= 0 || !daycare.eggTimer) {
		return;
	}

	// Get parent pokemon for timer duration
	const parent1 = gameData.pc[daycare.breeders[0]];
	const parent2 = gameData.pc[daycare.breeders[1]];

	if (!parent1 || !parent2) {
		return;
	}

	const timerDuration = getEggTimerDuration(parent1, parent2);
	let eggCount = 0;
	let remainingTime = elapsedMs;
	
	// Calculate how many eggs would have been created
	while (remainingTime >= timerDuration && canAddMoreDaycareEggs()) {
		const egg = createBreedingEgg(parent1, parent2);
		if (egg) {
			addDaycareEgg(egg);
			eggCount++;
			remainingTime -= timerDuration;
		} else {
			break;
		}
	}

	// Update timer for next egg if storage not full
	if (canAddMoreDaycareEggs()) {
		const nextCompletionTime = Date.now() + (timerDuration - remainingTime);
		setDaycareEggTimer(nextCompletionTime);
	} else {
		// Storage full - pause timer
		setDaycareEggTimer(null);
	}

	saveGameData();
}

// Get max eggs the player can have in incubator (original system)
function getMaxIncubatorEggs() {
	return 6;
}

// Get current incubator egg count
function getCurrentIncubatorEggCount() {
	return gameData.incubator.length;
}

// Check if can add more eggs to incubator
function canAddMoreIncubatorEggs() {
	return getCurrentIncubatorEggCount() < getMaxIncubatorEggs();
}

// Check if two pokemon are compatible for breeding
function areCompatible(pokemon1, pokemon2) {
	// Get species data
	const species1 = pokemonDatabase.find(p => p.id === pokemon1.id);
	const species2 = pokemonDatabase.find(p => p.id === pokemon2.id);

	if (!species1 || !species2) return false;

	// Check egg group compatibility
	if (!species1.egg_group || !species2.egg_group) return false;
	
	const hasCommonEggGroup = species1.egg_group.some(group => 
		species2.egg_group.includes(group)
	);

	if (!hasCommonEggGroup) return false;

	// Check gender compatibility
	const genderless1 = pokemon1.gender === 'Genderless';
	const genderless2 = pokemon2.gender === 'Genderless';

	// Both genderless - cannot breed
	if (genderless1 && genderless2) return false;

	// One genderless - must be Ditto
	if (genderless1) {
		const species = pokemonDatabase.find(p => p.id === pokemon1.id);
		if (species.name !== 'Ditto') return false;
		// Other must be either gender or genderless (will work)
		return true;
	}

	if (genderless2) {
		const species = pokemonDatabase.find(p => p.id === pokemon2.id);
		if (species.name !== 'Ditto') return false;
		return true;
	}

	// Both gendered - must be opposite
	if (pokemon1.gender === pokemon2.gender) return false;

	return true;
}

// Get rarity value for determining egg timer
function getRarityValue(pokemon) {
	const species = pokemonDatabase.find(p => p.id === pokemon.id);
	if (!species) return 1;
	
	// Map rarity name to value
	const rarityMap = {
		'common': 1,
		'uncommon': 2,
		'rare': 3,
		'special': 4,
		'event': 5,
		'novelty': 6,
		'legendary': 7,
	};
	
	return rarityMap[species.rarity] || 1;
}

// Get egg timer duration based on parents
function getEggTimerDuration(pokemon1, pokemon2) {
	// Get average rarity of parents
	const rarity1 = getRarityValue(pokemon1);
	const rarity2 = getRarityValue(pokemon2);
	const avgRarity = Math.ceil((rarity1 + rarity2) / 2);

	// Map to rarity key
	const rarityKeys = ['common', 'uncommon', 'rare', 'special', 'event', 'novelty', 'legendary'];
	const rarityKey = rarityKeys[Math.min(avgRarity - 1, 3)];

	let baseTimer = DAYCARE_BALANCE.EGG_TIMERS[rarityKey];

	// Apply egg speed boost
	const eggSpeedLevel = getUpgradeLevel('eggSpeedBoost') || 0;
	const speedMultiplier = Math.pow(DAYCARE_BALANCE.EGG_SPEED_MULTIPLIER, eggSpeedLevel);
	
	return Math.floor(baseTimer * speedMultiplier);
}

// Inherit IVs from parents
function inheritIVs(parent1, parent2) {
	const baseInheritCount = DAYCARE_BALANCE.IV_INHERITANCE_COUNT;
	const upgradeLevel = getUpgradeLevel('ivInheritanceBoost') || 0;
	const totalInherit = Math.min(baseInheritCount + upgradeLevel, 6);

	const stats = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'spd'];
	
	// Start with all random IVs (0-31)
	const newIVs = {
		hp: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		atk: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		def: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		spAtk: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		spDef: Math.floor(Math.random() * (BALANCE.MAX_IV + 1)),
		spd: Math.floor(Math.random() * (BALANCE.MAX_IV + 1))
	};

	// Get all IVs from both parents
	const parentIVs = [];
	for (const stat of stats) {
		parentIVs.push({ stat, iv: parent1.ivs[stat] });
		parentIVs.push({ stat, iv: parent2.ivs[stat] });
	}

	// Randomly select unique stats to inherit (override the random ones)
	const selectedStats = new Set();
	while (selectedStats.size < totalInherit && parentIVs.length > 0) {
		const randomIndex = Math.floor(Math.random() * parentIVs.length);
		const { stat, iv } = parentIVs[randomIndex];
		
		if (!selectedStats.has(stat)) {
			newIVs[stat] = iv;
			selectedStats.add(stat);
		}
		
		parentIVs.splice(randomIndex, 1);
	}

	return newIVs;
}

// Generate shiny inheritance
// - Base odds are always 1 in BALANCE.SHINY_ODDS.
// - If DAYCARE_BALANCE.GENETICS_MULTIPLIERS.shiny.enabled === true,
//   parent shinies apply the one/two multipliers on top of base odds.
// - If enabled === false, we still use the base odds but ignore parents.
function inheritShiny(parent1, parent2) {
	let multiplier = 1;

	if (DAYCARE_BALANCE.GENETICS_MULTIPLIERS.shiny.enabled) {
		if (parent1.isShiny && parent2.isShiny) {
			multiplier = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.shiny.two;
		} else if (parent1.isShiny || parent2.isShiny) {
			multiplier = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.shiny.one;
		}
	}

	const shinyChance = Math.min(1, (1 / BALANCE.SHINY_ODDS) * multiplier);
	return Math.random() < shinyChance;
}

// Generate alpha inheritance
// - Base odds are always 1 in BALANCE.ALPHA_ODDS.
// - If DAYCARE_BALANCE.GENETICS_MULTIPLIERS.alpha.enabled === true,
//   parent alphas apply the one/two multipliers.
// - If enabled === false, we use base odds only (no parent influence).
function inheritAlpha(parent1, parent2) {
	let multiplier = 1;

	if (DAYCARE_BALANCE.GENETICS_MULTIPLIERS.alpha.enabled) {
		if (parent1.isAlpha && parent2.isAlpha) {
			multiplier = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.alpha.two;
		} else if (parent1.isAlpha || parent2.isAlpha) {
			multiplier = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.alpha.one;
		}
	}

	const alphaChance = Math.min(1, (1 / BALANCE.ALPHA_ODDS) * multiplier);
	return Math.random() < alphaChance;
}

// Generate nature inheritance
// - "Base" behaviour: random nature from BALANCE.NATURES.
// - If DAYCARE_BALANCE.GENETICS_MULTIPLIERS.nature.enabled === true
//   and both parents share the same nature, we apply matchChance% to
//   inherit that nature; otherwise we fall back to base behaviour.
function inheritNature(parent1, parent2) {
	// If genetics multiplier is enabled and parents share the same nature,
	// roll the inheritance chance.
	if (DAYCARE_BALANCE.GENETICS_MULTIPLIERS.nature.enabled && parent1.nature === parent2.nature) {
		const inheritChance = DAYCARE_BALANCE.GENETICS_MULTIPLIERS.nature.matchChance / 100;
		if (Math.random() < inheritChance) {
			return parent1.nature;
		}
	}

	// Base behaviour: random nature
	const natures = BALANCE.NATURES;
	return natures[Math.floor(Math.random() * natures.length)];
}

// Generate gender
function inheritGender(eggSpecies) {
	const genderRate = eggSpecies.gender_rate;

	if (genderRate === -1) {
		return 'Genderless';
	} else if (genderRate === 0) {
		return 'Female';
	} else if (genderRate === 100) {
		return 'Male';
	} else {
		// genderRate is the percentage chance to be male
		return Math.random() * 100 < genderRate ? 'Male' : 'Female';
	}
}

// Helper: determine the egg species from two parents using the
// same rules as breeding (female decides, except Ditto cases).
function getEggSpeciesFromParents(parent1, parent2) {
	const species1 = pokemonDatabase.find(p => p.id === parent1.id);
	const species2 = pokemonDatabase.find(p => p.id === parent2.id);
	if (!species1 || !species2) return null;

	// Determine which parent is female
	let femaleParent;
	let maleParent;

	if (parent1.gender === 'Female') {
		femaleParent = parent1;
		maleParent = parent2;
	} else {
		femaleParent = parent2;
		maleParent = parent1;
	}

	const femaleSpecies = pokemonDatabase.find(p => p.id === femaleParent.id);
	const maleSpecies = pokemonDatabase.find(p => p.id === maleParent.id);
	if (!femaleSpecies || !maleSpecies) return null;

	// Determine egg species - always from female parent unless female is Ditto
	if (femaleSpecies.name === 'Ditto') {
		// If female is Ditto, egg is male's species
		return maleSpecies;
	}

	return femaleSpecies;
}

// Generate retro sprite inheritance with genetics multipliers
// - Base behaviour: use retro.js roll logic with pure 1-in-X RETRO_SPRITES
//   odds (no parent influence).
// - If DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro.enabled === true,
//   parents' retro values are passed to rollRetroSprite so that the
//   one/two multipliers can apply.
function inheritRetroSprite(parent1, parent2, eggSpeciesGen) {
	const parent1Retro = parent1.retro || 'base';
	const parent2Retro = parent2.retro || 'base';

	// If retro genetics are disabled, roll with no parent influence
	if (!DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro.enabled) {
		return rollRetroSprite(eggSpeciesGen, null, null);
	}

	// Use the shared retro roll logic from retro.js with parents
	return rollRetroSprite(eggSpeciesGen, parent1Retro, parent2Retro);
}

// Create egg from two parents
function createBreedingEgg(parent1, parent2) {
	const eggSpecies = getEggSpeciesFromParents(parent1, parent2);
	if (!eggSpecies) return null;

	const egg = {
		id: eggSpecies.id,
		steps: 0,
		isShiny: inheritShiny(parent1, parent2),
		isAlpha: inheritAlpha(parent1, parent2),
		ivs: inheritIVs(parent1, parent2),
		nature: inheritNature(parent1, parent2),
		gender: inheritGender(eggSpecies),
		retro: inheritRetroSprite(parent1, parent2, eggSpecies.gen)
	};

	return egg;
}

// Start breeding between two pokemon
function startBreeding(pcIndex1, pcIndex2) {
	// Validate indices
	if (pcIndex1 === null || pcIndex2 === null) return false;
	if (pcIndex1 < 0 || pcIndex2 < 0) return false;
	if (pcIndex1 >= gameData.pc.length || pcIndex2 >= gameData.pc.length) return false;

	const pokemon1 = gameData.pc[pcIndex1];
	const pokemon2 = gameData.pc[pcIndex2];

	if (!pokemon1 || !pokemon2) return false;

	// Check compatibility
	if (!areCompatible(pokemon1, pokemon2)) return false;

	// Set breeders
	setDaycareBreeders(pcIndex1, pcIndex2);

	// Calculate timer
	const timerDuration = getEggTimerDuration(pokemon1, pokemon2);
	const completionTime = Date.now() + timerDuration;
	setDaycareEggTimer(completionTime);

	return true;
}

// Check and collect breeding egg
function checkAndCollectBreedingEgg() {
	const daycare = getDaycare();
	
	// No breeding in progress
	if (!daycare.eggTimer || daycare.breeders[0] === null) return false;

	// Don't collect if breeding is paused
	if (typeof isBreedingCurrentlyPaused === 'function' && isBreedingCurrentlyPaused()) {
		return false;
	}

	// Timer not complete
	if (Date.now() < daycare.eggTimer) return false;

	// Check if can add to daycare storage
	if (!canAddMoreDaycareEggs()) {
		// Daycare is full - pause timer until space is available
		setDaycareEggTimer(null);
		return false;
	}

	// Get parents
	const parent1 = gameData.pc[daycare.breeders[0]];
	const parent2 = gameData.pc[daycare.breeders[1]];

	if (!parent1 || !parent2) {
		clearDaycareBreeders();
		return false;
	}

	// Safety check: if parents have become incompatible (e.g. changed mid-breeding),
	// stop breeding and do not create an egg.
	if (!areCompatible(parent1, parent2)) {
		clearDaycareBreeders();
		setDaycareEggTimer(null);
		return false;
	}

	// Create egg
	const egg = createBreedingEgg(parent1, parent2);
	if (!egg) {
		clearDaycareBreeders();
		return false;
	}

	// Add to daycare storage (NOT incubator)
	addDaycareEgg(egg);

	// Check if we've reached max capacity
	if (getCurrentDaycareEggCount() >= getMaxDaycareEggs()) {
		// Daycare is full - keep parents and pause timer
		setDaycareEggTimer(null);
		return true;
	}

	// Reset timer for next egg
	const timerDuration = getEggTimerDuration(parent1, parent2);
	const completionTime = Date.now() + timerDuration;
	setDaycareEggTimer(completionTime);

	return true;
}

// Move eggs from daycare to incubator (call from main page)
function transferDaycareEggsToIncubator() {
	const daycareEggs = getDaycareEggs();
	
	for (let i = daycareEggs.length - 1; i >= 0; i--) {
		if (canAddMoreIncubatorEggs()) {
			const egg = daycareEggs[i];
			gameData.incubator.push(egg);
			removeDaycareEgg(i);
		} else {
			// Incubator is full, stop transferring
			break;
		}
	}

	saveGameData();
}

// Update daycare (call from main game loop)
function updateDaycare() {
	// If breeding is paused, do not advance timers
	if (typeof isBreedingCurrentlyPaused === 'function' && isBreedingCurrentlyPaused()) {
		return;
	}

	const daycare = getDaycare();
	// If parents are set, timer is paused, and there's space, restart timer
	if (daycare.breeders[0] !== null && daycare.eggTimer === null && canAddMoreDaycareEggs()) {
		const parent1 = gameData.pc[daycare.breeders[0]];
		const parent2 = gameData.pc[daycare.breeders[1]];
		if (parent1 && parent2 && areCompatible(parent1, parent2)) {
			const timerDuration = getEggTimerDuration(parent1, parent2);
			const completionTime = Date.now() + timerDuration;
			setDaycareEggTimer(completionTime);
		}
	}

	checkAndCollectBreedingEgg();
    // Only transfer eggs to incubator if in daycare mode
    if (typeof eggSource !== 'undefined' && eggSource === 'daycare') {
        transferDaycareEggsToIncubator();
    }
}

// Run daycare checks periodically
setInterval(updateDaycare, 1000);
