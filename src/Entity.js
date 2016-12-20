//Entity.js//

/**
 * @description - Defines an entity-- which is essentially a bag of components
 * @author - Samuel Faulkner
 */

class Entity {
  constructor(manager) {
    this._manager = manager;
    if (!this._manager) {
      throw "'manager' must be defined!";
    }
    this._components = {};
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

  _setHash(value) {
    this._hash = value;
    //reset the hash value in each component 
    for (var componentName in this._components) {
      this._components[componentName].entity = value;
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
    this._components[component.name] = {
      'state': Object.assign({}, component.state),
      'init': component.init,
      'remove': component.remove
    }

    if (this._manager) {
      this._manager._addToComponentList(component.name, this.hash());
      this._manager
        ._invalidateProcessorListsByEntityComponent(this.hash(), component.name);

      if (this._components[component.name].init)
        this._components[component.name]
          .init(this._components[component.name].state, this._manager);
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
    if (!(name in this._components)) {
      throw "'" + name + "' isn't a component of this entity!";
    }
    return this._components[name];
  }

  /**
   * @description - Deletes a component from the entity
   * @param {String} name - the name of the component to be deleted
   */
  removeComponent(name) {
    if (!(name in this._components)) {
      throw "'" + name + "' isn't a component of this entity!";
    }

    if (this._components[name].remove)
      this._components[name].remove(this._manager);

    delete this._components[name];

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
    for (var componentName in this._components) {
      components[componentName] = Object.assign({}, this._components[componentName].state);
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

module.exports = {
  Entity
};