class Card {
    constructor({ symbole, numero }) {
        this.symbole = symbole;
        this.numero = numero;
    }

    get_url(graphic = 'classic') {
        return `public/images/cards/${graphic}/${this.numero}_${this.symbole}.svg`;
    }
}

/*
class JeuCartes {
  constructor({ title, ean13 }) {
    this.title = title;
    this.ean13 = ean13;
  }
}
*/

