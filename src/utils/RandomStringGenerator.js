//RandomStringGenerator.js//

/**
 * @description - Returns a random string of a given length
 * @param {int} length - length of the string
 * @return {String} - random string of given length
 */
module.exports = (length = 0) => {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};