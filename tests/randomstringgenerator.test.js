//randomstringgenerator.test.js//

/**
 * @description - Tests the random string generator function
 * @author - Samuel Faulkner
 */

const path = require('path');
const utils_path = path.resolve(__dirname, "..", "src", "utils");

test("Random string generation", () => {
  const randomString = require(path.resolve(utils_path, "RandomStringGenerator.js"));

  expect(randomString()).toEqual("");
  expect(randomString(0)).toEqual("");
  expect(randomString(5).length).toEqual(5);
});