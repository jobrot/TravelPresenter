const mongoose = require('mongoose');
const Image = require('./Image.js');


const albumSchema = new mongoose.Schema({
   // _id: String,
    ownerMail: String,
    title: String,
    playable: {
        type: Boolean,
        default: false
    },
    images: [Image.schema]
});


const Album = mongoose.model('Album', albumSchema);
module.exports = Album;

