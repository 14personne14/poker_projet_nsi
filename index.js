// Require
const express = require('express');
const sessions = require('express-session');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const colors = require('colors');
const { markAsUntransferable } = require('worker_threads');

// Vaiables constantes
const app = express();
const server = http.createServer(app);
const port = 8101;
const regex_username = /^[a-zA-Z0-9]+_?[a-zA-Z0-9]*$/;
const regex_password = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$/;

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
		resave: false,
		saveUninitialized: true,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 10,
			sameSite: 'strict',
		},
	})
);

// Gère le language EJS
app.set('view engine', 'ejs');

// Fonctions :
function verif_regex(chaine, regex) {
	/**
	 * Vérifie si la chaine passe bien la regex.
	 *
	 * [entrée] chaine: la chaine à vérifier (string)
	 * 			regex:  la regex à tester sur la chaine (regex)
	 * [sortie] Boolean
	 */

	return Boolean(regex.exec(chaine));
}

function encode_sha256(chaine) {
	/**
	 * Encode la chaine avec SHA256 puis renvoie cette chaine.
	 *
	 * [entrée] chaine: la chaine à encoder (string)
	 * [sortie] String
	 */

	return crypto.createHash('sha256').update(chaine).digest('hex');
}

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
	// Récupérer les données du POST
	const data = req.body;

	// Récupère les données de session
	var session = req.session;

	// Préparation des informations
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	// Exécute les requetes
	if (correct) {
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}' AND password = '${password_sha256}'; `, (err, rows) => {
			// Erreur
			if (err) {
				console.log(err);
				res.render('connexion', {
					alert: {
						message: `Erreur lors de la connexion à la base de données.`,
					},
				});
			}
			// Connexion validé
			else if (rows.length > 0) {
				console.log(`Connexion:`.bgWhite.black + ` ${data.username} `.white);
				session.connected = true;
				res.render('index', {
					connected: true,
					alert: {
						message: `connexion ok ${data.username}`,
					},
				});
			}
			// Mauvais username or password
			else {
				res.render('connexion', {
					alert: {
						message: `Nom d'utilisateur ou mot de passe incorrect !`,
					},
				});
			}
		});
	} else {
		res.render('connexion', {
			alert: {
				message: `Nom d'utilisateur ou mot de passe incorrect !`,
			},
		});
	}
});

app.post('/inscription', (req, res) => {
	// Récupérer les données du POST
	const data = req.body;

	// Récupère les données de session
	var session = req.session;

	// Préparation des informations
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	// Exécute les requetes
	if (correct) {
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}'; `, (err, rows) => {
			if (err) {
				console.log(err);
				res.render('inscription', {
					alert: {
						message: `Erreur lors de la connexion à la base de données.`,
					},
				});
			} else if (rows.length > 0) {
				res.render('inscription', {
					alert: {
						message: `Nom d'utilisateur deja prit !`,
					},
				});
			} else {
				// Insertion dans la base de donnée
				database.all(`INSERT INTO utilisateur (username, password) VALUES ('${data.username}', '${password_sha256}'); `, (err, rows) => {
					if (err) {
						console.log(err);
						res.render('inscription', {
							alert: {
								message: `Erreur lors de l'insertion dans la base de données.`,
							},
						});
					} else {
						console.log(`Inscription:`.bgWhite.black + ` ${data.username} | ${password_sha256} `.white);
						res.render('connexion', {
							alert: {
								message: `Ok vous êtes bien inscrit avec l'username : ${data.username}.`,
							},
						});
					}
				});
			}
		});
	} else {
		res.render('inscription', {
			alert: {
				message: `Mauvais mot de passe ou nom d'utilisateur.`,
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

// Quand le client demande '/c'
app.get('/connexion', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('index', {
			connected: true,
			alert: {
				message: `vous etes deja connecter`,
			},
		});
	} else {
		res.render('connexion', {
			alert: undefined,
		});
	}
});

// Quand le client demande '/i'
app.get('/inscription', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	if (session.connected) {
		res.render('index', {
			connected: true,
			alert: {
				message: `vous etes deja inscrit`,
			},
		});
	} else {
		res.render('inscription', {
			alert: undefined,
		});
	}
});

// Quand le client demande '/i'
app.get('/deconnexion', (req, res) => {
	// Récupère les données de session
	var session = req.session;

	// Le joueur est deja connecter ?
	session.connected = false;

	res.render('index', {
		connected: false,
		alert: {
			message: `deconnexion réussie`,
		},
	});
});

// Démarre le serveur (ecoute)
server.listen(port, () => {
    console.log('');
	console.log(`L'application a démarré au port ${port}.`.bgYellow.black);
	console.log('');
});
