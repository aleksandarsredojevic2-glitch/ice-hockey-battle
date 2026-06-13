const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 1. Posluži statičke fajlove
app.use(express.static(__dirname));

// 2. WebSocket logika
let players = { p1: null, p2: null };
let nicknames = { p1: "Crveni", p2: "Plavi" };

wss.on('connection', (ws) => {
    let myRole = null;

    ws.send(JSON.stringify({ 
        type: 'sync-nicks', 
        nicks: nicknames 
    }));

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        if (data.type === 'set-nick') {
            if (!players.p1) { myRole = 'p1'; players.p1 = ws; }
            else if (!players.p2) { myRole = 'p2'; players.p2 = ws; }
            else { myRole = 'spectator'; }
            
            nicknames[myRole] = data.nick;
            
            ws.send(JSON.stringify({ type: 'init-role', role: myRole }));
            
            if (players.p1 && players.p2) {
                const startMsg = JSON.stringify({ type: 'start-game' });
                players.p1.send(startMsg);
                players.p2.send(startMsg);
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) client.send(startMsg);
                });
            }
            
            const nickUpdate = JSON.stringify({
                type: 'update-nick',
                role: myRole,
                nick: data.nick
            });
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.send(nickUpdate);
            });
            return;
        } 
        else if (data.type === 'chat') {
            const chatData = JSON.stringify({
                type: 'chat',
                nick: nicknames[myRole] || "Gost",
                text: data.text
            });
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.send(chatData);
            });
        } 
        else {
            const messageString = message.toString();
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(messageString);
                }
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