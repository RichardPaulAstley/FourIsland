// Retro sprites configuration
const RETRO_SPRITES = {
	// Format: {
	//   name: short name (matches folder name in sprites/),
	//   displayName: display name for UI,
	//   maxGen: max generation this sprite set can cover,
	//   probability: chance to get this sprite (1 in X)
	// }

	// Example - Fire Red/Leaf Green sprites (Gen 1-3)
    hgss2: {
        name: 'hgss2', 
        displayName: 'Heart Gold / Soul Silver 2',
        maxGen: 4,
        probability: 12.5
    },

    bw: {
        name: 'bw',
        displayName: 'Black / White',
        maxGen: 5,
        probability: 250
    },

    pt: {
        name: 'pt',
        displayName: 'Platinum',
        maxGen: 4,
        probability: 150
    },

    pt2: {
        name: 'pt2',
        displayName: 'Platinum 2',
        maxGen: 4,
        probability: 300
    },

    dp: {
        name: 'dp',
        displayName: 'Diamond / Pearl',
        maxGen: 4,
        probability: 250
    },

    dp2: {
        name: 'dp2',
        displayName: 'Diamond / Pearl 2',
        maxGen: 4,
        probability: 500
    },
  
	frlg: {
		name: 'frlg',
		displayName: 'Fire Red / Leaf Green',
		maxGen: 3,
		probability: 1000
	},

    rs: {
        name: 'rs',
        displayName: 'Ruby / Sapphire',
        maxGen: 3,
        probability: 1500
    },

    e: {
        name: 'e',
        displayName: 'Emerald',
        maxGen: 3,
        probability: 3000
    },

    gd: {
        name: 'gd',
        displayName: 'Gold',
        maxGen: 2,
        probability: 2500
    },

    s: {
        name: 's',
        displayName: 'Silver',
        maxGen: 2,
        probability: 2500
    },
  
    c: {
        name: 'c',
        displayName: 'Crystal',
        maxGen: 2,
        probability: 2500
    },

    y: {
        name: 'y',
        displayName: 'Yellow',
        maxGen: 1,
        probability: 2000
    },
  
    rb: {
        name: 'rb',
        displayName: 'Red / Blue',
        maxGen: 1,
        probability: 3571
    },

    g: {
        name: 'g',
        displayName: 'Green',
        maxGen: 1,
        probability: 50000
    },


	// Example - Emerald sprites (Gen 1-3)
	// emerald: {
	// 	name: 'emerald',
	// 	displayName: 'Emerald',
	// 	maxGen: 3,
	// 	probability: 10
	// },

	// Add more retro sprite sets here
};

// Core retro sprite roll logic.
// - pokemonGen: generation of the Pokemon getting a sprite.
// - parent1Retro / parent2Retro: optional retro names from parents for daycare breeding.
//
// Each retro set has a base probability of 1 / probability.
// If exactly one parent has that retro, its chance is multiplied by 2x.
// If both parents have that retro, its chance is multiplied by 5x.
// We roll each retro independently using its (possibly boosted) probability;
// if multiple succeed, we pick one weighted by their individual probabilities.
function rollRetroSprite(pokemonGen, parent1Retro = null, parent2Retro = null) {
    const applicableRetros = Object.values(RETRO_SPRITES).filter(retro => pokemonGen <= retro.maxGen);

    if (applicableRetros.length === 0) {
        return 'base'; // No retro sprites available for this generation
    }

    const candidates = [];

    for (const retro of applicableRetros) {
        let p = 1 / retro.probability; // Base chance (1 in X)

        // Apply parent multipliers if genetics multipliers for retro are enabled
        let count = 0;
        if (parent1Retro && parent1Retro !== 'base' && parent1Retro === retro.name) count++;
        if (parent2Retro && parent2Retro !== 'base' && parent2Retro === retro.name) count++;

        if (typeof DAYCARE_BALANCE !== 'undefined' && DAYCARE_BALANCE.GENETICS_MULTIPLIERS && DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro && DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro.enabled) {
            if (count === 1) {
                p *= DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro.one; // 2x
            } else if (count === 2) {
                p *= DAYCARE_BALANCE.GENETICS_MULTIPLIERS.retro.two; // 5x
            }
        }

        // Clamp to max 100%
        p = Math.min(1, p);

        if (Math.random() < p) {
            candidates.push({ name: retro.name, weight: p });
        }
    }

    // No retro hit – use base sprite
    if (candidates.length === 0) {
        return 'base';
    }

    // One retro hit – use it
    if (candidates.length === 1) {
        return candidates[0].name;
    }

    // Multiple retros hit – pick one weighted by their probabilities
    let totalWeight = 0;
    for (const c of candidates) totalWeight += c.weight;
    let roll = Math.random() * totalWeight;
    for (const c of candidates) {
        if (roll < c.weight) return c.name;
        roll -= c.weight;
    }

    return candidates[0].name; // Fallback (should not happen)
}

// Get a random retro sprite based on Pokemon generation for non-breeding cases
// (e.g., wild eggs) – uses pure 1-in-X odds with no parent influence.
// Returns the retro name or 'base' if no retro applies.
function selectRetroSprite(pokemonGen) {
    return rollRetroSprite(pokemonGen, null, null);
}

// Get display name for a retro sprite
function getRetroDisplayName(retroName) {
	if (retroName === 'base' || !retroName) {
		return 'Base';
	}
	const retro = RETRO_SPRITES[retroName];
	return retro ? retro.displayName : 'Base';
}

// Check if a retro sprite can cover a Pokemon's generation
function canRetroSpriteCoverGen(retroName, pokemonGen) {
	if (retroName === 'base' || !retroName) {
		return true; // Base always covers all generations
	}
	const retro = RETRO_SPRITES[retroName];
	if (!retro) {
		return true; // Unknown retro, assume it's okay
	}
	return pokemonGen <= retro.maxGen;
}

// Get sprite path with retro applied
function getRetroSpritePath(basePath, retro) {
    if (retro === 'base' || !retro) {
        return basePath;
    }

    // Change /base/ to the retro folder
    let path = basePath.replace('/base/', `/${retro}/`);

    // Extract the filename
    const parts = path.split('/');
    const filename = parts.pop();

    // Split into number and extension
    const [id, extension] = filename.split('.');

    // Pad the ID to 3 digits
    const paddedId = String(id).padStart(3, '0');

    // Put the filename back together
    parts.push(`${paddedId}.${extension}`);

    return parts.join('/');
}