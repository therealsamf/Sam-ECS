//Manager.js//

/**
 * @description - Defines the manager class that manages the ECS
 * @author - Samuel Faulkner
 */

//node imports
// const { SortedArraySet, FastSet } = require('collections');
const FastSet = require('collections/fast-set.js'),
  SortedSet = require('collections/sorted-array-set.js');
const EventEmitter = require('events');

//user imports
const StateManager = require('./StateManager.js');
const ProcessorManager = require('./ProcessorManager.js');
const ActionManager = require('./ActionManager.js');
const EventManager = require('./EventManager.js');
const ComponentManager = require('./ComponentManager.js');

//constants
const HASH_LENGTH = 8;

class Manager {
  constructor () {
    this._stateManager = new StateManager();
    this._actionManager = new ActionManager();
    this._componentManager = new ComponentManager(this._stateManager);
    this._eventManager = new EventManager(this._actionManager);
    this._processorManager = new ProcessorManager(this._stateManager);    

    this._currentTick = 0;
  }

  setMaxBufferSize(value) {
    this._stateManager.setMaxBufferSize(value);
    this._actionManager.setMaxBufferSize(value);
  }

  getStateManager() {
    return this._stateManager;
  }

  getEventManager() {
    return this._eventManager;
  }

  getComponentManager() {
    return this._componentManager;
  }

  getActionManager() {
    return this._actionManager;
  }

  getProcessorManager() {
    return this._processorManager;
  }

  /**
   * @description - Returns the entites object; essentially the state tree
   * @return {Object} - the entities object within this class
   */
  getEntities() {
    return this._stateManager.getEntities();
  }

  /** 
   * @description - Returns the state of an entity's specific component
   * @param {String} entity - the hash of the entity
   * @param {String} component - the specific component to retrieve
   * @returns {Object} the state object of the component
   */
  getEntityComponent(entity, component) {
    return this._stateManager.getEntityComponent(entity, component);
  }

  /**
   * @description - Helper method to get retrieve data for a single entity
   * @param {String} hash - the hash value for the entity that is being 
   * retrieved
   * @return {Object} - Entity's component state tree being retrieved
   */
  getEntityState(hash) {
    return this._stateManager.getEntityState(hash);
  }

  /**
   * @description - Returns the the entity object itself from a given hash
   */
  getEntity(hash) {
    return this._stateManager.getEntity(hash);
  }

  /**
   * @description - Returns a single list depending on the parameter
   * @param {String} field - Denotes the specific component type to grab the
   * list of entities from, or if undefined returns the entire object
   * @return {Set} - the set of entities containing the given component
   */
  getEntitiesByComponent(field) {
    return this._stateManager.getEntitiesByComponent(field);
  }

  /**
   * @description - Returns a boolean to determine if there are any entities
   * that currently have the given component in the manager
   * @param {String} componentType - The type of component in question
   * @return {boolean} - Does the manager have an entity that has this
   * component?
   */
  hasComponent(componentType) {
    return this._stateManager.hasComponent(componentType);
  }

  /**
   * @description - Adds an entity to the manager
   * @param {Entity} entity - Entity object to be added
   */
  addEntity(entity) {
    return this._stateManager.addEntity(entity);
  }

  /**
   * @description - Removes an entity from the manager
   * @param {Entity} entity - the entity to be removed
   */
  removeEntity(entity) {
    return this._stateManager.removeEntity(entity);
  }

  /**
   * @description - Returns a list of reducer functions by action type
   * @param {String} actionType - type of action the reducer is triggered by
   * @return {Array} - list of reducers that are 'performed' by that action
   */
  getReducers(actionType) {
    return this._actionManager.getReducers(actionType);
  }

  /**
   * @description - Adds a reducer function to fire after an action is
   * dispatched of the given types
   * @param {Function} reducer - function to be fired
   * @param {Array} types - types of actions that this reducer is fired
   * once dispatched
   */
  addReducer(reducer, types) {
    return this._actionManager.addReducer(reducer, types);
  }

  /**
   * @description - Removes a reducer from the given types of actions
   * @param {Function} reducer - The function to be removed from the
   * given lists
   * @param {Array} types - denotes the lists to remove the reducer
   * from
   */
  removeReducer(reducer, types) {
    return this._actionManager.removeReducer(reducer, types);
  }

  /**
   * @description - Dispatches an action to appropriate reducers
   * @param {Object} action - the action to dispatch
   */
  dispatch(action, unrolling) {

    this._actionManager.dispatch(action);

    if (this._dispatchFun)
      this._dispatchFun(action, unrolling);
  }

  /**
   * @description - Adds a processor. This processor is called every time
   * the manager calls update. Each processor is given the intersection of
   * entities that contain all the components the processor identifies
   * @param {Processor} processor - The processor to be added
   */
  addProcessor(processor) {
    return this._processorManager.addProcessor(processor);
  }

  /**
   * @description - Removes the given processor from the '_processors' field
   * @param {Processor} processor - processor to be removed
   */
  removeProcessor(processor) {
    return this._processorManager.removeProcessor(processor);
  }

  /**
   * @description - Iterates through everything
   * defined by the processor
   */
  update() {
    this._processorManager.update();
    this._actionManager.update(this._stateManager, this._currentTick);
    this._stateManager.update(this._currentTick);
  }

  /**
   * @description - Allows entities to be sorted in the 
   * cached list that is given to a processor
   * @param {Function} sorter - comparator function for the sorting.
   * should take in firstObject, secondObject, and the state manager
   * @param {String} processorName - the name of the processor 
   * to be sorted
   */
  addSorterForProcessorList(sorter, processorName) {
    return this._processorManager.addSorterForProcessor(sorter, processorName);
  }

  /**
   * @description - Adds a listener to be called when an event
   * is thrown
   * @param {String} eventType - denotes the type of event
   * @param {Function} fun - the function that will be called
   * after the event will be removed
   */
  addListener(eventType, fun) {
    this._eventManager.addListener(eventType, fun);
  }

  /**
   * @description - Removes a listener that was previously added
   * @param {String} eventType - denotes the type of the event
   * @param {Function} fun - the listener to be removed
   */
  removeListener(eventType, fun) {
    this._eventManager.removeListener(eventType, fun);
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
    if (this._emitFun) {
      this._emitFun(Object.assign({}, arg, {'type': eventType}));
    }

    this._eventManager.emit(eventType, arg);
  }

  /**
   * @description - Adds a component to the manager, allowing entities
   * to contain this component
   * @param {String} name - the name of the component
   * @param {Function} generatorFunction - the return value of this function
   * will be given to an entity whenever they request this component
   */
  addComponentToLibrary(name, generatorFunction) {
    return this._componentManager.addComponentToLibrary(name, generatorFunction);
  }

  /**
   * @description - Removes a component that was previously added to the
   * manager. Does NOT remove all instances of the component from current
   * entities
   * @param {String} name - the name of the component to be removed from
   * the library
   */
  removeComponentFromLibrary(name) {
    return this._componentManager.removeComponentFromLibrary(name);
  }

  /**
   * @description - Adds an entity and gives it the components listed
   * @param {Array} componentList - a list of component objects to give to 
   * the entity. Each component object should have two fields: 'name': the 
   * name of the component, 'args': which will be passed to the 
   * generatorFunction that was given whenever the component was added to 
   * the manager, along with the manager itself
   * @param {String} hashValue - optional paramter for a hashvalue to be
   * assigned to the entity rather than one being generated
   */
  addEntityFromComponents(componentList, hashValue, subState) {
    var entity = this._componentManager.createEntityFromComponents(componentList, hashValue);

    return this._stateManager.addEntity(entity, subState);
  }

  /**
   * @description - This allows for the user to add a function
   * that will be called every time the dispatch function on 
   * the manager function is invoked
   * @param {Function} fun - the function that will be called on
   * every dispatch
   */
  addDispatchSideEffect(fun) {
    this._dispatchFun = fun;
  }

  /**
   * @description - removes the side effect functions from 
   * {@link dispatch}
   */
  removeDispatchSideEffect() {
    if (this._dispatchFun)
      delete this._dispatchFun;
  }

  /**
   * @description - Like {@link addDispatchSideEffect} this adds 
   * a side effect for {@link emit}
   * @param {Function} function - function that will be called for 
   * every emit
   */
  addEmitSideEffect(fun) {
    this._emitFun = fun;
  }

  /**
   * @description - Removes the side effect from {@link addEmitSideEffect}
   */
  removeEmitSideEffect() {
    if (this._emitFun)
      delete this._emitFun;
  }

  /**
   * @description - Clears out any state from the manager
   */
  clear() {
    return this._stateManager.clear();
  }

  /**
   * @description - Serializes the current state from the state 
   * @param {String} subState - the substate to serialize
   * manager and returns it
   * @returns {Object} the state object
   */
  serializeState(subState) {
    return this._stateManager.serializeState(subState);
  }


  /**
   * @description - Returns the serialized state
   */
  toJSON() {
    return this.serializeState();
  }
}

module.exports = Manager;