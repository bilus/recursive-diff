const { types, iterableTypes, errors } = require('./config');
const utils = require('./utils');

const checkType = {
  [types.NUMBER]: utils.isNumber,
  [types.BOOLEAN]: utils.isBoolean,
  [types.STRING]: utils.isString,
  [types.DATE]: utils.isDate,
  [types.UNDEFINED]: utils.isUndefined,
  [types.NULL]: utils.isNull,
  [types.ARRAY]: utils.isArray,
  [types.MAP]: utils.isMap,
  [types.SET]: utils.isSet,
  [types.ITERABLE_OBJECT]: utils.isIterableObject,
};

const checkEqualityForComplexTypes = {
  [types.DATE]: utils.areDatesEqual,
  [types.ARRAY]: utils.areArraysEqual,
};

function getType(x) {
  const keys = Object.keys(checkType);
  let type = types.DEFAULT;
  for (let i = 0; i < keys.length; i += 1) {
    if (checkType[keys[i]](x)) {
      type = keys[i];
      break;
    }
  }
  return type;
}

function isIterable(type) {
  return iterableTypes.indexOf(type) >= 0;
}

function isTraversalNeeded(type1, type2, atomicArrays, verbose) {
  return (type1 === type2 && isIterable(type1)
    && (!atomicArrays || type2 !== types.ARRAY))
    || (verbose && ((type1 === types.ITERABLE_OBJECT && type2 === types.UNDEFINED)
      || (type2 === types.ITERABLE_OBJECT && type1 === types.UNDEFINED)));
}

function areEqual(x, y, type1, type2) {
  if (type1 !== type2) {
    return false;
  }
  return checkEqualityForComplexTypes[type1] ? checkEqualityForComplexTypes[type1](x, y) : x === y;
}

function computeOp(x, y, type1, type2) {
  let op;
  if (type1 === types.UNDEFINED && type2 !== types.UNDEFINED) {
    op = 'add';
  } else if (type1 !== types.UNDEFINED && type2 === types.UNDEFINED) {
    op = 'delete';
  } else if (!(areEqual(x, y, type1, type2))) {
    op = 'update';
  } else {
    utils.noop();
  }
  return op;
}

function getKeys(x, y, type) {
  let keys;
  if (type === types.ITERABLE_OBJECT) {
    keys = new Set(Object.keys(x).concat(Object.keys(y)));
  } else if (type === types.ARRAY) {
    keys = x.length > y.length ? new Array(x.length) : new Array(y.length);
    keys = keys.fill(0, 0);
    keys = keys.map((el, i) => i);
    keys = new Set(keys);
  }
  return keys;
}

function isScalar(type) {
  return type !== types.ARRAY
    && type !== types.MAP
    && type !== types.SET
    && type !== types.ITERABLE_OBJECT;
}

function guessIsScalar(xType, yType) {
  // Use the type of the right-hand side value unless it cannot be inferred from,
  // falling-back on the left-hand side.
  if (yType === types.NULL || yType === types.UNDEFINED) {
    return isScalar(xType);
  }
  return isScalar(yType);
}

function makeDiff(x, y, op, path, keepOldVal, xType, yType) {
  const diffOb = {
    op,
    path,
  };
  if (op === 'add' || op === 'update') {
    diffOb.val = y;
  }
  if (keepOldVal && op !== 'add') {
    diffOb.oldVal = x;
  }
  diffOb.scalar = guessIsScalar(xType, yType);
  return diffOb;
}

function privateGetDiff(x, y, keepOldVal, atomicArrays, verbose, path, diff) {
  const type1 = getType(x);
  const type2 = getType(y);
  const currPath = path || [];
  const currDiff = diff || [];
  if (isTraversalNeeded(type1, type2, atomicArrays, verbose)) {
    // TODO: Refactor this code.
    if (type1 === types.UNDEFINED) {
      // assert(isIterable(type2));
      const iterator = getKeys(y, y, type2).values(); // TODO: Adapt getKeys to this use case.
      let key = iterator.next().value;
      while (key != null) {
        privateGetDiff(undefined, y[key], keepOldVal, atomicArrays, verbose,
          currPath.concat(key), currDiff);
        key = iterator.next().value;
      }
    } else if (type2 === types.UNDEFINED) {
      // assert(isIterable(type2));
      const iterator = getKeys(x, x, type1).values(); // TODO: Adapt getKeys to this use case.
      let key = iterator.next().value;
      while (key != null) {
        privateGetDiff(x[key], undefined, keepOldVal, atomicArrays, verbose,
          currPath.concat(key), currDiff);
        key = iterator.next().value;
      }
    } else {
      const iterator = getKeys(x, y, type1).values();
      let key = iterator.next().value;
      while (key != null) {
        privateGetDiff(x[key], y[key], keepOldVal, atomicArrays, verbose,
          currPath.concat(key), currDiff);
        key = iterator.next().value;
      }
    }
  } else {
    const op = computeOp(x, y, type1, type2);
    if (op != null) {
      const diffItem = makeDiff(x, y, op, path, keepOldVal, type1, type2);
      currDiff.push(diffItem);
    }
  }
  return currDiff;
}

const opHandlers = {
  add: utils.setValueByPath,
  update: utils.setValueByPath,
  delete: utils.deleteValueByPath,
};

function privateApplyDiff(x, diff, visitorCallback) {
  if (!(diff instanceof Array)) throw new Error(errors.INVALID_DIFF_FORMAT);
  let y = x;
  diff.forEach((diffItem) => {
    const { op, val, path } = diffItem;
    if (!opHandlers[op]) {
      throw new Error(errors.INVALID_DIFF_OP);
    }
    y = opHandlers[op](y, path, val, visitorCallback);
  });
  return y;
}

module.exports = {
  getDiff(x, y, keepOldValInDiff = false, atomicArrays = false, verbose = false) {
    return privateGetDiff(x, y, keepOldValInDiff, atomicArrays, verbose);
  },
  applyDiff(x, diff, visitorCallback) {
    return privateApplyDiff(x, diff, visitorCallback);
  },
};
