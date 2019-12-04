const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
    id: String,
    title: String,
    description: String,
    label: String,
    metadata: String,
    laneId: String,
    style: Object,
    label: Number
});

let Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;