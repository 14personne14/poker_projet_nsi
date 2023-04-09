// Websocket
var socket = new WebSocket(`ws://${window.location.host}/`);

// Ecouter les messages
socket.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);

	if (data.type == 'connected') {
		console.log(data.message);
	}
});
