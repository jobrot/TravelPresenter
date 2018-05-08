const mongoose = require('mongoose');


const imageSchema = new mongoose.Schema({
    filename: String,
    id: String,
    lat: Number,
    lng: Number,
    rotation: Number,
    thumbnail: String,
    thumbnailLink: String,
    createdTime: Date
});

const Image = mongoose.model('Image', imageSchema);

module.exports.schema = imageSchema;
module.exports.image = Image;