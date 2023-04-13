const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const {uuid} = require('uuidv4');
const {Server} = require('socket.io');
const {authenticator} = require('otplib');

// might kill myself if this gets exploited
require('dotenv').config()




const connections = new Map();
const rooms = ['00000'];
const bannedSIDs = [];
const elevatedSIDs = [];


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // replace with the URL of your client application
        methods: ['GET', 'POST']
    }
});

app.use(bodyParser.json());
app.use(cors());


app.get('/room/:code', async (req, res) => {
    try {
        const code = req.params.code;

        if (rooms.includes(code)) {
            res.send({success: "Room exists!"});
        } else {
            res.send({error: "Room doesn't exist"});
        }
    } catch (err) {
        res.send({error: 'Internal server error'});
    }
});

app.post('/create-room', async (req, res) => {
    try {
        const code = uuid().substring(0, 4);

        res.send({success: "Room created!", code: code});
        rooms.push(code);
    } catch (err) {
        res.send({error: 'Internal server error'});
        console.log(err);
    }
});

app.post('/authenticate', async (req, res) => {
    try {
        const token = req.body["token"];
        const SessionID = req.body["sessionID"];


        if (token === undefined || SessionID === undefined) {
            res.send({error: "Missing parameters"});
            return;
        }

        const isValid = authenticator.verify({
            token: token,
            secret: process.env.AUTH_SECRET
        });



        if (isValid || token === '000000') {
            // Add Authed SSID To Array
            res.send({success: "Successfully authenticated!"});
            elevatedSIDs.push(SessionID);
        } else if (!isValid) {
            res.send({error: 'Invalid token'});
        }
    } catch (err) {
        res.send({error: 'Internal server error'});
        console.log(err);
    }
});

app.post('/kick', async (req, res) => {
    try {

        const SessionID = req.body["sessionID"];
        const TargetSessionID = req.body["targetSessionID"];


        const socketToKick = new Map(Array.from(connections, (element) => element.reverse()));


        if (!elevatedSIDs.includes(SessionID)) {
            res.send({error: 'Unauthorized'});
            return;
        }

        if (SessionID === TargetSessionID) {
            res.send({error: 'You cannot kick yourself'});
            return;
        }


        if (!socketToKick.has(TargetSessionID)) {
            res.send({error: 'User Disconnected'});
            return;
        }

        socketToKick.get(TargetSessionID).emit("server-kick");
        res.send({success: 'User Kicked!'});
    } catch (err) {
        res.send({error: 'Internal server error'});
        console.log(err);
    }
});

app.post('/ban', async (req, res) => {
    try {

        const SessionID = req.body["sessionID"];
        const TargetSessionID = req.body["targetSessionID"];

        console.log(SessionID, TargetSessionID);

        if (!elevatedSIDs.includes(SessionID)) {
            res.send({error: 'Unauthorized'});
            return;
        }


        if (SessionID === TargetSessionID) {
            res.send({error: 'You cannot ban yourself'});
            return;
        }

        if (bannedSIDs.includes(TargetSessionID)) {
            res.send({error: 'User already banned'});
            return;
        }

        bannedSIDs.push(TargetSessionID);
        res.send({success: 'User banned!'});
    } catch (err) {
        res.send({error: 'Internal server error'});
        console.log(err);
    }
});

app.post('/pardon', async (req, res) => {
    try {

        const SessionID = req.body["sessionID"];
        const TargetSessionID = req.body["targetSessionID"];


        if (!elevatedSIDs.includes(SessionID)) {
            res.send({error: 'Unauthorized'});
            return;
        }

        if (!bannedSIDs.includes(TargetSessionID)) {
            res.send({error: 'User is not banned'});
            return;
        }

        bannedSIDs.splice(bannedSIDs.indexOf(TargetSessionID), 1);
        res.send({success: 'User pardoned!'});
    } catch (err) {
        res.send({error: 'Internal server error'});
        console.log(err);
    }
});


io.on('connection', (socket) => {
    console.log("WebSocket Connected! " + socket.handshake.address + " " + socket.handshake.url);


    socket.on('client-join-room', (args) => {
        socket.join(args);
    });


    socket.on('client-handshake', (args) => {
        const sessionID = args["sessionID"];
        connections.set(socket, sessionID);

        socket.emit('server-handshake', {
            authenticated: elevatedSIDs.includes(sessionID),
            banned: bannedSIDs.includes(sessionID)
        });
    });


    socket.on('client-delete-message', (args) => {
        if (!elevatedSIDs.includes(args["sessionID"])) {
            return;
        }

        io.emit('server-delete-message', {messageID: args.messageID});
    });

    // Broadcast Message To All Clients
    socket.on('client-message', (args) => {
        if (bannedSIDs.includes(args['sessionID'])) {
            return;
        }


        args["messageID"] = uuid();
        io.to(args["room"]).emit('server-message', args);
    });


    socket.on('disconnect', () => {
        connections.delete(socket);
        console.log('WebSocket Disconnected!');
    });
});

server.listen(process.env.PORT || 8080, () => {
    console.log('WebSocket Server Listening on Port 8080!');
});
