//Processor.js//

/**
 * @description - Defines a Processor's behavior. A processor 'processes' state
 * and is updated every time. Each one is defined by the type of components 
 * it updates. Example: RenderProcessor processes every RenderComponent every 
 * frame to update the render view
 * @author Samuel Faulkner
 */

class Processor {
  constructor(name, manager) {

    var functions = [
      'update', 'getComponentNames'
    ];
    for (var fun of functions) {
      if (!this[fun]) {
        throw new TypeError("'" + fun + "' function must be defined");
      }
    }
    
    this._name = name;
    this.manager = manager;
  }

  getName() {
    return this._name;
  }

  /**
   * @description - called every frame to process the logic on the given 
   * entities
   * @param {Array} entities - list of entities that intersect all of the 
   * component types that the processor was added to the manager with
   * @param {Manager} manager - Manager object itself
   */
  //abstract update(entites, manager)
}

module.exports = {
  Processor
};