const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {}; 
let puck = { x: 1500, y: 750, vx: 0, vy: 0 };
let chatLog = [];

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

// Game Loop - Server kao sudija (60 FPS)
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

    // 3. Slanje stanja SVIM klijentima
    let state = JSON.stringify({ type: 'state', players, puck });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(state);
    });
}, 1000 / 60);