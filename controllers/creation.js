
const Album = require('../models/Album.js');

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