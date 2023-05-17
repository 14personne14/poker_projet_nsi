const proba = require('./proba/src/index.js');
const JeuCartes = require('./card');

function get_valeurs_cartes(cartes) {
	/**
	 * Renvoie la valeur d'une liste de carte et pourquoi c'est cette valeur.
	 *
	 * [entrée] cartes: La liste des cartes (list)
	 * [sortie] Object
	 */

	var cartes_parsed = [];
	for (var carte of cartes) {
		cartes_parsed.push(carte.parsed);
	}
	var valeur = proba.handval(cartes_parsed);
	var nom_main = proba.handname(valeur);

	return { valeur: valeur, nom: nom_main };
}

function get_proba(cartes, nb_joueurs) {
	/**
	 * Renvoie la probabilité du joueur de gagner avec les cartes et le nombre de joueur.
	 *
	 * [entrée]    cartes: Liste des cartes du joueur (list)
	 * 			nb_joueur: Le nombre de joueur (number)
	 * [sortie] Number
	 */

	var cartes_parsed = [];
	for (var carte of cartes) {
		cartes_parsed.push(carte.parsed);
	}

	return proba.hs(cartes_parsed, nb_joueurs);
}

function who_is_winner(liste_joueurs, cartes_communes) {
	/**
	 * Renvoie le winner du en fonction de la liste des joueurs et leurs cartes et les cartes communes.
	 *
	 * [entrée]   liste_joueurs: La liste des joueurs avec leur username et leurs cartes (list)
	 * 			cartes_communes: Les cartes communes aux joueurs (list)
	 * [sortie] Object (l'username du winner et comment il gagne)
	 */

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
	console.log('init max:', valeur_max);
	for (var i = 1; i < liste_valeur_joueurs.length; i++) {
		console.log('val j:', liste_valeur_joueurs[i].valeur);
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
		var joueurs_egaux = [];
		for (var i of indice) {
			joueurs_egaux.push(liste_valeur_joueurs[i].username);
		}
		return {
			type: 'egalite',
			joueurs_usernames: joueurs_egaux,
			why_victoire: liste_valeur_joueurs[indice[0]].nom,
		};
	} else {
		return {
			type: 'normal',
			joueur_username: liste_valeur_joueurs[indice[0]].username,
			why_victoire: liste_valeur_joueurs[indice[0]].nom,
		};
	}
}

var j = new JeuCartes();
j.melanger();
// console.log(get_valeurs_cartes(j.pioche(7)));
// console.log(get_proba(j.pioche(2), 2));
var joueur = [
	{ username: 'aaaaa', cartes: j.pioche(2) },
	{ username: 'bbbbb', cartes: j.pioche(2) },
];
var cartes_communes = j.pioche(5);
for (var p of joueur) {
	console.log('\n' + p.username);
	for (var c of p.cartes) {
		console.log(c.text);
	}
}
console.log('\ncartes comm');
for (var c of cartes_communes) {
	console.log(c.text);
}
console.log();
console.log(who_is_winner(joueur, cartes_communes));

module.exports = {
	who_is_winner: who_is_winner,
	get_proba: get_proba,
};
