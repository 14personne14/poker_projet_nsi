// --- Variable ---
var socket;
var local_user_info;
var mise_actuelle;
var last_winner;
var last_abandon = [];
var list_tooltips_card = [];
var nbr_cartes_devoile = 1;
var a_mon_tour = false; 

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
 * @param {Number} argent_restant L'argent mit en jeu par le joueur
 */
function add_player(username, argent_restant) {
	var new_div = document.createElement('div');
	new_div.classList.add('col-6');
	new_div.classList.add('col-md-3');
	new_div.setAttribute('id', `player-${username}`);

	new_div.innerHTML = `
					<div class="d-flex justify-content-center text-center">
						<div class="card text-bg-dark border-light" id="player-status-${username}">
							<div class="card-body">
								<h5 class="card-title username" id="player-username-${username}">${username}</h5>
								<h6 class="card-subtitle mb-2 text-body-secondary" id="player-argent_restant-${username}">${argent_restant}</h6>
							</div>
							<ul class="list-group list-group-flush">
								<li class="list-group-item text-bg-dark border-light last-action" id="player-last_action-${username}">Suivre</li>
							</ul>
						</div>
					</div>
    `;

	document.getElementById('liste_players').appendChild(new_div);

	// Client est le joueur
	if (local_user_info.username == username) {
		document.getElementById(`player-status-${username}`).classList.add('card_of_me');
	}
}

/**
 * Change le joueur principal en lui ajoutant ou supprimant la classe 'main_player'
 * @param {String} username L'username du nouveau joueur principal
 * @param {*} status Le status, c'est à dire si on doit ajouter ou suppimer le main player au joueur ['on', 'off']
 */
function update_main_player(username, status) {
	if (status == 'off') {
		var last_div = document.getElementById(`player-status-${username}`);
		last_div.classList.remove('main_player');
        
        if (username == local_user_info.username) {
            a_mon_tour = false; 
		}
	} else if (status == 'on') {
		var div = document.getElementById(`player-status-${username}`);
		div.classList.add('main_player');

		if (username == local_user_info.username) {
			alert_client('A ton tour de jouer ! Tu as 60 secondes maximum.', 5000, false, 'green');
            a_mon_tour = true; 
		}
	}
}

/**
 * Change l'argent du joueur
 * @param {String} username L'username du joueur à qui l'argent change
 * @param {Number} new_argent Le nouvel argent à afficher
 */
function update_argent_player(username, new_argent) {
	var div = document.getElementById(`player-argent_restant-${username}`);
	div.innerHTML = new_argent;
}

/**
 * Change la derniere action du joueur
 * @param {String} username L'username du joueur à qui l'action change
 * @param {Number} new_action Le nouvelle action à afficher
 */
function update_action_player(username, new_action) {
	var div = document.getElementById(`player-last_action-${username}`);
	div.innerHTML = new_action;

	if (new_action == 'abandon') {
		last_abandon.push(username);
		var div_player = document.getElementById(`player-status-${username}`);
		div_player.classList.add('abandon');
	}
}

/**
 * Affiche les cartes du joueur
 * @param {Array} cartes Les cartes du joueur
 */
function affiche_your_carte(cartes) {
	for (var carte of cartes) {
		var new_img = document.createElement('div');
		new_img.setAttribute('class', `flip-card`);

		new_img.innerHTML = `
							<div class="flip-card-inner card-to-hide">
								<div class="flip-card-front">
									<img
										src="public/images/cards/png_80x116/${carte.numero}_${carte.symbole}.png"
										alt="${carte.text}"
										data-bs-toggle="tooltip"
										data-bs-placement="bottom"
										data-bs-title="${carte.text}"
										data-bs-custom-class="custom-tooltip" />
								</div>
								<div class="flip-card-back">
									<img
										src="public/images/cards/png_80x116/back_card.png"
										alt=""
										data-bs-toggle="tooltip"
										data-bs-placement="bottom"
										data-bs-title="secret"
										data-bs-custom-class="custom-tooltip" />
								</div>
							</div>
		`;

		document.getElementById('your_card').appendChild(new_img);
	}

	// Instantiate all tooltips in a docs or StackBlitz
	document.querySelectorAll('img[data-bs-toggle="tooltip"]').forEach((tooltip) => {
		var temp = new bootstrap.Tooltip(tooltip);
		list_tooltips_card.push(temp);
	});
}

/**
 * Change le pot par le nouveau pot et la mise par la nouvelle mise
 * @param {Number} new_pot Le nouveau pot
 * @param {Number} new_mise La nouvelle mise
 */
function update_pot_mise(new_pot, new_mise) {
	mise_actuelle = new_mise;

	$('#valeur_pot').html(new_pot);
	$('#valeur_mise').html(mise_actuelle);
}

/**
 * Gere quand un joueur choisi une action lors de son tour de jeu
 * @param {String} action L'action réaliser par le joueur
 */
function player_choose_action(action) {
    if (a_mon_tour == true) {
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
                console.log('%cChoice send' + `%c ${data.action} | ${data.value_relance}`, 'background: #EA00B0; color: #000000; padding: 0px 5px;', '');
            }
        } else {
            console.log('%cChoice send' + `%c ${data.action}`, 'background: #EA00B0; color: #000000; padding: 0px 5px;', '');
        }

        // Envoie en POST les données
        $.post('/choice', data, function (data) {
            // Affiche le resultat
            if (data.valid == false) {
                console.log('%cChoice response error' + `%c ${data.error}`, 'background: #EA00B0; color: #000000; padding: 0px 5px;', 'color: #FF0000;');
                alert_client(data.error);
            }
        });
    } else {
        alert_client("Ce n'est pas à ton tour de jouer !");
    }
}

/**
 * Affiche des cartes
 * @param {Array} cartes La liste de cartes
 */
function affiche_carte(cartes) {
	for (var carte of cartes) {
		var img = document.getElementById(`carte_communes_img_${nbr_cartes_devoile}`);
		img.src = `public/images/cards/png_80x116/${carte.numero}_${carte.symbole}.png`;
		img.setAttribute('data-bs-title', `${carte.text}`);

		var card = document.getElementById(`carte_communes_inner_${nbr_cartes_devoile}`);
		card.classList.add('hide_my_card');

		nbr_cartes_devoile++;
	}

	// Instantiate all tooltips in a docs or StackBlitz
	document.querySelectorAll('img[data-bs-toggle="tooltip"]').forEach((tooltip) => {
		var temp = new bootstrap.Tooltip(tooltip);
		list_tooltips_card.push(temp);
	});
}

/**
 * Affiche le ou les winners et comment ils ont gagnés
 * @param {Array} liste_usernames La liste des noms du ou des gagnants
 * @param {String} how_win Comment le ou les joueurs gagnent
 */
function set_winner(liste_usernames, how_win) {
	last_winner = liste_usernames;
	for (var username of liste_usernames) {
		var div_player = document.getElementById(`player-status-${username}`);
		div_player.classList.add('winner');

		update_action_player(username, how_win);
	}
}

/**
 * Reinitialise le jeu pour repartir pour un nouveau tour
 */
function restart_global() {
	for (var i = 1; i < nbr_cartes_devoile; i++) {
        console.log('y oyo o ');
		var card = document.getElementById(`carte_communes_inner_${i}`);
		card.classList.remove('hide_my_card');
	}
	nbr_cartes_devoile = 1;

	// Delete your_card
	document.getElementById('your_card').innerHTML = '';

	// Delete winner
	for (var winner of last_winner) {
		document.getElementById(`player-status-${winner}`).classList.remove('winner');
	}

	// Delete abandon
	for (var joueur of last_abandon) {
		document.getElementById(`player-status-${joueur}`).classList.remove('abandon');
	}

	// Remove tooltip
	for (var tooltip of list_tooltips_card) {
		tooltip.hide();
	}
}

/**
 * Affiche une alert au millieu de l'écran avec le message
 * @param {String} message Le message à afficher
 * @param {Number} duree La durée d'affichage du message en milli-secondes
 * @param {Boolean} secousse_infinity Si la box doit bouger à l'infini
 * @param {String} color La couleur de l'alerte
 */
function alert_client(message, duree = 5000, secousse_infinity = false, color = 'red') {
	if (secousse_infinity == true) {
		$('#alert-animation').addClass('alert-infinity');
	} else {
		$('#alert-animation').removeClass('alert-infinity');
	}

	$('#alert-animation').addClass(`alert-${color}`);
	$('#alert').show();
	$('#alert-text').html(message);
	setTimeout(function () {
		$('#alert').hide();
		$('#alert-text').html('');
		$('#alert-animation').removeClass(`alert-${color}`);
	}, duree);
}

/**
 * Change le dernier message du jeu avce le nouveau
 * @param {String} message Le nouveau message à afficher
 */
function update_info_game(message) {
	$('#info').html(message);
}

/**
 * Affiche ou cache les bouton d'aide pour le joueur
 */
function toogle_help() {
	for (var button of document.getElementsByClassName('help-button')) {
		if (button.style.display == 'none') {
			button.style.display = 'initial';
		} else {
			button.style.display = 'none';
		}
	}
}

/**
 * Affiche ou cache les cartes du joueur
 */
function hide_my_card() {
	for (var card of document.getElementsByClassName('card-to-hide')) {
		card.classList.toggle('hide_my_card');
	}
}

/**
 * Change les probabilité à afficher
 * @param {String} proba Les nouvelle probabilités à afficher
 */
function set_proba(proba) {
	$('#proba').html(`${proba}%`);
}

function hide_all(raison = 'fin du jeu') {
	$('#info').html(`${raison}`);

	$('#block-info-pot-mise').hide();
	$('#block-cartes-communes').hide();
	$('#liste_players').hide();
	$('#block-choice-and-card').hide();
}

function hide_alert() {
	$('#alert').hide();
	$('#alert-text').html('');
}

function out_player(username) {
	var div_player = document.getElementById(`player-status-${username}`);
	div_player.classList.add('out');

	update_action_player(username, 'OUT');
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
		start();
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

function start() {
	// Websocket
	if (window.location.host === 'poker.azerty.tk') {
		// azerty.tk
		socket = new WebSocket(`wss://poker.azerty.tk/`); // wss://poker.azerty.tk/
	} else {
		socket = new WebSocket(`ws://${window.location.host}/`); // ws://localhost:8101  --or--  ws://seblag.freeboxos.fr:8888
	}

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
			console.log(
				'%cNew player' + `%c ${data.username} | ${data.argent_restant}`,
				'background: #F9FF00; color: #000000; padding: 0px 5px;',
				''
			);
			add_player(data.username, data.argent_restant);
		}
		// Init liste players
		else if (data.type == 'liste_player') {
			console.log('%cListe player', 'background: #F9FF00; color: #000000; padding: 0px 5px;');
			console.log(data.liste);
			for (var joueur of data.liste) {
				add_player(joueur.username, joueur.argent_restant);
			}
		}
		// Init game
		else if (data.type == 'init_game') {
			console.log(
				'%cInit Game' +
					`%c\n        proba: ${data.proba} \n           PB: ${data.petite_blind.username} \n           GB: ${data.grosse_blind.username}\n          pot: ${data.pot} \nmise_actuelle: ${data.mise_actuelle_requise} \n       card 1: ${data.your_card[0].numero} ${data.your_card[0].symbole} \n       card 2: ${data.your_card[1].numero} ${data.your_card[1].symbole}`,
				'background: #F9FF00; color: #000000; padding: 0px 5px;',
				''
			);
			$('#start_button').hide();
			bootstrap.Tooltip.getInstance('#start_button').hide();
			update_info_game(data.message);
			set_proba(data.proba);
			update_argent_player(data.petite_blind.username, data.petite_blind.argent);
			update_action_player(data.petite_blind.username, 'petite blind');
			update_argent_player(data.grosse_blind.username, data.grosse_blind.argent);
			update_action_player(data.grosse_blind.username, 'grosse blind');
			update_pot_mise(data.pot, data.mise_actuelle_requise);
			affiche_your_carte(data.your_card);
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
			update_info_game(data.message);
			update_main_player(data.username, 'off');
			update_argent_player(data.username, data.argent_left);
			update_action_player(data.username, data.action);
			update_pot_mise(data.pot, data.mise);
		}
		// Next game
		else if (data.type == 'game_next_part') {
			var text_log_cartes = '';
			for (var carte of data.cartes_new) {
				text_log_cartes += `\n         card: ${carte.numero} ${carte.symbole}`;
			}
			console.log(
				'%cNext Game' + `%c\n          pot: ${data.pot} \nmise_actuelle: ${data.mise_actuelle_requise} ${text_log_cartes}`,
				'background: #F9FF00; color: #000000; padding: 0px 5px;',
				''
			);
			update_info_game(data.message);
			update_pot_mise(data.pot, data.mise_actuelle_requise);
			set_proba(data.proba);
			affiche_carte(data.cartes_new);
		}
		// Affiche cartes
		else if (data.type == 'new_cartes') {
			var text_log_cartes = '';
			for (var carte of data.cartes_new) {
				text_log_cartes += `\n - card: ${carte.numero} ${carte.symbole}`;
			}
			console.log('%cNew carte:' + `%c${text_log_cartes}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
			update_info_game(data.message);
			affiche_carte(data.cartes_new);
		}
		// Winner
		else if (data.type == 'winner') {
			var text_log_winners = '';
			for (var joueur of data.liste_usernames) {
				text_log_winners += `${joueur} `;
			}
			console.log('%cWinner' + `%c ${text_log_winners} | ${data.how_win}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
			update_info_game(data.message);
			set_winner(data.liste_usernames, data.how_win);
		}
		// Update argent_restant
		else if (data.type == 'update_argent_restant') {
			var text_log_argent_restant = '';
			for (var joueur of data.liste_joueurs) {
				text_log_argent_restant += `\n - ${joueur.username} ${joueur.argent_restant}`;
			}
			console.log('%cUpdate argent_restant:' + `%c${text_log_argent_restant}`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');

			for (var joueur of data.liste_joueurs) {
				if (joueur.out == true) {
					out_player(joueur.username);
				} else {
					update_argent_player(joueur.username, joueur.argent_restant);
				}
			}
		}
		// Reset carte & winner
		else if (data.type == 'restart_global') {
			console.log('%cRestart global', 'background: #F9FF00; color: #000000; padding: 0px 5px;');
			restart_global();
		}
		// Reset carte & winner
		else if (data.type == 'end') {
			console.log('%cEND OF GAME:' + `%c${data.username} win`, 'background: #00AB00; color: #000000; padding: 0px 5px;', '');
			update_info_game(data.message);
			set_winner([data.username], 'WINNER');
		}
		// Autre cas
		else {
			console.log('%cEvent:', 'background: #004CFF; color: #FFFFFF; padding: 0px 5px;');
			console.log(data);
		}
	});

	socket.addEventListener('close', function (event) {
		// Erreur deconnexion de la websocket.
		alert_client('La connexion avec le serveur à été perdu. Veuiller quitter cette page', 360000, true);
		hide_all('connexion Websoket perdu');
	});

	// Debug info
	console.log(
		'%cInfo color:' +
			'%c\n - ' +
			'%cServer info ' +
			'%c ' +
			'%c\n - ' +
			'%cGame admin ' +
			'%c ' +
			'%c\n - ' +
			'%cIn game ' +
			'%c ' +
			'%c\n - ' +
			'%cClient action ' +
			'%c ',
		'text-decoration: underline;',
		'',
		'color: #004CFF;',
		'background: #004CFF; color: #FFFFFF; padding: 0px 5px;',
		'',
		'color: #F9FF00;',
		'background: #F9FF00; color: #000000; padding: 0px 5px;',
		'',
		'color: #00AB00;',
		'background: #00AB00; color: #000000; padding: 0px 5px;',
		'',
		'color: #EA00B0;',
		'background: #EA00B0; color: #000000; padding: 0px 5px;'
	);
}

// Instantiate all tooltips in a docs or StackBlitz
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((tooltip) => {
	new bootstrap.Tooltip(tooltip);
});
