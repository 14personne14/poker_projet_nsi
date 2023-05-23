const crypto = require('crypto');

/**
 * Vérifie si la chaine passe bien la regex
 * @param {String} chaine La chaine à vérifier
 * @param {RegExp} regex La regex à tester sur la chaine
 * @returns {Boolean}
 */
function verif_regex(chaine, regex) {
	return Boolean(regex.exec(chaine));
}

/**
 * Encode la chaine avec SHA256 puis renvoie cette chaine
 * @param {String} chaine La chaine à encoder
 * @returns {String}
 */
function encode_sha256(chaine) {
	return crypto.createHash('sha256').update(chaine).digest('hex');
}

/**
 * Mettre en pause le programme un certain temps
 * @param {Number} ms Le temps en milliseconde à attendre
 * @returns {Promise}
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Renvoie un nombre aléatoire entre min et max inclu
 * @param {Number} min Le nombre minimum inclu
 * @param {Number} max Le nombre maximum inclu
 * @returns {Number}
 */
function get_random_number(min = 0, max = 1) {
	max += 1;
	return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {
	verif_regex: verif_regex,
	encode_sha256: encode_sha256,
	sleep: sleep,
	get_random_number: get_random_number,
};
