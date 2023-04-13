$.getJSON('/get_user_info', function (data) {
	console.log(data);
});

// Websocket
// var socket = new WebSocket(`ws://${window.location.host}/`);
// AZERTY !!!
var socket = new WebSocket(`wss://azerty.tk/`);

// Ecouter les messages
socket.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);

	if (data.type == 'connected') {
		//console.log(data.message);
		console.log(data.test);
		console.log(data.test.cartes[1]);
	}
	console.log(data);
});
