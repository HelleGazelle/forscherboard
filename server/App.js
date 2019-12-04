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
const socketPort = 80;
const dbUrl = 'mongodb://127.0.0.1:27017/tickets';

const boardSceleton = 
{
    lanes: [
        {
            id: 'extern',
            title: 'Externe Tickets',
            cards: []
        },
        {
            id: 'backlog',
            title: 'Backlog',
            cards: []
        },
        {
            id: 'planned',
            title: 'Planned',
            cards: []
        },
        {
            id: 'doing',
            title: 'Doing',
            cards: []
        },
        {
            id: 'onhold',
            title: 'On Hold',
            cards: []
        },
        {
            id: 'done',
            title: 'Done',
            cards: []
        }
    ]
};

mongoose.connect(dbUrl, { useNewUrlParser: true , useUnifiedTopology: true, useFindAndModify: false});
io.listen(socketPort);

// express middleware
app.post('/api/ticket', (req, res, next) => {
    let newTicket = req.body;
    console.log(newTicket);
    res.status(201).send('Saved ticket');
})

// socket connection handling
io.on('connection', async (socket) => {
    console.log('someone connected');
    socket.emit('load initial data', await buildInitalData());
    
    // if a card was added
    socket.on('card to db', (newCard) => {
        console.log('Gonna add card: ' + newCard.card.title);
        let ticket = new Ticket(newCard.card);
        ticket.laneId = newCard.laneId;
        ticket.style = adjustCardStyling(newCard.card.title);

        // save ticket to db
        ticket.save();
        // emit ticket to all subscribers
        socket.broadcast.emit('new card', ticket);
        // emit ticket to yourself to get the styled one
        socket.emit('new card', ticket);
    });

    // if a card was deleted
    socket.on('delete card from db', (cardToDelete) => {
        console.log('Gonna delete card: ' + cardToDelete.cardId);
        Ticket.deleteOne({id: cardToDelete.cardId}, function (err) {
            if (err) console.log(err);
        });
        // emit ticket to all subscribers
        socket.broadcast.emit('card deleted', cardToDelete);
    });

    // if a card lane was updated
    socket.on('update lane', (updateCard) => {
        console.log('Gonna update card: ' + updateCard.cardId);
        Ticket.findOneAndUpdate({id: updateCard.cardId}, {laneId: updateCard.toLaneId}, function (err, res) {
            if(err) console.log(err);
        });
        // emit ticket to all subscribers
        socket.broadcast.emit('card updated', updateCard);
    });
    
    socket.on('disconnect', () => {
        console.log('someone disconnected');
    })
});

// build up initial data for frontend
const buildInitalData = async () => {
    // get a deep copy of the sceleton to avoid persistance of data
    let sceleton = JSON.parse(JSON.stringify(boardSceleton));

    // load tickets from db
    let initialTickets = await Ticket.find();

    sceleton.lanes.forEach((lane) => {
        initialTickets.forEach(ticket => {
            if(lane.id === ticket.laneId) {
                lane.cards.push(ticket);
            }
        })
    });
    return sceleton;
}

// Apply certain styling to tickets which depends on their title
const adjustCardStyling = (title) => {
    let titleWithLettersOnly = title.replace(/[^a-zA-Z]+/g, '');
    switch(titleWithLettersOnly.toUpperCase()) {
        case 'ADMIN':
            return {backgroundColor: 'Gold'};
        case 'GSUITE':
            return {backgroundColor: 'OrangeRed'};
        case 'FE':
            return {backgroundColor: 'Lime'};
        default:
            return {backgroundColor: 'DeepSkyBlue '};
    }
}

app.listen(port, console.log("Running on Port: " + port));
