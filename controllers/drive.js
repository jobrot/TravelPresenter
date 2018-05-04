
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

    /*
     passportConfig.refreshAccessToken(req.user._id, function (refreshedaccessToken) {
     downloadMetadataAndCreateAlbum(refreshedaccessToken, req.body.pickerresults, req.user.email,  res);
     });
     */ //TODO may need this
    downloadMetadataAndCreateAlbum(req.user.accessToken, req.body.pickerresults, req.user.email,  res);

};



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
                else {
                    var image = new Image();
                    image.id = metadata.id;
                    image.position = index;
                    image.filename = metadata.name;
                    if (!metadata.imageMediaMetadata || !metadata.imageMediaMetadata.location) {
                        console.error("The image " + metadata.name + " does not posess geographic location!");
                        errors.push("The image " + metadata.name + " does not posess geographic location!\n");
                    }
                    else{
                        image.lat = metadata.imageMediaMetadata.location.latitude;
                        image.lng = metadata.imageMediaMetadata.location.longitude;
                        image.rotation = metadata.imageMediaMetadata.rotation;
                    }
                    //Converting from Google Format (2017:09:29 11:04:42) to ISO Date 2017-09-29T11:04:42Z
                    image.createdTime = new Date(metadata.imageMediaMetadata.time.replace(":","-").replace(":","-").replace(" ","T")+"Z");


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

        album.images.sort((a,b) => {
            return b.createdTime-a.createdTime;
        });
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
            warning: "Some of the images you provided have no geographic location. They have been marked in yellow. Pin them manually to add them to the presentation." + errors
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
