const CRITERIA_TYPES = {
	SHINY: 'shiny',
	ALPHA: 'alpha',
	NATURE: 'nature',
	GENDER: 'gender',
	IV_STAT: 'iv_stat',
	RARITY: 'rarity',
	PERFECT_IV_COUNT: 'perfect_iv_count',
	SPECIES: 'species',
	RETRO_SPRITE: 'retro_sprite'
};

const CRITERIA_OPTIONS = {
	[CRITERIA_TYPES.SHINY]: { label: 'Shiny', values: ['Yes', 'No'] },
	[CRITERIA_TYPES.ALPHA]: { label: 'Alpha', values: ['Yes', 'No'] },
	[CRITERIA_TYPES.NATURE]: { label: 'Nature', values: BALANCE.NATURES },
	[CRITERIA_TYPES.GENDER]: { label: 'Gender', values: ['Male', 'Female', 'Genderless'] },
	[CRITERIA_TYPES.IV_STAT]: { label: 'IV Stat', values: ['HP', 'ATK', 'DEF', 'SP.ATK', 'SP.DEF', 'SPD'] },
	[CRITERIA_TYPES.RARITY]: { label: 'Rarity', values: ['Common', 'Uncommon', 'Rare', 'Special', 'Legendary'] },
	[CRITERIA_TYPES.PERFECT_IV_COUNT]: { label: 'Perfect IV Count', numeric: true },
	[CRITERIA_TYPES.SPECIES]: { label: 'Species', dynamic: true },
	[CRITERIA_TYPES.RETRO_SPRITE]: { label: 'Retro Sprite', dynamic: true }
};

let currentFilterBeingEdited = null;

document.addEventListener('DOMContentLoaded', () => {
	const addFilterBtn = document.getElementById('addFilterBtn');
	const cancelBtn = document.getElementById('cancelFilterBtn');
	const saveCriteriaBtn = document.getElementById('saveCriteriaBtn');
	const addCriteriaBtn = document.getElementById('addCriteriaBtn');
	const inlineBuilder = document.getElementById('inlineBuilder');
	// If the Filters UI is not present on this page, exit early to avoid errors.
	if (!addFilterBtn || !cancelBtn || !saveCriteriaBtn || !addCriteriaBtn || !inlineBuilder) {
		return;
	}
	addFilterBtn.addEventListener('click', () => {
		currentFilterBeingEdited = { criteria: [] };
		document.getElementById('criteriaList').innerHTML = '';
		inlineBuilder.classList.remove('hidden');
		updateEmptyMessage();
	});

	cancelBtn.addEventListener('click', () => {
		inlineBuilder.classList.add('hidden');
		currentFilterBeingEdited = null;
		updateEmptyMessage();
	});

	addCriteriaBtn.addEventListener('click', addCriteriaInput);
	saveCriteriaBtn.addEventListener('click', saveFilter);

	renderFilters();
	updateEmptyMessage();
});

function updateEmptyMessage() {
	const empty = document.getElementById("emptyMessage");
	if (!empty) return;

	const hasFilters = getFilters().length > 0;
	const builderOpen = !document.getElementById("inlineBuilder").classList.contains("hidden");

	empty.style.display = (!hasFilters && !builderOpen) ? "block" : "none";
}

function addCriteriaInput() {
	const criteriaList = document.getElementById('criteriaList');
	const criteriaIndex = criteriaList.children.length;

	const criteriaGroup = document.createElement('div');
	criteriaGroup.className = 'criteria-input-group';
	criteriaGroup.dataset.index = criteriaIndex;

	criteriaGroup.innerHTML = `
		<label>Type:</label>
		<select class="criteria-type" onchange="updateCriteriaOptions(${criteriaIndex})">
			<option value="">Select type...</option>
			<option value="${CRITERIA_TYPES.SHINY}">Shiny</option>
			<option value="${CRITERIA_TYPES.ALPHA}">Alpha</option>
			<option value="${CRITERIA_TYPES.NATURE}">Nature</option>
			<option value="${CRITERIA_TYPES.GENDER}">Gender</option>
			<option value="${CRITERIA_TYPES.IV_STAT}">IV Stat</option>
			<option value="${CRITERIA_TYPES.RARITY}">Rarity</option>
			<option value="${CRITERIA_TYPES.PERFECT_IV_COUNT}">Perfect IV Count</option>
			<option value="${CRITERIA_TYPES.SPECIES}">Species</option>
			<option value="${CRITERIA_TYPES.RETRO_SPRITE}">Retro Sprite</option>
		</select>

		<label>Value:</label>
		<select class="criteria-value">
			<option value="">Select value...</option>
		</select>

		<div class="criteria-retro-options" style="display: none;"></div>

		<div class="iv-range">
  			<input type="number" class="criteria-min-iv" min="0" max="31" placeholder="Min IV" style="display:none;" />
  			<input type="number" class="criteria-max-iv" min="0" max="31" placeholder="Max IV" style="display:none;" />
		</div>
		<input type="number" class="criteria-numeric" min="0" max="6" placeholder="Number of perfect IVs" style="display: none;" />

		<button class="btn btn-danger remove-criteria" onclick="removeCriteria(${criteriaIndex})">Remove</button>
	`;

	criteriaList.appendChild(criteriaGroup);
}

function updateCriteriaOptions(index) {
	const criteriaGroups = document.querySelectorAll('.criteria-input-group');
	const group = criteriaGroups[index];
	const typeSelect = group.querySelector('.criteria-type');
	const valueSelect = group.querySelector('.criteria-value');
	const minIvInput = group.querySelector('.criteria-min-iv');
	const maxIvInput = group.querySelector('.criteria-max-iv');
	const numericInput = group.querySelector('.criteria-numeric');
	const retroOptions = group.querySelector('.criteria-retro-options');

	const selectedType = typeSelect.value;

	// Hide all inputs by default
	valueSelect.style.display = 'block';
	minIvInput.parentElement.style.display = 'none';
	minIvInput.style.display = 'none';
	maxIvInput.style.display = 'none';
	numericInput.style.display = 'none';
	if (retroOptions) {
		retroOptions.style.display = 'none';
		retroOptions.innerHTML = '';
	}

	if (!selectedType) {
		valueSelect.innerHTML = '<option value="">Select value...</option>';
		return;
	}

	if (selectedType === CRITERIA_TYPES.IV_STAT) {
		// For IV stats, show min/max inputs and stat dropdown
		minIvInput.parentElement.style.display = 'flex';
		minIvInput.style.display = 'block';
    	maxIvInput.style.display = 'block';
		valueSelect.innerHTML = '<option value="">Select stat...</option>';
		CRITERIA_OPTIONS[selectedType].values.forEach(value => {
			const option = document.createElement('option');
			option.value = value;
			option.textContent = value;
			valueSelect.appendChild(option);
		});
	} else if (selectedType === CRITERIA_TYPES.PERFECT_IV_COUNT) {
		// For Perfect IV Count, hide value dropdown and show numeric input only
		valueSelect.style.display = 'none';
		numericInput.style.display = 'block';
	} else if (selectedType === CRITERIA_TYPES.SPECIES) {
		// For Species, populate with all Pokemon names
		valueSelect.innerHTML = '<option value="">Select species...</option>';
		const uniqueSpecies = [...new Set(pokemonDatabase.map(p => p.name))].sort();
		uniqueSpecies.forEach(name => {
			const option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			valueSelect.appendChild(option);
		});
	} else if (selectedType === CRITERIA_TYPES.RETRO_SPRITE) {
		// For Retro Sprite, show a checkbox list of available sprite styles
		valueSelect.style.display = 'none';
		if (retroOptions) {
			retroOptions.style.display = 'block';
			retroOptions.innerHTML = '';

			// Optional base sprite checkbox
			const baseLabel = document.createElement('label');
			const baseCheckbox = document.createElement('input');
			baseCheckbox.type = 'checkbox';
			baseCheckbox.value = 'base';
			baseLabel.appendChild(baseCheckbox);
			baseLabel.appendChild(document.createTextNode(' Base'));
			retroOptions.appendChild(baseLabel);

			// Individual retro sprite options
			Object.entries(RETRO_SPRITES).forEach(([key, retro]) => {
				const label = document.createElement('label');
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.value = retro.name;
				label.appendChild(checkbox);
				label.appendChild(document.createTextNode(' ' + retro.displayName));
				retroOptions.appendChild(label);
			});
		}
	} else {
		// For other types, populate value options
		valueSelect.innerHTML = '<option value="">Select value...</option>';
		CRITERIA_OPTIONS[selectedType].values.forEach(value => {
			const option = document.createElement('option');
			option.value = value;
			option.textContent = value;
			valueSelect.appendChild(option);
		});
	}
}

function removeCriteria(index) {
	const criteriaGroups = document.querySelectorAll('.criteria-input-group');
	if (criteriaGroups[index]) {
		criteriaGroups[index].remove();
	}
}

function saveFilter() {
	const criteriaList = document.getElementById('criteriaList');
	const criteriaGroups = document.querySelectorAll('.criteria-input-group');

	const criteria = [];

	let invalid = false;

	criteriaGroups.forEach((group) => {
		if (invalid) return;
		const typeSelect = group.querySelector('.criteria-type');
		const valueSelect = group.querySelector('.criteria-value');
		const minIvInput = group.querySelector('.criteria-min-iv');
		const maxIvInput = group.querySelector('.criteria-max-iv');
		const numericInput = group.querySelector('.criteria-numeric');
		const retroOptions = group.querySelector('.criteria-retro-options');

		const type = typeSelect.value;
		let value = valueSelect.value;

		if (!type) {
			alert('Please select a type for all criteria');
			invalid = true;
			return;
		}

		// For Perfect IV Count, value is optional - get it from numeric input
		if (type === CRITERIA_TYPES.PERFECT_IV_COUNT) {
			if (!numericInput.value) {
				alert('Please enter the number of perfect IVs required');
				return;
			}
			value = parseInt(numericInput.value);
		} else if (type === CRITERIA_TYPES.RETRO_SPRITE) {
			// For Retro Sprite, gather selected checkbox values
			const checked = retroOptions ? Array.from(retroOptions.querySelectorAll('input[type="checkbox"]:checked')) : [];
			if (checked.length === 0) {
				alert('Please select at least one retro sprite style');
				return;
			}
			value = checked.map(cb => cb.value);
		} else {
			if (!value) {
				alert('Please complete all criteria fields');
				return;
			}
		}

		const criteriaObj = { type, value };

		if (type === CRITERIA_TYPES.IV_STAT) {
			const minIv = minIvInput.value ? parseInt(minIvInput.value) : 0;
			const maxIv = maxIvInput.value ? parseInt(maxIvInput.value) : 31;

			if (minIv > maxIv) {
				alert('Min IV cannot be greater than Max IV');
				return;
			}

			criteriaObj.minIv = minIv;
			criteriaObj.maxIv = maxIv;
		}

		criteria.push(criteriaObj);
	});

	if (invalid) return;

	if (criteria.length === 0) {
		alert('Add at least one criteria');
		return;
	}

	// Check if editing or creating
	if (currentFilterBeingEdited && currentFilterBeingEdited.id) {
		// Editing existing filter
		const filterIndex = getFilters().findIndex(f => f.id === currentFilterBeingEdited.id);
		if (filterIndex !== -1) {
			getFilters()[filterIndex].criteria = criteria;
		}
	} else {
		// Creating new filter
		const filter = {
			id: Date.now(),
			name: `Filter ${getFilters().length + 1}`,
			criteria: criteria,
			active: true,
			createdAt: new Date().toISOString()
		};
		getFilters().push(filter);
	}

	saveGameData();

	// Close builder and refresh
	closeBuilder();
	currentFilterBeingEdited = null;
	renderFilters();
	updateEmptyMessage();
}

function renderFilters() {
	const filtersList = document.getElementById('filtersList');
	const filters = getFilters();

	filtersList.innerHTML = '';

	if (filters.length === 0) {
		updateEmptyMessage();
		return;
	}

	filtersList.innerHTML = '';

	filters.forEach((filter, index) => {
		const filterCard = document.createElement('div');
		filterCard.className = `filter-card ${filter.active ? 'active' : ''}`;

		const filterHeader = document.createElement('div');
		filterHeader.className = 'filter-header';

		const filterTitle = document.createElement('div');
		filterTitle.className = 'filter-title';
		filterTitle.style.cursor = 'pointer';
		filterTitle.textContent = filter.name;
		filterTitle.title = 'Click to edit';
		filterTitle.addEventListener('click', () => editFilter(index));

		const filterActions = document.createElement('div');
		filterActions.className = 'filter-actions';

		const toggleBtn = document.createElement('button');
		toggleBtn.className = `btn ${filter.active ? 'btn-primary' : 'btn-secondary'}`;
		toggleBtn.textContent = filter.active ? 'Active' : 'Inactive';
		toggleBtn.addEventListener('click', () => toggleFilter(index));

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'btn btn-danger';
		deleteBtn.textContent = 'Delete';
		deleteBtn.addEventListener('click', () => deleteFilter(index));

		filterActions.appendChild(toggleBtn);
		filterActions.appendChild(deleteBtn);

		filterHeader.appendChild(filterTitle);
		filterHeader.appendChild(filterActions);

		filterCard.appendChild(filterHeader);

		// Render criteria
		filter.criteria.forEach((criterion) => {
			const criteriaDiv = document.createElement('div');
			criteriaDiv.className = 'filter-criteria';

			let criteriaText = `${CRITERIA_OPTIONS[criterion.type].label}: ${criterion.value}`;

			if (criterion.type === CRITERIA_TYPES.IV_STAT) {
				criteriaText = `${criterion.value} IV: ${criterion.minIv} - ${criterion.maxIv}`;
			} else if (criterion.type === CRITERIA_TYPES.RETRO_SPRITE) {
				// Human-friendly text for retro options, supporting arrays and legacy values
				if (Array.isArray(criterion.value)) {
					const names = criterion.value.map(val => {
						if (val === 'base') return 'Base';
						const retro = RETRO_SPRITES[val];
						return retro ? retro.displayName : val;
					});
					criteriaText = `${CRITERIA_OPTIONS[criterion.type].label}: ${names.join(', ')}`;
				} else if (criterion.value === '__any_non_base__') {
					criteriaText = `${CRITERIA_OPTIONS[criterion.type].label}: Any Retro`;
				} else if (criterion.value === 'base') {
					criteriaText = `${CRITERIA_OPTIONS[criterion.type].label}: Base`;
				} else if (criterion.value) {
					const retro = RETRO_SPRITES[criterion.value];
					criteriaText = `${CRITERIA_OPTIONS[criterion.type].label}: ${retro ? retro.displayName : criterion.value}`;
				}
			}

			criteriaDiv.innerHTML = `<span class="criteria-label">${criteriaText}</span>`;
			filterCard.appendChild(criteriaDiv);
		});

		filtersList.appendChild(filterCard);
	});
}

// Toggle filter active status
function toggleFilter(index) {
	getFilters()[index].active = !getFilters()[index].active;
	saveGameData();
	renderFilters();
	updateEmptyMessage();
}

// Edit an existing filter
function editFilter(index) {
	const filter = getFilters()[index];
	currentFilterBeingEdited = { ...filter };

	const criteriaList = document.getElementById('criteriaList');
	criteriaList.innerHTML = '';

	// Load existing criteria
	filter.criteria.forEach((criterion) => {
		addCriteriaInput();
		const criteriaGroups = document.querySelectorAll('.criteria-input-group');
		const lastGroup = criteriaGroups[criteriaGroups.length - 1];

		const typeSelect = lastGroup.querySelector('.criteria-type');
		const valueSelect = lastGroup.querySelector('.criteria-value');
		const minIvInput = lastGroup.querySelector('.criteria-min-iv');
		const maxIvInput = lastGroup.querySelector('.criteria-max-iv');
		const numericInput = lastGroup.querySelector('.criteria-numeric');

		typeSelect.value = criterion.type;
		updateCriteriaOptions(criteriaGroups.length - 1);

		// Set value after options are populated
		setTimeout(() => {
			if (criterion.type === CRITERIA_TYPES.IV_STAT) {
				valueSelect.value = criterion.value;
				minIvInput.value = criterion.minIv;
				maxIvInput.value = criterion.maxIv;
			} else if (criterion.type === CRITERIA_TYPES.PERFECT_IV_COUNT) {
				numericInput.value = criterion.value;
				} else if (criterion.type === CRITERIA_TYPES.RETRO_SPRITE) {
					const retroOptions = lastGroup.querySelector('.criteria-retro-options');
					if (retroOptions) {
						const checkboxes = Array.from(retroOptions.querySelectorAll('input[type="checkbox"]'));
						let selectedValues;
						if (Array.isArray(criterion.value)) {
							selectedValues = criterion.value;
						} else if (criterion.value === '__any_non_base__') {
							// Legacy "Any Retro" becomes all non-base retros
							selectedValues = checkboxes.filter(cb => cb.value !== 'base').map(cb => cb.value);
						} else if (criterion.value) {
							selectedValues = [criterion.value];
						} else {
							selectedValues = [];
						}
						checkboxes.forEach(cb => {
							cb.checked = selectedValues.includes(cb.value);
						});
					}
			} else {
				valueSelect.value = criterion.value;
			}
		}, 0);
	});

	openBuilder()
	updateEmptyMessage();
}

// Delete a filter
function deleteFilter(index) {
	if (confirm('Are you sure you want to delete this filter?')) {
		getFilters().splice(index, 1);
		saveGameData();
		renderFilters();
		updateEmptyMessage();
	}
}

function openBuilder() {
	document.getElementById('inlineBuilder').classList.remove('hidden');
	updateEmptyMessage();
}

function closeBuilder() {
	document.getElementById('inlineBuilder').classList.add('hidden');
	updateEmptyMessage();
}

// Check if a Pokemon matches any active filter
function checkPokemonAgainstFilters(pokemon) {
	const filters = getFilters();
	const activeFilters = filters.filter(f => f.active);

	console.log(`Checking Pokemon ${pokemon.name} against ${activeFilters.length} active filters`);

	// If no active filters, keep Pokemon
	if (activeFilters.length === 0) {
		console.log('No active filters - keeping Pokemon');
		return true;
	}

	// Check if Pokemon matches ANY filter (OR logic)
	for (const filter of activeFilters) {
		const matches = matchesAllCriteria(pokemon, filter.criteria);
		console.log(`Filter "${filter.name}": ${matches ? 'MATCH' : 'no match'}`);
		if (matches) {
			console.log(`✓ Pokemon kept - matches filter "${filter.name}"`);
			return true;
		}
	}

	console.log(`✗ Pokemon rejected - matches no active filters`);
	return false;
}

// Check if Pokemon matches all criteria in a filter
function matchesAllCriteria(pokemon, criteria) {
	for (const criterion of criteria) {
		if (!matchesCriterion(pokemon, criterion)) {
			return false;
		}
	}
	return true;
}

// Check if Pokemon matches a single criterion
function matchesCriterion(pokemon, criterion) {
	if (!pokemon) {
		console.warn('matchesCriterion: Pokemon is null/undefined');
		return false;
	}

	switch (criterion.type) {
		case CRITERIA_TYPES.SHINY:
			const shinyMatch = pokemon.isShiny === (criterion.value === 'Yes');
			console.log(`Shiny check: pokemon.isShiny=${pokemon.isShiny}, criterion=${criterion.value}, match=${shinyMatch}`);
			return shinyMatch;

		case CRITERIA_TYPES.ALPHA:
			const alphaMatch = pokemon.isAlpha === (criterion.value === 'Yes');
			console.log(`Alpha check: pokemon.isAlpha=${pokemon.isAlpha}, criterion=${criterion.value}, match=${alphaMatch}`);
			return alphaMatch;

		case CRITERIA_TYPES.NATURE:
			const natureMatch = pokemon.nature === criterion.value;
			console.log(`Nature check: pokemon.nature=${pokemon.nature}, criterion=${criterion.value}, match=${natureMatch}`);
			return natureMatch;

		case CRITERIA_TYPES.GENDER:
			const genderMap = { 'Male': 'M', 'Female': 'F', 'Genderless': '-' };
			const genderMatch = pokemon.gender === genderMap[criterion.value];
			console.log(`Gender check: pokemon.gender=${pokemon.gender}, criterion=${criterion.value}, mapped=${genderMap[criterion.value]}, match=${genderMatch}`);
			return genderMatch;

		case CRITERIA_TYPES.IV_STAT:
			const statMap = {
				'HP': 'hp',
				'ATK': 'atk',
				'DEF': 'def',
				'SP.ATK': 'spAtk',
				'SP.DEF': 'spDef',
				'SPD': 'spd'
			};
			const statKey = statMap[criterion.value];
			const iv = pokemon.ivs ? pokemon.ivs[statKey] : undefined;
			const ivMatch = iv !== undefined && iv >= criterion.minIv && iv <= criterion.maxIv;
			console.log(`IV check: stat=${criterion.value}, iv=${iv}, range=${criterion.minIv}-${criterion.maxIv}, match=${ivMatch}`);
			return ivMatch;

		case CRITERIA_TYPES.RARITY:
			const rarityMap = { 'Common': 'common', 'Uncommon': 'uncommon', 'Rare': 'rare', 'Special': 'special', 'Legendary': 'legendary'};
			const pokemonData = getPokemonById(pokemon.id);
			const pokemonRarity = pokemonData ? pokemonData.rarity : undefined;
			const rarityMatch = pokemonRarity === rarityMap[criterion.value];
			console.log(`Rarity check: pokemonRarity=${pokemonRarity}, criterion=${criterion.value}, mapped=${rarityMap[criterion.value]}, match=${rarityMatch}`);
			return rarityMatch;

		case CRITERIA_TYPES.PERFECT_IV_COUNT:
			// Count how many IVs are exactly 31
			if (!pokemon.ivs) {
				console.log(`Perfect IV Count: No IVs found, match=false`);
				return false;
			}
			const perfectIVCount = Object.values(pokemon.ivs).filter(iv => iv === 31).length;
			const perfectMatch = perfectIVCount >= criterion.value;
			console.log(`Perfect IV Count check: pokemon has ${perfectIVCount} perfect IVs, criterion requires ${criterion.value}, match=${perfectMatch}`);
			return perfectMatch;

		case CRITERIA_TYPES.SPECIES:
			const pokemonSpecies = getPokemonById(pokemon.id);
			const speciesName = pokemonSpecies ? pokemonSpecies.name : undefined;
			const speciesMatch = speciesName === criterion.value;
			console.log(`Species check: pokemon=${speciesName}, criterion=${criterion.value}, match=${speciesMatch}`);
			return speciesMatch;

		case CRITERIA_TYPES.RETRO_SPRITE:
			const retroName = pokemon.retro || 'base';
			let retroMatch;
			if (Array.isArray(criterion.value)) {
				// New behaviour: match if Pokemon's retro is in the selected set
				retroMatch = criterion.value.includes(retroName);
			} else if (criterion.value === '__any_non_base__') {
				// Legacy "Any Retro" option: match any non-base retro sprite
				retroMatch = retroName !== 'base';
			} else {
				retroMatch = retroName === criterion.value;
			}
			console.log(`Retro Sprite check: pokemon retro=${retroName}, criterion=${criterion.value}, match=${retroMatch}`);
			return retroMatch;

		default:
			console.warn(`Unknown criterion type: ${criterion.type}`);
			return false;
	}
}
