/**
 * Renvoie la ligne du code en fonction du nombre de fonction traverse
 * @param {Number} traverse Le nombre de fonction traversées avant l'erreur
 * @returns {String}
 */
function get_line(traverse) {
	var error = new Error(); // Créé fausse erreur pour la découper
	var frame = error.stack.split('\n')[traverse + 3];
	var numero_line = frame.split(':').reverse()[1];

	return numero_line;
}

/**
 * Renvoie le nom du fichier en fonction du nombre de fonction traverse.
 * @param {Number} traverse Le nombre de fonction traversées avant l'erreur
 * @returns {String}
 */
function get_file(traverse) {
	var error = new Error(); // Créé fausse erreur pour la découper
	var frame = error.stack.split('\n')[traverse + 3];
	var part1 = frame.split(':')[0].split('').reverse()[0] + ':';
	var part2 = frame.split(':')[1];

	return part1 + part2;
}

/**
 * Renvoie la ligne et le fichier dans lequel la fonction à été apellé
 * @param {Number} traverse Le nombre de fonction traversées avant l'erreur
 * @returns {Object}
 */
function get_error(traverse = 0) {
	return {
		line: get_line(traverse),
		file: get_file(traverse),
	};
}

module.exports = get_error;
