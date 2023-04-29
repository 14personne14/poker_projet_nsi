// Websocket
var socket;
if (window.location.host === 'azerty.tk') {
	socket = new WebSocket(`wss://azerty.tk/`); // wss://azerty.tk/
} else {
	socket = new WebSocket(`ws://${window.location.host}/`); // ws://localhost:8101  --or--  ws://seblag.freeboxos.fr:8888
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
 *
 *
 *
 *
 *
 *
 *
 *
 */

// Variable
var local_user_info;
var last_main_player;
var mise_actuelle;

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
				<p id="player-last_action-${username}">aucune</p>
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

	if (last_main_player != username) {
		if (last_main_player != undefined) {
			var last_div = document.getElementById(`player-${last_main_player}`);
			last_div.classList.remove('main_player');
		}

		var div = document.getElementById(`player-${username}`);
		div.classList.add('main_player');

		last_main_player = username;
	}
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

function update_action_player(username, new_action) {
	/**
	 * Change la derniere action du joueur concerné
	 *
	 * [entree] username:    l'username du joueur à qui l'action change (string)
	 * 			new_agrgent: le nouvel argent à afficher (int)
	 * [sortie] xxx
	 */

	var div = document.getElementById(`player-last_action-${username}`);
	div.innerHTML = new_action;

	if (new_action == 'abandon') {
		var div_player = document.getElementById(`player-${username}`);
		div_player.classList.add('abandon');
	}
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

function update_pot_mise(new_pot, new_mise) {
	/**
	 * Change le pot par le nouveau pot
	 *
	 * [entrée] new_pot: le nouveau pot (int)
	 * [sortie] xxx
	 */

	mise_actuelle = new_mise;

	var div = document.getElementById(`valeur_pot`);
	div.innerHTML = `pot: ${new_pot} | mise: ${mise_actuelle}`;
}

function player_choose_action(action) {
	/**
	 * Gere quand un joueur choisi une action lors de son tour de jeu
	 *
	 * [entrée] action: l'action réaliser par le joueur
	 * [sortie] xxx
	 */

	// Prepare les données
	var data = {
		action: action,
	};
	if (action == 'relance') {
		var value_relance = Number(document.getElementById('input_relance').value);
		if (isNaN(value_relance) || value_relance == 0) {
			// Mauvaise input du client
			return;
		} else {
			data.value_relance = value_relance;
			console.log('%cChoice send' + `%c ${data.action} | ${data.value_relance}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
		}
	} else {
		console.log('%cChoice send' + `%c ${data.action}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
	}

	// Envoie en POST les données
	$.post('/choice', data, function (data) {
		// Affiche le resultat
		if (data.valid == false) {
			console.log('%cChoice error' + `%c ${data.error}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', 'color: #FF0000;');
		}
	});
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
 *
 *
 *
 *
 *
 *
 *
 *
 */

// Recupere les informations du joueur
$.getJSON('/get_user_info', function (data) {
	if (data.connected == false) {
		window.location.replace('/');
	} else {
		console.log(
			'%cMy data' + `%c ${data.username} | ${data.argent} | connected: ${data.connected}`,
			'background: #004CFF; color: #FFFFFF; padding: 0px 5px;',
			''
		);
		local_user_info = data;
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

// Ecouter les messages ws
socket.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);

	// Connection établie avec le serveur
	if (data.type == 'connected') {
		console.log('%cBienvenue' + `%c ${data.message}`, 'background: #004CFF; color: #FFFFFF; padding: 0px 5px;', '');
	}
	// Supression d'un joueur
	else if (data.type == 'delete_player') {
		console.log('%cDelete player' + `%c ${data.username}`, 'background: #F9FF00; color: #000000; padding: 0px 5px;', '');
		delete_player(data.username);
	}
	// Ajout d'un joueur
	else if (data.type == 'new_player') {
		console.log('%cNew player' + `%c ${data.username} | ${data.argent_en_jeu}`, 'background: #F9FF00; color: #000000; padding: 0px 5px;', '');
		add_player(data.username, data.argent_en_jeu);
	}
	// Init game
	else if (data.type == 'init_game') {
		console.log(
			'%cInit Game' +
				`%c\n           PB: ${data.petite_blind.username} \n           GB: ${data.grosse_blind.username} \n  who_playing: ${data.who_playing} \n          pot: ${data.pot} \nmise_actuelle: ${data.mise_actuelle_requise} \n       card 1: ${data.your_card[0].numero} ${data.your_card[0].symbole} \n       card 2: ${data.your_card[1].numero} ${data.your_card[1].symbole}`,
			'background: #F9FF00; color: #000000; padding: 0px 5px;',
			''
		);
		update_argent_player(data.petite_blind.username, data.petite_blind.argent);
		update_action_player(data.petite_blind.username, 'petite blind');
		update_argent_player(data.grosse_blind.username, data.grosse_blind.argent);
		update_action_player(data.grosse_blind.username, 'grosse blind');
		update_main_player(data.who_playing);
		update_pot_mise(data.pot, data.mise_actuelle_requise);
		affiche_carte(data.your_card);
	}
	// Nouveau main player
	else if (data.type == 'next_player') {
		console.log('%cUpdate main player' + `%c ${data.next_player}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
		update_main_player(data.next_player);
	}
	// Nouveau choix d'un joueur
	else if (data.type == 'player_choice') {
		console.log(
			'%cChoice player' + `%c ${data.username}` + `%c\n - action: ${data.action} \n - argent_left: ${data.argent_left}`,
			'background: #00AB00; color: #000000; padding: 0px 5px;',
			'',
			''
		);
		update_argent_player(data.username, data.argent_left);
		update_action_player(data.username, data.action);
		update_pot_mise(data.pot, data.mise);
	}
	// Autre cas
	else {
		console.log('%cEvent:', 'background: #004CFF; color: #FFFFFF; padding: 0px 5px;');
		console.log(data);
	}
});

socket.addEventListener('close', function (event) {
	// Erreur deconnexion de la websocket.
	$('body').hide();
});

// Debug info
console.log(
	'%cInfo color:' + '%c\n - ' + '%cServer info ' + '%c ' + '%c\n - ' + '%cBefore game ' + '%c ' + '%c\n - ' + '%cAfter game ' + '%c ',
	'text-decoration: underline;',
	'',
	'color: #004CFF;',
	'background: #004CFF; color: #FFFFFF; padding: 0px 5px;',
	'',
	'color: #F9FF00;',
	'background: #F9FF00; color: #000000; padding: 0px 5px;',
	'',
	'color: #00AB00;',
	'background: #00AB00; color: #000000; padding: 0px 5px;'
);
