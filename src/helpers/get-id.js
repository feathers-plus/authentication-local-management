
module.exports = getId;

function getId(rec) {
  return 'id' in rec ? `${rec.id}` : `${rec._id}`;
}
