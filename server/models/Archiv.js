const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArchivSchema = new Schema({
    id: String,
    title: String,
    description: String,
    metadata: String,
    laneId: String,
    style: Object,
    label: Number,
    tags: Object
});

let Archiv = mongoose.model('Archiv', ArchivSchema);

module.exports = Archiv;