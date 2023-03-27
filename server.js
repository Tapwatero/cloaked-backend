const {WebSocketServer} = require("ws");
const https = require("https");
const fs = require("fs");



const server = https.createServer({
    cert: fs.readFileSync('fullchain.pem'),
    key: fs.readFileSync('privkey.pem')
});


const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    console.log('WebSocket Connected!');

    ws.on('message', packet => {
        packet = JSON.parse(packet);

        // Send the received message back to the client

        wss.clients.forEach(function each(client) {
            if (client.readyState === 1) {
                client.send(`[${packet.username}]: ${packet.message}`);
            }
        });

        ws.on('close', () => {
            console.log('WebSocket Disconnected!');
        });
    });
});

server.listen(8000, () => {
    console.log("Secure Server Listening to Port 8000!")
})