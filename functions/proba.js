const proba = require('./proba/src/index.js');

/**
 * Renvoie la valeur d'une liste de carte et pourquoi c'est cette valeur.
 * @param {Array} cartes La liste des cartes
 * @returns {Object}
 */
function get_valeurs_cartes(cartes) {
	var cartes_parsed = [];
	for (var carte of cartes) {
		cartes_parsed.push(carte.parsed);
	}
	var valeur = proba.handval(cartes_parsed);
	var nom_main = proba.handname(valeur);

	return { valeur: valeur, nom: nom_main };
}

/**
 * Calcule la probabilité du joueur de gagner avec les cartes et le nombre de joueur.
 * @param {Array} cartes Liste des cartes du joueur
 * @param {Array} cartes_communes Liste des cartes du jeu communes aux joueurs
 * @param {Number} nb_joueurs Le nombre de joueur
 * @returns {Number}
 */
function get_proba(cartes, cartes_communes, nb_joueurs) {
	var cartes_parsed = [];

	for (var carte of cartes) {
		cartes_parsed.push(carte.parsed);
	}

	if (cartes_communes.length == 0) {
		return Math.round(proba.hs(cartes_parsed, nb_joueurs) * 10000) / 100;
	} else {
		var cartes_communes_parsed = [];
		for (var carte of cartes_communes) {
			cartes_communes_parsed.push(carte.parsed);
		}
		return Math.round(proba.hs(cartes_parsed, nb_joueurs, cartes_communes_parsed) * 10000) / 100;
	}
}

/**
 * Renvoie le winner du en fonction de la liste des joueurs et leurs cartes et les cartes communes.
 * @param {Array} liste_joueurs La liste des joueurs avec leur username et leurs cartes
 * @param {Array} cartes_communes Les cartes communes aux joueurs
 * @returns {Object} l'username du winner et comment il gagne
 */
function who_is_winner(liste_joueurs, cartes_communes) {
	// Genere liste avec valeurs
	var liste_valeur_joueurs = [];
	for (var joueur of liste_joueurs) {
		var obj = get_valeurs_cartes(joueur.cartes.concat(cartes_communes));
		liste_valeur_joueurs.push({
			username: joueur.username,
			valeur: obj.valeur,
			nom: obj.nom,
		});
	}

	// Trouve le ou les meilleurs joueurs
	var valeur_max = liste_valeur_joueurs[0].valeur;
	var indice = [0];
	for (var i = 1; i < liste_valeur_joueurs.length; i++) {
		// Egalité parfaite
		if (liste_valeur_joueurs[i].valeur == valeur_max) {
			console.log('egality');
			indice.push(i);
		}
		// Cas normal
		else if (liste_valeur_joueurs[i].valeur < valeur_max) {
			console.log('more');
			valeur_max = liste_valeur_joueurs[i].valeur;
			indice = [i];
		}
	}

	// Affiche le resultat
	if (indice.length > 1) {
		var username_joueurs_egaux = [];
		for (var i of indice) {
			username_joueurs_egaux.push(liste_valeur_joueurs[i].username);
		}
		return {
			type: 'egalite',
			liste_usernames: username_joueurs_egaux,
			liste_indices: indice,
			how_win: liste_valeur_joueurs[indice[0]].nom,
		};
	} else {
		return {
			type: 'normal',
			liste_usernames: [liste_valeur_joueurs[indice[0]].username],
			liste_indices: indice,
			how_win: liste_valeur_joueurs[indice[0]].nom,
		};
	}
}

module.exports = {
	who_is_winner: who_is_winner,
	get_proba: get_proba,
};
