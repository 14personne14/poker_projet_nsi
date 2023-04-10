const { Webhook, MessageBuilder } = require('discord-webhook-node');
const colors = require('colors');
const get_error = require('./get_error');

function log(titre, message = '', type = '') {
	/**
	 * Affiche des log dans la console avec les données spécifier.
	 *
	 * [entrée] titre: 	 Le titre du message (string)
	 * 			message: Le message à afficher (string)
	 * 			^type: 	 Le type du message pour préciser sa couleur dans la console.
	 * 					 ∈ {'', 'erreur'}
	 * [sortie] xxx
	 */

	// Erreur
	if (type == 'erreur' || type == 'error') {
		console.log('\n' + `Error`.bgRed.black + ` ${titre}:`.red + ` ${message} `.white);
	}
	// Info
	else if (type == 'info') {
		console.log('\n' + `${titre}:`.bgWhite.black + ` ${message} `.white);
	}
	// Cas de base
	else {
		console.log('\n' + `${titre}:`.underline.white + ` ${message} `.white);
	}
}

function log_discord(message, type = '') {
	/**
	 * Envoie un webhook sur le serveur discord des log de @personne14 avec un embed en fonction du type et du message.
	 *
	 * [entrée] message: le message à envoyer (string)
	 * 					 	- [type = 'error' -> l'erreur à envoyer]
	 * 					 	- [type = 'connexion' -> username du joueur]
	 * 					 	- [type = 'incription' -> username du joueur]
	 * 			^type:   Le type du message pour préciser son affichage à envoyer (string)
	 * 					 ∈ {'', 'erreur', 'connexion', 'incription'}
	 * [sortie] xxx
	 */

	// Valeur par default
	var data = {
		message: message,
		color: '#00ff00',
		ping: false,
		error: undefined,
		username: 'Poker log',
		avatar: 'https://eloilag.tk/images/poker.png',
		webhook_url: 'https://discord.com/api/webhooks/1089953770005344266/iyjl46ua89Aj0aJAf_BgJcZIVu4OZyIye5ZDOT53XAcwewICcDcoVK2C9RMJ5h8bz9jK',
	};

	// Error
	if (type == 'erreur' || type == 'error') {
		data.message = `Une erreur necessitant une __intervention__ de votre part viens d'être detecté sur le jeu.`;
		data.color = '#ff0000';
		data.ping = true;
		data.error = `\`${message}\``;
		data.username = 'Fatal Error';
		data.avatar = 'https://eloilag.tk/images/error.png';
		data.webhook_url =
			'https://discord.com/api/webhooks/1089956012993302538/vOpKkV7VkQpHqHKKsz02_0dEKk-jg1E1ng3zO5BZE8GSfzkzYO_cJRcmD4xl1ZoQlEZD';
	}
	// Connexion
	else if (type == 'connexion') {
		data.message = `:white_medium_small_square: Connexion d\'un joueur: \`${message}\``;
		data.webhook_url =
			'https://discord.com/api/webhooks/1089952792489246851/Jt2Krold4jCgvV4tE1IQa3ayF3w_VkgBOppttetyF41hEXlqIQzCwXfuqyaTgT_BH-Si';
	}
	// Inscription
	else if (type == 'inscription') {
		data.message = `:white_medium_small_square: Nouveau joueur: \`${message}\``;
		data.webhook_url =
			'https://discord.com/api/webhooks/1089945104409690172/jo0OVgmwrrSV02DFbxkSrpE1TSJekFxN7yHVHiVSByR3wMhY7XzvWoJxsqIbLeh-RXw-';
	}

	// Webhook
	const webhook = new Webhook(data.webhook_url);
	webhook.setUsername(data.username);
	webhook.setAvatar(data.avatar);

	// Embed
	const embed = new MessageBuilder();
	embed.setDescription(data.message);
	embed.setColor(data.color);
	if (data.ping) {
		embed.setText('|| <@689064395501994018> <@771730567670005760-> ||');
	}
	if (data.error != undefined) {
		var info = get_error(1);
		embed.addField('*error:*', `\`${data.error}\``);
		embed.addField('*line:*', `\`${info.line}\``);
		embed.addField('*file:*', `\`${info.file}\``);
	}

	// Send Webhook
	webhook.send(embed);
}

module.exports = {
	log: log,
	log_discord: log_discord,
};
