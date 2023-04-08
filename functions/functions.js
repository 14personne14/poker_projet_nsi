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

module.exports = {
	verif_regex: verif_regex,
	encode_sha256: encode_sha256,
};
