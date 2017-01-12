//StateManager.js//

/**
 * @description - Manager that manages one thing specifically: state
 * @author - Sam Faulkner
 */

//node imports
const Dict = require('collections/dict.js'),
  Set = require('collections/set.js'),
  SortedArray = require('collections/sorted-array.js');

//user imports
const Entity = require('./Entity.js');
const isEqual = require('lodash/isEqual.js');

//constants
const MAXIMUM_BUFFER_LENGTH = 8;

class StateManager {
  constructor(bufferSize) {

    this._entities = new Dict();

    this._entitiesByComponent = new Dict();

    this._subStates = new Dict({
      'default': new Set()
    });

    this._stateBuffer = new SortedArray([],
      (first, second) => {
        return first.tick == second.tick;
      },
      (first, second) => {
        return first.tick - second.tick;
      }
    );

    this._maxBufferSize = bufferSize || MAXIMUM_BUFFER_LENGTH;
  }

  setMaxBufferSize(value) {
    this._maxBufferSize = value;
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
    if (!hash) {
      return undefined;
    }
    var entityComponents = this.getEntityState(hash);
    return entityComponents.get(component).get('state');
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
      this.removeEntity(this._entities.get(entity.hash()).get('object'), true);
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

    entity.initializeComponents();

    entity.setManager(this);
    return entity.hash();
  }

  /**
   * @description - Removes an entity from the state manager
   * @param {Entity} entity - the entity object to be removed
   */
  removeEntity(entity, removeComponents = true) {
    if (!this._entities.has(entity.hash())) {
      throw new TypeError(entity.hash() + " isn't being tracked by the manager!");
    }

    for (var componentName of entity.getComponents().keys()) {
      this._removeEntityFromComponentList(entity.hash(), componentName);
    }
    this.removeEntityFromSubState(this._entities.get(entity.hash()).get('subState'), entity.hash());

    if (removeComponents)
      entity.removeComponents(false);
    this._entities.delete(entity.hash());
    
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
   * @description - Invalidates the processor's cached list of entities
   * @param {String} entity - the hash of the entity to invalidate
   * @param {String} componentName - the name of the component
   */
  _invalidateProcessorListsByEntityComponent(entity, componentName) {
    // this should trigger the listener for the ProcessorManager
    this._entities.dispatchMapChange(entity, this._entities.get(entity));
  }

  /**
   * @description - Adds a new substate within the state manager.
   * @param {String} name - the name of the new substate
   * @param {Set} entities - optional, but if defined will add these entities
   * to the state
   */
  addSubState(name, entities) {
    if (!this._subStates.has(name)) {
      this._subStates.set(name, new Set());
      // throw new TypeError("Attempting to override substate: " + name + "!");
    }

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
      // throw new TypeError("Can't add entities to an unknown substate: " + name);
      this.addSubState(name);
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

  /**
   * @description - Removes the given entities from the given substate
   * @param {String} name - the name of the substate to remove from
   * @param {Array} entities - the array of entity hashes to remove
   */
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
   * @description - Updates the state manager. Currently only updates the buffer
   */
  update(currentTick) {
    this.bufferState(currentTick);
  }

  /**
   * @description - Buffers the current state into the state buffer
   * @param {Number} current tick - the tick to save the state under for
   * keeping track of the different buffered states
   */
  bufferState(currentTick) {
    while (this._stateBuffer.length >= this._maxBufferSize) {
      this._stateBuffer.shift();
    }

    this._stateBuffer.push({
      'tick': currentTick,
      'subStates': this._subStates.clone(),
      'state': this.cloneEntities()
    });
  }

  /**
   * @description - Returns a clone of the _entities dict
   * @returns {Dict} a perfect clone of the _entities dict
   */
  cloneEntities() {
    var clonedDict = new Dict();
    this._entities.forEach((value, key, dict) => {
      var clonedEntity = value.get('object').clone();
      clonedDict.set(key, new Dict({
        'object': clonedEntity,
        'components': clonedEntity.getComponents(),
        'subState': value.get('subState')
      }));
    });

    return clonedDict;
  }

  /**
   * @description - Restores the state from a state that is
   * currently in the buffer
   * @param {Number} tick - the state to restore to
   */
  restoreState(tick) {
    var bufferedState = this.getBufferedState(tick);
    if (!bufferedState) {
      // throw new TypeError("No state listed under tick: '" + tick.toString() + "'");
      bufferedState = this._stateBuffer.min();
      if (!bufferedState) {
        throw new TypeError("No state listed under tick: '" + tick.toString() + "'");
      }
    }

    var _this = this;
    this._entities.forEach((value, key, dict) => {
      value.get('object').removeComponentsMethod();
    });
    this._entities = bufferedState.state;
    this._entities.forEach((value, key, dict) => {
      value.get('object').initializeComponents();
    });
    this._subStates = bufferedState.subStates;
  }

  /**
   * @description - Returns the state within the buffer, if available
   * @param {Number} tick - the state to retrieve
   * @returns {Object} the object that was placed into the buffer
   * in {@link bufferState}
   */
  getBufferedState(tick) {
    for (var bufferedState of this._stateBuffer.toArray()) {
      if (bufferedState.tick == tick) {
        return bufferedState;
      }
    }
  }

  /**
   * @description - Returns the state buffer
   * @returns {Array} the array of state buffer objects
   */
  getStateBuffer() {
    return this._stateBuffer;
  }

  /**
   * @description - Static method for comparing two serialized states
   * for equality
   * @param {Object} stateA - the first state to compare with
   * @param {Object} stateB - the second state to compare against
   * @returns {Boolean} are the states equal?
   */
  serializedStateEquality(stateA, stateB) {
    return isEqual(stateA, stateB);
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
  getSubState(name = 'default') {
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

  /**
   * @description - Saves the given substate to a regular js Object
   * @param {String} subState - the substate to serialize
   * @returns {Object} the state of the given substate
   */
  serializeState(subState = 'default') {
    return this._serializeState(this.getSubState(subState));
  }

  _serializeState(stateObject) {
    var entitiesList = [];
    stateObject.forEach((value, key, dict) => {
      var entityObject = value.get('object').serialize();
      entityObject.subState = value.get('subState');
      entitiesList.push(entityObject);
    });

    return {
      'entities': entitiesList
    };
  }

  /**
   * @description - Merges the entities in the stateObject with
   * the current entities in the given substate. Conflicts favor the 
   * given stateObject
   * @param {Object} stateObject - state object most likely returned
   * from {@link serializeState}
   * @param {ComponentManager} componentManager - the component manager, 
   * used for [re]constructing entities
   * @param {String} subStateName - denotes the substate to merge with
   */
  mergeState(stateObject, componentManager, subStateName = 'default') {
    var entityList = stateObject.entities;
    var _this = this;
    entityList.forEach((value, index, array) => {
      var hash = value.hash;
      if (_this._entities.has(hash)) {
        var entityObject = _this._entities.get(hash).get('object').clone();
        entityObject.deserialize(value, componentManager);
        //this should erase the old one and replace it with a new one
        _this.addEntity(entityObject, value.subState);
      }
      // create the entity
      else {
        var componentList = [];
        for (var componentKey in value.components) {
          componentList.push({'name': componentKey, 'args': value.components[componentKey]});
        }

        _this.addEntity(
          componentManager.createEntityFromComponents(componentList, hash), 
          value.subState
        );
      }
    });
  }

  /**
   * @description - Gets the differing state between
   * the given substate and the substate denoted by the
   * string
   * @param {Dict} subState - the substate to compare against
   * @param {String} subStateName - denotes the substate within this
   * manager to compare with
   * @returns {Dict} the differing state dict
   */
  getDeltaState(subState, subStateName = 'default') {
    var thisSubState = this.getSubState(subStateName);

    var deltaDict = new Dict();
    thisSubState.forEach((value, key, dict) => {
      if (!subState.has(key)) {
        deltaDict.set(key, value);
      }
      else {
        var thisValue = subState.get(key);
        if (!thisValue.get('object').equals(value.get('object'))) {
          var entity = value.get('object').clone();
          deltaDict.set(key, new Dict({
            'components': entity.getComponents(),
            'object': entity,
            'subState': subStateName
          }));
        }
      }
    });

    return deltaDict;
  }

  /**
   * @description - Clears out the entire state
   */
  clear() {
    for (var entityObject of this._entities.values()) {
      var entity = entityObject.get('object');
      this.removeEntity(entity);
    }
  }

  /**
   * @description - clears out all the state for the entities in the given
   * substate
   * @param {String} subState - denotes the substate to clear
   */
  clearSubState(subState) {
    if (!this._subStates.has(subState)) {
      throw new TypeError("Can't clear a non existing substate!");
    }

    var _this = this,
      subStateSet = this._subStates.get(subState);
    this._entities.forEach((value, key, dict) => {
      if (subStateSet.has(key)) {
        _this.removeEntity(value.get('object'));
      }
    });

    subStateSet.clear();
  }

  /**
   * @description - Returns the entire state of the StateManager
   */
  getState() {
    var state = {};
    for (var subState of this._subStates.keys()) {
      state[subState] = this.serializeState(subState);
    }

    return state;
  }

  /**
   * @description - Takes in an entire state generated from 
   * {@link getState} and merges it in
   * @param {Object} state - the whole state object generated from 
   * 'getState'
   * @param {ComponentManager} componentManager - the componentManager
   * for {@link mergeState}
   */
  mergeEntireState(state, componentManager) {
    for (var subState in state) {
      this.mergeState(state[subState], componentManager, subState);
    }
  }
}


module.exports = StateManager;