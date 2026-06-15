const http = require('http');
const WebSocket = require('ws');

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 1. Serviraj sve fajlove iz foldera gde je server (tu ti je i index.html)
app.use(express.static(__dirname));

// 2. WebSocket server vezan za isti HTTP server
const wss = new WebSocket.Server({ server });

// 3. Slušaj port
const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server radi na portu ${port}`);
});

// Ostatak tvog wss koda ostaje isti...

// Ostatak tvog koda ide ovde...
wss.on('connection', (ws) => {

    let id = Math.random().toString(36).substr(2, 9);
    players[id] = { x: 500, y: 500, vx: 0, vy: 0, keys: {}, nick: "Nepoznat", role: 'p' + (Object.keys(players).length + 1) };

    ws.on('message', (msg) => {
        let data = JSON.parse(msg);

        if (data.type === 'input') {
            players[id].keys = data.keys;
        } else if (data.type === 'set-nick') {
            players[id].nick = data.nick;
        } else if (data.type === 'chat-message') {
            // Broadcast poruke svima
            let chatMsg = JSON.stringify({ type: 'chat', text: `${players[id].nick}: ${data.text}` });
            wss.clients.forEach(client => client.send(chatMsg));
        }
    });

    ws.on('close', () => delete players[id]);
});


setInterval(() => {
    // 1. Fizika igrača
    for (let id in players) {
        let p = players[id];
        if (p.keys['w']) p.vy -= 0.8;
        if (p.keys['s']) p.vy += 0.8;
        if (p.keys['a']) p.vx -= 0.8;
        if (p.keys['d']) p.vx += 0.8;
        
        p.vx *= 0.885; p.vy *= 0.885;
        p.x += p.vx; p.y += p.vy;
    }

    // 2. Fizika paka (samo server računa!)
    puck.vx *= 0.979; puck.vy *= 0.979;
    puck.x += puck.vx; puck.y += puck.vy;

    // 3. Slanje stanja klijentima
    let state = JSON.stringify({ type: 'state', players, puck });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(state);
    });
}, 1000 / 60);