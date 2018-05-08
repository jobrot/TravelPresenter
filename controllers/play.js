
const Album = require('../models/Album.js');
const User = require('../models/User.js');
const passportConfig = require('../config/passport');
/**
 * GET /
 * Play page.
 */
exports.getPlay = (req, res) => {
  //query all locations and pass them to the rendering function

  //if email exists in req, it is used, otherwise a dash is used
  var mail ="-";
  if(req.user){
    mail = req.user.email;
  }

  Album.findOne({$or:[{_id: req.params.id, ownerMail: mail}, {_id: req.params.id, shared: true}]}, function (err, album) {
    if(err){
        res.render('play/play', {
            album: album,
            error: "The Presentation could not be played."
        });
        return;
    }
    if(!album){
        if(mail =="-"){
            res.render('play/play', {
                album: album,
                error: "The Presentation you requested was not shared by the Owner."
            });
        }
        else{
            res.render('play/play', {
                album: album,
                error: "The Presentation you requested does not exist or was not shared with you by the Owner."
            });
        }
        return;
    }

    res.render('play/play', {
        album: album
    });
  });
};