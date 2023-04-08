const { Webhook, MessageBuilder } = require('discord-webhook-node');

const webhook_url = {
	inscription: 'https://discord.com/api/webhooks/1089945104409690172/jo0OVgmwrrSV02DFbxkSrpE1TSJekFxN7yHVHiVSByR3wMhY7XzvWoJxsqIbLeh-RXw-',
	connexion: 'https://discord.com/api/webhooks/1089952792489246851/Jt2Krold4jCgvV4tE1IQa3ayF3w_VkgBOppttetyF41hEXlqIQzCwXfuqyaTgT_BH-Si',
	erreur: 'https://discord.com/api/webhooks/1089956012993302538/vOpKkV7VkQpHqHKKsz02_0dEKk-jg1E1ng3zO5BZE8GSfzkzYO_cJRcmD4xl1ZoQlEZD',
	erreur_bdd: 'https://discord.com/api/webhooks/1089956012993302538/vOpKkV7VkQpHqHKKsz02_0dEKk-jg1E1ng3zO5BZE8GSfzkzYO_cJRcmD4xl1ZoQlEZD',
	test: 'https://discord.com/api/webhooks/1089953770005344266/iyjl46ua89Aj0aJAf_BgJcZIVu4OZyIye5ZDOT53XAcwewICcDcoVK2C9RMJ5h8bz9jK',
	autre_cas: 'https://discord.com/api/webhooks/1089953870853197834/Pg_C6lS6IezQm4xNMlL5H1vxZ9YcVuxAntRtYs3wgrYdNeWjRh2DwQCkN7cLljCfmbUW',
};

function error_message_urgence(problem) {
	/**
	 * Envoie un message d'urgence à @personne14 et @kohibachiden sur discord !
	 * A utiliser avec modération !!!
	 *
	 * [entrée] problem: Le probleme à résoudre vite (string)
	 * [sortie] xxx
	 */

	const webhook = new Webhook(webhook_url.erreur);
	webhook.setUsername('Fatal Error');
	webhook.setAvatar('https://eloilag.tk/images/error.png');

	webhook.send(
		`:warning: **Alerte critique activé** :warning: \nUn probleme technique urgent à été découvert sur le jeu et il faut le résoudre vite vite !\n\n\`${problem}\` \n\n <@689064395501994018> <@771730567670005760>`
	);
}

function send_log(data) {
	/**
	 * Envoie un webhook sur le serveur discord des log de @personne14 avec un embed selon les données de 'data'.
	 *
	 * [entrée] data: les données concernant le webhook à envoyer (object)
	 * [sortie] xxx
	 */

	// Webhook
	const webhook = new Webhook(webhook_url[data.type]);
	webhook.setUsername('Poker log');
	webhook.setAvatar('https://eloilag.tk/images/poker.png');

	// Embed
	var embed = create_embed(data);

	// Send Webhook
	webhook.send(embed);

	// Log d'affichage dans la console
	affiche_log_console(data);
}

function affiche_log_console(data) {
	/**
	 * Affiche les logs dans la console en fonction des données de 'data'.
	 *
	 * [entrée] data: les données pour l'affichage dans la console (object)
	 * [sortie] xxx
	 */

	// Nouvelle inscription
	if (data.type == 'inscription') {
		console.log(`Inscription:`.bgWhite.black + ` ${data.username} | ${data.password} `.white);
	}
	// Connexion
	else if (data.type == 'connexion') {
		console.log(`Connexion:`.bgWhite.black + ` ${data.username} `.white);
	}
	// Erreur BDD
	else if (data.type == 'erreur_bdd') {
		console.log(`Erreur base de données:`.bgRed + ' ' + data.erreur);
	}
}

function create_embed(data) {
	/**
	 * Créé un embed discord avec les données de 'data' et le renvoie.
	 *
	 * [entrée] data: les données pour la création personnalisé de l'embed (object)
	 * [sortie] object (embed)
	 */

	const embed = new MessageBuilder();

	// Nouvelle inscription
	if (data.type == 'inscription') {
		embed.setDescription(`◽ Nouveau joueur : \`${data.username}\` `);
		embed.setColor('#00ff00');
	}
	// Connexion
	else if (data.type == 'connexion') {
		embed.setDescription(`◽ Connexion d'un joueur : \`${data.username}\` `);
		embed.setColor('#00ff00');
	}
	// Erreur BDD
	else if (data.type == 'erreur_bdd') {
		embed.setTitle('ERREUR BASE DE DONNEES');
		embed.setColor('#ff0000');
		embed.setDescription(`L'erreur est : \`${data.erreur}\` `);
		embed.setTimestamp();
	}
	// Un test
	else if (data.type == 'test') {
		embed.setTitle('Titre ultime cool');
		embed.setAuthor('Author here', 'https://cdn.discordapp.com/embed/avatars/0.png', 'https://www.google.com');
		embed.setURL('https://www.google.com');
		embed.addField('First field', 'this is inline', true);
		embed.addField('Second field', 'this is not inline');
		embed.setColor('#00b0f4');
		embed.setThumbnail('https://cdn.discordapp.com/embed/avatars/0.png');
		embed.setDescription('Oh look a description :)');
		embed.setImage('https://cdn.discordapp.com/embed/avatars/0.png');
		embed.setFooter('Hey its a footer', 'https://cdn.discordapp.com/embed/avatars/0.png');
		embed.setTimestamp();
	}
	// Autre cas (donc erreur de log)
	else {
		embed.setTitle("Erreur lors de la création de l'embed.");
		embed.setColor('#ff0000');
	}

	return embed;
}

module.exports = {
	error_message_urgence: error_message_urgence,
	send_log: send_log,
};
