//RandomStringGenerator.js//

/**
 * @description - Returns a random string of a given length
 * @param {int} length - length of the string
 * @return {String} - random string of given length
 */

//node imports
const Set = require('collections/set.js');

//constants
const previousStrings = new Set(),
  possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

var fun = (length = 1) => {
  var text = "";
  while (text.length < length || previousStrings.has(text)) {
    text = "";
    
    for (var i = 0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  previousStrings.add(text);
  return text;
};

module.exports = fun;