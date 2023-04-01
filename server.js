import { Server } from "socket.io";

const io = new Server(8080, {
    cors: {
        origin: 'http://localhost:3000', // replace with the URL of your client application
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true,
    }
});



const messages = new Map();
const connections = new Map();
const bannedSIDs = [];

console.log('WebSocket Established!');


io.on("connection", (socket) => {



    socket.on('message', packet => {


        const data = JSON.parse(packet);

        switch (data["Action"]) {
            case 0:
                connections.set(ws, data.SID);
                return;


            case 1:
                if (bannedSIDs.includes(data['SID']) || data.SID === undefined) {
                    return;
                }

                messages.set(data.MID, data.SID);
                wss.clients.forEach(function each(client) {


                    if (client.readyState === 1 && !bannedSIDs.includes(connections.get(client))) {

                        client.send(JSON.stringify(data));
                    }

                });
                return;
            case 2:
                console.log(`Kicked! ${messages.get(data.MID)}`);

                const payload = {
                    Action: 2,
                }


                const socket = new Map(Array.from(connections, element => element.reverse()));
                if (socket.get(messages.get(data.MID)) !== undefined) {
                    socket.get(messages.get(data.MID)).send(JSON.stringify(payload));
                }

                return;
            case 3:
                bannedSIDs.push(messages.get(data.MID));
                return;
            case 4:
                bannedSIDs.splice(bannedSIDs.indexOf(messages.get(data.MID)), 1);
        }

        // Send the received message back to the client

    });

    io.on('close', () => {
        connections.delete(socket);
        console.log('WebSocket Disconnected!');
    });

});

