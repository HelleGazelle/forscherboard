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
const dbUrl = 'mongodb://127.0.0.1:27017/tickets';

mongoose.connect(dbUrl, { useNewUrlParser: true , useUnifiedTopology: true});
io.listen(800);

app.delete('/tickets/:id', async (req, res) => {
    res.send(req.params.id);
    await Ticket.deleteOne({id: req.params.id}, function (err) {
        if (err) console.log(err);
    });
});

app.post('/tickets', async (req, res) => {
    console.log('Received ticket with title: ' + req.body.title);
    let ticket = new Ticket(req.body);
    ticket.save();
    io.emit('new ticket', {data: req.body});
    return res.status(201).send({
        title: req.body
    })
});

app.get('/tickets', async (req, res) => {
    let tickets = await Ticket.find();
    return res.status(200).send(tickets);
});

app.listen(port, console.log("Running on Port: " + port));
