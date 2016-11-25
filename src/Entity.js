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
    if (!(component.name !== undefined && component.state !== undefined && typeof component.state === 'object')) {
      throw "Component must have 'name' and 'state'!";
    }

    this._components[component.name] = component.state;
    this._manager._addToComponentList(component.name, this.hash());
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

    delete this._components[name];

    this._manager._removeHashFromComponentList(name, this.hash());
  }
}

module.exports = {
  Entity
};