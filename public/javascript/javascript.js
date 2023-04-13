$.getJSON('/get_user_info', function (data) {
	console.log(data);
});

// Websocket
// var socket = new WebSocket(`ws://${window.location.host}/`);
// AZERTY !!!
var socket = new WebSocket(`ws://localhost:8101/`);

// Ecouter les messages
socket.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);

	if (data.type == 'connected') {
		//console.log(data.message);
		console.log(data.test);
		console.log(data.test.cartes[1]);
	} else if (data.type == 'test') {
		//console.log(data.message);
		console.log(data.message);
		const data = JSON.stringify({
			type: 'test',
		});
		socket.send(data);
	}
	//console.log(data);
});
