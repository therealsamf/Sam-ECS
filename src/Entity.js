//Entity.js//

/**
 * @description - Defines an entity-- which is essentially a bag of components
 * @author - Samuel Faulkner
 */

const Dict = require('collections/dict.js');

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
      this._hash = this._manager.generateHash();
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
  addComponent(component) {
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
      this._manager._addToComponentList(component.name, this.hash());
      // this._manager
      //   ._invalidateProcessorListsByEntityComponent(this.hash(), component.name);
    }

    var componentDict = this._components.get(component.name),
      initFunction = componentDict.get('init');
    if (initFunction) {
      initFunction(componentDict.get('state'));
    }
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
  removeComponent(name) {
    if (!this._components.has(name)) {
      throw new TypeError("'" + name + "' isn't a component of this entity!");
    }

    var componentObject = this._components.get(name),
      removeFunction = componentObject.get('remove');
    if (removeFunction)
      removeFunction(/*this._manager*/);

    this._components.delete(name);

    if (this._manager) {
      if (this._manager.hasComponent(name) && 
        this._manager.getEntitiesByComponent(name).has(this.hash()))
        this._manager._removeHashFromComponentList(name, this.hash());

      this._manager._invalidateProcessorListsByEntityComponent(this.hash(), name);
    }
  }

  /**
   * @description - Calls remove component on every component
   */
  removeComponents() {
    for (var key in this._components)
      this.removeComponent(key);
  }

  /**
   * @description - Puts the entity into an object that can be saved
   * @return {Object} - the entity's state
   */
  _toJSON() {
    var components = {};
    for (var componentName of this._components.keys()) {
      components[componentName] = Object.assign({}, this._components.get(componentName).get('state'));
    }
    return {
      'components': components,
      'hash': this.hash()
    };
  }

  /**
   * @description - Takes the object serialized from above and restores the
   * state into this entity
   * @param {Object} obj - the state of the entity
   */
  _fromJSON(obj) {
    for (var componentName in obj.components) {
      this.addComponent({'name': componentName, 
        'state': obj.components[componentName]});
    }
    this._hash = obj.hash;
  }
}

module.exports = Entity;