
const Album = require('../models/Album.js');
const User = require('../models/User.js');
const passportConfig = require('../config/passport');
/**
 * GET /
 * Play page.
 */
exports.getPlay = (req, res) => {
  //query all locations and give them to the rendering function
  console.log("HierParams");
  console.log(req);
  Album.findById( req.params.id, function (err, album) {
    if(err){
      console.error(err);
      return;
    }
    console.log(JSON.stringify(album));
    passportConfig.refreshAccessToken(req.user._id, accessToken =>  {
        if(err){
            console.error(err);
            return;
        }
        //console.log("accesstoken "+token);
        res.render('play/play', {
            album: album,
            accessToken: accessToken
        });
    });
  });

};
