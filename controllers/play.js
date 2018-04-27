
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

  //if email exists in req, it is used, otherwise a dash is used
  var mail ="-";
  if(req.user){
    mail = req.user.email;
  }

  Album.findOne({$or:[{_id: req.params.id, ownerMail: mail}, {_id: req.params.id, shared: true}]}, function (err, album) {
    if(err){
      console.error(err);
      return;
    }
    //passportConfig.refreshAccessToken(req.user._id, accessToken =>  { //TODO possibly unneccessary
        if(err){
            console.error(err);
            return;
        }
        //console.log("accesstoken "+token);
        res.render('play/play', {
            album: album,
            //accessToken: accessToken
        });
    //});
  });

};


/**
 * GET /
 * Play page of a shared album, publicly available.
 */
/*
exports.getSharedPlay = (req, res) => {
    //query all locations and give them to the rendering function
    Album.findOneAndUpdate({_id: req.params.id, shared: true}, (err, album) => {
        if(err){
            console.error(err);
            return;
        }

        //console.log("accesstoken "+token);
        res.render('play/play', {
            album: album
        });

    });

};*/
