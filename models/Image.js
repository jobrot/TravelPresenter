const mongoose = require('mongoose');


const imageSchema = new mongoose.Schema({
    filename: String,
    id: String,
    position: Number,
    lat: Number,
    lng: Number,
    thumbnail: String,
    createdTime: Date
});

const Image = mongoose.model('Image', imageSchema);

module.exports.schema = imageSchema;
module.exports.image = Image;