const Image = require('../models/Image.js').image;
const Album = require('../models/Album.js');
const User = require('../models/User.js');
const passportConfig = require('../config/passport');
const google = require('googleapis');
const Batchelor = require('batchelor');
const googleAuth = require('google-auth-library');
const request = require('request').defaults({encoding: null});
const requestpromise = require('request-promise');


/**
 * GET /
 * Get Image Uploading page, update accesstoken if necessary
 */
exports.getImages = (req, res) => {
    passportConfig.refreshAccessToken(req.user._id, accessToken => {
        res.render('drive/images', {accessToken: accessToken});
    });
};

/**
 * POST /
 * create a new Album consisting of the chosen images
 */
exports.postImages = (req, res) => {
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost:8080/auth/google/callback');
    oauth2Client.credentials.refresh_token = req.user.refreshToken;
    downloadMetadataAndCreateAlbum(req.user.accessToken, req.body.pickerresults, req.user.email, res);
};

/**
 * Metadata for the given images is downloaded (batched) using the
 * provided accesstoken, and corresponding thumbnails are saved base64 encoded.
 */
function downloadMetadataAndCreateAlbum(accessToken, pickerresults, ownerMail, res) {
    var album = new Album();
    album.images = new Array();
    var promises = new Array();
    var warnings = new Array();
    var errors = new Array();

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


    pickerresults.split(',').forEach((entry) => {
        batch.add({
            'method': 'GET',
            'path': '/drive/v3/files/' + entry + '/?fields=name,thumbnailLink,imageMediaMetadata,id',
            'fields': 'imageMediaMetadata'
        })
    });

    batch.run(function (err, response) {
        if (err) {
            console.error("Error: " + err);
        }

        response.parts.forEach((part, index) => {
            //each part of the response of the batch request is put
            //in a promise to be solved
            promises.push(new Promise(function (resolve) {
                var metadata = part.body;
                if (part.statusCode != '200') {
                    console.error("ERROR CODE IN RESPONSE: \n" + metadata);
                    resolve();
                }
                else {
                    var image = new Image();
                    image.id = metadata.id;
                    image.position = index;
                    image.filename = metadata.name;
                    if (!metadata.imageMediaMetadata || !metadata.imageMediaMetadata.location) {
                        warnings.push(metadata.name);
                    }
                    else {
                        image.lat = metadata.imageMediaMetadata.location.latitude;
                        image.lng = metadata.imageMediaMetadata.location.longitude;
                        image.rotation = metadata.imageMediaMetadata.rotation;

                        //Converting from Google Format (2017:09:29 11:04:42) to ISO Date 2017-09-29T11:04:42Z
                        image.createdTime = new Date(metadata.imageMediaMetadata.time.replace(":", "-").replace(":", "-").replace(" ", "T") + "Z");
                    }

                    if (metadata.thumbnailLink) {
                        //If the image has a thumbnail, it is requested, and the
                        //request is also pushed in our list of promises
                        promises.push(requestpromise.get({
                            url: metadata.thumbnailLink,
                            encoding: "base64"
                        }).then(function (body) {
                            image.thumbnail = body;
                            album.images.push(image);
                            resolve();
                        }).catch(function (err) {
                            console.error(err);
                            errors.push(err);
                            resolve();
                        }));
                    } else {
                        console.error("The image " + metadata.name + " does not have a thumbnail");
                        errors.push("The image " + metadata.name + " does not have a thumbnail!\n");
                        resolve();
                    }
                }
            }));
        });

        //only if all promises are resolved, the execution may continue
        Promise.all(promises).then(function () {

            album.images.sort((a, b) => {
                return a.createdTime - b.createdTime;
            });
            album.ownerMail = ownerMail;
            album.save();
            if (errors.length == 0) {
                errors = null;
            }
            res.render('creation/creation', {
                album: album,
                warning: "The following Images you provided have no geographic location: " + warnings + " They have been marked in yellow. Pin them manually to add them to the presentation.\n\n" + errors
            });
        }).catch(err => console.error("An error occured with one of the metadatas: " + err));
    });
}
