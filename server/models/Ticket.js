const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
    id: String,
    title: String,
    description: String,
    metadata: String,
    laneId: String,
    style: Object,
    tags: Object,
    label: String,
    sprintEndDate: String,
    ticketType: String,
    archived: {
        type: Boolean,
        default: false
    },
    hasJiraLink: {
        type: Boolean,
        default: false
    }
});

let Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;