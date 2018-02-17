
/**
 * GET /drive/images
 * Authenticate to gdrive and get a list of the images there.
 */
const Image = require('../models/Image.js').image;
const Album = require('../models/Album.js');
const User = require('../models/User.js');
const google = require('googleapis');
const fs = require('fs');
var OAuth2 = google.auth.OAuth2;
var googleAuth = require('google-auth-library');
var request = require('request').defaults({ encoding: null });
var requestpromise = require('request-promise');


const passportConfig = require('../config/passport');


exports.getImages = (req, res) => {
    console.log(req.user);
    var accessToken = passportConfig.refreshAccessToken(req.user._id, accessToken =>  {
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
    console.log(util.inspect(req.body.pickerresults));


    User.findOne({ 'email': 'jobrot94@gmail.com' }, 'refreshToken', (err, docs) => {
        //console.log(docs.tokens[0].accessToken);
        //listFiles(docs.tokens[0].accessToken);
        //download('DSC_4107.JPG',docs.tokens[0])
        //authorize(JSON.parse('{"web":{"client_id":"569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com","project_id":"travelpresenter","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://accounts.google.com/o/oauth2/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"mDsLEg9RhTqHUhY1GGMo1iMw","redirect_uris":["http://localhost:8080/auth/google/callback"]}}'), download, docs.tokens[0].accessToken);

        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2('569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com', 'mDsLEg9RhTqHUhY1GGMo1iMw', 'http://localhost:8080/auth/google/callback');
        //oauth2Client.credentials.access_token = docs.tokens[0].accessToken; //TODO change structure
        oauth2Client.credentials.refresh_token = docs.refreshToken;
        //console.log("docs");
        //console.log(docs);

        console.log("refresh token: ");
        console.log(oauth2Client.credentials.refresh_token);

        console.log("id: ");
        console.log(docs.id);
        //passportConfig.refreshAccessToken(docs.id);

        //download(oauth2Client, req.body.pickerresults);

        downloadMetadata(oauth2Client, req.body.pickerresults,  res);
        //evtl callback und dann direkt in das render rein


    });
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



function downloadMetadata (auth, pickerresults, res) {
    console.log(auth);
    var drive = google.drive('v3');

    var album = new Album();
    album.images = new Array();
    var promises = new Array();

    pickerresults.split(',').forEach(entry => {
        promises.push(new Promise(function(resolve, reject){
            drive.files.get({
                auth: auth,
                fileId: entry,
                fields: 'name, thumbnailLink, imageMediaMetadata'
            }, function (err, metadata) {
                console.log(metadata);
                if (err) {
                    console.error(err);
                    reject(err);
                }
                if(!metadata.imageMediaMetadata.location){
                    console.error("The image "+metadata.name+" does not posess geographic location and will be excluded!");
                    reject("The image "+metadata.name+" does not posess geographic location and will be excluded!");
                }
                else {
                    var image = new Image();
                    image.id = metadata.id;
                    image.filename = metadata.name;
                    image.lat = metadata.imageMediaMetadata.location.latitude;
                    image.lng = metadata.imageMediaMetadata.location.longitude;
                    image.createdTime = metadata.createdTime;
                    // console.log("image: ")
                    // console.log(image);
                    if (metadata.thumbnailLink) {
                        requestpromise.get(metadata.thumbnailLink).then( function (body) {
                            data = new Buffer(body).toString('base64');
                            image.thumbnail = data;
                            // console.log("image before pushing");
                            // console.log(image);
                            album.images.push(image);
                            resolve();
                        }).catch(function (err) {
                            console.err(err);
                            reject(err);
                        });
                    }else{
                        console.error("The image "+metadata.name+" does not have a thumbnail");
                        reject(err);
                    }
                }
        })}));
    })
    // console.log("Promises");
    // console.log(promises);
    Promise.all(promises).then(function(data) {
        album.save();
        res.redirect('/creation/'+album._id);
        // console.log("metadatas");
        // console.log(JSON.stringify(album));
    }).catch(err => console.error("An error occured with one of the metadatas: "+err));
    //TODO raise alert window of all those at once

}


// function authorize(credentials, callback, token) {
//     var clientSecret = credentials.client_secret;
//     var clientId = credentials.client_id;
//     var redirectUrl = 'http://localhost:8080/auth/google/callback';
//     var auth = new googleAuth();
//     var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
//
//     oauth2Client.credentials ={
//         access_token: token,
//         // Optional, provide an expiry_date (milliseconds since the Unix Epoch)
//         // expiry_date: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 7)
//     };
//
//     callback(oauth2Client);
// }









