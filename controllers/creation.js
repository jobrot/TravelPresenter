
const Album = require('../models/Album.js');
var Batchelor = require('batchelor');

/**
 * GET /
 * Creation page.
 */
exports.getCreation = (req, res) => {
  //query all locations and pass them to the rendering function

  console.log("req.body");
  console.log(req.body);
  console.log({_id: req.params.id, ownerMail: req.user.email});
  Album.findOne( {_id: req.params.id, ownerMail: req.user.email}, function (err, album) {
    if(err){
      console.error(err);
        return res.status(500).send( { error: err });
    }
    if(!album){
        console.error("Album not found!");
        return res.status(404).send( { error: "Album not found!" });
    }
    console.log(JSON.stringify(album));
    album.images.sort((a,b) =>{
      if(a.position<b.position) return -1;
      else if (a.position>b.position) return 1;
      else return 0;
    });

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
    console.log(req.params);
    Album.find( {ownerMail: req.user.email}, function (err, albums) {
        if(err){
            console.error(err);
            return res.status(500).send( { error: err });
        }
        console.log(JSON.stringify(albums));
        // album.images.sort((a,b) =>{ //TODO evtl
        //     if(a.position<b.position) return -1;
        //     else if (a.position>b.position) return 1;
        //     else return 0;
        // });

        res.render('creation/creations', {
            owner: req.user.name,
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
    if(!req.body.album) return res.status(400).send( { error: "No Album included in Request Body" });

    Album.findOneAndUpdate({_id: req.body.album._id, ownerMail: req.user.email}, req.body.album, (err, doc) =>{
      if(err){
        console.error(err);
        return res.status(500).send( { error: err });
      }
        if(!doc){
            console.error("Album not found!");
            return res.status(404).send( { error: "Album not found!" });
        }
      return res.send("succesfully saved");
    });

};



/**
 * POST /
 * Update Locations of a Creation in Google Drive
 */
exports.updateLocations = (req, res) => {
    console.log("updateLocations");
    if(!req.body.album) return res.status(400).send( { error: "No Album included in Request Body" });

    var batch = new Batchelor({
        'uri':'https://www.googleapis.com/batch',
        'method':'POST',
        'auth': {
            'bearer': [req.user.accessToken]
        },
        'headers': {
            'Content-Type': 'multipart/mixed'
        }
    });



    req.body.album.images.forEach((image) => {
        console.log(image.position);
        batch.add({
            'method': 'PATCH',
            'path': '/drive/v3/files/'+image.id,
            'parameters':{
                'Content-Type':'application/json;',
                'body':{
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


    batch.run(function(err, response){
        console.log(response);
        if (err){
            console.log("Error: " + err);
        }

        response.parts.forEach( (part, index) => {

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
    if(!req.params.id) return res.status(400).send({ error: "No Id included in Request Params" });

    Album.remove({_id: req.params.id, ownerMail: req.user.email}, (err)=>{
        if(err){
            console.error(err);
            return res.send(500, { error: err });
        }
        return res.redirect("/creations");
    });

};


/**
 * POST /
 * Share a Creation
 */
exports.shareCreation = (req, res) => {
    console.log("shareCreation");
    if(!req.params.id) return res.status(400).send({ error: "No Id included in Request Params" });

    Album.findOneAndUpdate({_id: req.params.id, ownerMail: req.user.email}, {shared: true}, (err, doc)=>{
        if(err){
            console.error(err);
            return res.send(500, { error: err });
        }

        console.log(doc);

        //doc.images


        var batch = new Batchelor({
            'uri':'https://www.googleapis.com/batch',
            'method':'POST',
            'auth': {
                'bearer': [req.user.accessToken]
            },
            'headers': {
                'Content-Type': 'multipart/mixed'
            }
        });



        doc.images.forEach((image) => {
            console.log(image.position);
            batch.add({
                'method': 'POST',
                'path': '/drive/v3/files/'+image.id+'/permissions',
                'parameters':{
                    'Content-Type':'application/json;',
                    'body':{
                        'role': 'reader',
                        'type': 'anyone',
                        'allowFileDiscovery': false
                        }
                    }
                });
        });

        batch.run(function(err, response){
            console.log(response);
            if (err){
                console.error("Error: " + err);
            }
        });






        return res.redirect("/creations");
    });

};



/**
 * POST /
 * Unshare a Creation
 */
exports.unshareCreation = (req, res) => {
    console.log("unshareCreation");
    if(!req.params.id) return res.status(400).send({ error: "No Id included in Request Params" });

    Album.findOneAndUpdate({_id: req.params.id, ownerMail: req.user.email}, {shared: false}, (err, doc)=>{
        if(err){
            console.error(err);
            return res.send(500, { error: err });
        }

        console.log(doc);

        //doc.images


        var batch = new Batchelor({
            'uri':'https://www.googleapis.com/batch',
            'method':'POST',
            'auth': {
                'bearer': [req.user.accessToken]
            },
            'headers': {
                'Content-Type': 'multipart/mixed'
            }
        });



        doc.images.forEach((image) => {
            console.log(image.position);
            batch.add({
                'method': 'DELETE',
                'path': '/drive/v3/files/'+image.id+'/permissions/anyoneWithLink',
                'parameters':{
                    'Content-Type':'application/json;',
                    'body':{
                        
                    }
                }
            });
        });

        batch.run(function(err, response){
            console.log(response);
            if (err){
                console.error("Error: " + err);
            }
        });


        return res.redirect("/creations");
    });

};