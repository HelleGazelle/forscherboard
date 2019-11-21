const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
    title: {type: String},
    // description: {type: String},
});

let Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;