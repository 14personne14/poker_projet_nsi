// Websocket
var socket;
if (window.location.host === 'azerty.tk') {
	socket = new WebSocket(`wss://azerty.tk/`); // wss://azerty.tk/
} else {
	//socket = new WebSocket(`ws://${window.location.host}/`); // ws://localhost:8101  --or--  ws://seblag.freeboxos.fr:8888
	socket = new WebSocket(`ws://127.0.0.1:8101/`);
}

// Variable
var local_user_info;

// Fonctions
function button_start() {
	const data = JSON.stringify({
		type: 'start',
	});
	socket.send(data);
}

// Recupere les informations du joueur
$.getJSON('/get_local_user_info', function (data) {
	if (data.connected == false) {
		window.location.replace('/');
	} else {
		local_user_info = data;
	}
});

// Ecouter les messages ws
socket.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);

	// Connection établie avec le serveur
	if (data.type == 'connected') {
		console.info(data.message);
	}
	console.log('%cMessage:', 'background: #004CFF; color: #FFFFFF; padding: 5px;');
	console.log(data);
});
