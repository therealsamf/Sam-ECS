//ComponentManager.js//

/**
 * @description - Manager responsible for component generator functions
 * and creating entities from those component generator functions
 * @author - Sam Faulkner
 */

//node imports
const Dict = require('collections/dict.js');

//user imports
const Entity = require('./Entity.js');

class ComponentManager {
  constructor(stateManager) {
    this._stateManager = stateManager;

    this._componentLibrary = new Dict();

  }

  createComponent(name, args) {
    if (!this._componentLibrary.has(name)) {
      throw new TypeError("Can't create component: '" + name + "'!");
    }

    var generatorFunction = this._componentLibrary.get(name);
    return generatorFunction(args);
  }

  /**
   * @description - Adds a component and generator function to the
   * component library
   * @param {String} componentName - the name of the component to add
   * @param {Function} generatorFunction - function that defines the
   * component to be returned given arguments
   */
  addComponentToLibrary(componentName, generatorFunction) {
    this._componentLibrary.set(componentName, generatorFunction);
  }

  /**
   * @description - Removes the component from the library
   * @param {String} componentName - the component generator function to remove
   */
  removeComponentFromLibrary(componentName) {
    if (!this._componentLibrary.has(componentName)) {
      throw new TypeError(componentName + " isn't in the component library!");
    }

    this._componentLibrary.delete(componentName);
  }

  /**
   * @description - Creates an entity from a list of component
   * objects
   * @param {Array} componentList - the list of component objects that
   * describe the name of the component and the arguments to pass to the
   * generator function
   * @param {String} hashValue - optional parameter for making an entity
   * with a predefined hash value
   * @returns {Entity} the entity with the components listed
   */
  createEntityFromComponents(componentList, hashValue) {
    var entity;
    if (this._stateManager)
      entity = new Entity(this._stateManager);
    else
      entity = new Entity();

    var hash = hashValue || entity.hash();

    entity._setHash(hash);
    for (var componentObject of componentList) {
      if (this._componentLibrary.has(componentObject.name)) {
        var component = this.createComponent(componentObject.name, componentObject.args);
        //assign the name because without it's not a valid component
        component.name = componentObject.name;
        //allow the component to know what entity it is attached to
        component.entity = entity.hash();
        //init, if present in the component, should be called
        entity.addComponent(component);
      }
    }

    return entity;
  }
}

module.exports = ComponentManager;