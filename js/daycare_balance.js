// Daycare balance settings

const DAYCARE_BALANCE = {
	// Timer durations (in milliseconds) based on rarity
	EGG_TIMERS: {
		common: 30000,      // 30 seconds
		uncommon: 45000,    // 45 seconds
		rare: 60000,        // 60 seconds
		special: 120000,    // 120 seconds
		legendary: 120000,  // 120 seconds
		event: 120000,      // 120 seconds
		novelty: 120000,    // 120 seconds
	},

	// Maximum eggs player can have at once
	MAX_EGGS: 10,

	// Egg generation speed upgrade effect (reduces timer by this much per level)
	EGG_SPEED_MULTIPLIER: 0.9, // Each level multiplies by 0.9 (10% faster)

	// Egg capacity upgrade effect (adds this many slots per level)
	EGG_CAPACITY_PER_LEVEL: 1,

	// IV inheritance - fixed at 3, no upgrade
	IV_INHERITANCE_COUNT: 3,

	// Genetics influence multipliers
	GENETICS_MULTIPLIERS: {
		// Shiny inheritance (disabled by setting enabled to false)
		shiny: {
			enabled: true,
			one: 2,         // One parent shiny = 2x odds
			two: 10         // Both parents shiny = 10x odds
		},
		// Alpha inheritance (disabled by setting enabled to false)
		alpha: {
			enabled: true,
			one: 2,         // One parent alpha = 2x odds
			two: 10         // Both parents alpha = 10x odds
		},
		// Nature inheritance (now as percentage)
		nature: {
			enabled: true,
			matchChance: 100 // If both parents have same nature, 100% inherit it
		},
		// Retro sprite inheritance
		retro: {
			enabled: true,
			one: 2,         // One parent has retro = 2x odds to inherit
			two: 5          // Both parents have retro = 5x odds to inherit
		}
	}
};
