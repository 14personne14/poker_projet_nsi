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

// Quand le client demande '/'
app.get('/', (req, res) => {
	res.render('index');
});

server.listen(port, () => {
	console.log('Gooooooooooooo');
});
