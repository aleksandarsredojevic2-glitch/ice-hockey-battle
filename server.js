const WebSocket = require('ws');
const http = require('http');

// 1. Kreiraj HTTP server
const server = http.createServer();

// 2. Poveži WebSocket server sa HTTP serverom
const wss = new WebSocket.Server({ server: server });

// 3. Slušaj na portu koji Render dodeli
const port = process.env.PORT || 10000;

server.listen(port, '0.0.0.0', () => {
    console.log(`Server radi na portu ${port}!`);
});

let players = { p1: null, p2: null };
let nicknames = { p1: "Crveni", p2: "Plavi" };

wss.on('connection', (ws) => {
    let myRole = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'set-nick') {
                if (!players.p1) { myRole = 'p1'; players.p1 = ws; }
                else if (!players.p2) { myRole = 'p2'; players.p2 = ws; }
                else { myRole = 'spectator'; }
                nicknames[myRole] = data.nick;
                ws.send(JSON.stringify({ type: 'init-role', role: myRole }));
            }

            if (myRole !== 'spectator') {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                });
            }
        } catch (e) {
            console.error("Greška pri parsiranju poruke:", e);
        }
    });

    ws.on('close', () => {
        if (myRole) players[myRole] = null;
    });
});