// Game state for PC
let pcState = {
	selectedSlotIndex: null,
	selectedPokemon: null,
	viewingPokemonIndex: null, // Track which pokemon is currently being viewed in modal
	multiSelectMode: false,
	multiSelected: new Set(),
};

// Get Pokemon sprite based on shiny status and retro sprite
function getPokemonSprite(pokemonId, isShiny, retro = 'base') {
	const pokemon = pokemonDatabase.find(p => p.id === pokemonId);
	if (!pokemon) return null;
	
	let basePath = isShiny ? pokemon.shiny_sprite : pokemon.sprite;
	basePath = getRetroSpritePath(basePath, retro);
	
	// Adjust path for src/ folder location
	if (basePath && !basePath.startsWith('../') && !basePath.startsWith('http')) {
		basePath = '../' + basePath;
	}
	
	return basePath;
}

// Swap Pokemon between two slots
function swapPokemon(index1, index2) {
	const pc = getPC();
	
	if (index1 >= pc.length || index2 >= pc.length) {
		return false;
	}

	// Check if either pokemon is in the daycare (block movement of daycare parents)
	const daycareBreeders = getDaycareBreeders();
	if (daycareBreeders.includes(index1) || daycareBreeders.includes(index2)) {
		alert('Cannot move pokemon that are in the daycare! Remove them first.');
		return false;
	}

	// Remove visual selection from previously selected slot
	const selectedSlot = document.querySelector(`[data-index="${index1}"]`);
	if (selectedSlot) {
		selectedSlot.classList.remove('selected');
	}

	// Swap
	const temp = pc[index1];
	pc[index1] = pc[index2];
	pc[index2] = temp;

	// Clear selection state
	pcState.selectedSlotIndex = null;
	pcState.selectedPokemon = null;

	saveGameData();
	renderPCGrid();

	return true;
}

function toggleMultiSelect(){
	pcState.multiSelectMode = !pcState.multiSelectMode;
	pcState.multiSelected.clear();

	document.getElementById("releaseSelectedBtn").style.display =
		pcState.multiSelectMode ? "inline-block" : "none";

	renderPCGrid();
}

function toggleSlotSelection(index, element){
	if(pcState.multiSelected.has(index)){
		pcState.multiSelected.delete(index);
		element.classList.remove("multi-selected");
	}else{
		pcState.multiSelected.add(index);
		element.classList.add("multi-selected");
	}
}

function releaseSelectedPokemon(){
	if(pcState.multiSelected.size === 0){
		alert("No Pokémon selected.");
		return;
	}

	const confirmRelease = confirm(`Release ${pcState.multiSelected.size} Pokémon? This cannot be undone.`);
	if(!confirmRelease) return;

	const pc = getPC();
	const daycare = getDaycare();

	pcState.multiSelected.forEach(i=>{
		if(daycare.breeders.includes(i)) return;
		pc[i] = null;
	});

	saveGameData();
	pcState.multiSelected.clear();
	renderPCGrid();
}

// Render the PC grid with all Pokemon
function renderPCGrid() {
	// Load fresh data directly from localStorage
	const pcFromStorage = localStorage.getItem('pc');
	let pc = [];
	
	if (pcFromStorage) {
		try {
			pc = JSON.parse(pcFromStorage);
			
			// Ensure it's the right size
			if (pc.length < BALANCE.PC_CAPACITY) {
				pc.push(...Array(BALANCE.PC_CAPACITY - pc.length).fill(null));
			}
		} catch (e) {
			console.error('Error parsing PC from storage:', e);
			pc = Array(BALANCE.PC_CAPACITY).fill(null);
		}
	} else {
		pc = Array(BALANCE.PC_CAPACITY).fill(null);
	}

	const boxesContainer = document.getElementById('pcBoxesContainer');
	boxesContainer.innerHTML = '';

	const POKEMON_PER_BOX = 30; // 6 columns x 5 rows per box
	const totalBoxes = Math.ceil(BALANCE.PC_CAPACITY / POKEMON_PER_BOX);

	// Create boxes
	for (let boxNum = 0; boxNum < totalBoxes; boxNum++) {
		const boxDiv = document.createElement('div');
		boxDiv.className = 'pc-box';

		const boxTitle = document.createElement('h3');
		boxTitle.className = 'box-title';
		boxTitle.textContent = `Box ${boxNum + 1}`;
		boxDiv.appendChild(boxTitle);

		const grid = document.createElement('div');
		grid.className = 'pc-grid';

		const startIndex = boxNum * POKEMON_PER_BOX;
		const endIndex = Math.min(startIndex + POKEMON_PER_BOX, BALANCE.PC_CAPACITY);

		// Create slots for this box
		for (let i = startIndex; i < endIndex; i++) {
			const slot = document.createElement('div');
			slot.className = 'pc-slot';
			slot.dataset.index = i;
			if(pcState.multiSelected.has(i)){
				slot.classList.add("multi-selected");
			}
			const pokemon = pc[i];

			if (pokemon !== null && pokemon !== undefined) {
				const spriteUrl = getPokemonSprite(pokemon.id, pokemon.isShiny, pokemon.retro);

				const img = document.createElement('img');
				img.src = spriteUrl;
				img.alt = pokemon.name;
				img.className = 'pc-pokemon-sprite';

				// Add shiny and alpha classes
				if (pokemon.isShiny) {
					slot.classList.add('shiny-pokemon');
					if (pokemon.isSquareShiny) {
						slot.classList.add('square-shiny-pokemon');
					}
				}

				if (pokemon.isAlpha) {
					slot.classList.add('alpha-pokemon');
				}

				// Check if pokemon is in daycare
				const daycare = getDaycare();
				if (daycare.breeders.includes(i)) {
					slot.classList.add('daycare-pokemon');
				}

				slot.appendChild(img);

				// Regular click to open details
				slot.addEventListener('click', (e) => {
					if(pcState.multiSelectMode){
						toggleSlotSelection(i, slot);
						return;
					}
					if (e.ctrlKey) {
						selectSlotForSwap(i, slot);
					} else if (pcState.selectedSlotIndex !== null && pcState.selectedSlotIndex !== i) {
						// If a slot is already selected and this is a different occupied slot, swap them
						swapPokemon(pcState.selectedSlotIndex, i);
					} else {
						openPokemonDetails(pokemon, i);
					}
				});

				// Highlight selected slot
				if (i === pcState.selectedSlotIndex) {
					slot.classList.add('selected');
				}
			} else {
				const empty = document.createElement('div');
				empty.className = 'empty-pokemon-slot';
				empty.textContent = '—';
				slot.appendChild(empty);

				// Click on empty slot to swap if one is selected
				slot.addEventListener('click', (e) => {
					if(pcState.multiSelectMode) return;
					if (pcState.selectedSlotIndex !== null) {
						swapPokemon(pcState.selectedSlotIndex, i);
					} else if (e.ctrlKey) {
						selectSlotForSwap(i, slot);
					}
				});
			}

			grid.appendChild(slot);
		}

		boxDiv.appendChild(grid);
		boxesContainer.appendChild(boxDiv);
	}
}

// Select a slot for swapping
function selectSlotForSwap(index, slotElement) {
	// Deselect previous if any
	if (pcState.selectedSlotIndex !== null) {
		const prevSlot = document.querySelector(`[data-index="${pcState.selectedSlotIndex}"]`);
		if (prevSlot) {
			prevSlot.classList.remove('selected');
		}
	}

	pcState.selectedSlotIndex = index;
	pcState.selectedPokemon = getPC()[index];
	slotElement.classList.add('selected');
}

// Open details modal for a Pokemon
function openPokemonDetails(pokemon, pokemonIndex) {
	const modal = document.getElementById('pokemonModal');
	const basePokemon = pokemonDatabase.find(p => p.id === pokemon.id);

	if (!basePokemon) return;

	// Track which pokemon is being viewed
	pcState.viewingPokemonIndex = pokemonIndex;

	// Set sprite
	const spriteUrl = getPokemonSprite(pokemon.id, pokemon.isShiny, pokemon.retro);
	document.getElementById('modalSprite').src = spriteUrl;

	// Set basic info - look up from database
	document.getElementById('modalName').textContent = basePokemon.name;
	document.getElementById('modalGender').textContent = `Gender: ${pokemon.gender}`;
	document.getElementById('modalNature').textContent = `Nature: ${pokemon.nature}`;

	// Set retro sprite info
	const retroElement = document.getElementById('modalRetro');
	if (retroElement) {
		retroElement.textContent = `Sprite: ${getRetroDisplayName(pokemon.retro)}`;
	}

	// Set shiny/alpha indicators
	const shinyElement = document.getElementById('modalShiny');
	const alphaElement = document.getElementById('modalAlpha');
	
	if (pokemon.isShiny) {
		shinyElement.style.display = 'block';
		// Show different label for Square Shiny vs regular Shiny
		if (pokemon.isSquareShiny) {
			shinyElement.textContent = '⬛ SQUARE SHINY ⬛';
		} else {
			shinyElement.textContent = '✨ SHINY ✨';
		}
	} else {
		shinyElement.style.display = 'none';
	}
	alphaElement.style.display = pokemon.isAlpha ? 'block' : 'none';

	// Set IVs
	document.getElementById('ivHp').textContent = pokemon.ivs.hp;
	document.getElementById('ivAtk').textContent = pokemon.ivs.atk;
	document.getElementById('ivDef').textContent = pokemon.ivs.def;
	document.getElementById('ivSpAtk').textContent = pokemon.ivs.spAtk;
	document.getElementById('ivSpDef').textContent = pokemon.ivs.spDef;
	document.getElementById('ivSpd').textContent = pokemon.ivs.spd;

	// Set capture time
	const captureDate = new Date(pokemon.captureTime);
	document.getElementById('modalCaptureTime').textContent = `Hatched: ${captureDate.toLocaleString()}`;

	// Handle evolution button
	const evolutionBtn = document.getElementById('evolutionBtn');
	const possibleEvolutions = typeof getPossibleEvolutions === 'function' ? getPossibleEvolutions(pokemon) : [];
	
	if (possibleEvolutions.length > 0) {
		evolutionBtn.style.display = 'block';
		evolutionBtn.disabled = false;
		evolutionBtn.textContent = 'Evolve';
		
		// Find the Pokemon's index in the PC
		const pc = getPC();
		const pokemonIndex = pc.findIndex(p => p && p.id === pokemon.id && p.captureTime === pokemon.captureTime);
		
		evolutionBtn.onclick = () => {
			if (typeof performSingleEvolution === 'function') {
				performSingleEvolution(pokemonIndex, pokemon);
			}
		};
	} else {
		// Check if evolution exists but conditions not met
		const basePokemon = pokemonDatabase.find(p => p.id === pokemon.id);
		if (basePokemon && basePokemon.evolutions && basePokemon.evolutions.length > 0) {
			evolutionBtn.style.display = 'block';
			evolutionBtn.disabled = true;
			
			// Show the reason why evolution is blocked
			const blockReason = typeof getEvolutionBlockReason === 'function' ? 
				getEvolutionBlockReason(pokemon, basePokemon.evolutions[0]) : 
				'Conditions not met';
			evolutionBtn.textContent = `Evolve (${blockReason})`;
		} else {
			evolutionBtn.style.display = 'none';
		}
	}

	// Handle daycare button
	const daycareBtn = document.getElementById('daycareBtn');
	if (daycareBtn) {
		const daycare = getDaycare();
		const isInDaycare = daycare.breeders[0] === pokemonIndex || daycare.breeders[1] === pokemonIndex;
		const isFull = daycare.breeders[0] !== null && daycare.breeders[1] !== null;
		
		if (isInDaycare) {
			// Pokemon is in daycare - show remove option
			daycareBtn.textContent = 'Remove from the daycare';
			daycareBtn.disabled = false;
			daycareBtn.className = 'btn btn-secondary';
		} else if (isFull) {
			// Daycare is full and this pokemon is not in it
			daycareBtn.textContent = 'Put in the daycare';
			daycareBtn.disabled = true;
			daycareBtn.className = 'btn btn-secondary disabled';
		} else {
			// Daycare has space
			daycareBtn.textContent = 'Put in the daycare';
			daycareBtn.disabled = false;
			daycareBtn.className = 'btn btn-secondary';
		}
	}

	// Show modal
	modal.style.display = 'block';
}

// Close modal
function closeModal() {
	const modal = document.getElementById('pokemonModal');
	modal.style.display = 'none';
}

// Initialize PC page
	document.addEventListener('DOMContentLoaded', () => {
	renderPCGrid();

	// Close button
	const closeBtn = document.querySelector('.close');
	if (closeBtn) {
		closeBtn.addEventListener('click', closeModal);
	}

	// Daycare button
	const daycareBtn = document.getElementById('daycareBtn');
	if (daycareBtn) {
		daycareBtn.addEventListener('click', putPokemonInDaycare);
	}

	// Release button
	const releaseBtn = document.getElementById('releaseBtn');
	if (releaseBtn) {
		releaseBtn.addEventListener('click', releasePokemon);
	}

	// Click outside modal to close
	window.addEventListener('click', (event) => {
		const modal = document.getElementById('pokemonModal');
		if (event.target === modal) {
			closeModal();
		}
	});

	document.getElementById("multiSelectToggle")
			.addEventListener("click", toggleMultiSelect);
	document.getElementById("releaseSelectedBtn")
			.addEventListener("click", releaseSelectedPokemon);
});

// Put pokemon in daycare (select as parent) or remove if already there
function putPokemonInDaycare() {
	if (pcState.viewingPokemonIndex === null) return;

	const daycare = getDaycare();
	const pcIndex = pcState.viewingPokemonIndex;
	
	// Check if this pokemon is already in daycare
	const isInDaycare = daycare.breeders[0] === pcIndex || daycare.breeders[1] === pcIndex;
	
	if (isInDaycare) {
		// Remove from daycare
		if (daycare.breeders[0] === pcIndex) {
			setDaycareBreeders(null, daycare.breeders[1]);
		} else {
			setDaycareBreeders(daycare.breeders[0], null);
		}
	} else {
		// Add to daycare
		const parent1Filled = daycare.breeders[0] !== null;
		const parent2Filled = daycare.breeders[1] !== null;

		// If both slots filled, ask which one to replace
		if (parent1Filled && parent2Filled) {
			const choice = confirm('Both parent slots are filled.\n\nOK = Replace Parent 1\nCancel = Replace Parent 2');
			if (choice) {
				setDaycareBreeders(pcIndex, daycare.breeders[1]);
			} else {
				setDaycareBreeders(daycare.breeders[0], pcIndex);
			}
		} else if (parent1Filled) {
			// Fill parent 2
			setDaycareBreeders(daycare.breeders[0], pcIndex);
		} else {
			// Fill parent 1
			setDaycareBreeders(pcIndex, daycare.breeders[1]);
		}
	}

	// Update UI
	renderPCGrid();
	closeModal();
}

// Release a Pokemon (remove from PC slot, leave null)
function releasePokemon() {
	if (pcState.viewingPokemonIndex === null) return;

	const pcIndex = pcState.viewingPokemonIndex;
	const pc = getPC();
	const pokemon = pc[pcIndex];

	if (!pokemon) return;

	const daycare = getDaycare();
	if (daycare.breeders[0] === pcIndex || daycare.breeders[1] === pcIndex) {
		alert('Cannot release a Pokemon that is in the daycare. Remove it from daycare first.');
		return;
	}

	const confirmRelease = confirm('Release this Pokemon? This cannot be undone.');
	if (!confirmRelease) return;

	// Clear PC slot (leave null)
	pc[pcIndex] = null;
	saveGameData();

	pcState.viewingPokemonIndex = null;
	renderPCGrid();
	closeModal();
}
