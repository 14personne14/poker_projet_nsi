const { Webhook, MessageBuilder } = require('discord-webhook-node');
const colors = require('colors');
const get_error = require('./get_error');

console.log(get_error());

const webhook_url = {
	inscription: 'https://discord.com/api/webhooks/1089945104409690172/jo0OVgmwrrSV02DFbxkSrpE1TSJekFxN7yHVHiVSByR3wMhY7XzvWoJxsqIbLeh-RXw-',
	connexion: 'https://discord.com/api/webhooks/1089952792489246851/Jt2Krold4jCgvV4tE1IQa3ayF3w_VkgBOppttetyF41hEXlqIQzCwXfuqyaTgT_BH-Si',
	error: 'https://discord.com/api/webhooks/1089956012993302538/vOpKkV7VkQpHqHKKsz02_0dEKk-jg1E1ng3zO5BZE8GSfzkzYO_cJRcmD4xl1ZoQlEZD',
	test: 'https://discord.com/api/webhooks/1089953770005344266/iyjl46ua89Aj0aJAf_BgJcZIVu4OZyIye5ZDOT53XAcwewICcDcoVK2C9RMJ5h8bz9jK',
	default: 'https://discord.com/api/webhooks/1089953870853197834/Pg_C6lS6IezQm4xNMlL5H1vxZ9YcVuxAntRtYs3wgrYdNeWjRh2DwQCkN7cLljCfmbUW',
};

function log(titre, message, type = '') {
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
	if (type == 'error') {
		console.log(`${titre}:`.bgRed.black + ` ${message} `.red);
	}
	// Cas de base
	else {
		console.log(`${titre}:`.bgWhite.black + ` ${message} `.white);
	}
}

function log_discord(message, type = '') {
	/**
	 * Envoie un webhook sur le serveur discord des log de @personne14 avec un embed en fonction du type et du message.
	 *
	 * [entrée] message: le message à envoyer [cas error: l'erreur à envoyer] (string)
	 * 			^type: Le type du message pour préciser son affichage à envoyer (string)
	 * 				∈ {'', 'erreur', 'connexion' }
	 * [sortie] xxx
	 */

	var data;
	// Error
	if (type == 'erreur') {
		data = {
			message: `Une erreur necessitant une __intervention__ de votre part viens d'être detecté sur le jeu.`,
			message_error: `\`${message}\``,
			color: '#ff0000',
			ping: true,
			error: true,
			username: 'Poker probleme',
			avatar: 'https://eloilag.tk/images/error.png',
			webhook_url: 'https://discord.com/api/webhooks/1089956012993302538/vOpKkV7VkQpHqHKKsz02_0dEKk-jg1E1ng3zO5BZE8GSfzkzYO_cJRcmD4xl1ZoQlEZD',
		};
	}
	// Connexion
	if (type == 'connexion') {
		data = {
			message: `:white_medium_small_square: ccConnexion d\'un joueur \`${message}\``,
			color: '#00ff00',
			ping: false,
			error: false,
			username: 'Poker log',
			avatar: 'https://eloilag.tk/images/poker.png',
			webhook_url: 'https://discord.com/api/webhooks/1089952792489246851/Jt2Krold4jCgvV4tE1IQa3ayF3w_VkgBOppttetyF41hEXlqIQzCwXfuqyaTgT_BH-Si',
		};
	}
	// Default
	else {
		data = {
			message: message,
			color: '#00ff00',
			ping: false,
			error: false,
			username: 'Poker log',
			avatar: 'https://eloilag.tk/images/poker.png',
			webhook_url: 'https://discord.com/api/webhooks/1089953870853197834/Pg_C6lS6IezQm4xNMlL5H1vxZ9YcVuxAntRtYs3wgrYdNeWjRh2DwQCkN7cLljCfmbUW',
		};
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
	if (data.error) {
		var info = get_error(1);
		embed.addField('*error:*', `\`${data.message_error}\``);
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
