
/**
 * GET /drive/images
 * Authenticate to gdrive and get a list of the images there.
 */
const Image = require('../models/Image.js').image;
const Album = require('../models/Album.js');
const User = require('../models/User.js');
const google = require('googleapis');
const fs = require('fs');
var Batchelor = require('batchelor');
var OAuth2 = google.auth.OAuth2;
var googleAuth = require('google-auth-library');
var request = require('request').defaults({ encoding: null });
var requestpromise = require('request-promise');
var base64Img = require('base64-img');


const passportConfig = require('../config/passport');


exports.getImages = (req, res) => {
    console.log(req.user);
    passportConfig.refreshAccessToken(req.user._id, accessToken =>  {
        console.log("accesstoken in drive "+accessToken);
        res.render('drive/images', { accessToken: accessToken });
    });
};


//     res.render('creation/creation', {
//         photos: metadatas
//     });
// }

exports.postImages  = (req, res) => {
    const util = require('util');

    //req.body.album.ownerMail = req.user.email; //Valid because this is verified/added by passport.js middleware

    //User.findOne({ 'email': req.user.email }, 'refreshToken', (err, docs) => { //not needed any more -> user is authenticated via passport

    //var auth= 'AIzaSyBu_4PKulFGlZtAB10E-ekucVFzm2KzSxk';

    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2('569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com', 'mDsLEg9RhTqHUhY1GGMo1iMw', 'http://localhost:8080/auth/google/callback');
    oauth2Client.credentials.refresh_token = req.user.refreshToken; //This would only be needed,


    //console.log("refresh token: ");
    //console.log(oauth2Client.credentials.refresh_token);

    //passportConfig.refreshAccessToken(req.user._id); //TODO may need this

    //download(oauth2Client, req.body.pickerresults);
                                //todo eig. oauth2client
    downloadMetadataAndCreateAlbum(req.user.accessToken, req.body.pickerresults, req.user.email,  res);
    //evtl callback und dann direkt in das render rein


    //});
};


function download (auth, pickerresults) {
    //console.log(auth);
    var drive = google.drive('v3');
    //TODO evtl make this parallel  (https://developers.google.com/drive/v3/web/batch)



    pickerresults.split(',').forEach(entry => {
        console.log("entry " + entry);
        drive.files.get({ //TODO dass könnt ich entfernen
            auth: auth,
            fileId: entry
        }, function (err, metadata) {
            if (err) {
                console.error(err);
                return process.exit();
            }

            console.log('Downloading %s...', metadata.name);

            //auth.setCredentials(tokens);

            var dest = fs.createWriteStream(metadata.name);


            console.log(drive.files.get({
                fileId: entry,
                alt: 'media',
                auth: auth
            })
                .on('error', function (err) {
                    console.log('Error downloading file', err);
                    process.exit();
                }))
               ;

            /*
            drive.files.get({
                fileId: entry,
                alt: 'media',
                auth: auth
            })
                .on('error', function (err) {
                    console.log('Error downloading file', err);
                    process.exit();
                })
                .pipe(dest);

            dest
                .on('finish', function () {
                    console.log('Downloaded %s!', metadata.name);
                    process.exit();
                })
                .on('error', function (err) {
                    console.log('Error writing file', err);
                    process.exit();
                });
                */
        });
    })

}



function downloadMetadataAndCreateAlbum (auth, pickerresults, ownerMail, res) {

    var album = new Album();
    album.images = new Array();
    var promises = new Array();
    promises.push(new Promise(resolve => setTimeout(resolve, 10000)));
    var errors = [];

    console.log("auth: "+auth)
    var batch = new Batchelor({
        'uri':'https://www.googleapis.com/batch',
        'method':'POST',
        'auth': {
            'bearer': [auth]
        },
        'headers': {
            'Content-Type': 'multipart/mixed'
        }
    });


    pickerresults.split(',').forEach((entry) => {
        batch.add({
            'method': 'GET',
            'path': '/drive/v3/files/'+entry +'/?fields=name,thumbnailLink,imageMediaMetadata,id',
            'fields': 'imageMediaMetadata'
        })
    });


    batch.run(function(err, response){
        console.log(response);
        if (err){
            console.log("Error: " + err);
            errors.push(err);
        }

        response.parts.forEach( (part, index) => {
            promises.push(new Promise(function(resolve, reject) {
                var metadata = part.body;
                console.log("metadata:");
                console.log(metadata);
                //metadata = JSON.parse(metadata);
                if (part.statusCode != '200') {
                    console.error("ERROR CODE IN RESPONSE: \n" + metadata);
                    resolve();
                }
                else if (!metadata.imageMediaMetadata || !metadata.imageMediaMetadata.location) {
                    console.error("The image " + metadata.name + " does not posess geographic location and will be excluded!");
                    errors.push("The image " + metadata.name + " does not posess geographic location and will be excluded!\n");
                    resolve();
                }
                else {
                    var image = new Image();
                    image.id = metadata.id;
                    image.position = index;
                    image.filename = metadata.name;
                    image.lat = metadata.imageMediaMetadata.location.latitude;
                    image.lng = metadata.imageMediaMetadata.location.longitude;
                    image.createdTime = metadata.createdTime;


                    if (metadata.thumbnailLink) {
                        requestpromise.get({url: metadata.thumbnailLink, encoding: "base64"}).then( function (body) {
                            //console.log("bodylog");
                            //console.log(body);
                            //body = body.replace(/^data:image\/jpg;base64,/,"");
                            //data = new Buffer(body, 'binary').toString('base64');
                            //data = body.toString('base64');

                            image.thumbnail = body;
                            //console.log("image before pushing");
                            //console.log(image);
                            album.images.push(image);
                            resolve();
                        }).catch(function (err) {
                            console.error(err);
                            errors.push(err);
                            resolve();
                        });
                    }else{
                        console.error("The image "+metadata.name+" does not have a thumbnail");
                        errors.push("The image "+metadata.name+" does not have a thumbnail!\n");
                        resolve();
                    }

                }
            }));
        });
    });

    Promise.all(promises).then(function(data) {
        album.ownerMail = ownerMail;
        album.save();
        //res.redirect('/creation/'+album._id);
        // console.log("metadatas");
        // console.log(JSON.stringify(album));

        // console.log("posting");
        // $.ajax({
        //     type: "POST",
        //     url: "/creation/"+album._id,
        //     data: {
        //         errors: errors,
        //         _csrf: "#{_csrf}"
        //     }
        // });
        if(errors.length == 0){
            errors = null;
        }

        console.log("rendering creation")
        console.log(album);
        res.render('creation/creation', {
            album: album,
            warning: errors
        });


    }).catch(err => console.error("An error occured with one of the metadatas: "+err));


    // ------------------- Old version ----------------
        /*
    console.log(auth);
    var drive = google.drive('v3');

    var album = new Album();
    album.images = new Array();
    var promises = new Array();
    var errors = [];

    pickerresults.split(',').forEach((entry, index) => {
        promises.push(new Promise(function(resolve, reject){
            drive.files.get({
                auth: auth,
                fileId: entry,
                quotaUser: Math.random(),
                fields: 'name, thumbnailLink, imageMediaMetadata'
            }, function (err, metadata) {
                console.log(metadata);
                if (err) {
                    console.error(err);
                    errors.push(err);
                    resolve();
                }
                else if(!metadata.imageMediaMetadata || !metadata.imageMediaMetadata.location){
                    console.error("The image "+metadata.name+" does not posess geographic location and will be excluded!");
                    errors.push("The image "+metadata.name+" does not posess geographic location and will be excluded!\n");
                    resolve();
                }
                else {
                    var image = new Image();
                    image.id = entry;
                    image.position = index;
                    image.filename = metadata.name;
                    image.lat = metadata.imageMediaMetadata.location.latitude;
                    image.lng = metadata.imageMediaMetadata.location.longitude;
                    image.createdTime = metadata.createdTime;
                    //console.log("metadata: ")
                    //console.log(JSON.stringify(metadata));


                    if (metadata.thumbnailLink) {
                        requestpromise.get({url: metadata.thumbnailLink, encoding: "base64"}).then( function (body) {
                            //console.log("bodylog");
                            //console.log(body);
                            //body = body.replace(/^data:image\/jpg;base64,/,"");
                            //data = new Buffer(body, 'binary').toString('base64');
                            //data = body.toString('base64');

                            image.thumbnail = body;
                            //console.log("image before pushing");
                            //console.log(image);
                            album.images.push(image);
                            resolve();
                        }).catch(function (err) {
                            console.error(err);
                            errors.push(err);
                            resolve();
                        });
                    }else{
                        console.error("The image "+metadata.name+" does not have a thumbnail");
                        errors.push("The image "+metadata.name+" does not have a thumbnail!\n");
                        resolve();
                    }
                }
        })}));
    })
    Promise.all(promises).then(function(data) {
        album.ownerMail = ownerMail;
        album.save();
        //res.redirect('/creation/'+album._id);
        // console.log("metadatas");
        // console.log(JSON.stringify(album));

        // console.log("posting");
        // $.ajax({
        //     type: "POST",
        //     url: "/creation/"+album._id,
        //     data: {
        //         errors: errors,
        //         _csrf: "#{_csrf}"
        //     }
        // });
        if(errors.length == 0){
            errors = null;
        }

        console.log("rendering creation")
        res.render('creation/creation', {
            album: album,
            warning: errors
        });


    }).catch(err => console.error("An error occured with one of the metadatas: "+err));


    */
}
