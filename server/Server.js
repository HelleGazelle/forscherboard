const express = require('express');
const Ticket = require('./models/Ticket');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);
const axios = require('axios');
require('dotenv').config();

const JIRA_URL = 'https://pm.tdintern.de/jira/rest';
const API_PORT = 8001;
const SOCKET_PORT = 8002;
const MONGO_ENDPOINT = 'mongodb://127.0.0.1:27017/tickets';
let session_cookie;

app.use(bodyParser.json({limit: '16mb'}));
app.use(cors());

// connect to db
mongoose.connect(MONGO_ENDPOINT, { useNewUrlParser: true , useUnifiedTopology: true, useFindAndModify: false});

// connect socket
io.listen(SOCKET_PORT);

const auth = async () => {
    if(process.env.JIRA_API_USERNAME && process.env.JIRA_API_PASSWORD) {
        let session = await axios.post(JIRA_URL + '/auth/1/session', {
            username: process.env.JIRA_API_USERNAME,
            password: process.env.JIRA_API_PASSWORD
        })
        session_cookie = session.data.session;
        
    }
}

// set the session cookie for requests to JIRA
auth();

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
    createCardFromJiraTicket(newTicket);
    next();
})

// MongoDB methods

// DB: DELETE
const deleteTicket = (ticketId) => {
    Ticket.deleteOne({id: ticketId}, function (err) {
        if (err) console.log(err);
    });
    return ticketId;
}

// DB: ADD
const addTicket = async (ticketToAdd) => {
    let ticket = new Ticket(ticketToAdd);
    ticket.style = getCardStylingAndType(ticketToAdd.title).styling;
    ticket.ticketType = getCardStylingAndType(ticketToAdd.title).type;
    
    // request jira API for ticket description
    let descriptionFromJira = await getJiraDescription(ticket);

    if (descriptionFromJira !== '') {
        ticket.description = descriptionFromJira;
        ticket.hasJiraLink = true;
    }

    /* 
    This only matters from tickets retreived from JIRA:
    mongoose creates an unique id and stores it in the '_id' field of the ticket. 
    Save it to the 'id' field of the card as the fronend tries to reach out for this particular property 
    */
    if (!ticketToAdd.hasOwnProperty('id') && ticketToAdd.hasOwnProperty('_id')) {
        ticket.id = ticket._id;
    }
    ticket.save();
    return ticket;
}

// DB: UPDATE
const updateTicketLane = (updatedCard) => {
    Ticket.findOneAndUpdate({id: updatedCard.cardId}, {laneId: updatedCard.toLaneId}, function (err, res) {
        if(err) console.log(err);
    });
}

// socket connection handling
io.on('connection', async (socket) => {
    console.log('someone connected');
    socket.emit('load initial data', await buildInitalData());
    
    // if a card was added
    socket.on('card to db', async (newCard) => {
        console.log('Gonna add card: ' + newCard.card.title);

        let addedTicket = await addTicket({
            id: newCard.card.id,
            title: newCard.card.title,
            description: newCard.card.description,
            laneId: newCard.laneId
        });

        // emit ticket to all subscribers
        socket.broadcast.emit('new card', addedTicket);

        // emit ticket to yourself to get the styled one
        socket.emit('new card', addedTicket);
    });

    // if a card was deleted
    socket.on('delete card from db', (cardToDelete) => {
        console.log('Gonna delete card: ' + cardToDelete.cardId);
        deleteTicket(cardToDelete.cardId);
        // emit ticket to all subscribers
        socket.broadcast.emit('card deleted', cardToDelete);
    });

    // if a card lane was updated
    socket.on('move card', (updatedCard) => {
        console.log('Gonna update card: ' + updatedCard.cardId);
        updateTicketLane(updatedCard);

        // emit ticket to all subscribers
        socket.broadcast.emit('card moved', updatedCard);
    });

    socket.on('finish sprint', async () => {
        let ticketsInDone = await Ticket.find({laneId: 'done', archived: false});
        let today = new Date();
        let sprintEndDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        ticketsInDone.forEach(ticket => {
            ticket.sprintEndDate = sprintEndDate;
            ticket.archived = true;
            ticket.save();
            socket.emit('card deleted', ticket);
            socket.broadcast.emit('card deleted', ticket);
        });
        console.log('finished sprint');
    })

    socket.emit('load archiv', await loadArchivData());
    
    socket.on('disconnect', () => {
        console.log('someone disconnected');
    })
});

// build up initial data for frontend
const buildInitalData = async () => {
    // get a deep copy of the sceleton to avoid persistance of data
    let sceleton = JSON.parse(JSON.stringify(boardSceleton));

    // load tickets from db
    let initialTickets = await Ticket.find({archived: false});

    sceleton.lanes.forEach((lane) => {
        initialTickets.forEach(ticket => {
            if(lane.id === ticket.laneId) {
                lane.cards.push(ticket);
            }
        })
    });
    return sceleton;
}

const loadArchivData = async () => {
    let archivedTickets = await Ticket.find({archived: true});
    return archivedTickets;
}

// Apply certain styling to tickets which depends on their title
const getCardStylingAndType = (title) => {
    let titleWithLettersOnly = title.replace(/[^a-zA-Z]+/g, '');
    switch(titleWithLettersOnly.toUpperCase()) {
        case 'ADMIN':
            return {
                styling: {backgroundColor: 'Gold'},
                type: 'Admin'
            };
        case 'GSUITE':
            return {
                styling: {backgroundColor: 'OrangeRed'},
                type: 'Gsuite'
            };
        case 'FE':
            return {
                styling: {backgroundColor: 'Lime'},
                type: 'FE'
            };
        default:
            return {
                styling: {backgroundColor: 'DeepSkyBlue '},
                type: "Customer"
            };
    }
}

// Check if ticket is relevant for forscherboard: Is it on admin board? Has it an admin label?
const createCardFromJiraTicket = async(jiraTicket) => {
    let issue = jiraTicket.issue;
    let labels = issue.fields.labels;
    let description = 'Owner: ' + jiraTicket.user.displayName + '\n' + 'Description: ' + issue.fields.summary;

    // check if ticket is in project: "Forschung & Entwicklung" which has project id: 10400
    if(issue.fields.project.id === '10400' || labels.includes('admin') || labels.includes('fe')) {
        // is ticket already in db? Check if ticket has been removed
        if(await doesTicketExist(issue)) {
            return false;
        }
        console.log('Gonna add card: ' + issue.key);
        let addedTicket = addTicket({
            title: issue.key, 
            description: description, 
            laneId: 'extern', 
            tags: criticalOrBlocker(issue),
        });

        // emit ticket to all subscribers
        io.emit('new card', addedTicket);
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

// Check for critical or blocker status
const criticalOrBlocker = (issue) => {
    let priority = issue.fields.priority.name;
    if(priority === 'Critical' || priority === 'Blocker') {
        return [{title: priority, color: 'white', bgcolor: 'red'}];
    }
    return [];
}

const getJiraDescription = async (ticket) => {
    try {
        let freshTicket = await axios.get(JIRA_URL + '/api/2/issue/' + ticket.title, {headers: {Cookie: `${session_cookie.name}=${session_cookie.value}`}});
        if(freshTicket.status === 200) {
            return freshTicket.data.fields.description.slice(0, 100) + '...read more.';
        }
    } catch(error) {
        console.log('no corresponding jira ticket found for ticket:' + ticket.title);
        // console.log(error);
        return '';
    }
}

app.listen(API_PORT, console.log("Running on Port: " + API_PORT));
