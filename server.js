const WebSocket = require('ws');
const socket = new WebSocket('wss://ice-hockey-battle-beta.onrender.com');
// Kreiraj običan HTTP server
const http = require('http');
const server = http.createServer();

// Poveži WebSocket server sa tim HTTP serverom
const wss = new WebSocket.Server({ server: server });

// Slušaj na portu koji ti Render dodeli
const port = process.env.PORT || 10000;
server.listen(port, () => {
    console.log(`Server radi na portu ${port}!`);
});

let players = { p1: null, p2: null };
let nicknames = { p1: "Crveni", p2: "Plavi" };

wss.on('connection', (ws) => {
    let myRole = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'set-nick') {
            if (!players.p1) { myRole = 'p1'; players.p1 = ws; }
            else if (!players.p2) { myRole = 'p2'; players.p2 = ws; }
            else { myRole = 'spectator'; }
            nicknames[myRole] = data.nick;
            ws.send(JSON.stringify({ type: 'init-role', role: myRole }));
        }

        // Prosleđivanje podataka svima (broadcast)
        if (myRole !== 'spectator') {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message.toString()); // message.toString() je sigurnije
                }
            });
        }
    });

    ws.on('close', () => {
        if (myRole) players[myRole] = null;
    });
});

console.log(`Server radi na portu ${port}!`);