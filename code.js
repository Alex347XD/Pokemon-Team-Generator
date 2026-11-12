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
let gamesData = null;

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
    const response = await fetch('Pokedex.csv', { cache: 'no-store' });
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

async function loadGames() {
  try {
    const response = await fetch('games.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load games.json');
    gamesData = await response.json();

    Object.keys(gamesData).forEach(function (key) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = gamesData[key].label;
      gameSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Could not load game list', err);
  }
}

gameSelect.addEventListener('change', function () {
  const value = gameSelect.value;

  if (value === 'all') {
    allowedIds = null;
  } else if (gamesData && gamesData[value]) {
    allowedIds = new Set(gamesData[value].ids);
  } else {
    allowedIds = null;
  }

  resetPokemon();
  renderAvailable();
});

loadGames();
loadPokemon();
