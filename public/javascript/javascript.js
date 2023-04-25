// Websocket
var socket;
if (window.location.host === 'azerty.tk') {
	socket = new WebSocket(`wss://azerty.tk/`); // wss://azerty.tk/
} else {
	socket = new WebSocket(`ws://${window.location.host}/`); // ws://localhost:8101  --or--  ws://seblag.freeboxos.fr:8888
}

// Variable
var local_user_info;
var last_main_player;

// Fonctions
function button_start() {
	const data = JSON.stringify({
		type: 'start',
	});
	socket.send(data);
}

function delete_player(username) {
	/**
	 * Supprime un joueur de la liste.
	 *
	 * [entrée] username: l'username du joueur à supprimer (string)
	 * [sortie] xxx
	 */

	document.getElementById(`player-${username}`).remove();
}

function add_player(username, argent_en_jeu) {
	/**
	 * Ajoute un joueur de la liste.
	 *
	 * [entrée] username: 	   l'username du joueur à supprimer (string)
	 * 			argent_en_jeu: l'argent mit en jeu par le joueur (int)
	 * [sortie] xxx
	 */

	var new_div = document.createElement('div');
	new_div.classList.add('player_block');
	new_div.setAttribute('id', `player-${username}`);

	new_div.innerHTML = `
				<h2 style="margin: 0">Joueur :</h2>
				<p id="player-username-${username}">${username}</p>
				<p id="player-argent_en_jeu-${username}">${argent_en_jeu}</p>
    `;

	document.getElementById('liste_players').appendChild(new_div);
}

function update_main_player(username) {
	/**
	 * Change le joueur principal en lui ajoutant la classe 'main_player'
	 *
	 * [entree] username: l'username du nouveau joueur principal (string)
	 * [sortie] xxx
	 */

	if (last_main_player != undefined) {
		var last_div = document.getElementById(`player-${last_main_player}`);
		last_div.classList.remove('main_player');
	}

	var div = document.getElementById(`player-${username}`);
	div.classList.add('main_player');

	last_main_player = username;
}

function update_argent_player(username, new_argent) {
	/**
	 * Change l'argent du joueur concerné
	 *
	 * [entree] username:    l'username du joueur à qui l'argent change (string)
	 * 			new_agrgent: le nouvel argent à afficher (int)
	 * [sortie] xxx
	 */

	var div = document.getElementById(`player-argent_en_jeu-${username}`);
	div.innerHTML = new_argent;
}

function affiche_carte(cartes) {
	/**
	 * Affiche les cartes du joueur
	 *
	 * [entree] cartes: les cartes du joueur (list)
	 * [sortie] xxx
	 */

	for (var carte of cartes) {
		var new_img = document.createElement('img');
		new_img.setAttribute('src', `public/images/cards/original/${carte.numero}_${carte.symbole}.svg`);
		new_img.setAttribute('alt', `${carte.numero} de ${carte.symbole}`);

		document.getElementById('your_card').appendChild(new_img);
	}
}

// Recupere les informations du joueur
$.getJSON('/get_local_user_info', function (data) {
	if (data.connected == false) {
		window.location.replace('/');
	} else {
		local_user_info = data;
	}
});

// Ecouter les messages ws
socket.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);

	// Connection établie avec le serveur
	if (data.type == 'connected') {
		console.info(data.message);
	}
	// Supression d'un joueur
	else if (data.type == 'delete_player') {
		delete_player(data.username);
	}
	// Ajout d'un joueur
	else if (data.type == 'new_player') {
		add_player(data.username, data.argent_en_jeu);
	}
	// Init game
	else if (data.type == 'init_game') {
		update_main_player(data.username_who_start);
		update_argent_player(data.petite_blind.username, data.petite_blind.argent);
		update_argent_player(data.grosse_blind.username, data.grosse_blind.argent);
		affiche_carte(data.your_card);
	}
	console.log('%cEvent:', 'background: #004CFF; color: #FFFFFF; padding: 5px;');
	console.log(data);
});
