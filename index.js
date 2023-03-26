// Require
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const colors = require('colors');

// Vaiables constantes
const app = express();
const server = http.createServer(app);
const port = 8101;
const regex_username = /^[a-zA-Z0-9]+_?[a-zA-Z0-9]*$/;
const regex_password = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

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

// Gère le language EJS
app.set('view engine', 'ejs');

// Fonctions :

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

// Pour la connexion
app.post('/connexion', (req, res) => {
	// Récupérer les données
	const data = req.body;

	// Verification information
	var password_md5 = crypto.createHash('md5').update(data.password).digest('hex');

	// Requete
	database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}' AND password = '${password_md5}'; `, (err, rows) => {
		if (err) {
			console.log(err);
			res.send('Erreur lors de la connexion.');
		} else if (rows.length > 0) {
			res.send(`Connexion Réussie : ${rows[0].username}`);
		} else {
			res.send("Nom d'utilisateur ou mot de passe incorrect !");
		}
	});
});

// Pour l'inscription
app.post('/inscription', (req, res) => {
	// Récupérer les données
	const data = req.body;

	// Verif des regex
	var correct = Boolean(regex_username.exec(data.username)) && Boolean(regex_password.exec(data.password));

	// Hash du mot de passe
	var password_md5 = crypto.createHash('md5').update(data.password).digest('hex');

	if (correct) {
		// Requete de vérification
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}'; `, (err, rows) => {
			if (err) {
				console.log(err);
				res.send('Erreur lors de la connexion.');
			} else if (rows.length > 0) {
				res.send(`Nom d'utilisateur deja prit !`);
			} else {
				// Insertion dans la base de donnée
				database.all(`INSERT INTO utilisateur (username, password) VALUES ('${data.username}', '${password_md5}'); `, (err, rows) => {
					if (err) {
						console.log(err);
						res.send("Erreur lors de l'insertion.");
					} else {
						res.send(`Inscription Réussie !`);
					}
				});
			}
		});
	} else {
		res.send("Mauvais mot de passe ou nom d'utilisateur ");
	}
});

// Quand le client demande '/'
app.get('/', (req, res) => {
	res.render('connexion');
});
// Quand le client demande '/'
app.get('/i', (req, res) => {
	res.render('inscription');
});

// Démarre le serveur (ecoute)
server.listen(port, () => {
    console.log('');
	console.log(`L'application a démarré au port ${port}.`.bgYellow.black);
	console.log('');
});
