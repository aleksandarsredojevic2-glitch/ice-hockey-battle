const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 1. Posluži statičke fajlove (index.html, script.js, style.css)
app.use(express.static(__dirname));

// 2. WebSocket logika
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
        if (myRole !== 'spectator') {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        }
    });
    ws.on('close', () => { if (myRole) players[myRole] = null; });
});

// 3. Slušaj na portu
const port = process.env.PORT || 10000;
server.listen(port, '0.0.0.0', () => {
    console.log(`Server radi na portu ${port}!`);
});