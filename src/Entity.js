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

    this._components[component.name] = component.state;
    if (this._manager) {
      this._manager._addToComponentList(component.name, this.hash());
      this._manager
        ._invalidateProcessorListsByEntityComponent(this.hash(), component.name);
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
}

module.exports = {
  Entity
};