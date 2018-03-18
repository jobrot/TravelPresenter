
const Album = require('../models/Album.js');

/**
 * GET /
 * Creation page.
 */
exports.getCreation = (req, res) => {
  //query all locations and pass them to the rendering function
  console.log(req.params);
  Album.findById( req.params.id, function (err, album) {
    if(err){
      console.error(err);
      return;
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
 * POST /
 * Persist a Creation
 */
exports.postCreation = (req, res) => {
    console.log("postCreation");
    if(!req.body.album) return res.send(400, { error: "No Album included in Request Body" });

    //query all locations and give them to the rendering function
    console.log(req.body.album);
    Album.findOneAndUpdate({_id: req.body.album._id}, req.body.album, (err, doc) =>{
      if(err){
        console.error(err);
         return res.send(500, { error: err });
      }
      return res.send("succesfully saved");
    });

};