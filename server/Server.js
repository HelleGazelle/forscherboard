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

const apiPort = 8001;
const socketPort = 8002;
const mongoEndpoint = 'mongodb://127.0.0.1:27017/tickets';

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

mongoose.connect(mongoEndpoint, { useNewUrlParser: true , useUnifiedTopology: true, useFindAndModify: false});
io.listen(socketPort);

// express middleware

// JIRA endpoint for webhooks after a ticket got created or updated
app.post('/api/ticket', (req, res, next) => {
    let newTicket = req.body;
    // check request
    if(!newTicket.hasOwnProperty('issue')) {
        res.status(201).send('No valid JIRA ticket');   
        return console.log('No valid JIRA ticket');
    }
    console.log('Received ticket: ' + newTicket.issue.id);   
    res.status(201).send('Received ticket: ' + newTicket.issue.id);
    // check if the ticket should be added to the board and build a new ticket
    createNewTicket(newTicket);
    next();
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

    // if time was tracked for a card
    socket.on('track time', ({cardId, time}) => {
        console.log('Gonna track time ' + time + ' for card: ' + cardId);
        Ticket.findOneAndUpdate({id: cardId}, {$inc: {label: time}}, {new: true}, function (err, res) {
            if(err) console.log(err);
            // emit ticket to all subscribers
            socket.broadcast.emit('card updated', res);
            socket.emit('new card', res);
        });
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

// Check if ticket is relevant for forscherboard: Is it on admin board? Has it an admin label?
const createNewTicket = async(jiraTicket) => {
    let issue = jiraTicket.issue;
    let labels = issue.fields.labels;
    let description = 'Owner: ' + jiraTicket.user.displayName + '\n' + 'Description: ' + issue.fields.summary;

    // check if ticket is in project: "Forschung & Entwicklung" which has project id: 10400
    if(issue.fields.project.id === '10400' || labels.includes('admin') || labels.includes('fe')) {
        // is ticket already in db?
        if(await doesTicketExist(issue)) {
            return false;
        }
        console.log('Gonna add card: ' + issue.key);
        let ticket = new Ticket({
            title: issue.key,
            description: description,
            laneId: 'extern',
            style: adjustCardStyling(issue.key),
        });

        // mongoose creates an unique id and stores it in the '_id' field of the ticket. 
        // Save it to the 'id' field of the card as the fronend tries to reach out for this particular property
        ticket.id = ticket._id;

        // save ticket to db
        ticket.save();
        // emit ticket to all subscribers
        io.emit('new card', ticket);
        return true;
    }
    return false;
}

// Check if the ticket exists already
const doesTicketExist = async (newIssue) => {
    let ticket = await Ticket.find({title: newIssue.key});
    if(ticket.length !== 0) {
        return true;
    }
    return false;
}

app.listen(apiPort, console.log("Running on Port: " + apiPort));
