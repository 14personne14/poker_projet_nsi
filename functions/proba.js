class proba {
    constructor() {
        
		this.paire = 0;
		this.double_paire = 0;
		this.brelan = 0;
		this.quinte = 0;
		this.couleur = 0;
		this.full = 0;
		this.carre = 0;
		this.quinte_flush = 0;
		this.quinte_flush_royale = 0;
	}
}

function paire(probabilite, main, flop, turn, river, nb_cartes_talon) {
	if (main[0].numero == main[1].numero) {
		probabilite.paire = 100;
    }
    if (main[0].numero != main[1].numero) and(flop == []){
          
    }
}
