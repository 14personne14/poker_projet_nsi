// Require
const express = require('express');
const sessions = require('express-session');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const colors = require('colors');
const { markAsUntransferable } = require('worker_threads');

// Vaiables constantes
const app = express();
const server = http.createServer(app);
const port = 8101;
const regex_username = /^[a-zA-Z0-9]+_?[a-zA-Z0-9]*$/;
const regex_password = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-+]).{8,16}$/;

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

function error_message_urgence() {
	/**
	 * Envoie un message d'urgence à @personne14 et @kohibachiden sur discord !
	 * A utiliser avec modération !!!
	 *
	 * [entrée] xxx
	 * [sortie] xxx
	 */
	const webhook = create_webhook({
		type: 'erreur',
	});
	webhook.setUsername('Fatal Error');
	webhook.setAvatar('https://eloilag.tk/images/error.png');

	webhook.send(
		`:warning: **Alerte critique activé** :warning: \nUn probleme technique urgent à été découvert sur le jeu et il faut le résoudre vite vite ! \n\n <@689064395501994018> <@771730567670005760>`
	);
}

function send_log(data) {
	/**
	 * Envoie un webhook sur le serveur discord des log de @personne14 avec un embed selon les données de 'data'.
	 *
	 * [entrée] data: les données pour la fonction 'create_embed()' appelée (object)
	 * [sortie] xxx
	 */

	const webhook = create_webhook(data);
	webhook.setUsername('Poker log');
	webhook.setAvatar('https://eloilag.tk/images/poker.png');

	// Embed
	var embed = create_embed(data);
	webhook.send(embed);

	// Log d'affichage dans la console :
	affiche_log(data);
}

function affiche_log(data) {
	/**
	 * Affiche les logs dans la console en fonction des données de 'data'.
	 *
	 * [entrée] data: les données pour l'affichage dans la console (object)
	 * [sortie] xxx
	 */
	// Nouvelle inscription
	if (data.type == 'inscription') {
		console.log(`Inscription:`.bgWhite.black + ` ${data.username} | ${data.password} `.white);
	}
	// Connexion
	else if (data.type == 'connexion') {
		console.log(`Connexion:`.bgWhite.black + ` ${data.username} `.white);
	}
	// Erreur BDD
	else if (data.type == 'erreur_bdd') {
		console.log(`Erreur base de données:`.bgRed + ' ' + data.erreur);
	}
}

function create_webhook(data) {
	/**
	 * Créé le webhook avec le bon lien en fonction des données de data.
	 *
	 * [entrée] data: les données pour la création personnalisé du webhook (object)
	 * [sortie] object (webhook)
	 */

	// Inscription
	if (data.type == 'inscription') {
		return new Webhook(
			'https://discord.com/api/webhooks/1089945104409690172/jo0OVgmwrrSV02DFbxkSrpE1TSJekFxN7yHVHiVSByR3wMhY7XzvWoJxsqIbLeh-RXw-'
		);
	}
	// Connexion
	else if (data.type == 'connexion') {
		return new Webhook(
			'https://discord.com/api/webhooks/1089952792489246851/Jt2Krold4jCgvV4tE1IQa3ayF3w_VkgBOppttetyF41hEXlqIQzCwXfuqyaTgT_BH-Si'
		);
	}
	// Fatal error
	else if (data.type == 'erreur_bdd' || data.type == 'erreur') {
		return new Webhook(
			'https://discord.com/api/webhooks/1089956012993302538/vOpKkV7VkQpHqHKKsz02_0dEKk-jg1E1ng3zO5BZE8GSfzkzYO_cJRcmD4xl1ZoQlEZD'
		);
	}
	// Autre test
	else if (data.type == 'test') {
		return new Webhook(
			'https://discord.com/api/webhooks/1089953770005344266/iyjl46ua89Aj0aJAf_BgJcZIVu4OZyIye5ZDOT53XAcwewICcDcoVK2C9RMJ5h8bz9jK'
		);
	}
	// Autre cas
	else if (data.type == 'test') {
		return new Webhook(
			'https://discord.com/api/webhooks/1089953870853197834/Pg_C6lS6IezQm4xNMlL5H1vxZ9YcVuxAntRtYs3wgrYdNeWjRh2DwQCkN7cLljCfmbUW'
		);
	}
}

function create_embed(data) {
	/**
	 * Créé un embed discord avec les données de 'data' et le renvoie.
	 *
	 * [entrée] data: les données pour la création personnalisé de l'embed (object)
	 * [sortie] object (embed)
	 */

	const embed = new MessageBuilder();

	// Nouvelle inscription
	if (data.type == 'inscription') {
		embed.setDescription(`◽ Nouveau joueur : \`${data.username}\` `);
		embed.setColor('#00ff00');
	}
	// Connexion
	else if (data.type == 'connexion') {
		embed.setDescription(`◽ Connexion d'un joueur : \`${data.username}\` `);
		embed.setColor('#00ff00');
	}
	// Erreur BDD
	else if (data.type == 'erreur_bdd') {
		embed.setTitle('ERREUR BASE DE DONNEES');
		embed.setColor('#ff0000');
		embed.setDescription(`L'erreur est : \`${data.erreur}\` `);
		embed.setTimestamp();
	}
	// Un test
	else if (data.type == 'test') {
		embed.setTitle('Titre ultime cool');
		embed.setAuthor('Author here', 'https://cdn.discordapp.com/embed/avatars/0.png', 'https://www.google.com');
		embed.setURL('https://www.google.com');
		embed.addField('First field', 'this is inline', true);
		embed.addField('Second field', 'this is not inline');
		embed.setColor('#00b0f4');
		embed.setThumbnail('https://cdn.discordapp.com/embed/avatars/0.png');
		embed.setDescription('Oh look a description :)');
		embed.setImage('https://cdn.discordapp.com/embed/avatars/0.png');
		embed.setFooter('Hey its a footer', 'https://cdn.discordapp.com/embed/avatars/0.png');
		embed.setTimestamp();
	}
	// Autre cas (donc erreur de log)
	else {
		embed.setTitle("Erreur lors de la création de l'embed.");
		embed.setColor('#ff0000');
	}

	return embed;
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
				console.log(`Erreur BDD:`.bgRed + ' ' + err);

				send_log({
					type: 'erreur_bdd',
					erreur: err,
				});

				res.render('connexion', {
					alert: {
						message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
					},
				});
			}
			// Connexion validé
			else if (rows.length > 0) {
				session.connected = true;

				send_log({
					type: 'connexion',
					username: data.username,
				});

				res.render('index', {
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
	var session = req.session;

	// Préparation
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	// Exécute les requetes
	if (correct) {
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}'; `, (err, rows) => {
			if (err) {
				send_log({
					type: 'erreur_bdd',
					erreur: err,
				});

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
                        send_log({
                            type: 'erreur_bdd',
                            erreur: err,
                        });

						res.render('inscription', {
							alert: {
								message: `Erreur lors de la connexion à la base de données. Veuillez réessayer plus tard.`,
							},
						});
					} else {
						send_log({
							type: 'inscription',
							username: data.username,
                            password: password_sha256, 
						});

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
