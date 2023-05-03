class Card {
	constructor(symbole, numero, valeur) {
		this.symbole = symbole;
		this.numero = numero;
        this.valeur = valeur;
	}

	get_url(graphic = 'classic') {
		return `public/images/cards/${graphic}/${this.numero}_${this.symbole}.svg`;
	}
}


class JeuCartes {
	constructor() {
		this.cartes = [];
		this.symboles = ['carreau', 'pique', 'trefle', 'coeur'];
		this.numeros = [['A', 13], ['2', 1], ['3', 2], ['4', 3], ['5', 4], ['6', 5], ['7', 6], ['8', 7], ['9', 8], ['10', 9] , ['V', 10], ['D', 11], ['R', 12]];
		this.nombre_cartes = 0;
		for (var symbole of this.symboles) {
			for (var numero of this.numeros) {
				this.cartes.push(new Card(symbole, numero[0], numero[1]));
				this.nombre_cartes++;
			}
		}
	}

	melanger() {
		/**
		 * Mélange le jeu de carte
		 *
		 * [entree] xxx
		 * [sortie] xxx
		 */
		for (var i = this.cartes.length - 1; i > 0; i--) {
			// Position aléa
			const j = Math.floor(Math.random() * (i + 1));
			// Echange les positions
			[this.cartes[i], this.cartes[j]] = [this.cartes[j], this.cartes[i]];
		}
	}

	pioche(nbr_cartes) {
		/**
		 * Supprime et renvoie un nombre de carte dans le jeu de cartes.
		 *
		 * [entree] nbr_cartes: le nombre de cartes à piocher (int)
		 * [sortie] List
		 */
		var cartes = [];
		for (var i = 0; i < nbr_cartes; i++) {
			cartes.push(this.cartes.shift());
		}
		return cartes;
	}
}

module.exports = JeuCartes;
