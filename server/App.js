const express = require('express');
const Ticket = require('./models/Ticket');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(bodyParser.json())
app.use(cors());

const port = 500;
const socketPort = 400;
const dbUrl = 'mongodb://127.0.0.1:27017/tickets';

mongoose.connect(dbUrl, { useNewUrlParser: true , useUnifiedTopology: true});
io.listen(socketPort);

app.delete('/tickets/:id', async (req, res) => {
    console.log('Gonna delete ticket with ID: ' + req.params.id);
    res.send(req.params.id);
    await Ticket.deleteOne({id: req.params.id}, function (err) {
        if (err) console.log(err);
    });
});

app.post('/tickets', (req, res) => {
    console.log(req.method + '\n Received ticket: ' + JSON.stringify(req.body));
    let ticket = new Ticket(req.body);
    
    // saving ticket to db
    ticket.tags.push({title: 'Tech Debt', color: 'white', bgcolor: '#0079BF'});
    ticket.save();

    // emitting ticket via socket to frontend
    io.emit('new ticket');
    return res.status(201).send(
        req.body
    )
});

app.get('/tickets', async (req, res) => {
    let tickets = await Ticket.find();
    return res.status(200).send(tickets);
});

app.listen(port, console.log("Running on Port: " + port));
