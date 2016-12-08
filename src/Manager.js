//Manager.js//

/**
 * @description - Defines the manager class that manages the ECS
 * @author - Samuel Faulkner
 */

//user imports
const RandomStringGenerator = require('./utils/RandomStringGenerator.js');
const { Entity } = require('./Entity.js');

//constants
const HASH_LENGTH = 8,
  ADD_ENTITY = 'ADD_ENTITY',
  REMOVE_ENTITY = 'REMOVE_ENTITY';

//node inmports
const EventEmitter = require('events');

/**
 * @description - Set intersection taken from Mozilla
 */
Set.prototype.intersection = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
}

/**
 * @description - Special reducer for action ADD_ENTITY
 * @param {Object} action - the action received by the manager
 * @param {Manager} manager - the manager itself
 */
function addEntityReducer(action, manager) {
  if (!(action.components)) {
    throw "'" + action.type + 
      "' must specify components to add to the entity!";
  }
  var entity = new Entity(manager);
  for (var component of action.components) {
    entity.addComponent(component);
  }

  manager.addEntity(entity);
}

/**
 * @description - Special reducer for action REMOVE_ENTITY
 * @param {Object} action - the action received by the manager
 * @param {Manager} manager - the manager itself
 */
function removeEntityReducer(action, manager) {
  if (action.hash === undefined) {
    throw "'" + action.type + 
      "' must specify hash to remove!";
  }

  manager.removeEntity(manager.getEntity(action.hash));
}

class Manager {
  constructor () {
    this._entities = {};
    this._entitiesByComponent = {};
    this._entitiesByHash = {};
    this._emitter = new EventEmitter();

    // inital state for reducers allows adding and removing entities
    this._reducers = {
      [ADD_ENTITY]: [addEntityReducer],
      [REMOVE_ENTITY]: [removeEntityReducer]
    };
    this._processors = {};
    this._processorsCachedEntityLists = {};

    /* keeps a set of all the hashes so to not get any collisions 
     * (even though very unlikely)
     */
    this._hashes = new Set();
  }

  /** 
   * @description - Returns a hash that is guaranteed not to already be in 
   * use by the ECS manager
   * @return {String} - randomized string that can be used as a hash identifier
   */
  generateHash() {
    var string = RandomStringGenerator(HASH_LENGTH);
    while (this._hashes.has(string)) {
      string = RandomStringGenerator(HASH_LENGTH);
    }

    return string;
  }

  /**
   * @description - Returns the entites object; essentially the state tree
   * @return {Object} - the entities object within this class
   */
  getEntities() {
    return this._entities;
  }

  /**
   * @description - Helper method to get retrieve data for a single entity
   * @param {String} hash - the hash value for the entity that is being 
   * retrieved
   * @return {Object} - Entity's component state tree being retrieved
   */
  getEntityState(hash) {
    if (!(hash in this._entities)) {
      throw "'" + hash + "' not in ECS manager!";
    }

    return this._entities[hash];
  }

  /**
   * @description - Returns the the entity object itself from a given hash
   */
  getEntity(hash) {
    if (!(hash in this._entitiesByHash)) {
      throw "'" + hash + "' not in ECS manager!";
    }

    return this._entitiesByHash[hash];
  }

  /**
   * @description - Returns a single list depending on the parameter
   * @param {String} field - Denotes the specific component type to grab the
   * list of entities from, or if undefined returns the entire object
   * @return {Set} - the set of entities containing the given component
   */
  getEntitiesByComponent(field) {

    if (field in this._entitiesByComponent){
      return this._entitiesByComponent[field];
    }

    throw "'" + field + "' component doesn't have any entities!";
  }

  /**
   * @description - Returns a boolean to determine if there are any entities
   * that currently have the given component in the manager
   * @param {String} componentType - The type of component in question
   * @return {boolean} - Does the manager have an entity that has this
   * component?
   */
  hasComponent(componentType) {
    return componentType in this._entitiesByComponent;
  }


  /**
   * @description - Adds an entity to the manager
   * @param {Entity} entity - Entity object to be added
   */
  addEntity(entity) {

    //if entity already exists, we remove the current one
    if (entity.hash() in this._entities) {
      this.removeEntity(this.getEntity(entity.hash()));
    }
    
    var components = entity.getComponents();

    for (var componentName in components) {
      //add the entity to the lists of components
      if (!(componentName in this._entitiesByComponent)) {
        this._entitiesByComponent[componentName] = new Set();
      }
      this._entitiesByComponent[componentName].add(entity.hash());


    }

    // adds its component's state to the entities object
    this._entities[entity.hash()] = components;

    // adds the entity itself to the entitiesByHash object
    this._entitiesByHash[entity.hash()] = entity;
    entity.setManager(this);

    /* invalidate any cached list that would get to a processor
     * that utilizes entities with the same required components as
     * this entity has
     */
    this._invalidateProcessorLists(entity);
  }

  /**
   * @description - Removes an entity from the manager
   * @param {Entity} entity - the entity to be removed
   */
  removeEntity(entity) {
    // error check

    var hash = entity.hash();
    if (!(hash in this._entities)) {
      throw "'" + hash + "' isn't currently in the ECS manager!";
    }

    //grab this before it gets deleted
    var entity = this._entitiesByHash[hash];
    
    // remove from the main '_entities' object
    delete this._entities[hash];
    delete this._entitiesByHash[hash];

    //remove from all of the component sets
    for (var componentName in entity.getComponents()) {
      this._entitiesByComponent[componentName].delete(hash);
      if (this._entitiesByComponent[componentName].size <= 0) {
        delete this._entitiesByComponent[componentName];
      }
    }

    //invalidate processor lists
    this._invalidateProcessorLists(entity);

    entity.removeComponents();
    entity.clearManager();
  }


  /**
   * @description - In the case that a component was removed from an entity,
   * the entity would call this method of the ECS to ensure that it wasn't
   * on the list for that component anymore
   * @param {String} componentName - the name of the component that was
   * removed from the entity
   * @param {String} hash - the hash value of the entity that is to be
   * removed
   */
  _removeHashFromComponentList(componentName, hash) {
    if (!(componentName in this._entitiesByComponent))
      throw new TypeError("'" + componentName.toString() + "' doesn't have" + 
        " any entities listed!");

    this._entitiesByComponent[componentName].delete(hash);
    if (this._entitiesByComponent[componentName].size <= 0) {
      delete this._entitiesByComponent[componentName];
    }
  }

  /**
   * @description - Adds an entity to a component list
   * @param {String} componentName - the name of the component
   * @param {String} hash - the hash to add to the component set
   */
  _addToComponentList(componentName, hash) {
    if (!(componentName in this._entitiesByComponent))
      this._entitiesByComponent[componentName] = new Set();

    this._entitiesByComponent[componentName].add(hash);
  }

  /**
   * @description - Returns a list of reducer functions by action type
   * @param {String} actionType - type of action the reducer is triggered by
   * @return {Array} - list of reducers that are 'performed' by that action
   */
  getReducers(actionType) {
    if (actionType in this._reducers) {
      return this._reducers[actionType];
    }

    throw new TypeError("'" + actionType + "' action type isn't found in the reducers!");
  }

  /**
   * @description - Adds a reducer function to fire after an action is
   * dispatched of the given types
   * @param {Function} reducer - function to be fired
   * @param {Array} types - types of actions that this reducer is fired
   * once dispatched
   */
  addReducer(reducer, types) {
    if (typeof reducer !== "function")
      throw new TypeError("'reducer' must be a function!");
    if (typeof types !== "object")
      throw new TypeError("'types' must be an array!");

    for (var type of types) {
      if (!(type in this._reducers)) {
        this._reducers[type] = [];
      }
      this._reducers[types].push(reducer);
    }
  }

  /**
   * @description - Removes a reducer from a given list
   * @param {Function} reducer - function to be removed
   * @param {Array} list - list that the reducer is to be removed from
   * @param {String} type - type of action that returned this list; ie
   * this._reducers[type] = list
   */
  _removeReducerFromList(reducer, list, type) {
    if (!list)
      return;
    var index = list.indexOf(reducer);
    if (index >= 0) {
      list.splice(index, 1);
      if (list.length <= 0) {
        delete this._reducers[type];
      }
    }
  }

  /**
   * @description - Removes a reducer from all the specified type lists
   * @param {Function} reducer - function to be removed
   * @param {Array} types - list of types to remove the reducer from
   */
  _removeReducerFromTypes(reducer, types) {
    for (var type of types) {
      this._removeReducerFromList(reducer, this._reducers[type], type);
    }
  }

  /**
   * @description - Removes a reducer from all the types actions it can be
   * called for
   * @param {Function} reducer - The function to be removed from all
   * the lists it appears in in '_reducers'
   */
  removeReducerFromAll(reducer) {
    /* iterate through the entire '_reducers' object and remove
     * every instance of 'reducer'
     */
    this._removeReducerFromTypes(reducer, Object.keys(this._reducers));
  }

  /**
   * @description - Removes a reducer from the given types of actions
   * @param {Function} reducer - The function to be removed from the
   * given lists
   * @param {Array} types - denotes the lists to remove the reducer
   * from
   */
  removeReducerFromSelect(reducer, types) {
    if (typeof types !== "object")
      throw new TypeError("'types' must be an array!");
    this._removeReducerFromTypes(reducer, types);
  }

  /**
   * @description - Removes a reducer from only the given type
   * @param {Function} reducer - The function to be removed from 
   * the given list
   * @param {String} type - the type to remove the reducer from
   */
  removeReducer(reducer, type) {
    this.removeReducerFromSelect(reducer, [type]);
  }

  /**
   * @description - Dispatches an action to appropriate reducers
   * @param {Object} action - the action to dispatch
   */
  dispatch(action) {
    if (action.type === undefined) {
      throw "Action must have an action type!";
    }

    /* don't throw an error because somethings might spew out actions
     * that don't necessarily mean an console.error
     */
    if (!this._reducers[action.type])
      return;
    for (var fun of this._reducers[action.type]) {
      fun(action, this);
    }
  }

  /**
   * @description - Adds a processor. This processor is called every time
   * the manager calls update. Each processor is given the intersection of
   * entities that contain all the components the processor identifies
   * @param {Processor} processor - The processor to be added
   */
  addProcessor(processor) {
    // Remove the previous processor if one is already present
    if (this._processors[processor.getName()]) {
      this.removeProcessor(processor);
    }

    this._processors[processor.getName()] = processor;
  }

  /**
   * @description - Removes the given processor from the '_processors' field
   * @param {Processor} processor - processor to be removed
   */
  removeProcessor(processor) {
    
    if (!(processor.getName() in this._processors)) {
      throw new TypeError("'" + processor.getName().toString() + 
        "' wasn't found!");
    }

    //delete it from the processor object
    delete this._processors[processor.getName()];

    //delete a cached list it has if it has it
    if (this._processorsCachedEntityLists[processor.getName()])
      delete this._processorsCachedEntityLists[processor.getName()];
  }

  /**
   * @description - Retrieves a previously added processor
   * @param {String} name - the nane of the processor
   */
  getProcessor(name) {
    if (!this._processors[name])
      throw new TypeError("Cannot find '" + name.toString() + "' in this" +
        " manager's processors!");

    return this._processors[name];
  }

  /**
   * @description - Iterates through all the manager's processors
   * and calls them, passing all the entities that have the components
   * defined by the processor
   */
  update() {
    for (var processorName in this._processors) {
      var processor = this._processors[processorName];
      // get the list of entities with the components neededfor the processor
      if (!this._processorsCachedEntityLists[processorName] ||
        this._processorsCachedEntityLists[processorName].invalid) {
        this._fetchProcessorEntityList(processorName, 
          processor.getComponentNames());
      }

      var entityList = this._processorsCachedEntityLists[processorName].set;
      processor.update(entityList, this);
    }
  }

  /**
   * @description - Invalidates any cached processor entity list if the entity
   * has all the components described in the processor
   * @param {Entity} entity - The entity whose components will be checked against
   */
  _invalidateProcessorLists(entity) {
    var components = entity.getComponents();
    for (var processorName in this._processors) {
      var shouldInvalidate = true;
      for (var componentName of 
        this._processors[processorName].getComponentNames()) {
        if (!(componentName in components)) {
          shouldInvalidate = false;
          break;f
        }
      }

      if (shouldInvalidate && 
        this._processorsCachedEntityLists[processorName] !== undefined)
        this._processorsCachedEntityLists[processorName].invalid = true;
    }
  }

  /**
   * @description - typically called whenever an entity has deleted a
   * component, it needs to invalidate any processor list that depended 
   * on that component
   * @param {String} entityHash - the hash denoting the entity
   * @param {String} component - denotes the name of the component
   */
  _invalidateProcessorListsByEntityComponent(entityHash, component) {
    for (var processorName in this._processors) {
      if (this._processors[processorName].getComponentNames().has(component) &&
        this._processorsCachedEntityLists[processorName].set.has(entityHash)) {
        this._processorsCachedEntityLists[processorName].invalid = true;
      }
    }
  }

  /**
   * @description - Updates the list of entities that will be passed down to
   * the given processor
   * @param {String} processorName - name of the processor
   * @param {Set} componentSet - components returned by Processor.getComponentNames()
   */
  _fetchProcessorEntityList(processorName, componentSet) {
    // if it's currently undefined, create a new object for it
    if (!this._processorsCachedEntityLists[processorName]) {
      this._processorsCachedEntityLists[processorName] = {};
    }
    this._processorsCachedEntityLists[processorName].invalid = false;

    var set = new Set(Object.keys(this._entitiesByHash));
    for (var component of componentSet) {
      /* none of the entities in the manager have a required component of the
       * processor, return empty set
       */
      if (!this.hasComponent(component)) {
        this._processorsCachedEntityLists[processorName].set = new Set();
        return;
      }
      set = set.intersection(this.getEntitiesByComponent(component));
    }
    this._processorsCachedEntityLists[processorName].set = set;
  }

  /**
   * @description - Adds a listener to be called when an event
   * is thrown
   * @param {String} eventType - denotes the type of event
   * @param {Function} fun - the function that will be called
   * after the event will be removed
   */
  addListener(eventType, fun) {
    this._emitter.addListener(eventType, fun);
  }

  /**
   * @description - Removes a listener that was previously added
   * @param {String} eventType - denotes the type of the event
   * @param {Function} fun - the listener to be removed
   */
  removeListener(eventType, fun) {
    this._emitter.removeListener(eventType, fun);
  }

  /**
   * @description - Emits an event with the given argument
   * @param {String} eventType - denotes the type of event to be
   * emitted
   * @param {Object} arg - the argument that will be passed to the
   * event handler
   * @return {Bool} - Returns whether there were any listeners
   * for the supplied event type or not
   */
  emit(eventType, arg) {
    //the event listener will get access to the manager itself
    return this._emitter.emit(eventType, arg, this);
  }
}

module.exports = {
  'Manager': Manager,
  ADD_ENTITY,
  REMOVE_ENTITY,
  HASH_LENGTH
};