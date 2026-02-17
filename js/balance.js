// Game balance settings
const BALANCE = {
	// Egg hatching settings
	EGG_STEPS_PER_TICK_MIN: 20,  // Minimum egg steps added per tick
	EGG_STEPS_PER_TICK_MAX: 45,  // Maximum egg steps added per tick
	TICK_INTERVAL: 1000,       // Milliseconds between each tick (1 second)

	RARITY_WEIGHTS: {
		common: 50,
		uncommon: 30,
		rare: 10,
		special: 1,
		event: 1,
		novelty: 1,
		legendary: 1
	},

	SHINY_ODDS: 8192,           
	ALPHA_ODDS: 1000,           
	MAX_IV: 31,                 
	
	// Rare Candy settings
	RARE_CANDY_CHANCE: 20,    // Chance to get rare candy when hatching (1 in X)
	
	// Available natures
	NATURES: [
		"Hardy", "Bold", "Modest", "Calm", "Timid",
		"Lonely", "Docile", "Mild", "Gentle", "Hasty",
		"Brave", "Relaxed", "Quiet", "Sassy", "Careful",
		"Serious", "Jolly", "Naive", "Bashful", "Quirky",
		"Adamant", "Impish", "Lax", "Rash", "Naughty",
	],

	// PC Storage settings
	PC_CAPACITY: 1200,  // Maximum number of Pokemon in PC (upgradeable in future)

	// Other game settings can be added here
};
