class Card {
	constructor(symbole, numero) {
		this.symbole = symbole;
		this.numero = numero;
	}

	get_url(graphic = 'classic') {
		return `public/images/cards/${graphic}/${this.numero}_${this.symbole}.svg`;
	}
}

class JeuCartes {
	constructor() {
		this.cartes = [];
		this.symboles = ['carreau', 'pique', 'trefle', 'coeur'];
		this.numeros = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
		for (var symbole of this.symboles) {
			for (var numero of this.numeros) {
				this.cartes.push(new Card(symbole, numero));
			}
		}
	}

	melanger() {
		for (var i = this.cartes.length - 1; i > 0; i--) {
			// Position aléa
			const j = Math.floor(Math.random() * (i + 1));
			// Echange les positions
			[this.cartes[i], this.cartes[j]] = [this.cartes[j], this.cartes[i]];
		}
	}
}

module.exports = JeuCartes;
