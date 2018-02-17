
const Album = require('../models/Album.js');

/**
 * GET /
 * Creation page.
 */
exports.getCreation = (req, res) => {
  //query all locations and give them to the rendering function
  console.log(req.params);
  Album.findById( req.params.id, function (err, album) {
    if(err){
      console.error(err);
      return;
    }
    console.log(album);


    res.render('creation/creation', {
        album: album
    });
  });

};
