class Card {
	constructor(symbole, numero, valeur, num2) {
		this.symbole = symbole;
		this.numero = numero;
        this.valeur = valeur;
        this.num2 = num2;
	}

	get_url(graphic = 'classic') {
		return `public/images/cards/${graphic}/${this.numero}_${this.symbole}.svg`;
	}
}


class JeuCartes {
	constructor() {
		this.cartes = [];
		this.symboles = [['carreau','d'], ['pique', 's'], ['trefle', 'c'], ['coeur', 'h']];               
		this.numeros = [['A', 'A'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', 'T'] , ['V', 'J'], ['D', 'Q'], ['R', 'K']];
		this.nombre_cartes = 0;
		for (var symbole of this.symboles) {
			for (var numero of this.numeros) {
				this.cartes.push(new Card(symbole[0], numero[0], symbole[1], numero[1]));
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
