// ---------------------------- Modules ./node_modules ----------------------------

const express = require('express');
const sessions = require('express-session');
const http = require('http');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const colors = require('colors'); // (for color console)

// ---------------------------- My modules (functions) ----------------------------

const { verif_regex, encode_sha256, sleep, get_random_number } = require('./functions/functions');
const { log, log_discord } = require('./functions/log');
const JeuCartes = require('./functions/card');
const { who_is_winner, get_proba } = require('./functions/proba');
const { Database } = require('sqlite3');

// ---------------------------- Variables for server ----------------------------

const app = express();
const server = http.createServer(app);
/**
 * Le websocket du serveur
 * @type {WebSocket}
 */
const wss = new WebSocket.Server({
	server: server,
});
/**
 * La base de données
 * @type {Database}
 */
const database = new sqlite3.Database('./database/database.db'); // Connexion à la base de données

/**
 * Le port où démarre le serveur [default: 8103]
 * @type {Number}
 */
const port = 8103;

// ---------------------------- Variables constantes ----------------------------

/**
 * La regex qui vérifie l'username des joueurs (le nom d'utilisateur ne peux contenir que des lettres, des chiffres ou un tiret du bas)
 * @type {RegExp}
 */
const regex_username = /^[a-zA-Z0-9]+_?[a-zA-Z0-9]*$/;
/**
 * La regex qui vérifie le mot de passe des joueurs (le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule, un chiffre et un caractère spécial. Il doit aussi être entre 8 et 16 caractères)
 * @type {RegExp}
 */
const regex_password = /^[a-zA-Z0-9]+_?[a-zA-Z0-9]*$/; // /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-+]).{8,16}$/;

// ---------------------------- Variable true/false (for game) ----------------------------

/**
 * Si le Graph MISE doit être executé
 * @type {Boolean}
 */
var GRAFCET_MISE = false;

/**
 * Le numéro de l'étape en grafcet GLOBAL
 * @type {Number}
 */
var etape_global = 0;

/**
 * Le numéro de l'étape en grafcet MISE
 * @type {Number}
 */
var etape_mise = 0;

// ---------------------------- Constante (for game) ----------------------------

/**
 * Argent donner au joueur lorsqu'il s'inscrit
 */
const argent_inscription = 10000;

/**
 * Argent minimal requit pour jouer une partie
 * @type {Number}
 */
const argent_min_require = 1000;

/**
 * Valeurs de la petite et la grosse blind
 * @type {Object}
 */
const valeur_blind = { petite: 100, grosse: 200 };

/**
 * Temps d'attente entre chaque tour de boucle pour la fluidité et rapidité du jeu
 * @type {Number}
 */
const sleep_time = 100;

/**
 * Les temps d'attente du jeu en millisecondes
 * @type {Object}
 */
const sleep_time_game = {
	nouveau_tour: 2000,
	tirage_cartes: 5000,
	tirage_skip: 5000,
	end_tour: 10000,
	end: 60000,
};

/**
 * Durée du timer en millisecondes
 * @type {Number}
 */
const duree_timer = 60000;

/**
 * Nombre minimum de joueur
 * @type {Number}
 */
const nbr_joueur_min_require = 2;

/**
 * Nombre maximum de joueur
 * @type {Number}
 */
const nbr_joueur_max_require = 8;

// ---------------------------- Variable (for game) ----------------------------

/**
 * Liste des joueurs avec leurs informations associées
 * @type {Array}
 */
var PLAYERS = [];

/**
 * Le jeu de cartes
 * @type {JeuCartes}
 */
var jeu_cartes;

/**
 * Les cartes du centre de la table du jeu
 * @type {Array}
 */
var cartes_communes = [];

/**
 * Le nombre de joueur
 * @type {Number}
 */
var nbr_joueur = 0;

/**
 * Liste des joueurs qui ont commencés à miser (liste temporaire du jeu en cour)
 * @type {Array}
 */
var PLAYERS = [];

/**
 * Le choix du joueur
 * @type {Object}
 */
var player_choice = undefined;

/**
 * Argent total mit en jeu par les joueurs
 * @type {Number}
 */
var pot = 0;

/**
 * Argent minimum à mettre en jeu pour continuer de jouer
 * @type {Number}
 */
var mise_actuelle_requise = 0;

/**
 * L'indice du joueur qui commence à jouer en premier
 * @type {Number}
 */
var who_donneur;

/**
 * L'indice du joueur qui est en train de jouer
 * @type {Number}
 */
var who_playing;

/**
 * Si un joueur veut lancer le jeu
 * @type {Boolean}
 */
var try_start = false;

/**
 * Si une partie est cours
 * @type {Boolean}
 */
var partie_en_cours = false;

/**
 * Un timer
 * @type {Timer}
 */
var timer;

/**
 * Si le timer est terminé ou non
 * @type {Boolean}
 */
var timer_choix_end = false;

/**
 * Un timer pour le reset du jeu à la fin
 * @type {Timer}
 */
var timer_reset;

// ---------------------------- Fonction websocket ----------------------------

/**
 * Envoie un message à tous les joueurs de la liste PLAYERS sauf ceux de la liste except en websocket
 * @param {Object} data Les données à envoyer
 * @param {Array} except La liste des joueurs à ne pas envoyer
 */
function wss_send_joueur(data, except = []) {
	const wss_data = JSON.stringify(data);
	for (var joueur of PLAYERS) {
		if (joueur.ws != undefined && !except.includes(joueur.username)) {
			joueur.ws.send(wss_data);
		}
	}
}

/**
 * Envoie un message à tous les clients connectés en websocket avec le serveur
 * @param {Object} data Les données à envoyer
 */
function wss_send(data) {
	const wss_data = JSON.stringify(data);
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(wss_data);
		}
	});
}

// ---------------------------- Preparation ----------------------------

// Gère les fichiers du dossier "/public"
app.use(express.static(__dirname));

// Pour les données qui passent en POST
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);

// Pour les sessions des utilisateurs
var sessionParser = sessions({
	secret: 'ce-texte-doit-rester-un-secret',
	resave: true,
	saveUninitialized: true,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 10,
		sameSite: 'strict',
	},
});
app.use(sessionParser);

// Gère le language EJS
app.set('view engine', 'ejs');

/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

// ---------------------------- Function for Game ----------------------------

/**
 * Obtenir l'indice des deux joueurs pour la petite blind et la grosse blind et qui commence
 * @returns {Object}
 */
function get_indice_blind_and_start() {
	var grosse_blind_is_good = false;
	var petite_blind_is_good = false;
	var good_who_start = false;

	var indice_petite = who_donneur;
	while (!petite_blind_is_good) {
		indice_petite++;
		if (indice_petite > nbr_joueur - 1) {
			indice_petite = 0;
		}
		petite_blind_is_good = true;
		if (PLAYERS[indice_petite].out == true) {
			petite_blind_is_good = false;
		}
	}

	var indice_grosse = indice_petite;
	while (!grosse_blind_is_good) {
		indice_grosse++;
		if (indice_grosse > nbr_joueur - 1) {
			indice_grosse = 0;
		}
		grosse_blind_is_good = true;
		if (PLAYERS[indice_grosse].out == true) {
			grosse_blind_is_good = false;
		}
	}

	var indice_who_start = indice_grosse;
	while (!good_who_start) {
		indice_who_start++;
		if (indice_who_start > nbr_joueur - 1) {
			indice_who_start = 0;
		}
		good_who_start = true;
		if (PLAYERS[indice_who_start].out == true) {
			good_who_start = false;
		}
	}

	return { petite: indice_petite, grosse: indice_grosse, who_start: indice_who_start };
}

/**
 * Renvoie le nombre de joueur qui sont en train de jouer et qui ne sont pas out
 * @returns {Number} Le nombre de joueur
 */
function get_nbr_joueur_in_life() {
	var nbr_in_life = 0;
	for (var joueur of PLAYERS) {
		if (joueur.out == false) {
			nbr_in_life++;
		}
	}
	return nbr_in_life;
}

/**
 * Renvoie le nombre de joueur qui ont terminé de jouer, le nombre d'abandon, le nombre de 'out' et le nombre de joueur qui n'ont pas besoin de continuer de choisir pour jouer.
 * @returns {Object}
 */
function calc_status_player() {
	var nbr_end_player = 0;
	var nbr_abandon = 0;
	var nbr_out = 0;
	var nbr_no_re_choice = 0;

	for (var joueur of PLAYERS) {
		// out
		if (joueur.out == true || joueur.leave == true) {
			nbr_out++;
		} else {
			if (joueur.last_action == 'suivre' && joueur.argent_mise == mise_actuelle_requise) {
				// Suivre avec la bonne mise
				nbr_end_player++;
			}
			// Relance avec bonne valeur
			else if (joueur.last_action == 'relance' && joueur.argent_mise == mise_actuelle_requise) {
				nbr_end_player++;
			}
			// All-in
			else if (joueur.last_action == 'all-in') {
				nbr_end_player++;
				nbr_no_re_choice++;
			}
			// Abandon
			else if (joueur.last_action == 'abandon') {
				nbr_end_player++;
				nbr_no_re_choice++;
				nbr_abandon++;
			}
		}
	}

	return { nbr_end_player: nbr_end_player, nbr_abandon: nbr_abandon, nbr_no_re_choice: nbr_no_re_choice, nbr_out: nbr_out };
}

/**
 * Renvoie si l'étape mise doit continuer ou non.
 * @returns {Boolean}
 */
function end_of_mise() {
	var result = calc_status_player();
	if (result.nbr_end_player == nbr_joueur - result.nbr_out || result.nbr_abandon == nbr_joueur - 1 - result.nbr_out) {
		return true;
	}
	return false;
}

/**
 * Renvoie si il y a un winner determiné à ce moment. C'est à dire si ont peux skip une partie du jeu
 * @returns {Boolean}
 */
function end_of_global() {
	var result = calc_status_player();
	if (result.nbr_no_re_choice >= nbr_joueur - 1 - result.nbr_out) {
		return true;
	}
	return false;
}

/**
 * Renvoie si le jeu est terminé. C'est à dire si il ne reste plus que un seul joueur encore en 'vie'
 */
function end_of_game() {
	var result = calc_status_player();

	return result.nbr_out == nbr_joueur - 1;
}

// ---------------------------- ACTION GLOBAL ----------------------------

/**
 * Fonction principale du jeu (grafcet GLOBAL)
 */
async function action_global() {
	// Etape 0
	if (etape_global == 0) {
		partie_en_cours = false;
		who_donneur = get_random_number(0, nbr_joueur - 1);
	}
	// Etape 1
	if (etape_global == 1) {
		// Lance la partie
		partie_en_cours = true;

		// Créé et melange jeu de cartes
		jeu_cartes = new JeuCartes();
		jeu_cartes.melanger();

		// Reset
		cartes_communes = [];
		pot = 0;
		PLAYERS.forEach(function (part, indice) {
			this[indice].last_action = 'aucune';
			this[indice].argent_mise = 0;
			this[indice].nbr_relance = 0;
		}, PLAYERS);

		// Distribution des cartes
		for (var i = 0; i < nbr_joueur; i++) {
			PLAYERS[i].cartes = jeu_cartes.pioche(2);
		}

		// Change donneur
		var good_who_donneur = false;
		while (!good_who_donneur) {
			who_donneur++;
			if (who_donneur > nbr_joueur - 1) {
				who_donneur = 0;
			}
			good_who_donneur = true;
			if (PLAYERS[who_donneur].out == true) {
				good_who_donneur = false;
			}
		}

		// Prépare les blindes des joueurs
		var indice_info = get_indice_blind_and_start();
		who_playing = indice_info.who_start;
		// Grosse blind :
		PLAYERS[indice_info.petite].argent_restant -= valeur_blind.petite;
		PLAYERS[indice_info.petite].last_action = 'blind';
		PLAYERS[indice_info.petite].argent_mise = valeur_blind.petite;
		// Grande blind :
		PLAYERS[indice_info.grosse].argent_restant -= valeur_blind.grosse;
		PLAYERS[indice_info.grosse].last_action = 'blind';
		PLAYERS[indice_info.grosse].argent_mise = valeur_blind.grosse;
		// Ajoute les blind au pot et le minimum requit
		pot += valeur_blind.petite + valeur_blind.grosse;
		mise_actuelle_requise = valeur_blind.grosse;

		// Envoie des données aux joueurs
		for (var joueur of PLAYERS) {
			if (joueur.ws != undefined) {
				// Change type des cartes for send
				var cartes_joueur = [];
				for (var carte of joueur.cartes) {
					cartes_joueur.push({
						symbole: carte.symbole,
						numero: carte.numero,
						text: carte.text,
					});
				}
				var proba = get_proba(joueur.cartes, cartes_communes, get_nbr_joueur_in_life());

				// Envoie des données d'initialisation
				var data = JSON.stringify({
					type: 'init_game',
					mise_actuelle_requise: mise_actuelle_requise,
					petite_blind: {
						username: PLAYERS[indice_info.petite].username,
						argent: PLAYERS[indice_info.petite].argent_restant,
					},
					grosse_blind: {
						username: PLAYERS[indice_info.grosse].username,
						argent: PLAYERS[indice_info.grosse].argent_restant,
					},
					your_card: cartes_joueur,
					pot: pot,
					who_playing: PLAYERS[who_playing].username,
					message: 'nouveau tour',
					proba: proba,
				});
				joueur.ws.send(data);
			}
		}

		await sleep(sleep_time_game.nouveau_tour);

		// Lance le grafcet MISE
		GRAFCET_MISE = true;
	}
	// Etape 2
	// Etape 3
	// Etape 4
	else if (etape_global == 4) {
		// Carte du flop
		var cartes_flop = jeu_cartes.pioche(3);
		for (var carte of cartes_flop) {
			cartes_communes.push(carte);
		}

		// Reste PLAYERS
		PLAYERS.forEach(function (joueur, indice) {
			if (!(joueur.last_action == 'all-in' || joueur.last_action == 'abandon' || joueur.out == true)) {
				this[indice].last_action = 'aucune';
			}
		}, PLAYERS);

		// Change who_playing
		var good_who_start = false;
		who_start = who_donneur;
		while (!good_who_start) {
			who_start++;
			if (who_start > nbr_joueur - 1) {
				who_start = 0;
			}
			good_who_start = true;
			if (PLAYERS[who_start].out == true || PLAYERS[who_start].last_action == 'abandon' || PLAYERS[who_start].last_action == 'all-in') {
				good_who_start = false;
			}
		}
		who_playing = who_start;

		// Prepare send carte flop
		var cartes_flop_to_send = [];
		for (var carte of cartes_flop) {
			cartes_flop_to_send.push({
				symbole: carte.symbole,
				numero: carte.numero,
				text: carte.text,
			});
		}

		// Envoie des données aux joueurs
		for (var joueur of PLAYERS) {
			if (joueur.ws != undefined) {
				// Change type des cartes for send
				var cartes_joueur = [];
				for (var carte of joueur.cartes) {
					cartes_joueur.push({
						symbole: carte.symbole,
						numero: carte.numero,
						text: carte.text,
					});
				}
				var proba = get_proba(joueur.cartes, cartes_communes, get_nbr_joueur_in_life());

				data = JSON.stringify({
					type: 'game_next_part',
					mise_actuelle_requise: mise_actuelle_requise,
					cartes_new: cartes_flop_to_send,
					pot: pot,
					who_playing: PLAYERS[who_playing].username,
					message: 'tirage du flop',
					proba: proba,
				});
				joueur.ws.send(data);
			}
		}

		await sleep(sleep_time_game.tirage_cartes);

		// Lance le grafcet MISE
		GRAFCET_MISE = true;
	}
	// Etape 5
	// Etape 6
	// Etape 7
	else if (etape_global == 7) {
		// Carte turn
		var carte_turn = jeu_cartes.pioche(1)[0];
		cartes_communes.push(carte_turn);

		// Reste PLAYERS
		PLAYERS.forEach(function (joueur, indice) {
			if (!(joueur.last_action == 'all-in' || joueur.last_action == 'abandon' || joueur.out == true)) {
				this[indice].last_action = 'aucune';
			}
		}, PLAYERS);

		// Change who_playing
		var good_who_start = false;
		while (!good_who_start) {
			who_start++;
			if (who_start > nbr_joueur - 1) {
				who_start = 0;
			}
			good_who_start = true;
			if (PLAYERS[who_start].out == true || PLAYERS[who_start].last_action == 'abandon' || PLAYERS[who_start].last_action == 'all-in') {
				good_who_start = false;
			}
		}
		who_playing = who_start;

		// Prepare send carte flop
		var cartes_turn_to_send = [
			{
				symbole: carte_turn.symbole,
				numero: carte_turn.numero,
				text: carte_turn.text,
			},
		];

		// Envoie des données aux joueurs
		for (var joueur of PLAYERS) {
			if (joueur.ws != undefined) {
				// Change type des cartes for send
				var cartes_joueur = [];
				for (var carte of joueur.cartes) {
					cartes_joueur.push({
						symbole: carte.symbole,
						numero: carte.numero,
						text: carte.text,
					});
				}
				var proba = get_proba(joueur.cartes, cartes_communes, get_nbr_joueur_in_life());

				data = JSON.stringify({
					type: 'game_next_part',
					mise_actuelle_requise: mise_actuelle_requise,
					cartes_new: cartes_turn_to_send,
					pot: pot,
					who_playing: PLAYERS[who_playing].username,
					message: 'tirage du turn',
					proba: proba,
				});
				joueur.ws.send(data);
			}
		}

		await sleep(sleep_time_game.tirage_cartes);

		// Lance le grafcet MISE
		GRAFCET_MISE = true;
	}
	// Etape 8
	// Etape 9
	// Etape 10
	else if (etape_global == 10) {
		// Carte river
		var carte_river = jeu_cartes.pioche(1)[0];
		cartes_communes.push(carte_river);

		// Reste PLAYERS
		PLAYERS.forEach(function (joueur, indice) {
			if (!(joueur.last_action == 'all-in' || joueur.last_action == 'abandon' || joueur.out == true)) {
				this[indice].last_action = 'aucune';
			}
		}, PLAYERS);

		// Change who_playing
		var good_who_start = false;
		while (!good_who_start) {
			who_start++;
			if (who_start > nbr_joueur - 1) {
				who_start = 0;
			}
			good_who_start = true;
			if (PLAYERS[who_start].out == true || PLAYERS[who_start].last_action == 'abandon' || PLAYERS[who_start].last_action == 'all-in') {
				good_who_start = false;
			}
		}
		who_playing = who_start;

		// Prepare send carte flop
		var cartes_river_to_send = [
			{
				symbole: carte_river.symbole,
				numero: carte_river.numero,
				text: carte_river.numero,
			},
		];

		// Envoie des données aux joueurs
		for (var joueur of PLAYERS) {
			if (joueur.ws != undefined) {
				// Change type des cartes for send
				var cartes_joueur = [];
				for (var carte of joueur.cartes) {
					cartes_joueur.push({
						symbole: carte.symbole,
						numero: carte.numero,
						text: carte.text,
					});
				}
				var proba = get_proba(joueur.cartes, cartes_communes, get_nbr_joueur_in_life());

				data = JSON.stringify({
					type: 'game_next_part',
					mise_actuelle_requise: mise_actuelle_requise,
					cartes_new: cartes_river_to_send,
					pot: pot,
					who_playing: PLAYERS[who_playing].username,
					message: 'tirage de la river',
					proba: proba,
				});
				joueur.ws.send(data);
			}
		}

		await sleep(sleep_time_game.tirage_cartes);

		// Lance le grafcet MISE
		GRAFCET_MISE = true;
	}
	// Etape 11
	// Etape 121 (skip flop)
	else if (etape_global == 121) {
		if (!(calc_status_player().nbr_abandon == nbr_joueur - 1)) {
			// Carte du flop
			var cartes_flop = jeu_cartes.pioche(3);
			for (var carte of cartes_flop) {
				cartes_communes.push(carte);
			}
			// Prepare send carte flop
			var cartes_flop_to_send = [];
			for (var carte of cartes_flop) {
				cartes_flop_to_send.push({
					symbole: carte.symbole,
					numero: carte.numero,
					text: carte.text,
				});
			}
			// Send
			wss_send_joueur({
				type: 'new_cartes',
				cartes_new: cartes_flop_to_send,
				message: 'tirage du flop',
			});
			await sleep(sleep_time_game.tirage_skip);
		}
	}
	// Etape 122 (skip turn)
	else if (etape_global == 122) {
		if (!(calc_status_player().nbr_abandon == nbr_joueur - 1)) {
			// Carte turn
			var carte_turn = jeu_cartes.pioche(1)[0];
			cartes_communes.push(carte_turn);
			// Prepare send carte flop
			var cartes_turn_to_send = [
				{
					symbole: carte_turn.symbole,
					numero: carte_turn.numero,
					text: carte_turn.text,
				},
			];
			// Send
			wss_send_joueur({
				type: 'new_cartes',
				cartes_new: cartes_turn_to_send,
				message: 'tirage du turn',
			});
			await sleep(sleep_time_game.tirage_skip);
		}
	}
	// Etape 123 (skip river)
	else if (etape_global == 123) {
		if (!(calc_status_player().nbr_abandon == nbr_joueur - 1)) {
			// Carte river
			var carte_river = jeu_cartes.pioche(1)[0];
			cartes_communes.push(carte_river);
			// Prepare send carte flop
			var cartes_river_to_send = [
				{
					symbole: carte_river.symbole,
					numero: carte_river.numero,
					text: carte_river.text,
				},
			];
			// Send
			wss_send_joueur({
				type: 'new_cartes',
				cartes_new: cartes_river_to_send,
				message: 'tirage de la river',
			});
			await sleep(sleep_time_game.tirage_skip);
		}
	}
	// Etape 13 (end)
	else if (etape_global == 13) {
		if (!(calc_status_player().nbr_abandon == nbr_joueur - 1)) {
			// Prepare liste for function winner
			var liste_joueur_cartes = [];
			for (var i = 0; i < nbr_joueur; i++) {
				if (!(PLAYERS[i].last_action == 'abandon')) {
					liste_joueur_cartes.push({
						username: PLAYERS[i].username,
						cartes: PLAYERS[i].cartes,
					});
				}
			}
			var winner_infos = who_is_winner(liste_joueur_cartes, cartes_communes);

			// Ajoute pot aux winners
			var text_message_winner = '';
			var nbr_winner = winner_infos.liste_indices.length;
			if (nbr_winner > 1) {
				text_message_winner += 'gagnants:';
			} else {
				text_message_winner += 'gagnant:';
			}
			for (var indice of winner_infos.liste_indices) {
				PLAYERS[indice].argent_restant += pot / nbr_winner;
				text_message_winner += ` ${PLAYERS[indice].username}`;
			}

			// Send winner
			wss_send_joueur({
				type: 'winner',
				liste_usernames: winner_infos.liste_usernames,
				how_win: winner_infos.how_win,
				message: text_message_winner,
			});
		} else {
			var winner_username;
			var winner_indice;
			for (var i = 0; i < nbr_joueur; i++) {
				if (!(PLAYERS[i].last_action == 'abandon')) {
					winner_username = PLAYERS[i].username;
					winner_indice = i;
				}
			}

			PLAYERS[winner_indice].argent_restant += pot;

			// Send winner
			wss_send_joueur({
				type: 'winner',
				liste_usernames: winner_username,
				how_win: 'last survival',
				message: `gagnant: ${winner_username}`,
			});
		}

		await sleep(sleep_time_game.end_tour);

		// Send updated argent_restant &&&& Delete out players
		data = {
			type: 'update_argent_restant',
			liste_joueurs: [],
		};
		for (var i = 0; i < nbr_joueur; i++) {
			if (PLAYERS[i].argent_restant == 0) {
				PLAYERS[i].out = true;
			}
			data.liste_joueurs.push({
				username: PLAYERS[i].username,
				argent_restant: PLAYERS[i].argent_restant,
				out: PLAYERS[i].out,
			});
		}
		wss_send_joueur(data);
	}
	// Etape 14
	// Etape 15
	else if (etape_global == 15) {
		// Reset timer
		clearTimeout(timer_reset);
		timer_reset_end = false;

		// Send winner
		wss_send_joueur({
			type: 'restart_global',
		});
	}
	// Etape 16 (END & reset)
	else if (etape_global == 16) {
		// Log
		var text_discord_log = '**New game finished**';
		for (var joueur of PLAYERS) {
			text_discord_log += `\n:white_medium_small_square: \`${joueur.username}:\` ${joueur.argent_restant}`;
		}
		log_discord(`${text_discord_log}`, 'game');

		// Requete database pour chaque joueur
		for (var joueur of PLAYERS) {
			database.all(
				`UPDATE players SET argent = ${joueur.argent + joueur.argent_restant} WHERE username = '${joueur.username}'; `,
				(err, rows) => {
					// Erreur
					if (err) {
						log('database', err, 'erreur');
						log_discord(err, 'erreur');
					}
				}
			);
		}

		await sleep(sleep_time_game.end);
	}
}

// ---------------------------- TRANSITION GLOBAL ----------------------------

/**
 * Fonction des transition de la fonction action_global() (grafcet GLOBAL)
 */
async function transition_global() {
	// Etape 0 -> Etape 1
	if (etape_global == 0 && try_start == true && nbr_joueur >= nbr_joueur_min_require && nbr_joueur <= nbr_joueur_max_require) {
		etape_global = 1;
		log('Game', 'Init Game', 'game');
		log_discord(`Game Start`, 'game');
	}
	// Etape 1 -> Etape 2
	else if (etape_global == 1) {
		etape_global = 2;
	}
	// Etape 2 -> Etape 3
	else if (etape_global == 2 && GRAFCET_MISE == false) {
		etape_global = 3;
	}
	// Etape 3 -> Etape 4
	else if (etape_global == 3 && end_of_global() == false) {
		etape_global = 4;
		log('Game', 'Continue by flop', 'game');
	}
	// Etape 3 -> Etape 121
	else if (etape_global == 3 && end_of_global() == true) {
		etape_global = 121;
		log('Game', 'Skip to end (flop, turn river)', 'game');
	}
	// Etape 4 -> Etape 5
	else if (etape_global == 4) {
		etape_global = 5;
	}
	// Etape 5 -> Etape 6
	else if (etape_global == 5 && GRAFCET_MISE == false) {
		etape_global = 6;
	}
	// Etape 6 -> Etape 7
	else if (etape_global == 6 && end_of_global() == false) {
		etape_global = 7;
		log('Game', 'Continue by turn', 'game');
	}
	// Etape 6 -> Etape 122
	else if (etape_global == 6 && end_of_global() == true) {
		etape_global = 122;
		log('Game', 'Skip to end (turn, river)', 'game');
	}
	// Etape 7 -> Etape 8
	else if (etape_global == 7) {
		etape_global = 8;
	}
	// Etape 8 -> Etape 9
	else if (etape_global == 8 && GRAFCET_MISE == false) {
		etape_global = 9;
	}
	// Etape 9 -> Etape 10
	else if (etape_global == 9 && end_of_global() == false) {
		etape_global = 10;
		log('Game', 'Continue by river', 'game');
	}
	// Etape 9 -> Etape 123
	else if (etape_global == 9 && end_of_global() == true) {
		etape_global = 123;
		log('Game', 'Skip to end (river)', 'game');
	}
	// Etape 10 -> Etape 11
	else if (etape_global == 10) {
		etape_global = 11;
	}
	// Etape 11 -> Etape 13
	else if (etape_global == 11 && GRAFCET_MISE == false) {
		etape_global = 13;
	}
	// Etape 121 -> Etape 122
	else if (etape_global == 121) {
		etape_global = 122;
	}
	// Etape 122 -> Etape 123
	else if (etape_global == 122) {
		etape_global = 123;
	}
	// Etape 123 -> Etape 13
	else if (etape_global == 123) {
		etape_global = 13;
	}
	// Etape 13 -> Etape 14
	else if (etape_global == 13) {
		etape_global = 14;
	}
	// Etape 14 -> Etape 15
	else if (etape_global == 14) {
		etape_global = 15;
	}
	// Etape 15 -> Etape 16
	else if (etape_global == 15 && end_of_game() == true) {
		etape_global = 16;
		log('Game', 'GAME END | Do request database', 'game');
	}
	// Etape 15 -> Etape 1
	else if (etape_global == 15 && end_of_game() == false) {
		etape_global = 1;
	}
	// Etape 16 -> Etape 0
	else if (etape_global == 16) {
		etape_global = 0;
	}
	// Variable reset
	try_start = false;
}

// ---------------------------- ACTION MISE ----------------------------

/**
 * Fonction principale de la partie mise du jeu (grafcet MISE)
 */
async function action_mise() {
	// Etape 0
	// Etape 1
	if (etape_mise == 1) {
		// Send le nouveau joueur
		wss_send_joueur({
			type: 'next_player',
			next_player: PLAYERS[who_playing].username,
		});

		// Démarre le timer
		timer = setTimeout(() => {
			timer_choix_end = true;
		}, duree_timer);
	}
	// Etape 3
	else if (etape_mise == 3) {
		// Reset timer
		clearTimeout(timer);

		var action_to_send;

		// Joueur a fait un choix
		if (player_choice != undefined) {
			PLAYERS[who_playing].last_action = player_choice.action;
			// Change en fonction de l'action du joueur :
			// Suivre
			if (player_choice.action == 'suivre') {
				var value_to_pay = mise_actuelle_requise - PLAYERS[who_playing].argent_mise;

				// Update
				PLAYERS[who_playing].argent_mise += value_to_pay;
				PLAYERS[who_playing].argent_restant -= value_to_pay;
				pot += value_to_pay;
				action_to_send = 'suit';
			}
			// Relance
			else if (player_choice.action == 'relance') {
				var value_to_pay = player_choice.value_relance + (mise_actuelle_requise - PLAYERS[who_playing].argent_mise);

				// Update
				PLAYERS[who_playing].argent_mise += value_to_pay;
				PLAYERS[who_playing].argent_restant -= value_to_pay;
				PLAYERS[who_playing].nbr_relance++;
				pot += value_to_pay;
				mise_actuelle_requise = PLAYERS[who_playing].argent_mise;
				action_to_send = 'relance de';
			}
			// All-in
			else if (player_choice.action == 'all-in') {
				var value_to_pay = PLAYERS[who_playing].argent_restant;

				// Update
				PLAYERS[who_playing].argent_mise += value_to_pay;
				PLAYERS[who_playing].argent_restant = 0;
				console.log(`\n\n\n\n\n\n\n\n\n${pot}\n${value_to_pay}\n\n\n\n\n\n\n`);
				pot += value_to_pay;
				console.log(`\n\n\n\n\n\n\n\n\n${pot}\n\n\n\n\n\n\n\n`);
				action_to_send = 'all-in';
				// Update mise_actuelle_requise si besoin
				if (PLAYERS[who_playing].argent_mise > mise_actuelle_requise) {
					mise_actuelle_requise = PLAYERS[who_playing].argent_mise;
				}
			}
			// Abandon
			else if (player_choice.action == 'abandon') {
				PLAYERS[who_playing].last_action = 'abandon';
				action_to_send = 'abandonne';
			}
		}
		// Joueur attend timer
		else {
			// Fait abandonner automatiquement le joueur
			PLAYERS[who_playing].last_action = 'abandon';
			action_to_send = 'abandonne';
		}

		// Envoie des données aux joueurs
		if (PLAYERS[who_playing].last_action == 'relance') {
			wss_send_joueur({
				type: 'player_choice',
				username: PLAYERS[who_playing].username,
				action: `relance ${player_choice.value_relance}`,
				argent_left: PLAYERS[who_playing].argent_restant,
				pot: pot,
				mise: mise_actuelle_requise,
				message: `${PLAYERS[who_playing].username} ${action_to_send} ${player_choice.value_relance}`,
			});
		} else {
			wss_send_joueur({
				type: 'player_choice',
				username: PLAYERS[who_playing].username,
				action: PLAYERS[who_playing].last_action,
				argent_left: PLAYERS[who_playing].argent_restant,
				pot: pot,
				mise: mise_actuelle_requise,
				message: `${PLAYERS[who_playing].username} ${action_to_send}`,
			});
		}

		// Change le main joueur (after send)
		if (end_of_mise() == false) {
			var good_next_player = false;
			while (good_next_player == false) {
				// Change player
				who_playing += 1;
				if (who_playing > nbr_joueur - 1) {
					who_playing = 0;
				}
				// Verifie si player ok
				if (
					PLAYERS[who_playing].out == false &&
					!(
						((PLAYERS[who_playing].last_action == 'suivre' || PLAYERS[who_playing].last_action == 'relance') &&
							PLAYERS[who_playing].argent_mise == mise_actuelle_requise) ||
						PLAYERS[who_playing].last_action == 'all-in' ||
						PLAYERS[who_playing].last_action == 'abandon'
					)
				) {
					good_next_player = true;
				}
			}
		}

		// Reset timer 2 & player_choice
		timer_choix_end = false;
		player_choice = undefined;
	}
	// Etape 4
	else if (etape_mise == 4) {
		GRAFCET_MISE = false;
	}
}

// ---------------------------- TRANSITION MISE ----------------------------

/**
 * Fonction des transition de la fonction action_mise() (grafcet MISE)
 */
async function transition_mise() {
	// Etape 0 -> Etape 1
	if (etape_mise == 0 && GRAFCET_MISE == true) {
		console.log(` ___________________ \n|                   |\n|--- Start MISE  ---|\n| \n| Joueur ${PLAYERS[who_playing].username}`);
		etape_mise = 1;
	}
	// Etape 1 -> Etape 2
	else if (etape_mise == 1) {
		console.log('| En attente du joueur...');
		etape_mise = 2;
	}
	// Etape 2 -> Etape 3
	else if (etape_mise == 2 && (player_choice != undefined || timer_choix_end == true)) {
		console.log('| Réponse recu !');
		etape_mise = 3;
	}
	// Etape 3 -> Etape 4
	else if (etape_mise == 3 && end_of_mise() == true) {
		console.log('| \n|--- End of MISE ---|\n|___________________|');
		etape_mise = 4;
	}
	// Etape 3 -> Etape 1 (boucle)
	else if (etape_mise == 3 && end_of_mise() == false) {
		console.log(`| \n| Joueur ${PLAYERS[who_playing].username}`);
		etape_mise = 1;
	}
	// Etape 4 -> Etape 0
	else if (etape_mise == 4) {
		etape_mise = 0;
	}
}

// ---------------------------- Function infini ----------------------------

/**
 * Fonction infini du jeu des mise (grafcet MISE)
 */
async function mise() {
	while (true) {
		await action_mise();
		await transition_mise();
		await sleep(sleep_time);
	}
}
/**
 * Fonction infini du jeu (grafcet GLOBAL)
 */
async function global() {
	while (true) {
		await action_global();
		await transition_global();
		await sleep(sleep_time);
	}
}

// Demarre grafcet GLOBAL
global();
// Demarre grafcet MISE
mise();

/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

// ---------------------------- Websocket ----------------------------

wss.on('connection', (ws, req) => {
	// Recupere session
	sessionParser(req, {}, function () {
		var argent_mit_en_jeu = req.session.argent_mit_en_jeu;
		var argent = req.session.argent;
		var username = req.session.username;

		log('Game', `Nouveau joueur -> ${username}`, 'game');

		PLAYERS.push({
			// Genéral
			username: username,
			argent: argent,
			ws: ws,

			// For game entiere
			argent_mit_en_jeu: Number(argent_mit_en_jeu),
			argent_restant: Number(argent_mit_en_jeu),
			nbr_win: 0,
			out: false,
			leave: false,

			// For tour
			last_action: 'aucune',
			argent_mise: 0,
			nbr_relance: 0,
		});
		nbr_joueur = PLAYERS.length;

		// Prepare init list of players
		var data = {
			type: 'liste_player',
			liste: [],
		};
		for (var joueur of PLAYERS) {
			data.liste.push({
				username: joueur.username,
				argent_restant: joueur.argent_mit_en_jeu,
			});
		}
		ws.send(JSON.stringify(data));

		// Send new player
		wss_send_joueur(
			{
				type: 'new_player',
				username: username,
				argent_restant: argent_mit_en_jeu,
			},
			[username]
		);
	});

	// Message acceuil
	const data = JSON.stringify({
		type: 'connected',
		message: `Bienvenue, vous êtes connecté en websocket avec le serveur.`,
	});
	ws.send(data);

	// On message
	ws.on('message', (message_encode) => {
		// Recupère le message
		const message = JSON.parse(message_encode);
		// console.log(message); // debug

		// Type start
		if (message.type == 'start') {
			try_start = true;
		}
	});

	// Quand le joueur quitte le jeu
	ws.on('close', () => {
		for (var i = 0; i < nbr_joueur; i++) {
			// Si il est inscrit
			if (PLAYERS[i].username == req.session.username) {
				if (partie_en_cours == true) {
					log('Game', `Delete joueur in-game -> ${req.session.username}`);

					PLAYERS[i].ws = undefined;
					PLAYERS[i].out = true;
					PLAYERS[i].leave = true;
				} else {
					PLAYERS.splice(i, 1);
					nbr_joueur = PLAYERS.length;

					wss_send_joueur({
						type: 'delete_player',
						username: req.session.username,
					});
				}
			}
		}
	});
});

/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

// ---------------------------- Serveur POST data ----------------------------

// Verifie le choix du joueur
app.post('/choice', (req, res) => {
	// Récupérer les données
	const data = req.body;
	var session = req.session;

	// Verifie que le choix du joueur est possible
	if (partie_en_cours) {
		if (PLAYERS[who_playing].username == session.username) {
			if (data.action == 'relance') {
				// Transforme en nombre
				data.value_relance = Number(data.value_relance);
				var value_to_pay = data.value_relance + (mise_actuelle_requise - PLAYERS[who_playing].argent_mise);

				if (PLAYERS[who_playing].nbr_relance == 3) {
					res.json({
						valid: false,
						error: 'Tu ne peux pas faire plus de 3 relances !',
					});
				} else if (value_to_pay > PLAYERS[who_playing].argent_restant) {
					res.json({
						valid: false,
						error: "Tu n'as pas assez d'argent. Tu peux peut-être all-in ?",
					});
				} else if (data.value_relance <= 0) {
					res.json({
						valid: false,
						error: 'Tu doit relancer avec un nombre positif',
					});
				} else if (value_to_pay == PLAYERS[who_playing].argent_restant) {
					// All-in auto
					player_choice = {
						action: 'all-in',
					};
					res.json({
						valid: true,
					});
				} else {
					// Valide le choix
					player_choice = data;
					res.json({
						valid: true,
					});
				}
			} else if (data.action == 'suivre') {
				var value_to_pay = mise_actuelle_requise - PLAYERS[who_playing].argent_mise;
				if (value_to_pay > PLAYERS[who_playing].argent_restant) {
					// All-in auto
					player_choice = {
						action: 'all-in',
					};
					res.json({
						valid: true,
					});
				} else {
					// Valide le choix
					player_choice = data;
					res.json({
						valid: true,
					});
				}
			} else {
				// Valide le choix
				player_choice = data;
				res.json({
					valid: true,
				});
			}
		} else {
			res.json({
				valid: false,
				error: "Ce n'est pas à tou tour de jouer !",
			});
		}
	} else {
		res.json({
			valid: false,
			error: 'Pas de jeu en cour',
		});
	}
});

app.post('/connexion', (req, res) => {
	// Récupérer les données
	const data = req.body;
	var session = req.session;

	// Préparation
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	if (correct) {
		database.all(`SELECT * FROM players WHERE username = '${data.username}' AND password = '${password_sha256}'; `, (err, rows) => {
			// Erreur
			if (err) {
				log('database', err, 'erreur');
				log_discord(err, 'erreur');

				res.render('connexion', {
					alert: {
						message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
						type: 'error',
					},
				});
			}
			// Connexion validé
			else if (rows.length > 0) {
				var username = data.username;
				var argent = rows[0].argent;

				session.connected = true;
				session.username = username;
				session.argent = argent;

				log('Connexion', `${username} | ${argent}`, 'info');
				log_discord(`${username} | ${argent}`, 'connexion');

				res.render('index', {
					connected: true,
					alert: {
						message: `Bonjour ${username}, vous êtes connecté.`,
						type: 'success',
					},
				});
			}
			// Mauvais username or password
			else {
				res.render('connexion', {
					alert: {
						message: `Le nom d'utilisateur ou le mot de passe est incorrect !`,
						type: 'error',
					},
				});
			}
		});
	} else {
		res.render('connexion', {
			alert: {
				message: `Le nom d'utilisateur ou le mot de passe est incorrect !`,
				type: 'error',
			},
		});
	}
});

app.post('/inscription', (req, res) => {
	// Récupérer les données
	const data = req.body;

	// Préparation
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	// Exécute les requetes
	if (correct) {
		database.all(`SELECT * FROM players WHERE username = '${data.username}'; `, (err, rows) => {
			if (err) {
				log('database', err, 'erreur');
				log_discord(err, 'erreur');

				res.render('inscription', {
					alert: {
						message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
						type: 'error',
					},
				});
			} else if (rows.length > 0) {
				res.render('inscription', {
					alert: {
						message: `Le nom d'utilisateur est deja utilisé par une autre personne !`,
						type: 'error',
					},
				});
			} else {
				// Insertion dans la base de donnée
				database.all(
					`INSERT INTO players (username, password, argent) VALUES ('${data.username}', '${password_sha256}', ${argent_inscription}); `,
					(err, rows) => {
						if (err) {
							log('database', err, 'erreur');
							log_discord(err, 'erreur');

							res.render('inscription', {
								alert: {
									message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
									type: 'error',
								},
							});
						} else {
							log('Inscription', `${data.username} | ${password_sha256}`, 'info');
							log_discord(data.username, 'incription');

							res.render('connexion', {
								alert: {
									message: `Vous avez bien été inscrit avec l'username : '${data.username}'.`,
									type: 'success',
								},
							});
						}
					}
				);
			}
		});
	} else {
		res.render('inscription', {
			alert: {
				message: `Le nom d'utilisateur ou le mot de passe est incorrect !`,
				type: 'error',
			},
		});
	}
});

/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

// ---------------------------- Serveur GET data ----------------------------

// Quand le client demande '/'
app.get('/', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('index', {
			connected: true,
			alert: undefined,
		});
	} else {
		res.render('index', {
			connected: false,
			alert: undefined,
		});
	}
});

// Quand le client demande '/connexion'
app.get('/connexion', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('index', {
			connected: true,
			alert: {
				message: `Vous êtes déjà connecté !`,
				type: 'error',
			},
		});
	} else {
		res.render('connexion', {
			alert: undefined,
		});
	}
});

// Quand le client demande '/inscription'
app.get('/inscription', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('index', {
			connected: true,
			alert: {
				message: `Vous êtes déjà connecté !`,
				type: 'error',
			},
		});
	} else {
		res.render('inscription', {
			alert: undefined,
		});
	}
});

// Quand le client demande '/credits'
app.get('/credits', (req, res) => {
	res.render('credits');
});

// Quand le client demande '/regles_du_jeu'
app.get('/regles_du_jeu', (req, res) => {
	res.render('regles_du_jeu');
});

// Quand le client demande '/calcul_proba'
app.get('/calcul_proba', (req, res) => {
	res.render('calcul_proba');
});

// Quand le client demande '/alexis'
app.get('/alexis', (req, res) => {
	res.render('alexis');
});

// Quand le client demande '/remerciements'
app.get('/remerciements', (req, res) => {
	res.render('remerciements');
});

// Quand le client demande '/sponsors'
app.get('/sponsors', (req, res) => {
	res.render('sponsors');
});

// Quand le client demande '/game'
app.get('/game', (req, res) => {
	// Récupère les données de session
	var session = req.session;
	var get_data = req.query;

	// Connected ?
	if (session.connected == true) {
		// Partie en cours ?
		if (partie_en_cours == false) {
			// Verif pas déjà in game
			var in_game = false;
			for (var joueur of PLAYERS) {
				if (joueur.username == session.username) {
					in_game = true;
					res.render('index', {
						connected: true,
						alert: {
							message: `Tu es déjà en train de jouer avec ce compte !`,
							type: 'error',
						},
					});
				}
			}
			if (!in_game) {
				// Verif argent joueur
				database.all(`SELECT * FROM players WHERE username = '${session.username}'; `, (err, rows) => {
					// Erreur
					if (err) {
						log('database', err, 'erreur');
						log_discord(err, 'erreur');

						res.render('index', {
							connected: true,
							alert: {
								message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
								type: 'error',
							},
						});
					}
					// Connexion validé
					else if (rows.length > 0) {
						var argent = rows[0].argent;

						if (get_data.argent > argent) {
							res.render('index', {
								connected: true,
								alert: {
									message: "Tu n'as pas assez d'argent dans ton porte monnaie !",
									type: 'error',
								},
							});
						} else if (get_data.argent < argent_min_require) {
							res.render('index', {
								connected: true,
								alert: {
									message: "Tu n'as pas mit assez d'argent en jeu !",
									type: 'error',
								},
							});
						} else {
							session.argent_mit_en_jeu = get_data.argent;
							session.argent = argent;
							res.render('game', {
								connected: true,
								alert: undefined,
								username: session.username,
							});
						}
					}
				});
			}
		} else {
			res.render('index', {
				connected: true,
				alert: {
					message: 'Des joueurs sont deja en train de jouer !',
					type: 'error',
				},
			});
		}
	} else {
		res.render('index', {
			connected: false,
			alert: {
				message: "Vous n'êtes pas connecté !",
				type: 'error',
			},
		});
	}
	/*
	if (session.connected) {
		res.render('game', {
			connected: true,
			alert: undefined,
		});
	} else {
		res.render('connexion', {
			connected: false,
			alert: {
				message: `Tu doit te connecter avant d'accèder au jeu !`,
			},
		});
	}
	*/
});

// Quand le client demande '/deconnexion'
app.get('/deconnexion', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Deconnect le joueur
	session.connected = false;
	session.username = undefined;
	session.argent = undefined;

	res.render('index', {
		connected: false,
		alert: {
			message: `Déconnexion réussie !`,
			type: 'success',
		},
	});
});

// Donne les informations de session de l'utilisateur
app.get('/get_user_info', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	if (session.connected) {
		res.json({
			connected: true,
			username: session.username,
			argent: session.argent,
		});
	} else {
		res.json({
			connected: false,
		});
	}
});

// 404 page
app.get('*', (req, res) => {
	res.render('404');
});

// ---------------------------- Demarrer serveur ----------------------------

server.listen(port, () => {
	console.log('\n' + `L'application a démarré au port :`.blue + ' ' + `${port}`.bgWhite.black);
});
