
```js
PLAYERS = [
	{
		// Genéral
		username: 'Michel',
		argent: 10000,
		ws: Websocket,
		
		// For game entiere
		argent_mit_en_jeu: 2000, 
		argent_restant: 1800,
		cartes: 
		nbr_win: 0, 
		out: false,
		leave: false,
		nbr_afk: 0, 
		
		// For tour 
		last_action: 'aucune',
		argent_mise: '200',
		nbr_relance: 0, 
	}
];
```

```js
PLAYERS.forEach(function (part, index) {
    console.log(part.username);
    this[index].username = 'Michel 2';
}, PLAYERS);
```
