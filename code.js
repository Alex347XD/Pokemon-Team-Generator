
var pokeList = getColumn("Pokédex", "name");
var pokeImages = getColumn("Pokédex", "image_url");

var availablePokemon = [];

function resetPokemon() {
  availablePokemon = [];

  for (var i = 0; i < pokeList.length; i++) {
    appendItem(availablePokemon, {
      name: pokeList[i],
      image: pokeImages[i]
    });
  }
}

resetPokemon();
updateScreen();

function updateScreen() {
  var names = [];

  for (var i = 0; i < availablePokemon.length; i++) {
    appendItem(names, availablePokemon[i].name);
  }

  setProperty("peopleLabel", "text", names.join("\n"));
}

onEvent("randomAssignButton", "click", function() {
  if (availablePokemon.length >= 6) {

    var selectedPokemon = [];

    for (var i = 0; i < 6; i++) {
      var randomIndex = randomNumber(0, availablePokemon.length - 1);

      appendItem(selectedPokemon, availablePokemon[randomIndex]);

      removeItem(availablePokemon, randomIndex);
    }

    setProperty(
      "pairLabel",
      "text",
      selectedPokemon[0].name + ", " +
      selectedPokemon[1].name + ", " +
      selectedPokemon[2].name + ", " +
      selectedPokemon[3].name + ", " +
      selectedPokemon[4].name + ", and " +
      selectedPokemon[5].name
    );

    for (var i = 0; i < 6; i++) {
      setImageURL("image" + (i + 1), selectedPokemon[i].image);
    }

  } else {
    setProperty("pairLabel", "text", "Not enough Pokémon remaining!");
    resetPokemon();
  }

  updateScreen();
});
