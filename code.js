// Pokémon Team Generator
// Data is loaded from Pokedex.csv

let allPokemon = [];
let availablePokemon = [];

const peopleLabel = document.getElementById('peopleLabel');
const pairLabel = document.getElementById('pairLabel');
const randomAssignButton = document.getElementById('randomAssignButton');
const gameSelect = document.getElementById('gameSelect');

function parseCSV(text) {
  // Strip a leading BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(function (r) {
    return !(r.length === 1 && r[0] === '');
  });
}

let allowedIds = null; // null = all Pokémon
const gameCache = {};

// DLC version groups folded into their base game
const DLC_PARENT = {
  'the-isle-of-armor': 'sword-shield',
  'the-crown-tundra': 'sword-shield',
  'the-teal-mask': 'scarlet-violet',
  'the-indigo-disk': 'scarlet-violet',
  'mega-dimension': 'legends-za'
};

function resetPokemon() {
  availablePokemon = allPokemon
    .filter(function (p) {
      return !allowedIds || allowedIds.has(p.id);
    })
    .map(function (p) {
      return { id: p.id, name: p.name, image: p.image };
    });
}

function renderAvailable() {
  peopleLabel.value = availablePokemon.map(function (p) {
    return p.name;
  }).join('\n');
}

async function loadPokemon() {
  try {
    const response = await fetch('Pokedex.csv');
    if (!response.ok) {
      throw new Error('Failed to load Pokedex.csv (' + response.status + ')');
    }
    const text = await response.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      throw new Error('Pokedex.csv is empty');
    }

    const headers = rows[0].map(function (h) {
      return h.trim();
    });
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const imageIndex = headers.indexOf('image_url');

    if (idIndex === -1 || nameIndex === -1 || imageIndex === -1) {
      throw new Error('Pokedex.csv must contain "id", "name" and "image_url" columns');
    }

    allPokemon = rows.slice(1).map(function (r) {
      return {
        id: parseInt((r[idIndex] || '').trim(), 10),
        name: (r[nameIndex] || '').trim(),
        image: (r[imageIndex] || '').trim()
      };
    }).filter(function (p) {
      return p.name.length > 0 && !isNaN(p.id);
    });

    resetPokemon();
    renderAvailable();
  } catch (err) {
    peopleLabel.value = 'Could not load Pokémon data.\n' + err.message;
    console.error(err);
  }
}

randomAssignButton.addEventListener('click', function () {
  if (availablePokemon.length >= 6) {
    const selected = [];
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * availablePokemon.length);
      selected.push(availablePokemon[randomIndex]);
      availablePokemon.splice(randomIndex, 1);
    }

    const names = selected.map(function (p) {
      return p.name;
    });
    const last = names.pop();
    pairLabel.textContent = names.join(', ') + ', and ' + last;

    for (let i = 0; i < 6; i++) {
      const img = document.getElementById('image' + (i + 1));
      img.src = selected[i].image;
      img.alt = selected[i].name;
    }

    // Reset the pool after every press so each team is drawn from all Pokémon
    resetPokemon();
  } else {
    pairLabel.textContent = 'Not enough Pokémon remaining!';
    resetPokemon();
  }

  renderAvailable();
});

function prettyGameName(name) {
  return name.split('-').map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

async function loadGames() {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/version-group?limit=100');
    if (!response.ok) return;
    const data = await response.json();
    (data.results || []).forEach(function (vg) {
      // Skip DLC-only entries; they are merged into their base game
      if (DLC_PARENT[vg.name]) return;
      const option = document.createElement('option');
      option.value = vg.name;
      option.textContent = prettyGameName(vg.name);
      gameSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Could not load game list', err);
  }
}

gameSelect.addEventListener('change', async function () {
  const value = gameSelect.value;
  peopleLabel.value = 'Loading Pokémon...';
  randomAssignButton.disabled = true;

  try {
    if (value === 'all') {
      allowedIds = null;
    } else {
      if (!gameCache[value]) {
        // Base game plus any DLC version groups that belong to it
        const groupNames = [value].concat(Object.keys(DLC_PARENT).filter(function (k) {
          return DLC_PARENT[k] === value;
        }));
        const ids = new Set();
        for (const gName of groupNames) {
          const vgResponse = await fetch('https://pokeapi.co/api/v2/version-group/' + gName);
          if (!vgResponse.ok) continue;
          const vg = await vgResponse.json();
          for (const pd of (vg.pokedexes || [])) {
            const pdResponse = await fetch(pd.url);
            if (!pdResponse.ok) continue;
            const pokedex = await pdResponse.json();
            (pokedex.pokemon_entries || []).forEach(function (entry) {
              const match = (entry.pokemon_species && entry.pokemon_species.url || '').match(/\/(\d+)\/?$/);
              if (match) ids.add(parseInt(match[1], 10));
            });
          }
        }
        gameCache[value] = ids;
      }
      allowedIds = gameCache[value];
    }
  } catch (err) {
    console.error(err);
    allowedIds = null;
  }

  resetPokemon();
  renderAvailable();
  randomAssignButton.disabled = false;
});

loadGames();
loadPokemon();
