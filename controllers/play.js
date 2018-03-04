
const Album = require('../models/Album.js');

/**
 * GET /
 * Play page.
 */
exports.getPlay = (req, res) => {
  //query all locations and give them to the rendering function
  console.log(req.params);
  Album.findById( req.params.id, function (err, album) {
    if(err){
      console.error(err);
      return;
    }
    console.log(JSON.stringify(album));


    res.render('play/play', {
        album: album
    });
  });

};
