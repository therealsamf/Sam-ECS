//processor.test.js//

/** 
 * @description - Tests the Processor.js file
 * @author - Samuel Faulkner
 */

const path = require('path');
const source_path = path.resolve(__dirname, "..", "src");

//user imports
const { Manager } = require(path.resolve(source_path, "Manager.js"));


test("Creation of an empty processor", () => {
  const { Processor } = require(path.resolve(source_path, "Processor.js"));

  // can't instantiate directly
  expect(() => { var processor = new Processor(); }).toThrow();

  class RenderProcessor extends Processor {
    update(entities) {
      //do stuff
    }

    getComponentNames() {
      return new Set(['Render']);
    }
  }

  var renderProcessor = new RenderProcessor('RenderProcessor');

});
