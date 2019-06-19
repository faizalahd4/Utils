var indexOf = [].indexOf || function(v) {
  for(var i = this.length;i--&&this[i]!==v;);
return i;
};
export var Utils = {

  getQueryString: function (){
    let search = window.location.search.substring(1);
    let qs = search ? JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', 
        function(key, value) { return key===""?value:decodeURIComponent(value) }): {};
    return qs;
  },
  specialChar: '~',
  safeSpecialChar: function () {
    return '\\x' + ('0' + Utils.specialChar.charCodeAt(0).toString(16)).slice(-2);
  },
  escapedSafeSpecialChar: function () {
    return '\\' + Utils.safeSpecialChar;
  },
  specialCharRG: function () {
    return new RegExp(Utils.safeSpecialChar, 'g');
  },
  safeSpecialCharRG: function () {
    return new RegExp(Utils.escapedSafeSpecialChar, 'g');
  },
  safeStartWithSpecialCharRG: function () {
    return new RegExp('(?:^|([^\\\\]))' + Utils.escapedSafeSpecialChar);
  },
  stringInstrance: function () {
    return String;
  },
  // should be a not so common char
  // possibly one JSON does not encode
  // possibly one encodeURIComponent does not encode
  // right now this char is '~' but this might change in the future
  generateReplacer: function (value, replacer, resolve) {
  var
    doNotIgnore = false,
    inspect = !!replacer,
    path = [],
    all  = [value],
    seen = [value],
    mapp = [resolve ? Utils.specialChar : '[Circular]'],
    last = value,
    lvl  = 1,
    i, fn
  ;
  if (inspect) {
    fn = typeof replacer === 'object' ?
      function (key, value) {
        return key !== '' && indexOf.call(replacer, key) < 0 ? void 0 : value;
      } :
      replacer;
  }
  return function(key, value) {
    // the replacer has rights to decide
    // if a new object should be returned
    // or if there's some key to drop
    // let's call it here rather than "too late"
    if (inspect) value = fn.call(this, key, value);

    // first pass should be ignored, since it's just the initial object
    if (doNotIgnore) {
      if (last !== this) {
        i = lvl - indexOf.call(all, this) - 1;
        lvl -= i;
        all.splice(lvl, all.length);
        path.splice(lvl - 1, path.length);
        last = this;
      }
      // console.log(lvl, key, path);
      if (typeof value === 'object' && value) {
      // if object isn't referring to parent object, add to the
        // object path stack. Otherwise it is already there.
        if (indexOf.call(all, value) < 0) {
          all.push(last = value);
        }
        lvl = all.length;
        i = indexOf.call(seen, value);
        if (i < 0) {
          i = seen.push(value) - 1;
          if (resolve) {
            // key cannot contain specialChar but could be not a string
            path.push(('' + key).replace(Utils.specialCharRG, Utils.safeSpecialChar));
            mapp[i] = Utils.specialChar + path.join(Utils.specialChar);
          } else {
            mapp[i] = mapp[0];
          }
        } else {
          value = mapp[i];
        }
      } else {
        if (typeof value === 'string' && resolve) {
          // ensure no special char involved on deserialization
          // in this case only first char is important
          // no need to replace all value (better performance)
          value = value .replace(Utils.safeSpecialChar, Utils.escapedSafeSpecialChar)
                        .replace(Utils.specialChar, Utils.safeSpecialChar);
        }
      }
    } else {
      doNotIgnore = true;
    }
    return value;
  };
  },

  retrieveFromPath: function(current, keys) {
  for(var i = 0, length = keys.length; i < length; current = current[
    // keys should be normalized back here
    keys[i++].replace(Utils.safeSpecialCharRG, Utils.specialChar)
  ]);
  return current;
  },

  generateReviver: function(reviver) {
  return function(key, value) {
    var isString = typeof value === 'string';
    if (isString && value.charAt(0) === Utils.specialChar) {
      return new String(value.slice(1));
    }
    if (key === '') value = Utils.regenerate(value, value, {});
    // again, only one needed, do not use the RegExp for this replacement
    // only keys need the RegExp
    if (isString) value = value .replace(Utils.safeStartWithSpecialCharRG, '$1' + Utils.specialChar)
                                .replace(Utils.escapedSafeSpecialChar, Utils.safeSpecialChar);
    return reviver ? reviver.call(this, key, value) : value;
  };
  },

  regenerateArray: function(root, current, retrieve) {
  for (var i = 0, length = current.length; i < length; i++) {
    current[i] = Utils.regenerate(root, current[i], retrieve);
  }
  return current;
  },

  regenerateObject: function(root, current, retrieve) {
  for (var key in current) {
    if (current.hasOwnProperty(key)) {
      current[key] = Utils.regenerate(root, current[key], retrieve);
    }
  }
  return current;
  },

  regenerate: function(root, current, retrieve) {
  return current instanceof Array ?
    // fast Array reconstruction
    Utils.regenerateArray(root, current, retrieve) :
    (
      current instanceof String ?
        (
          // root is an empty string
          current.length ?
            (
              retrieve.hasOwnProperty(current) ?
                retrieve[current] :
                retrieve[current] = Utils.retrieveFromPath(
                  root, current.split(Utils.specialChar)
                )
            ) :
            root
        ) :
        (
          current instanceof Object ?
            // dedicated Object parser
            Utils.regenerateObject(root, current, retrieve) :
            // value as it is
            current
        )
    );
  },
  stringify: function(value, replacer, space, doNotResolve) {
  return Utils.parser.stringify(
    value,
    Utils.generateReplacer(value, replacer, !doNotResolve),
    space
  );
  },
  parse: function(text, reviver) {
  return Utils.parser.parse(
    text,
    Utils.generateReviver(reviver)
  );
  },
  parser: JSON
};
