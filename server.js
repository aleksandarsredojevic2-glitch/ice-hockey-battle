const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Globalno stanje - postavljeno na startne pozicije (ne na 0,0)
let gameState = {
    p1: { x: 800, y: 750 },
    p2: { x: 2200, y: 750 },
    puck: { x: 1500, y: 750 }
};

app.use(express.static(__dirname));

let players = { p1: null, p2: null };
let nicknames = { p1: "Crveni", p2: "Plavi" };

wss.on('connection', (ws) => {
    let myRole = null;

    // Inicijalno slanje nickova
    ws.send(JSON.stringify({ 
        type: 'sync-nicks', 
        nicks: nicknames 
    }));

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        // SINHRONIZACIJA: Šaljemo i igrače i pak
        if (data.type === 'request-sync') {
            ws.send(JSON.stringify({
                type: 'sync-players',
                p1: gameState.p1,
                p2: gameState.p2,
                puck: gameState.puck 
            }));
            ws.send(JSON.stringify({ type: 'sync-nicks', nicks: nicknames }));
        }
        else if (data.type === 'set-nick') {
            if (!players.p1) { myRole = 'p1'; players.p1 = ws; }
            else if (!players.p2) { myRole = 'p2'; players.p2 = ws; }
            else { myRole = 'spectator'; }
            
            nicknames[myRole] = data.nick;
            ws.send(JSON.stringify({ type: 'init-role', role: myRole }));
            
            if (players.p1 && players.p2) {
                const startMsg = JSON.stringify({ type: 'start-game' });
                players.p1.send(startMsg); players.p2.send(startMsg);
            }
            
            const nickUpdate = JSON.stringify({ type: 'update-nick', role: myRole, nick: data.nick });
            wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(nickUpdate); });
        } 
        else if (data.type === 'player-update') {
            // Ažuriraj samo ako su koordinate validne (nisu 0,0)
            if (data.x !== 0 || data.y !== 0) {
                if (data.role === 'p1') { gameState.p1 = { x: data.x, y: data.y }; }
                else if (data.role === 'p2') { gameState.p2 = { x: data.x, y: data.y }; }
            }
            
            // Prosledi update ostalima
            const messageString = message.toString();
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) client.send(messageString);
            });
        }
        else if (data.type === 'puck-update') {
            // Master šalje poziciju paka, server je ažurira
            gameState.puck = { x: data.x, y: data.y };
            const messageString = message.toString();
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) client.send(messageString);
            });
        }
        else if (data.type === 'chat') {
            const chatData = JSON.stringify({ type: 'chat', nick: nicknames[myRole] || "Gost", text: data.text });
            wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(chatData); });
        } 
        else {
            // Default za ostale poruke
            const messageString = message.toString();
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) client.send(messageString);
            });
        }
    });

    ws.on('close', () => { 
        if (myRole) players[myRole] = null; 
    });
});

const port = process.env.PORT || 10000;
server.listen(port, '0.0.0.0', () => {
    console.log(`Server radi na portu ${port}!`);
});