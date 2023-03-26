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
	 * Encode la chaine avec MD5 puis renvoie cette chaine.
	 *
	 * [entrée] chaine: la chaine à encoder (string)
	 * [sortie] string
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

	// Préparation des informations
	var correct = verif_regex(data.username, regex_username) //&& verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	// Exécute les requetes
	if (correct) {
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}' AND password = '${password_sha256}'; `, (err, rows) => {
			if (err) {
				console.log(err);
				res.send('Erreur lors de la connexion.');
			} else if (rows.length > 0) {
				console.log(`Connexion:`.bgWhite.black + ` ${data.username} `.white)
				res.send(`Connexion Réussie : ${rows[0].username}`);
			} else {
				res.send("Nom d'utilisateur ou mot de passe incorrect !");
			}
		});
	} else {
		res.send("Nom d'utilisateur ou mot de passe incorrect !");
	}
});

app.post('/inscription', (req, res) => {
	// Récupérer les données du POST
	const data = req.body;

	// Préparation des informations
	var correct = verif_regex(data.username, regex_username) && verif_regex(data.password, regex_password);
	var password_sha256 = encode_sha256(data.password);

	// Exécute les requetes
	if (correct) {
		database.all(`SELECT * FROM utilisateur WHERE username = '${data.username}'; `, (err, rows) => {
			if (err) {
				console.log(err);
				res.send('Erreur lors de la connexion.');
			} else if (rows.length > 0) {
				res.send(`Nom d'utilisateur deja prit !`);
			} else {
				// Insertion dans la base de donnée
				database.all(`INSERT INTO utilisateur (username, password) VALUES ('${data.username}', '${password_sha256}'); `, (err, rows) => {
					if (err) {
						console.log(err);
						res.send("Erreur lors de l'insertion.");
					} else {
						console.log(`Inscription:`.bgWhite.black + ` ${data.username} | ${password_sha256} `.white)
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

// Quand le client demande '/i'
app.get('/i', (req, res) => {
	res.render('inscription');
});

// Démarre le serveur (ecoute)
server.listen(port, () => {
    console.log('');
	console.log(`L'application a démarré au port ${port}.`.bgYellow.black);
	console.log('');
});
