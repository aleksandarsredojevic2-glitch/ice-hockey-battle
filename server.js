const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

app.use(express.static(__dirname));

const wss = new WebSocket.Server({ server });

let players = {};
let puck = { x: 1500, y: 750, vx: 0, vy: 0 };

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
            let chatMsg = JSON.stringify({ type: 'chat', text: `${players[id].nick}: ${data.text}` });
            wss.clients.forEach(client => client.send(chatMsg));
        }
    });

    ws.on('close', () => delete players[id]);
});

setInterval(() => {
    for (let id in players) {
        let p = players[id];
        
        // Kretanje
        if (p.keys['w']) p.vy -= 0.8;
        if (p.keys['s']) p.vy += 0.8;
        if (p.keys['a']) p.vx -= 0.8;
        if (p.keys['d']) p.vx += 0.8;
        
        p.vx *= 0.885; 
        p.vy *= 0.885;
        p.x += p.vx; 
        p.y += p.vy;

        // Odbijanje od zidova (Granice 3000x1500)
        if (p.x < 18.2) { p.x = 18.2; p.vx *= -0.5; }
        if (p.x > 3000 - 18.2) { p.x = 3000 - 18.2; p.vx *= -0.5; }
        if (p.y < 18.2) { p.y = 18.2; p.vy *= -0.5; }
        if (p.y > 1500 - 18.2) { p.y = 1500 - 18.2; p.vy *= -0.5; }

        // Sudar igrača i paka
        let dx = p.x - puck.x;
        let dy = p.y - puck.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (18.2 + 7)) { // Radius igraca (18.2) + radius paka (7)
            puck.vx = p.vx * 1.5; // Prenos energije
            puck.vy = p.vy * 1.5;
        }
    }

    // Fizika paka
    puck.vx *= 0.979; 
    puck.vy *= 0.979;
    puck.x += puck.vx; 
    puck.y += puck.vy;

    // Odbijanje paka od zidova
    if (puck.x < 7 || puck.x > 3000 - 7) puck.vx *= -1;
    if (puck.y < 7 || puck.y > 1500 - 7) puck.vy *= -1;

    let state = JSON.stringify({ type: 'state', players, puck });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(state);
    });
}, 1000 / 60);

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server radi na portu ${port}`);
});