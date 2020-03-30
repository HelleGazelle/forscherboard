const express = require('express');
const Ticket = require('./models/Ticket');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
var helmet = require('helmet');
let session = require('cookie-session');
const app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);
const axios = require('axios');
const path = require('path'); 
require('dotenv').config({ path: path.join(__dirname, '.env') });
const session_keys = require('keygrip')([process.env.SESSION_KEY1, process.env.SESSION_KEY2]);
const {idp, sp} = require('./GoogleSamlConfig');

const JIRA_URL = process.env.JIRA_REST_URL;
const API_PORT = 8001;
const SOCKET_PORT = 8002;
const MONGO_ENDPOINT = 'mongodb://127.0.0.1:27017/tickets';
const FORSCHERBOARD_GOING_LIVE_DATE = '2020-01-25T00:00:00.000+0100';
let jira_session;
const session_hash = session_keys.sign(process.env.SESSION_SECRET)

app.use(bodyParser.json({limit: '16mb'}));
app.use(bodyParser.urlencoded({
    extended: true
  }));

app.use(cors());
app.use(helmet());

// connect to db
mongoose.connect(MONGO_ENDPOINT, { useNewUrlParser: true , useUnifiedTopology: true, useFindAndModify: false});

// connect socket
io.listen(SOCKET_PORT);

// create user session and set cookies
var expiryDate = new Date( Date.now() + 60 * 60 * 1000 ); // 1 hour
app.use(session({
  name: 'session',
  keys: session_keys,
  cookie: { 
      secure: true,
      httpOnly: true,
      domain: 'forscherboard.tdintern.de',
      expires: expiryDate
    }
  })
);

const getJiraSession = () => {
    return new Promise(async (resolve, reject) => {
        if(process.env.JIRA_API_USERNAME && process.env.JIRA_API_PASSWORD) {
            try{
                let session = await axios.post(JIRA_URL + '/auth/1/session', {
                    username: process.env.JIRA_API_USERNAME,
                    password: process.env.JIRA_API_PASSWORD
                })
                resolve(jira_session = session.data.session);
            } catch(error) {
                reject(console.log('Could not authenticate to jira: ' + error));
            }
        }
        else {
            reject(console.log('No JIRA API credentials found. Please create .env file.'));
        };
    })
}

// auth user
app.get("/authenticate", function(req, res) {
    if(cookieAuth(req.sessionCookies.keys)) {
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
});

const cookieAuth = (keys) => {
    return keys.verify(process.env.SESSION_SECRET, session_hash)
}

// Endpoint to retrieve metadata
app.get("/metadata.xml", function(req, res) {
    res.type('application/xml');
    res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function(req, res) {
    sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
      if (err != null)
        return res.setStatus(500);
      res.redirect(login_url);
    });
});
   
// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
    var options = {request_body: req.body};
    sp.post_assert(idp, options, function(err, saml_response) {
        if (err) {
            return res.sendStatus(500);
        }
        
        if(saml_response.user.attributes.abteilung.includes('Forschung & Entwicklung') && cookieAuth(req.sessionCookies.keys)) {
            res.redirect('/');
        } else {
            res.sendStatus(401).send('Not permissions to access this site.');
        }
    });
});


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
    
    // request jira API for ticket description and link
    let descriptionFromJira = await getJiraDescription(ticket);

    if (descriptionFromJira !== '') {
        ticket.description = descriptionFromJira;
        ticket.title = ticket.title.toUpperCase();
        ticket.hasJiraLink = true;
    }

    // add date to description
    ticket.label = ticketToAdd.createdAt;

    /* 
    This only matters from tickets retreived from JIRA:
    mongoose creates an unique id and stores it in the '_id' field of the ticket. 
    Save it to the 'id' field of the card as the fronend tries to reach out for this particular property 
    */      
    ticket.id = ticket._id;
    ticket.save();

    // emit ticket to all subscribers
    io.emit('new card', ticket);
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
        // is ticket already in db?
        if(await doesTicketExist(newCard.card.title)) {
            console.log('Ticket already exists: ' + newCard.card.title);
            io.emit('ticket already exists', newCard.card.title);
            return false;
        }
        console.log('Gonna add card: ' + newCard.card.title);

        // adding date to ticket
        let today = new Date();

        await addTicket({
            id: newCard.card.id,
            title: newCard.card.title,
            description: newCard.card.description,
            laneId: newCard.laneId,
            createdAt: today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate(),
        });
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
    let upperCaseTitle = titleWithLettersOnly.toUpperCase();
    if(upperCaseTitle.includes('ADMIN')) {
        return {
            styling: {backgroundColor: 'Gold'},
            type: 'Admin'
        };
    } else if(upperCaseTitle.includes('GSUITE') || upperCaseTitle.includes('ATLASSIAN')) {
        return {
            styling: {backgroundColor: 'Orange'},
            type: 'Gsuite'
        };
    } else if(upperCaseTitle.includes('FE')) {
        return {
            styling: {backgroundColor: 'LawnGreen'},
            type: 'FE'
        };
    } else if(upperCaseTitle.includes('MEETING')) {
        return {
            styling: {backgroundColor: 'DeepPink'},
            type: 'Meeting'
        };
    } else if(upperCaseTitle.includes('BLOODSTREAM') || upperCaseTitle.includes('BS')) {
        return {
            styling: {backgroundColor: 'FireBrick', color: 'White'},
            type: 'Bloodstream'
        };
    }
    return {
        styling: {backgroundColor: 'DeepSkyBlue '},
        type: "Customer"
    };  
}

// Check if ticket is relevant for forscherboard: Is it on admin board? Has it an admin label?
const createCardFromJiraTicket = async(jiraTicket) => {
    let issue = jiraTicket.issue;
    let labels = issue.fields.labels;
    let description = 'Owner: ' + issue.fields.reporter.displayName + '\n' + 'Description: ' + issue.fields.summary;
    
    // get creation date 
    let currentDate = new Date(Date.parse(issue.fields.created)),d = currentDate.getDate(),m = currentDate.getMonth(),y = currentDate.getFullYear();
    let ticketCreationDate = y + '-' + m + "-" + d;

    // is ticket already in db?
    if(await doesTicketExist(issue.key)) {
        console.log('Ticket already exists: ' + issue.key);
        return false;
    }

    // check if ticket is in project: "Forschung & Entwicklung" which has project id: 10400 
    if(issue.fields.project.id === '10400' || issue.fields.project.id === '14801' || labels.includes('admin') || labels.includes('fe') ) {
        // check if ticket is NOT an EPIC
        if(issue.fields.issuetype.name !== 'Epic') {
            // check if ticket is too old for forscherboard to avoid the maintainance of outdated tickets
            if(issue.fields.created <= FORSCHERBOARD_GOING_LIVE_DATE) {
                console.log('Ticket is outdated: ' + issue.key);
                return false;
            }
            console.log('Gonna add card: ' + issue.key);
            addTicket({
                title: issue.key, 
                description: description, 
                laneId: 'extern', 
                tags: criticalOrBlocker(issue),
                hasJiraLink: true,
                createdAt: ticketCreationDate
            });
            return true;
        }
    return false;
    }
}

// Check if the ticket exists already
const doesTicketExist = async (ticketTitle) => {
    let ticket = await Ticket.find({title: ticketTitle});
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
        await getJiraSession();
        let freshTicket = await axios.get(JIRA_URL + '/api/2/issue/' + ticket.title, {headers: {Cookie: `${jira_session.name}=${jira_session.value}`}});
        // check for valid response
        if(freshTicket.status === 200) {
            let description = 'Owner: ' + freshTicket.data.fields.reporter.displayName + '\n' + 'Description: ' + freshTicket.data.fields.summary;
            return description;
        }
        else {
            console.log('no corresponding jira ticket found for ticket: ' + ticket.title);
        }
    } catch(error) {
        // console.log(error);
        return '';
    }
}

app.listen(API_PORT, console.log("Running on Port: " + API_PORT));
