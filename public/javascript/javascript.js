// Websocket
var socket;
if (window.location.host === 'poker.azerty.tk') {
	// azerty.tk
	socket = new WebSocket(`wss://poker.azerty.tk/`); // wss://poker.azerty.tk/
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

// --- Variable ---
var local_user_info;
var mise_actuelle;

// --- Fonctions ---

/**
 * Envoie une demande pour démarrer le jeu au serveur
 */
function button_start() {
	const data = JSON.stringify({
		type: 'start',
	});
	socket.send(data);
}

/**
 * Supprime un joueur de la liste des joueurs 
 * @param {String} username L'username du joueur à supprimer
 */
function delete_player(username) {
	document.getElementById(`player-${username}`).remove();
}

/**
 * Ajoute un joueur de la liste
 * @param {String} username L'username du joueur à ajouter
 * @param {Number} argent_en_jeu L'argent mit en jeu par le joueur
 */
function add_player(username, argent_en_jeu) {
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

/**
 * Change le joueur principal en lui ajoutant ou supprimant la classe 'main_player'
 * @param {String} username L'username du nouveau joueur principal
 * @param {*} status Le status, c'est à dire si on doit ajouter ou suppimer le main player au joueur ['on', 'off']
 */
function update_main_player(username, status) {
	if (status == 'off') {
		var last_div = document.getElementById(`player-${username}`);
		last_div.classList.remove('main_player');
	} else if (status == 'on') {
		var div = document.getElementById(`player-${username}`);
		div.classList.add('main_player');
	}
}

/**
 * Change l'argent du joueur 
 * @param {String} username L'username du joueur à qui l'argent change
 * @param {Number} new_argent Le nouvel argent à afficher
 */
function update_argent_player(username, new_argent) {
	var div = document.getElementById(`player-argent_en_jeu-${username}`);
	div.innerHTML = new_argent;
}

/**
 * Change la derniere action du joueur 
 * @param {String} username L'username du joueur à qui l'action change
 * @param {Number} new_action Le nouvel argent à afficher
 */
function update_action_player(username, new_action) {
	var div = document.getElementById(`player-last_action-${username}`);
	div.innerHTML = new_action;

	if (new_action == 'abandon') {
		var div_player = document.getElementById(`player-${username}`);
		div_player.classList.add('abandon');
	}
}

/**
 * Affiche les cartes du joueur
 * @param {Array} cartes Les cartes du joueur
 */
function affiche_carte(cartes) {
	for (var carte of cartes) {
		var new_img = document.createElement('img');
		new_img.setAttribute('src', `public/images/cards/original/${carte.numero}_${carte.symbole}.svg`);
		new_img.setAttribute('alt', `${carte.numero} de ${carte.symbole}`);

		document.getElementById('your_card').appendChild(new_img);
	}
}

/**
 * Change le pot par le nouveau pot et la mise par la nouvelle mise 
 * @param {Number} new_pot Le nouveau pot
 * @param {Number} new_mise La nouvelle mise 
 */
function update_pot_mise(new_pot, new_mise) {
	mise_actuelle = new_mise;

	var div = document.getElementById(`valeur_pot`);
	div.innerHTML = `pot: ${new_pot} | mise: ${mise_actuelle}`;
}

/**
 * Gere quand un joueur choisi une action lors de son tour de jeu
 * @param {String} action L'action réaliser par le joueur
 */
function player_choose_action(action) {
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

/**
 * Affiche des cartes
 * @param {Array} cartes La liste de cartes
 */
function affiche_carte(cartes) {
	for (var carte of cartes) {
		var new_img = document.createElement('img');
		new_img.setAttribute('src', `public/images/cards/original/${carte.numero}_${carte.symbole}.svg`);
		new_img.setAttribute('alt', `${carte.numero} de ${carte.symbole}`);

		document.getElementById('cartes_communes').appendChild(new_img);
	}
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
	// Init liste players
	else if (data.type == 'liste_player') {
		console.log('%cListe player', 'background: #F9FF00; color: #000000; padding: 0px 5px;');
		console.log(data.liste);
		for (var joueur of data.liste) {
			add_player(joueur.username, joueur.argent_en_jeu);
		}
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
		update_main_player(data.who_playing, 'on');
		update_pot_mise(data.pot, data.mise_actuelle_requise);
		affiche_carte(data.your_card);
	}
	// Nouveau main player
	else if (data.type == 'next_player') {
		console.log('%cUpdate main player' + `%c ${data.next_player}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
		update_main_player(data.next_player, 'on');
	}
	// Nouveau choix d'un joueur
	else if (data.type == 'player_choice') {
		console.log(
			'%cChoice player' +
				`%c ${data.username}` +
				`%c\n - action: ${data.action} \n - argent_left: ${data.argent_left} \n - pot: ${data.pot} \n - mise: ${data.mise}`,
			'background: #00AB00; color: #000000; padding: 0px 5px;',
			'',
			''
		);
		update_main_player(data.username, 'off');
		update_argent_player(data.username, data.argent_left);
		update_action_player(data.username, data.action);
		update_pot_mise(data.pot, data.mise);
	}
	// Next game
	else if (data.type == 'next_game') {
		var text_log_cartes = '';
		for (var carte of data.cartes_new) {
			text_log_cartes += `\n         card: ${carte.numero} ${carte.symbole}`;
		}
		console.log(
			'%cNext Game' +
				`%c\n           PB: ${data.petite_blind.username} \n           GB: ${data.grosse_blind.username} \n  who_playing: ${data.who_playing} \n          pot: ${data.pot} \nmise_actuelle: ${data.mise_actuelle_requise} ${text_log_cartes}`,
			'background: #F9FF00; color: #000000; padding: 0px 5px;',
			''
		);
		update_argent_player(data.petite_blind.username, data.petite_blind.argent);
		update_action_player(data.petite_blind.username, 'petite blind');
		update_argent_player(data.grosse_blind.username, data.grosse_blind.argent);
		update_action_player(data.grosse_blind.username, 'grosse blind');
		update_main_player(data.who_playing, 'on');
		update_pot_mise(data.pot, data.mise_actuelle_requise);
		affiche_carte(data.cartes_new);
	}
	// Affiche cartes
	else if (data.type == 'new_cartes') {
		var text_log_cartes = '';
		for (var carte of data.cartes_new) {
			text_log_cartes += `\n         card: ${carte.numero} ${carte.symbole}`;
		}
		console.log('%cNew carte:' + `%c${text_log_cartes}`, 'background: #F9FF00; color: #000000; padding: 0px 5px;', '');
		affiche_carte(data.cartes_new);
	}
	// Autre cas
	else {
		console.log('%cEvent:', 'background: #004CFF; color: #FFFFFF; padding: 0px 5px;');
		console.log(data);
	}
});

socket.addEventListener('close', function (event) {
	// Erreur deconnexion de la websocket.
	$('.container').hide();
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
