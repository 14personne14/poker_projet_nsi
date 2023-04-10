// Require
const express = require('express');
const sessions = require('express-session');
const http = require('http');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const colors = require('colors'); // For color console

// My modules (functions)
const { verif_regex, encode_sha256 } = require('./functions/functions');
const { log, log_discord } = require('./functions/log');
const get_error = require('./functions/get_error');

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

// Variables
var PLAYERS = [];

// Connexion à la base de données
const database = new sqlite3.Database('./database/database.db');

// Gère les fichiers du dossier "/public"
app.use(express.static(__dirname));

// Pour les données qui passent en POST
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);

// Pour les sessions des utilisateurs
app.use(
	sessions({
		secret: 'ce-texte-doit-rester-secret',
		resave: true,
		saveUninitialized: true,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 10,
			sameSite: 'strict',
		},
	})
);

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
 */

wss.on('connection', (ws, req) => {
	log('WebSocket', 'Utilisateur connecté en WebSocket.');

	const data = JSON.stringify({
		type: 'connected',
		message: 'Bienvenue, vous êtes connecté en websocket avec le serveur.',
	});
	ws.send(data);
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
 */

app.post('/connexion', (req, res) => {
	// Récupérer les données
	const data = req.body;
	var session = req.session;

	// Préparation
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	if (correct) {
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}' AND password = '${password_sha256}'; `, (err, rows) => {
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
				session.connected = true;
				session.player = {
					username: data.username,
					id: rows[0].id,
				};

				log('Connexion', data.username, 'info');
				log_discord(data.username, 'connexion');

				res.render('game', {
					connected: true,
					alert: {
						message: `Bonjour '${data.username}', vous êtes connecté.`,
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
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}'; `, (err, rows) => {
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
				database.all(`INSERT INTO utilisateur (username, password) VALUES ('${data.username}', '${password_sha256}'); `, (err, rows) => {
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

// Quand le client demande '/'
app.get('/', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	var connected = false;
	if (session.connected) {
		connected = true;
	}

	// Send la page
	res.render('index', {
		connected: connected,
		alert: undefined,
	});
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
});

// Quand le client demande '/deconnexion'
app.get('/deconnexion', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Deconnect le joueur
	session.connected = false;

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

	console.log('req on get_user_info'); // temp

	if (session.connected) {
		res.json({
			connected: true,
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

// Démarre le serveur (ecoute)
server.listen(port, () => {
	console.log('\n' + `L'application a démarré au port :`.blue + ' ' + `${port}`.bgWhite.black);
});
