function get_line(traverse) {
	/**
	 * Renvoie la ligne du code en fonction du nombre de fonction traverser.
	 *
	 * [entrée] traverse: le nombre de fonction traversées (number)
	 * [sortie] Number
	 */

	var error = new Error(); // Créé fausse erreur pour la découper
	var frame = error.stack.split('\n')[traverse + 3];
	var numero_line = frame.split(':').reverse()[1];

	return numero_line;
}

function get_file(traverse) {
	/**
	 * Renvoie le nom du fichier en fonction du nombre de fonction traverser.
	 *
	 * [entrée] traverse: le nombre de fonction traversées (number)
	 * [sortie] String
	 */

	var error = new Error(); // Créé fausse erreur pour la découper
	var frame = error.stack.split('\n')[traverse + 3];
	var part1 = frame.split(':')[0].split('').reverse()[0] + ':';
	var part2 = frame.split(':')[1];

	return part1 + part2;
}

function get_error(traverse = 0) {
	/**
	 * Renvoie la ligne et le fichier dans lequel la fonction à été apellé.
	 *
	 * [entrée] xxx
	 * [sortie] Object
	 */

	return {
		line: get_line(traverse),
		file: get_file(traverse),
	};
}

module.exports = get_error;
