// Require
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
const { Console } = require('console');

// Variables for server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
	server: server,
});
const port = 8101; // default: [8101]

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
const sleep_time = 1000; // La fluidité et rapidité du jeu (int)

// Variables (for game)
var PLAYERS = []; // Liste des joueurs avec leurs ws associé (list)
var jeu_cartes; // Jeu de cartes (object)
var cartes_communes = []; // Les cartes du centre de la table (list)
var nbr_joueur = 0; // Nombre de joueur (int)
var liste_joueur_playing = []; // liste des joueurs qui ont commencés à miser (list)
var player_choice = undefined; // Le choix du joueur (obj)
var pot = 0; // Argent total mit en jeu par les joueurs (int)
var mise_actuelle = 0; // Argent minimum à mettre en jeu pour continuer de jouer (int)
var who_start; // Le joueur qui commence à jouer en premier (int)
var who_playing; // Le joueur qui est en train de jouer (int)
var try_start = false; // Si un joueur veut lancer le jeu (bool)
var partie_en_cours = false; // Si une partie est cours (bool)
var timer; // Un timer (object)
var timer_choix_end = false; // Si le timer est terminé ou non (bool)
var duree_timer = 60000; // Durée du timer en millisecondes (int)

// Fonction local
function wss_send_joueur(data) {
	/**
	 * Envoie un message à tous les joueurs de la liste PLAYERS en websocket.
	 *
	 * [entrée] data: Les données à envoyer (object)
	 * [sortie] xxx
	 */

	const wss_data = JSON.stringify(data);
	for (var joueur of PLAYERS) {
		if (joueur.ws != undefined) {
			joueur.ws.send(wss_data);
		}
	}
}

function wss_send(data) {
	/**
	 * Envoie un message à tous les clients connectés en websocket avec le serveur.
	 *
	 * [entrée] data: Les données à envoyer (object)
	 * [sortie] xxx
	 */

	const wss_data = JSON.stringify(data);
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(wss_data);
		}
	});
}

// Variable temp
var ii = 0;

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
	secret: 'ce-texte-doit-rester-secret',
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

// Function for game
function get_indice_player_blind() {
	var indice_grosse = who_start - 1;
	if (indice_grosse < 0) {
		indice_grosse = 3;
	}
	var indice_petite = indice_grosse - 1;
	if (indice_petite < 0) {
		indice_petite = 3;
	}
	return { petite: indice_petite, grosse: indice_grosse };
}

// Function grafcet
function action_global() {
	// Etape 0
	if (etape_global == 0) {
		liste_joueur_playing = [null, null, null, null];
	}
	// Etape 1
	else if (etape_global == 1) {
		// Créé et melange jeu de cartes
		jeu_cartes = new JeuCartes();
		jeu_cartes.melanger();

		// Distribution des cartes
		for (var i = 0; i < nbr_joueur; i++) {
			PLAYERS[i].cartes = jeu_cartes.pioche(2);
			// console.log(PLAYERS[i].username); // debug
			// console.log(PLAYERS[i].cartes); // debug
		}

		// Genere l'indice du joueur qui commence :
		who_start = get_random_number(0, nbr_joueur - 1);
		who_playing = who_start; // Décalage pour l'autoincrementation dans grafcet MISE

		// Prépare les blindes des joueurs
		var indice_blind = get_indice_player_blind();
		// console.log('indice blind: ', indice_blind.petite, ' ', indice_blind.grosse); // Debug
		// Grosse blind :
		PLAYERS[indice_blind.petite].argent_en_jeu -= valeur_blind.petite;
		liste_joueur_playing[indice_blind.petite] = {
			username: PLAYERS[indice_blind.petite].username,
			last_action: 'blind',
			argent_mise: valeur_blind.petite,
			nbr_relance: 0,
		};
		// Grande blind :
		PLAYERS[indice_blind.grosse].argent_en_jeu -= valeur_blind.grosse;
		liste_joueur_playing[indice_blind.grosse] = {
			username: PLAYERS[indice_blind.grosse].username,
			last_action: 'blind',
			argent_mise: valeur_blind.grosse,
			nbr_relance: 0,
		};
		// Ajoute les blind au pot et le minimum requit
		pot += valeur_blind.petite + valeur_blind.grosse;
		mise_actuelle = valeur_blind.grosse;

		// Debug
		console.log('------------------');
		console.log('who_playing:', who_playing, '|', PLAYERS[who_playing].username);
		console.log('liste_joueur_playing:');
		console.log(liste_joueur_playing);
		console.log('pot: ', pot);
		console.log('------------------');

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
					mise_actuelle: mise_actuelle,
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
}

function transition_global() {
	// Etape 0 -> Etape 1
	if (etape_global == 0 && try_start == true && nbr_joueur == 4) {
		etape_global = 1;
		partie_en_cours = true;
	}
	// Etape 1 -> Etape 2
	else if (etape_global == 1) {
		etape_global = 2;
	}
	// Etape 2 -> Etape 3
	else if (etape_global == 2 && GRAFCET_MISE == false) {
		etape_global = 3;
	}

	// Variable reset
	try_start = false;
}

async function global() {
	while (true) {
		await action_global();
		await transition_global();
		await sleep(sleep_time);
	}
}

/*
 *
 *
 *
 *
 *
 *
 */

function action_mise() {
	// Etape 0 (do nothing)

	// Etape 1
	if (etape_mise == 1) {
		console.log('etape 1 MISE');

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
	// Etape 2
	else if (etape_mise == 2) {
		console.log('etape 2 MISE');
	}
	// Etape 3
	else if (etape_mise == 3) {
		console.log('etape 3 MISE');

		// Reset timer
		clearTimeout(timer);

		// Joueur attend timer
		if (timer_choix_end) {
			// Fait abandonner le joueur
			if (liste_joueur_playing[who_playing] == null) {
				liste_joueur_playing[who_playing] = {
					username: PLAYERS[who_playing].username,
					last_action: 'abandon',
					argent_mise: 0,
					nbr_relance: 0,
				};
			} else {
				liste_joueur_playing[who_playing].last_action = 'abandon';
			}
		}
		// Joueur a fait un choix
		else if (player_choice != undefined) {
			// Change en fonction de l'action du joueur
			if (player_choice.action == 'check') {
				pot += mise_actuelle;

				// Update liste
				if (liste_joueur_playing[who_playing] == null) {
					liste_joueur_playing[who_playing] = {
						username: PLAYERS[who_playing].username,
						last_action: player_choice.action,
						argent_mise: mise_actuelle,
						nbr_relance: 0,
					};
				} else {
					liste_joueur_playing[who_playing].last_action = player_choice.action;
					liste_joueur_playing[who_playing].argent_mise += mise_actuelle;
				}
			}

			// met à jour le pot
			pot += player_choice.argent_mise;
		}

		// Change le main joueur
		who_playing += 1;
		if (who_playing > 3) {
			who_playing = 0;
		}

		console.log('-----------------');
		console.log('liste_joueur_playing: ');
		console.log(liste_joueur_playing);
		console.log('-----------------');

		// Reset timer 2
		timer_choix_end = false;
	}
}

function transition_mise() {
	// Etape 0 -> Etape 1
	if (etape_mise == 0 && GRAFCET_MISE == true) {
		etape_mise = 1;
	}
	// Etape 1 -> Etape 2
	else if (etape_mise == 1) {
		etape_mise = 2;
	}
	// Etape 2 -> Etape 3
	else if (etape_mise == 2 && (player_choice != undefined || timer_choix_end == true)) {
		etape_mise = 3;
	}
	// Variable reset
}

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

			wss_send_joueur({
				type: 'new_player',
				username: username,
				argent_en_jeu: argent, // temp -fake-
			});
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
	var already_error = false;

	// Verifie que le choix du joueur est possible
	if (partie_en_cours) {
		if (PLAYERS[who_playing].username == session.username) {
			if (data.action == 'relance') {
				if (liste_joueur_playing[who_playing] != null) {
					if (liste_joueur_playing[who_playing].nbr_relance == 3) {
						already_error = true;
						res.json({
							valid: false,
							error: 'Tu ne peux pas faire plus de 3 relances !',
						});
					} else if (data.value_relance > liste_joueur_playing[who_playing].argent_mise) {
						already_error = true;
						res.json({
							valid: false,
							error: "Tu n'as pas assez d'argent pour la relance.",
						});
					}
				} else {
					if (data.value_relance > PLAYERS[who_playing].argent_en_jeu) {
						already_error = true;
						res.json({
							valid: false,
							error: "Tu n'as pas assez d'argent.",
						});
					}
				}
				if (already_error == false) {
					if (data.value_relance < mise_actuelle) {
						res.json({
							valid: false,
							error: "Tu doit miser plus d'argent pour continuer de jouer !",
						});
					} else {
						// Valide le choix
						res.json({
							valid: true,
						});
						player_choice = data;
					}
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
	console.log(player_choice);
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
		session.argent = 1000; // temp
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
			alert: 'Des joueurs sont deja en train de jouer !',
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
