/**
 * GET /
 * Creation page.
 */
const Album = require('../models/Album.js');
const passportConfig = require("../config/passport");
const Batchelor = require('batchelor');

exports.getCreation = (req, res) => {
    //query all locations and pass them to the rendering function

    console.log("req.body");
    console.log(req.body);
    console.log({_id: req.params.id, ownerMail: req.user.email});
    Album.findOne({_id: req.params.id, ownerMail: req.user.email}, function (err, album) {
        if (err) {
            console.error(err);
            return res.status(500).send({error: err});
        }
        if (!album) {
            console.error("Album not found!");
            return res.status(404).send({error: "Album not found!"});
        }

        res.render('creation/creation', {
            album: album
        });
    });

};


/**
 * GET /
 * Creations page.
 */
exports.getCreations = (req, res) => {
    //query all locations and pass them to the rendering function
    Album.find({ownerMail: req.user.email}, function (err, albums) {
        if (err) {
            console.error(err);
            return res.status(500).send({error: err});
        }
        res.render('creation/creations', {
            albums: albums
        });
    });

};


/**
 * POST /
 * Persist a Creation
 */
exports.saveCreation = (req, res) => {
    console.log("postCreation");
    var updatedAlbum = req.body.album;
    if (!updatedAlbum) return res.status(400).send({error: "No Album included in Request Body"});


    console.log(updatedAlbum);
    Album.findOne({_id: updatedAlbum._id, ownerMail: req.user.email}, (err, doc) => {
        if (err) {
            console.error(err);
            return res.status(500).send({error: err});
        }
        if (!doc) {
            console.error("Album not found!");
            return res.status(404).send({error: "Album not found!"});
        }

        updatedAlbum.images.forEach(image => {
            doc.images.forEach(oldImage => {
                if (image.id == oldImage.id) {
                    image.thumbnail = oldImage.thumbnail;
                }
            });
        });

        Album.findOneAndUpdate({_id: updatedAlbum._id, ownerMail: req.user.email}, updatedAlbum, (err, doc) => {
            if (err) {
                console.error(err);
                return res.status(500).send({error: err});
            }
            if (!doc) {
                console.error("Album not found!");
                return res.status(404).send({error: "Album not found!"});
            }


            return res.send("succesfully saved");
        });
    });

};


/**
 * POST /
 * Update Locations of a Creation in Google Drive (not supported by Drive API, therefore unused)
 */
exports.updateLocations = (req, res) => {
    console.log("updateLocations");
    if (!req.body.album) return res.status(400).send({error: "No Album included in Request Body"});

    var batch = new Batchelor({
        'uri': 'https://www.googleapis.com/batch',
        'method': 'POST',
        'auth': {
            'bearer': [req.user.accessToken]
        },
        'headers': {
            'Content-Type': 'multipart/mixed'
        }
    });


    req.body.album.images.forEach((image) => {
        batch.add({
            'method': 'PATCH',
            'path': '/drive/v3/files/' + image.id,
            'parameters': {
                'Content-Type': 'application/json;',
                'body': {
                    "imageMediaMetadata": {
                        "location": {
                            "latitude": image.lat,
                            "longitude": image.lng
                        }
                    }
                }
            }
        })
    });


    batch.run(function (err, response) {
        console.log(response);
        if (err) {
            console.log("Error: " + err);
        }

        response.parts.forEach((part, index) => {

            var metadata = part.body;
            //console.log("metadata:");
            //console.log(metadata);
            //metadata = JSON.parse(metadata);
            if (part.statusCode != '200') {
                console.error("ERROR CODE IN RESPONSE: \n");
            }

        });
    });

};


/**
 * POST /
 * Delete a Creation
 */
exports.deleteCreation = (req, res) => {
    console.log("deleteCreation");
    if (!req.params.id) return res.status(400).send({error: "No Id included in Request Params"});

    Album.remove({_id: req.params.id, ownerMail: req.user.email}, (err1) => {
        Album.find({ownerMail: req.user.email}, function (err2, albums) {
            if (err1 || err2) {
                console.error(err1 + err2);
                res.render('creation/creations', {
                    albums: albums,
                    error: "Could not remove Presentation " + req.params.id + "!"
                });
            }
            res.render('creation/creations', {
                albums: albums,
                success: "Presentation " + req.params.id + " removed successfully."
            });
        });
    });

};


/**
 * POST /
 * Share a Creation
 */
exports.shareCreation = (req, res) => {
    console.log("shareCreation");
    if (!req.params.id) return res.status(400).send({error: "No Id included in Request Params"});

    Album.findOne({_id: req.params.id, ownerMail: req.user.email}, (err1, doc) => {
        Album.find({ownerMail: req.user.email}, function (err2, albums) {
            if (err1 || err2) {
                console.error(err1 + err2);
                res.render('creation/creations', {
                    albums: albums,
                    error: "Could not share Presentation " + req.params.id + " successfully!"
                });
            }


            console.log(doc);
            passportConfig.refreshAccessToken(req.user._id, accessToken => {


                var batch = new Batchelor({
                    'uri': 'https://www.googleapis.com/batch',
                    'method': 'POST',
                    'auth': {
                        'bearer': [accessToken]
                    },
                    'headers': {
                        'Content-Type': 'multipart/mixed'
                    }
                });


                doc.images.forEach((image) => {
                    batch.add({
                        'method': 'POST',
                        'path': '/drive/v3/files/' + image.id + '/permissions',
                        'parameters': {
                            'Content-Type': 'application/json;',
                            'body': {
                                'role': 'reader',
                                'type': 'anyone',
                                'allowFileDiscovery': false
                            }
                        }
                    });
                });

                batch.run(function (err, response) {
                    console.log(response);
                    if (err) {
                        console.error("Error: " + err);
                        res.render('creation/creations', {
                            albums: albums,
                            error: "Could not share Presentation " + req.params.id + " successfully!"
                        });
                    }

                    var noErrors = response.parts.every((part, index) => {
                        if (part.statusCode != '200') {
                            console.error("ERROR CODE IN RESPONSE: \n" + part);
                            res.render('creation/creations', {
                                albums: albums,
                                error: "Could not share Presentation " + req.params.id + " successfully! Maybe you do not posess the necessary rights for the files on Google Drive?"
                            });
                            return false;
                        }
                        return true;
                    });
                    if (noErrors) {
                        Album.findOneAndUpdate({
                            _id: req.params.id,
                            ownerMail: req.user.email
                        }, {shared: true}, (err1, doc) => {
                            albums.find(album => {
                                return album._id == req.params.id
                            }).shared = true;
                            res.render('creation/creations', {
                                albums: albums, //Veraltete version von albums
                                success: "Presentation " + req.params.id + " shared successfully.\nThe sharelink was copied to your Clipboard."
                            });
                        });
                    }
                });
            });
        });
    });
};


/**
 * POST /
 * Unshare a Creation
 */
exports.unshareCreation = (req, res) => {
    console.log("unshareCreation");
    if (!req.params.id) return res.status(400).send({error: "No Id included in Request Params"});

    Album.findOne({_id: req.params.id, ownerMail: req.user.email}, (err1, doc) => {
        Album.find({ownerMail: req.user.email}, function (err2, albums) {
            passportConfig.refreshAccessToken(req.user._id, accessToken => {
                if (err1 || err2) {
                    console.error(err1 + err2);
                    res.render('creation/creations', {
                        albums: albums,
                        error: "Could not share Presentation " + req.params.id + " successfully!"
                    });
                }

                console.log(doc);

                //doc.images


                var batch = new Batchelor({
                    'uri': 'https://www.googleapis.com/batch',
                    'method': 'POST',
                    'auth': {
                        'bearer': [accessToken]
                    },
                    'headers': {
                        'Content-Type': 'multipart/mixed'
                    }
                });


                doc.images.forEach((image) => {
                    batch.add({
                        'method': 'DELETE',
                        'path': '/drive/v3/files/' + image.id + '/permissions/anyoneWithLink',
                        'parameters': {
                            'Content-Type': 'application/json;',
                            'body': {}
                        }
                    });
                });

                batch.run(function (err, response) {
                    console.log(response);
                    if (err) {
                        console.error("Error: " + err);
                    }

                    var noErrors = response.parts.every((part) => {
                        if (part.statusCode != '204' && part.statusCode != '404') {
                            //404 in this case means, that the image in question is currently not shared by
                            //sharelink. This can e.g. occur, when an image is used in multiple Presentations, and one
                            //of those is unshared
                            console.error("ERROR CODE IN RESPONSE: \n" + part);
                            res.render('creation/creations', {
                                albums: albums,
                                error: "Could not unshare Presentation " + req.params.id + " successfully! Maybe you do not posess the necessary rights for the files on Google Drive?"
                            });
                            return false;
                        }
                        return true;
                    });
                    if (noErrors) {
                        Album.findOneAndUpdate({
                            _id: req.params.id,
                            ownerMail: req.user.email
                        }, {shared: false}, (err, doc) => {
                            albums.find(album => {
                                return album._id == req.params.id
                            }).shared = false;
                            res.render('creation/creations', {
                                albums: albums,
                                success: "Presentation " + req.params.id + " unshared successfully."
                            });
                        });
                    }
                });
            });
        });
    });
};