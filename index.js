const express = require('express');
const sessions = require('express-session');
const http = require('http');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const colors = require('colors'); // For color console

// My modules (functions)
const { verif_regex, encode_sha256, sleep, get_random_number } = require('./functions/functions');
const { log, log_discord } = require('./functions/log');
const JeuCartes = require('./functions/card');
const { who_is_winner, get_proba } = require('./functions/proba');

// Variables for server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
	server: server,
});
const port = 8103; // default: [8103]

// Variables constantes
const regex_username = /^[a-zA-Z0-9]+_?[a-zA-Z0-9]*$/;
const regex_password = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-+]).{8,16}$/;

// Variable true/false (for game)
var GRAFCET_MISE = false; // Si le Graph MISE doit être executé (bool)
var etape_global = 0; // Le numéro de l'étape en grafcet GLOBAL (int)
var etape_mise = 0; // Le numéro de l'étape en grafcet MISE (int)

// Constante (for game)
const argent_min_require = 1000; // Argent minimal requit pour jouer une partie (int)
const valeur_blind = { petite: 100, grosse: 200 }; // Valeurs de la petite et la grosse blind (object)
const sleep_time = 100; // La fluidité et rapidité du jeu (int)
const duree_timer = 60000; // Durée du timer en millisecondes (int)
const nbr_joueur_min_require = 2; // Nombre minimum de joueur (int)
const nbr_joueur_max_require = 8; // Nombre maximum de joueur (int)

// Variables (for game)
var PLAYERS = []; // Liste des joueurs avec leurs ws associé (list)
var jeu_cartes; // Jeu de cartes (object)
var cartes_communes = []; // Les cartes du centre de la table (list)
var nbr_joueur = 0; // Nombre de joueur (int)
var liste_joueur_playing = []; // liste des joueurs qui ont commencés à miser (list)
var player_choice = undefined; // Le choix du joueur (obj)
var pot = 0; // Argent total mit en jeu par les joueurs (int)
var mise_actuelle_requise = 0; // Argent minimum à mettre en jeu pour continuer de jouer (int)
var who_start; // Le joueur qui commence à jouer en premier (int)
var who_playing; // Le joueur qui est en train de jouer (int)
var try_start = false; // Si un joueur veut lancer le jeu (bool)
var partie_en_cours = false; // Si une partie est cours (bool)
var timer; // Un timer (object)
var timer_choix_end = false; // Si le timer est terminé ou non (bool)
var timer_reset; // Un timer pour le reset du jeu à la fin (object)
var timer_reset_end = false; // Si le timer est terminé ou non (bool)

// Variable temp
var ii = 0;

// --- Fonction local ---
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

// Connexion à la base de données
const database = new sqlite3.Database('./database/database.db');

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

// --- Function for game ---
/**
 * Obtenir l'indice des deux joueurs pour la grosse blind et la petite blind
 * @returns {Object}
 */
function get_indice_player_blind() {
	var indice_grosse = who_start - 1;
	if (indice_grosse < 0) {
		indice_grosse = nbr_joueur - 1;
	}
	var indice_petite = indice_grosse - 1;
	if (indice_petite < 0) {
		indice_petite = nbr_joueur - 1;
	}
	return { petite: indice_petite, grosse: indice_grosse };
}

/**
 * Renvoie le nombre de joueur qui ont terminé de jouer, le nombre d'abandon et le nombre de joueur qui n'ont pas besoin de continuer de choisir pour jouer.
 * @returns {Object}
 */
function calc_status_player() {
	var nbr_end_player = 0;
	var nbr_abandon = 0;
	var nbr_no_re_choice = 0;

	for (var joueur of liste_joueur_playing) {
		// Suivre avec la bonne mise
		if (joueur.last_action == 'suivre' && joueur.argent_mise == mise_actuelle_requise) {
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

	return { nbr_end_player: nbr_end_player, nbr_abandon: nbr_abandon, nbr_no_re_choice: nbr_no_re_choice };
}

/**
 * Renvoie si l'étape mise doit continuer ou non.
 * @returns {Boolean}
 */
function end_of_mise() {
	var result = calc_status_player();
	if (result.nbr_end_player == nbr_joueur || result.nbr_abandon == nbr_joueur - 1) {
		return true;
	}
	else {
		return false;
	}
}

/**
 * Renvoie si il y a un winner determiné à ce moment. C'est à dire si ont peux skip une partie du jeu
 * @returns {Boolean}
 */
function end_of_global() {
	var result = calc_status_player();
	if (result.nbr_no_re_choice >= nbr_joueur - 1) {
		return true;
	}
	return false;
}

/**
 * Fonction principale du jeu (grafcet GLOBAL)
 */
function action_global() {
	// Etape 0
	// Etape 1
	if (etape_global == 1) {
		// Créé et melange jeu de cartes
		jeu_cartes = new JeuCartes();
		jeu_cartes.melanger();

		// Distribution des cartes
		for (var i = 0; i < nbr_joueur; i++) {
			PLAYERS[i].cartes = jeu_cartes.pioche(2);
		}

		// Genere l'indice du joueur qui commence
		who_start = get_random_number(0, nbr_joueur - 1);
		who_playing = who_start; // Décalage pour l'autoincrementation dans grafcet MISE

		// Init liste liste_joueur_playing
		for (var i = 0; i < nbr_joueur; i++) {
			liste_joueur_playing[i] = {
				username: PLAYERS[i].username,
				last_action: 'aucune',
				argent_mise: 0,
				nbr_relance: 0,
			};
		}

		// Prépare les blindes des joueurs
		var indice_blind = get_indice_player_blind();
		// Grosse blind :
		PLAYERS[indice_blind.petite].argent_en_jeu -= valeur_blind.petite;
		liste_joueur_playing[indice_blind.petite].last_action = 'blind';
		liste_joueur_playing[indice_blind.petite].argent_mise = valeur_blind.petite;
		// Grande blind :
		PLAYERS[indice_blind.grosse].argent_en_jeu -= valeur_blind.grosse;
		liste_joueur_playing[indice_blind.grosse].last_action = 'blind';
		liste_joueur_playing[indice_blind.grosse].argent_mise = valeur_blind.grosse;
		// Ajoute les blind au pot et le minimum requit
		pot += valeur_blind.petite + valeur_blind.grosse;
		mise_actuelle_requise = valeur_blind.grosse;

		// Debug
		// console.log('------------------');
		// console.log('who_playing:', who_playing, '|', PLAYERS[who_playing].username);
		// console.log('liste_joueur_playing:');
		// console.log(liste_joueur_playing);
		// console.log('pot: ', pot);
		// console.log('mise_actuelle_requise: ', mise_actuelle_requise);
		// console.log('------------------');

		// Envoie des données aux joueurs
		for (var joueur of PLAYERS) {
			if (joueur.ws != undefined) {
				// Change type des cartes for send
				var cartes_joueur = [];
				for (var carte of joueur.cartes) {
					cartes_joueur.push({
						symbole: carte.symbole,
						numero: carte.numero,
					});
				}

				// Envoie des données d'initialisation
				var data = JSON.stringify({
					type: 'init_game',
					mise_actuelle_requise: mise_actuelle_requise,
					petite_blind: {
						username: PLAYERS[indice_blind.petite].username,
						argent: PLAYERS[indice_blind.petite].argent_en_jeu,
					},
					grosse_blind: {
						username: PLAYERS[indice_blind.grosse].username,
						argent: PLAYERS[indice_blind.grosse].argent_en_jeu,
					},
					your_card: cartes_joueur,
					pot: pot,
					who_playing: PLAYERS[who_playing].username,
				});
				joueur.ws.send(data);
			}
		}

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

		// Reste liste_joueur_playing
		for (var i = 0; i < nbr_joueur; i++) {
			if (!(liste_joueur_playing[i].last_action == 'all-in')) {
				liste_joueur_playing[i].last_action = 'aucune';
				liste_joueur_playing[i].argent_mise = 0;
				liste_joueur_playing[i].nbr_relance = 0;
			}
		}

		// Prépare les blindes des joueurs
		var indice_blind = get_indice_player_blind();
		// console.log('indice blind: ', indice_blind.petite, ' ', indice_blind.grosse); // Debug
		// Grosse blind :
		PLAYERS[indice_blind.petite].argent_en_jeu -= valeur_blind.petite;
		liste_joueur_playing[indice_blind.petite].last_action = 'blind';
		liste_joueur_playing[indice_blind.petite].argent_mise = valeur_blind.petite;
		// Grande blind :
		PLAYERS[indice_blind.grosse].argent_en_jeu -= valeur_blind.grosse;
		liste_joueur_playing[indice_blind.grosse].last_action = 'blind';
		liste_joueur_playing[indice_blind.grosse].argent_mise = valeur_blind.grosse;
		// Ajoute les blind au pot et le minimum requit
		pot += valeur_blind.petite + valeur_blind.grosse;
		mise_actuelle_requise = valeur_blind.grosse; // Reset

		// Prepare send carte flop
		var cartes_flop_to_send = [];
		for (var carte of cartes_flop) {
			cartes_flop_to_send.push({
				symbole: carte.symbole,
				numero: carte.numero,
			});
		}
		wss_send_joueur({
			type: 'next_game',
			mise_actuelle_requise: mise_actuelle_requise,
			petite_blind: {
				username: PLAYERS[indice_blind.petite].username,
				argent: PLAYERS[indice_blind.petite].argent_en_jeu,
			},
			grosse_blind: {
				username: PLAYERS[indice_blind.grosse].username,
				argent: PLAYERS[indice_blind.grosse].argent_en_jeu,
			},
			cartes_new: cartes_flop_to_send,
			pot: pot,
			who_playing: PLAYERS[who_playing].username,
		});

		// Debug
		// console.log('------------------');
		// console.log('who_playing:', who_playing, '|', PLAYERS[who_playing].username);
		// console.log('cartes_communes:');
		// console.log(cartes_communes);
		// console.log('liste_joueur_playing:');
		// console.log(liste_joueur_playing);
		// console.log('pot: ', pot);
		// console.log('mise_actuelle_requise: ', mise_actuelle_requise);
		// console.log('------------------');

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

		// Reste liste_joueur_playing
		for (var i = 0; i < nbr_joueur; i++) {
			if (!(liste_joueur_playing[i].last_action == 'all-in')) {
				liste_joueur_playing[i].last_action = 'aucune';
				liste_joueur_playing[i].argent_mise = 0;
				liste_joueur_playing[i].nbr_relance = 0;
			}
		}

		// Prépare les blindes des joueurs
		var indice_blind = get_indice_player_blind();
		// console.log('indice blind: ', indice_blind.petite, ' ', indice_blind.grosse); // Debug
		// Grosse blind :
		PLAYERS[indice_blind.petite].argent_en_jeu -= valeur_blind.petite;
		liste_joueur_playing[indice_blind.petite].last_action = 'blind';
		liste_joueur_playing[indice_blind.petite].argent_mise = valeur_blind.petite;
		// Grande blind :
		PLAYERS[indice_blind.grosse].argent_en_jeu -= valeur_blind.grosse;
		liste_joueur_playing[indice_blind.grosse].last_action = 'blind';
		liste_joueur_playing[indice_blind.grosse].argent_mise = valeur_blind.grosse;
		// Ajoute les blind au pot et le minimum requit
		pot += valeur_blind.petite + valeur_blind.grosse;
		mise_actuelle_requise = valeur_blind.grosse; // Reset

		// Prepare send carte flop
		var cartes_turn_to_send = [
			{
				symbole: carte_turn.symbole,
				numero: carte_turn.numero,
			},
		];
		wss_send_joueur({
			type: 'next_game',
			mise_actuelle_requise: mise_actuelle_requise,
			petite_blind: {
				username: PLAYERS[indice_blind.petite].username,
				argent: PLAYERS[indice_blind.petite].argent_en_jeu,
			},
			grosse_blind: {
				username: PLAYERS[indice_blind.grosse].username,
				argent: PLAYERS[indice_blind.grosse].argent_en_jeu,
			},
			cartes_new: cartes_turn_to_send,
			pot: pot,
			who_playing: PLAYERS[who_playing].username,
		});

		// Debug
		// console.log('------------------');
		// console.log('who_playing:', who_playing, '|', PLAYERS[who_playing].username);
		// console.log('cartes_communes:');
		// console.log(cartes_communes);
		// console.log('liste_joueur_playing:');
		// console.log(liste_joueur_playing);
		// console.log('pot: ', pot);
		// console.log('mise_actuelle_requise: ', mise_actuelle_requise);
		// console.log('------------------');

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

		// Reste liste_joueur_playing
		for (var i = 0; i < nbr_joueur; i++) {
			if (!(liste_joueur_playing[i].last_action == 'all-in')) {
				liste_joueur_playing[i].last_action = 'aucune';
				liste_joueur_playing[i].argent_mise = 0;
				liste_joueur_playing[i].nbr_relance = 0;
			}
		}

		// Prépare les blindes des joueurs
		var indice_blind = get_indice_player_blind();
		// console.log('indice blind: ', indice_blind.petite, ' ', indice_blind.grosse); // Debug
		// Grosse blind :
		PLAYERS[indice_blind.petite].argent_en_jeu -= valeur_blind.petite;
		liste_joueur_playing[indice_blind.petite].last_action = 'blind';
		liste_joueur_playing[indice_blind.petite].argent_mise = valeur_blind.petite;
		// Grande blind :
		PLAYERS[indice_blind.grosse].argent_en_jeu -= valeur_blind.grosse;
		liste_joueur_playing[indice_blind.grosse].last_action = 'blind';
		liste_joueur_playing[indice_blind.grosse].argent_mise = valeur_blind.grosse;
		// Ajoute les blind au pot et le minimum requit
		pot += valeur_blind.petite + valeur_blind.grosse;
		mise_actuelle_requise = valeur_blind.grosse; // Reset

		// Prepare send carte flop
		var cartes_river_to_send = [
			{
				symbole: carte_river.symbole,
				numero: carte_river.numero,
			},
		];
		wss_send_joueur({
			type: 'next_game',
			mise_actuelle_requise: mise_actuelle_requise,
			petite_blind: {
				username: PLAYERS[indice_blind.petite].username,
				argent: PLAYERS[indice_blind.petite].argent_en_jeu,
			},
			grosse_blind: {
				username: PLAYERS[indice_blind.grosse].username,
				argent: PLAYERS[indice_blind.grosse].argent_en_jeu,
			},
			cartes_new: cartes_river_to_send,
			pot: pot,
			who_playing: PLAYERS[who_playing].username,
		});

		// Debug
		// console.log('------------------');
		// console.log('who_playing:', who_playing, '|', PLAYERS[who_playing].username);
		// console.log('cartes_communes:');
		// console.log(cartes_communes);
		// console.log('liste_joueur_playing:');
		// console.log(liste_joueur_playing);
		// console.log('pot: ', pot);
		// console.log('mise_actuelle_requise: ', mise_actuelle_requise);
		// console.log('------------------');

		// Lance le grafcet MISE
		GRAFCET_MISE = true;
	}
	// Etape 11
	// Etape 121 (skip flop)
	else if (etape_global == 121) {
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
			});
		}
		// Send
		wss_send_joueur({
			type: 'new_cartes',
			cartes_new: cartes_flop_to_send,
		});
	}
	// Etape 122 (skip turn)
	else if (etape_global == 122) {
		// Carte turn
		var carte_turn = jeu_cartes.pioche(1)[0];
		cartes_communes.push(carte_turn);
		// Prepare send carte flop
		var cartes_turn_to_send = [
			{
				symbole: carte_turn.symbole,
				numero: carte_turn.numero,
			},
		];
		// Send
		wss_send_joueur({
			type: 'new_cartes',
			cartes_new: cartes_turn_to_send,
		});
	}
	// Etape 123 (skip river)
	else if (etape_global == 123) {
		// Carte river
		var carte_river = jeu_cartes.pioche(1)[0];
		cartes_communes.push(carte_river);
		// Prepare send carte flop
		var cartes_river_to_send = [
			{
				symbole: carte_river.symbole,
				numero: carte_river.numero,
			},
		];
		// Send
		wss_send_joueur({
			type: 'new_cartes',
			cartes_new: cartes_river_to_send,
		});
	}
	// Etape 13 (end)
	else if (etape_global == 13) {
		// Prepare liste for function winner
		var liste_joueur_cartes = [];
		for (var joueur of PLAYERS) {
			liste_joueur_cartes.push({
				username: joueur.username,
				cartes: joueur.cartes,
			});
		}
		console.log(liste_joueur_cartes);
		console.log(cartes_communes);
		console.log(who_is_winner(liste_joueur_cartes, cartes_communes));
	}
	// Etape 14
	// Etape 15 (reset)
	else if (etape_global == 15) {
		// TODO : ...
	}
}

/**
 * Fonction des transition de la fonction action_global() (grafcet GLOBAL)
 */
function transition_global() {
	// Etape 0 -> Etape 1
	if (etape_global == 0 && try_start == true && nbr_joueur >= nbr_joueur_min_require && nbr_joueur <= nbr_joueur_max_require) {
		etape_global = 1;
		partie_en_cours = true;
		log('Game', 'Init Game', 'game');
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
	else if (etape_global == 14 && timer_reset_end == true) {
		etape_global = 15;
	}
	// Variable reset
	try_start = false;
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

/**
 * Fonction principale de la partie mise du jeu (grafcet MISE)
 */
function action_mise() {
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

		// Joueur attend timer
		if (timer_choix_end == true) {
			// Fait abandonner le joueur
			liste_joueur_playing[who_playing].last_action = 'abandon';
		}

		// Joueur a fait un choix
		else if (player_choice != undefined) {
			// Change en fonction de l'action du joueur :
			// Suivre
			if (player_choice.action == 'suivre') {
				// Calcule valeur à payer par le joueur
				var value_to_pay = mise_actuelle_requise - liste_joueur_playing[who_playing].argent_mise;
				// Update liste
				liste_joueur_playing[who_playing].last_action = 'suivre';
				liste_joueur_playing[who_playing].argent_mise += value_to_pay;
				// Update pot & joueur.argent_en_jeu
				PLAYERS[who_playing].argent_en_jeu -= value_to_pay;
				pot += value_to_pay;
			}
			// Relance
			else if (player_choice.action == 'relance') {
				// Calcule valeur à payer par le joueur
				var value_to_pay = player_choice.value_relance + (mise_actuelle_requise - liste_joueur_playing[who_playing].argent_mise);
				// Update liste
				liste_joueur_playing[who_playing].last_action = 'relance';
				liste_joueur_playing[who_playing].argent_mise += value_to_pay;
				// Update pot & joueur.argent_en_jeu
				PLAYERS[who_playing].argent_en_jeu -= value_to_pay;
				pot += value_to_pay;
				// Update mise_actuelle_requise
				mise_actuelle_requise = liste_joueur_playing[who_playing].argent_mise;
				// Update nbr relance of player
				liste_joueur_playing[who_playing].nbr_relance++;
			}
			// All-in
			else if (player_choice.action == 'all-in') {
				// Calcule valeur à payer par le joueur
				var value_to_pay = PLAYERS[who_playing].argent_en_jeu;
				// Update liste
				liste_joueur_playing[who_playing].last_action = 'all-in';
				liste_joueur_playing[who_playing].argent_mise += value_to_pay;
				// Update pot & joueur.argent_en_jeu
				PLAYERS[who_playing].argent_en_jeu = 0;
				pot += value_to_pay;
				// Update mise_actuelle_requise
				if (liste_joueur_playing[who_playing].argent_mise > mise_actuelle_requise) {
					mise_actuelle_requise = liste_joueur_playing[who_playing].argent_mise;
				}
			}
			// Abandon
			else if (player_choice.action == 'abandon') {
				// Update liste
				liste_joueur_playing[who_playing].last_action = 'abandon';
			}
		}

		// Envoie des données aux joueurs
		if (liste_joueur_playing[who_playing].last_action == 'relance') {
			wss_send_joueur({
				type: 'player_choice',
				username: PLAYERS[who_playing].username,
				action: `relance ${player_choice.value_relance}`,
				argent_left: PLAYERS[who_playing].argent_en_jeu,
				pot: pot,
				mise: mise_actuelle_requise,
			});
		} else {
			wss_send_joueur({
				type: 'player_choice',
				username: PLAYERS[who_playing].username,
				action: liste_joueur_playing[who_playing].last_action,
				argent_left: PLAYERS[who_playing].argent_en_jeu,
				pot: pot,
				mise: mise_actuelle_requise,
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
					!(
						((liste_joueur_playing[who_playing].last_action == 'suivre' || liste_joueur_playing[who_playing].last_action == 'relance') &&
							liste_joueur_playing[who_playing].argent_mise == mise_actuelle_requise) ||
						liste_joueur_playing[who_playing].last_action == 'all-in' ||
						liste_joueur_playing[who_playing].last_action == 'abandon'
					)
				) {
					good_next_player = true;
				}
			}
		}

		// Debug
		// console.log('------------------');
		// console.log('who_playing:', who_playing, '|', PLAYERS[who_playing].username);
		// console.log('liste_joueur_playing:');
		// console.log(liste_joueur_playing);
		// console.log('pot: ', pot);
		// console.log('mise_actuelle_requise: ', mise_actuelle_requise);
		// console.log('------------------');

		// Reset timer 2 & player_choice
		timer_choix_end = false;
		player_choice = undefined;
	}
	// Etape 4
	else if (etape_mise == 4) {
		GRAFCET_MISE = false;
	}
}

/**
 * Fonction des transition de la fonction action_mise() (grafcet MISE)
 */
function transition_mise() {
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

wss.on('connection', (ws, req) => {
	// Recupere session
	sessionParser(req, {}, function () {
		var argent = req.session.argent;
		var username = req.session.username;

		if (argent < argent_min_require || partie_en_cours == true) {
			const data = JSON.stringify({
				type: 'error',
				message: `Vous ne pouvez pas joindre le jeu.`,
			});
			ws.send(data);
		}
		// Joueur ok
		else {
			log('Game', `Nouveau joueur -> ${username}`);

			nbr_joueur++;
			PLAYERS.push({
				username: username,
				argent: argent,
				argent_en_jeu: argent, // temp
				ws: ws,
				out: false,
			});
			// console.log(PLAYERS); // debug

			// Prepare init list of players
			var data = {
				type: 'liste_player',
				liste: [],
			};
			for (var joueur of PLAYERS) {
				data.liste.push({
					username: joueur.username,
					argent_en_jeu: joueur.argent_en_jeu,
				});
			}
			ws.send(JSON.stringify(data));

			// Send new player
			wss_send_joueur(
				{
					type: 'new_player',
					username: username,
					argent_en_jeu: argent, // temp -fake-
				},
				[username]
			);
		}
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
				// Partie en cour ?
				if (partie_en_cours == true) {
					log('Game', `Delete joueur in-game -> ${req.session.username}`);

					PLAYERS[i].ws = undefined;
					PLAYERS[i].out = true;
				} else {
					PLAYERS.splice(i, 1);
					nbr_joueur--;

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
				var value_to_pay = data.value_relance + (mise_actuelle_requise - liste_joueur_playing[who_playing].argent_mise);

				if (liste_joueur_playing[who_playing].nbr_relance == 3) {
					res.json({
						valid: false,
						error: 'Tu ne peux pas faire plus de 3 relances !',
					});
				} else if (value_to_pay > PLAYERS[who_playing].argent_en_jeu) {
					res.json({
						valid: false,
						error: "Tu n'as pas assez d'argent.",
					});
				} else if (data.value_relance <= 0) {
					res.json({
						valid: false,
						error: 'Tu doit relancer avec un nombre positif',
					});
				} else {
					// Valide le choix
					res.json({
						valid: true,
					});
					player_choice = data;
				}
			} else {
				// Valide le choix
				res.json({
					valid: true,
				});
				player_choice = data;
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

				res.render('game', {
					connected: true,
					alert: {
						message: `Bonjour '${username}', vous êtes connecté.`,
					},
				});
			}
			// Mauvais username or password
			else {
				res.render('connexion', {
					alert: {
						message: `Le nom d'utilisateur ou le mot de passe est incorrect !`,
					},
				});
			}
		});
	} else {
		res.render('connexion', {
			alert: {
				message: `Le nom d'utilisateur ou le mot de passe est incorrect !`,
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
					},
				});
			} else if (rows.length > 0) {
				res.render('inscription', {
					alert: {
						message: `Le nom d'utilisateur est deja utilisé par une autre personne !`,
					},
				});
			} else {
				// Insertion dans la base de donnée
				database.all(`INSERT INTO players (username, password) VALUES ('${data.username}', '${password_sha256}'); `, (err, rows) => {
					if (err) {
						log('database', err, 'erreur');
						log_discord(err, 'erreur');

						res.render('inscription', {
							alert: {
								message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
							},
						});
					} else {
						log('Inscription', `${data.username} | ${password_sha256}`, 'info');
						log_discord(data.username, 'incription');

						res.render('connexion', {
							alert: {
								message: `Vous avez bien été inscrit avec l'username : '${data.username}'.`,
							},
						});
					}
				});
			}
		});
	} else {
		res.render('inscription', {
			alert: {
				message: `Le nom d'utilisateur ou le mot de passe est incorrect !`,
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

// Quand le client demande '/'
app.get('/', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('game', {
			connected: true,
			alert: {
				message: `Vous êtes déjà connecté !`,
			},
		});
	} else {
		res.render('index', {
			connected: false,
			alert: {
				message: `Ceci est une alert pour test !`,
			},
		});
	}
});

// Quand le client demande '/connexion'
app.get('/connexion', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('game', {
			connected: true,
			alert: {
				message: `Vous êtes déjà connecté !`,
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
		res.render('game', {
			connected: true,
			alert: {
				message: `Vous êtes déjà connecté !`,
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

// Quand le client demande '/game'
app.get('/game', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (partie_en_cours == false) {
		// temp delete connexion
		alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
		session.connected = true; // temp
		session.username = alphabet[ii].repeat(5); // temp
		ii++; // temp
		session.argent = 10000; // temp
		// console.log(session); // temp // debug
		res.render('game', {
			connected: true,
			alert: undefined,
			PLAYERS: PLAYERS,
			username: session.username,
		}); //temp --edittt--
	} else {
		res.render('index', {
			connected: false,
			alert: {
				message: 'Des joueurs sont deja en train de jouer !',
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
		},
	});
});

// Donne les informations de session de l'utilisateur
app.get('/get_user_info', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// temp delete connexion
	res.json({
		connected: true,
		username: session.username,
		argent: session.argent,
	});
	/*
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
	*/
});

// 404 page
app.get('*', (req, res) => {
	res.render('404');
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

// Démarre le serveur (ecoute)
server.listen(port, () => {
	console.log('\n' + `L'application a démarré au port :`.blue + ' ' + `${port}`.bgWhite.black);
});
