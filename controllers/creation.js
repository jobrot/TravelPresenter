/**
 * GET /
 * Creation page.
 */
exports.getCreation = (req, res) => {
  //query all locations and give them to the rendering function
  res.render('creation', {
    title: 'Creation'
  });
};
