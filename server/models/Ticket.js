const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
    id: String,
    title: String,
    description: String,
    label: String,
    metadata: String,
    tags: [{title: String, color: String, bgcolor: String}],
});

let Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;