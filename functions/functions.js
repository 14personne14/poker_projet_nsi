const crypto = require('crypto');

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
	 * Encode la chaine avec SHA256 puis renvoie cette chaine.
	 *
	 * [entrée] chaine: la chaine à encoder (string)
	 * [sortie] String
	 */

	return crypto.createHash('sha256').update(chaine).digest('hex');
}

function sleep(ms) {
	/**
	 * Attendre un certain temps
	 *
	 * [entree] ms: le temps en milliseconde à attendre (int)
	 * [sortie] xxx
	 */
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function get_random_number(min = 0, max = 1) {
	/**
	 * Renvoie un nombre aléatoire entre min et max inclu.
	 *
	 * [entree] min: le nombre minimum inclu (int)
	 * 			max: le nombre maximum inclu (int)
	 * [sortie] Number
	 */
	max += 1;
	return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {
	verif_regex: verif_regex,
	encode_sha256: encode_sha256,
	sleep: sleep,
	get_random_number: get_random_number,
};