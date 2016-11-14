/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	//index.js//

	module.exports = {
	  'Manager': __webpack_require__(1).Manager,
	  'Entity': __webpack_require__(2).Entity,
	  'Processor': __webpack_require__(3).Processor
	};

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	//Manager.js//

	/**
	 * @description - Defines the manager class that manages the ECS
	 * @author - Samuel Faulkner
	 */

	//user imports
	var _require = __webpack_require__(2),
	    Entity = _require.Entity;

	var _require2 = __webpack_require__(3),
	    Processor = _require2.Processor;

	var RandomStringGenerator = __webpack_require__(4);

	//constants
	var HASH_LENGTH = 8,
	    ADD_ENTITY = 'ADD_ENTITY',
	    REMOVE_ENTITY = 'REMOVE_ENTITY';

	/**
	 * @description - Set intersection taken from Mozilla
	 */
	Set.prototype.intersection = function (setB) {
	  var intersection = new Set();
	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    for (var _iterator = setB[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      var elem = _step.value;

	      if (this.has(elem)) {
	        intersection.add(elem);
	      }
	    }
	  } catch (err) {
	    _didIteratorError = true;
	    _iteratorError = err;
	  } finally {
	    try {
	      if (!_iteratorNormalCompletion && _iterator.return) {
	        _iterator.return();
	      }
	    } finally {
	      if (_didIteratorError) {
	        throw _iteratorError;
	      }
	    }
	  }

	  return intersection;
	};

	/**
	 * @description - Special reducer for action ADD_ENTITY
	 * @param {Object} action - the action received by the manager
	 * @param {Manager} manager - the manager itself
	 */
	function addEntityReducer(action, manager) {
	  if (!action.components) {
	    throw "'" + action.actionType + "' must specify components to add to the entity!";
	  }
	  var entity = new Entity(manager);
	  var _iteratorNormalCompletion2 = true;
	  var _didIteratorError2 = false;
	  var _iteratorError2 = undefined;

	  try {
	    for (var _iterator2 = action.components[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
	      var component = _step2.value;

	      entity.addComponent(component);
	    }
	  } catch (err) {
	    _didIteratorError2 = true;
	    _iteratorError2 = err;
	  } finally {
	    try {
	      if (!_iteratorNormalCompletion2 && _iterator2.return) {
	        _iterator2.return();
	      }
	    } finally {
	      if (_didIteratorError2) {
	        throw _iteratorError2;
	      }
	    }
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
	    throw "'" + action.actionType + "' must specify hash to remove!";
	  }

	  manager.removeEntity(manager.getEntity(action.hash));
	}

	var Manager = function () {
	  function Manager() {
	    var _reducers;

	    _classCallCheck(this, Manager);

	    this._entities = {};
	    this._entitiesByComponent = {};
	    this._entitiesByHash = {};

	    // inital state for reducers allows adding and removing entities
	    this._reducers = (_reducers = {}, _defineProperty(_reducers, ADD_ENTITY, [addEntityReducer]), _defineProperty(_reducers, REMOVE_ENTITY, [removeEntityReducer]), _reducers);
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


	  _createClass(Manager, [{
	    key: 'generateHash',
	    value: function generateHash() {
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

	  }, {
	    key: 'getEntities',
	    value: function getEntities() {
	      return this._entities;
	    }

	    /**
	     * @description - Helper method to get retrieve data for a single entity
	     * @param {String} hash - the hash value for the entity that is being 
	     * retrieved
	     * @return {Object} - Entity's component state tree being retrieved
	     */

	  }, {
	    key: 'getEntityState',
	    value: function getEntityState(hash) {
	      if (!(hash in this._entities)) {
	        throw "'" + hash + "' not in ECS manager!";
	      }

	      return this._entities[hash];
	    }

	    /**
	     * @description - Returns the the entity object itself from a given hash
	     */

	  }, {
	    key: 'getEntity',
	    value: function getEntity(hash) {
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

	  }, {
	    key: 'getEntitiesByComponent',
	    value: function getEntitiesByComponent(field) {

	      if (field in this._entitiesByComponent) {
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

	  }, {
	    key: 'hasComponent',
	    value: function hasComponent(componentType) {
	      return componentType in this._entitiesByComponent;
	    }

	    /**
	     * @description - Adds an entity to the manager
	     * @param {Entity} entity - Entity object to be added
	     */

	  }, {
	    key: 'addEntity',
	    value: function addEntity(entity) {
	      if (!(entity instanceof Entity)) {
	        throw "Parameter 'entity' must be of type Entity!";
	      }

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
	        this._entitiesByComponent[componentName] = this._entitiesByComponent[componentName].add(entity.hash());
	      }

	      // adds its component's state to the entities object
	      this._entities[entity.hash()] = components;

	      // adds the entity itself to the entitiesByHash object
	      this._entitiesByHash[entity.hash()] = entity;

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

	  }, {
	    key: 'removeEntity',
	    value: function removeEntity(entity) {
	      // error check
	      if (!(entity instanceof Entity)) {
	        throw "Parameter 'entity' must be of type Entity!";
	      }

	      var hash = entity.hash();
	      if (!(hash in this._entities)) {
	        throw "'" + hash + "' isn't currently in the ECS manager!";
	      }

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
	    }

	    /**
	     * @description - Returns a list of reducer functions by action type
	     * @param {String} actionType - type of action the reducer is triggered by
	     * @return {Array} - list of reducers that are 'performed' by that action
	     */

	  }, {
	    key: 'getReducers',
	    value: function getReducers(actionType) {
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

	  }, {
	    key: 'addReducer',
	    value: function addReducer(reducer, types) {
	      if (typeof reducer !== "function") throw new TypeError("'reducer' must be a function!");
	      if ((typeof types === 'undefined' ? 'undefined' : _typeof(types)) !== "object") throw new TypeError("'types' must be an array!");

	      var _iteratorNormalCompletion3 = true;
	      var _didIteratorError3 = false;
	      var _iteratorError3 = undefined;

	      try {
	        for (var _iterator3 = types[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
	          var type = _step3.value;

	          if (!(type in this._reducers)) {
	            this._reducers[type] = [];
	          }
	          this._reducers[types].push(reducer);
	        }
	      } catch (err) {
	        _didIteratorError3 = true;
	        _iteratorError3 = err;
	      } finally {
	        try {
	          if (!_iteratorNormalCompletion3 && _iterator3.return) {
	            _iterator3.return();
	          }
	        } finally {
	          if (_didIteratorError3) {
	            throw _iteratorError3;
	          }
	        }
	      }
	    }

	    /**
	     * @description - Removes a reducer from a given list
	     * @param {Function} reducer - function to be removed
	     * @param {Array} list - list that the reducer is to be removed from
	     * @param {String} type - type of action that returned this list; ie
	     * this._reducers[type] = list
	     */

	  }, {
	    key: '_removeReducerFromList',
	    value: function _removeReducerFromList(reducer, list, type) {
	      if (!list) return;
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

	  }, {
	    key: '_removeReducerFromTypes',
	    value: function _removeReducerFromTypes(reducer, types) {
	      var _iteratorNormalCompletion4 = true;
	      var _didIteratorError4 = false;
	      var _iteratorError4 = undefined;

	      try {
	        for (var _iterator4 = types[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
	          var type = _step4.value;

	          this._removeReducerFromList(reducer, this._reducers[type], type);
	        }
	      } catch (err) {
	        _didIteratorError4 = true;
	        _iteratorError4 = err;
	      } finally {
	        try {
	          if (!_iteratorNormalCompletion4 && _iterator4.return) {
	            _iterator4.return();
	          }
	        } finally {
	          if (_didIteratorError4) {
	            throw _iteratorError4;
	          }
	        }
	      }
	    }

	    /**
	     * @description - Removes a reducer from all the types actions it can be
	     * called for
	     * @param {Function} reducer - The function to be removed from all
	     * the lists it appears in in '_reducers'
	     */

	  }, {
	    key: 'removeReducerFromAll',
	    value: function removeReducerFromAll(reducer) {
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

	  }, {
	    key: 'removeReducerFromSelect',
	    value: function removeReducerFromSelect(reducer, types) {
	      if ((typeof types === 'undefined' ? 'undefined' : _typeof(types)) !== "object") throw new TypeError("'types' must be an array!");
	      this._removeReducerFromTypes(reducer, types);
	    }

	    /**
	     * @description - Removes a reducer from only the given type
	     * @param {Function} reducer - The function to be removed from 
	     * the given list
	     * @param {String} type - the type to remove the reducer from
	     */

	  }, {
	    key: 'removeReducer',
	    value: function removeReducer(reducer, type) {
	      this.removeReducerFromSelect(reducer, [type]);
	    }

	    /**
	     * @description - Dispatches an action to appropriate reducers
	     * @param {Object} action - the action to dispatch
	     */

	  }, {
	    key: 'dispatch',
	    value: function dispatch(action) {
	      if (action.type === undefined) {
	        throw "Action must have an action type!";
	      }

	      /* don't throw an error because somethings might spew out actions
	       * that don't necessarily mean an console.error
	       */
	      if (!this._reducers[action.type]) return;
	      var _iteratorNormalCompletion5 = true;
	      var _didIteratorError5 = false;
	      var _iteratorError5 = undefined;

	      try {
	        for (var _iterator5 = this._reducers[action.type][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
	          var fun = _step5.value;

	          fun(action, this);
	        }
	      } catch (err) {
	        _didIteratorError5 = true;
	        _iteratorError5 = err;
	      } finally {
	        try {
	          if (!_iteratorNormalCompletion5 && _iterator5.return) {
	            _iterator5.return();
	          }
	        } finally {
	          if (_didIteratorError5) {
	            throw _iteratorError5;
	          }
	        }
	      }
	    }

	    /**
	     * @description - Adds a processor. This processor is called every time
	     * the manager calls update. Each processor is given the intersection of
	     * entities that contain all the components the processor identifies
	     * @param {Processor} processor - The processor to be added
	     */

	  }, {
	    key: 'addProcessor',
	    value: function addProcessor(processor) {
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

	  }, {
	    key: 'removeProcessor',
	    value: function removeProcessor(processor) {
	      if (!(processor instanceof Processor)) {
	        throw new TypeError("'processor' must be instance of Processor!");
	      }
	      if (!(processor.getName() in this._processors)) {
	        throw new TypeError("'" + processor.getName().toString() + "' wasn't found!");
	      }

	      //delete it from the processor object
	      delete this._processors[processor.getName()];

	      //delete a cached list it has if it has it
	      if (this._processorsCachedEntityLists[processor.getName()]) delete this._processorsCachedEntityLists[processor.getName()];
	    }

	    /**
	     * @description - Iterates through all the manager's processors
	     * and calls them, passing all the entities that have the components
	     * defined by the processor
	     */

	  }, {
	    key: 'update',
	    value: function update() {
	      for (var processorName in this._processors) {
	        var processor = this._processors[processorName];
	        // get the list of entities with the components neededfor the processor
	        if (!this._processorsCachedEntityLists[processorName] || this._processorsCachedEntityLists[processorName].invalid) {
	          this._fetchProcessorEntityList(processorName, processor.getComponentNames());
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

	  }, {
	    key: '_invalidateProcessorLists',
	    value: function _invalidateProcessorLists(entity) {
	      var components = entity.getComponents();
	      for (var processorName in this._processors) {
	        var shouldInvalidate = true;
	        var _iteratorNormalCompletion6 = true;
	        var _didIteratorError6 = false;
	        var _iteratorError6 = undefined;

	        try {
	          for (var _iterator6 = this._processors[processorName].getComponentNames()[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
	            var componentName = _step6.value;

	            if (!(componentName in components)) {
	              shouldInvalidate = false;
	              break;
	            }
	          }
	        } catch (err) {
	          _didIteratorError6 = true;
	          _iteratorError6 = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion6 && _iterator6.return) {
	              _iterator6.return();
	            }
	          } finally {
	            if (_didIteratorError6) {
	              throw _iteratorError6;
	            }
	          }
	        }

	        if (shouldInvalidate && this._processorsCachedEntityLists[processorName] !== undefined) this._processorsCachedEntityLists[processorName].invalid = true;
	      }
	    }

	    /**
	     * @description - Updates the list of entities that will be passed down to
	     * the given processor
	     * @param {String} processorName - name of the processor
	     * @param {Set} componentSet - components returned by Processor.getComponentNames()
	     */

	  }, {
	    key: '_fetchProcessorEntityList',
	    value: function _fetchProcessorEntityList(processorName, componentSet) {
	      // if it's currently undefined, create a new object for it
	      if (!this._processorsCachedEntityLists[processorName]) {
	        this._processorsCachedEntityLists[processorName] = {};
	      }
	      this._processorsCachedEntityLists[processorName].invalid = false;

	      var set = new Set(Object.keys(this._entitiesByHash));
	      var _iteratorNormalCompletion7 = true;
	      var _didIteratorError7 = false;
	      var _iteratorError7 = undefined;

	      try {
	        for (var _iterator7 = componentSet[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
	          var component = _step7.value;

	          /* none of the entities in the manager have a required component of the
	           * processor, return empty set
	           */
	          if (!this.hasComponent(component)) {
	            this._processorsCachedEntityLists[processorName].set = new Set();
	            return;
	          }
	          set = set.intersection(this.getEntitiesByComponent(component));
	        }
	      } catch (err) {
	        _didIteratorError7 = true;
	        _iteratorError7 = err;
	      } finally {
	        try {
	          if (!_iteratorNormalCompletion7 && _iterator7.return) {
	            _iterator7.return();
	          }
	        } finally {
	          if (_didIteratorError7) {
	            throw _iteratorError7;
	          }
	        }
	      }

	      this._processorsCachedEntityLists[processorName].set = set;
	    }
	  }]);

	  return Manager;
	}();

	module.exports = {
	  'Manager': Manager,
	  ADD_ENTITY: ADD_ENTITY,
	  REMOVE_ENTITY: REMOVE_ENTITY,
	  HASH_LENGTH: HASH_LENGTH
	};

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	//Entity.js//

	/**
	 * @description - Defines an entity-- which is essentially a bag of components
	 * @author - Samuel Faulkner
	 */

	var Entity = function () {
	  function Entity(manager) {
	    _classCallCheck(this, Entity);

	    this._manager = manager;
	    if (!this._manager) {
	      throw "'manager' must be defined!";
	    }
	    this._components = {};
	  }

	  _createClass(Entity, [{
	    key: "hash",
	    value: function hash() {
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

	  }, {
	    key: "addComponent",
	    value: function addComponent(component) {
	      if (!(component.name !== undefined && component.state !== undefined && _typeof(component.state) === 'object')) {
	        throw "Component must have 'name' and 'state'!";
	      }

	      this._components[component.name] = component.state;
	    }

	    /**
	     * @description - Returns the object contianing all of the objects for this
	     * entity
	     * @return {Object} - contains all the entities components
	     */

	  }, {
	    key: "getComponents",
	    value: function getComponents() {
	      return this._components;
	    }

	    /**
	     * @description - Returns the given component's state
	     * @param {String} name - the name of the component
	     * @return {Object} the state of the component referred to by the given
	     * name
	     */

	  }, {
	    key: "getComponent",
	    value: function getComponent(name) {
	      if (!(name in this._components)) {
	        throw "'" + name + "' isn't a component of this entity!";
	      }
	      return this._components[name];
	    }

	    /**
	     * @description - Deletes a component from the entity
	     * @param {String} name - the name of the component to be deleted
	     */

	  }, {
	    key: "removeComponent",
	    value: function removeComponent(name) {
	      if (!(name in this._components)) {
	        throw "'" + name + "' isn't a component of this entity!";
	      }

	      delete this._components[name];
	    }
	  }]);

	  return Entity;
	}();

	module.exports = {
	  Entity: Entity
	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	//Processor.js//

	/**
	 * @description - Defines a Processor's behavior. A processor 'processes' state
	 * and is updated every time. Each one is defined by the type of components 
	 * it updates. Example: RenderProcessor processes every RenderComponent every 
	 * frame to update the render view
	 * @author Samuel Faulkner
	 */

	var Processor = function () {
	  function Processor(manager, name) {
	    _classCallCheck(this, Processor);

	    if (!manager) {
	      throw new TypeError("'manager' must be defined!");
	    }

	    var functions = ['update', 'getComponentNames'];
	    var _iteratorNormalCompletion = true;
	    var _didIteratorError = false;
	    var _iteratorError = undefined;

	    try {
	      for (var _iterator = functions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	        var fun = _step.value;

	        if (!this[fun]) {
	          throw new TypeError("'" + fun + "' function must be defined");
	        }
	      }
	    } catch (err) {
	      _didIteratorError = true;
	      _iteratorError = err;
	    } finally {
	      try {
	        if (!_iteratorNormalCompletion && _iterator.return) {
	          _iterator.return();
	        }
	      } finally {
	        if (_didIteratorError) {
	          throw _iteratorError;
	        }
	      }
	    }

	    this._name = name;
	    this.manager = manager;
	  }

	  _createClass(Processor, [{
	    key: 'getName',
	    value: function getName() {
	      return this._name;
	    }

	    /**
	     * @description - called every frame to process the logic on the given 
	     * entities
	     * @param {Array} entities - list of entities that intersect all of the 
	     * component types that the processor was added to the manager with
	     * @param {Manager} manager - Manager object itself
	     */
	    //abstract update(entites, manager)

	  }]);

	  return Processor;
	}();

	module.exports = {
	  Processor: Processor
	};

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	//RandomStringGenerator.js//

	/**
	 * @description - Returns a random string of a given length
	 * @param {int} length - length of the string
	 * @return {String} - random string of given length
	 */
	module.exports = function () {
	  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

	  var text = "";
	  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	  for (var i = 0; i < length; i++) {
	    text += possible.charAt(Math.floor(Math.random() * possible.length));
	  }return text;
	};

/***/ }
/******/ ]);