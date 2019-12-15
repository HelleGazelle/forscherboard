const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArchivSchema = new Schema({
    title: String,
    description: String,
    sprintEndDate: String
});

let ArchivTicket = mongoose.model('Archiv', ArchivSchema);

module.exports = ArchivTicket;