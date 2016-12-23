//StateManager.js//

/**
 * @description - Manager that manages one thing specifically: state
 * @author - Sam Faulkner
 */

const Dict = require('collections/dict.js'),
  Set = require('collections/set.js');

class StateManager {
  constructor(parent) {
    this._parent = parent;

    this._entities = new Dict();
    this._entitiesByComponent = new Dict();

    this._subStates = new Dict({
      'default': new Set()
    });
  }

  /**
   * @description - Returns the entities
   * @returns {Dict} the entities in the state manager
   */
  getEntities() {
    return this._entities;
  }

  /**
   * @description - Helper method for returning all of the entities in a 
   * set
   * @returns {Set} set of all the entities hashes
   */
  getEntitySet() {
    return new Set(this._entities.keys());
  }

  /**
   * @description - Returns the state for a single entity
   * @param {String} hash - the hash of the entity to return the state of
   * @returns {Dict} the dict of components from the given entity
   */
  getEntityState(hash) {
    if (!this._entities.has(hash)) {
      throw new TypeError(hash + " isn't in state manager!");
    }

    return this._entities.get(hash).get('components');
  }

  /**
   * @description - Helper method (particularly for reducers) that
   * returns the state of the given component on the given entity, 
   * denoted by the given hash
   * @param {String} hash - the hash of the entity to retrieve state from
   * @param {String} component - the name of the component to retrieve the state
   * from
   */
  getEntityComponent(hash, component) {
    var entityComponents = this.getEntityState(hash);
    return entityComponents.get(component);
  }

  /**
   * @description - Returns the entity object itself
   * @param {String} hash - the hash of the entity to return
   * @returns {Entity} the entity object from the given hash
   */
  getEntity(hash) {
    if (!this._entities.has(hash)) {
      throw new TypeError(hash + " isn't in the state manager!");
    }

    return this._entities.get(hash).get('object');
  }

  /**
   * @description - Returns the set of entity hashes that have the given component
   * @param {String} componentName - the component that the returned entities must carry
   * @returns {Set} the set of entities that have the given component
   */
  getEntitiesByComponent(componentName) {
    if (!this._entitiesByComponent.has(componentName)) {
      throw new TypeError(componentName + " doesn't have any entities listed!");
    }

    return this._entitiesByComponent.get(componentName);
  }

  /**
   * @description - Returns a boolean if there are any entities that have the
   * given component
   * @param {String} componentName - the component to be tested for
   * @returns {Boolean} whether or not any entity has the given component
   */
  hasComponent(componentName) {
    return this._entitiesByComponent.has(componentName);
  }

  /**
   * @description - Adds an entity to the state manager
   * @param {Entity} entity - the entity object to add
   * @param {String} subState - optional parameter to add
   * this entity to a substate
   */
  addEntity(entity, subState) {
    if (this._entities.has(entity.hash())) {
      this.removeEntity(entity);
    }

    var entitySubState = subState || 'default';
    var components = entity.getComponents();

    for (var componentName of components.keys()) {
      this._addEntityToComponentList(entity.hash(), componentName);
    }

    this._entities.set(entity.hash(), new Dict({
      'components': components,
      'object': entity,
      'subState': entitySubState
    }));
    this.addEntityToSubState(entitySubState, entity.hash());


    entity.setManager(this);
  }

  /**
   * @description - Removes an entity from the state manager
   * @param {Entity} entity - the entity object to be removed
   */
  removeEntity(entity) {
    if (!this._entities.has(entity.hash())) {
      throw new TypeError(entity.hash() + " isn't being tracked by the manager!");
    }

    for (var componentName of entity.getComponents().keys()) {
      this._removeEntityFromComponentList(entity.hash(), componentName);
    }
    this.removeEntityFromSubState(this._entities.get(entity.hash()).get('subState'), entity.hash());

    this._entities.delete(entity.hash());

    entity.removeComponents();
    entity.clearManager();
  }

  /**
   * @description - Adds the given entity hash to the given component set
   * @param {String} entityHash - the hash to add to the set
   * @param {String} componentName - the component set to add it to
   */
  _addEntityToComponentList(entityHash, componentName) {
    if (!this.hasComponent(componentName)) {
      this._entitiesByComponent.set(componentName, new Set());
    }

    this._entitiesByComponent.get(componentName).add(entityHash);
  }

  /**
   * @description - Removes the given entityHash from the given component set
   * @param {String} entityHash - the hash to remove from the set
   * @param {String} componentName - denotes the set to remove it from
   */
  _removeEntityFromComponentList(entityHash, componentName) {
    if (!this.hasComponent(componentName)) {
      throw new TypeError("Can't remove " + entityHash + " from component " + componentName);
    }

    var componentSet = this._entitiesByComponent.get(componentName);
    componentSet.delete(entityHash);
    if (componentSet.length <= 0) {
      this._entitiesByComponent.delete(componentName);
    }
  }

  /**
   * @description - Adds a new substate within the state manager.
   * @param {String} name - the name of the new substate
   * @param {Set} entities - optional, but if defined will add these entities
   * to the state
   */
  addSubState(name, entities) {
    if (this._subStates.has(name)) {
      throw new TypeError("Attempting to override substate: " + name + "!");
    }
    this._subStates.set(name, new Set());

    if (entities) {
      this.addEntitiesToSubState(name, entities.toArray());
    }
  }

  /**
   * @description - Adds an iterable object of entities to the given substate
   * @param {String} name - the name of the substate that will be added to
   * @param {Iterable} entities - the entity hashes that will be added
   */
  addEntitiesToSubState(name, entities) {
    if (!this._subStates.has(name)) {
      throw new TypeError("Can't add entities to an unknown substate: " + name);
    }

    var subState = this._subStates.get(name);
    for (var entityHash of entities) {
      if (!this._entities.has(entityHash)) {
        throw new TypeError("'" + entityHash + "' isn't being tracked by the State Manager!");
      }

      var entityObject = this._entities.get(entityHash);
      var previousSubState = entityObject.get('subState');
      if (this._subStates.get(previousSubState).has(entityObject.get('object').hash())) {
        this.removeEntityFromSubState(entityObject.get('subState'), entityObject.get('object').hash());
      }

      subState.add(entityHash);
      this._entities.get(entityHash).set('subState', name);
    }
  }

  /**
   * @description - Adds a single entity to a substate
   * @param {String} name - the substate that will be addeded to
   * @param {String} entityHash - the hash of the entity that will be added
   */
  addEntityToSubState(name, entity) {
    this.addEntitiesToSubState(name, [entity]);
  }

  removeEntitiesFromSubState(name, entities) {
    if (!this._subStates.has(name)) {
      throw new TypeError("Can't remove entities from an unknown substate: " + name);
    }

    var subState = this._subStates.get(name);
    for (var entityHash of entities) {
      if (!this._entities.has(entityHash)) {
        throw new TypeError("'" + entityHash + "' isn't being tracked by the State Manager!");
      }
      if (!subState.has(entityHash)) {
        throw new TypeError("'" + entityHash + "' isn't in substate: '" + name + "'!");
      }

      subState.delete(entityHash);
      this._entities.get(entityHash).set('subState', 'default');
    }
  }

  /**
   * @description - Removes a single entity from a substate
   * @param {String} name - the substate that will be removed from
   * @param {String} entityHash - the hash of the entity that will be removed
   */
  removeEntityFromSubState(name, entityHash) {
    this.removeEntitiesFromSubState(name, [entityHash]);
  }

  /**
   * @description - Returns the this._entities containing
   * the state of all of those entities from the given substate
   * @param {String} name - the name of the substate to be returned
   * @returns {Dict} the dict of hashes to objects containing the entities state
   */
  getSubState(name) {
    if (!this._subStates.has(name)) {
      throw new TypeError(name + " substate doesn't exist!");
    }

    var subState = this._subStates.get(name);
    var entities =  this._entities.filter((value, key, dict) => {
      return subState.has(key);
    });

    var returnDict = new Dict();
    for (var entity of entities.keys()) {
      returnDict.set(entity, this._entities.get(entity));
    }

    return returnDict;
  }
}


module.exports = StateManager;