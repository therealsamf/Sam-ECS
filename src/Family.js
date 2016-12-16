//Family.js//

/**
 * @description - More robust than a set for choosing entities to 
 * be included in a processor
 * @author - Sam Faulkner
 */

const FastSet = require('collections/fast-set.js');

class Family {
  constructor(mustHave, cannotHave) {
    if (typeof mustHave == 'object') {
      mustHave = new FastSet(mustHave);
    }
    if (typeof cannotHave == 'object') {
      cannotHave = new FastSet(cannotHave);
    }
    this._mustHaves = mustHave || new FastSet();
    this._cannotHave = cannotHave || new FastSet();
  }

  getHaves() {
    return this._mustHaves;
  }

  getCannotHaves() {
    return this._cannotHave;
  }

  has(singleComponent) {
    return this._mustHaves.has(singleComponent) && !this._cannotHave.has(singleComponent);
  }

  /**
   * @description - Returns a boolean if this entity belongs in this 
   * family
   * @param {Entity} entity - the entity to test
   */
  testEntity(entity) {
    return this.testComponentSet(Object.keys(entity.getComponents()));
  }

  /**
   * @description - Returns true if the set of components could belong
   * in this set or not
   * @param {Set} set - the set of components to test
   */
  testComponentSet(set) {
    return this._mustHaves.intersection(set).length == this._mustHaves.length &&
      this._cannotHave.intersection(set).length == 0;
  }
}

module.exports = Family;