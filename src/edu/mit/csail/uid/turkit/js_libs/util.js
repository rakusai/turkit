
/**
	Re-throws the given exception, with an attempt to preserve the original stack trace.
 */
function rethrow(e) {
	if (e.rhinoException) {
		throw e.rhinoException.getMessage() + "\n" + e.rhinoException.getScriptStackTrace()
	} else if ((typeof e) == "object") {
		var b = new Packages.java.io.ByteArrayOutputStream()
		var w = new Packages.java.io.PrintStream(b, true)
		e.printStackTrace(w)
		w.flush()
		w.close()
		throw e.getMessage() + "\n" + b.toString()
	} else {
        throw e
    }
}


/**
	Groups the values in the object or array <code>a</code>
	by the key defined for each value by running <code>func</code> on that value.
	The result is a map of keys to arrays, where each array holds all the values associated with that key.	
 */
function group(a, func) {
    var m = {}
    foreach(a, function (e) {
        var key = func(e)
        var arr = m[key]
        if (!arr) {
            arr = []
            m[key] = arr
        }
        arr.push(e)
    })
    return m
}


/**
    A thin wrapper around Java's System.out.println(s).
    If <code>s</code> is an object, then it is converted into a string using {@link json}.
*/
function print(s) {
	if ((typeof s) == "object") {
		s = json(s)
	}
	Packages.java.lang.System.out["println(java.lang.Object)"](s)
}

/**
    Sleep for the specified number of seconds using Java's Thread.sleep
*/
function sleep(seconds) {
	Packages.java.lang.Thread.sleep(Math.floor(1000 * seconds))
}

/**
    Wraps Java's System.currentTimeMillis(). Returns the current time in milliseconds.
*/
function time() {
    return Packages.java.lang.System.currentTimeMillis()
}

/**
	Return the md5 hash of the given string.
 */
function md5(s) {
	return Packages.edu.mit.csail.uid.turkit.util.U.md5(s)
}

/**
    Returns a JSON-like representation of the JavaScript data value. You may call "eval" on the result and get back the original data structure. This works even if the structure contains nested or even circular references. It does not handle functions.
    @param o The data value to convert. May be a number, string, array or object.
    @returns A JSON-like representation of o.
    @type String
*/
function json(o) {
	return "" + Packages.edu.mit.csail.uid.turkit.RhinoUtil.json(o)
}

// adapted from "parse" function at http://json.org/json.js
/**
    Returns true if it is safe to call eval on s, i.e., calling eval on s will not have any side effects aside from creating a data structure.
*/
function safeJson(s) {
	var safeJson_re = /(\s+|[\(\)\{\}\[\]=:,]|'(\\\'|[^'])*'|"(\\\"|[^"])*"|[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?|function|var|data|return|true|false|undefined|null|\/\*(\*+[^\*\/]|[^\*])*\*+\/)+/
	var m = s.match(safeJson_re)
	return m && (m[0] == s)
}

/**
    Ensures that a JavaScript path exists, assigns a default value to the path if it doesn't exist yet, and returns the value in either case. There are multiple ways to call this function. All of the following are equivalent:<br>
    <code>
        ensure("a.b[2].c", 5)<br>
        ensure(null, "a.b[2].c", 5)<br>
        ensure(a, "b[2].c", 5)<br>
        ensure(a, ".b[2].c", 5)<br>
        ensure(a, ["b", 2, "c"], 5)<br>
        <br>
        print(a.b[2].c)<br>
        <br>
    </code>
    The last line prints "5". Note that the last 3 versions only work if <code>a</code> is already an object.
*/
function ensure(obj, path, defaultValue) {
    if (typeof obj == "string") {
        return ensure(null, obj, path)
    }
    if (obj && (typeof path == "string") && path.match(/^[^\[\.]/)) {
        return ensure(obj, '.' + path, defaultValue)
    }
    
    if (defaultValue == undefined) {
        defaultValue = {}
    }
    
    var so_far = obj ? "obj" : ""
    if (typeof path == "string") {
        var parts = path.match(/(^|\.)\w+|\[('(\\'|[^'])*'|"(\\"|[^"])*"|[^\]]+)\]/g)
    } else {
        var parts = map(path, function (part, i) { return (i == 0 && so_far == "") ? part : '[' + json(part) + ']' })
    }
    foreach(parts, function (part, i) {
        so_far += part
        if (eval("typeof " + so_far) == "undefined") {
            if (i < parts.length - 1) {
                if (parts[i + 1].match(/\[\d+\]/)) {
                    eval(so_far + " = []")
                } else {
                    eval(so_far + " = {}")
                }
            } else {
                eval(so_far + " = defaultValue")
            }
        }
    })
    return eval(so_far)
}

/**
    Returns an array of the values in an object.
    @type Array
*/
function values(obj) {
	var a = []
	foreach(obj, function(e) {
				a.push(e)
			})
	return a
}

/**
    Returns the keys of an object as an array.
    @type Array
*/
function keys(obj) {
	var a = []
	foreach(obj, function(v, k) {
				a.push(k)
			})
	return a
}

/**
    Filters values of an array or object using the <i>test</i> function; the original object is not affected.<br>
    For example:<br>
    <code>filter({a:5,b:7,c:3}, function (e) {return e >= 5})</code><br>
    returns <code>{a:5,b:7}</code>.<br>
    You may also use a string for <i>test</i> like so:<br>
    <code>filter({a:5,b:7,c:3}, "e >= 5")</code>.<br>
    Note that <i>e</i> is a special value in the string.
*/
function filter(a, test) {
	if (typeof test == "string") {
		var testString = test
		test = function(v, k) {
			var i = k
			var e = v
			return eval(testString)
		}
	}
	if (a instanceof Array) {
		var b = []
		for (var i = 0; i < a.length; i++) {
			var v = a[i]
			if (test(v, i)) {
				b.push(v)
			}
		}
		return b
	} else if ((typeof a) == "xml") {
		var b = []
		for (var i = 0; i < a.length(); i++) {
			var v = a[i]
			if (test(v, i)) {
				b.push(v)
			}
		}
		return b
	} else {
		var b = {}
		for (var k in a) {
			if (a.hasOwnProperty(k)) {
				var v = a[k]
				if (test(v, k)) {
					b[k] = v
				}
			}
		}
		return b
	}
}

/**
    Processes values of an array or object using the <i>test</i> function; the original object is not affected.<br>
    For example:<br>
    <code>foreach({a:5,b:7,c:3}, function (e) {print(e)})</code><br>
    prints 5, 7, 3<br>
    You may also use a string for <i>test</i> like so:<br>
    <code>foreach({a:5,b:7,c:3}, "print(e)")</code>.<br>
    Note that <i>e</i> is a special value in the string. Another special value is <i>i</i>, which is the index or key of the current element.
*/
function foreach(a, test) {
	if (typeof test == "string") {
		var testString = test
		test = function(v, k) {
			var i = k
			var e = v
			return eval(testString)
		}
	}
	if (a instanceof Array) {
		for (var i = 0; i < a.length; i++) {
			if (test(a[i], i) == false)
				break
		}
	} else if ((typeof a) == "xml") {
		for (var i = 0; i < a.length(); i++) {
			if (test(a[i], i) == false)
				break
		}
	} else {
		for (var k in a) {
			if (a.hasOwnProperty(k)) {
				if (test(a[k], k) == false)
					break
			}
		}
	}
	return a
}

/**
    Maps values of an array or object using the <i>test</i> function; the original object is not affected.<br>
    For example:<br>
    <code>map({a:5,b:7,c:3}, function (e) {return e + 1})</code><br>
    returns <code>{a:6,b:8,c:4}</code>.<br>
    You may also use a string for <i>test</i> like so:<br>
    <code>map({a:5,b:7,c:3}, "e + 1")</code>.<br>
    Note that <i>e</i> is a special value in the string. Another special value is <i>i</i>, which is the index or key of the current element.
*/
function map(a, test) {
	if (typeof test == "string") {
		var testString = test
		test = function(v, k) {
			var i = k
			var e = v
			return eval(testString)
		}
	}
	if (a instanceof Array) {
		var b = []
		for (var i = 0; i < a.length; i++) {
			b.push(test(a[i], i))
		}
		return b
	} else if ((typeof a) == "xml") {
		var b = []
		for (var i = 0; i < a.length(); i++) {
			b.push(test(a[i], i))
		}
		return b
	} else {
		var b = {}
		for (var k in a) {
			if (a.hasOwnProperty(k)) {
				b[k] = test(a[k], k)
			}
		}
		return b
	}
}

/**
    Maps values of an array or object using the <i>test</i> function, overriding the values in the original object.<br>
    For example:<br>
    <code>mapToSelf({a:5,b:7,c:3}, function (e) {return e + 1})</code><br>
    returns <code>{a:6,b:8,c:4}</code>.<br>
    You may also use a string for <i>test</i> like so:<br>
    <code>mapToSelf({a:5,b:7,c:3}, "e + 1")</code>.<br>
    Note that <i>e</i> is a special value in the string. Another special value is <i>i</i>, which is the index or key of the current element.
*/
function mapToSelf(a, test) {
    if (typeof test == "string") {
        var testString = test
        test = function (v, k) {
            var i = k
            var e = v
            return eval(testString)
        }
    }
    if (a instanceof Array) {
        for (var i = 0; i < a.length; i++) {
            a[i] = test(a[i], i)
        }
        return a
    } else {
        for (var k in a) {
            if (a.hasOwnProperty(k)) {
                a[k] = test(a[k], k)
            }
        }
        return a
    }
}

/**
	<p>Here is an example of <code>fold</code>:<br>
	<code>fold([1, 1, 1, 1], function (x, y) { return x + y }, 0)</code><br>
	returns <code>4</code>.</p>
	
	<p>The value of <code>x</code> in the function will always come from
	an element of <code>a</code>.</p>
	
	<p>If the parameter <code>def</code> is used,
	then the value of <code>y</code> in the function
	will always come from <code>def</code>,
	or from a return value of <code>func</code>.
	If <code>a</code> has no elements, then <code>def</code> will be returned.</p>
	
	<p>If <code>def</code> is not supplied,
	then both <code>x</code> and <code>y</code> will come from <code>a</code>.
	If <code>a</code> has only 1 element,
	then <code>func</code> will not be called,
	and that one element will be returned.
	If <code>a</code> has no elements, then <code>null</code> will be returned.</p> 
*/
function fold(a, func, def) {
	if (def === undefined) {
		var ret = null
		var first = true
		foreach(a, function (e, i) {
			if (first) {
				ret = e
				first = false
			} else {
				ret = func(e, ret, i)
			}
		})
		return ret	
	} else {
		var ret = def
		foreach(a, function (e, i) {
			ret = func(e, ret, i)
		})	
		return ret
	}
}

/**
    Removes whitespace from the front and back of the string.
*/
function trim(s) {
    return s.replace(/^\s+|\s+$/g,"");
}
/**
    Removes whitespace from the front and back of the string.
*/
String.prototype.trim = function() {
    return trim(this)
}

/**
    Returns the last element of this array.
*/
function last(a) {
	return a[a.length - 1]
}
/**
    Returns the last element of this array.
*/
Array.prototype.last = function() {
	return last(this)
}

/**
    Returns a deep clone of <i>o</i> up to the specified <i>depth</i>.<br>
    For example:<br>
    <code>
        prune({a:{b:5},c:[1,2,3]}, 1)
    </code><br>
    Returns <code>{a:{},c:[]}</code>
*/
function prune(o, depth) {
	if (depth === undefined)
		depth = 1
	if (o instanceof Array) {
		var newO = []
	} else {
		var newO = {}
	}
	if (depth > 0) {
		foreach(o, function(v, k) {
					if ((typeof v) == "object") {
						v = prune(v, depth - 1)
					}
					newO[k] = v
				})
	}
	return newO
}

/**
    Adds the key/value pairs found in <i>objB</i> to <i>objA</i>.<br>
    For example:<br>
    <code>
        merge({a:1, b:2}, {c:3, d:4})
    </code><br>
    returns <code>{a:1, b:2, c:3, d:4}</code>
*/
function merge(objA, objB) {
	foreach(objB, function(v, k) {
				objA[k] = v
			})
	return objA
}

/**
    Passes each value of an array or object through the <i>test</i> function, and returns the maximum value found, along with the index it was found at, in an array.<br>
    For example:<br>
    <code>getMax({a:5,b:7,c:3}, function (e) {return e})</code><br>
    returns [7, "b"]<br>
    You may also use a string for <i>test</i> like so:<br>
    <code>getMax({a:5,b:7,c:3}, "e")</code>.<br>
    Note that <i>e</i> is a special value in the string. Another special value is <i>i</i>, which is the index or key of the current element. If you omit a value for <i>test</i>, the default is "e".
    @param a An array or object.
    @param test Each element in <i>a</i> is passed through this. The default is the identity function.    
*/
function getMax(a, test) {
    if (test == null) {
        test = function (v, k) {
            return v
        }
    } else if (typeof test == "string") {
        var testString = test
        test = function (v, k) {
            var i = k
            var e = v
            return eval(testString)
        }
    }
    if (a instanceof Array) {
        var bestScore = null
        var bestElement = null
        var bestIndex = null
        for (var i = 0; i < a.length; i++) {
            var v = a[i]
            var score = test(v, i)
            if (bestElement == null || score > bestScore) {
                bestScore = score
                bestElement = v
                bestIndex = i
            }
        }
        return [bestElement, bestIndex]
    } else {
        var bestScore = null
        var bestElement = null
        var bestIndex = null
        for (var k in a) {
            if (a.hasOwnProperty(k)) {
                var v = a[k]
                var score = test(v, k)
                if (bestElement == null || score > bestScore) {
                    bestScore = score
                    bestElement = v
                    bestIndex = k
                }
            }
        }
        return [bestElement, bestIndex]
    }
}

/**
 * Returns a JavaScript array given a Java array.
 */
function convertJavaArray(ja) {
	var a = []
	for (var i = 0; i < ja.length; i++) {
		a.push(ja[i])
	}
	return a
}

/**
	Escape the string for use inside XML, e.g., convert characters like &amp; into &amp;amp;.
 */
escapeXml = function (s) {
    s = s.replace(/&/g, "&amp;")
    s = s.replace(/</g, "&lt;").
        replace(/>/g, "&gt;").
        replace(/'/g, "&apos;").
        replace(/"/g, "&quot;").
//            replace(/[\u0000-\u001F]|[\u0080-\uFFFF]/g, function (c) {
        replace(/[\u0080-\uFFFF]/g, function (c) {
            var code = c.charCodeAt(0)
            return '&#' + code + ';'
            // if we want hex:
            var hex = code.toString(16)
            return '&#x' + hex + ';'
        })
    return s;
}

/**
	Unescape a string with XML escape codes, e.g., convert sequences like &amp;amp; into &amp;.
 */
unescapeXml = function (s) {
    return s.replace(/&[^;]+;/g, function (s) {
        switch(s.substring(1, s.length - 1)) {
            case "amp":  return "&";
            case "lt":   return "<";
            case "gt":   return ">";
            case "apos": return "'";
            case "quot": return '"';
            default:
                if (s.charAt(1) == "#") {
                    if (s.charAt(2) == "x") {
                        return String.fromCharCode(parseInt(s.substring(3, s.length - 1), 16));
                    } else {
                        return String.fromCharCode(parseInt(s.substring(2, s.length - 1)));
                    }
                } else {
                    throw new java.lang.Exception("unknown XML escape sequence: " + s)
                }
        }
    })
}

/**
	<p>Takes two strings <code>a</code> and <code>b</code>, and calculates their differences.
	The differences are highlighted in each result using HTML span tags with yellow backgrounds.
	There are two resulting strings of HTML, returned in an object with two properties, <code>a</code> and <code>b</code>.</p>
 */
function highlightDiff(a, b) {
    a = a.match(/\w+|\S+|\s+/g)
    if (!a) a = []
    b = b.match(/\w+|\S+|\s+/g)
    if (!b) b = []
    mapToSelf(a, function (e) { return ":" + e })
    mapToSelf(b, function (e) { return ":" + e })
    diff(a, b)
    function toHTML(tokens) {
        var yellow = false
        var s = []
        foreach(tokens, function (token) {
            if (typeof token == "string") {
                if (!yellow) {
                    yellow = true
                    s.push('<span style="background-color:yellow">')
                }
                s.push(escapeXml(token.substring(1)))
            } else {
                if (yellow) {
                    yellow = false
                    s.push('</span>')
                }
                s.push(escapeXml(token.text.substring(1)))
            }        
        })
        if (yellow) {
            yellow = false
            s.push('</span>')
        }
        return s.join('')
    }
    return {
        a : toHTML(a),
        b : toHTML(b)
    }
    
	// much of the "diff" function below comes from the web, but I forget where,
	// please let me know if you know the source
    function diff( o, n ) {
      var ns = new Object();
      var os = new Object();
      
      for ( var i = 0; i < n.length; i++ ) {
        if ( ns[ n[i] ] == null )
          ns[ n[i] ] = { rows: new Array(), o: null };
        ns[ n[i] ].rows.push( i );
      }
      
      for ( var i = 0; i < o.length; i++ ) {
        if ( os[ o[i] ] == null )
          os[ o[i] ] = { rows: new Array(), n: null };
        os[ o[i] ].rows.push( i );
      }
      
      for ( var i in ns ) {
        if ( ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1 ) {
          n[ ns[i].rows[0] ] = { text: n[ ns[i].rows[0] ], row: os[i].rows[0] };
          o[ os[i].rows[0] ] = { text: o[ os[i].rows[0] ], row: ns[i].rows[0] };
        }
      }
      
      for ( var i = 0; i < n.length - 1; i++ ) {
        if ( n[i].text != null && n[i+1].text == null && n[i].row + 1 < o.length && o[ n[i].row + 1 ].text == null && 
             n[i+1] == o[ n[i].row + 1 ] ) {
          n[i+1] = { text: n[i+1], row: n[i].row + 1 };
          o[n[i].row+1] = { text: o[n[i].row+1], row: i + 1 };
        }
      }
      
      for ( var i = n.length - 1; i > 0; i-- ) {
        if ( n[i].text != null && n[i-1].text == null && n[i].row > 0 && o[ n[i].row - 1 ].text == null && 
             n[i-1] == o[ n[i].row - 1 ] ) {
          n[i-1] = { text: n[i-1], row: n[i].row - 1 };
          o[n[i].row-1] = { text: o[n[i].row-1], row: i - 1 };
        }
      }
      
      return { o: o, n: n };
    }
}

/**
	Returns a new Set. A set is represented as an object where the values are true for keys in the set.
	If <code>a</code> is a set, add it's elements to this set.
	If <code>a</code> is an object, add it's values to this set.
	If <code>a</code> is an element, add it to this set.
 */
function Set(a) {
	if (a) {
    	this.add(a)
    }
}

/**
	Returns a clone of the Set.
 */
Set.prototype.clone = function () {
    return new Set(this)
}

/**
	If <code>a</code> is a set, remove it's elements from this set.
	If <code>a</code> is an object, remove it's values from this set.
	If <code>a</code> is an element, remove it from this set.
	
	Returns this Set, after the removal.
	If removing a single element, returns <code>true</code> iff the element existed before.
 */
Set.prototype.remove = function (a) {
    if ((typeof a) == "object") {
        var me = this
        if (a instanceof Set) {
            foreach(a, function (_, a) {
                delete me[a]
            })
        } else {
            foreach(a, function (a) {
                delete me[a]
            })
        }
    } else {
        if (!this[a]) return false
        delete this[a]
        return true
    }
    return this
}

/**
	If <code>a</code> is a set, add it's elements to this set.
	If <code>a</code> is an object, add it's values to this set.
	If <code>a</code> is an element, add it to this set.
	
	Returns this Set, after the addition.
	If adding a single element, returns <code>true</code> iff the element didn't exist before.
 */
Set.prototype.add = function (a) {
    if ((typeof a) == "object") {
        var me = this
        if (a instanceof Set) {
            foreach(a, function (_, a) {
                me[a] = true
            })
        } else {
            foreach(a, function (a) {
                me[a] = true
            })
        }
    } else {
        if (this[a]) return false
        this[a] = true
        return true
    }
    return this
}

/**
	Returns a new Set representing the intersection of this Set with <code>a</code>.
	If <code>a</code> is an object, a set is created from its values, and the intersection is done with that.
	If <code>a</code> is an element, a set is created containing this element, and the intersection is done with that.
 */
Set.prototype.intersect = function (b) {
    var i = new Set()
    if ((typeof a) == "object") {
        var me = this
        if (a instanceof Set) {
            foreach(a, function (_, a) {
            	if (me[a]) i[a] = true
            })
        } else {
            foreach(a, function (a) {
            	if (me[a]) i[a] = true
            })
        }
    } else {
    	if (this[a]) i[a] = true
    }
    return i
}

/**
	Returns a new Bag data structure,
	which is an unordered collection of objects,
	where objects can appear multiple times.
	The bag is really a map of keys,
	where the value associated with each key
	represents the number of times that key appears in the bag.
	
	If <code>a</code> is a bag, add it's elements to this bag.
	If <code>a</code> is an object, add it's values to this bag.
	If <code>a</code> is an element, add it to this bag.
 */
function Bag(a) {
	if (a) {
		this.add(a)
	}
}

/**
	Returns a clone of the bag.
 */
Bag.prototype.clone = function () {
    return new Bag(this)
}

/**
	If <code>a</code> is a bag, add it's elements to this bag, and returns the new bag.
	If <code>a</code> is an object, add it's values to this bag, and returns the new bag.
	If <code>a</code> is an element, add it to this bag, and return the new number of times it appears.
	
	The parameter <code>count</code> defaults to 1,
	but can be changed to add multiple copies of <code>a</code> to the bag.
 */
Bag.prototype.add = function (a, count) {
	if (count === undefined) count = 1
	if ((typeof a) == "object") {
		var me = this
		if (a instanceof Bag) {
			foreach(a, function (v, a) {
				me.add(a, v * count)
			})
		} else {
			foreach(a, function (a) {
				me.add(a, count)
			})
		}
	} else {
		var v = this[a]
		if (!v) v = 0
		v += count
		this[a] = v
		return v
	}
	return this
}

/**
 * see documentation here: <a href="http://goessner.net/articles/JsonPath/">http://goessner.net/articles/JsonPath/</a>
 * 
 * from: http://code.google.com/p/jsonpath/
 * 
 * JSONPath 0.8.0 - XPath for JSON
 *
 * Copyright (c) 2007 Stefan Goessner (goessner.net)
 * Licensed under the MIT (MIT-LICENSE.txt) licence.
 */
function jsonPath(obj, expr, arg) {
   var P = {
      resultType: arg && arg.resultType || "VALUE",
      result: [],
      normalize: function(expr) {
         var subx = [];
         return expr.replace(/[\['](\??\(.*?\))[\]']/g, function($0,$1){return "[#"+(subx.push($1)-1)+"]";})
                    .replace(/'?\.'?|\['?/g, ";")
                    .replace(/;;;|;;/g, ";..;")
                    .replace(/;$|'?\]|'$/g, "")
                    .replace(/#([0-9]+)/g, function($0,$1){return subx[$1];});
      },
      asPath: function(path) {
         var x = path.split(";"), p = "$";
         for (var i=1,n=x.length; i<n; i++)
            p += /^[0-9*]+$/.test(x[i]) ? ("["+x[i]+"]") : ("['"+x[i]+"']");
         return p;
      },
      store: function(p, v) {
         if (p) P.result[P.result.length] = P.resultType == "PATH" ? P.asPath(p) : v;
         return !!p;
      },
      trace: function(expr, val, path) {
         if (expr) {
            var x = expr.split(";"), loc = x.shift();
            x = x.join(";");
            if (val && val.hasOwnProperty(loc))
               P.trace(x, val[loc], path + ";" + loc);
            else if (loc === "*")
               P.walk(loc, x, val, path, function(m,l,x,v,p) { P.trace(m+";"+x,v,p); });
            else if (loc === "..") {
               P.trace(x, val, path);
               P.walk(loc, x, val, path, function(m,l,x,v,p) { typeof v[m] === "object" && P.trace("..;"+x,v[m],p+";"+m); });
            }
            else if (/,/.test(loc)) { // [name1,name2,...]
               for (var s=loc.split(/'?,'?/),i=0,n=s.length; i<n; i++)
                  P.trace(s[i]+";"+x, val, path);
            }
            else if (/^\(.*?\)$/.test(loc)) // [(expr)]
               P.trace(P.eval(loc, val, path.substr(path.lastIndexOf(";")+1))+";"+x, val, path);
            else if (/^\?\(.*?\)$/.test(loc)) // [?(expr)]
               P.walk(loc, x, val, path, function(m,l,x,v,p) { if (P.eval(l.replace(/^\?\((.*?)\)$/,"$1"),v[m],m)) P.trace(m+";"+x,v,p); });
            else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) // [start:end:step]  phyton slice syntax
               P.slice(loc, x, val, path);
         }
         else
            P.store(path, val);
      },
      walk: function(loc, expr, val, path, f) {
         if (val instanceof Array) {
            for (var i=0,n=val.length; i<n; i++)
               if (i in val)
                  f(i,loc,expr,val,path);
         }
         else if (typeof val === "object") {
            for (var m in val)
               if (val.hasOwnProperty(m))
                  f(m,loc,expr,val,path);
         }
      },
      slice: function(loc, expr, val, path) {
         if (val instanceof Array) {
            var len=val.length, start=0, end=len, step=1;
            loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g, function($0,$1,$2,$3){start=parseInt($1||start);end=parseInt($2||end);step=parseInt($3||step);});
            start = (start < 0) ? Math.max(0,start+len) : Math.min(len,start);
            end   = (end < 0)   ? Math.max(0,end+len)   : Math.min(len,end);
            for (var i=start; i<end; i+=step)
               P.trace(i+";"+expr, val, path);
         }
      },
      eval: function(x, _v, _vname) {
         try { return $ && _v && eval(x.replace(/@/g, "_v")); }
         catch(e) { throw new SyntaxError("jsonPath: " + e.message + ": " + x.replace(/@/g, "_v").replace(/\^/g, "_a")); }
      }
   };

   var $ = obj;
   if (expr && obj && (P.resultType == "VALUE" || P.resultType == "PATH")) {
      P.trace(P.normalize(expr).replace(/^\$;/,""), obj, "$");
      return P.result.length ? P.result : false;
   }
} 
