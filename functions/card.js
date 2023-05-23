const proba = require('./proba/src/index.js');
const TEXT_CARD = {
	A: 'As',
	2: '2',
	3: '3',
	4: '4',
	5: '5',
	6: '6',
	7: '7',
	8: '8',
	9: '9',
	10: '10',
	V: 'Valet',
	D: 'Dame',
	R: 'Roi',
};

class Card {
	/**
	 * Créer une carte
	 * @param {String} symbole Le symbole de la carte en toutes lettres et en français
	 * @param {String} numero Le numero de la carte ou sa valeur en français
	 * @param {String} valeur La lettre de la carte en anglais
	 * @param {String} numero2 Le numero de la carte ou sa valeur en anglais
	 */
	constructor(symbole, numero, valeur, numero2) {
		this.symbole = symbole;
		this.numero = numero;
		this.valeur = valeur;
		this.numero2 = numero2;
		this.parsed = proba.parse(numero2 + valeur);
		this.text = TEXT_CARD[numero] + ' de ' + symbole;
	}

	/**
	 * Obtenir l'url de la carte
	 * @param {String} graphic Le type de carte à afficher ['classic', 'original', 'png']
	 * @returns {String} L'url de la carte
	 */
	get_url(graphic = 'png') {
		if (graphic == 'png') {
			return `public/images/cards/${graphic}/${this.numero}_${this.symbole}.png`;
		} else {
			return `public/images/cards/${graphic}/${this.numero}_${this.symbole}.svg`;
		}
	}
}

class JeuCartes {
	/**
	 * Créé un jeu de carte
	 */
	constructor() {
		this.cartes = [];
		this.symboles = [
			['carreau', 'd'],
			['pique', 's'],
			['trefle', 'c'],
			['coeur', 'h'],
		];
		this.numeros = [
			['A', 'A'],
			['2', '2'],
			['3', '3'],
			['4', '4'],
			['5', '5'],
			['6', '6'],
			['7', '7'],
			['8', '8'],
			['9', '9'],
			['10', 'T'],
			['V', 'J'],
			['D', 'Q'],
			['R', 'K'],
		];
		this.nombre_cartes = 0;
		for (var symbole of this.symboles) {
			for (var numero of this.numeros) {
				this.cartes.push(new Card(symbole[0], numero[0], symbole[1], numero[1]));
				this.nombre_cartes++;
			}
		}
	}

	/**
	 * Melanger le jeu de carte
	 */
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

	/**
	 * Supprime et renvoie un certain nombre de carte dans le jeu de cartes
	 * @param {Number} nbr_cartes Le nombre de cartes à piocher
	 * @returns {Array} La liste des cartes piochés
	 */
	pioche(nbr_cartes) {
		var cartes = [];
		for (var i = 0; i < nbr_cartes; i++) {
			cartes.push(this.cartes.shift());
		}
		return cartes;
	}
}

module.exports = JeuCartes;
