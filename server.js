import { Server } from "socket.io";
import { authenticator } from "otplib";

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

    socket.on('client-handshake', (args) => {

        // Temp Fix
        if (bannedSIDs.includes(args["SID"])) {
            socket.disconnect();
            return;
        }

        connections.set(socket, args["SID"]);
    });

    socket.on('client-authenticate', (args) => {
        return new Promise((resolve, reject) => {
            const isValid = authenticator.verify({
                token: args.token,
                secret: 'JYIBUSCWOEHWKIIJ'
            });
            if (isValid) {
                resolve();
            } else {
                reject();
            }
        });
    });

    socket.on('client-kick', (args) => {
        const socketToKick = new Map(Array.from(connections, element => element.reverse()));

        socketToKick.get(messages.get(args["MID"])).emit('server-kick')
    });

    socket.on('client-ban', (args) => {
        bannedSIDs.push(messages.get(args["MID"]));
    });

    socket.on('client-pardon', (args) => {
        bannedSIDs.splice(bannedSIDs.indexOf(messages.get(args["MID"])), 1);
    });


    // Broadcast Message To All Clients
    socket.on('client-message', (args) => {
        if (bannedSIDs.includes(args["SID"])) {
            return;
        }

        messages.set(args["MID"], args["SID"]);
        io.emit("server-message", args);
    });

    socket.on('disconnect', () => {
        connections.delete(socket);
        console.log('WebSocket Disconnected!');
    });


})
;

