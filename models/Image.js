const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    filename: String,
    thumbnail: Buffer
});

const Image = mongoose.model('Image', imageSchema);
module.exports = Image;