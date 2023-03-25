// Require
const express = require('express');
const http = require('http');
const colors = require('colors');

// Vaiables constantes
const app = express();
const server = http.createServer(app);
const port = 8101;

app.use(express.static(__dirname)); // Gère les fichiers du dossier "/public"

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

// Pour la connexion au serveur
app.post('/', (req, res) => {
	// Récupérez les données
	const data = req.body;
	
    // Verification information 
    
});

// Quand le client demande '/'
app.get('/', (req, res) => {
	res.render('index');
});

// Démarre le serveur (ecoute)
server.listen(port, () => {
    console.log('');
	console.log(`L'application a démarré au port ${port}.`.bgYellow.black);
	console.log('');
});
