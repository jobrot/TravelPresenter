
/**
 * GET /drive/images
 * Authenticate to gdrive and get a list of the images there.
 */
const Image = require('../models/Image.js');
const User = require('../models/User.js');
const google = require('googleapis');
//const gapi = require('https://apis.google.com/js/api.js'); //?onload=onApiLoad
var OAuth2 = google.auth.OAuth2;
var googleAuth = require('google-auth-library');

const passportConfig = require('../config/passport');


exports.getImages = (req, res) => {




    res.render('drive/images', { images: null });  //TODO accesstoken mitsenden
    //Image.find((err, docs) => {

        // var pick = require('google-picker')({
        //     clientId: '569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com',
        //     apiKey: 'AIzaSyBu_4PKulFGlZtAB10E-ekucVFzm2KzSxk'
        // });
        //
        // pick({views: ['PhotosView()']}, function(err, files) {
        //     if(err) throw err;
        //     log(files);
        // });


    //});
};


exports.postImages  = (req, res) => {
    const util = require('util');
    console.log(util.inspect(req.body.pickerresults));


    User.findOne({ 'email': 'jobrot94@gmail.com', 'tokens.kind': 'google' }, 'tokens.accessToken', (err, docs) => {
        //console.log(docs.tokens[0].accessToken);
        //listFiles(docs.tokens[0].accessToken);
        //download('DSC_4107.JPG',docs.tokens[0])
        //authorize(JSON.parse('{"web":{"client_id":"569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com","project_id":"travelpresenter","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://accounts.google.com/o/oauth2/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"mDsLEg9RhTqHUhY1GGMo1iMw","redirect_uris":["http://localhost:8080/auth/google/callback"]}}'), download, docs.tokens[0].accessToken);

        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2('569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com', 'mDsLEg9RhTqHUhY1GGMo1iMw', 'http://localhost:8080/auth/google/callback');
        oauth2Client.credentials.access_token = docs.tokens[0].accessToken; //TODO change structure
        oauth2Client.credentials.refresh_token = docs.tokens[0].refresh_token;
        console.log("id: ");
        console.log(docs.id);
        passportConfig.refreshAccessToken(docs.id);

        download(oauth2Client, req.body.pickerresults);


    });
};


//--------------------------


/**
//The Browser API key obtained from the Google API Console.
var developerKey = 'AIzaSyBu_4PKulFGlZtAB10E-ekucVFzm2KzSxk';

console.log("in images js");

// The Client ID obtained from the Google API Console. Replace with your own Client ID.
var clientId = '569072057508-jprgcdgfk6lcs2g4m0ieqftsrniuin5d.apps.googleusercontent.com'

// Scope to use to access user's photos.
var scope = ['https://www.googleapis.com/auth/drive.photos.readonly']; //https://www.googleapis.com/auth/photos      https://www.googleapis.com/auth/drive.photos.readonly	View the photos, videos and albums in your Google Photos

var pickerApiLoaded = false;
var oauthToken;

// Use the API Loader script to load google.picker and gapi.auth.
function onApiLoad() {
    console.log("onApiLoad called");
    gapi.load('auth', {'callback': onAuthApiLoad});
    gapi.load('picker', {'callback': onPickerApiLoad});
}

function onAuthApiLoad() {
    console.log("onAuthApiLoad called");
    window.gapi.auth.authorize(
        {
            'client_id': clientId,
            'scope': scope,
            'immediate': false
        },
        handleAuthResult);
}

function onPickerApiLoad() {
    console.log("onPickerApiLoad called");
    pickerApiLoaded = true;
    createPicker();
}

function handleAuthResult(authResult) {
    console.log("handleAuthResult called");
    console.log(authResult);
    if (authResult && !authResult.error) {
        oauthToken = authResult.access_token;
        createPicker();
    }
}

// Create and render a Picker object for picking user Photos.
function createPicker() {
    console.log("createPicker called");
    if (pickerApiLoaded && oauthToken) {  //google.picker.ViewId.PHOTOS  --> all photos in their albums        DOCS_IMAGES --> all photos in gdrive
        var picker = new google.picker.PickerBuilder().addView(google.picker.ViewId.DOCS_IMAGES).setOAuthToken(oauthToken).setDeveloperKey(developerKey).setCallback(pickerCallback).build();
        picker.setVisible(true);
    }
}

// A simple callback implementation.
function pickerCallback(data) {
    var url = 'nothing';
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        var doc = data[google.picker.Response.DOCUMENTS][0];
        url = doc[google.picker.Document.URL];
    }
    console.log('You picked: ' + url);

}
**/

//-------------------

//req.user.tokens.find(token => token.kind === 'google');



function download (auth, pickerresults) {
    //console.log(auth);
    var drive = google.drive('v3');
    //TODO evtl make this parallel  (https://developers.google.com/drive/v3/web/batch)



    pickerresults.split(',').forEach(entry => {
        console.log("entry " + entry);
        drive.files.get({
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

            drive.files.get({
                fileId: fileId,
                alt: 'media'
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
        });
    })

}




/**
function listFiles(auth) {
    var service = google.drive('v3');
    service.files.list({
        auth: auth,
        pageSize: 10,

        fields: "nextPageToken, files(id, name)"
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var files = response.files;
        if (files.length == 0) {
            console.log('No files found.');
        } else {
            console.log('Files:');
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                console.log('%s (%s)', file.name, file.id);
            }
        }
    });
}
 **/

function authorize(credentials, callback, token) {
    var clientSecret = credentials.client_secret;
    var clientId = credentials.client_id;
    var redirectUrl = 'http://localhost:8080/auth/google/callback';
    var auth = new googleAuth();
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);



    oauth2Client.credentials ={
        access_token: token,
        // Optional, provide an expiry_date (milliseconds since the Unix Epoch)
        // expiry_date: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 7)
    };


    callback(oauth2Client);
}









