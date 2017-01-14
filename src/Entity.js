//Entity.js//

/**
 * @description - Defines an entity-- which is essentially a bag of components
 * @author - Samuel Faulkner
 */

//node imports
const Dict = require('collections/dict.js');
const isEqual = require('lodash/isEqual.js');


//user imports
const StringGenerator = require('./utils/RandomStringGenerator.js');

//constants
const HASH_LENGTH = 8;

class Entity {
  constructor(manager) {
    this._manager = manager || null;

    this._components = new Dict();
  }

  clearManager() {
    this._manager = null;
  }

  setManager(manager) {
    this._manager = manager;
  }

  hash() {
    if (this._hash === undefined) {
      this._hash = StringGenerator(8);
    }
    return this._hash;
  }

  /**
   * @description - Resets the hash value associated with this entity
   * @param {String} value - the new hash value
   */
  _setHash(value) {
    this._hash = value;
    //reset the hash value in each component 
    for (var componentName of this._components.keys()) {
      this._components.get(componentName).set(entity, value);
    }
  }

  /**
   * @description - Adds a component object to this entity
   * @param {Object} component - object denoting the component to be added.
   * must have at least two fields: 'name' and 'state'. the 'state' field also
   * must be an object
   */
  addComponent(component, notifyManager = true) {
    if (!(component.name !== undefined && component.state !== undefined && 
      typeof component.state === 'object')) {
      throw "Component must have 'name' and 'state'!";
    }

    // this should create a copy of the state
    this._components.set(component.name, new Dict({
      'state': Object.assign({}, component.state),
      'init': component.init,
      'remove': component.remove
    }));

    if (this._manager) {
      this._manager._addEntityToComponentList(this.hash(), component.name);
      if (notifyManager)
        this._manager
          ._invalidateProcessorListsByEntityComponent(this.hash(), component.name);
    }

    // var componentDict = this._components.get(component.name),
    //   initFunction = componentDict.get('init');
    // if (initFunction) {
    //   initFunction(componentDict.get('state'), componentDict);
    // }
  }

  /**
   * @description - Returns the object contianing all of the objects for this
   * entity
   * @return {Object} - contains all the entities components
   */
  getComponents() {
    return this._components;
  }

  /**
   * @description - Returns the given component's state
   * @param {String} name - the name of the component
   * @return {Object} the state of the component referred to by the given
   * name
   */
  getComponent(name) {
    if (!this._components.has(name)) {
      throw "'" + name + "' isn't a component of this entity!";
    }
    return this._components.get(name);
  }

  /**
   * @description - Deletes a component from the entity
   * @param {String} name - the name of the component to be deleted
   */
  removeComponent(name, notifyManager = true) {
    if (!this._components.has(name)) {
      throw new TypeError("'" + name + "' isn't a component of this entity!");
    }

    this.removeComponentMethod(name);

    this._components.delete(name);

    if (this._manager) {
      if (this._manager.hasComponent(name) && 
        this._manager.getEntitiesByComponent(name).has(this.hash()))
        this._manager._removeEntityFromComponentList(this.hash(), name);

      if (notifyManager) {
        this._manager._invalidateProcessorListsByEntityComponent(this.hash(), name);
      }
    }
  }

  /**
   * @description - Calls the init function on all our components
   */
  initializeComponents() {
    this._components.forEach((value, key, dict) => {
      var initFunction = value.get('init');
      if (initFunction) {
        initFunction(value.get('state'), value);
      }
    });
  }


  removeComponentsMethod() {
    this._components.forEach((value, key, dict) => {
      var removeFunction = value.get('remove');
      if (removeFunction)
        removeFunction(value);
    });
  }

  removeComponentMethod(componentName) {
    var componentObject = this._components.get(componentName);
    if (componentObject) {
      var removeFunction = componentObject.get('remove');
    
      if (removeFunction)
        removeFunction(componentObject);
    }
  }

  /**
   * @description - Calls remove component on every component
   */
  removeComponents(notifyManager) {
    for (var key of this._components.keys())
      this.removeComponent(key, notifyManager);
  }

  serialize() {
    var components = {};
    this._components.forEach((value, key, dict) => {
      components[key] = Object.assign({}, value.get('state'));
    });

    return {
      'components': components,
      'hash': this.hash()
    }
  }

  /**
   * @description - Takes the given object and implements the state
   * given
   * @param {Object} entityState - the object that represents the state
   * of the entity. Most likely generated from {@link serialize}
   */ 
  deserialize(entityState, componentManager) {
    var _this = this;
    var states = {};
    this._components.forEach((value, key, dict) => {
      states[key] = value.get('state');
      _this.removeComponent(key, false);
    });

    this._hash = entityState.hash;
    for (var componentName in entityState.components) {
      this.addComponent(componentManager.createComponent(
        componentName, 
        Object.assign({}, states[componentName], entityState.components[componentName])
      ), false);
    }
  }

  /**
   * @description - Equality check for entities
   * @param {Entity} entity - the entity to check equality against
   * @returns {Boolean} is this equivalent to the other entity
   */
  equals(entity) {
    var otherComponents = entity.getComponents();
    if (this._components.length != otherComponents.length) {
      return false;
    }
    for (var componentName of this._components.keys()) {
      if (!otherComponents.has(componentName)) {
        return false;
      }

      var otherComponent = otherComponents.get(componentName);
      if (!isEqual(this._components.get(componentName).get('state'),
        otherComponent.get('state'))) {
        return false;
      }
    }

    return true;
  }

  /**
   * @description - Clones this entity
   * @returns {Entity} the cloned entity
   */
  clone() {
    var returnEntity = new Entity();
    returnEntity._setHash(this.hash());

    this._components.forEach((value, key, dict) => {
      var componentObject = {
        'name': key,
        'state': Object.assign({}, value.get('state')),
        'init': value.get('init'),
        'remove': value.get('remove')
      };
      returnEntity.addComponent(componentObject);
    });
    return returnEntity;
  }
}

module.exports = Entity;