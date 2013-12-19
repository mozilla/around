
//Wrapped in an outer function to preserve global this
(function (root) { var amdExports; define('zepto',[], function () { (function () {

/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */
;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+/, '').replace(/\s+$/, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()
var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,

    // Used by `$.zepto.init` to wrap elements, text/comment nodes, document,
    // and document fragment node types.
    elementTypes = [1, 3, 8, 9, 11],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/,
    toString = ({}).toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function isFunction(value) { return toString.call(value) == "[object Function]" }
  function isObject(value) { return value instanceof Object }
  function isPlainObject(value) {
    var key, ctor
    if (toString.call(value) !== "[object Object]") return false
    ctor = (isFunction(value.constructor) && value.constructor.prototype)
    if (!ctor || !hasOwnProperty.call(ctor, 'isPrototypeOf')) return false
    for (key in value);
    return key === undefined || hasOwnProperty.call(value, key)
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return array.filter(function(item){ return item !== undefined && item !== null }) }
  function flatten(array) { return array.length > 0 ? [].concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return array.filter(function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name) {
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'
    var container = containers[name]
    container.innerHTML = '' + html
    return $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = arguments.callee.prototype
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // if a JavaScript object is given, return a copy of it
      // this is a somewhat peculiar option, but supported by
      // jQuery so we'll do it, too
      else if (isPlainObject(selector))
        dom = [$.extend({}, selector)], selector = null
      // wrap stuff like `document` or `window`
      else if (elementTypes.indexOf(selector.nodeType) >= 0 || selector === window)
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, whichs makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    slice.call(arguments, 1).forEach(function(source) {
      for (key in source)
        if (source[key] !== undefined)
          target[key] = source[key]
    })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (element === document && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : emptyArray ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? emptyArray :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  function funcArg(context, arg, idx, payload) {
   return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  $.isFunction = isFunction
  $.isObject = isObject
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $.map(this, function(el, i){ return fn.call(el, i, el) })
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      this.forEach(function(el, idx){ callback.call(el, idx, el) })
      return this
    },
    filter: function(selector){
      return $([].filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result
      if (this.length == 1) result = zepto.qsa(this[0], selector)
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return $(result)
    },
    closest: function(selector, context){
      var node = this[0]
      while (node && !zepto.matches(node, selector))
        node = node !== context && node !== document && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && node !== document && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return slice.call(this.children) }), selector)
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return slice.call(el.parentNode.children).filter(function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return this.map(function(){ return this[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(newContent){
      return this.each(function(){
        $(this).wrapAll($(newContent)[0].cloneNode(false))
      })
    },
    wrapAll: function(newContent){
      if (this[0]) {
        $(this[0]).before(newContent = $(newContent))
        newContent.append(this)
      }
      return this
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return $(this.map(function(){ return this.cloneNode(true) }))
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return (setting === undefined ? this.css("display") == "none" : setting) ? this.show() : this.hide()
    },
    prev: function(){ return $(this.pluck('previousElementSibling')) },
    next: function(){ return $(this.pluck('nextElementSibling')) },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) this.setAttribute(key, name[key])
          else this.setAttribute(name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ if (this.nodeType === 1) this.removeAttribute(name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] ? this[0][name] : undefined) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? data : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this.length > 0 ? this[0].value : undefined) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(){
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: obj.width,
        height: obj.height
      }
    },
    css: function(property, value){
      if (value === undefined && typeof property == 'string')
        return (
          this.length == 0
            ? undefined
            : this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      for (key in property)
        if(typeof property[key] == 'string' && property[key] == '')
          this.each(function(){ this.style.removeProperty(dasherize(key)) })
        else
          css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'

      if (typeof property == 'string')
        if (value == '')
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (this.length < 1) return false
      else return classRE(name).test(this[0].className)
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = this.className, newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && (this.className += (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined)
          return this.className = ''
        classList = this.className
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        this.className = classList.trim()
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var newName = funcArg(this, name, idx, this.className)
        ;(when === undefined ? !$(this).hasClass(newName) : when) ?
          $(this).addClass(newName) : $(this).removeClass(newName)
      })
    }
  }

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return this[0] == window ? window['inner' + Dimension] :
        this[0] == document ? document.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        var el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function insert(operator, target, node) {
    var parent = (operator % 2) ? target : target.parentNode
    parent ? parent.insertBefore(node,
      !operator ? target.nextSibling :      // after
      operator == 1 ? parent.firstChild :   // prepend
      operator == 2 ? target :              // before
      null) :                               // append
      $(node).remove()
  }

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(key, operator) {
    $.fn[key] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var nodes = $.map(arguments, function(n){ return isObject(n) ? n : zepto.fragment(n) })
      if (nodes.length < 1) return this
      var size = this.length, copyByClone = size > 1, inReverse = operator < 2

      return this.each(function(index, target){
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[inReverse ? nodes.length-i-1 : i]
          traverseNode(node, function(node){
            if (node.nodeName != null && node.nodeName.toUpperCase() === 'SCRIPT' && (!node.type || node.type === 'text/javascript'))
              window['eval'].call(window, node.innerHTML)
          })
          if (copyByClone && index < size - 1) node = node.cloneNode(true)
          insert(operator, target, node)
        }
      })
    }

    $.fn[(operator % 2) ? key+'To' : 'insert'+(operator ? 'Before' : 'After')] = function(html){
      $(html)[key](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.camelize = camelize
  zepto.uniq = uniq
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
'$' in window || (window.$ = Zepto)
;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={}

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.isObject(events)) $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function add(element, events, fn, selector, getDelegate, capture){
    capture = !!capture
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var delegate = getDelegate && getDelegate(fn, event),
        callback = delegate || fn
      var proxyfn = function (event) {
        var result = callback.apply(element, [event].concat(event.data))
        if (result === false) event.preventDefault()
        return result
      }
      var handler = $.extend(parse(event), {fn: fn, proxy: proxyfn, sel: selector, del: delegate, i: set.length})
      set.push(handler)
      element.addEventListener(handler.e, proxyfn, capture)
    })
  }
  function remove(element, events, fn, selector){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(handler.e, handler.proxy, false)
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var proxy = $.extend({originalEvent: event}, event)
    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    var capture = false
    if(event == 'blur' || event == 'focus'){
      if($.iswebkit)
        event = event == 'blur' ? 'focusout' : event == 'focus' ? 'focusin' : event
      else
        capture = true
    }

    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      }, capture)
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.bind(event, selector) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.unbind(event, selector) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string') event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback){ return this.bind(event, callback) }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else if (this.length) try { this.get(0)[name]() } catch(e){}
      return this
    }
  })

  $.Event = function(type, props) {
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    return event
  }

})(Zepto)
;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/)

    // todo clean this up with a better OS/browser
    // separation. we need to discern between multiple
    // browsers on android, and decide if kindle fire in
    // silk mode is android or not

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)
;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    clearProperties = {}

  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  clearProperties[prefix + 'transition-property'] =
  clearProperties[prefix + 'transition-duration'] =
  clearProperties[prefix + 'transition-timing-function'] =
  clearProperties[prefix + 'animation-name'] =
  clearProperties[prefix + 'animation-duration'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = duration / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var transforms, cssProperties = {}, key, that = this, wrappedCallback, endEvent = $.fx.transitionEnd
    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssProperties[prefix + 'animation-name'] = properties
      cssProperties[prefix + 'animation-duration'] = duration + 's'
      endEvent = $.fx.animationEnd
    } else {
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) {
          transforms || (transforms = [])
          transforms.push(key + '(' + properties[key] + ')')
        }
        else cssProperties[key] = properties[key]

      if (transforms) cssProperties[prefix + 'transform'] = transforms.join(' ')
      if (!$.fx.off && typeof properties === 'object') {
        cssProperties[prefix + 'transition-property'] = Object.keys(properties).join(', ')
        cssProperties[prefix + 'transition-duration'] = duration + 's'
        cssProperties[prefix + 'transition-timing-function'] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, arguments.callee)
      }
      $(this).css(clearProperties)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    setTimeout(function() {
      that.css(cssProperties)
      if (duration <= 0) setTimeout(function() {
        that.each(function(){ wrappedCallback.call(this) })
      }, 0)
    }, 0)

    return this
  }

  testEl = null
})(Zepto)
;(function($){
  var jsonpID = 0,
      isObject = $.isObject,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      abort = function(){
        $(script).remove()
        if (callbackName in window) window[callbackName] = empty
        ajaxComplete('abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (options.error) script.onerror = function() {
      xhr.abort()
      options.error()
    }

    window[callbackName] = function(data){
      clearTimeout(abortTimeout)
      $(script).remove()
      delete window[callbackName]
      ajaxSuccess(data, xhr, options)
    }

    serializeData(options)
    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.abort()
        ajaxComplete('timeout', xhr, options)
      }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0
  }

  function mimeToDataType(mime) {
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (isObject(options.data)) options.data = $.param(options.data)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = $.ajaxSettings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, 'error', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  $.get = function(url, success){ return $.ajax({ url: url, success: success }) }

  $.post = function(url, data, success, dataType){
    if ($.isFunction(data)) dataType = dataType || success, success = data, data = null
    return $.ajax({ type: 'POST', url: url, data: data, success: success, dataType: dataType })
  }

  $.getJSON = function(url, success){
    return $.ajax({ url: url, success: success, dataType: 'json' })
  }

  $.fn.load = function(url, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector
    if (parts.length > 1) url = parts[0], selector = parts[1]
    $.get(url, function(response){
      self.html(selector ?
        $(document.createElement('div')).html(response.replace(rscript, "")).find(selector).html()
        : response)
      success && success.call(self)
    })
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var array = $.isArray(obj)
    $.each(obj, function(key, value) {
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (traditional ? $.isArray(value) : isObject(value))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace('%20', '+')
  }
})(Zepto)
;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)
;(function($){
  var touch = {}, touchTimeout

  function parentIfText(node){
    return 'tagName' in node ? node : node.parentNode
  }

  function swipeDirection(x1, x2, y1, y2){
    var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
    return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  var longTapDelay = 750, longTapTimeout

  function longTap(){
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap(){
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  $(document).ready(function(){
    var now, delta

    $(document.body).bind('touchstart', function(e){
      now = Date.now()
      delta = now - (touch.last || now)
      touch.el = $(parentIfText(e.touches[0].target))
      touchTimeout && clearTimeout(touchTimeout)
      touch.x1 = e.touches[0].pageX
      touch.y1 = e.touches[0].pageY
      if (delta > 0 && delta <= 250) touch.isDoubleTap = true
      touch.last = now
      longTapTimeout = setTimeout(longTap, longTapDelay)
    }).bind('touchmove', function(e){
      cancelLongTap()
      touch.x2 = e.touches[0].pageX
      touch.y2 = e.touches[0].pageY
    }).bind('touchend', function(e){
       cancelLongTap()

      // double tap (tapped twice within 250ms)
      if (touch.isDoubleTap) {
        touch.el.trigger('doubleTap')
        touch = {}

      // swipe
      } else if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                 (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
        touch.el.trigger('swipe') &&
          touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
        touch = {}

      // normal tap
      } else if ('last' in touch) {
        touch.el.trigger('tap')

        touchTimeout = setTimeout(function(){
          touchTimeout = null
          touch.el.trigger('singleTap')
          touch = {}
        }, 250)
      }
    }).bind('touchcancel', function(){
      if (touchTimeout) clearTimeout(touchTimeout)
      if (longTapTimeout) clearTimeout(longTapTimeout)
      longTapTimeout = touchTimeout = null
      touch = {}
    })
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
    $.fn[m] = function(callback){ return this.bind(m, callback) }
  })
})(Zepto)


amdExports = Zepto;

}.call(root));
    return amdExports;
}); }(this));

/**
 * @license
 * Lo-Dash 1.0.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash csp`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.4.4 <http://underscorejs.org/>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window) {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports;

  /** Detect free variable `module` */
  var freeModule = typeof module == 'object' && module && module.exports == freeExports && module;

  /** Detect free variable `global` and use it as `window` */
  var freeGlobal = typeof global == 'object' && global;
  if (freeGlobal.global === freeGlobal) {
    window = freeGlobal;
  }

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used internally to indicate various things */
  var indicatorObject = {};

  /** Used by `cachedContains` as the default size when optimizations are enabled for large arrays */
  var largeArraySize = 30;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-7.8.6
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading zeros to be removed */
  var reLeadingZeros = /^0+(?=.$)/;

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to match HTML characters */
  var reUnescapedHtml = /[&<>"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object', 'RegExp',
    'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN', 'parseInt',
    'setImmediate', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given `context` object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=window] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.com/#x11.1.5.
    context = context ? _.defaults(window.Object(), context, _.pick(window, contextProps)) : window;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String;

    /** Used for `Array` and `Object` method references */
    var arrayRef = Array(),
        objectRef = Object();

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      (objectRef.valueOf + '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        concat = arrayRef.concat,
        floor = Math.floor,
        getPrototypeOf = reNative.test(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectRef.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        toString = objectRef.toString;

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeBind = reNative.test(nativeBind = slice.bind) && nativeBind,
        nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Detect various environments */
    var isIeOpera = reNative.test(context.attachEvent),
        isV8 = nativeBind && !/\n|true/.test(nativeBind + isIeOpera);

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object, that wraps the given `value`, to enable method
     * chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `createCallback`, `debounce`, `defaults`,
     * `defer`, `delay`, `difference`, `filter`, `flatten`, `forEach`, `forIn`,
     * `forOwn`, `functions`, `groupBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `push`, `range`,
     * `reject`, `rest`, `reverse`, `shuffle`, `slice`, `sort`, `sortBy`, `splice`,
     * `tap`, `throttle`, `times`, `toArray`, `union`, `uniq`, `unshift`, `values`,
     * `where`, `without`, `wrap`, and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `has`,
     * `identity`, `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`,
     * `isElement`, `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`,
     * `isNull`, `isNumber`, `isObject`, `isPlainObject`, `isRegExp`, `isString`,
     * `isUndefined`, `join`, `lastIndexOf`, `mixin`, `noConflict`, `parseInt`,
     * `pop`, `random`, `reduce`, `reduceRight`, `result`, `shift`, `size`, `some`,
     * `sortedIndex`, `runInContext`, `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * passed, otherwise they return unwrapped values.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {Mixed} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    (function() {
      for (var prop in arguments) { }

      /**
       * Detect if `Function#bind` exists and is inferred to be fast (all but V8).
       *
       * @memberOf _.support
       * @type Boolean
       */
      support.fastBind = nativeBind && !isV8;

      /**
       * Detect if `arguments` object indexes are non-enumerable
       * (Firefox < 4, IE < 9, PhantomJS, Safari < 5.1).
       *
       * @memberOf _.support
       * @type Boolean
       */
      support.nonEnumArgs = prop != 0;
    }(1));

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type String
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function optimized to search large arrays for a given `value`,
     * starting at `fromIndex`, using strict equality for comparisons, i.e. `===`.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Number} [fromIndex=0] The index to search from.
     * @param {Number} [largeSize=30] The length at which an array is considered large.
     * @returns {Boolean} Returns `true`, if `value` is found, else `false`.
     */
    function cachedContains(array, fromIndex, largeSize) {
      fromIndex || (fromIndex = 0);

      var length = array.length,
          isLarge = (length - fromIndex) >= (largeSize || largeArraySize);

      if (isLarge) {
        var cache = {},
            index = fromIndex - 1;

        while (++index < length) {
          // manually coerce `value` to a string because `hasOwnProperty`, in some
          // older versions of Firefox, coerces objects incorrectly
          var key = array[index] + '';
          (hasOwnProperty.call(cache, key) ? cache[key] : (cache[key] = [])).push(array[index]);
        }
      }
      return function(value) {
        if (isLarge) {
          var key = value + '';
          return hasOwnProperty.call(cache, key) && indexOf(cache[key], value) > -1;
        }
        return indexOf(array, value, fromIndex) > -1;
      }
    }

    /**
     * Used by `_.max` and `_.min` as the default `callback` when a given
     * `collection` is a string value.
     *
     * @private
     * @param {String} value The character to inspect.
     * @returns {Number} Returns the code unit of given character.
     */
    function charAtCallback(value) {
      return value.charCodeAt(0);
    }

    /**
     * Used by `sortBy` to compare transformed `collection` values, stable sorting
     * them in ascending order.
     *
     * @private
     * @param {Object} a The object to compare to `b`.
     * @param {Object} b The object to compare to `a`.
     * @returns {Number} Returns the sort order indicator of `1` or `-1`.
     */
    function compareAscending(a, b) {
      var ai = a.index,
          bi = b.index;

      a = a.criteria;
      b = b.criteria;

      // ensure a stable sort in V8 and other engines
      // http://code.google.com/p/v8/issues/detail?id=90
      if (a !== b) {
        if (a > b || typeof a == 'undefined') {
          return 1;
        }
        if (a < b || typeof b == 'undefined') {
          return -1;
        }
      }
      return ai < bi ? -1 : 1;
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this` binding
     * of `thisArg` and prepends any `partialArgs` to the arguments passed to the
     * bound function.
     *
     * @private
     * @param {Function|String} func The function to bind or the method name.
     * @param {Mixed} [thisArg] The `this` binding of `func`.
     * @param {Array} partialArgs An array of arguments to be partially applied.
     * @param {Object} [rightIndicator] Used to indicate partially applying arguments from the right.
     * @returns {Function} Returns the new bound function.
     */
    function createBound(func, thisArg, partialArgs, rightIndicator) {
      var isFunc = isFunction(func),
          isPartial = !partialArgs,
          key = thisArg;

      // juggle arguments
      if (isPartial) {
        partialArgs = thisArg;
      }
      if (!isFunc) {
        thisArg = func;
      }

      function bound() {
        // `Function#bind` spec
        // http://es5.github.com/#x15.3.4.5
        var args = arguments,
            thisBinding = isPartial ? this : thisArg;

        if (!isFunc) {
          func = thisArg[key];
        }
        if (partialArgs.length) {
          args = args.length
            ? (args = slice(args), rightIndicator ? args.concat(partialArgs) : partialArgs.concat(args))
            : partialArgs;
        }
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          noop.prototype = func.prototype;
          thisBinding = new noop;
          noop.prototype = null;

          // mimic the constructor's `return` behavior
          // http://es5.github.com/#x13.2.2
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      return bound;
    }

    /**
     * A function compiled to iterate `arguments` objects, arrays, objects, and
     * strings consistenly across environments, executing the `callback` for each
     * element in the `collection`. The `callback` is bound to `thisArg` and invoked
     * with three arguments; (value, index|key, collection). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @private
     * @type Function
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|String} Returns `collection`.
     */
    var each = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);
      var length = iterable.length; index = -1;
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(iterable[index], index, collection) === false) return result
        }
      }
      else {  
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {    
          if (callback(iterable[index], index, collection) === false) return result;    
          }
        }  
      }
      return result
    };

    /**
     * Used by `template` to escape characters for inclusion in compiled
     * string literals.
     *
     * @private
     * @param {String} match The matched character to escape.
     * @returns {String} Returns the escaped character.
     */
    function escapeStringChar(match) {
      return '\\' + stringEscapes[match];
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {String} match The matched character to escape.
     * @returns {String} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Checks if `value` is a DOM node in IE < 9.
     *
     * @private
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true` if the `value` is a DOM node, else `false`.
     */
    function isNode(value) {
      // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
      // methods that are `typeof` "string" and still can coerce nodes to strings
      return typeof value.toString != 'function' && typeof (value + '') == 'string';
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {Mixed} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value) {
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * A no-operation function.
     *
     * @private
     */
    function noop() {
      // no operation performed
    }

    /**
     * Slices the `collection` from the `start` index up to, but not including,
     * the `end` index.
     *
     * Note: This function is used, instead of `Array#slice`, to support node lists
     * in IE < 9 and to ensure dense arrays are returned.
     *
     * @private
     * @param {Array|Object|String} collection The collection to slice.
     * @param {Number} start The start index.
     * @param {Number} end The end index.
     * @returns {Array} Returns the new array.
     */
    function slice(array, start, end) {
      start || (start = 0);
      if (typeof end == 'undefined') {
        end = array ? array.length : 0;
      }
      var index = -1,
          length = end - start || 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = array[start + index];
      }
      return result;
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {String} match The matched character to unescape.
     * @returns {String} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return toString.call(value) == argsClass;
    }

    /**
     * Iterates over `object`'s own and inherited enumerable properties, executing
     * the `callback` for each property. The `callback` is bound to `thisArg` and
     * invoked with three arguments; (value, key, object). Callbacks may exit iteration
     * early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Dog(name) {
     *   this.name = name;
     * }
     *
     * Dog.prototype.bark = function() {
     *   alert('Woof, woof!');
     * };
     *
     * _.forIn(new Dog('Dagny'), function(value, key) {
     *   alert(key);
     * });
     * // => alerts 'name' and 'bark' (order is not guaranteed)
     */
    var forIn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);

        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;    
        }  
      return result
    };

    /**
     * Iterates over an object's own enumerable properties, executing the `callback`
     * for each property. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by explicitly
     * returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   alert(key);
     * });
     * // => alerts '0', '1', and 'length' (order is not guaranteed)
     */
    var forOwn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);

        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {    
          if (callback(iterable[index], index, collection) === false) return result;    
          }
        }  
      return result
    };

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      // `instanceof` may cause a memory leak in IE 7 if `value` is a host object
      // http://ajaxian.com/archives/working-aroung-the-instanceof-memory-leak
      return value instanceof Array || toString.call(value) == arrayClass;
    };

    /**
     * Creates an array composed of the own enumerable property names of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (order is not guaranteed)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      if ((support.nonEnumArgs && object.length && isArguments(object))) {
        return shimKeys(object);
      }
      return nativeKeys(object);
    };

    /**
     * A fallback implementation of `isPlainObject` that checks if a given `value`
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      // avoid non-objects and false positives for `arguments` objects
      var result = false;
      if (!(value && toString.call(value) == objectClass)) {
        return result;
      }
      // check that the constructor is `Object` (i.e. `Object instanceof Object`)
      var ctor = value.constructor;
      if ((!isFunction(ctor)) || ctor instanceof ctor) {
        // In most environments an object's own properties are iterated before
        // its inherited properties. If the last iterated property is an object's
        // own property then there are no inherited enumerable properties.
        forIn(value, function(value, key) {
          result = key;
        });
        return result === false || hasOwnProperty.call(value, result);
      }
      return result;
    }

    /**
     * A fallback implementation of `Object.keys` that produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names.
     */
    function shimKeys(object) {
      var result = [];
      forOwn(object, function(value, key) {
        result.push(key);
      });
      return result;
    }

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a `callback` function is passed, it will be executed to produce
     * the assigned values. The `callback` is bound to `thisArg` and invoked with
     * two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'moe' }, { 'age': 40 });
     * // => { 'name': 'moe', 'age': 40 }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var food = { 'name': 'apple' };
     * defaults(food, { 'name': 'banana', 'type': 'fruit' });
     * // => { 'name': 'apple', 'type': 'fruit' }
     */
    var assign = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = lodash.createCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {;
      var length = iterable.length; index = -1;
      if (isArray(iterable)) {
        while (++index < length) {
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index]
        }
      }
      else {  
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {    
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];    
          }
        }  
      }
        }
      };
      return result
    };

    /**
     * Creates a clone of `value`. If `deep` is `true`, nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a `callback`
     * function is passed, it will be executed to produce the cloned values. If
     * `callback` returns `undefined`, cloning will be handled by the method instead.
     * The `callback` is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to clone.
     * @param {Boolean} [deep=false] A flag to indicate a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Array} [stackA=[]] Internally used to track traversed source objects.
     * @param- {Array} [stackB=[]] Internally used to associate clones with source counterparts.
     * @returns {Mixed} Returns the cloned `value`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * var shallow = _.clone(stooges);
     * shallow[0] === stooges[0];
     * // => true
     *
     * var deep = _.clone(stooges, true);
     * deep[0] === stooges[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, deep, callback, thisArg, stackA, stackB) {
      var result = value;

      // allows working with "Collections" methods without using their `callback`
      // argument, `index|key`, for this method's `callback`
      if (typeof deep == 'function') {
        thisArg = callback;
        callback = deep;
        deep = false;
      }
      if (typeof callback == 'function') {
        callback = (typeof thisArg == 'undefined')
          ? callback
          : lodash.createCallback(callback, thisArg, 1);

        result = callback(result);
        if (typeof result != 'undefined') {
          return result;
        }
        result = value;
      }
      // inspect [[Class]]
      var isObj = isObject(result);
      if (isObj) {
        var className = toString.call(result);
        if (!cloneableClasses[className]) {
          return result;
        }
        var isArr = isArray(result);
      }
      // shallow clone
      if (!isObj || !deep) {
        return isObj
          ? (isArr ? slice(result) : assign({}, result))
          : result;
      }
      var ctor = ctorByClass[className];
      switch (className) {
        case boolClass:
        case dateClass:
          return new ctor(+result);

        case numberClass:
        case stringClass:
          return new ctor(result);

        case regexpClass:
          return ctor(result.source, reFlags.exec(result));
      }
      // check for circular references and return corresponding clone
      stackA || (stackA = []);
      stackB || (stackB = []);

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == value) {
          return stackB[length];
        }
      }
      // init cloned object
      result = isArr ? ctor(result.length) : {};

      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = clone(objValue, deep, callback, undefined, stackA, stackB);
      });

      return result;
    }

    /**
     * Creates a deep clone of `value`. If a `callback` function is passed,
     * it will be executed to produce the cloned values. If `callback` returns
     * `undefined`, cloning will be handled by the method instead. The `callback`
     * is bound to `thisArg` and invoked with one argument; (value).
     *
     * Note: This function is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the deep cloned `value`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * var deep = _.cloneDeep(stooges);
     * deep[0] === stooges[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return clone(value, true, callback, thisArg);
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param- {Object} [guard] Internally used to allow working with `_.reduce`
     *  without using its callback's `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var food = { 'name': 'apple' };
     * _.defaults(food, { 'name': 'banana', 'type': 'fruit' });
     * // => { 'name': 'apple', 'type': 'fruit' }
     */
    var defaults = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {;
      var length = iterable.length; index = -1;
      if (isArray(iterable)) {
        while (++index < length) {
          if (typeof result[index] == 'undefined') result[index] = iterable[index]
        }
      }
      else {  
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {    
          if (typeof result[index] == 'undefined') result[index] = iterable[index];    
          }
        }  
      }
        }
      };
      return result
    };

    /**
     * Creates a sorted array of all enumerable properties, own and inherited,
     * of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified object `property` exists and is a direct property,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to check.
     * @param {String} property The property to check for.
     * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, property) {
      return object ? hasOwnProperty.call(object, property) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     *  _.invert({ 'first': 'moe', 'second': 'larry' });
     * // => { 'moe': 'first', 'larry': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false || toString.call(value) == boolClass;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value instanceof Date || toString.call(value) == dateClass;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value ? value.nodeType === 1 : false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|String} value The value to inspect.
     * @returns {Boolean} Returns `true`, if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If `callback` is passed, it will be executed to
     * compare values. If `callback` returns `undefined`, comparisons will be handled
     * by the method instead. The `callback` is bound to `thisArg` and invoked with
     * two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} a The value to compare.
     * @param {Mixed} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Array} [stackA=[]] Internally used track traversed `a` objects.
     * @param- {Array} [stackB=[]] Internally used track traversed `b` objects.
     * @returns {Boolean} Returns `true`, if the values are equivalent, else `false`.
     * @example
     *
     * var moe = { 'name': 'moe', 'age': 40 };
     * var copy = { 'name': 'moe', 'age': 40 };
     *
     * moe == copy;
     * // => false
     *
     * _.isEqual(moe, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      var whereIndicator = callback === indicatorObject;
      if (callback && !whereIndicator) {
        callback = (typeof thisArg == 'undefined')
          ? callback
          : lodash.createCallback(callback, thisArg, 2);

        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          (!a || (type != 'function' && type != 'object')) &&
          (!b || (otherType != 'function' && otherType != 'object'))) {
        return false;
      }
      // exit early for `null` and `undefined`, avoiding ES3's Function#call behavior
      // http://es5.github.com/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0`, treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.com/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == b + '';
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        if (hasOwnProperty.call(a, '__wrapped__ ') || hasOwnProperty.call(b, '__wrapped__')) {
          return isEqual(a.__wrapped__ || a, b.__wrapped__ || b, callback, thisArg, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB && !(
              isFunction(ctorA) && ctorA instanceof ctorA &&
              isFunction(ctorB) && ctorB instanceof ctorB
            )) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.com/#x15.12.3)
      stackA || (stackA = []);
      stackB || (stackB = []);

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        length = a.length;
        size = b.length;

        // compare lengths to determine if a deep comparison is necessary
        result = size == a.length;
        if (!result && !whereIndicator) {
          return result;
        }
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          var index = length,
              value = b[size];

          if (whereIndicator) {
            while (index--) {
              if ((result = isEqual(a[index], value, callback, thisArg, stackA, stackB))) {
                break;
              }
            }
          } else if (!(result = isEqual(a[size], value, callback, thisArg, stackA, stackB))) {
            break;
          }
        }
        return result;
      }
      // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
      // which, in this case, is more costly
      forIn(b, function(value, key, b) {
        if (hasOwnProperty.call(b, key)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          return (result = hasOwnProperty.call(a, key) && isEqual(a[key], value, callback, thisArg, stackA, stackB));
        }
      });

      if (result && !whereIndicator) {
        // ensure both objects have the same number of properties
        forIn(a, function(value, key, a) {
          if (hasOwnProperty.call(a, key)) {
            // `size` will be `-1` if `a` has more properties than `b`
            return (result = --size > -1);
          }
        });
      }
      return result;
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite`, which will return true for
     * booleans and empty strings. See http://es5.github.com/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }
    // fallback for older versions of Chrome and Safari
    if (isFunction(/x/)) {
      isFunction = function(value) {
        return value instanceof Function || toString.call(value) == funcClass;
      };
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.com/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return value ? objectTypes[typeof value] : false;
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN`, which will return `true` for
     * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' || toString.call(value) == numberClass;
    }

    /**
     * Checks if a given `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if `value` is a plain object, else `false`.
     * @example
     *
     * function Stooge(name, age) {
     *   this.name = name;
     *   this.age = age;
     * }
     *
     * _.isPlainObject(new Stooge('moe', 40));
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'name': 'moe', 'age': 40 });
     * // => true
     */
    var isPlainObject = function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = typeof valueOf == 'function' && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/moe/);
     * // => true
     */
    function isRegExp(value) {
      return value instanceof RegExp || toString.call(value) == regexpClass;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('moe');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' || toString.call(value) == stringClass;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined`, into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a `callback` function
     * is passed, it will be executed to produce the merged values of the destination
     * and source properties. If `callback` returns `undefined`, merging will be
     * handled by the method instead. The `callback` is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Object} [deepIndicator] Internally used to indicate that `stackA`
     *  and `stackB` are arrays of traversed objects instead of source objects.
     * @param- {Array} [stackA=[]] Internally used to track traversed source objects.
     * @param- {Array} [stackB=[]] Internally used to associate values with their
     *  source counterparts.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'stooges': [
     *     { 'name': 'moe' },
     *     { 'name': 'larry' }
     *   ]
     * };
     *
     * var ages = {
     *   'stooges': [
     *     { 'age': 40 },
     *     { 'age': 50 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'stooges': [{ 'name': 'moe', 'age': 40 }, { 'name': 'larry', 'age': 50 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object, source, deepIndicator) {
      var args = arguments,
          index = 0,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      if (deepIndicator === indicatorObject) {
        var callback = args[3],
            stackA = args[4],
            stackB = args[5];
      } else {
        stackA = [];
        stackB = [];

        // allows working with `_.reduce` and `_.reduceRight` without
        // using their `callback` arguments, `index|key` and `collection`
        if (typeof deepIndicator != 'number') {
          length = args.length;
        }
        if (length > 3 && typeof args[length - 2] == 'function') {
          callback = lodash.createCallback(args[--length - 1], args[length--], 2);
        } else if (length > 2 && typeof args[length - 1] == 'function') {
          callback = args[--length];
        }
      }
      while (++index < length) {
        (isArray(args[index]) ? forEach : forOwn)(args[index], function(source, key) {
          var found,
              isArr,
              result = source,
              value = object[key];

          if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
            // avoid merging previously merged cyclic sources
            var stackLength = stackA.length;
            while (stackLength--) {
              if ((found = stackA[stackLength] == source)) {
                value = stackB[stackLength];
                break;
              }
            }
            if (!found) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});

              if (callback) {
                result = callback(value, source);
                if (typeof result != 'undefined') {
                  value = result;
                }
              }
              // add `source` and associated `value` to the stack of traversed objects
              stackA.push(source);
              stackB.push(value);

              // recursively merge objects and arrays (susceptible to call stack limits)
              if (!callback) {
                value = merge(value, source, indicatorObject, callback, stackA, stackB);
              }
            }
          }
          else {
            if (callback) {
              result = callback(value, source);
              if (typeof result == 'undefined') {
                result = source;
              }
            }
            if (typeof result != 'undefined') {
              value = result;
            }
          }
          object[key] = value;
        });
      }
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a `callback` function is passed, it will be executed
     * for each property in the `object`, omitting the properties `callback`
     * returns truthy for. The `callback` is bound to `thisArg` and invoked
     * with three arguments; (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|String} callback|[prop1, prop2, ...] The properties to omit
     *  or the function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'moe', 'age': 40 }, 'age');
     * // => { 'name': 'moe' }
     *
     * _.omit({ 'name': 'moe', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'moe' }
     */
    function omit(object, callback, thisArg) {
      var isFunc = typeof callback == 'function',
          result = {};

      if (isFunc) {
        callback = lodash.createCallback(callback, thisArg);
      } else {
        var props = concat.apply(arrayRef, arguments);
      }
      forIn(object, function(value, key, object) {
        if (isFunc
              ? !callback(value, key, object)
              : indexOf(props, key, 1) < 0
            ) {
          result[key] = value;
        }
      });
      return result;
    }

    /**
     * Creates a two dimensional array of the given object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'moe': 30, 'larry': 40 });
     * // => [['moe', 30], ['larry', 40]] (order is not guaranteed)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of property
     * names. If `callback` is passed, it will be executed for each property in the
     * `object`, picking the properties `callback` returns truthy for. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Array|Function|String} callback|[prop1, prop2, ...] The function called
     *  per iteration or properties to pick, either as individual arguments or arrays.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'moe', '_userid': 'moe1' }, 'name');
     * // => { 'name': 'moe' }
     *
     * _.pick({ 'name': 'moe', '_userid': 'moe1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'moe' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = 0,
            props = concat.apply(arrayRef, arguments),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (order is not guaranteed)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Array|Number|String} [index1, index2, ...] The indexes of
     *  `collection` to retrieve, either as individual arguments or arrays.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['moe', 'larry', 'curly'], 0, 2);
     * // => ['moe', 'curly']
     */
    function at(collection) {
      var index = -1,
          props = concat.apply(arrayRef, slice(arguments, 1)),
          length = props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given `target` element is present in a `collection` using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Mixed} target The value to check for.
     * @param {Number} [fromIndex=0] The index to search from.
     * @returns {Boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'moe', 'age': 40 }, 'moe');
     * // => true
     *
     * _.contains('curly', 'ur');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (typeof length == 'number') {
        result = (isString(collection)
          ? collection.indexOf(target, fromIndex)
          : indexOf(collection, target, fromIndex)
        ) > -1;
      } else {
        each(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys returned from running each element of the
     * `collection` through the given `callback`. The corresponding value of each key
     * is the number of times the key was returned by the `callback`. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    function countBy(collection, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, key, collection) {
        key = callback(value, key, collection) + '';
        (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
      });
      return result;
    }

    /**
     * Checks if the `callback` returns a truthy value for **all** elements of a
     * `collection`. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Boolean} Returns `true` if all elements pass the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes'], Boolean);
     * // => false
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(stooges, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(stooges, { 'age': 50 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg);

      if (isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        each(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Examines each element in a `collection`, returning an array of all elements
     * the `callback` returns truthy for. The `callback` is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(food, 'organic');
     * // => [{ 'name': 'carrot', 'organic': true, 'type': 'vegetable' }]
     *
     * // using "_.where" callback shorthand
     * _.filter(food, { 'type': 'fruit' });
     * // => [{ 'name': 'apple', 'organic': false, 'type': 'fruit' }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg);

      if (isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        each(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Examines each element in a `collection`, returning the first that the `callback`
     * returns truthy for. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the element that passed the callback check,
     *  else `undefined`.
     * @example
     *
     * var even = _.find([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => 2
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'banana', 'organic': true,  'type': 'fruit' },
     *   { 'name': 'beet',   'organic': false, 'type': 'vegetable' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * var veggie = _.find(food, { 'type': 'vegetable' });
     * // => { 'name': 'beet', 'organic': false, 'type': 'vegetable' }
     *
     * // using "_.pluck" callback shorthand
     * var healthy = _.find(food, 'organic');
     * // => { 'name': 'banana', 'organic': true, 'type': 'fruit' }
     */
    function find(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over a `collection`, executing the `callback` for each element in
     * the `collection`. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection). Callbacks may exit iteration early
     * by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|String} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(alert).join(',');
     * // => alerts each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
     * // => alerts each number value (order is not guaranteed)
     */
    function forEach(collection, callback, thisArg) {
      if (callback && typeof thisArg == 'undefined' && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        each(collection, callback, thisArg);
      }
      return collection;
    }

    /**
     * Creates an object composed of keys returned from running each element of the
     * `collection` through the `callback`. The corresponding value of each key is
     * an array of elements passed to `callback` that returned the key. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    function groupBy(collection, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, key, collection) {
        key = callback(value, key, collection) + '';
        (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
      });
      return result;
    }

    /**
     * Invokes the method named by `methodName` on each element in the `collection`,
     * returning an array of the results of each invoked method. Additional arguments
     * will be passed to each invoked method. If `methodName` is a function, it will
     * be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|String} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the `collection`
     * through the `callback`. The `callback` is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (order is not guaranteed)
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(stooges, 'name');
     * // => ['moe', 'larry']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      callback = lodash.createCallback(callback, thisArg);
      if (isArray(collection)) {
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        each(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of an `array`. If `callback` is passed,
     * it will be executed for each value in the `array` to generate the
     * criterion by which the value is ranked. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.max(stooges, function(stooge) { return stooge.age; });
     * // => { 'name': 'larry', 'age': 50 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(stooges, 'age');
     * // => { 'name': 'larry', 'age': 50 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      if (!callback && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (!callback && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg);

        each(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of an `array`. If `callback` is passed,
     * it will be executed for each value in the `array` to generate the
     * criterion by which the value is ranked. The `callback` is bound to `thisArg`
     * and invoked with three arguments; (value, index, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.min(stooges, function(stooge) { return stooge.age; });
     * // => { 'name': 'moe', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(stooges, 'age');
     * // => { 'name': 'moe', 'age': 40 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      if (!callback && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (!callback && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg);

        each(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the `collection`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {String} property The property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.pluck(stooges, 'name');
     * // => ['moe', 'larry']
     */
    var pluck = map;

    /**
     * Reduces a `collection` to a value that is the accumulated result of running
     * each element in the `collection` through the `callback`, where each successive
     * `callback` execution consumes the return value of the previous execution.
     * If `accumulator` is not passed, the first element of the `collection` will be
     * used as the initial `accumulator` value. The `callback` is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] Initial value of the accumulator.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      if (isArray(collection)) {
        var index = -1,
            length = collection.length;

        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        each(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is similar to `_.reduce`, except that it iterates over a
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] Initial value of the accumulator.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var iterable = collection,
          length = collection ? collection.length : 0,
          noaccum = arguments.length < 3;

      if (typeof length != 'number') {
        var props = keys(collection);
        length = props.length;
      }
      callback = lodash.createCallback(callback, thisArg, 4);
      forEach(collection, function(value, index, collection) {
        index = props ? props[--length] : --length;
        accumulator = noaccum
          ? (noaccum = false, iterable[index])
          : callback(accumulator, iterable[index], index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter`, this method returns the elements of a
     * `collection` that `callback` does **not** return truthy for.
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that did **not** pass the
     *  callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(food, 'organic');
     * // => [{ 'name': 'apple', 'organic': false, 'type': 'fruit' }]
     *
     * // using "_.where" callback shorthand
     * _.reject(food, { 'type': 'fruit' });
     * // => [{ 'name': 'carrot', 'organic': true, 'type': 'vegetable' }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Creates an array of shuffled `array` values, using a version of the
     * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = floor(nativeRandom() * (++index + 1));
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to inspect.
     * @returns {Number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('curly');
     * // => 5
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the `callback` returns a truthy value for **any** element of a
     * `collection`. The function returns as soon as it finds passing value, and
     * does not iterate over the entire `collection`. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Boolean} Returns `true` if any element passes the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(food, 'organic');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(food, { 'type': 'meat' });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg);

      if (isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        each(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in the `collection` through the `callback`. This method
     * performs a stable sort, that is, it will preserve the original sort order of
     * equal elements. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * // using "_.pluck" callback shorthand
     * _.sortBy(['banana', 'strawberry', 'apple'], 'length');
     * // => ['apple', 'banana', 'strawberry']
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      callback = lodash.createCallback(callback, thisArg);
      forEach(collection, function(value, key, collection) {
        result[++index] = {
          'criteria': callback(value, key, collection),
          'index': index,
          'value': value
        };
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        result[length] = result[length].value;
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Examines each element in a `collection`, returning an array of all elements
     * that have the given `properties`. When checking `properties`, this method
     * performs a deep comparison between values to determine if they are equivalent
     * to each other.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Object} properties The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given `properties`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.where(stooges, { 'age': 40 });
     * // => [{ 'name': 'moe', 'age': 40 }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values of `array` removed. The values
     * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new filtered array.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array of `array` elements not present in the other arrays
     * using strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {Array} [array1, array2, ...] Arrays to check.
     * @returns {Array} Returns a new array of `array` elements not present in the
     *  other arrays.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      var index = -1,
          length = array ? array.length : 0,
          flattened = concat.apply(arrayRef, arguments),
          contains = cachedContains(flattened, length),
          result = [];

      while (++index < length) {
        var value = array[index];
        if (!contains(value)) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Gets the first element of the `array`. If a number `n` is passed, the first
     * `n` elements of the `array` are returned. If a `callback` function is passed,
     * elements at the beginning of the array are returned as long as the `callback`
     * returns truthy. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var food = [
     *   { 'name': 'banana', 'organic': true },
     *   { 'name': 'beet',   'organic': false },
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(food, 'organic');
     * // => [{ 'name': 'banana', 'organic': true }]
     *
     * var food = [
     *   { 'name': 'apple',  'type': 'fruit' },
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.first(food, { 'type': 'fruit' });
     * // => [{ 'name': 'apple', 'type': 'fruit' }, { 'name': 'banana', 'type': 'fruit' }]
     */
    function first(array, callback, thisArg) {
      if (array) {
        var n = 0,
            length = array.length;

        if (typeof callback != 'number' && callback != null) {
          var index = -1;
          callback = lodash.createCallback(callback, thisArg);
          while (++index < length && callback(array[index], index, array)) {
            n++;
          }
        } else {
          n = callback;
          if (n == null || thisArg) {
            return array[0];
          }
        }
        return slice(array, 0, nativeMin(nativeMax(0, n), length));
      }
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truthy, `array` will only be flattened a single level. If `callback`
     * is passed, each element of `array` is passed through a callback` before
     * flattening. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @param {Boolean} [isShallow=false] A flag to indicate only flattening a single level.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var stooges = [
     *   { 'name': 'curly', 'quotes': ['Oh, a wise guy, eh?', 'Poifect!'] },
     *   { 'name': 'moe', 'quotes': ['Spread out!', 'You knucklehead!'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(stooges, 'quotes');
     * // => ['Oh, a wise guy, eh?', 'Poifect!', 'Spread out!', 'You knucklehead!']
     */
    function flatten(array, isShallow, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = isShallow;
        isShallow = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg);
      }
      while (++index < length) {
        var value = array[index];
        if (callback) {
          value = callback(value, index, array);
        }
        // recursively flatten arrays (susceptible to call stack limits)
        if (isArray(value)) {
          push.apply(result, isShallow ? value : flatten(value));
        } else {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the `array` is already
     * sorted, passing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Boolean|Number} [fromIndex=0] The index to search from or `true` to
     *  perform a binary search on a sorted `array`.
     * @returns {Number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      var index = -1,
          length = array ? array.length : 0;

      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0) - 1;
      } else if (fromIndex) {
        index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      while (++index < length) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Gets all but the last element of `array`. If a number `n` is passed, the
     * last `n` elements are excluded from the result. If a `callback` function
     * is passed, elements at the end of the array are excluded from the result
     * as long as the `callback` returns truthy. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var food = [
     *   { 'name': 'beet',   'organic': false },
     *   { 'name': 'carrot', 'organic': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(food, 'organic');
     * // => [{ 'name': 'beet',   'organic': false }]
     *
     * var food = [
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' },
     *   { 'name': 'carrot', 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.initial(food, { 'type': 'vegetable' });
     * // => [{ 'name': 'banana', 'type': 'fruit' }]
     */
    function initial(array, callback, thisArg) {
      if (!array) {
        return [];
      }
      var n = 0,
          length = array.length;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Computes the intersection of all the passed-in arrays using strict equality
     * for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of unique elements that are present
     *  in **all** of the arrays.
     * @example
     *
     * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
     * // => [1, 2]
     */
    function intersection(array) {
      var args = arguments,
          argsLength = args.length,
          cache = { '0': {} },
          index = -1,
          length = array ? array.length : 0,
          isLarge = length >= 100,
          result = [],
          seen = result;

      outer:
      while (++index < length) {
        var value = array[index];
        if (isLarge) {
          var key = value + '';
          var inited = hasOwnProperty.call(cache[0], key)
            ? !(seen = cache[0][key])
            : (seen = cache[0][key] = []);
        }
        if (inited || indexOf(seen, value) < 0) {
          if (isLarge) {
            seen.push(value);
          }
          var argsIndex = argsLength;
          while (--argsIndex) {
            if (!(cache[argsIndex] || (cache[argsIndex] = cachedContains(args[argsIndex], 0, 100)))(value)) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Gets the last element of the `array`. If a number `n` is passed, the
     * last `n` elements of the `array` are returned. If a `callback` function
     * is passed, elements at the end of the array are returned as long as the
     * `callback` returns truthy. The `callback` is bound to `thisArg` and
     * invoked with three arguments;(value, index, array).
     *
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var food = [
     *   { 'name': 'beet',   'organic': false },
     *   { 'name': 'carrot', 'organic': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.last(food, 'organic');
     * // => [{ 'name': 'carrot', 'organic': true }]
     *
     * var food = [
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' },
     *   { 'name': 'carrot', 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.last(food, { 'type': 'vegetable' });
     * // => [{ 'name': 'beet', 'type': 'vegetable' }, { 'name': 'carrot', 'type': 'vegetable' }]
     */
    function last(array, callback, thisArg) {
      if (array) {
        var n = 0,
            length = array.length;

        if (typeof callback != 'number' && callback != null) {
          var index = length;
          callback = lodash.createCallback(callback, thisArg);
          while (index-- && callback(array[index], index, array)) {
            n++;
          }
        } else {
          n = callback;
          if (n == null || thisArg) {
            return array[length - 1];
          }
        }
        return slice(array, nativeMax(0, length - n));
      }
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Number} [fromIndex=array.length-1] The index to search from.
     * @returns {Number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Number} [start=0] The start of the range.
     * @param {Number} end The end of the range.
     * @param {Number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(10);
     * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     *
     * _.range(1, 11);
     * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     *
     * _.range(0, 30, 5);
     * // => [0, 5, 10, 15, 20, 25]
     *
     * _.range(0, -10, -1);
     * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = +step || 1;

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so V8 will avoid the slower "dictionary" mode
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / step)),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * The opposite of `_.initial`, this method gets all but the first value of
     * `array`. If a number `n` is passed, the first `n` values are excluded from
     * the result. If a `callback` function is passed, elements at the beginning
     * of the array are excluded from the result as long as the `callback` returns
     * truthy. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var food = [
     *   { 'name': 'banana', 'organic': true },
     *   { 'name': 'beet',   'organic': false },
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.rest(food, 'organic');
     * // => [{ 'name': 'beet', 'organic': false }]
     *
     * var food = [
     *   { 'name': 'apple',  'type': 'fruit' },
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.rest(food, { 'type': 'fruit' });
     * // => [{ 'name': 'beet', 'type': 'vegetable' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which the `value`
     * should be inserted into `array` in order to maintain the sort order of the
     * sorted `array`. If `callback` is passed, it will be executed for `value` and
     * each element in `array` to compute their sort ranking. The `callback` is
     * bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to iterate over.
     * @param {Mixed} value The value to evaluate.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Number} Returns the index at which the value should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Computes the union of the passed-in arrays using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of unique values, in order, that are
     *  present in one or more of the arrays.
     * @example
     *
     * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
     * // => [1, 2, 3, 101, 10]
     */
    function union() {
      return uniq(concat.apply(arrayRef, arguments));
    }

    /**
     * Creates a duplicate-value-free version of the `array` using strict equality
     * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
     * for `isSorted` will run a faster algorithm. If `callback` is passed, each
     * element of `array` is passed through a callback` before uniqueness is computed.
     * The `callback` is bound to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return Math.floor(num); });
     * // => [1, 2, 3]
     *
     * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [],
          seen = result;

      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = isSorted;
        isSorted = false;
      }
      // init value cache for large arrays
      var isLarge = !isSorted && length >= 75;
      if (isLarge) {
        var cache = {};
      }
      if (callback != null) {
        seen = [];
        callback = lodash.createCallback(callback, thisArg);
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isLarge) {
          var key = computed + '';
          var inited = hasOwnProperty.call(cache, key)
            ? !(seen = cache[key])
            : (seen = cache[key] = []);
        }
        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : inited || indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array with all occurrences of the passed values removed using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {Mixed} [value1, value2, ...] Values to remove.
     * @returns {Array} Returns a new filtered array.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      var index = -1,
          length = array ? array.length : 0,
          contains = cachedContains(arguments, 1),
          result = [];

      while (++index < length) {
        var value = array[index];
        if (!contains(value)) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Groups the elements of each array at their corresponding indexes. Useful for
     * separate data sources that are coordinated through matching array indexes.
     * For a matrix of nested arrays, `_.zip.apply(...)` can transpose the matrix
     * in a similar fashion.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['moe', 'larry'], [30, 40], [true, false]);
     * // => [['moe', 30, true], ['larry', 40, false]]
     */
    function zip(array) {
      var index = -1,
          length = array ? max(pluck(arguments, 'length')) : 0,
          result = Array(length);

      while (++index < length) {
        result[index] = pluck(arguments, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Pass either
     * a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`, or
     * two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['moe', 'larry'], [30, 40]);
     * // => { 'moe': 30, 'larry': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * If `n` is greater than `0`, a function is created that is restricted to
     * executing `func`, with the `this` binding and arguments of the created
     * function, only after it is called `n` times. If `n` is less than `1`,
     * `func` is executed immediately, without a `this` binding or additional
     * arguments, and its result is returned.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Number} n The number of times the function must be called before
     * it is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var renderNotes = _.after(notes.length, render);
     * _.forEach(notes, function(note) {
     *   note.asyncSave({ 'success': renderNotes });
     * });
     * // `renderNotes` is run once, after all notes have saved
     */
    function after(n, func) {
      if (n < 1) {
        return func();
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * passed to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {Mixed} [thisArg] The `this` binding of `func`.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'moe' }, 'hi');
     * func();
     * // => 'hi moe'
     */
    function bind(func, thisArg) {
      // use `Function#bind` if it exists and is fast
      // (in V8 `Function#bind` is slower except when partially applied)
      return support.fastBind || (nativeBind && arguments.length > 2)
        ? nativeBind.call.apply(nativeBind, arguments)
        : createBound(func, thisArg, slice(arguments, 2));
    }

    /**
     * Binds methods on `object` to `object`, overwriting the existing method.
     * Method names may be specified as individual arguments or as arrays of method
     * names. If no method names are provided, all the function properties of `object`
     * will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *  'label': 'docs',
     *  'onClick': function() { alert('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => alerts 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = concat.apply(arrayRef, arguments),
          index = funcs.length > 1 ? 0 : (funcs = functions(object), -1),
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = bind(object[key], object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those passed to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {String} key The key of the method.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'moe',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi moe'
     *
     * object.greet = function(greeting) {
     *   return greeting + ', ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hi, moe!'
     */
    function bindKey(object, key) {
      return createBound(object, key, slice(arguments, 2));
    }

    /**
     * Creates a function that is the composition of the passed functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} [func1, func2, ...] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var greet = function(name) { return 'hi ' + name; };
     * var exclaim = function(statement) { return statement + '!'; };
     * var welcome = _.compose(exclaim, greet);
     * welcome('moe');
     * // => 'hi moe!'
     */
    function compose() {
      var funcs = arguments;
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name, the created callback will return the property value for a given element.
     * If `func` is an object, the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * Note: All Lo-Dash methods, that accept a `callback` argument, internally
     * use `_.createCallback`.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Mixed} [func=identity] The value to convert to a callback.
     * @param {Mixed} [thisArg] The `this` binding of the created callback.
     * @param {Number} [argCount=3] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(stooges, 'age__gt45');
     * // => [{ 'name': 'larry', 'age': 50 }]
     *
     * // create mixins with support for "_.pluck" and "_.where" callback shorthands
     * _.mixin({
     *   'toLookup': function(collection, callback, thisArg) {
     *     callback = _.createCallback(callback, thisArg);
     *     return _.reduce(collection, function(result, value, index, collection) {
     *       return (result[callback(value, index, collection)] = value, result);
     *     }, {});
     *   }
     * });
     *
     * _.toLookup(stooges, 'name');
     * // => { 'moe': { 'name': 'moe', 'age': 40 }, 'larry': { 'name': 'larry', 'age': 50 } }
     */
    function createCallback(func, thisArg, argCount) {
      if (func == null) {
        return identity;
      }
      var type = typeof func;
      if (type != 'function') {
        if (type != 'object') {
          return function(object) {
            return object[func];
          };
        }
        var props = keys(func);
        return function(object) {
          var length = props.length,
              result = false;
          while (length--) {
            if (!(result = isEqual(object[props[length]], func[props[length]], indicatorObject))) {
              break;
            }
          }
          return result;
        };
      }
      if (typeof thisArg != 'undefined') {
        if (argCount === 1) {
          return function(value) {
            return func.call(thisArg, value);
          };
        }
        if (argCount === 2) {
          return function(a, b) {
            return func.call(thisArg, a, b);
          };
        }
        if (argCount === 4) {
          return function(accumulator, value, index, collection) {
            return func.call(thisArg, accumulator, value, index, collection);
          };
        }
        return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
      }
      return func;
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked. Pass
     * `true` for `immediate` to cause debounce to invoke `func` on the leading,
     * instead of the trailing, edge of the `wait` timeout. Subsequent calls to
     * the debounced function will return the result of the last `func` call.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {Number} wait The number of milliseconds to delay.
     * @param {Boolean} immediate A flag to indicate execution is on the leading
     *  edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * var lazyLayout = _.debounce(calculateLayout, 300);
     * jQuery(window).on('resize', lazyLayout);
     */
    function debounce(func, wait, immediate) {
      var args,
          result,
          thisArg,
          timeoutId;

      function delayed() {
        timeoutId = null;
        if (!immediate) {
          result = func.apply(thisArg, args);
        }
      }
      return function() {
        var isImmediate = immediate && !timeoutId;
        args = arguments;
        thisArg = this;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(delayed, wait);

        if (isImmediate) {
          result = func.apply(thisArg, args);
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be passed to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
     * @returns {Number} Returns the timer id.
     * @example
     *
     * _.defer(function() { alert('deferred'); });
     * // returns from the function before `alert` is called
     */
    function defer(func) {
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be passed to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {Number} wait The number of milliseconds to delay execution.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
     * @returns {Number} Returns the timer id.
     * @example
     *
     * var log = _.bind(console.log, console);
     * _.delay(log, 1000, 'logged later');
     * // => 'logged later' (Appears after one second.)
     */
    function delay(func, wait) {
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * passed, it will be used to determine the cache key for storing the result
     * based on the arguments passed to the memoized function. By default, the first
     * argument passed to the memoized function is used as the cache key. The `func`
     * is executed with the `this` binding of the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     */
    function memoize(func, resolver) {
      var cache = {};
      return function() {
        var key = (resolver ? resolver.apply(this, arguments) : arguments[0]) + '';
        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      };
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those passed to the new function. This
     * method is similar to `_.bind`, except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('moe');
     * // => 'hi moe'
     */
    function partial(func) {
      return createBound(func, slice(arguments, 1));
    }

    /**
     * This method is similar to `_.partial`, except that `partial` arguments are
     * appended to those passed to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createBound(func, slice(arguments, 1), null, indicatorObject);
    }

    /**
     * Creates a function that, when executed, will only call the `func`
     * function at most once per every `wait` milliseconds. If the throttled
     * function is invoked more than once during the `wait` timeout, `func` will
     * also be called on the trailing edge of the timeout. Subsequent calls to the
     * throttled function will return the result of the last `func` call.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {Number} wait The number of milliseconds to throttle executions to.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     */
    function throttle(func, wait) {
      var args,
          result,
          thisArg,
          timeoutId,
          lastCalled = 0;

      function trailingCall() {
        lastCalled = new Date;
        timeoutId = null;
        result = func.apply(thisArg, args);
      }
      return function() {
        var now = new Date,
            remaining = wait - (now - lastCalled);

        args = arguments;
        thisArg = this;

        if (remaining <= 0) {
          clearTimeout(timeoutId);
          timeoutId = null;
          lastCalled = now;
          result = func.apply(thisArg, args);
        }
        else if (!timeoutId) {
          timeoutId = setTimeout(trailingCall, remaining);
        }
        return result;
      };
    }

    /**
     * Creates a function that passes `value` to the `wrapper` function as its
     * first argument. Additional arguments passed to the function are appended
     * to those passed to the `wrapper` function. The `wrapper` is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Mixed} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var hello = function(name) { return 'hello ' + name; };
     * hello = _.wrap(hello, function(func) {
     *   return 'before, ' + func('moe') + ', after';
     * });
     * hello();
     * // => 'before, hello moe, after'
     */
    function wrap(value, wrapper) {
      return function() {
        var args = [value];
        push.apply(args, arguments);
        return wrapper.apply(this, args);
      };
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} string The string to escape.
     * @returns {String} Returns the escaped string.
     * @example
     *
     * _.escape('Moe, Larry & Curly');
     * // => 'Moe, Larry &amp; Curly'
     */
    function escape(string) {
      return string == null ? '' : (string + '').replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This function returns the first argument passed to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Mixed} value Any value.
     * @returns {Mixed} Returns `value`.
     * @example
     *
     * var moe = { 'name': 'moe' };
     * moe === _.identity(moe);
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds functions properties of `object` to the `lodash` function and chainable
     * wrapper.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object of function properties to add to `lodash`.
     * @example
     *
     * _.mixin({
     *   'capitalize': function(string) {
     *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     *   }
     * });
     *
     * _.capitalize('moe');
     * // => 'Moe'
     *
     * _('moe').capitalize();
     * // => 'Moe'
     */
    function mixin(object) {
      forEach(functions(object), function(methodName) {
        var func = lodash[methodName] = object[methodName];

        lodash.prototype[methodName] = function() {
          var value = this.__wrapped__,
              args = [value];

          push.apply(args, arguments);
          var result = func.apply(lodash, args);
          return (value && typeof value == 'object' && value == result)
            ? this
            : new lodashWrapper(result);
        };
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * Converts the given `value` into an integer of the specified `radix`.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.com/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Mixed} value The value to parse.
     * @returns {Number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt('08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox and Opera still follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingZeros, '') : value, radix || 0);
    };

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is passed, a number between `0` and the given number will be returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Number} [min=0] The minimum possible value.
     * @param {Number} [max=1] The maximum possible value.
     * @returns {Number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => a number between 0 and 5
     *
     * _.random(5);
     * // => also a number between 0 and 5
     */
    function random(min, max) {
      if (min == null && max == null) {
        max = 1;
      }
      min = +min || 0;
      if (max == null) {
        max = min;
        min = 0;
      }
      return min + floor(nativeRandom() * ((+max || 0) - min + 1));
    }

    /**
     * Resolves the value of `property` on `object`. If `property` is a function,
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey, then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {String} property The property to get the value of.
     * @returns {Mixed} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, property) {
      var value = object ? object[property] : undefined;
      return isFunction(value) ? object[property]() : value;
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * Note: Lo-Dash may be used in Chrome extensions by either creating a `lodash csp`
     * build and using precompiled templates, or loading Lo-Dash in a sandbox.
     *
     * For more information on precompiling templates see:
     * http://lodash.com/#custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} text The template text.
     * @param {Obect} data The data object used to populate the text.
     * @param {Object} options The options object.
     *  escape - The "escape" delimiter regexp.
     *  evaluate - The "evaluate" delimiter regexp.
     *  interpolate - The "interpolate" delimiter regexp.
     *  sourceURL - The sourceURL of the template's compiled source.
     *  variable - The data object variable name.
     * @returns {Function|String} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'moe' });
     * // => 'hello moe'
     *
     * var list = '<% _.forEach(people, function(name) { %><li><%= name %></li><% }); %>';
     * _.template(list, { 'people': ['moe', 'larry'] });
     * // => '<li>moe</li><li>larry</li>'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'curly' });
     * // => 'hello curly'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + epithet); %>!', { 'epithet': 'stooge' });
     * // => 'hello stooge!'
     *
     * // using custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text || (text = '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging and wrap in a multi-line comment to
      // avoid issues with Narwhal, IE conditional compilation, and the JS engine
      // embedded in Adobe products.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//@ sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source via its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the `callback` function `n` times, returning an array of the results
     * of each `callback` execution. The `callback` is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = lodash.createCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The opposite of `_.escape`, this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} string The string to unescape.
     * @returns {String} Returns the unescaped string.
     * @example
     *
     * _.unescape('Moe, Larry &amp; Curly');
     * // => 'Moe, Larry & Curly'
     */
    function unescape(string) {
      return string == null ? '' : (string + '').replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is passed, the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} [prefix] The value to prefix the ID with.
     * @returns {String} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return (prefix == null ? '' : prefix + '') + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Invokes `interceptor` with the `value` as the first argument, and then
     * returns `value`. The purpose of this method is to "tap into" a method chain,
     * in order to perform operations on intermediate results within the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {Mixed} value The value to pass to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {Mixed} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .filter(function(num) { return num % 2 == 0; })
     *  .tap(alert)
     *  .map(function(num) { return num * num; })
     *  .value();
     * // => // [2, 4] (alerted)
     * // => [4, 16]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {String} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return this.__wrapped__ + '';
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {Mixed} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.countBy = countBy;
    lodash.createCallback = createCallback;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forIn = forIn;
    lodash.forOwn = forOwn;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.range = range;
    lodash.reject = reject;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    forOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName] = function() {
          var args = [this.__wrapped__];
          push.apply(args, arguments);
          return func.apply(lodash, args);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(callback, thisArg) {
          var result = func(this.__wrapped__, callback, thisArg);
          return callback == null || (thisArg && typeof callback != 'function')
            ? result
            : new lodashWrapper(result);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type String
     */
    lodash.VERSION = '1.0.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    each(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return func.apply(this.__wrapped__, arguments);
      };
    });

    // add `Array` functions that return the wrapped value
    each(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    each(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments));
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define('underscore',[],function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && !freeExports.nodeType) {
    // in Node.js or RingoJS v0.8.0+
    if (freeModule) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    window._ = _;
  }
}(this));

//     Backbone.js 0.9.2

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `global`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to slice/splice.
  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  // var $ = root.jQuery || root.Zepto || root.ender;

  // Set the JavaScript library that will be used for DOM manipulation and
  // Ajax calls (a.k.a. the `$` variable). By default Backbone will use: jQuery,
  // Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
  // alternate JavaScript library (or a mock library for testing your views
  // outside of a browser).
  Backbone.setDomLibrary = function(lib) {
    $ = lib;
  };

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {tail: tail, next: list ? list.next : node};
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if ((callback && cb !== callback) || (context && ctx !== context)) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    }

  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    attributes || (attributes = {});
    if (options && options.parse) attributes = this.parse(attributes);
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    if (options && options.collection) this.collection = options.collection;
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, {silent: true});
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      var html;
      if (html = this._escapedAttributes[attr]) return html;
      var val = this.get(attr);
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, value, options) {
      var attrs, attr, val;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      // Extract attributes and options.
      options || (options = {});
      if (!attrs) return this;
      if (attrs instanceof Model) attrs = attrs.attributes;
      if (options.unset) for (attr in attrs) attrs[attr] = void 0;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var changes = options.changes = {};
      var now = this.attributes;
      var escaped = this._escapedAttributes;
      var prev = this._previousAttributes || {};

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {
          delete escaped[attr];
          (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete now[attr] : now[attr] = val;

        // If the new and previous value differ, record the change.  If not,
        // then remove changes for this attribute.
        if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
          this.changed[attr] = val;
          if (!options.silent) this._pending[attr] = true;
        } else {
          delete this.changed[attr];
          delete this._pending[attr];
        }
      }

      // Fire the `"change"` events.
      if (!options.silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      (options || (options = {})).unset = true;
      return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      (options || (options = {})).unset = true;
      return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp, xhr), options)) return false;
        if (success) success(model, resp);
      };
      options.error = Backbone.wrapError(options.error, model, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, value, options) {
      var attrs, current;

      // Handle both `("key", value)` and `({key: value})` -style calls.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (!this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var serverAttrs = model.parse(resp, xhr);
        if (options.wait) {
          delete options.wait;
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (!model.set(serverAttrs, options)) return false;
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      // Finish configuring and sending the Ajax request.
      options.error = Backbone.wrapError(options.error, model, options);
      var method = this.isNew() ? 'create' : 'update';
      var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
      if (options.wait) this.set(current, silentOptions);
      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var triggerDestroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      if (this.isNew()) {
        triggerDestroy();
        return false;
      }

      options.success = function(resp) {
        if (options.wait) triggerDestroy();
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      options.error = Backbone.wrapError(options.error, model, options);
      var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
      if (!options.wait) triggerDestroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, xhr) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      options || (options = {});
      var changing = this._changing;
      this._changing = true;

      // Silent changes become pending changes.
      for (var attr in this._silent) this._pending[attr] = true;

      // Silent changes are triggered.
      var changes = _.extend({}, options.changes, this._silent);
      this._silent = {};
      for (var attr in changes) {
        this.trigger('change:' + attr, this, this.get(attr), options);
      }
      if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
      while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.trigger('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
          if (this._pending[attr] || this._silent[attr]) continue;
          delete this.changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!arguments.length) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (!arguments.length || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function() {
      return !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (options.silent || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) {
        options.error(this, error, options);
      } else {
        this.trigger('error', this, error, options);
      }
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, {silent: true, parse: options.parse});
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, index, length, model, cid, id, cids = {}, ids = {}, dups = [];
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];

      // Begin by turning bare objects into model references, and preventing
      // invalid models or duplicate models from being added.
      for (i = 0, length = models.length; i < length; i++) {
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }
        cid = model.cid;
        id = model.id;
        if (cids[cid] || this._byCid[cid] || ((id != null) && (ids[id] || this._byId[id]))) {
          dups.push(i);
          continue;
        }
        cids[cid] = ids[id] = model;
      }

      // Remove duplicates.
      i = dups.length;
      while (i--) {
        models.splice(dups[i], 1);
      }

      // Listen to added models' events, and index models for lookup by
      // `id` and by `cid`.
      for (i = 0, length = models.length; i < length; i++) {
        (model = models[i]).on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // Insert models into the collection, re-sorting if needed, and triggering
      // `add` events unless silenced.
      this.length += length;
      index = options.at != null ? options.at : this.models.length;
      splice.apply(this.models, [index, 0].concat(models));
      if (this.comparator) this.sort({silent: true});
      if (options.silent) return this;
      for (i = 0, length = this.models.length; i < length; i++) {
        if (!cids[(model = this.models[i]).cid]) continue;
        options.index = i;
        model.trigger('add', model, this, options);
      }
      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.getByCid(models[i]) || this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, options);
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Get a model from the set by id.
    get: function(id) {
      if (id == null) return void 0;
      return this._byId[id.id != null ? id.id : id];
    },

    // Get a model from the set by client id.
    getByCid: function(cid) {
      return cid && this._byCid[cid.cid || cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      options || (options = {});
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(this.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.map(this.models, function(model){ return model.get(attr); });
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      models  || (models = []);
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var coll = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) coll.add(model, options);
      var success = options.success;
      options.success = function(nextModel, resp, xhr) {
        if (options.wait) coll.add(nextModel, options);
        if (success) {
          success(nextModel, resp);
        } else {
          nextModel.trigger('sync', model, resp, options);
        }
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, xhr) {
      return resp;
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function () {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function(options) {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(model, options) {
      options || (options = {});
      if (!(model instanceof Model)) {
        var attrs = model;
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(model.attributes, options)) model = false;
      } else if (!model.collection) {
        model.collection = this;
      }
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this == model.collection) {
        delete model.collection;
      }
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Backbone.Router
  // -------------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      Backbone.history || (Backbone.history = new History);
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var routes = [];
      for (var route in this.routes) {
        routes.unshift([route, this.routes[route]]);
      }
      for (var i = 0, l = routes.length; i < l; i++) {
        this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning leading hashes and slashes .
  var routeStripper = /^[#\/]/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(windowOverride) {
      var loc = windowOverride ? windowOverride.location : window.location;
      var match = loc.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = this.getHash();
        }
      }
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
      if (current == this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      var frag = (fragment || '').replace(routeStripper, '');
      if (this.fragment == frag) return;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;
        window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this.fragment = frag;
        this._updateHash(window.location, frag, options.replace);
        if (this.iframe && (frag != this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
          // When replace is true, we don't want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, frag, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        window.location.assign(this.options.root + fragment);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
      } else {
        location.hash = fragment;
      }
    }
  });

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view from the DOM. Note that the view isn't present in the
    // DOM by default, so calling this method may be a no-op.
    remove: function() {
      this.$el.remove();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = (element instanceof $) ? element : $(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = getValue(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, this.options, options);
      for (var i = 0, l = viewOptions.length; i < l; i++) {
        var attr = viewOptions[i];
        if (options[attr]) this[attr] = options[attr];
      }
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = getValue(this, 'attributes') || {};
        if (this.id) attrs.id = this.id;
        if (this.className) attrs['class'] = this.className;
        this.setElement(this.make(this.tagName, attrs), false);
      } else {
        this.setElement(this.el, false);
      }
    }

  });

  // The self-propagating extend function that Backbone classes use.
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  // Set up inheritance for the model, collection, and view.
  Model.extend = Collection.extend = Router.extend = View.extend = extend;

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return $.ajax(_.extend(params, options));
  };

  // Wrap an optional error callback with a fallback error event.
  Backbone.wrapError = function(onError, originalModel, options) {
    return function(model, resp) {
      resp = model === originalModel ? resp : model;
      if (onError) {
        onError(originalModel, resp, options);
      } else {
        originalModel.trigger('error', originalModel, resp, options);
      }
    };
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);

define("backbone", ["underscore","zepto"], (function (global) {
    return function () {
        var ret, fn;
        return ret || global.Backbone;
    };
}(this)));

// Mixin for Backbone.js that extends its Collection (and, in the future,
// Model) class to return jQuery/Zepto-compatible promise objects for any
// operation that includes asynchronous operation. Still allows for callbacks,
// so it doesn't break compatibility with Backbone/other libraries.
define('backbone_promises',['zepto', 'underscore', 'backbone'], function($, _, Backbone) {
    

    var collectionMethods = Backbone.Collection.prototype;
    Backbone.Collection = Backbone.Collection.extend({
        create: function(model, options) {
            var d = $.Deferred();

            if (!options) {
                options = {};
            }

            var errorCallback = options.error;
            var successCallback = options.success;
            options.success = function() {
                if (successCallback) {
                    successCallback(arguments);
                }
                d.resolve(arguments);
            };
            options.error = function() {
                if (errorCallback) {
                    errorCallback(arguments);
                }
                d.reject(arguments);
            };

            collectionMethods.create.call(this, model, options);

            return d.promise();
        },

        fetch: function(options) {
            var d = $.Deferred();

            if (!options) {
                options = {};
            }

            var errorCallback = options.error;
            var successCallback = options.success;
            options.success = function() {
                if (successCallback) {
                    successCallback(arguments);
                }
                d.resolve(arguments);
            };
            options.error = function() {
                if (errorCallback) {
                    errorCallback(arguments);
                }
                d.reject(arguments);
            };

            collectionMethods.fetch.call(this, options);

            return d.promise();
        }
    });
});

/**
 * CoffeeScript Compiler v1.6.3
 * http://coffeescript.org
 *
 * Copyright 2011, Jeremy Ashkenas
 * Released under the MIT License
 */
!function(root){var CoffeeScript=function(){function require(e){return require[e]}return require["./helpers"]=function(){var e={},t={exports:e};return function(){var t,n,i,s,r,o;e.starts=function(e,t,n){return t===e.substr(n,t.length)},e.ends=function(e,t,n){var i;return i=t.length,t===e.substr(e.length-i-(n||0),i)},e.repeat=r=function(e,t){var n;for(n="";t>0;)1&t&&(n+=e),t>>>=1,e+=e;return n},e.compact=function(e){var t,n,i,s;for(s=[],n=0,i=e.length;i>n;n++)t=e[n],t&&s.push(t);return s},e.count=function(e,t){var n,i;if(n=i=0,!t.length)return 1/0;for(;i=1+e.indexOf(t,i);)n++;return n},e.merge=function(e,t){return n(n({},e),t)},n=e.extend=function(e,t){var n,i;for(n in t)i=t[n],e[n]=i;return e},e.flatten=i=function(e){var t,n,s,r;for(n=[],s=0,r=e.length;r>s;s++)t=e[s],t instanceof Array?n=n.concat(i(t)):n.push(t);return n},e.del=function(e,t){var n;return n=e[t],delete e[t],n},e.last=s=function(e,t){return e[e.length-(t||0)-1]},e.some=null!=(o=Array.prototype.some)?o:function(e){var t,n,i;for(n=0,i=this.length;i>n;n++)if(t=this[n],e(t))return!0;return!1},e.invertLiterate=function(e){var t,n,i;return i=!0,n=function(){var n,s,r,o;for(r=e.split("\n"),o=[],n=0,s=r.length;s>n;n++)t=r[n],i&&/^([ ]{4}|[ ]{0,3}\t)/.test(t)?o.push(t):(i=/^\s*$/.test(t))?o.push(t):o.push("# "+t);return o}(),n.join("\n")},t=function(e,t){return t?{first_line:e.first_line,first_column:e.first_column,last_line:t.last_line,last_column:t.last_column}:e},e.addLocationDataFn=function(e,n){return function(i){return"object"==typeof i&&i.updateLocationDataIfMissing&&i.updateLocationDataIfMissing(t(e,n)),i}},e.locationDataToString=function(e){var t;return"2"in e&&"first_line"in e[2]?t=e[2]:"first_line"in e&&(t=e),t?""+(t.first_line+1)+":"+(t.first_column+1)+"-"+(""+(t.last_line+1)+":"+(t.last_column+1)):"No location data"},e.baseFileName=function(e,t,n){var i,s;return null==t&&(t=!1),null==n&&(n=!1),s=n?/\\|\//:/\//,i=e.split(s),e=i[i.length-1],t?(i=e.split("."),i.pop(),"coffee"===i[i.length-1]&&i.length>1&&i.pop(),i.join(".")):e},e.isCoffee=function(e){return/\.((lit)?coffee|coffee\.md)$/.test(e)},e.isLiterate=function(e){return/\.(litcoffee|coffee\.md)$/.test(e)},e.throwSyntaxError=function(e,t){var n;throw null==t.last_line&&(t.last_line=t.first_line),null==t.last_column&&(t.last_column=t.first_column),n=new SyntaxError(e),n.location=t,n},e.prettyErrorMessage=function(e,t,n,i){var s,o,a,c,h,l,u,p,d,f,m;return e.location?(m=e.location,h=m.first_line,c=m.first_column,u=m.last_line,l=m.last_column,s=n.split("\n")[h],f=c,a=h===u?l+1:s.length,p=r(" ",f)+r("^",a-f),i&&(o=function(e){return"[1;31m"+e+"[0m"},s=s.slice(0,f)+o(s.slice(f,a))+s.slice(a),p=o(p)),d=""+t+":"+(h+1)+":"+(c+1)+": error: "+e.message+"\n"+s+"\n"+p):e.stack||""+e}}.call(this),t.exports}(),require["./rewriter"]=function(){var e={},t={exports:e};return function(){var t,n,i,s,r,o,a,c,h,l,u,p,d,f,m,b,k,g,y=[].indexOf||function(e){for(var t=0,n=this.length;n>t;t++)if(t in this&&this[t]===e)return t;return-1},v=[].slice;for(d=function(e,t){var n;return n=[e,t],n.generated=!0,n},e.Rewriter=function(){function e(){}return e.prototype.rewrite=function(e){return this.tokens=e,this.removeLeadingNewlines(),this.removeMidExpressionNewlines(),this.closeOpenCalls(),this.closeOpenIndexes(),this.addImplicitIndentation(),this.tagPostfixConditionals(),this.addImplicitBracesAndParens(),this.addLocationDataToGeneratedTokens(),this.tokens},e.prototype.scanTokens=function(e){var t,n,i;for(i=this.tokens,t=0;n=i[t];)t+=e.call(this,n,t,i);return!0},e.prototype.detectEnd=function(e,t,n){var r,o,a,c,h;for(a=this.tokens,r=0;o=a[e];){if(0===r&&t.call(this,o,e))return n.call(this,o,e);if(!o||0>r)return n.call(this,o,e-1);c=o[0],y.call(s,c)>=0?r+=1:(h=o[0],y.call(i,h)>=0&&(r-=1)),e+=1}return e-1},e.prototype.removeLeadingNewlines=function(){var e,t,n,i,s;for(s=this.tokens,e=n=0,i=s.length;i>n&&(t=s[e][0],"TERMINATOR"===t);e=++n);return e?this.tokens.splice(0,e):void 0},e.prototype.removeMidExpressionNewlines=function(){return this.scanTokens(function(e,t,i){var s;return"TERMINATOR"===e[0]&&(s=this.tag(t+1),y.call(n,s)>=0)?(i.splice(t,1),0):1})},e.prototype.closeOpenCalls=function(){var e,t;return t=function(e,t){var n;return")"===(n=e[0])||"CALL_END"===n||"OUTDENT"===e[0]&&")"===this.tag(t-1)},e=function(e,t){return this.tokens["OUTDENT"===e[0]?t-1:t][0]="CALL_END"},this.scanTokens(function(n,i){return"CALL_START"===n[0]&&this.detectEnd(i+1,t,e),1})},e.prototype.closeOpenIndexes=function(){var e,t;return t=function(e){var t;return"]"===(t=e[0])||"INDEX_END"===t},e=function(e){return e[0]="INDEX_END"},this.scanTokens(function(n,i){return"INDEX_START"===n[0]&&this.detectEnd(i+1,t,e),1})},e.prototype.matchTags=function(){var e,t,n,i,s,r,o;for(t=arguments[0],i=2<=arguments.length?v.call(arguments,1):[],e=0,n=s=0,r=i.length;r>=0?r>s:s>r;n=r>=0?++s:--s){for(;"HERECOMMENT"===this.tag(t+n+e);)e+=2;if(null!=i[n]&&("string"==typeof i[n]&&(i[n]=[i[n]]),o=this.tag(t+n+e),y.call(i[n],o)<0))return!1}return!0},e.prototype.looksObjectish=function(e){return this.matchTags(e,"@",null,":")||this.matchTags(e,null,":")},e.prototype.findTagsBackwards=function(e,t){var n,r,o,a,c,h,u;for(n=[];e>=0&&(n.length||(a=this.tag(e),y.call(t,a)<0&&(c=this.tag(e),y.call(s,c)<0||this.tokens[e].generated)&&(h=this.tag(e),y.call(l,h)<0)));)r=this.tag(e),y.call(i,r)>=0&&n.push(this.tag(e)),o=this.tag(e),y.call(s,o)>=0&&n.length&&n.pop(),e-=1;return u=this.tag(e),y.call(t,u)>=0},e.prototype.addImplicitBracesAndParens=function(){var e;return e=[],this.scanTokens(function(t,n,h){var u,p,f,m,b,k,g,v,w,T,C,F,L,N,x,E,D,S,R,A,I,_,$,O,j,M;if(A=t[0],T=(n>0?h[n-1]:[])[0],v=(n<h.length-1?h[n+1]:[])[0],x=function(){return e[e.length-1]},E=n,f=function(e){return n-E+e},m=function(){var e,t;return null!=(e=x())?null!=(t=e[2])?t.ours:void 0:void 0},b=function(){var e;return m()&&"("===(null!=(e=x())?e[0]:void 0)},g=function(){var e;return m()&&"{"===(null!=(e=x())?e[0]:void 0)},k=function(){var e;return m&&"CONTROL"===(null!=(e=x())?e[0]:void 0)},D=function(t){var i;return i=null!=t?t:n,e.push(["(",i,{ours:!0}]),h.splice(i,0,d("CALL_START","(")),null==t?n+=1:void 0},u=function(){return e.pop(),h.splice(n,0,d("CALL_END",")")),n+=1},S=function(t,i){var s;return null==i&&(i=!0),s=null!=t?t:n,e.push(["{",s,{sameLine:!0,startsLine:i,ours:!0}]),h.splice(s,0,d("{",d(new String("{")))),null==t?n+=1:void 0},p=function(t){return t=null!=t?t:n,e.pop(),h.splice(t,0,d("}","}")),n+=1},b()&&("IF"===A||"TRY"===A||"FINALLY"===A||"CATCH"===A||"CLASS"===A||"SWITCH"===A))return e.push(["CONTROL",n,{ours:!0}]),f(1);if("INDENT"===A&&m()){if("=>"!==T&&"->"!==T&&"["!==T&&"("!==T&&","!==T&&"{"!==T&&"TRY"!==T&&"ELSE"!==T&&"="!==T)for(;b();)u();return k()&&e.pop(),e.push([A,n]),f(1)}if(y.call(s,A)>=0)return e.push([A,n]),f(1);if(y.call(i,A)>=0){for(;m();)b()?u():g()?p():e.pop();e.pop()}if((y.call(a,A)>=0&&t.spaced&&!t.stringEnd||"?"===A&&n>0&&!h[n-1].spaced)&&(y.call(r,v)>=0||y.call(c,v)>=0&&!(null!=(I=h[n+1])?I.spaced:void 0)&&!(null!=(_=h[n+1])?_.newLine:void 0)))return"?"===A&&(A=t[0]="FUNC_EXIST"),D(n+1),f(2);if(y.call(a,A)>=0&&this.matchTags(n+1,"INDENT",null,":")&&!this.findTagsBackwards(n,["CLASS","EXTENDS","IF","CATCH","SWITCH","LEADING_WHEN","FOR","WHILE","UNTIL"]))return D(n+1),e.push(["INDENT",n+2]),f(3);if(":"===A){for(C="@"===this.tag(n-2)?n-2:n-1;"HERECOMMENT"===this.tag(C-2);)C-=2;return R=0===C||($=this.tag(C-1),y.call(l,$)>=0)||h[C-1].newLine,x()&&(O=x(),N=O[0],L=O[1],("{"===N||"INDENT"===N&&"{"===this.tag(L-1))&&(R||","===this.tag(C-1)||"{"===this.tag(C-1)))?f(1):(S(C,!!R),f(2))}if("OUTDENT"===T&&b()&&("."===A||"?."===A||"::"===A||"?::"===A))return u(),f(1);if(g()&&y.call(l,A)>=0&&(x()[2].sameLine=!1),y.call(o,A)>=0)for(;m();)if(j=x(),N=j[0],L=j[1],M=j[2],F=M.sameLine,R=M.startsLine,b()&&","!==T)u();else if(g()&&F&&!R)p();else{if(!g()||"TERMINATOR"!==A||","===T||R&&this.looksObjectish(n+1))break;p()}if(","===A&&!this.looksObjectish(n+1)&&g()&&("TERMINATOR"!==v||!this.looksObjectish(n+2)))for(w="OUTDENT"===v?1:0;g();)p(n+w);return f(1)})},e.prototype.addLocationDataToGeneratedTokens=function(){return this.scanTokens(function(e,t,n){var i,s,r,o,a,c;return e[2]?1:e.generated||e.explicit?("{"===e[0]&&(r=null!=(a=n[t+1])?a[2]:void 0)?(s=r.first_line,i=r.first_column):(o=null!=(c=n[t-1])?c[2]:void 0)?(s=o.last_line,i=o.last_column):s=i=0,e[2]={first_line:s,first_column:i,last_line:s,last_column:i},1):1})},e.prototype.addImplicitIndentation=function(){var e,t,n,i,s;return s=n=i=null,t=function(e){var t,n;return";"!==e[1]&&(t=e[0],y.call(u,t)>=0)&&!("ELSE"===e[0]&&"THEN"!==s)&&!!("CATCH"!==(n=e[0])&&"FINALLY"!==n||"->"!==s&&"=>"!==s)},e=function(e,t){return this.tokens.splice(","===this.tag(t-1)?t-1:t,0,i)},this.scanTokens(function(r,o,a){var c,h,l,u,d;if(h=r[0],"TERMINATOR"===h&&"THEN"===this.tag(o+1))return a.splice(o,1),0;if("ELSE"===h&&"OUTDENT"!==this.tag(o-1))return a.splice.apply(a,[o,0].concat(v.call(this.indentation()))),2;if("CATCH"===h)for(c=l=1;2>=l;c=++l)if("OUTDENT"===(u=this.tag(o+c))||"TERMINATOR"===u||"FINALLY"===u)return a.splice.apply(a,[o+c,0].concat(v.call(this.indentation()))),2+c;return y.call(p,h)>=0&&"INDENT"!==this.tag(o+1)&&("ELSE"!==h||"IF"!==this.tag(o+1))?(s=h,d=this.indentation(!0),n=d[0],i=d[1],"THEN"===s&&(n.fromThen=!0),a.splice(o+1,0,n),this.detectEnd(o+2,t,e),"THEN"===h&&a.splice(o,1),1):1})},e.prototype.tagPostfixConditionals=function(){var e,t,n;return n=null,t=function(e,t){var n,i;return i=e[0],n=this.tokens[t-1][0],"TERMINATOR"===i||"INDENT"===i&&y.call(p,n)<0},e=function(e){return"INDENT"!==e[0]||e.generated&&!e.fromThen?n[0]="POST_"+n[0]:void 0},this.scanTokens(function(i,s){return"IF"!==i[0]?1:(n=i,this.detectEnd(s+1,t,e),1)})},e.prototype.indentation=function(e){var t,n;return null==e&&(e=!1),t=["INDENT",2],n=["OUTDENT",2],e&&(t.generated=n.generated=!0),e||(t.explicit=n.explicit=!0),[t,n]},e.prototype.generate=d,e.prototype.tag=function(e){var t;return null!=(t=this.tokens[e])?t[0]:void 0},e}(),t=[["(",")"],["[","]"],["{","}"],["INDENT","OUTDENT"],["CALL_START","CALL_END"],["PARAM_START","PARAM_END"],["INDEX_START","INDEX_END"]],e.INVERSES=h={},s=[],i=[],b=0,k=t.length;k>b;b++)g=t[b],f=g[0],m=g[1],s.push(h[m]=f),i.push(h[f]=m);n=["CATCH","WHEN","ELSE","FINALLY"].concat(i),a=["IDENTIFIER","SUPER",")","CALL_END","]","INDEX_END","@","THIS"],r=["IDENTIFIER","NUMBER","STRING","JS","REGEX","NEW","PARAM_START","CLASS","IF","TRY","SWITCH","THIS","BOOL","NULL","UNDEFINED","UNARY","SUPER","THROW","@","->","=>","[","(","{","--","++"],c=["+","-"],o=["POST_IF","FOR","WHILE","UNTIL","WHEN","BY","LOOP","TERMINATOR"],p=["ELSE","->","=>","TRY","FINALLY","THEN"],u=["TERMINATOR","CATCH","FINALLY","ELSE","OUTDENT","LEADING_WHEN"],l=["TERMINATOR","INDENT","OUTDENT"]}.call(this),t.exports}(),require["./lexer"]=function(){var e={},t={exports:e};return function(){var t,n,i,s,r,o,a,c,h,l,u,p,d,f,m,b,k,g,y,v,w,T,C,F,L,N,x,E,D,S,R,A,I,_,$,O,j,M,B,V,P,U,q,H,G,W,X,Y,K,z,J,Z,Q,et=[].indexOf||function(e){for(var t=0,n=this.length;n>t;t++)if(t in this&&this[t]===e)return t;return-1};Z=require("./rewriter"),O=Z.Rewriter,g=Z.INVERSES,Q=require("./helpers"),H=Q.count,z=Q.starts,q=Q.compact,X=Q.last,K=Q.repeat,G=Q.invertLiterate,Y=Q.locationDataToString,J=Q.throwSyntaxError,e.Lexer=L=function(){function e(){}return e.prototype.tokenize=function(e,t){var n,i,s,r;for(null==t&&(t={}),this.literate=t.literate,this.indent=0,this.indebt=0,this.outdebt=0,this.indents=[],this.ends=[],this.tokens=[],this.chunkLine=t.line||0,this.chunkColumn=t.column||0,e=this.clean(e),i=0;this.chunk=e.slice(i);)n=this.identifierToken()||this.commentToken()||this.whitespaceToken()||this.lineToken()||this.heredocToken()||this.stringToken()||this.numberToken()||this.regexToken()||this.jsToken()||this.literalToken(),r=this.getLineAndColumnFromChunk(n),this.chunkLine=r[0],this.chunkColumn=r[1],i+=n;return this.closeIndentation(),(s=this.ends.pop())&&this.error("missing "+s),t.rewrite===!1?this.tokens:(new O).rewrite(this.tokens)},e.prototype.clean=function(e){return e.charCodeAt(0)===t&&(e=e.slice(1)),e=e.replace(/\r/g,"").replace(V,""),U.test(e)&&(e="\n"+e,this.chunkLine--),this.literate&&(e=G(e)),e},e.prototype.identifierToken=function(){var e,t,n,i,s,c,h,l,u,p,d,f,m,k;return(h=b.exec(this.chunk))?(c=h[0],i=h[1],e=h[2],s=i.length,l=void 0,"own"===i&&"FOR"===this.tag()?(this.token("OWN",i),i.length):(n=e||(u=X(this.tokens))&&("."===(f=u[0])||"?."===f||"::"===f||"?::"===f||!u.spaced&&"@"===u[0]),p="IDENTIFIER",!n&&(et.call(w,i)>=0||et.call(a,i)>=0)&&(p=i.toUpperCase(),"WHEN"===p&&(m=this.tag(),et.call(T,m)>=0)?p="LEADING_WHEN":"FOR"===p?this.seenFor=!0:"UNLESS"===p?p="IF":et.call(P,p)>=0?p="UNARY":et.call(_,p)>=0&&("INSTANCEOF"!==p&&this.seenFor?(p="FOR"+p,this.seenFor=!1):(p="RELATION","!"===this.value()&&(l=this.tokens.pop(),i="!"+i)))),et.call(v,i)>=0&&(n?(p="IDENTIFIER",i=new String(i),i.reserved=!0):et.call($,i)>=0&&this.error('reserved word "'+i+'"')),n||(et.call(r,i)>=0&&(i=o[i]),p=function(){switch(i){case"!":return"UNARY";case"==":case"!=":return"COMPARE";case"&&":case"||":return"LOGIC";case"true":case"false":return"BOOL";case"break":case"continue":return"STATEMENT";default:return p}}()),d=this.token(p,i,0,s),l&&(k=[l[2].first_line,l[2].first_column],d[2].first_line=k[0],d[2].first_column=k[1]),e&&(t=c.lastIndexOf(":"),this.token(":",":",t,e.length)),c.length)):0},e.prototype.numberToken=function(){var e,t,n,i,s;return(n=R.exec(this.chunk))?(i=n[0],/^0[BOX]/.test(i)?this.error("radix prefix '"+i+"' must be lowercase"):/E/.test(i)&&!/^0x/.test(i)?this.error("exponential notation '"+i+"' must be indicated with a lowercase 'e'"):/^0\d*[89]/.test(i)?this.error("decimal literal '"+i+"' must not be prefixed with '0'"):/^0\d+/.test(i)&&this.error("octal literal '"+i+"' must be prefixed with '0o'"),t=i.length,(s=/^0o([0-7]+)/.exec(i))&&(i="0x"+parseInt(s[1],8).toString(16)),(e=/^0b([01]+)/.exec(i))&&(i="0x"+parseInt(e[1],2).toString(16)),this.token("NUMBER",i,0,t),t):0},e.prototype.stringToken=function(){var e,t,n;switch(this.chunk.charAt(0)){case"'":if(!(e=M.exec(this.chunk)))return 0;n=e[0],this.token("STRING",n.replace(x,"\\\n"),0,n.length);break;case'"':if(!(n=this.balancedString(this.chunk,'"')))return 0;0<n.indexOf("#{",1)?this.interpolateString(n.slice(1,-1),{strOffset:1,lexedLength:n.length}):this.token("STRING",this.escapeLines(n,0,n.length));break;default:return 0}return(t=/^(?:\\.|[^\\])*\\(?:0[0-7]|[1-7])/.test(n))&&this.error("octal escape sequences "+n+" are not allowed"),n.length},e.prototype.heredocToken=function(){var e,t,n,i;return(n=u.exec(this.chunk))?(t=n[0],i=t.charAt(0),e=this.sanitizeHeredoc(n[2],{quote:i,indent:null}),'"'===i&&0<=e.indexOf("#{")?this.interpolateString(e,{heredoc:!0,strOffset:3,lexedLength:t.length}):this.token("STRING",this.makeString(e,i,!0),0,t.length),t.length):0},e.prototype.commentToken=function(){var e,t,n;return(n=this.chunk.match(c))?(e=n[0],t=n[1],t&&this.token("HERECOMMENT",this.sanitizeHeredoc(t,{herecomment:!0,indent:K(" ",this.indent)}),0,e.length),e.length):0},e.prototype.jsToken=function(){var e,t;return"`"===this.chunk.charAt(0)&&(e=y.exec(this.chunk))?(this.token("JS",(t=e[0]).slice(1,-1),0,t.length),t.length):0},e.prototype.regexToken=function(){var e,t,n,i,s,r,o;return"/"!==this.chunk.charAt(0)?0:(n=f.exec(this.chunk))?t=this.heregexToken(n):(i=X(this.tokens),i&&(r=i[0],et.call(i.spaced?D:S,r)>=0)?0:(n=I.exec(this.chunk))?(o=n,n=o[0],s=o[1],e=o[2],"/*"===s.slice(0,2)&&this.error("regular expressions cannot begin with `*`"),"//"===s&&(s="/(?:)/"),this.token("REGEX",""+s+e,0,n.length),n.length):0)},e.prototype.heregexToken=function(e){var t,n,i,s,r,o,a,c,h,l,u,p,d,f,b,k;if(s=e[0],t=e[1],n=e[2],0>t.indexOf("#{"))return a=t.replace(m,"").replace(/\//g,"\\/"),a.match(/^\*/)&&this.error("regular expressions cannot begin with `*`"),this.token("REGEX","/"+(a||"(?:)")+"/"+n,0,s.length),s.length;for(this.token("IDENTIFIER","RegExp",0,0),this.token("CALL_START","(",0,0),l=[],f=this.interpolateString(t,{regex:!0}),p=0,d=f.length;d>p;p++){if(h=f[p],c=h[0],u=h[1],"TOKENS"===c)l.push.apply(l,u);else if("NEOSTRING"===c){if(!(u=u.replace(m,"")))continue;u=u.replace(/\\/g,"\\\\"),h[0]="STRING",h[1]=this.makeString(u,'"',!0),l.push(h)}else this.error("Unexpected "+c);o=X(this.tokens),r=["+","+"],r[2]=o[2],l.push(r)}return l.pop(),"STRING"!==(null!=(b=l[0])?b[0]:void 0)&&(this.token("STRING",'""',0,0),this.token("+","+",0,0)),(k=this.tokens).push.apply(k,l),n&&(i=s.lastIndexOf(n),this.token(",",",",i,0),this.token("STRING",'"'+n+'"',i,n.length)),this.token(")",")",s.length-1,0),s.length},e.prototype.lineToken=function(){var e,t,n,i,s;if(!(n=E.exec(this.chunk)))return 0;if(t=n[0],this.seenFor=!1,s=t.length-1-t.lastIndexOf("\n"),i=this.unfinished(),s-this.indebt===this.indent)return i?this.suppressNewlines():this.newlineToken(0),t.length;if(s>this.indent){if(i)return this.indebt=s-this.indent,this.suppressNewlines(),t.length;e=s-this.indent+this.outdebt,this.token("INDENT",e,t.length-s,s),this.indents.push(e),this.ends.push("OUTDENT"),this.outdebt=this.indebt=0}else this.indebt=0,this.outdentToken(this.indent-s,i,t.length);return this.indent=s,t.length},e.prototype.outdentToken=function(e,t,n){for(var i,s;e>0;)s=this.indents.length-1,void 0===this.indents[s]?e=0:this.indents[s]===this.outdebt?(e-=this.outdebt,this.outdebt=0):this.indents[s]<this.outdebt?(this.outdebt-=this.indents[s],e-=this.indents[s]):(i=this.indents.pop()+this.outdebt,e-=i,this.outdebt=0,this.pair("OUTDENT"),this.token("OUTDENT",i,0,n));for(i&&(this.outdebt-=e);";"===this.value();)this.tokens.pop();return"TERMINATOR"===this.tag()||t||this.token("TERMINATOR","\n",n,0),this},e.prototype.whitespaceToken=function(){var e,t,n;return(e=U.exec(this.chunk))||(t="\n"===this.chunk.charAt(0))?(n=X(this.tokens),n&&(n[e?"spaced":"newLine"]=!0),e?e[0].length:0):0},e.prototype.newlineToken=function(e){for(;";"===this.value();)this.tokens.pop();return"TERMINATOR"!==this.tag()&&this.token("TERMINATOR","\n",e,0),this},e.prototype.suppressNewlines=function(){return"\\"===this.value()&&this.tokens.pop(),this},e.prototype.literalToken=function(){var e,t,n,r,o,a,c,u;if((e=A.exec(this.chunk))?(r=e[0],s.test(r)&&this.tagParameters()):r=this.chunk.charAt(0),n=r,t=X(this.tokens),"="===r&&t&&(!t[1].reserved&&(o=t[1],et.call(v,o)>=0)&&this.error('reserved word "'+this.value()+"\" can't be assigned"),"||"===(a=t[1])||"&&"===a))return t[0]="COMPOUND_ASSIGN",t[1]+="=",r.length;if(";"===r)this.seenFor=!1,n="TERMINATOR";else if(et.call(N,r)>=0)n="MATH";else if(et.call(h,r)>=0)n="COMPARE";else if(et.call(l,r)>=0)n="COMPOUND_ASSIGN";else if(et.call(P,r)>=0)n="UNARY";else if(et.call(j,r)>=0)n="SHIFT";else if(et.call(F,r)>=0||"?"===r&&(null!=t?t.spaced:void 0))n="LOGIC";else if(t&&!t.spaced)if("("===r&&(c=t[0],et.call(i,c)>=0))"?"===t[0]&&(t[0]="FUNC_EXIST"),n="CALL_START";else if("["===r&&(u=t[0],et.call(k,u)>=0))switch(n="INDEX_START",t[0]){case"?":t[0]="INDEX_SOAK"}switch(r){case"(":case"{":case"[":this.ends.push(g[r]);break;case")":case"}":case"]":this.pair(r)}return this.token(n,r),r.length},e.prototype.sanitizeHeredoc=function(e,t){var n,i,s,r,o;if(s=t.indent,i=t.herecomment){if(p.test(e)&&this.error('block comment cannot contain "*/", starting'),e.indexOf("\n")<0)return e}else for(;r=d.exec(e);)n=r[1],(null===s||0<(o=n.length)&&o<s.length)&&(s=n);return s&&(e=e.replace(RegExp("\\n"+s,"g"),"\n")),i||(e=e.replace(/^\n/,"")),e},e.prototype.tagParameters=function(){var e,t,n,i;if(")"!==this.tag())return this;for(t=[],i=this.tokens,e=i.length,i[--e][0]="PARAM_END";n=i[--e];)switch(n[0]){case")":t.push(n);break;case"(":case"CALL_START":if(!t.length)return"("===n[0]?(n[0]="PARAM_START",this):this;t.pop()}return this},e.prototype.closeIndentation=function(){return this.outdentToken(this.indent)},e.prototype.balancedString=function(e,t){var n,i,s,r,o,a,c,h;for(n=0,a=[t],i=c=1,h=e.length;h>=1?h>c:c>h;i=h>=1?++c:--c)if(n)--n;else{switch(s=e.charAt(i)){case"\\":++n;continue;case t:if(a.pop(),!a.length)return e.slice(0,+i+1||9e9);t=a[a.length-1];continue}"}"!==t||'"'!==s&&"'"!==s?"}"===t&&"/"===s&&(r=f.exec(e.slice(i))||I.exec(e.slice(i)))?n+=r[0].length-1:"}"===t&&"{"===s?a.push(t="}"):'"'===t&&"#"===o&&"{"===s&&a.push(t="}"):a.push(t=s),o=s}return this.error("missing "+a.pop()+", starting")},e.prototype.interpolateString=function(t,n){var i,s,r,o,a,c,h,l,u,p,d,f,m,b,k,g,y,v,w,T,C,F,L,N,x,E,D,S;for(null==n&&(n={}),r=n.heredoc,y=n.regex,m=n.offsetInChunk,w=n.strOffset,u=n.lexedLength,m=m||0,w=w||0,u=u||t.length,r&&t.length>0&&"\n"===t[0]&&(t=t.slice(1),w++),F=[],b=0,o=-1;l=t.charAt(o+=1);)"\\"!==l?"#"===l&&"{"===t.charAt(o+1)&&(s=this.balancedString(t.slice(o+1),"}"))&&(o>b&&F.push(this.makeToken("NEOSTRING",t.slice(b,o),w+b)),a=s.slice(1,-1),a.length&&(E=this.getLineAndColumnFromChunk(w+o+1),p=E[0],i=E[1],f=(new e).tokenize(a,{line:p,column:i,rewrite:!1}),g=f.pop(),"TERMINATOR"===(null!=(D=f[0])?D[0]:void 0)&&(g=f.shift()),(h=f.length)&&(h>1&&(f.unshift(this.makeToken("(","(",w+o+1,0)),f.push(this.makeToken(")",")",w+o+1+a.length,0))),F.push(["TOKENS",f]))),o+=s.length,b=o+1):o+=1;if(o>b&&b<t.length&&F.push(this.makeToken("NEOSTRING",t.slice(b),w+b)),y)return F;if(!F.length)return this.token("STRING",'""',m,u);for("NEOSTRING"!==F[0][0]&&F.unshift(this.makeToken("NEOSTRING","",m)),(c=F.length>1)&&this.token("(","(",m,0),o=N=0,x=F.length;x>N;o=++N)C=F[o],T=C[0],L=C[1],o&&(o&&(k=this.token("+","+")),d="TOKENS"===T?L[0]:C,k[2]={first_line:d[2].first_line,first_column:d[2].first_column,last_line:d[2].first_line,last_column:d[2].first_column}),"TOKENS"===T?(S=this.tokens).push.apply(S,L):"NEOSTRING"===T?(C[0]="STRING",C[1]=this.makeString(L,'"',r),this.tokens.push(C)):this.error("Unexpected "+T);return c&&(v=this.makeToken(")",")",m+u,0),v.stringEnd=!0,this.tokens.push(v)),F},e.prototype.pair=function(e){var t,n;return e!==(n=X(this.ends))?("OUTDENT"!==n&&this.error("unmatched "+e),this.indent-=t=X(this.indents),this.outdentToken(t,!0),this.pair(e)):this.ends.pop()},e.prototype.getLineAndColumnFromChunk=function(e){var t,n,i,s;return 0===e?[this.chunkLine,this.chunkColumn]:(s=e>=this.chunk.length?this.chunk:this.chunk.slice(0,+(e-1)+1||9e9),n=H(s,"\n"),t=this.chunkColumn,n>0?(i=s.split("\n"),t=X(i).length):t+=s.length,[this.chunkLine+n,t])},e.prototype.makeToken=function(e,t,n,i){var s,r,o,a,c;return null==n&&(n=0),null==i&&(i=t.length),r={},a=this.getLineAndColumnFromChunk(n),r.first_line=a[0],r.first_column=a[1],s=Math.max(0,i-1),c=this.getLineAndColumnFromChunk(n+s),r.last_line=c[0],r.last_column=c[1],o=[e,t,r]},e.prototype.token=function(e,t,n,i){var s;return s=this.makeToken(e,t,n,i),this.tokens.push(s),s},e.prototype.tag=function(e,t){var n;return(n=X(this.tokens,e))&&(t?n[0]=t:n[0])},e.prototype.value=function(e,t){var n;return(n=X(this.tokens,e))&&(t?n[1]=t:n[1])},e.prototype.unfinished=function(){var e;return C.test(this.chunk)||"\\"===(e=this.tag())||"."===e||"?."===e||"?::"===e||"UNARY"===e||"MATH"===e||"+"===e||"-"===e||"SHIFT"===e||"RELATION"===e||"COMPARE"===e||"LOGIC"===e||"THROW"===e||"EXTENDS"===e},e.prototype.escapeLines=function(e,t){return e.replace(x,t?"\\n":"")},e.prototype.makeString=function(e,t,n){return e?(e=e.replace(/\\([\s\S])/g,function(e,n){return"\n"===n||n===t?n:e}),e=e.replace(RegExp(""+t,"g"),"\\$&"),t+this.escapeLines(e,n)+t):t+t},e.prototype.error=function(e){return J(e,{first_line:this.chunkLine,first_column:this.chunkColumn})},e}(),w=["true","false","null","this","new","delete","typeof","in","instanceof","return","throw","break","continue","debugger","if","else","switch","for","while","do","try","catch","finally","class","extends","super"],a=["undefined","then","unless","until","loop","of","by","when"],o={and:"&&",or:"||",is:"==",isnt:"!=",not:"!",yes:"true",no:"false",on:"true",off:"false"},r=function(){var e;e=[];for(W in o)e.push(W);return e}(),a=a.concat(r),$=["case","default","function","var","void","with","const","let","enum","export","import","native","__hasProp","__extends","__slice","__bind","__indexOf","implements","interface","package","private","protected","public","static","yield"],B=["arguments","eval"],v=w.concat($).concat(B),e.RESERVED=$.concat(w).concat(a).concat(B),e.STRICT_PROSCRIBED=B,t=65279,b=/^([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?!:))?/,R=/^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i,u=/^("""|''')([\s\S]*?)(?:\n[^\n\S]*)?\1/,A=/^(?:[-=]>|[-+*\/%<>&|^!?=]=|>>>=?|([-+:])\1|([&|<>])\2=?|\?(\.|::)|\.{2,3})/,U=/^[^\n\S]+/,c=/^###([^#][\s\S]*?)(?:###[^\n\S]*|(?:###)$)|^(?:\s*#(?!##[^#]).*)+/,s=/^[-=]>/,E=/^(?:\n[^\n\S]*)+/,M=/^'[^\\']*(?:\\.[^\\']*)*'/,y=/^`[^\\`]*(?:\\.[^\\`]*)*`/,I=/^(\/(?![\s=])[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/)([imgy]{0,4})(?!\w)/,f=/^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/,m=/\s+(?:#.*)?/g,x=/\n/g,d=/\n+([^\n\S]*)/g,p=/\*\//,C=/^\s*(?:,|\??\.(?![.\d])|::)/,V=/\s+$/,l=["-=","+=","/=","*=","%=","||=","&&=","?=","<<=",">>=",">>>=","&=","^=","|="],P=["!","~","NEW","TYPEOF","DELETE","DO"],F=["&&","||","&","|","^"],j=["<<",">>",">>>"],h=["==","!=","<",">","<=",">="],N=["*","/","%"],_=["IN","OF","INSTANCEOF"],n=["TRUE","FALSE"],D=["NUMBER","REGEX","BOOL","NULL","UNDEFINED","++","--"],S=D.concat(")","}","THIS","IDENTIFIER","STRING","]"),i=["IDENTIFIER","STRING","REGEX",")","]","}","?","::","@","THIS","SUPER"],k=i.concat("NUMBER","BOOL","NULL","UNDEFINED"),T=["INDENT","OUTDENT","TERMINATOR"]}.call(this),t.exports}(),require["./parser"]=function(){var e={},t={exports:e},n=function(){function e(){this.yy={}}var t={trace:function(){},yy:{},symbols_:{error:2,Root:3,Body:4,Block:5,TERMINATOR:6,Line:7,Expression:8,Statement:9,Return:10,Comment:11,STATEMENT:12,Value:13,Invocation:14,Code:15,Operation:16,Assign:17,If:18,Try:19,While:20,For:21,Switch:22,Class:23,Throw:24,INDENT:25,OUTDENT:26,Identifier:27,IDENTIFIER:28,AlphaNumeric:29,NUMBER:30,STRING:31,Literal:32,JS:33,REGEX:34,DEBUGGER:35,UNDEFINED:36,NULL:37,BOOL:38,Assignable:39,"=":40,AssignObj:41,ObjAssignable:42,":":43,ThisProperty:44,RETURN:45,HERECOMMENT:46,PARAM_START:47,ParamList:48,PARAM_END:49,FuncGlyph:50,"->":51,"=>":52,OptComma:53,",":54,Param:55,ParamVar:56,"...":57,Array:58,Object:59,Splat:60,SimpleAssignable:61,Accessor:62,Parenthetical:63,Range:64,This:65,".":66,"?.":67,"::":68,"?::":69,Index:70,INDEX_START:71,IndexValue:72,INDEX_END:73,INDEX_SOAK:74,Slice:75,"{":76,AssignList:77,"}":78,CLASS:79,EXTENDS:80,OptFuncExist:81,Arguments:82,SUPER:83,FUNC_EXIST:84,CALL_START:85,CALL_END:86,ArgList:87,THIS:88,"@":89,"[":90,"]":91,RangeDots:92,"..":93,Arg:94,SimpleArgs:95,TRY:96,Catch:97,FINALLY:98,CATCH:99,THROW:100,"(":101,")":102,WhileSource:103,WHILE:104,WHEN:105,UNTIL:106,Loop:107,LOOP:108,ForBody:109,FOR:110,ForStart:111,ForSource:112,ForVariables:113,OWN:114,ForValue:115,FORIN:116,FOROF:117,BY:118,SWITCH:119,Whens:120,ELSE:121,When:122,LEADING_WHEN:123,IfBlock:124,IF:125,POST_IF:126,UNARY:127,"-":128,"+":129,"--":130,"++":131,"?":132,MATH:133,SHIFT:134,COMPARE:135,LOGIC:136,RELATION:137,COMPOUND_ASSIGN:138,$accept:0,$end:1},terminals_:{2:"error",6:"TERMINATOR",12:"STATEMENT",25:"INDENT",26:"OUTDENT",28:"IDENTIFIER",30:"NUMBER",31:"STRING",33:"JS",34:"REGEX",35:"DEBUGGER",36:"UNDEFINED",37:"NULL",38:"BOOL",40:"=",43:":",45:"RETURN",46:"HERECOMMENT",47:"PARAM_START",49:"PARAM_END",51:"->",52:"=>",54:",",57:"...",66:".",67:"?.",68:"::",69:"?::",71:"INDEX_START",73:"INDEX_END",74:"INDEX_SOAK",76:"{",78:"}",79:"CLASS",80:"EXTENDS",83:"SUPER",84:"FUNC_EXIST",85:"CALL_START",86:"CALL_END",88:"THIS",89:"@",90:"[",91:"]",93:"..",96:"TRY",98:"FINALLY",99:"CATCH",100:"THROW",101:"(",102:")",104:"WHILE",105:"WHEN",106:"UNTIL",108:"LOOP",110:"FOR",114:"OWN",116:"FORIN",117:"FOROF",118:"BY",119:"SWITCH",121:"ELSE",123:"LEADING_WHEN",125:"IF",126:"POST_IF",127:"UNARY",128:"-",129:"+",130:"--",131:"++",132:"?",133:"MATH",134:"SHIFT",135:"COMPARE",136:"LOGIC",137:"RELATION",138:"COMPOUND_ASSIGN"},productions_:[0,[3,0],[3,1],[3,2],[4,1],[4,3],[4,2],[7,1],[7,1],[9,1],[9,1],[9,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[5,2],[5,3],[27,1],[29,1],[29,1],[32,1],[32,1],[32,1],[32,1],[32,1],[32,1],[32,1],[17,3],[17,4],[17,5],[41,1],[41,3],[41,5],[41,1],[42,1],[42,1],[42,1],[10,2],[10,1],[11,1],[15,5],[15,2],[50,1],[50,1],[53,0],[53,1],[48,0],[48,1],[48,3],[48,4],[48,6],[55,1],[55,2],[55,3],[56,1],[56,1],[56,1],[56,1],[60,2],[61,1],[61,2],[61,2],[61,1],[39,1],[39,1],[39,1],[13,1],[13,1],[13,1],[13,1],[13,1],[62,2],[62,2],[62,2],[62,2],[62,1],[62,1],[70,3],[70,2],[72,1],[72,1],[59,4],[77,0],[77,1],[77,3],[77,4],[77,6],[23,1],[23,2],[23,3],[23,4],[23,2],[23,3],[23,4],[23,5],[14,3],[14,3],[14,1],[14,2],[81,0],[81,1],[82,2],[82,4],[65,1],[65,1],[44,2],[58,2],[58,4],[92,1],[92,1],[64,5],[75,3],[75,2],[75,2],[75,1],[87,1],[87,3],[87,4],[87,4],[87,6],[94,1],[94,1],[95,1],[95,3],[19,2],[19,3],[19,4],[19,5],[97,3],[97,3],[97,2],[24,2],[63,3],[63,5],[103,2],[103,4],[103,2],[103,4],[20,2],[20,2],[20,2],[20,1],[107,2],[107,2],[21,2],[21,2],[21,2],[109,2],[109,2],[111,2],[111,3],[115,1],[115,1],[115,1],[115,1],[113,1],[113,3],[112,2],[112,2],[112,4],[112,4],[112,4],[112,6],[112,6],[22,5],[22,7],[22,4],[22,6],[120,1],[120,2],[122,3],[122,4],[124,3],[124,5],[18,1],[18,3],[18,3],[18,3],[16,2],[16,2],[16,2],[16,2],[16,2],[16,2],[16,2],[16,2],[16,3],[16,3],[16,3],[16,3],[16,3],[16,3],[16,3],[16,3],[16,5],[16,4],[16,3]],performAction:function(e,t,n,i,s,r,o){var a=r.length-1;switch(s){case 1:return this.$=i.addLocationDataFn(o[a],o[a])(new i.Block);case 2:return this.$=r[a];case 3:return this.$=r[a-1];case 4:this.$=i.addLocationDataFn(o[a],o[a])(i.Block.wrap([r[a]]));break;case 5:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-2].push(r[a]));break;case 6:this.$=r[a-1];break;case 7:this.$=r[a];break;case 8:this.$=r[a];break;case 9:this.$=r[a];break;case 10:this.$=r[a];break;case 11:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 12:this.$=r[a];break;case 13:this.$=r[a];break;case 14:this.$=r[a];break;case 15:this.$=r[a];break;case 16:this.$=r[a];break;case 17:this.$=r[a];break;case 18:this.$=r[a];break;case 19:this.$=r[a];break;case 20:this.$=r[a];break;case 21:this.$=r[a];break;case 22:this.$=r[a];break;case 23:this.$=r[a];break;case 24:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Block);break;case 25:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-1]);break;case 26:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 27:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 28:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 29:this.$=r[a];break;case 30:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 31:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 32:this.$=i.addLocationDataFn(o[a],o[a])(new i.Literal(r[a]));break;case 33:this.$=i.addLocationDataFn(o[a],o[a])(new i.Undefined);break;case 34:this.$=i.addLocationDataFn(o[a],o[a])(new i.Null);break;case 35:this.$=i.addLocationDataFn(o[a],o[a])(new i.Bool(r[a]));break;case 36:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Assign(r[a-2],r[a]));break;case 37:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Assign(r[a-3],r[a]));break;case 38:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Assign(r[a-4],r[a-1]));break;case 39:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 40:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Assign(i.addLocationDataFn(o[a-2])(new i.Value(r[a-2])),r[a],"object"));break;case 41:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Assign(i.addLocationDataFn(o[a-4])(new i.Value(r[a-4])),r[a-1],"object"));break;case 42:this.$=r[a];break;case 43:this.$=r[a];break;case 44:this.$=r[a];break;case 45:this.$=r[a];break;case 46:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Return(r[a]));break;case 47:this.$=i.addLocationDataFn(o[a],o[a])(new i.Return);break;case 48:this.$=i.addLocationDataFn(o[a],o[a])(new i.Comment(r[a]));break;case 49:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Code(r[a-3],r[a],r[a-1]));break;case 50:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Code([],r[a],r[a-1]));
break;case 51:this.$=i.addLocationDataFn(o[a],o[a])("func");break;case 52:this.$=i.addLocationDataFn(o[a],o[a])("boundfunc");break;case 53:this.$=r[a];break;case 54:this.$=r[a];break;case 55:this.$=i.addLocationDataFn(o[a],o[a])([]);break;case 56:this.$=i.addLocationDataFn(o[a],o[a])([r[a]]);break;case 57:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-2].concat(r[a]));break;case 58:this.$=i.addLocationDataFn(o[a-3],o[a])(r[a-3].concat(r[a]));break;case 59:this.$=i.addLocationDataFn(o[a-5],o[a])(r[a-5].concat(r[a-2]));break;case 60:this.$=i.addLocationDataFn(o[a],o[a])(new i.Param(r[a]));break;case 61:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Param(r[a-1],null,!0));break;case 62:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Param(r[a-2],r[a]));break;case 63:this.$=r[a];break;case 64:this.$=r[a];break;case 65:this.$=r[a];break;case 66:this.$=r[a];break;case 67:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Splat(r[a-1]));break;case 68:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 69:this.$=i.addLocationDataFn(o[a-1],o[a])(r[a-1].add(r[a]));break;case 70:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Value(r[a-1],[].concat(r[a])));break;case 71:this.$=r[a];break;case 72:this.$=r[a];break;case 73:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 74:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 75:this.$=r[a];break;case 76:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 77:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 78:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 79:this.$=r[a];break;case 80:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Access(r[a]));break;case 81:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Access(r[a],"soak"));break;case 82:this.$=i.addLocationDataFn(o[a-1],o[a])([i.addLocationDataFn(o[a-1])(new i.Access(new i.Literal("prototype"))),i.addLocationDataFn(o[a])(new i.Access(r[a]))]);break;case 83:this.$=i.addLocationDataFn(o[a-1],o[a])([i.addLocationDataFn(o[a-1])(new i.Access(new i.Literal("prototype"),"soak")),i.addLocationDataFn(o[a])(new i.Access(r[a]))]);break;case 84:this.$=i.addLocationDataFn(o[a],o[a])(new i.Access(new i.Literal("prototype")));break;case 85:this.$=r[a];break;case 86:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-1]);break;case 87:this.$=i.addLocationDataFn(o[a-1],o[a])(i.extend(r[a],{soak:!0}));break;case 88:this.$=i.addLocationDataFn(o[a],o[a])(new i.Index(r[a]));break;case 89:this.$=i.addLocationDataFn(o[a],o[a])(new i.Slice(r[a]));break;case 90:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Obj(r[a-2],r[a-3].generated));break;case 91:this.$=i.addLocationDataFn(o[a],o[a])([]);break;case 92:this.$=i.addLocationDataFn(o[a],o[a])([r[a]]);break;case 93:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-2].concat(r[a]));break;case 94:this.$=i.addLocationDataFn(o[a-3],o[a])(r[a-3].concat(r[a]));break;case 95:this.$=i.addLocationDataFn(o[a-5],o[a])(r[a-5].concat(r[a-2]));break;case 96:this.$=i.addLocationDataFn(o[a],o[a])(new i.Class);break;case 97:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Class(null,null,r[a]));break;case 98:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Class(null,r[a]));break;case 99:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Class(null,r[a-1],r[a]));break;case 100:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Class(r[a]));break;case 101:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Class(r[a-1],null,r[a]));break;case 102:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Class(r[a-2],r[a]));break;case 103:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Class(r[a-3],r[a-1],r[a]));break;case 104:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Call(r[a-2],r[a],r[a-1]));break;case 105:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Call(r[a-2],r[a],r[a-1]));break;case 106:this.$=i.addLocationDataFn(o[a],o[a])(new i.Call("super",[new i.Splat(new i.Literal("arguments"))]));break;case 107:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Call("super",r[a]));break;case 108:this.$=i.addLocationDataFn(o[a],o[a])(!1);break;case 109:this.$=i.addLocationDataFn(o[a],o[a])(!0);break;case 110:this.$=i.addLocationDataFn(o[a-1],o[a])([]);break;case 111:this.$=i.addLocationDataFn(o[a-3],o[a])(r[a-2]);break;case 112:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(new i.Literal("this")));break;case 113:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(new i.Literal("this")));break;case 114:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Value(i.addLocationDataFn(o[a-1])(new i.Literal("this")),[i.addLocationDataFn(o[a])(new i.Access(r[a]))],"this"));break;case 115:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Arr([]));break;case 116:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Arr(r[a-2]));break;case 117:this.$=i.addLocationDataFn(o[a],o[a])("inclusive");break;case 118:this.$=i.addLocationDataFn(o[a],o[a])("exclusive");break;case 119:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Range(r[a-3],r[a-1],r[a-2]));break;case 120:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Range(r[a-2],r[a],r[a-1]));break;case 121:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Range(r[a-1],null,r[a]));break;case 122:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Range(null,r[a],r[a-1]));break;case 123:this.$=i.addLocationDataFn(o[a],o[a])(new i.Range(null,null,r[a]));break;case 124:this.$=i.addLocationDataFn(o[a],o[a])([r[a]]);break;case 125:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-2].concat(r[a]));break;case 126:this.$=i.addLocationDataFn(o[a-3],o[a])(r[a-3].concat(r[a]));break;case 127:this.$=i.addLocationDataFn(o[a-3],o[a])(r[a-2]);break;case 128:this.$=i.addLocationDataFn(o[a-5],o[a])(r[a-5].concat(r[a-2]));break;case 129:this.$=r[a];break;case 130:this.$=r[a];break;case 131:this.$=r[a];break;case 132:this.$=i.addLocationDataFn(o[a-2],o[a])([].concat(r[a-2],r[a]));break;case 133:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Try(r[a]));break;case 134:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Try(r[a-1],r[a][0],r[a][1]));break;case 135:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Try(r[a-2],null,null,r[a]));break;case 136:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Try(r[a-3],r[a-2][0],r[a-2][1],r[a]));break;case 137:this.$=i.addLocationDataFn(o[a-2],o[a])([r[a-1],r[a]]);break;case 138:this.$=i.addLocationDataFn(o[a-2],o[a])([i.addLocationDataFn(o[a-1])(new i.Value(r[a-1])),r[a]]);break;case 139:this.$=i.addLocationDataFn(o[a-1],o[a])([null,r[a]]);break;case 140:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Throw(r[a]));break;case 141:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Parens(r[a-1]));break;case 142:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Parens(r[a-2]));break;case 143:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.While(r[a]));break;case 144:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.While(r[a-2],{guard:r[a]}));break;case 145:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.While(r[a],{invert:!0}));break;case 146:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.While(r[a-2],{invert:!0,guard:r[a]}));break;case 147:this.$=i.addLocationDataFn(o[a-1],o[a])(r[a-1].addBody(r[a]));break;case 148:this.$=i.addLocationDataFn(o[a-1],o[a])(r[a].addBody(i.addLocationDataFn(o[a-1])(i.Block.wrap([r[a-1]]))));break;case 149:this.$=i.addLocationDataFn(o[a-1],o[a])(r[a].addBody(i.addLocationDataFn(o[a-1])(i.Block.wrap([r[a-1]]))));break;case 150:this.$=i.addLocationDataFn(o[a],o[a])(r[a]);break;case 151:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.While(i.addLocationDataFn(o[a-1])(new i.Literal("true"))).addBody(r[a]));break;case 152:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.While(i.addLocationDataFn(o[a-1])(new i.Literal("true"))).addBody(i.addLocationDataFn(o[a])(i.Block.wrap([r[a]]))));break;case 153:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.For(r[a-1],r[a]));break;case 154:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.For(r[a-1],r[a]));break;case 155:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.For(r[a],r[a-1]));break;case 156:this.$=i.addLocationDataFn(o[a-1],o[a])({source:i.addLocationDataFn(o[a])(new i.Value(r[a]))});break;case 157:this.$=i.addLocationDataFn(o[a-1],o[a])(function(){return r[a].own=r[a-1].own,r[a].name=r[a-1][0],r[a].index=r[a-1][1],r[a]}());break;case 158:this.$=i.addLocationDataFn(o[a-1],o[a])(r[a]);break;case 159:this.$=i.addLocationDataFn(o[a-2],o[a])(function(){return r[a].own=!0,r[a]}());break;case 160:this.$=r[a];break;case 161:this.$=r[a];break;case 162:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 163:this.$=i.addLocationDataFn(o[a],o[a])(new i.Value(r[a]));break;case 164:this.$=i.addLocationDataFn(o[a],o[a])([r[a]]);break;case 165:this.$=i.addLocationDataFn(o[a-2],o[a])([r[a-2],r[a]]);break;case 166:this.$=i.addLocationDataFn(o[a-1],o[a])({source:r[a]});break;case 167:this.$=i.addLocationDataFn(o[a-1],o[a])({source:r[a],object:!0});break;case 168:this.$=i.addLocationDataFn(o[a-3],o[a])({source:r[a-2],guard:r[a]});break;case 169:this.$=i.addLocationDataFn(o[a-3],o[a])({source:r[a-2],guard:r[a],object:!0});break;case 170:this.$=i.addLocationDataFn(o[a-3],o[a])({source:r[a-2],step:r[a]});break;case 171:this.$=i.addLocationDataFn(o[a-5],o[a])({source:r[a-4],guard:r[a-2],step:r[a]});break;case 172:this.$=i.addLocationDataFn(o[a-5],o[a])({source:r[a-4],step:r[a-2],guard:r[a]});break;case 173:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Switch(r[a-3],r[a-1]));break;case 174:this.$=i.addLocationDataFn(o[a-6],o[a])(new i.Switch(r[a-5],r[a-3],r[a-1]));break;case 175:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Switch(null,r[a-1]));break;case 176:this.$=i.addLocationDataFn(o[a-5],o[a])(new i.Switch(null,r[a-3],r[a-1]));break;case 177:this.$=r[a];break;case 178:this.$=i.addLocationDataFn(o[a-1],o[a])(r[a-1].concat(r[a]));break;case 179:this.$=i.addLocationDataFn(o[a-2],o[a])([[r[a-1],r[a]]]);break;case 180:this.$=i.addLocationDataFn(o[a-3],o[a])([[r[a-2],r[a-1]]]);break;case 181:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.If(r[a-1],r[a],{type:r[a-2]}));break;case 182:this.$=i.addLocationDataFn(o[a-4],o[a])(r[a-4].addElse(new i.If(r[a-1],r[a],{type:r[a-2]})));break;case 183:this.$=r[a];break;case 184:this.$=i.addLocationDataFn(o[a-2],o[a])(r[a-2].addElse(r[a]));break;case 185:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.If(r[a],i.addLocationDataFn(o[a-2])(i.Block.wrap([r[a-2]])),{type:r[a-1],statement:!0}));break;case 186:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.If(r[a],i.addLocationDataFn(o[a-2])(i.Block.wrap([r[a-2]])),{type:r[a-1],statement:!0}));break;case 187:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op(r[a-1],r[a]));break;case 188:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op("-",r[a]));break;case 189:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op("+",r[a]));break;case 190:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op("--",r[a]));break;case 191:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op("++",r[a]));break;case 192:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op("--",r[a-1],null,!0));break;case 193:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Op("++",r[a-1],null,!0));break;case 194:this.$=i.addLocationDataFn(o[a-1],o[a])(new i.Existence(r[a-1]));break;case 195:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Op("+",r[a-2],r[a]));break;case 196:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Op("-",r[a-2],r[a]));break;case 197:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Op(r[a-1],r[a-2],r[a]));break;case 198:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Op(r[a-1],r[a-2],r[a]));break;case 199:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Op(r[a-1],r[a-2],r[a]));break;case 200:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Op(r[a-1],r[a-2],r[a]));break;case 201:this.$=i.addLocationDataFn(o[a-2],o[a])(function(){return"!"===r[a-1].charAt(0)?new i.Op(r[a-1].slice(1),r[a-2],r[a]).invert():new i.Op(r[a-1],r[a-2],r[a])}());break;case 202:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Assign(r[a-2],r[a],r[a-1]));break;case 203:this.$=i.addLocationDataFn(o[a-4],o[a])(new i.Assign(r[a-4],r[a-1],r[a-3]));break;case 204:this.$=i.addLocationDataFn(o[a-3],o[a])(new i.Assign(r[a-3],r[a],r[a-2]));break;case 205:this.$=i.addLocationDataFn(o[a-2],o[a])(new i.Extends(r[a-2],r[a]))}},table:[{1:[2,1],3:1,4:2,5:3,7:4,8:6,9:7,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,5],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[3]},{1:[2,2],6:[1,74]},{6:[1,75]},{1:[2,4],6:[2,4],26:[2,4],102:[2,4]},{4:77,7:4,8:6,9:7,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,26:[1,76],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,7],6:[2,7],26:[2,7],102:[2,7],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,8],6:[2,8],26:[2,8],102:[2,8],103:90,104:[1,65],106:[1,66],109:91,110:[1,68],111:69,126:[1,89]},{1:[2,12],6:[2,12],25:[2,12],26:[2,12],49:[2,12],54:[2,12],57:[2,12],62:93,66:[1,95],67:[1,96],68:[1,97],69:[1,98],70:99,71:[1,100],73:[2,12],74:[1,101],78:[2,12],81:92,84:[1,94],85:[2,108],86:[2,12],91:[2,12],93:[2,12],102:[2,12],104:[2,12],105:[2,12],106:[2,12],110:[2,12],118:[2,12],126:[2,12],128:[2,12],129:[2,12],132:[2,12],133:[2,12],134:[2,12],135:[2,12],136:[2,12],137:[2,12]},{1:[2,13],6:[2,13],25:[2,13],26:[2,13],49:[2,13],54:[2,13],57:[2,13],62:103,66:[1,95],67:[1,96],68:[1,97],69:[1,98],70:99,71:[1,100],73:[2,13],74:[1,101],78:[2,13],81:102,84:[1,94],85:[2,108],86:[2,13],91:[2,13],93:[2,13],102:[2,13],104:[2,13],105:[2,13],106:[2,13],110:[2,13],118:[2,13],126:[2,13],128:[2,13],129:[2,13],132:[2,13],133:[2,13],134:[2,13],135:[2,13],136:[2,13],137:[2,13]},{1:[2,14],6:[2,14],25:[2,14],26:[2,14],49:[2,14],54:[2,14],57:[2,14],73:[2,14],78:[2,14],86:[2,14],91:[2,14],93:[2,14],102:[2,14],104:[2,14],105:[2,14],106:[2,14],110:[2,14],118:[2,14],126:[2,14],128:[2,14],129:[2,14],132:[2,14],133:[2,14],134:[2,14],135:[2,14],136:[2,14],137:[2,14]},{1:[2,15],6:[2,15],25:[2,15],26:[2,15],49:[2,15],54:[2,15],57:[2,15],73:[2,15],78:[2,15],86:[2,15],91:[2,15],93:[2,15],102:[2,15],104:[2,15],105:[2,15],106:[2,15],110:[2,15],118:[2,15],126:[2,15],128:[2,15],129:[2,15],132:[2,15],133:[2,15],134:[2,15],135:[2,15],136:[2,15],137:[2,15]},{1:[2,16],6:[2,16],25:[2,16],26:[2,16],49:[2,16],54:[2,16],57:[2,16],73:[2,16],78:[2,16],86:[2,16],91:[2,16],93:[2,16],102:[2,16],104:[2,16],105:[2,16],106:[2,16],110:[2,16],118:[2,16],126:[2,16],128:[2,16],129:[2,16],132:[2,16],133:[2,16],134:[2,16],135:[2,16],136:[2,16],137:[2,16]},{1:[2,17],6:[2,17],25:[2,17],26:[2,17],49:[2,17],54:[2,17],57:[2,17],73:[2,17],78:[2,17],86:[2,17],91:[2,17],93:[2,17],102:[2,17],104:[2,17],105:[2,17],106:[2,17],110:[2,17],118:[2,17],126:[2,17],128:[2,17],129:[2,17],132:[2,17],133:[2,17],134:[2,17],135:[2,17],136:[2,17],137:[2,17]},{1:[2,18],6:[2,18],25:[2,18],26:[2,18],49:[2,18],54:[2,18],57:[2,18],73:[2,18],78:[2,18],86:[2,18],91:[2,18],93:[2,18],102:[2,18],104:[2,18],105:[2,18],106:[2,18],110:[2,18],118:[2,18],126:[2,18],128:[2,18],129:[2,18],132:[2,18],133:[2,18],134:[2,18],135:[2,18],136:[2,18],137:[2,18]},{1:[2,19],6:[2,19],25:[2,19],26:[2,19],49:[2,19],54:[2,19],57:[2,19],73:[2,19],78:[2,19],86:[2,19],91:[2,19],93:[2,19],102:[2,19],104:[2,19],105:[2,19],106:[2,19],110:[2,19],118:[2,19],126:[2,19],128:[2,19],129:[2,19],132:[2,19],133:[2,19],134:[2,19],135:[2,19],136:[2,19],137:[2,19]},{1:[2,20],6:[2,20],25:[2,20],26:[2,20],49:[2,20],54:[2,20],57:[2,20],73:[2,20],78:[2,20],86:[2,20],91:[2,20],93:[2,20],102:[2,20],104:[2,20],105:[2,20],106:[2,20],110:[2,20],118:[2,20],126:[2,20],128:[2,20],129:[2,20],132:[2,20],133:[2,20],134:[2,20],135:[2,20],136:[2,20],137:[2,20]},{1:[2,21],6:[2,21],25:[2,21],26:[2,21],49:[2,21],54:[2,21],57:[2,21],73:[2,21],78:[2,21],86:[2,21],91:[2,21],93:[2,21],102:[2,21],104:[2,21],105:[2,21],106:[2,21],110:[2,21],118:[2,21],126:[2,21],128:[2,21],129:[2,21],132:[2,21],133:[2,21],134:[2,21],135:[2,21],136:[2,21],137:[2,21]},{1:[2,22],6:[2,22],25:[2,22],26:[2,22],49:[2,22],54:[2,22],57:[2,22],73:[2,22],78:[2,22],86:[2,22],91:[2,22],93:[2,22],102:[2,22],104:[2,22],105:[2,22],106:[2,22],110:[2,22],118:[2,22],126:[2,22],128:[2,22],129:[2,22],132:[2,22],133:[2,22],134:[2,22],135:[2,22],136:[2,22],137:[2,22]},{1:[2,23],6:[2,23],25:[2,23],26:[2,23],49:[2,23],54:[2,23],57:[2,23],73:[2,23],78:[2,23],86:[2,23],91:[2,23],93:[2,23],102:[2,23],104:[2,23],105:[2,23],106:[2,23],110:[2,23],118:[2,23],126:[2,23],128:[2,23],129:[2,23],132:[2,23],133:[2,23],134:[2,23],135:[2,23],136:[2,23],137:[2,23]},{1:[2,9],6:[2,9],26:[2,9],102:[2,9],104:[2,9],106:[2,9],110:[2,9],126:[2,9]},{1:[2,10],6:[2,10],26:[2,10],102:[2,10],104:[2,10],106:[2,10],110:[2,10],126:[2,10]},{1:[2,11],6:[2,11],26:[2,11],102:[2,11],104:[2,11],106:[2,11],110:[2,11],126:[2,11]},{1:[2,75],6:[2,75],25:[2,75],26:[2,75],40:[1,104],49:[2,75],54:[2,75],57:[2,75],66:[2,75],67:[2,75],68:[2,75],69:[2,75],71:[2,75],73:[2,75],74:[2,75],78:[2,75],84:[2,75],85:[2,75],86:[2,75],91:[2,75],93:[2,75],102:[2,75],104:[2,75],105:[2,75],106:[2,75],110:[2,75],118:[2,75],126:[2,75],128:[2,75],129:[2,75],132:[2,75],133:[2,75],134:[2,75],135:[2,75],136:[2,75],137:[2,75]},{1:[2,76],6:[2,76],25:[2,76],26:[2,76],49:[2,76],54:[2,76],57:[2,76],66:[2,76],67:[2,76],68:[2,76],69:[2,76],71:[2,76],73:[2,76],74:[2,76],78:[2,76],84:[2,76],85:[2,76],86:[2,76],91:[2,76],93:[2,76],102:[2,76],104:[2,76],105:[2,76],106:[2,76],110:[2,76],118:[2,76],126:[2,76],128:[2,76],129:[2,76],132:[2,76],133:[2,76],134:[2,76],135:[2,76],136:[2,76],137:[2,76]},{1:[2,77],6:[2,77],25:[2,77],26:[2,77],49:[2,77],54:[2,77],57:[2,77],66:[2,77],67:[2,77],68:[2,77],69:[2,77],71:[2,77],73:[2,77],74:[2,77],78:[2,77],84:[2,77],85:[2,77],86:[2,77],91:[2,77],93:[2,77],102:[2,77],104:[2,77],105:[2,77],106:[2,77],110:[2,77],118:[2,77],126:[2,77],128:[2,77],129:[2,77],132:[2,77],133:[2,77],134:[2,77],135:[2,77],136:[2,77],137:[2,77]},{1:[2,78],6:[2,78],25:[2,78],26:[2,78],49:[2,78],54:[2,78],57:[2,78],66:[2,78],67:[2,78],68:[2,78],69:[2,78],71:[2,78],73:[2,78],74:[2,78],78:[2,78],84:[2,78],85:[2,78],86:[2,78],91:[2,78],93:[2,78],102:[2,78],104:[2,78],105:[2,78],106:[2,78],110:[2,78],118:[2,78],126:[2,78],128:[2,78],129:[2,78],132:[2,78],133:[2,78],134:[2,78],135:[2,78],136:[2,78],137:[2,78]},{1:[2,79],6:[2,79],25:[2,79],26:[2,79],49:[2,79],54:[2,79],57:[2,79],66:[2,79],67:[2,79],68:[2,79],69:[2,79],71:[2,79],73:[2,79],74:[2,79],78:[2,79],84:[2,79],85:[2,79],86:[2,79],91:[2,79],93:[2,79],102:[2,79],104:[2,79],105:[2,79],106:[2,79],110:[2,79],118:[2,79],126:[2,79],128:[2,79],129:[2,79],132:[2,79],133:[2,79],134:[2,79],135:[2,79],136:[2,79],137:[2,79]},{1:[2,106],6:[2,106],25:[2,106],26:[2,106],49:[2,106],54:[2,106],57:[2,106],66:[2,106],67:[2,106],68:[2,106],69:[2,106],71:[2,106],73:[2,106],74:[2,106],78:[2,106],82:105,84:[2,106],85:[1,106],86:[2,106],91:[2,106],93:[2,106],102:[2,106],104:[2,106],105:[2,106],106:[2,106],110:[2,106],118:[2,106],126:[2,106],128:[2,106],129:[2,106],132:[2,106],133:[2,106],134:[2,106],135:[2,106],136:[2,106],137:[2,106]},{6:[2,55],25:[2,55],27:110,28:[1,73],44:111,48:107,49:[2,55],54:[2,55],55:108,56:109,58:112,59:113,76:[1,70],89:[1,114],90:[1,115]},{5:116,25:[1,5]},{8:117,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:119,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:120,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{13:122,14:123,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:124,44:63,58:47,59:48,61:121,63:25,64:26,65:27,76:[1,70],83:[1,28],88:[1,58],89:[1,59],90:[1,57],101:[1,56]},{13:122,14:123,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:124,44:63,58:47,59:48,61:125,63:25,64:26,65:27,76:[1,70],83:[1,28],88:[1,58],89:[1,59],90:[1,57],101:[1,56]},{1:[2,72],6:[2,72],25:[2,72],26:[2,72],40:[2,72],49:[2,72],54:[2,72],57:[2,72],66:[2,72],67:[2,72],68:[2,72],69:[2,72],71:[2,72],73:[2,72],74:[2,72],78:[2,72],80:[1,129],84:[2,72],85:[2,72],86:[2,72],91:[2,72],93:[2,72],102:[2,72],104:[2,72],105:[2,72],106:[2,72],110:[2,72],118:[2,72],126:[2,72],128:[2,72],129:[2,72],130:[1,126],131:[1,127],132:[2,72],133:[2,72],134:[2,72],135:[2,72],136:[2,72],137:[2,72],138:[1,128]},{1:[2,183],6:[2,183],25:[2,183],26:[2,183],49:[2,183],54:[2,183],57:[2,183],73:[2,183],78:[2,183],86:[2,183],91:[2,183],93:[2,183],102:[2,183],104:[2,183],105:[2,183],106:[2,183],110:[2,183],118:[2,183],121:[1,130],126:[2,183],128:[2,183],129:[2,183],132:[2,183],133:[2,183],134:[2,183],135:[2,183],136:[2,183],137:[2,183]},{5:131,25:[1,5]},{5:132,25:[1,5]},{1:[2,150],6:[2,150],25:[2,150],26:[2,150],49:[2,150],54:[2,150],57:[2,150],73:[2,150],78:[2,150],86:[2,150],91:[2,150],93:[2,150],102:[2,150],104:[2,150],105:[2,150],106:[2,150],110:[2,150],118:[2,150],126:[2,150],128:[2,150],129:[2,150],132:[2,150],133:[2,150],134:[2,150],135:[2,150],136:[2,150],137:[2,150]},{5:133,25:[1,5]},{8:134,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,135],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,96],5:136,6:[2,96],13:122,14:123,25:[1,5],26:[2,96],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:124,44:63,49:[2,96],54:[2,96],57:[2,96],58:47,59:48,61:138,63:25,64:26,65:27,73:[2,96],76:[1,70],78:[2,96],80:[1,137],83:[1,28],86:[2,96],88:[1,58],89:[1,59],90:[1,57],91:[2,96],93:[2,96],101:[1,56],102:[2,96],104:[2,96],105:[2,96],106:[2,96],110:[2,96],118:[2,96],126:[2,96],128:[2,96],129:[2,96],132:[2,96],133:[2,96],134:[2,96],135:[2,96],136:[2,96],137:[2,96]},{8:139,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,47],6:[2,47],8:140,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,26:[2,47],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],102:[2,47],103:39,104:[2,47],106:[2,47],107:40,108:[1,67],109:41,110:[2,47],111:69,119:[1,42],124:37,125:[1,64],126:[2,47],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,48],6:[2,48],25:[2,48],26:[2,48],54:[2,48],78:[2,48],102:[2,48],104:[2,48],106:[2,48],110:[2,48],126:[2,48]},{1:[2,73],6:[2,73],25:[2,73],26:[2,73],40:[2,73],49:[2,73],54:[2,73],57:[2,73],66:[2,73],67:[2,73],68:[2,73],69:[2,73],71:[2,73],73:[2,73],74:[2,73],78:[2,73],84:[2,73],85:[2,73],86:[2,73],91:[2,73],93:[2,73],102:[2,73],104:[2,73],105:[2,73],106:[2,73],110:[2,73],118:[2,73],126:[2,73],128:[2,73],129:[2,73],132:[2,73],133:[2,73],134:[2,73],135:[2,73],136:[2,73],137:[2,73]},{1:[2,74],6:[2,74],25:[2,74],26:[2,74],40:[2,74],49:[2,74],54:[2,74],57:[2,74],66:[2,74],67:[2,74],68:[2,74],69:[2,74],71:[2,74],73:[2,74],74:[2,74],78:[2,74],84:[2,74],85:[2,74],86:[2,74],91:[2,74],93:[2,74],102:[2,74],104:[2,74],105:[2,74],106:[2,74],110:[2,74],118:[2,74],126:[2,74],128:[2,74],129:[2,74],132:[2,74],133:[2,74],134:[2,74],135:[2,74],136:[2,74],137:[2,74]},{1:[2,29],6:[2,29],25:[2,29],26:[2,29],49:[2,29],54:[2,29],57:[2,29],66:[2,29],67:[2,29],68:[2,29],69:[2,29],71:[2,29],73:[2,29],74:[2,29],78:[2,29],84:[2,29],85:[2,29],86:[2,29],91:[2,29],93:[2,29],102:[2,29],104:[2,29],105:[2,29],106:[2,29],110:[2,29],118:[2,29],126:[2,29],128:[2,29],129:[2,29],132:[2,29],133:[2,29],134:[2,29],135:[2,29],136:[2,29],137:[2,29]},{1:[2,30],6:[2,30],25:[2,30],26:[2,30],49:[2,30],54:[2,30],57:[2,30],66:[2,30],67:[2,30],68:[2,30],69:[2,30],71:[2,30],73:[2,30],74:[2,30],78:[2,30],84:[2,30],85:[2,30],86:[2,30],91:[2,30],93:[2,30],102:[2,30],104:[2,30],105:[2,30],106:[2,30],110:[2,30],118:[2,30],126:[2,30],128:[2,30],129:[2,30],132:[2,30],133:[2,30],134:[2,30],135:[2,30],136:[2,30],137:[2,30]},{1:[2,31],6:[2,31],25:[2,31],26:[2,31],49:[2,31],54:[2,31],57:[2,31],66:[2,31],67:[2,31],68:[2,31],69:[2,31],71:[2,31],73:[2,31],74:[2,31],78:[2,31],84:[2,31],85:[2,31],86:[2,31],91:[2,31],93:[2,31],102:[2,31],104:[2,31],105:[2,31],106:[2,31],110:[2,31],118:[2,31],126:[2,31],128:[2,31],129:[2,31],132:[2,31],133:[2,31],134:[2,31],135:[2,31],136:[2,31],137:[2,31]},{1:[2,32],6:[2,32],25:[2,32],26:[2,32],49:[2,32],54:[2,32],57:[2,32],66:[2,32],67:[2,32],68:[2,32],69:[2,32],71:[2,32],73:[2,32],74:[2,32],78:[2,32],84:[2,32],85:[2,32],86:[2,32],91:[2,32],93:[2,32],102:[2,32],104:[2,32],105:[2,32],106:[2,32],110:[2,32],118:[2,32],126:[2,32],128:[2,32],129:[2,32],132:[2,32],133:[2,32],134:[2,32],135:[2,32],136:[2,32],137:[2,32]},{1:[2,33],6:[2,33],25:[2,33],26:[2,33],49:[2,33],54:[2,33],57:[2,33],66:[2,33],67:[2,33],68:[2,33],69:[2,33],71:[2,33],73:[2,33],74:[2,33],78:[2,33],84:[2,33],85:[2,33],86:[2,33],91:[2,33],93:[2,33],102:[2,33],104:[2,33],105:[2,33],106:[2,33],110:[2,33],118:[2,33],126:[2,33],128:[2,33],129:[2,33],132:[2,33],133:[2,33],134:[2,33],135:[2,33],136:[2,33],137:[2,33]},{1:[2,34],6:[2,34],25:[2,34],26:[2,34],49:[2,34],54:[2,34],57:[2,34],66:[2,34],67:[2,34],68:[2,34],69:[2,34],71:[2,34],73:[2,34],74:[2,34],78:[2,34],84:[2,34],85:[2,34],86:[2,34],91:[2,34],93:[2,34],102:[2,34],104:[2,34],105:[2,34],106:[2,34],110:[2,34],118:[2,34],126:[2,34],128:[2,34],129:[2,34],132:[2,34],133:[2,34],134:[2,34],135:[2,34],136:[2,34],137:[2,34]},{1:[2,35],6:[2,35],25:[2,35],26:[2,35],49:[2,35],54:[2,35],57:[2,35],66:[2,35],67:[2,35],68:[2,35],69:[2,35],71:[2,35],73:[2,35],74:[2,35],78:[2,35],84:[2,35],85:[2,35],86:[2,35],91:[2,35],93:[2,35],102:[2,35],104:[2,35],105:[2,35],106:[2,35],110:[2,35],118:[2,35],126:[2,35],128:[2,35],129:[2,35],132:[2,35],133:[2,35],134:[2,35],135:[2,35],136:[2,35],137:[2,35]},{4:141,7:4,8:6,9:7,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,142],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:143,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,147],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],87:145,88:[1,58],89:[1,59],90:[1,57],91:[1,144],94:146,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,112],6:[2,112],25:[2,112],26:[2,112],49:[2,112],54:[2,112],57:[2,112],66:[2,112],67:[2,112],68:[2,112],69:[2,112],71:[2,112],73:[2,112],74:[2,112],78:[2,112],84:[2,112],85:[2,112],86:[2,112],91:[2,112],93:[2,112],102:[2,112],104:[2,112],105:[2,112],106:[2,112],110:[2,112],118:[2,112],126:[2,112],128:[2,112],129:[2,112],132:[2,112],133:[2,112],134:[2,112],135:[2,112],136:[2,112],137:[2,112]},{1:[2,113],6:[2,113],25:[2,113],26:[2,113],27:149,28:[1,73],49:[2,113],54:[2,113],57:[2,113],66:[2,113],67:[2,113],68:[2,113],69:[2,113],71:[2,113],73:[2,113],74:[2,113],78:[2,113],84:[2,113],85:[2,113],86:[2,113],91:[2,113],93:[2,113],102:[2,113],104:[2,113],105:[2,113],106:[2,113],110:[2,113],118:[2,113],126:[2,113],128:[2,113],129:[2,113],132:[2,113],133:[2,113],134:[2,113],135:[2,113],136:[2,113],137:[2,113]},{25:[2,51]},{25:[2,52]},{1:[2,68],6:[2,68],25:[2,68],26:[2,68],40:[2,68],49:[2,68],54:[2,68],57:[2,68],66:[2,68],67:[2,68],68:[2,68],69:[2,68],71:[2,68],73:[2,68],74:[2,68],78:[2,68],80:[2,68],84:[2,68],85:[2,68],86:[2,68],91:[2,68],93:[2,68],102:[2,68],104:[2,68],105:[2,68],106:[2,68],110:[2,68],118:[2,68],126:[2,68],128:[2,68],129:[2,68],130:[2,68],131:[2,68],132:[2,68],133:[2,68],134:[2,68],135:[2,68],136:[2,68],137:[2,68],138:[2,68]},{1:[2,71],6:[2,71],25:[2,71],26:[2,71],40:[2,71],49:[2,71],54:[2,71],57:[2,71],66:[2,71],67:[2,71],68:[2,71],69:[2,71],71:[2,71],73:[2,71],74:[2,71],78:[2,71],80:[2,71],84:[2,71],85:[2,71],86:[2,71],91:[2,71],93:[2,71],102:[2,71],104:[2,71],105:[2,71],106:[2,71],110:[2,71],118:[2,71],126:[2,71],128:[2,71],129:[2,71],130:[2,71],131:[2,71],132:[2,71],133:[2,71],134:[2,71],135:[2,71],136:[2,71],137:[2,71],138:[2,71]},{8:150,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:151,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:152,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{5:153,8:154,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,5],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{27:159,28:[1,73],44:160,58:161,59:162,64:155,76:[1,70],89:[1,114],90:[1,57],113:156,114:[1,157],115:158},{112:163,116:[1,164],117:[1,165]},{6:[2,91],11:169,25:[2,91],27:170,28:[1,73],29:171,30:[1,71],31:[1,72],41:167,42:168,44:172,46:[1,46],54:[2,91],77:166,78:[2,91],89:[1,114]},{1:[2,27],6:[2,27],25:[2,27],26:[2,27],43:[2,27],49:[2,27],54:[2,27],57:[2,27],66:[2,27],67:[2,27],68:[2,27],69:[2,27],71:[2,27],73:[2,27],74:[2,27],78:[2,27],84:[2,27],85:[2,27],86:[2,27],91:[2,27],93:[2,27],102:[2,27],104:[2,27],105:[2,27],106:[2,27],110:[2,27],118:[2,27],126:[2,27],128:[2,27],129:[2,27],132:[2,27],133:[2,27],134:[2,27],135:[2,27],136:[2,27],137:[2,27]},{1:[2,28],6:[2,28],25:[2,28],26:[2,28],43:[2,28],49:[2,28],54:[2,28],57:[2,28],66:[2,28],67:[2,28],68:[2,28],69:[2,28],71:[2,28],73:[2,28],74:[2,28],78:[2,28],84:[2,28],85:[2,28],86:[2,28],91:[2,28],93:[2,28],102:[2,28],104:[2,28],105:[2,28],106:[2,28],110:[2,28],118:[2,28],126:[2,28],128:[2,28],129:[2,28],132:[2,28],133:[2,28],134:[2,28],135:[2,28],136:[2,28],137:[2,28]},{1:[2,26],6:[2,26],25:[2,26],26:[2,26],40:[2,26],43:[2,26],49:[2,26],54:[2,26],57:[2,26],66:[2,26],67:[2,26],68:[2,26],69:[2,26],71:[2,26],73:[2,26],74:[2,26],78:[2,26],80:[2,26],84:[2,26],85:[2,26],86:[2,26],91:[2,26],93:[2,26],102:[2,26],104:[2,26],105:[2,26],106:[2,26],110:[2,26],116:[2,26],117:[2,26],118:[2,26],126:[2,26],128:[2,26],129:[2,26],130:[2,26],131:[2,26],132:[2,26],133:[2,26],134:[2,26],135:[2,26],136:[2,26],137:[2,26],138:[2,26]},{1:[2,6],6:[2,6],7:173,8:6,9:7,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,26:[2,6],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],102:[2,6],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,3]},{1:[2,24],6:[2,24],25:[2,24],26:[2,24],49:[2,24],54:[2,24],57:[2,24],73:[2,24],78:[2,24],86:[2,24],91:[2,24],93:[2,24],98:[2,24],99:[2,24],102:[2,24],104:[2,24],105:[2,24],106:[2,24],110:[2,24],118:[2,24],121:[2,24],123:[2,24],126:[2,24],128:[2,24],129:[2,24],132:[2,24],133:[2,24],134:[2,24],135:[2,24],136:[2,24],137:[2,24]},{6:[1,74],26:[1,174]},{1:[2,194],6:[2,194],25:[2,194],26:[2,194],49:[2,194],54:[2,194],57:[2,194],73:[2,194],78:[2,194],86:[2,194],91:[2,194],93:[2,194],102:[2,194],104:[2,194],105:[2,194],106:[2,194],110:[2,194],118:[2,194],126:[2,194],128:[2,194],129:[2,194],132:[2,194],133:[2,194],134:[2,194],135:[2,194],136:[2,194],137:[2,194]},{8:175,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:176,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:177,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:178,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:179,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:180,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:181,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:182,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,149],6:[2,149],25:[2,149],26:[2,149],49:[2,149],54:[2,149],57:[2,149],73:[2,149],78:[2,149],86:[2,149],91:[2,149],93:[2,149],102:[2,149],104:[2,149],105:[2,149],106:[2,149],110:[2,149],118:[2,149],126:[2,149],128:[2,149],129:[2,149],132:[2,149],133:[2,149],134:[2,149],135:[2,149],136:[2,149],137:[2,149]},{1:[2,154],6:[2,154],25:[2,154],26:[2,154],49:[2,154],54:[2,154],57:[2,154],73:[2,154],78:[2,154],86:[2,154],91:[2,154],93:[2,154],102:[2,154],104:[2,154],105:[2,154],106:[2,154],110:[2,154],118:[2,154],126:[2,154],128:[2,154],129:[2,154],132:[2,154],133:[2,154],134:[2,154],135:[2,154],136:[2,154],137:[2,154]},{8:183,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,148],6:[2,148],25:[2,148],26:[2,148],49:[2,148],54:[2,148],57:[2,148],73:[2,148],78:[2,148],86:[2,148],91:[2,148],93:[2,148],102:[2,148],104:[2,148],105:[2,148],106:[2,148],110:[2,148],118:[2,148],126:[2,148],128:[2,148],129:[2,148],132:[2,148],133:[2,148],134:[2,148],135:[2,148],136:[2,148],137:[2,148]},{1:[2,153],6:[2,153],25:[2,153],26:[2,153],49:[2,153],54:[2,153],57:[2,153],73:[2,153],78:[2,153],86:[2,153],91:[2,153],93:[2,153],102:[2,153],104:[2,153],105:[2,153],106:[2,153],110:[2,153],118:[2,153],126:[2,153],128:[2,153],129:[2,153],132:[2,153],133:[2,153],134:[2,153],135:[2,153],136:[2,153],137:[2,153]},{82:184,85:[1,106]},{1:[2,69],6:[2,69],25:[2,69],26:[2,69],40:[2,69],49:[2,69],54:[2,69],57:[2,69],66:[2,69],67:[2,69],68:[2,69],69:[2,69],71:[2,69],73:[2,69],74:[2,69],78:[2,69],80:[2,69],84:[2,69],85:[2,69],86:[2,69],91:[2,69],93:[2,69],102:[2,69],104:[2,69],105:[2,69],106:[2,69],110:[2,69],118:[2,69],126:[2,69],128:[2,69],129:[2,69],130:[2,69],131:[2,69],132:[2,69],133:[2,69],134:[2,69],135:[2,69],136:[2,69],137:[2,69],138:[2,69]},{85:[2,109]},{27:185,28:[1,73]},{27:186,28:[1,73]},{1:[2,84],6:[2,84],25:[2,84],26:[2,84],27:187,28:[1,73],40:[2,84],49:[2,84],54:[2,84],57:[2,84],66:[2,84],67:[2,84],68:[2,84],69:[2,84],71:[2,84],73:[2,84],74:[2,84],78:[2,84],80:[2,84],84:[2,84],85:[2,84],86:[2,84],91:[2,84],93:[2,84],102:[2,84],104:[2,84],105:[2,84],106:[2,84],110:[2,84],118:[2,84],126:[2,84],128:[2,84],129:[2,84],130:[2,84],131:[2,84],132:[2,84],133:[2,84],134:[2,84],135:[2,84],136:[2,84],137:[2,84],138:[2,84]},{27:188,28:[1,73]},{1:[2,85],6:[2,85],25:[2,85],26:[2,85],40:[2,85],49:[2,85],54:[2,85],57:[2,85],66:[2,85],67:[2,85],68:[2,85],69:[2,85],71:[2,85],73:[2,85],74:[2,85],78:[2,85],80:[2,85],84:[2,85],85:[2,85],86:[2,85],91:[2,85],93:[2,85],102:[2,85],104:[2,85],105:[2,85],106:[2,85],110:[2,85],118:[2,85],126:[2,85],128:[2,85],129:[2,85],130:[2,85],131:[2,85],132:[2,85],133:[2,85],134:[2,85],135:[2,85],136:[2,85],137:[2,85],138:[2,85]},{8:190,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],57:[1,194],58:47,59:48,61:36,63:25,64:26,65:27,72:189,75:191,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],92:192,93:[1,193],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{70:195,71:[1,100],74:[1,101]},{82:196,85:[1,106]},{1:[2,70],6:[2,70],25:[2,70],26:[2,70],40:[2,70],49:[2,70],54:[2,70],57:[2,70],66:[2,70],67:[2,70],68:[2,70],69:[2,70],71:[2,70],73:[2,70],74:[2,70],78:[2,70],80:[2,70],84:[2,70],85:[2,70],86:[2,70],91:[2,70],93:[2,70],102:[2,70],104:[2,70],105:[2,70],106:[2,70],110:[2,70],118:[2,70],126:[2,70],128:[2,70],129:[2,70],130:[2,70],131:[2,70],132:[2,70],133:[2,70],134:[2,70],135:[2,70],136:[2,70],137:[2,70],138:[2,70]},{6:[1,198],8:197,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,199],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,107],6:[2,107],25:[2,107],26:[2,107],49:[2,107],54:[2,107],57:[2,107],66:[2,107],67:[2,107],68:[2,107],69:[2,107],71:[2,107],73:[2,107],74:[2,107],78:[2,107],84:[2,107],85:[2,107],86:[2,107],91:[2,107],93:[2,107],102:[2,107],104:[2,107],105:[2,107],106:[2,107],110:[2,107],118:[2,107],126:[2,107],128:[2,107],129:[2,107],132:[2,107],133:[2,107],134:[2,107],135:[2,107],136:[2,107],137:[2,107]},{8:202,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,147],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],86:[1,200],87:201,88:[1,58],89:[1,59],90:[1,57],94:146,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,53],25:[2,53],49:[1,203],53:205,54:[1,204]},{6:[2,56],25:[2,56],26:[2,56],49:[2,56],54:[2,56]},{6:[2,60],25:[2,60],26:[2,60],40:[1,207],49:[2,60],54:[2,60],57:[1,206]},{6:[2,63],25:[2,63],26:[2,63],40:[2,63],49:[2,63],54:[2,63],57:[2,63]},{6:[2,64],25:[2,64],26:[2,64],40:[2,64],49:[2,64],54:[2,64],57:[2,64]},{6:[2,65],25:[2,65],26:[2,65],40:[2,65],49:[2,65],54:[2,65],57:[2,65]},{6:[2,66],25:[2,66],26:[2,66],40:[2,66],49:[2,66],54:[2,66],57:[2,66]},{27:149,28:[1,73]},{8:202,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,147],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],87:145,88:[1,58],89:[1,59],90:[1,57],91:[1,144],94:146,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,50],6:[2,50],25:[2,50],26:[2,50],49:[2,50],54:[2,50],57:[2,50],73:[2,50],78:[2,50],86:[2,50],91:[2,50],93:[2,50],102:[2,50],104:[2,50],105:[2,50],106:[2,50],110:[2,50],118:[2,50],126:[2,50],128:[2,50],129:[2,50],132:[2,50],133:[2,50],134:[2,50],135:[2,50],136:[2,50],137:[2,50]},{1:[2,187],6:[2,187],25:[2,187],26:[2,187],49:[2,187],54:[2,187],57:[2,187],73:[2,187],78:[2,187],86:[2,187],91:[2,187],93:[2,187],102:[2,187],103:87,104:[2,187],105:[2,187],106:[2,187],109:88,110:[2,187],111:69,118:[2,187],126:[2,187],128:[2,187],129:[2,187],132:[1,78],133:[2,187],134:[2,187],135:[2,187],136:[2,187],137:[2,187]},{103:90,104:[1,65],106:[1,66],109:91,110:[1,68],111:69,126:[1,89]},{1:[2,188],6:[2,188],25:[2,188],26:[2,188],49:[2,188],54:[2,188],57:[2,188],73:[2,188],78:[2,188],86:[2,188],91:[2,188],93:[2,188],102:[2,188],103:87,104:[2,188],105:[2,188],106:[2,188],109:88,110:[2,188],111:69,118:[2,188],126:[2,188],128:[2,188],129:[2,188],132:[1,78],133:[2,188],134:[2,188],135:[2,188],136:[2,188],137:[2,188]},{1:[2,189],6:[2,189],25:[2,189],26:[2,189],49:[2,189],54:[2,189],57:[2,189],73:[2,189],78:[2,189],86:[2,189],91:[2,189],93:[2,189],102:[2,189],103:87,104:[2,189],105:[2,189],106:[2,189],109:88,110:[2,189],111:69,118:[2,189],126:[2,189],128:[2,189],129:[2,189],132:[1,78],133:[2,189],134:[2,189],135:[2,189],136:[2,189],137:[2,189]},{1:[2,190],6:[2,190],25:[2,190],26:[2,190],49:[2,190],54:[2,190],57:[2,190],66:[2,72],67:[2,72],68:[2,72],69:[2,72],71:[2,72],73:[2,190],74:[2,72],78:[2,190],84:[2,72],85:[2,72],86:[2,190],91:[2,190],93:[2,190],102:[2,190],104:[2,190],105:[2,190],106:[2,190],110:[2,190],118:[2,190],126:[2,190],128:[2,190],129:[2,190],132:[2,190],133:[2,190],134:[2,190],135:[2,190],136:[2,190],137:[2,190]},{62:93,66:[1,95],67:[1,96],68:[1,97],69:[1,98],70:99,71:[1,100],74:[1,101],81:92,84:[1,94],85:[2,108]},{62:103,66:[1,95],67:[1,96],68:[1,97],69:[1,98],70:99,71:[1,100],74:[1,101],81:102,84:[1,94],85:[2,108]},{66:[2,75],67:[2,75],68:[2,75],69:[2,75],71:[2,75],74:[2,75],84:[2,75],85:[2,75]},{1:[2,191],6:[2,191],25:[2,191],26:[2,191],49:[2,191],54:[2,191],57:[2,191],66:[2,72],67:[2,72],68:[2,72],69:[2,72],71:[2,72],73:[2,191],74:[2,72],78:[2,191],84:[2,72],85:[2,72],86:[2,191],91:[2,191],93:[2,191],102:[2,191],104:[2,191],105:[2,191],106:[2,191],110:[2,191],118:[2,191],126:[2,191],128:[2,191],129:[2,191],132:[2,191],133:[2,191],134:[2,191],135:[2,191],136:[2,191],137:[2,191]},{1:[2,192],6:[2,192],25:[2,192],26:[2,192],49:[2,192],54:[2,192],57:[2,192],73:[2,192],78:[2,192],86:[2,192],91:[2,192],93:[2,192],102:[2,192],104:[2,192],105:[2,192],106:[2,192],110:[2,192],118:[2,192],126:[2,192],128:[2,192],129:[2,192],132:[2,192],133:[2,192],134:[2,192],135:[2,192],136:[2,192],137:[2,192]},{1:[2,193],6:[2,193],25:[2,193],26:[2,193],49:[2,193],54:[2,193],57:[2,193],73:[2,193],78:[2,193],86:[2,193],91:[2,193],93:[2,193],102:[2,193],104:[2,193],105:[2,193],106:[2,193],110:[2,193],118:[2,193],126:[2,193],128:[2,193],129:[2,193],132:[2,193],133:[2,193],134:[2,193],135:[2,193],136:[2,193],137:[2,193]},{6:[1,210],8:208,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,209],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:211,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{5:212,25:[1,5],125:[1,213]},{1:[2,133],6:[2,133],25:[2,133],26:[2,133],49:[2,133],54:[2,133],57:[2,133],73:[2,133],78:[2,133],86:[2,133],91:[2,133],93:[2,133],97:214,98:[1,215],99:[1,216],102:[2,133],104:[2,133],105:[2,133],106:[2,133],110:[2,133],118:[2,133],126:[2,133],128:[2,133],129:[2,133],132:[2,133],133:[2,133],134:[2,133],135:[2,133],136:[2,133],137:[2,133]},{1:[2,147],6:[2,147],25:[2,147],26:[2,147],49:[2,147],54:[2,147],57:[2,147],73:[2,147],78:[2,147],86:[2,147],91:[2,147],93:[2,147],102:[2,147],104:[2,147],105:[2,147],106:[2,147],110:[2,147],118:[2,147],126:[2,147],128:[2,147],129:[2,147],132:[2,147],133:[2,147],134:[2,147],135:[2,147],136:[2,147],137:[2,147]},{1:[2,155],6:[2,155],25:[2,155],26:[2,155],49:[2,155],54:[2,155],57:[2,155],73:[2,155],78:[2,155],86:[2,155],91:[2,155],93:[2,155],102:[2,155],104:[2,155],105:[2,155],106:[2,155],110:[2,155],118:[2,155],126:[2,155],128:[2,155],129:[2,155],132:[2,155],133:[2,155],134:[2,155],135:[2,155],136:[2,155],137:[2,155]},{25:[1,217],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{120:218,122:219,123:[1,220]},{1:[2,97],6:[2,97],25:[2,97],26:[2,97],49:[2,97],54:[2,97],57:[2,97],73:[2,97],78:[2,97],86:[2,97],91:[2,97],93:[2,97],102:[2,97],104:[2,97],105:[2,97],106:[2,97],110:[2,97],118:[2,97],126:[2,97],128:[2,97],129:[2,97],132:[2,97],133:[2,97],134:[2,97],135:[2,97],136:[2,97],137:[2,97]},{8:221,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,100],5:222,6:[2,100],25:[1,5],26:[2,100],49:[2,100],54:[2,100],57:[2,100],66:[2,72],67:[2,72],68:[2,72],69:[2,72],71:[2,72],73:[2,100],74:[2,72],78:[2,100],80:[1,223],84:[2,72],85:[2,72],86:[2,100],91:[2,100],93:[2,100],102:[2,100],104:[2,100],105:[2,100],106:[2,100],110:[2,100],118:[2,100],126:[2,100],128:[2,100],129:[2,100],132:[2,100],133:[2,100],134:[2,100],135:[2,100],136:[2,100],137:[2,100]},{1:[2,140],6:[2,140],25:[2,140],26:[2,140],49:[2,140],54:[2,140],57:[2,140],73:[2,140],78:[2,140],86:[2,140],91:[2,140],93:[2,140],102:[2,140],103:87,104:[2,140],105:[2,140],106:[2,140],109:88,110:[2,140],111:69,118:[2,140],126:[2,140],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,46],6:[2,46],26:[2,46],102:[2,46],103:87,104:[2,46],106:[2,46],109:88,110:[2,46],111:69,126:[2,46],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[1,74],102:[1,224]},{4:225,7:4,8:6,9:7,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,129],25:[2,129],54:[2,129],57:[1,227],91:[2,129],92:226,93:[1,193],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,115],6:[2,115],25:[2,115],26:[2,115],40:[2,115],49:[2,115],54:[2,115],57:[2,115],66:[2,115],67:[2,115],68:[2,115],69:[2,115],71:[2,115],73:[2,115],74:[2,115],78:[2,115],84:[2,115],85:[2,115],86:[2,115],91:[2,115],93:[2,115],102:[2,115],104:[2,115],105:[2,115],106:[2,115],110:[2,115],116:[2,115],117:[2,115],118:[2,115],126:[2,115],128:[2,115],129:[2,115],132:[2,115],133:[2,115],134:[2,115],135:[2,115],136:[2,115],137:[2,115]},{6:[2,53],25:[2,53],53:228,54:[1,229],91:[2,53]},{6:[2,124],25:[2,124],26:[2,124],54:[2,124],86:[2,124],91:[2,124]},{8:202,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,147],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],87:230,88:[1,58],89:[1,59],90:[1,57],94:146,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,130],25:[2,130],26:[2,130],54:[2,130],86:[2,130],91:[2,130]},{1:[2,114],6:[2,114],25:[2,114],26:[2,114],40:[2,114],43:[2,114],49:[2,114],54:[2,114],57:[2,114],66:[2,114],67:[2,114],68:[2,114],69:[2,114],71:[2,114],73:[2,114],74:[2,114],78:[2,114],80:[2,114],84:[2,114],85:[2,114],86:[2,114],91:[2,114],93:[2,114],102:[2,114],104:[2,114],105:[2,114],106:[2,114],110:[2,114],116:[2,114],117:[2,114],118:[2,114],126:[2,114],128:[2,114],129:[2,114],130:[2,114],131:[2,114],132:[2,114],133:[2,114],134:[2,114],135:[2,114],136:[2,114],137:[2,114],138:[2,114]},{5:231,25:[1,5],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,143],6:[2,143],25:[2,143],26:[2,143],49:[2,143],54:[2,143],57:[2,143],73:[2,143],78:[2,143],86:[2,143],91:[2,143],93:[2,143],102:[2,143],103:87,104:[1,65],105:[1,232],106:[1,66],109:88,110:[1,68],111:69,118:[2,143],126:[2,143],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,145],6:[2,145],25:[2,145],26:[2,145],49:[2,145],54:[2,145],57:[2,145],73:[2,145],78:[2,145],86:[2,145],91:[2,145],93:[2,145],102:[2,145],103:87,104:[1,65],105:[1,233],106:[1,66],109:88,110:[1,68],111:69,118:[2,145],126:[2,145],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,151],6:[2,151],25:[2,151],26:[2,151],49:[2,151],54:[2,151],57:[2,151],73:[2,151],78:[2,151],86:[2,151],91:[2,151],93:[2,151],102:[2,151],104:[2,151],105:[2,151],106:[2,151],110:[2,151],118:[2,151],126:[2,151],128:[2,151],129:[2,151],132:[2,151],133:[2,151],134:[2,151],135:[2,151],136:[2,151],137:[2,151]},{1:[2,152],6:[2,152],25:[2,152],26:[2,152],49:[2,152],54:[2,152],57:[2,152],73:[2,152],78:[2,152],86:[2,152],91:[2,152],93:[2,152],102:[2,152],103:87,104:[1,65],105:[2,152],106:[1,66],109:88,110:[1,68],111:69,118:[2,152],126:[2,152],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,156],6:[2,156],25:[2,156],26:[2,156],49:[2,156],54:[2,156],57:[2,156],73:[2,156],78:[2,156],86:[2,156],91:[2,156],93:[2,156],102:[2,156],104:[2,156],105:[2,156],106:[2,156],110:[2,156],118:[2,156],126:[2,156],128:[2,156],129:[2,156],132:[2,156],133:[2,156],134:[2,156],135:[2,156],136:[2,156],137:[2,156]},{116:[2,158],117:[2,158]},{27:159,28:[1,73],44:160,58:161,59:162,76:[1,70],89:[1,114],90:[1,115],113:234,115:158},{54:[1,235],116:[2,164],117:[2,164]},{54:[2,160],116:[2,160],117:[2,160]},{54:[2,161],116:[2,161],117:[2,161]},{54:[2,162],116:[2,162],117:[2,162]},{54:[2,163],116:[2,163],117:[2,163]},{1:[2,157],6:[2,157],25:[2,157],26:[2,157],49:[2,157],54:[2,157],57:[2,157],73:[2,157],78:[2,157],86:[2,157],91:[2,157],93:[2,157],102:[2,157],104:[2,157],105:[2,157],106:[2,157],110:[2,157],118:[2,157],126:[2,157],128:[2,157],129:[2,157],132:[2,157],133:[2,157],134:[2,157],135:[2,157],136:[2,157],137:[2,157]},{8:236,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:237,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,53],25:[2,53],53:238,54:[1,239],78:[2,53]},{6:[2,92],25:[2,92],26:[2,92],54:[2,92],78:[2,92]},{6:[2,39],25:[2,39],26:[2,39],43:[1,240],54:[2,39],78:[2,39]},{6:[2,42],25:[2,42],26:[2,42],54:[2,42],78:[2,42]},{6:[2,43],25:[2,43],26:[2,43],43:[2,43],54:[2,43],78:[2,43]},{6:[2,44],25:[2,44],26:[2,44],43:[2,44],54:[2,44],78:[2,44]},{6:[2,45],25:[2,45],26:[2,45],43:[2,45],54:[2,45],78:[2,45]},{1:[2,5],6:[2,5],26:[2,5],102:[2,5]},{1:[2,25],6:[2,25],25:[2,25],26:[2,25],49:[2,25],54:[2,25],57:[2,25],73:[2,25],78:[2,25],86:[2,25],91:[2,25],93:[2,25],98:[2,25],99:[2,25],102:[2,25],104:[2,25],105:[2,25],106:[2,25],110:[2,25],118:[2,25],121:[2,25],123:[2,25],126:[2,25],128:[2,25],129:[2,25],132:[2,25],133:[2,25],134:[2,25],135:[2,25],136:[2,25],137:[2,25]},{1:[2,195],6:[2,195],25:[2,195],26:[2,195],49:[2,195],54:[2,195],57:[2,195],73:[2,195],78:[2,195],86:[2,195],91:[2,195],93:[2,195],102:[2,195],103:87,104:[2,195],105:[2,195],106:[2,195],109:88,110:[2,195],111:69,118:[2,195],126:[2,195],128:[2,195],129:[2,195],132:[1,78],133:[1,81],134:[2,195],135:[2,195],136:[2,195],137:[2,195]},{1:[2,196],6:[2,196],25:[2,196],26:[2,196],49:[2,196],54:[2,196],57:[2,196],73:[2,196],78:[2,196],86:[2,196],91:[2,196],93:[2,196],102:[2,196],103:87,104:[2,196],105:[2,196],106:[2,196],109:88,110:[2,196],111:69,118:[2,196],126:[2,196],128:[2,196],129:[2,196],132:[1,78],133:[1,81],134:[2,196],135:[2,196],136:[2,196],137:[2,196]},{1:[2,197],6:[2,197],25:[2,197],26:[2,197],49:[2,197],54:[2,197],57:[2,197],73:[2,197],78:[2,197],86:[2,197],91:[2,197],93:[2,197],102:[2,197],103:87,104:[2,197],105:[2,197],106:[2,197],109:88,110:[2,197],111:69,118:[2,197],126:[2,197],128:[2,197],129:[2,197],132:[1,78],133:[2,197],134:[2,197],135:[2,197],136:[2,197],137:[2,197]},{1:[2,198],6:[2,198],25:[2,198],26:[2,198],49:[2,198],54:[2,198],57:[2,198],73:[2,198],78:[2,198],86:[2,198],91:[2,198],93:[2,198],102:[2,198],103:87,104:[2,198],105:[2,198],106:[2,198],109:88,110:[2,198],111:69,118:[2,198],126:[2,198],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[2,198],135:[2,198],136:[2,198],137:[2,198]},{1:[2,199],6:[2,199],25:[2,199],26:[2,199],49:[2,199],54:[2,199],57:[2,199],73:[2,199],78:[2,199],86:[2,199],91:[2,199],93:[2,199],102:[2,199],103:87,104:[2,199],105:[2,199],106:[2,199],109:88,110:[2,199],111:69,118:[2,199],126:[2,199],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[2,199],136:[2,199],137:[1,85]},{1:[2,200],6:[2,200],25:[2,200],26:[2,200],49:[2,200],54:[2,200],57:[2,200],73:[2,200],78:[2,200],86:[2,200],91:[2,200],93:[2,200],102:[2,200],103:87,104:[2,200],105:[2,200],106:[2,200],109:88,110:[2,200],111:69,118:[2,200],126:[2,200],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[2,200],137:[1,85]},{1:[2,201],6:[2,201],25:[2,201],26:[2,201],49:[2,201],54:[2,201],57:[2,201],73:[2,201],78:[2,201],86:[2,201],91:[2,201],93:[2,201],102:[2,201],103:87,104:[2,201],105:[2,201],106:[2,201],109:88,110:[2,201],111:69,118:[2,201],126:[2,201],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[2,201],136:[2,201],137:[2,201]},{1:[2,186],6:[2,186],25:[2,186],26:[2,186],49:[2,186],54:[2,186],57:[2,186],73:[2,186],78:[2,186],86:[2,186],91:[2,186],93:[2,186],102:[2,186],103:87,104:[1,65],105:[2,186],106:[1,66],109:88,110:[1,68],111:69,118:[2,186],126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,185],6:[2,185],25:[2,185],26:[2,185],49:[2,185],54:[2,185],57:[2,185],73:[2,185],78:[2,185],86:[2,185],91:[2,185],93:[2,185],102:[2,185],103:87,104:[1,65],105:[2,185],106:[1,66],109:88,110:[1,68],111:69,118:[2,185],126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,104],6:[2,104],25:[2,104],26:[2,104],49:[2,104],54:[2,104],57:[2,104],66:[2,104],67:[2,104],68:[2,104],69:[2,104],71:[2,104],73:[2,104],74:[2,104],78:[2,104],84:[2,104],85:[2,104],86:[2,104],91:[2,104],93:[2,104],102:[2,104],104:[2,104],105:[2,104],106:[2,104],110:[2,104],118:[2,104],126:[2,104],128:[2,104],129:[2,104],132:[2,104],133:[2,104],134:[2,104],135:[2,104],136:[2,104],137:[2,104]},{1:[2,80],6:[2,80],25:[2,80],26:[2,80],40:[2,80],49:[2,80],54:[2,80],57:[2,80],66:[2,80],67:[2,80],68:[2,80],69:[2,80],71:[2,80],73:[2,80],74:[2,80],78:[2,80],80:[2,80],84:[2,80],85:[2,80],86:[2,80],91:[2,80],93:[2,80],102:[2,80],104:[2,80],105:[2,80],106:[2,80],110:[2,80],118:[2,80],126:[2,80],128:[2,80],129:[2,80],130:[2,80],131:[2,80],132:[2,80],133:[2,80],134:[2,80],135:[2,80],136:[2,80],137:[2,80],138:[2,80]},{1:[2,81],6:[2,81],25:[2,81],26:[2,81],40:[2,81],49:[2,81],54:[2,81],57:[2,81],66:[2,81],67:[2,81],68:[2,81],69:[2,81],71:[2,81],73:[2,81],74:[2,81],78:[2,81],80:[2,81],84:[2,81],85:[2,81],86:[2,81],91:[2,81],93:[2,81],102:[2,81],104:[2,81],105:[2,81],106:[2,81],110:[2,81],118:[2,81],126:[2,81],128:[2,81],129:[2,81],130:[2,81],131:[2,81],132:[2,81],133:[2,81],134:[2,81],135:[2,81],136:[2,81],137:[2,81],138:[2,81]},{1:[2,82],6:[2,82],25:[2,82],26:[2,82],40:[2,82],49:[2,82],54:[2,82],57:[2,82],66:[2,82],67:[2,82],68:[2,82],69:[2,82],71:[2,82],73:[2,82],74:[2,82],78:[2,82],80:[2,82],84:[2,82],85:[2,82],86:[2,82],91:[2,82],93:[2,82],102:[2,82],104:[2,82],105:[2,82],106:[2,82],110:[2,82],118:[2,82],126:[2,82],128:[2,82],129:[2,82],130:[2,82],131:[2,82],132:[2,82],133:[2,82],134:[2,82],135:[2,82],136:[2,82],137:[2,82],138:[2,82]},{1:[2,83],6:[2,83],25:[2,83],26:[2,83],40:[2,83],49:[2,83],54:[2,83],57:[2,83],66:[2,83],67:[2,83],68:[2,83],69:[2,83],71:[2,83],73:[2,83],74:[2,83],78:[2,83],80:[2,83],84:[2,83],85:[2,83],86:[2,83],91:[2,83],93:[2,83],102:[2,83],104:[2,83],105:[2,83],106:[2,83],110:[2,83],118:[2,83],126:[2,83],128:[2,83],129:[2,83],130:[2,83],131:[2,83],132:[2,83],133:[2,83],134:[2,83],135:[2,83],136:[2,83],137:[2,83],138:[2,83]},{73:[1,241]},{57:[1,194],73:[2,88],92:242,93:[1,193],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{73:[2,89]},{8:243,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,73:[2,123],76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{12:[2,117],28:[2,117],30:[2,117],31:[2,117],33:[2,117],34:[2,117],35:[2,117],36:[2,117],37:[2,117],38:[2,117],45:[2,117],46:[2,117],47:[2,117],51:[2,117],52:[2,117],73:[2,117],76:[2,117],79:[2,117],83:[2,117],88:[2,117],89:[2,117],90:[2,117],96:[2,117],100:[2,117],101:[2,117],104:[2,117],106:[2,117],108:[2,117],110:[2,117],119:[2,117],125:[2,117],127:[2,117],128:[2,117],129:[2,117],130:[2,117],131:[2,117]},{12:[2,118],28:[2,118],30:[2,118],31:[2,118],33:[2,118],34:[2,118],35:[2,118],36:[2,118],37:[2,118],38:[2,118],45:[2,118],46:[2,118],47:[2,118],51:[2,118],52:[2,118],73:[2,118],76:[2,118],79:[2,118],83:[2,118],88:[2,118],89:[2,118],90:[2,118],96:[2,118],100:[2,118],101:[2,118],104:[2,118],106:[2,118],108:[2,118],110:[2,118],119:[2,118],125:[2,118],127:[2,118],128:[2,118],129:[2,118],130:[2,118],131:[2,118]},{1:[2,87],6:[2,87],25:[2,87],26:[2,87],40:[2,87],49:[2,87],54:[2,87],57:[2,87],66:[2,87],67:[2,87],68:[2,87],69:[2,87],71:[2,87],73:[2,87],74:[2,87],78:[2,87],80:[2,87],84:[2,87],85:[2,87],86:[2,87],91:[2,87],93:[2,87],102:[2,87],104:[2,87],105:[2,87],106:[2,87],110:[2,87],118:[2,87],126:[2,87],128:[2,87],129:[2,87],130:[2,87],131:[2,87],132:[2,87],133:[2,87],134:[2,87],135:[2,87],136:[2,87],137:[2,87],138:[2,87]},{1:[2,105],6:[2,105],25:[2,105],26:[2,105],49:[2,105],54:[2,105],57:[2,105],66:[2,105],67:[2,105],68:[2,105],69:[2,105],71:[2,105],73:[2,105],74:[2,105],78:[2,105],84:[2,105],85:[2,105],86:[2,105],91:[2,105],93:[2,105],102:[2,105],104:[2,105],105:[2,105],106:[2,105],110:[2,105],118:[2,105],126:[2,105],128:[2,105],129:[2,105],132:[2,105],133:[2,105],134:[2,105],135:[2,105],136:[2,105],137:[2,105]},{1:[2,36],6:[2,36],25:[2,36],26:[2,36],49:[2,36],54:[2,36],57:[2,36],73:[2,36],78:[2,36],86:[2,36],91:[2,36],93:[2,36],102:[2,36],103:87,104:[2,36],105:[2,36],106:[2,36],109:88,110:[2,36],111:69,118:[2,36],126:[2,36],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{8:244,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:245,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,110],6:[2,110],25:[2,110],26:[2,110],49:[2,110],54:[2,110],57:[2,110],66:[2,110],67:[2,110],68:[2,110],69:[2,110],71:[2,110],73:[2,110],74:[2,110],78:[2,110],84:[2,110],85:[2,110],86:[2,110],91:[2,110],93:[2,110],102:[2,110],104:[2,110],105:[2,110],106:[2,110],110:[2,110],118:[2,110],126:[2,110],128:[2,110],129:[2,110],132:[2,110],133:[2,110],134:[2,110],135:[2,110],136:[2,110],137:[2,110]},{6:[2,53],25:[2,53],53:246,54:[1,229],86:[2,53]},{6:[2,129],25:[2,129],26:[2,129],54:[2,129],57:[1,247],86:[2,129],91:[2,129],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{50:248,51:[1,60],52:[1,61]},{6:[2,54],25:[2,54],26:[2,54],27:110,28:[1,73],44:111,55:249,56:109,58:112,59:113,76:[1,70],89:[1,114],90:[1,115]},{6:[1,250],25:[1,251]},{6:[2,61],25:[2,61],26:[2,61],49:[2,61],54:[2,61]},{8:252,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,202],6:[2,202],25:[2,202],26:[2,202],49:[2,202],54:[2,202],57:[2,202],73:[2,202],78:[2,202],86:[2,202],91:[2,202],93:[2,202],102:[2,202],103:87,104:[2,202],105:[2,202],106:[2,202],109:88,110:[2,202],111:69,118:[2,202],126:[2,202],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{8:253,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:254,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,205],6:[2,205],25:[2,205],26:[2,205],49:[2,205],54:[2,205],57:[2,205],73:[2,205],78:[2,205],86:[2,205],91:[2,205],93:[2,205],102:[2,205],103:87,104:[2,205],105:[2,205],106:[2,205],109:88,110:[2,205],111:69,118:[2,205],126:[2,205],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,184],6:[2,184],25:[2,184],26:[2,184],49:[2,184],54:[2,184],57:[2,184],73:[2,184],78:[2,184],86:[2,184],91:[2,184],93:[2,184],102:[2,184],104:[2,184],105:[2,184],106:[2,184],110:[2,184],118:[2,184],126:[2,184],128:[2,184],129:[2,184],132:[2,184],133:[2,184],134:[2,184],135:[2,184],136:[2,184],137:[2,184]},{8:255,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,134],6:[2,134],25:[2,134],26:[2,134],49:[2,134],54:[2,134],57:[2,134],73:[2,134],78:[2,134],86:[2,134],91:[2,134],93:[2,134],98:[1,256],102:[2,134],104:[2,134],105:[2,134],106:[2,134],110:[2,134],118:[2,134],126:[2,134],128:[2,134],129:[2,134],132:[2,134],133:[2,134],134:[2,134],135:[2,134],136:[2,134],137:[2,134]},{5:257,25:[1,5]},{5:260,25:[1,5],27:258,28:[1,73],59:259,76:[1,70]},{120:261,122:219,123:[1,220]},{26:[1,262],121:[1,263],122:264,123:[1,220]},{26:[2,177],121:[2,177],123:[2,177]},{8:266,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],95:265,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,98],5:267,6:[2,98],25:[1,5],26:[2,98],49:[2,98],54:[2,98],57:[2,98],73:[2,98],78:[2,98],86:[2,98],91:[2,98],93:[2,98],102:[2,98],103:87,104:[1,65],105:[2,98],106:[1,66],109:88,110:[1,68],111:69,118:[2,98],126:[2,98],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,101],6:[2,101],25:[2,101],26:[2,101],49:[2,101],54:[2,101],57:[2,101],73:[2,101],78:[2,101],86:[2,101],91:[2,101],93:[2,101],102:[2,101],104:[2,101],105:[2,101],106:[2,101],110:[2,101],118:[2,101],126:[2,101],128:[2,101],129:[2,101],132:[2,101],133:[2,101],134:[2,101],135:[2,101],136:[2,101],137:[2,101]},{8:268,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,141],6:[2,141],25:[2,141],26:[2,141],49:[2,141],54:[2,141],57:[2,141],66:[2,141],67:[2,141],68:[2,141],69:[2,141],71:[2,141],73:[2,141],74:[2,141],78:[2,141],84:[2,141],85:[2,141],86:[2,141],91:[2,141],93:[2,141],102:[2,141],104:[2,141],105:[2,141],106:[2,141],110:[2,141],118:[2,141],126:[2,141],128:[2,141],129:[2,141],132:[2,141],133:[2,141],134:[2,141],135:[2,141],136:[2,141],137:[2,141]},{6:[1,74],26:[1,269]},{8:270,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,67],12:[2,118],25:[2,67],28:[2,118],30:[2,118],31:[2,118],33:[2,118],34:[2,118],35:[2,118],36:[2,118],37:[2,118],38:[2,118],45:[2,118],46:[2,118],47:[2,118],51:[2,118],52:[2,118],54:[2,67],76:[2,118],79:[2,118],83:[2,118],88:[2,118],89:[2,118],90:[2,118],91:[2,67],96:[2,118],100:[2,118],101:[2,118],104:[2,118],106:[2,118],108:[2,118],110:[2,118],119:[2,118],125:[2,118],127:[2,118],128:[2,118],129:[2,118],130:[2,118],131:[2,118]},{6:[1,272],25:[1,273],91:[1,271]},{6:[2,54],8:202,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[2,54],26:[2,54],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],86:[2,54],88:[1,58],89:[1,59],90:[1,57],91:[2,54],94:274,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,53],25:[2,53],26:[2,53],53:275,54:[1,229]},{1:[2,181],6:[2,181],25:[2,181],26:[2,181],49:[2,181],54:[2,181],57:[2,181],73:[2,181],78:[2,181],86:[2,181],91:[2,181],93:[2,181],102:[2,181],104:[2,181],105:[2,181],106:[2,181],110:[2,181],118:[2,181],121:[2,181],126:[2,181],128:[2,181],129:[2,181],132:[2,181],133:[2,181],134:[2,181],135:[2,181],136:[2,181],137:[2,181]},{8:276,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:277,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{116:[2,159],117:[2,159]},{27:159,28:[1,73],44:160,58:161,59:162,76:[1,70],89:[1,114],90:[1,115],115:278},{1:[2,166],6:[2,166],25:[2,166],26:[2,166],49:[2,166],54:[2,166],57:[2,166],73:[2,166],78:[2,166],86:[2,166],91:[2,166],93:[2,166],102:[2,166],103:87,104:[2,166],105:[1,279],106:[2,166],109:88,110:[2,166],111:69,118:[1,280],126:[2,166],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,167],6:[2,167],25:[2,167],26:[2,167],49:[2,167],54:[2,167],57:[2,167],73:[2,167],78:[2,167],86:[2,167],91:[2,167],93:[2,167],102:[2,167],103:87,104:[2,167],105:[1,281],106:[2,167],109:88,110:[2,167],111:69,118:[2,167],126:[2,167],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[1,283],25:[1,284],78:[1,282]},{6:[2,54],11:169,25:[2,54],26:[2,54],27:170,28:[1,73],29:171,30:[1,71],31:[1,72],41:285,42:168,44:172,46:[1,46],78:[2,54],89:[1,114]},{8:286,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,287],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,86],6:[2,86],25:[2,86],26:[2,86],40:[2,86],49:[2,86],54:[2,86],57:[2,86],66:[2,86],67:[2,86],68:[2,86],69:[2,86],71:[2,86],73:[2,86],74:[2,86],78:[2,86],80:[2,86],84:[2,86],85:[2,86],86:[2,86],91:[2,86],93:[2,86],102:[2,86],104:[2,86],105:[2,86],106:[2,86],110:[2,86],118:[2,86],126:[2,86],128:[2,86],129:[2,86],130:[2,86],131:[2,86],132:[2,86],133:[2,86],134:[2,86],135:[2,86],136:[2,86],137:[2,86],138:[2,86]},{8:288,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,73:[2,121],76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{73:[2,122],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,37],6:[2,37],25:[2,37],26:[2,37],49:[2,37],54:[2,37],57:[2,37],73:[2,37],78:[2,37],86:[2,37],91:[2,37],93:[2,37],102:[2,37],103:87,104:[2,37],105:[2,37],106:[2,37],109:88,110:[2,37],111:69,118:[2,37],126:[2,37],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{26:[1,289],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[1,272],25:[1,273],86:[1,290]},{6:[2,67],25:[2,67],26:[2,67],54:[2,67],86:[2,67],91:[2,67]},{5:291,25:[1,5]},{6:[2,57],25:[2,57],26:[2,57],49:[2,57],54:[2,57]},{27:110,28:[1,73],44:111,55:292,56:109,58:112,59:113,76:[1,70],89:[1,114],90:[1,115]},{6:[2,55],25:[2,55],26:[2,55],27:110,28:[1,73],44:111,48:293,54:[2,55],55:108,56:109,58:112,59:113,76:[1,70],89:[1,114],90:[1,115]},{6:[2,62],25:[2,62],26:[2,62],49:[2,62],54:[2,62],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{26:[1,294],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,204],6:[2,204],25:[2,204],26:[2,204],49:[2,204],54:[2,204],57:[2,204],73:[2,204],78:[2,204],86:[2,204],91:[2,204],93:[2,204],102:[2,204],103:87,104:[2,204],105:[2,204],106:[2,204],109:88,110:[2,204],111:69,118:[2,204],126:[2,204],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{5:295,25:[1,5],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{5:296,25:[1,5]},{1:[2,135],6:[2,135],25:[2,135],26:[2,135],49:[2,135],54:[2,135],57:[2,135],73:[2,135],78:[2,135],86:[2,135],91:[2,135],93:[2,135],102:[2,135],104:[2,135],105:[2,135],106:[2,135],110:[2,135],118:[2,135],126:[2,135],128:[2,135],129:[2,135],132:[2,135],133:[2,135],134:[2,135],135:[2,135],136:[2,135],137:[2,135]},{5:297,25:[1,5]},{5:298,25:[1,5]},{1:[2,139],6:[2,139],25:[2,139],26:[2,139],49:[2,139],54:[2,139],57:[2,139],73:[2,139],78:[2,139],86:[2,139],91:[2,139],93:[2,139],98:[2,139],102:[2,139],104:[2,139],105:[2,139],106:[2,139],110:[2,139],118:[2,139],126:[2,139],128:[2,139],129:[2,139],132:[2,139],133:[2,139],134:[2,139],135:[2,139],136:[2,139],137:[2,139]},{26:[1,299],121:[1,300],122:264,123:[1,220]},{1:[2,175],6:[2,175],25:[2,175],26:[2,175],49:[2,175],54:[2,175],57:[2,175],73:[2,175],78:[2,175],86:[2,175],91:[2,175],93:[2,175],102:[2,175],104:[2,175],105:[2,175],106:[2,175],110:[2,175],118:[2,175],126:[2,175],128:[2,175],129:[2,175],132:[2,175],133:[2,175],134:[2,175],135:[2,175],136:[2,175],137:[2,175]},{5:301,25:[1,5]},{26:[2,178],121:[2,178],123:[2,178]},{5:302,25:[1,5],54:[1,303]},{25:[2,131],54:[2,131],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,99],6:[2,99],25:[2,99],26:[2,99],49:[2,99],54:[2,99],57:[2,99],73:[2,99],78:[2,99],86:[2,99],91:[2,99],93:[2,99],102:[2,99],104:[2,99],105:[2,99],106:[2,99],110:[2,99],118:[2,99],126:[2,99],128:[2,99],129:[2,99],132:[2,99],133:[2,99],134:[2,99],135:[2,99],136:[2,99],137:[2,99]},{1:[2,102],5:304,6:[2,102],25:[1,5],26:[2,102],49:[2,102],54:[2,102],57:[2,102],73:[2,102],78:[2,102],86:[2,102],91:[2,102],93:[2,102],102:[2,102],103:87,104:[1,65],105:[2,102],106:[1,66],109:88,110:[1,68],111:69,118:[2,102],126:[2,102],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{102:[1,305]},{91:[1,306],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,116],6:[2,116],25:[2,116],26:[2,116],40:[2,116],49:[2,116],54:[2,116],57:[2,116],66:[2,116],67:[2,116],68:[2,116],69:[2,116],71:[2,116],73:[2,116],74:[2,116],78:[2,116],84:[2,116],85:[2,116],86:[2,116],91:[2,116],93:[2,116],102:[2,116],104:[2,116],105:[2,116],106:[2,116],110:[2,116],116:[2,116],117:[2,116],118:[2,116],126:[2,116],128:[2,116],129:[2,116],132:[2,116],133:[2,116],134:[2,116],135:[2,116],136:[2,116],137:[2,116]},{8:202,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],94:307,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:202,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,25:[1,147],27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,60:148,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],87:308,88:[1,58],89:[1,59],90:[1,57],94:146,96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[2,125],25:[2,125],26:[2,125],54:[2,125],86:[2,125],91:[2,125]},{6:[1,272],25:[1,273],26:[1,309]},{1:[2,144],6:[2,144],25:[2,144],26:[2,144],49:[2,144],54:[2,144],57:[2,144],73:[2,144],78:[2,144],86:[2,144],91:[2,144],93:[2,144],102:[2,144],103:87,104:[1,65],105:[2,144],106:[1,66],109:88,110:[1,68],111:69,118:[2,144],126:[2,144],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,146],6:[2,146],25:[2,146],26:[2,146],49:[2,146],54:[2,146],57:[2,146],73:[2,146],78:[2,146],86:[2,146],91:[2,146],93:[2,146],102:[2,146],103:87,104:[1,65],105:[2,146],106:[1,66],109:88,110:[1,68],111:69,118:[2,146],126:[2,146],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{116:[2,165],117:[2,165]},{8:310,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:311,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:312,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,90],6:[2,90],25:[2,90],26:[2,90],40:[2,90],49:[2,90],54:[2,90],57:[2,90],66:[2,90],67:[2,90],68:[2,90],69:[2,90],71:[2,90],73:[2,90],74:[2,90],78:[2,90],84:[2,90],85:[2,90],86:[2,90],91:[2,90],93:[2,90],102:[2,90],104:[2,90],105:[2,90],106:[2,90],110:[2,90],116:[2,90],117:[2,90],118:[2,90],126:[2,90],128:[2,90],129:[2,90],132:[2,90],133:[2,90],134:[2,90],135:[2,90],136:[2,90],137:[2,90]},{11:169,27:170,28:[1,73],29:171,30:[1,71],31:[1,72],41:313,42:168,44:172,46:[1,46],89:[1,114]},{6:[2,91],11:169,25:[2,91],26:[2,91],27:170,28:[1,73],29:171,30:[1,71],31:[1,72],41:167,42:168,44:172,46:[1,46],54:[2,91],77:314,89:[1,114]},{6:[2,93],25:[2,93],26:[2,93],54:[2,93],78:[2,93]},{6:[2,40],25:[2,40],26:[2,40],54:[2,40],78:[2,40],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{8:315,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{73:[2,120],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,38],6:[2,38],25:[2,38],26:[2,38],49:[2,38],54:[2,38],57:[2,38],73:[2,38],78:[2,38],86:[2,38],91:[2,38],93:[2,38],102:[2,38],104:[2,38],105:[2,38],106:[2,38],110:[2,38],118:[2,38],126:[2,38],128:[2,38],129:[2,38],132:[2,38],133:[2,38],134:[2,38],135:[2,38],136:[2,38],137:[2,38]},{1:[2,111],6:[2,111],25:[2,111],26:[2,111],49:[2,111],54:[2,111],57:[2,111],66:[2,111],67:[2,111],68:[2,111],69:[2,111],71:[2,111],73:[2,111],74:[2,111],78:[2,111],84:[2,111],85:[2,111],86:[2,111],91:[2,111],93:[2,111],102:[2,111],104:[2,111],105:[2,111],106:[2,111],110:[2,111],118:[2,111],126:[2,111],128:[2,111],129:[2,111],132:[2,111],133:[2,111],134:[2,111],135:[2,111],136:[2,111],137:[2,111]},{1:[2,49],6:[2,49],25:[2,49],26:[2,49],49:[2,49],54:[2,49],57:[2,49],73:[2,49],78:[2,49],86:[2,49],91:[2,49],93:[2,49],102:[2,49],104:[2,49],105:[2,49],106:[2,49],110:[2,49],118:[2,49],126:[2,49],128:[2,49],129:[2,49],132:[2,49],133:[2,49],134:[2,49],135:[2,49],136:[2,49],137:[2,49]},{6:[2,58],25:[2,58],26:[2,58],49:[2,58],54:[2,58]},{6:[2,53],25:[2,53],26:[2,53],53:316,54:[1,204]},{1:[2,203],6:[2,203],25:[2,203],26:[2,203],49:[2,203],54:[2,203],57:[2,203],73:[2,203],78:[2,203],86:[2,203],91:[2,203],93:[2,203],102:[2,203],104:[2,203],105:[2,203],106:[2,203],110:[2,203],118:[2,203],126:[2,203],128:[2,203],129:[2,203],132:[2,203],133:[2,203],134:[2,203],135:[2,203],136:[2,203],137:[2,203]},{1:[2,182],6:[2,182],25:[2,182],26:[2,182],49:[2,182],54:[2,182],57:[2,182],73:[2,182],78:[2,182],86:[2,182],91:[2,182],93:[2,182],102:[2,182],104:[2,182],105:[2,182],106:[2,182],110:[2,182],118:[2,182],121:[2,182],126:[2,182],128:[2,182],129:[2,182],132:[2,182],133:[2,182],134:[2,182],135:[2,182],136:[2,182],137:[2,182]},{1:[2,136],6:[2,136],25:[2,136],26:[2,136],49:[2,136],54:[2,136],57:[2,136],73:[2,136],78:[2,136],86:[2,136],91:[2,136],93:[2,136],102:[2,136],104:[2,136],105:[2,136],106:[2,136],110:[2,136],118:[2,136],126:[2,136],128:[2,136],129:[2,136],132:[2,136],133:[2,136],134:[2,136],135:[2,136],136:[2,136],137:[2,136]},{1:[2,137],6:[2,137],25:[2,137],26:[2,137],49:[2,137],54:[2,137],57:[2,137],73:[2,137],78:[2,137],86:[2,137],91:[2,137],93:[2,137],98:[2,137],102:[2,137],104:[2,137],105:[2,137],106:[2,137],110:[2,137],118:[2,137],126:[2,137],128:[2,137],129:[2,137],132:[2,137],133:[2,137],134:[2,137],135:[2,137],136:[2,137],137:[2,137]},{1:[2,138],6:[2,138],25:[2,138],26:[2,138],49:[2,138],54:[2,138],57:[2,138],73:[2,138],78:[2,138],86:[2,138],91:[2,138],93:[2,138],98:[2,138],102:[2,138],104:[2,138],105:[2,138],106:[2,138],110:[2,138],118:[2,138],126:[2,138],128:[2,138],129:[2,138],132:[2,138],133:[2,138],134:[2,138],135:[2,138],136:[2,138],137:[2,138]},{1:[2,173],6:[2,173],25:[2,173],26:[2,173],49:[2,173],54:[2,173],57:[2,173],73:[2,173],78:[2,173],86:[2,173],91:[2,173],93:[2,173],102:[2,173],104:[2,173],105:[2,173],106:[2,173],110:[2,173],118:[2,173],126:[2,173],128:[2,173],129:[2,173],132:[2,173],133:[2,173],134:[2,173],135:[2,173],136:[2,173],137:[2,173]},{5:317,25:[1,5]},{26:[1,318]},{6:[1,319],26:[2,179],121:[2,179],123:[2,179]},{8:320,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{1:[2,103],6:[2,103],25:[2,103],26:[2,103],49:[2,103],54:[2,103],57:[2,103],73:[2,103],78:[2,103],86:[2,103],91:[2,103],93:[2,103],102:[2,103],104:[2,103],105:[2,103],106:[2,103],110:[2,103],118:[2,103],126:[2,103],128:[2,103],129:[2,103],132:[2,103],133:[2,103],134:[2,103],135:[2,103],136:[2,103],137:[2,103]},{1:[2,142],6:[2,142],25:[2,142],26:[2,142],49:[2,142],54:[2,142],57:[2,142],66:[2,142],67:[2,142],68:[2,142],69:[2,142],71:[2,142],73:[2,142],74:[2,142],78:[2,142],84:[2,142],85:[2,142],86:[2,142],91:[2,142],93:[2,142],102:[2,142],104:[2,142],105:[2,142],106:[2,142],110:[2,142],118:[2,142],126:[2,142],128:[2,142],129:[2,142],132:[2,142],133:[2,142],134:[2,142],135:[2,142],136:[2,142],137:[2,142]},{1:[2,119],6:[2,119],25:[2,119],26:[2,119],49:[2,119],54:[2,119],57:[2,119],66:[2,119],67:[2,119],68:[2,119],69:[2,119],71:[2,119],73:[2,119],74:[2,119],78:[2,119],84:[2,119],85:[2,119],86:[2,119],91:[2,119],93:[2,119],102:[2,119],104:[2,119],105:[2,119],106:[2,119],110:[2,119],118:[2,119],126:[2,119],128:[2,119],129:[2,119],132:[2,119],133:[2,119],134:[2,119],135:[2,119],136:[2,119],137:[2,119]},{6:[2,126],25:[2,126],26:[2,126],54:[2,126],86:[2,126],91:[2,126]},{6:[2,53],25:[2,53],26:[2,53],53:321,54:[1,229]},{6:[2,127],25:[2,127],26:[2,127],54:[2,127],86:[2,127],91:[2,127]},{1:[2,168],6:[2,168],25:[2,168],26:[2,168],49:[2,168],54:[2,168],57:[2,168],73:[2,168],78:[2,168],86:[2,168],91:[2,168],93:[2,168],102:[2,168],103:87,104:[2,168],105:[2,168],106:[2,168],109:88,110:[2,168],111:69,118:[1,322],126:[2,168],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,170],6:[2,170],25:[2,170],26:[2,170],49:[2,170],54:[2,170],57:[2,170],73:[2,170],78:[2,170],86:[2,170],91:[2,170],93:[2,170],102:[2,170],103:87,104:[2,170],105:[1,323],106:[2,170],109:88,110:[2,170],111:69,118:[2,170],126:[2,170],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,169],6:[2,169],25:[2,169],26:[2,169],49:[2,169],54:[2,169],57:[2,169],73:[2,169],78:[2,169],86:[2,169],91:[2,169],93:[2,169],102:[2,169],103:87,104:[2,169],105:[2,169],106:[2,169],109:88,110:[2,169],111:69,118:[2,169],126:[2,169],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[2,94],25:[2,94],26:[2,94],54:[2,94],78:[2,94]},{6:[2,53],25:[2,53],26:[2,53],53:324,54:[1,239]},{26:[1,325],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[1,250],25:[1,251],26:[1,326]},{26:[1,327]},{1:[2,176],6:[2,176],25:[2,176],26:[2,176],49:[2,176],54:[2,176],57:[2,176],73:[2,176],78:[2,176],86:[2,176],91:[2,176],93:[2,176],102:[2,176],104:[2,176],105:[2,176],106:[2,176],110:[2,176],118:[2,176],126:[2,176],128:[2,176],129:[2,176],132:[2,176],133:[2,176],134:[2,176],135:[2,176],136:[2,176],137:[2,176]},{26:[2,180],121:[2,180],123:[2,180]},{25:[2,132],54:[2,132],103:87,104:[1,65],106:[1,66],109:88,110:[1,68],111:69,126:[1,86],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[1,272],25:[1,273],26:[1,328]},{8:329,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{8:330,9:118,10:20,11:21,12:[1,22],13:8,14:9,15:10,16:11,17:12,18:13,19:14,20:15,21:16,22:17,23:18,24:19,27:62,28:[1,73],29:49,30:[1,71],31:[1,72],32:24,33:[1,50],34:[1,51],35:[1,52],36:[1,53],37:[1,54],38:[1,55],39:23,44:63,45:[1,45],46:[1,46],47:[1,29],50:30,51:[1,60],52:[1,61],58:47,59:48,61:36,63:25,64:26,65:27,76:[1,70],79:[1,43],83:[1,28],88:[1,58],89:[1,59],90:[1,57],96:[1,38],100:[1,44],101:[1,56],103:39,104:[1,65],106:[1,66],107:40,108:[1,67],109:41,110:[1,68],111:69,119:[1,42],124:37,125:[1,64],127:[1,31],128:[1,32],129:[1,33],130:[1,34],131:[1,35]},{6:[1,283],25:[1,284],26:[1,331]},{6:[2,41],25:[2,41],26:[2,41],54:[2,41],78:[2,41]},{6:[2,59],25:[2,59],26:[2,59],49:[2,59],54:[2,59]},{1:[2,174],6:[2,174],25:[2,174],26:[2,174],49:[2,174],54:[2,174],57:[2,174],73:[2,174],78:[2,174],86:[2,174],91:[2,174],93:[2,174],102:[2,174],104:[2,174],105:[2,174],106:[2,174],110:[2,174],118:[2,174],126:[2,174],128:[2,174],129:[2,174],132:[2,174],133:[2,174],134:[2,174],135:[2,174],136:[2,174],137:[2,174]},{6:[2,128],25:[2,128],26:[2,128],54:[2,128],86:[2,128],91:[2,128]},{1:[2,171],6:[2,171],25:[2,171],26:[2,171],49:[2,171],54:[2,171],57:[2,171],73:[2,171],78:[2,171],86:[2,171],91:[2,171],93:[2,171],102:[2,171],103:87,104:[2,171],105:[2,171],106:[2,171],109:88,110:[2,171],111:69,118:[2,171],126:[2,171],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{1:[2,172],6:[2,172],25:[2,172],26:[2,172],49:[2,172],54:[2,172],57:[2,172],73:[2,172],78:[2,172],86:[2,172],91:[2,172],93:[2,172],102:[2,172],103:87,104:[2,172],105:[2,172],106:[2,172],109:88,110:[2,172],111:69,118:[2,172],126:[2,172],128:[1,80],129:[1,79],132:[1,78],133:[1,81],134:[1,82],135:[1,83],136:[1,84],137:[1,85]},{6:[2,95],25:[2,95],26:[2,95],54:[2,95],78:[2,95]}],defaultActions:{60:[2,51],61:[2,52],75:[2,3],94:[2,109],191:[2,89]},parseError:function(e){throw new Error(e)
},parse:function(e){function t(){var e;return e=n.lexer.lex()||1,"number"!=typeof e&&(e=n.symbols_[e]||e),e}var n=this,i=[0],s=[null],r=[],o=this.table,a="",c=0,h=0,l=0;this.lexer.setInput(e),this.lexer.yy=this.yy,this.yy.lexer=this.lexer,this.yy.parser=this,"undefined"==typeof this.lexer.yylloc&&(this.lexer.yylloc={});var u=this.lexer.yylloc;r.push(u);var p=this.lexer.options&&this.lexer.options.ranges;"function"==typeof this.yy.parseError&&(this.parseError=this.yy.parseError);for(var d,f,m,b,k,g,y,v,w,T={};;){if(m=i[i.length-1],this.defaultActions[m]?b=this.defaultActions[m]:((null===d||"undefined"==typeof d)&&(d=t()),b=o[m]&&o[m][d]),"undefined"==typeof b||!b.length||!b[0]){var C="";if(!l){w=[];for(g in o[m])this.terminals_[g]&&g>2&&w.push("'"+this.terminals_[g]+"'");C=this.lexer.showPosition?"Parse error on line "+(c+1)+":\n"+this.lexer.showPosition()+"\nExpecting "+w.join(", ")+", got '"+(this.terminals_[d]||d)+"'":"Parse error on line "+(c+1)+": Unexpected "+(1==d?"end of input":"'"+(this.terminals_[d]||d)+"'"),this.parseError(C,{text:this.lexer.match,token:this.terminals_[d]||d,line:this.lexer.yylineno,loc:u,expected:w})}}if(b[0]instanceof Array&&b.length>1)throw new Error("Parse Error: multiple actions possible at state: "+m+", token: "+d);switch(b[0]){case 1:i.push(d),s.push(this.lexer.yytext),r.push(this.lexer.yylloc),i.push(b[1]),d=null,f?(d=f,f=null):(h=this.lexer.yyleng,a=this.lexer.yytext,c=this.lexer.yylineno,u=this.lexer.yylloc,l>0&&l--);break;case 2:if(y=this.productions_[b[1]][1],T.$=s[s.length-y],T._$={first_line:r[r.length-(y||1)].first_line,last_line:r[r.length-1].last_line,first_column:r[r.length-(y||1)].first_column,last_column:r[r.length-1].last_column},p&&(T._$.range=[r[r.length-(y||1)].range[0],r[r.length-1].range[1]]),k=this.performAction.call(T,a,h,c,this.yy,b[1],s,r),"undefined"!=typeof k)return k;y&&(i=i.slice(0,2*-1*y),s=s.slice(0,-1*y),r=r.slice(0,-1*y)),i.push(this.productions_[b[1]][0]),s.push(T.$),r.push(T._$),v=o[i[i.length-2]][i[i.length-1]],i.push(v);break;case 3:return!0}}return!0}};return e.prototype=t,t.Parser=e,new e}();return"undefined"!=typeof require&&"undefined"!=typeof e&&(e.parser=n,e.Parser=n.Parser,e.parse=function(){return n.parse.apply(n,arguments)},e.main=function(t){t[1]||(console.log("Usage: "+t[0]+" FILE"),process.exit(1));var n=require("fs").readFileSync(require("path").normalize(t[1]),"utf8");return e.parser.parse(n)},"undefined"!=typeof t&&require.main===t&&e.main(process.argv.slice(1))),t.exports}(),require["./scope"]=function(){var e={},t={exports:e};return function(){var t,n,i,s;s=require("./helpers"),n=s.extend,i=s.last,e.Scope=t=function(){function e(t,n,i){this.parent=t,this.expressions=n,this.method=i,this.variables=[{name:"arguments",type:"arguments"}],this.positions={},this.parent||(e.root=this)}return e.root=null,e.prototype.add=function(e,t,n){return this.shared&&!n?this.parent.add(e,t,n):Object.prototype.hasOwnProperty.call(this.positions,e)?this.variables[this.positions[e]].type=t:this.positions[e]=this.variables.push({name:e,type:t})-1},e.prototype.namedMethod=function(){var e;return(null!=(e=this.method)?e.name:void 0)||!this.parent?this.method:this.parent.namedMethod()},e.prototype.find=function(e){return this.check(e)?!0:(this.add(e,"var"),!1)},e.prototype.parameter=function(e){return this.shared&&this.parent.check(e,!0)?void 0:this.add(e,"param")},e.prototype.check=function(e){var t;return!!(this.type(e)||(null!=(t=this.parent)?t.check(e):void 0))},e.prototype.temporary=function(e,t){return e.length>1?"_"+e+(t>1?t-1:""):"_"+(t+parseInt(e,36)).toString(36).replace(/\d/g,"a")},e.prototype.type=function(e){var t,n,i,s;for(s=this.variables,n=0,i=s.length;i>n;n++)if(t=s[n],t.name===e)return t.type;return null},e.prototype.freeVariable=function(e,t){var n,i;for(null==t&&(t=!0),n=0;this.check(i=this.temporary(e,n));)n++;return t&&this.add(i,"var",!0),i},e.prototype.assign=function(e,t){return this.add(e,{value:t,assigned:!0},!0),this.hasAssignments=!0},e.prototype.hasDeclarations=function(){return!!this.declaredVariables().length},e.prototype.declaredVariables=function(){var e,t,n,i,s,r;for(e=[],t=[],r=this.variables,i=0,s=r.length;s>i;i++)n=r[i],"var"===n.type&&("_"===n.name.charAt(0)?t:e).push(n.name);return e.sort().concat(t.sort())},e.prototype.assignedVariables=function(){var e,t,n,i,s;for(i=this.variables,s=[],t=0,n=i.length;n>t;t++)e=i[t],e.type.assigned&&s.push(""+e.name+" = "+e.type.value);return s},e}()}.call(this),t.exports}(),require["./nodes"]=function(){var e={},t={exports:e};return function(){var t,n,i,s,r,o,a,c,h,l,u,p,d,f,m,b,k,g,y,v,w,T,C,F,L,N,x,E,D,S,R,A,I,_,$,O,j,M,B,V,P,U,q,H,G,W,X,Y,K,z,J,Z,Q,et,tt,nt,it,st,rt,ot,at,ct,ht,lt,ut,pt,dt,ft,mt,bt,kt,gt={}.hasOwnProperty,yt=function(e,t){function n(){this.constructor=e}for(var i in t)gt.call(t,i)&&(e[i]=t[i]);return n.prototype=t.prototype,e.prototype=new n,e.__super__=t.prototype,e},vt=[].indexOf||function(e){for(var t=0,n=this.length;n>t;t++)if(t in this&&this[t]===e)return t;return-1},wt=[].slice;Error.stackTraceLimit=1/0,V=require("./scope").Scope,ft=require("./lexer"),$=ft.RESERVED,B=ft.STRICT_PROSCRIBED,mt=require("./helpers"),Q=mt.compact,it=mt.flatten,nt=mt.extend,at=mt.merge,et=mt.del,lt=mt.starts,tt=mt.ends,rt=mt.last,ht=mt.some,Z=mt.addLocationDataFn,ot=mt.locationDataToString,ut=mt.throwSyntaxError,e.extend=nt,e.addLocationDataFn=Z,J=function(){return!0},S=function(){return!1},G=function(){return this},D=function(){return this.negated=!this.negated,this},e.CodeFragment=l=function(){function e(e,t){var n;this.code=""+t,this.locationData=null!=e?e.locationData:void 0,this.type=(null!=e?null!=(n=e.constructor)?n.name:void 0:void 0)||"unknown"}return e.prototype.toString=function(){return""+this.code+(this.locationData?": "+ot(this.locationData):"")},e}(),st=function(e){var t;return function(){var n,i,s;for(s=[],n=0,i=e.length;i>n;n++)t=e[n],s.push(t.code);return s}().join("")},e.Base=s=function(){function e(){}return e.prototype.compile=function(e,t){return st(this.compileToFragments(e,t))},e.prototype.compileToFragments=function(e,t){var n;return e=nt({},e),t&&(e.level=t),n=this.unfoldSoak(e)||this,n.tab=e.indent,e.level!==N&&n.isStatement(e)?n.compileClosure(e):n.compileNode(e)},e.prototype.compileClosure=function(e){var t;return(t=this.jumps())&&t.error("cannot use a pure statement in an expression"),e.sharedScope=!0,c.wrap(this).compileNode(e)},e.prototype.cache=function(e,t,n){var s,r;return this.isComplex()?(s=new x(n||e.scope.freeVariable("ref")),r=new i(s,this),t?[r.compileToFragments(e,t),[this.makeCode(s.value)]]:[r,s]):(s=t?this.compileToFragments(e,t):this,[s,s])},e.prototype.cacheToCodeFragments=function(e){return[st(e[0]),st(e[1])]},e.prototype.makeReturn=function(e){var t;return t=this.unwrapAll(),e?new o(new x(""+e+".push"),[t]):new j(t)},e.prototype.contains=function(e){var t;return t=void 0,this.traverseChildren(!1,function(n){return e(n)?(t=n,!1):void 0}),t},e.prototype.lastNonComment=function(e){var t;for(t=e.length;t--;)if(!(e[t]instanceof u))return e[t];return null},e.prototype.toString=function(e,t){var n;return null==e&&(e=""),null==t&&(t=this.constructor.name),n="\n"+e+t,this.soak&&(n+="?"),this.eachChild(function(t){return n+=t.toString(e+H)}),n},e.prototype.eachChild=function(e){var t,n,i,s,r,o,a,c;if(!this.children)return this;for(a=this.children,i=0,r=a.length;r>i;i++)if(t=a[i],this[t])for(c=it([this[t]]),s=0,o=c.length;o>s;s++)if(n=c[s],e(n)===!1)return this;return this},e.prototype.traverseChildren=function(e,t){return this.eachChild(function(n){var i;return i=t(n),i!==!1?n.traverseChildren(e,t):void 0})},e.prototype.invert=function(){return new A("!",this)},e.prototype.unwrapAll=function(){var e;for(e=this;e!==(e=e.unwrap()););return e},e.prototype.children=[],e.prototype.isStatement=S,e.prototype.jumps=S,e.prototype.isComplex=J,e.prototype.isChainable=S,e.prototype.isAssignable=S,e.prototype.unwrap=G,e.prototype.unfoldSoak=S,e.prototype.assigns=S,e.prototype.updateLocationDataIfMissing=function(e){return this.locationData||(this.locationData=e),this.eachChild(function(t){return t.updateLocationDataIfMissing(e)})},e.prototype.error=function(e){return ut(e,this.locationData)},e.prototype.makeCode=function(e){return new l(this,e)},e.prototype.wrapInBraces=function(e){return[].concat(this.makeCode("("),e,this.makeCode(")"))},e.prototype.joinFragmentArrays=function(e,t){var n,i,s,r,o;for(n=[],s=r=0,o=e.length;o>r;s=++r)i=e[s],s&&n.push(this.makeCode(t)),n=n.concat(i);return n},e}(),e.Block=r=function(e){function t(e){this.expressions=Q(it(e||[]))}return yt(t,e),t.prototype.children=["expressions"],t.prototype.push=function(e){return this.expressions.push(e),this},t.prototype.pop=function(){return this.expressions.pop()},t.prototype.unshift=function(e){return this.expressions.unshift(e),this},t.prototype.unwrap=function(){return 1===this.expressions.length?this.expressions[0]:this},t.prototype.isEmpty=function(){return!this.expressions.length},t.prototype.isStatement=function(e){var t,n,i,s;for(s=this.expressions,n=0,i=s.length;i>n;n++)if(t=s[n],t.isStatement(e))return!0;return!1},t.prototype.jumps=function(e){var t,n,i,s;for(s=this.expressions,n=0,i=s.length;i>n;n++)if(t=s[n],t.jumps(e))return t},t.prototype.makeReturn=function(e){var t,n;for(n=this.expressions.length;n--;)if(t=this.expressions[n],!(t instanceof u)){this.expressions[n]=t.makeReturn(e),t instanceof j&&!t.expression&&this.expressions.splice(n,1);break}return this},t.prototype.compileToFragments=function(e,n){return null==e&&(e={}),e.scope?t.__super__.compileToFragments.call(this,e,n):this.compileRoot(e)},t.prototype.compileNode=function(e){var n,i,s,r,o,a,c,h,l;for(this.tab=e.indent,a=e.level===N,i=[],l=this.expressions,r=c=0,h=l.length;h>c;r=++c)o=l[r],o=o.unwrapAll(),o=o.unfoldSoak(e)||o,o instanceof t?i.push(o.compileNode(e)):a?(o.front=!0,s=o.compileToFragments(e),o.isStatement(e)||(s.unshift(this.makeCode(""+this.tab)),s.push(this.makeCode(";"))),i.push(s)):i.push(o.compileToFragments(e,C));return a?this.spaced?[].concat(this.joinFragmentArrays(i,"\n\n"),this.makeCode("\n")):this.joinFragmentArrays(i,"\n"):(n=i.length?this.joinFragmentArrays(i,", "):[this.makeCode("void 0")],i.length>1&&e.level>=C?this.wrapInBraces(n):n)},t.prototype.compileRoot=function(e){var t,n,i,s,r,o,a,c,h,l;for(e.indent=e.bare?"":H,e.level=N,this.spaced=!0,e.scope=new V(null,this,null),l=e.locals||[],c=0,h=l.length;h>c;c++)s=l[c],e.scope.parameter(s);return r=[],e.bare||(o=function(){var e,n,s,r;for(s=this.expressions,r=[],i=e=0,n=s.length;n>e&&(t=s[i],t.unwrap()instanceof u);i=++e)r.push(t);return r}.call(this),a=this.expressions.slice(o.length),this.expressions=o,o.length&&(r=this.compileNode(at(e,{indent:""})),r.push(this.makeCode("\n"))),this.expressions=a),n=this.compileWithDeclarations(e),e.bare?n:[].concat(r,this.makeCode("(function() {\n"),n,this.makeCode("\n}).call(this);\n"))},t.prototype.compileWithDeclarations=function(e){var t,n,i,s,r,o,a,c,h,l,p,d,f,m;for(s=[],o=[],d=this.expressions,r=l=0,p=d.length;p>l&&(i=d[r],i=i.unwrap(),i instanceof u||i instanceof x);r=++l);return e=at(e,{level:N}),r&&(a=this.expressions.splice(r,9e9),f=[this.spaced,!1],h=f[0],this.spaced=f[1],m=[this.compileNode(e),h],s=m[0],this.spaced=m[1],this.expressions=a),o=this.compileNode(e),c=e.scope,c.expressions===this&&(n=e.scope.hasDeclarations(),t=c.hasAssignments,n||t?(r&&s.push(this.makeCode("\n")),s.push(this.makeCode(""+this.tab+"var ")),n&&s.push(this.makeCode(c.declaredVariables().join(", "))),t&&(n&&s.push(this.makeCode(",\n"+(this.tab+H))),s.push(this.makeCode(c.assignedVariables().join(",\n"+(this.tab+H))))),s.push(this.makeCode(";\n"+(this.spaced?"\n":"")))):s.length&&o.length&&s.push(this.makeCode("\n"))),s.concat(o)},t.wrap=function(e){return 1===e.length&&e[0]instanceof t?e[0]:new t(e)},t}(s),e.Literal=x=function(e){function t(e){this.value=e}return yt(t,e),t.prototype.makeReturn=function(){return this.isStatement()?this:t.__super__.makeReturn.apply(this,arguments)},t.prototype.isAssignable=function(){return m.test(this.value)},t.prototype.isStatement=function(){var e;return"break"===(e=this.value)||"continue"===e||"debugger"===e},t.prototype.isComplex=S,t.prototype.assigns=function(e){return e===this.value},t.prototype.jumps=function(e){return"break"!==this.value||(null!=e?e.loop:void 0)||(null!=e?e.block:void 0)?"continue"!==this.value||(null!=e?e.loop:void 0)?void 0:this:this},t.prototype.compileNode=function(e){var t,n,i;return n="this"===this.value?(null!=(i=e.scope.method)?i.bound:void 0)?e.scope.method.context:this.value:this.value.reserved?'"'+this.value+'"':this.value,t=this.isStatement()?""+this.tab+n+";":n,[this.makeCode(t)]},t.prototype.toString=function(){return' "'+this.value+'"'},t}(s),e.Undefined=function(e){function t(){return bt=t.__super__.constructor.apply(this,arguments)}return yt(t,e),t.prototype.isAssignable=S,t.prototype.isComplex=S,t.prototype.compileNode=function(e){return[this.makeCode(e.level>=w?"(void 0)":"void 0")]},t}(s),e.Null=function(e){function t(){return kt=t.__super__.constructor.apply(this,arguments)}return yt(t,e),t.prototype.isAssignable=S,t.prototype.isComplex=S,t.prototype.compileNode=function(){return[this.makeCode("null")]},t}(s),e.Bool=function(e){function t(e){this.val=e}return yt(t,e),t.prototype.isAssignable=S,t.prototype.isComplex=S,t.prototype.compileNode=function(){return[this.makeCode(this.val)]},t}(s),e.Return=j=function(e){function t(e){e&&!e.unwrap().isUndefined&&(this.expression=e)}return yt(t,e),t.prototype.children=["expression"],t.prototype.isStatement=J,t.prototype.makeReturn=G,t.prototype.jumps=G,t.prototype.compileToFragments=function(e,n){var i,s;return i=null!=(s=this.expression)?s.makeReturn():void 0,!i||i instanceof t?t.__super__.compileToFragments.call(this,e,n):i.compileToFragments(e,n)},t.prototype.compileNode=function(e){var t;return t=[],t.push(this.makeCode(this.tab+("return"+(this.expression?" ":"")))),this.expression&&(t=t.concat(this.expression.compileToFragments(e,L))),t.push(this.makeCode(";")),t},t}(s),e.Value=K=function(e){function t(e,n,i){return!n&&e instanceof t?e:(this.base=e,this.properties=n||[],i&&(this[i]=!0),this)}return yt(t,e),t.prototype.children=["base","properties"],t.prototype.add=function(e){return this.properties=this.properties.concat(e),this},t.prototype.hasProperties=function(){return!!this.properties.length},t.prototype.isArray=function(){return!this.properties.length&&this.base instanceof n},t.prototype.isComplex=function(){return this.hasProperties()||this.base.isComplex()},t.prototype.isAssignable=function(){return this.hasProperties()||this.base.isAssignable()},t.prototype.isSimpleNumber=function(){return this.base instanceof x&&M.test(this.base.value)},t.prototype.isString=function(){return this.base instanceof x&&k.test(this.base.value)},t.prototype.isAtomic=function(){var e,t,n,i;for(i=this.properties.concat(this.base),t=0,n=i.length;n>t;t++)if(e=i[t],e.soak||e instanceof o)return!1;return!0},t.prototype.isStatement=function(e){return!this.properties.length&&this.base.isStatement(e)},t.prototype.assigns=function(e){return!this.properties.length&&this.base.assigns(e)},t.prototype.jumps=function(e){return!this.properties.length&&this.base.jumps(e)},t.prototype.isObject=function(e){return this.properties.length?!1:this.base instanceof R&&(!e||this.base.generated)},t.prototype.isSplice=function(){return rt(this.properties)instanceof P},t.prototype.unwrap=function(){return this.properties.length?this:this.base},t.prototype.cacheReference=function(e){var n,s,r,o;return r=rt(this.properties),this.properties.length<2&&!this.base.isComplex()&&!(null!=r?r.isComplex():void 0)?[this,this]:(n=new t(this.base,this.properties.slice(0,-1)),n.isComplex()&&(s=new x(e.scope.freeVariable("base")),n=new t(new _(new i(s,n)))),r?(r.isComplex()&&(o=new x(e.scope.freeVariable("name")),r=new v(new i(o,r.index)),o=new v(o)),[n.add(r),new t(s||n.base,[o||r])]):[n,s])},t.prototype.compileNode=function(e){var t,n,i,s,r;for(this.base.front=this.front,i=this.properties,t=this.base.compileToFragments(e,i.length?w:null),(this.base instanceof _||i.length)&&M.test(st(t))&&t.push(this.makeCode(".")),s=0,r=i.length;r>s;s++)n=i[s],t.push.apply(t,n.compileToFragments(e));return t},t.prototype.unfoldSoak=function(e){var n=this;return null!=this.unfoldedSoak?this.unfoldedSoak:this.unfoldedSoak=function(){var s,r,o,a,c,h,l,u,d,f;if(o=n.base.unfoldSoak(e))return(d=o.body.properties).push.apply(d,n.properties),o;for(f=n.properties,r=l=0,u=f.length;u>l;r=++l)if(a=f[r],a.soak)return a.soak=!1,s=new t(n.base,n.properties.slice(0,r)),h=new t(n.base,n.properties.slice(r)),s.isComplex()&&(c=new x(e.scope.freeVariable("ref")),s=new _(new i(c,s)),h.base=c),new g(new p(s),h,{soak:!0});return!1}()},t}(s),e.Comment=u=function(e){function t(e){this.comment=e}return yt(t,e),t.prototype.isStatement=J,t.prototype.makeReturn=G,t.prototype.compileNode=function(e,t){var n;return n="/*"+ct(this.comment,this.tab)+(vt.call(this.comment,"\n")>=0?"\n"+this.tab:"")+"*/\n",(t||e.level)===N&&(n=e.indent+n),[this.makeCode(n)]},t}(s),e.Call=o=function(e){function n(e,t,n){this.args=null!=t?t:[],this.soak=n,this.isNew=!1,this.isSuper="super"===e,this.variable=this.isSuper?null:e}return yt(n,e),n.prototype.children=["variable","args"],n.prototype.newInstance=function(){var e,t;return e=(null!=(t=this.variable)?t.base:void 0)||this.variable,e instanceof n&&!e.isNew?e.newInstance():this.isNew=!0,this},n.prototype.superReference=function(e){var n,i;return i=e.scope.namedMethod(),(null!=i?i.klass:void 0)?(n=[new t(new x("__super__"))],i["static"]&&n.push(new t(new x("constructor"))),n.push(new t(new x(i.name))),new K(new x(i.klass),n).compile(e)):(null!=i?i.ctor:void 0)?""+i.name+".__super__.constructor":this.error("cannot call super outside of an instance method.")},n.prototype.superThis=function(e){var t;return t=e.scope.method,t&&!t.klass&&t.context||"this"},n.prototype.unfoldSoak=function(e){var t,i,s,r,o,a,c,h,l;if(this.soak){if(this.variable){if(i=pt(e,this,"variable"))return i;h=new K(this.variable).cacheReference(e),s=h[0],o=h[1]}else s=new x(this.superReference(e)),o=new K(s);return o=new n(o,this.args),o.isNew=this.isNew,s=new x("typeof "+s.compile(e)+' === "function"'),new g(s,new K(o),{soak:!0})}for(t=this,r=[];;)if(t.variable instanceof n)r.push(t),t=t.variable;else{if(!(t.variable instanceof K))break;if(r.push(t),!((t=t.variable.base)instanceof n))break}for(l=r.reverse(),a=0,c=l.length;c>a;a++)t=l[a],i&&(t.variable instanceof n?t.variable=i:t.variable.base=i),i=pt(e,t,"variable");return i},n.prototype.compileNode=function(e){var t,n,i,s,r,o,a,c,h,l;if(null!=(h=this.variable)&&(h.front=this.front),s=U.compileSplattedArray(e,this.args,!0),s.length)return this.compileSplat(e,s);for(i=[],l=this.args,n=a=0,c=l.length;c>a;n=++a)t=l[n],n&&i.push(this.makeCode(", ")),i.push.apply(i,t.compileToFragments(e,C));return r=[],this.isSuper?(o=this.superReference(e)+(".call("+this.superThis(e)),i.length&&(o+=", "),r.push(this.makeCode(o))):(this.isNew&&r.push(this.makeCode("new ")),r.push.apply(r,this.variable.compileToFragments(e,w)),r.push(this.makeCode("("))),r.push.apply(r,i),r.push(this.makeCode(")")),r},n.prototype.compileSplat=function(e,t){var n,i,s,r,o,a;return this.isSuper?[].concat(this.makeCode(""+this.superReference(e)+".apply("+this.superThis(e)+", "),t,this.makeCode(")")):this.isNew?(r=this.tab+H,[].concat(this.makeCode("(function(func, args, ctor) {\n"+r+"ctor.prototype = func.prototype;\n"+r+"var child = new ctor, result = func.apply(child, args);\n"+r+"return Object(result) === result ? result : child;\n"+this.tab+"})("),this.variable.compileToFragments(e,C),this.makeCode(", "),t,this.makeCode(", function(){})"))):(n=[],i=new K(this.variable),(o=i.properties.pop())&&i.isComplex()?(a=e.scope.freeVariable("ref"),n=n.concat(this.makeCode("("+a+" = "),i.compileToFragments(e,C),this.makeCode(")"),o.compileToFragments(e))):(s=i.compileToFragments(e,w),M.test(st(s))&&(s=this.wrapInBraces(s)),o?(a=st(s),s.push.apply(s,o.compileToFragments(e))):a="null",n=n.concat(s)),n=n.concat(this.makeCode(".apply("+a+", "),t,this.makeCode(")")))},n}(s),e.Extends=d=function(e){function t(e,t){this.child=e,this.parent=t}return yt(t,e),t.prototype.children=["child","parent"],t.prototype.compileToFragments=function(e){return new o(new K(new x(dt("extends"))),[this.child,this.parent]).compileToFragments(e)},t}(s),e.Access=t=function(e){function t(e,t){this.name=e,this.name.asKey=!0,this.soak="soak"===t}return yt(t,e),t.prototype.children=["name"],t.prototype.compileToFragments=function(e){var t;return t=this.name.compileToFragments(e),m.test(st(t))?t.unshift(this.makeCode(".")):(t.unshift(this.makeCode("[")),t.push(this.makeCode("]"))),t},t.prototype.isComplex=S,t}(s),e.Index=v=function(e){function t(e){this.index=e}return yt(t,e),t.prototype.children=["index"],t.prototype.compileToFragments=function(e){return[].concat(this.makeCode("["),this.index.compileToFragments(e,L),this.makeCode("]"))},t.prototype.isComplex=function(){return this.index.isComplex()},t}(s),e.Range=O=function(e){function t(e,t,n){this.from=e,this.to=t,this.exclusive="exclusive"===n,this.equals=this.exclusive?"":"="}return yt(t,e),t.prototype.children=["from","to"],t.prototype.compileVariables=function(e){var t,n,i,s,r;return e=at(e,{top:!0}),n=this.cacheToCodeFragments(this.from.cache(e,C)),this.fromC=n[0],this.fromVar=n[1],i=this.cacheToCodeFragments(this.to.cache(e,C)),this.toC=i[0],this.toVar=i[1],(t=et(e,"step"))&&(s=this.cacheToCodeFragments(t.cache(e,C)),this.step=s[0],this.stepVar=s[1]),r=[this.fromVar.match(M),this.toVar.match(M)],this.fromNum=r[0],this.toNum=r[1],this.stepVar?this.stepNum=this.stepVar.match(M):void 0},t.prototype.compileNode=function(e){var t,n,i,s,r,o,a,c,h,l,u,p,d,f;return this.fromVar||this.compileVariables(e),e.index?(a=this.fromNum&&this.toNum,r=et(e,"index"),o=et(e,"name"),h=o&&o!==r,p=""+r+" = "+this.fromC,this.toC!==this.toVar&&(p+=", "+this.toC),this.step!==this.stepVar&&(p+=", "+this.step),d=[""+r+" <"+this.equals,""+r+" >"+this.equals],c=d[0],s=d[1],n=this.stepNum?+this.stepNum>0?""+c+" "+this.toVar:""+s+" "+this.toVar:a?(f=[+this.fromNum,+this.toNum],i=f[0],u=f[1],f,u>=i?""+c+" "+u:""+s+" "+u):(t=this.stepVar?""+this.stepVar+" > 0":""+this.fromVar+" <= "+this.toVar,""+t+" ? "+c+" "+this.toVar+" : "+s+" "+this.toVar),l=this.stepVar?""+r+" += "+this.stepVar:a?h?u>=i?"++"+r:"--"+r:u>=i?""+r+"++":""+r+"--":h?""+t+" ? ++"+r+" : --"+r:""+t+" ? "+r+"++ : "+r+"--",h&&(p=""+o+" = "+p),h&&(l=""+o+" = "+l),[this.makeCode(""+p+"; "+n+"; "+l)]):this.compileArray(e)},t.prototype.compileArray=function(e){var t,n,i,s,r,o,a,c,h,l,u,p,d;return this.fromNum&&this.toNum&&Math.abs(this.fromNum-this.toNum)<=20?(h=function(){d=[];for(var e=p=+this.fromNum,t=+this.toNum;t>=p?t>=e:e>=t;t>=p?e++:e--)d.push(e);return d}.apply(this),this.exclusive&&h.pop(),[this.makeCode("["+h.join(", ")+"]")]):(o=this.tab+H,r=e.scope.freeVariable("i"),l=e.scope.freeVariable("results"),c="\n"+o+l+" = [];",this.fromNum&&this.toNum?(e.index=r,n=st(this.compileNode(e))):(u=""+r+" = "+this.fromC+(this.toC!==this.toVar?", "+this.toC:""),i=""+this.fromVar+" <= "+this.toVar,n="var "+u+"; "+i+" ? "+r+" <"+this.equals+" "+this.toVar+" : "+r+" >"+this.equals+" "+this.toVar+"; "+i+" ? "+r+"++ : "+r+"--"),a="{ "+l+".push("+r+"); }\n"+o+"return "+l+";\n"+e.indent,s=function(e){return null!=e?e.contains(function(e){return e instanceof x&&"arguments"===e.value&&!e.asKey}):void 0},(s(this.from)||s(this.to))&&(t=", arguments"),[this.makeCode("(function() {"+c+"\n"+o+"for ("+n+")"+a+"}).apply(this"+(null!=t?t:"")+")")])},t}(s),e.Slice=P=function(e){function t(e){this.range=e,t.__super__.constructor.call(this)}return yt(t,e),t.prototype.children=["range"],t.prototype.compileNode=function(e){var t,n,i,s,r,o,a;return a=this.range,r=a.to,i=a.from,s=i&&i.compileToFragments(e,L)||[this.makeCode("0")],r&&(t=r.compileToFragments(e,L),n=st(t),(this.range.exclusive||-1!==+n)&&(o=", "+(this.range.exclusive?n:M.test(n)?""+(+n+1):(t=r.compileToFragments(e,w),"+"+st(t)+" + 1 || 9e9")))),[this.makeCode(".slice("+st(s)+(o||"")+")")]},t}(s),e.Obj=R=function(e){function t(e,t){this.generated=null!=t?t:!1,this.objects=this.properties=e||[]}return yt(t,e),t.prototype.children=["properties"],t.prototype.compileNode=function(e){var t,n,s,r,o,a,c,h,l,p,d,f,m;if(l=this.properties,!l.length)return[this.makeCode(this.front?"({})":"{}")];if(this.generated)for(p=0,f=l.length;f>p;p++)c=l[p],c instanceof K&&c.error("cannot have an implicit value in an implicit object");for(s=e.indent+=H,a=this.lastNonComment(this.properties),t=[],n=d=0,m=l.length;m>d;n=++d)h=l[n],o=n===l.length-1?"":h===a||h instanceof u?"\n":",\n",r=h instanceof u?"":s,h instanceof i&&h.variable instanceof K&&h.variable.hasProperties()&&h.variable.error("Invalid object key"),h instanceof K&&h["this"]&&(h=new i(h.properties[0].name,h,"object")),h instanceof u||(h instanceof i||(h=new i(h,h,"object")),(h.variable.base||h.variable).asKey=!0),r&&t.push(this.makeCode(r)),t.push.apply(t,h.compileToFragments(e,N)),o&&t.push(this.makeCode(o));return t.unshift(this.makeCode("{"+(l.length&&"\n"))),t.push(this.makeCode(""+(l.length&&"\n"+this.tab)+"}")),this.front?this.wrapInBraces(t):t},t.prototype.assigns=function(e){var t,n,i,s;for(s=this.properties,n=0,i=s.length;i>n;n++)if(t=s[n],t.assigns(e))return!0;return!1},t}(s),e.Arr=n=function(e){function t(e){this.objects=e||[]}return yt(t,e),t.prototype.children=["objects"],t.prototype.compileNode=function(e){var t,n,i,s,r,o,a;if(!this.objects.length)return[this.makeCode("[]")];if(e.indent+=H,t=U.compileSplattedArray(e,this.objects),t.length)return t;for(t=[],n=function(){var t,n,i,s;for(i=this.objects,s=[],t=0,n=i.length;n>t;t++)r=i[t],s.push(r.compileToFragments(e,C));return s}.call(this),s=o=0,a=n.length;a>o;s=++o)i=n[s],s&&t.push(this.makeCode(", ")),t.push.apply(t,i);return st(t).indexOf("\n")>=0?(t.unshift(this.makeCode("[\n"+e.indent)),t.push(this.makeCode("\n"+this.tab+"]"))):(t.unshift(this.makeCode("[")),t.push(this.makeCode("]"))),t},t.prototype.assigns=function(e){var t,n,i,s;for(s=this.objects,n=0,i=s.length;i>n;n++)if(t=s[n],t.assigns(e))return!0;return!1},t}(s),e.Class=a=function(e){function n(e,t,n){this.variable=e,this.parent=t,this.body=null!=n?n:new r,this.boundFuncs=[],this.body.classBody=!0}return yt(n,e),n.prototype.children=["variable","parent","body"],n.prototype.determineName=function(){var e,n;return this.variable?(e=(n=rt(this.variable.properties))?n instanceof t&&n.name.value:this.variable.base.value,vt.call(B,e)>=0&&this.variable.error("class variable name may not be "+e),e&&(e=m.test(e)&&e)):null},n.prototype.setContext=function(e){return this.body.traverseChildren(!1,function(t){return t.classBody?!1:t instanceof x&&"this"===t.value?t.value=e:t instanceof h&&(t.klass=e,t.bound)?t.context=e:void 0})},n.prototype.addBoundFunctions=function(e){var n,i,s,r,o;for(o=this.boundFuncs,s=0,r=o.length;r>s;s++)n=o[s],i=new K(new x("this"),[new t(n)]).compile(e),this.ctor.body.unshift(new x(""+i+" = "+dt("bind")+"("+i+", this)"))},n.prototype.addProperties=function(e,n,s){var r,o,a,c,l;return l=e.base.properties.slice(0),a=function(){var e;for(e=[];r=l.shift();)r instanceof i&&(o=r.variable.base,delete r.context,c=r.value,"constructor"===o.value?(this.ctor&&r.error("cannot define more than one constructor in a class"),c.bound&&r.error("cannot define a constructor as a bound function"),c instanceof h?r=this.ctor=c:(this.externalCtor=s.scope.freeVariable("class"),r=new i(new x(this.externalCtor),c))):r.variable["this"]?(c["static"]=!0,c.bound&&(c.context=n)):(r.variable=new K(new x(n),[new t(new x("prototype")),new t(o)]),c instanceof h&&c.bound&&(this.boundFuncs.push(o),c.bound=!1))),e.push(r);return e}.call(this),Q(a)},n.prototype.walkBody=function(e,t){var i=this;return this.traverseChildren(!1,function(s){var o,a,c,h,l,u,p;if(o=!0,s instanceof n)return!1;if(s instanceof r){for(p=a=s.expressions,c=l=0,u=p.length;u>l;c=++l)h=p[c],h instanceof K&&h.isObject(!0)&&(o=!1,a[c]=i.addProperties(h,e,t));s.expressions=a=it(a)}return o&&!(s instanceof n)})},n.prototype.hoistDirectivePrologue=function(){var e,t,n;for(t=0,e=this.body.expressions;(n=e[t])&&n instanceof u||n instanceof K&&n.isString();)++t;return this.directives=e.splice(0,t)},n.prototype.ensureConstructor=function(e,t){var n,s,r;return n=!this.ctor,this.ctor||(this.ctor=new h),this.ctor.ctor=this.ctor.name=e,this.ctor.klass=null,this.ctor.noReturn=!0,n?(this.parent&&(r=new x(""+e+".__super__.constructor.apply(this, arguments)")),this.externalCtor&&(r=new x(""+this.externalCtor+".apply(this, arguments)")),r&&(s=new x(t.scope.freeVariable("ref")),this.ctor.body.unshift(new i(s,r))),this.addBoundFunctions(t),r&&(this.ctor.body.push(s),this.ctor.body.makeReturn()),this.body.expressions.unshift(this.ctor)):this.addBoundFunctions(t)},n.prototype.compileNode=function(e){var t,n,s,r,o,a,l;return n=this.determineName(),o=n||"_Class",o.reserved&&(o="_"+o),r=new x(o),this.hoistDirectivePrologue(),this.setContext(o),this.walkBody(o,e),this.ensureConstructor(o,e),this.body.spaced=!0,this.ctor instanceof h||this.body.expressions.unshift(this.ctor),this.body.expressions.push(r),(l=this.body.expressions).unshift.apply(l,this.directives),t=c.wrap(this.body),this.parent&&(this.superClass=new x(e.scope.freeVariable("super",!1)),this.body.expressions.unshift(new d(r,this.superClass)),t.args.push(this.parent),a=t.variable.params||t.variable.base.params,a.push(new I(this.superClass))),s=new _(t,!0),this.variable&&(s=new i(this.variable,s)),s.compileToFragments(e)},n}(s),e.Assign=i=function(e){function n(e,t,n,i){var s,r,o;this.variable=e,this.value=t,this.context=n,this.param=i&&i.param,this.subpattern=i&&i.subpattern,o=r=this.variable.unwrapAll().value,s=vt.call(B,o)>=0,s&&"object"!==this.context&&this.variable.error('variable name may not be "'+r+'"')}return yt(n,e),n.prototype.children=["variable","value"],n.prototype.isStatement=function(e){return(null!=e?e.level:void 0)===N&&null!=this.context&&vt.call(this.context,"?")>=0},n.prototype.assigns=function(e){return this["object"===this.context?"value":"variable"].assigns(e)},n.prototype.unfoldSoak=function(e){return pt(e,this,"variable")},n.prototype.compileNode=function(e){var t,n,i,s,r,o,a,c,l,u,p;if(i=this.variable instanceof K){if(this.variable.isArray()||this.variable.isObject())return this.compilePatternMatch(e);if(this.variable.isSplice())return this.compileSplice(e);if("||="===(c=this.context)||"&&="===c||"?="===c)return this.compileConditional(e)}return n=this.variable.compileToFragments(e,C),r=st(n),this.context||(a=this.variable.unwrapAll(),a.isAssignable()||this.variable.error('"'+this.variable.compile(e)+'" cannot be assigned'),("function"==typeof a.hasProperties?a.hasProperties():void 0)||(this.param?e.scope.add(r,"var"):e.scope.find(r))),this.value instanceof h&&(s=E.exec(r))&&(s[1]&&(this.value.klass=s[1]),this.value.name=null!=(l=null!=(u=null!=(p=s[2])?p:s[3])?u:s[4])?l:s[5]),o=this.value.compileToFragments(e,C),"object"===this.context?n.concat(this.makeCode(": "),o):(t=n.concat(this.makeCode(" "+(this.context||"=")+" "),o),e.level<=C?t:this.wrapInBraces(t))},n.prototype.compilePatternMatch=function(e){var i,s,r,o,a,c,h,l,u,p,d,f,b,k,g,y,w,T,L,E,D,S,R,A,I,O,j,M;if(y=e.level===N,T=this.value,d=this.variable.base.objects,!(f=d.length))return r=T.compileToFragments(e),e.level>=F?this.wrapInBraces(r):r;if(h=this.variable.isObject(),y&&1===f&&!((p=d[0])instanceof U))return p instanceof n?(R=p,A=R.variable,c=A.base,p=R.value):c=h?p["this"]?p.properties[0].name:p:new x(0),i=m.test(c.unwrap().value||0),T=new K(T),T.properties.push(new(i?t:v)(c)),I=p.unwrap().value,vt.call($,I)>=0&&p.error("assignment to a reserved word: "+p.compile(e)),new n(p,T,null,{param:this.param}).compileToFragments(e,N);for(L=T.compileToFragments(e,C),E=st(L),s=[],g=!1,(!m.test(E)||this.variable.assigns(E))&&(s.push([this.makeCode(""+(b=e.scope.freeVariable("ref"))+" = ")].concat(wt.call(L))),L=[this.makeCode(b)],E=b),a=D=0,S=d.length;S>D;a=++D)p=d[a],c=a,h&&(p instanceof n?(O=p,j=O.variable,c=j.base,p=O.value):p.base instanceof _?(M=new K(p.unwrapAll()).cacheReference(e),p=M[0],c=M[1]):c=p["this"]?p.properties[0].name:p),!g&&p instanceof U?(u=p.name.unwrap().value,p=p.unwrap(),w=""+f+" <= "+E+".length ? "+dt("slice")+".call("+E+", "+a,(k=f-a-1)?(l=e.scope.freeVariable("i"),w+=", "+l+" = "+E+".length - "+k+") : ("+l+" = "+a+", [])"):w+=") : []",w=new x(w),g=""+l+"++"):(u=p.unwrap().value,p instanceof U&&p.error("multiple splats are disallowed in an assignment"),"number"==typeof c?(c=new x(g||c),i=!1):i=h&&m.test(c.unwrap().value||0),w=new K(new x(E),[new(i?t:v)(c)])),null!=u&&vt.call($,u)>=0&&p.error("assignment to a reserved word: "+p.compile(e)),s.push(new n(p,w,null,{param:this.param,subpattern:!0}).compileToFragments(e,C));
return y||this.subpattern||s.push(L),o=this.joinFragmentArrays(s,", "),e.level<C?o:this.wrapInBraces(o)},n.prototype.compileConditional=function(e){var t,i,s;return s=this.variable.cacheReference(e),t=s[0],i=s[1],!t.properties.length&&t.base instanceof x&&"this"!==t.base.value&&!e.scope.check(t.base.value)&&this.variable.error('the variable "'+t.base.value+"\" can't be assigned with "+this.context+" because it has not been declared before"),vt.call(this.context,"?")>=0&&(e.isExistentialEquals=!0),new A(this.context.slice(0,-1),t,new n(i,this.value,"=")).compileToFragments(e)},n.prototype.compileSplice=function(e){var t,n,i,s,r,o,a,c,h,l,u,p;return l=this.variable.properties.pop().range,i=l.from,a=l.to,n=l.exclusive,o=this.variable.compile(e),i?(u=this.cacheToCodeFragments(i.cache(e,F)),s=u[0],r=u[1]):s=r="0",a?(null!=i?i.isSimpleNumber():void 0)&&a.isSimpleNumber()?(a=+a.compile(e)-+r,n||(a+=1)):(a=a.compile(e,w)+" - "+r,n||(a+=" + 1")):a="9e9",p=this.value.cache(e,C),c=p[0],h=p[1],t=[].concat(this.makeCode("[].splice.apply("+o+", ["+s+", "+a+"].concat("),c,this.makeCode(")), "),h),e.level>N?this.wrapInBraces(t):t},n}(s),e.Code=h=function(e){function t(e,t,n){this.params=e||[],this.body=t||new r,this.bound="boundfunc"===n,this.bound&&(this.context="_this")}return yt(t,e),t.prototype.children=["params","body"],t.prototype.isStatement=function(){return!!this.ctor},t.prototype.jumps=S,t.prototype.compileNode=function(e){var t,s,r,o,a,c,h,l,u,p,d,f,m,b,k,y,v,T,C,F,L,N,E,D,S,R,I,_,$;for(e.scope=new V(e.scope,this.body,this),e.scope.shared=et(e,"sharedScope"),e.indent+=H,delete e.bare,delete e.isExistentialEquals,u=[],r=[],this.eachParamName(function(t){return e.scope.check(t)?void 0:e.scope.parameter(t)}),S=this.params,k=0,C=S.length;C>k;k++)if(l=S[k],l.splat){for(R=this.params,y=0,F=R.length;F>y;y++)h=R[y].name,h["this"]&&(h=h.properties[0].name),h.value&&e.scope.add(h.value,"var",!0);d=new i(new K(new n(function(){var t,n,i,s;for(i=this.params,s=[],t=0,n=i.length;n>t;t++)h=i[t],s.push(h.asReference(e));return s}.call(this))),new K(new x("arguments")));break}for(I=this.params,v=0,L=I.length;L>v;v++)l=I[v],l.isComplex()?(m=p=l.asReference(e),l.value&&(m=new A("?",p,l.value)),r.push(new i(new K(l.name),m,"=",{param:!0}))):(p=l,l.value&&(c=new x(p.name.value+" == null"),m=new i(new K(l.name),l.value,"="),r.push(new g(c,m)))),d||u.push(p);for(b=this.body.isEmpty(),d&&r.unshift(d),r.length&&(_=this.body.expressions).unshift.apply(_,r),o=T=0,N=u.length;N>T;o=++T)h=u[o],u[o]=h.compileToFragments(e),e.scope.parameter(st(u[o]));for(f=[],this.eachParamName(function(e,t){return vt.call(f,e)>=0&&t.error("multiple parameters named '"+e+"'"),f.push(e)}),b||this.noReturn||this.body.makeReturn(),this.bound&&((null!=($=e.scope.parent.method)?$.bound:void 0)?this.bound=this.context=e.scope.parent.method.context:this["static"]||e.scope.parent.assign("_this","this")),a=e.indent,s="function",this.ctor&&(s+=" "+this.name),s+="(",t=[this.makeCode(s)],o=D=0,E=u.length;E>D;o=++D)h=u[o],o&&t.push(this.makeCode(", ")),t.push.apply(t,h);return t.push(this.makeCode(") {")),this.body.isEmpty()||(t=t.concat(this.makeCode("\n"),this.body.compileWithDeclarations(e),this.makeCode("\n"+this.tab))),t.push(this.makeCode("}")),this.ctor?[this.makeCode(this.tab)].concat(wt.call(t)):this.front||e.level>=w?this.wrapInBraces(t):t},t.prototype.eachParamName=function(e){var t,n,i,s,r;for(s=this.params,r=[],n=0,i=s.length;i>n;n++)t=s[n],r.push(t.eachName(e));return r},t.prototype.traverseChildren=function(e,n){return e?t.__super__.traverseChildren.call(this,e,n):void 0},t}(s),e.Param=I=function(e){function t(e,t,n){var i;this.name=e,this.value=t,this.splat=n,i=e=this.name.unwrapAll().value,vt.call(B,i)>=0&&this.name.error('parameter name "'+e+'" is not allowed')}return yt(t,e),t.prototype.children=["name","value"],t.prototype.compileToFragments=function(e){return this.name.compileToFragments(e,C)},t.prototype.asReference=function(e){var t;return this.reference?this.reference:(t=this.name,t["this"]?(t=t.properties[0].name,t.value.reserved&&(t=new x(e.scope.freeVariable(t.value)))):t.isComplex()&&(t=new x(e.scope.freeVariable("arg"))),t=new K(t),this.splat&&(t=new U(t)),this.reference=t)},t.prototype.isComplex=function(){return this.name.isComplex()},t.prototype.eachName=function(e,t){var n,s,r,o,a,c;if(null==t&&(t=this.name),n=function(t){var n;return n=t.properties[0].name,n.value.reserved?void 0:e(n.value,n)},t instanceof x)return e(t.value,t);if(t instanceof K)return n(t);for(c=t.objects,o=0,a=c.length;a>o;o++)r=c[o],r instanceof i?this.eachName(e,r.value.unwrap()):r instanceof U?(s=r.name.unwrap(),e(s.value,s)):r instanceof K?r.isArray()||r.isObject()?this.eachName(e,r.base):r["this"]?n(r):e(r.base.value,r.base):r.error("illegal parameter "+r.compile())},t}(s),e.Splat=U=function(e){function t(e){this.name=e.compile?e:new x(e)}return yt(t,e),t.prototype.children=["name"],t.prototype.isAssignable=J,t.prototype.assigns=function(e){return this.name.assigns(e)},t.prototype.compileToFragments=function(e){return this.name.compileToFragments(e)},t.prototype.unwrap=function(){return this.name},t.compileSplattedArray=function(e,n,i){var s,r,o,a,c,h,l,u,p,d;for(l=-1;(u=n[++l])&&!(u instanceof t););if(l>=n.length)return[];if(1===n.length)return u=n[0],c=u.compileToFragments(e,C),i?c:[].concat(u.makeCode(""+dt("slice")+".call("),c,u.makeCode(")"));for(s=n.slice(l),h=p=0,d=s.length;d>p;h=++p)u=s[h],o=u.compileToFragments(e,C),s[h]=u instanceof t?[].concat(u.makeCode(""+dt("slice")+".call("),o,u.makeCode(")")):[].concat(u.makeCode("["),o,u.makeCode("]"));return 0===l?(u=n[0],a=u.joinFragmentArrays(s.slice(1),", "),s[0].concat(u.makeCode(".concat("),a,u.makeCode(")"))):(r=function(){var t,i,s,r;for(s=n.slice(0,l),r=[],t=0,i=s.length;i>t;t++)u=s[t],r.push(u.compileToFragments(e,C));return r}(),r=n[0].joinFragmentArrays(r,", "),a=n[l].joinFragmentArrays(s,", "),[].concat(n[0].makeCode("["),r,n[l].makeCode("].concat("),a,rt(n).makeCode(")")))},t}(s),e.While=z=function(e){function t(e,t){this.condition=(null!=t?t.invert:void 0)?e.invert():e,this.guard=null!=t?t.guard:void 0}return yt(t,e),t.prototype.children=["condition","guard","body"],t.prototype.isStatement=J,t.prototype.makeReturn=function(e){return e?t.__super__.makeReturn.apply(this,arguments):(this.returns=!this.jumps({loop:!0}),this)},t.prototype.addBody=function(e){return this.body=e,this},t.prototype.jumps=function(){var e,t,n,i;if(e=this.body.expressions,!e.length)return!1;for(n=0,i=e.length;i>n;n++)if(t=e[n],t.jumps({loop:!0}))return t;return!1},t.prototype.compileNode=function(e){var t,n,i,s;return e.indent+=H,s="",n=this.body,n.isEmpty()?n=this.makeCode(""):(this.returns&&(n.makeReturn(i=e.scope.freeVariable("results")),s=""+this.tab+i+" = [];\n"),this.guard&&(n.expressions.length>1?n.expressions.unshift(new g(new _(this.guard).invert(),new x("continue"))):this.guard&&(n=r.wrap([new g(this.guard,n)]))),n=[].concat(this.makeCode("\n"),n.compileToFragments(e,N),this.makeCode("\n"+this.tab))),t=[].concat(this.makeCode(s+this.tab+"while ("),this.condition.compileToFragments(e,L),this.makeCode(") {"),n,this.makeCode("}")),this.returns&&t.push(this.makeCode("\n"+this.tab+"return "+i+";")),t},t}(s),e.Op=A=function(e){function t(e,t,i,s){if("in"===e)return new y(t,i);if("do"===e)return this.generateDo(t);if("new"===e){if(t instanceof o&&!t["do"]&&!t.isNew)return t.newInstance();(t instanceof h&&t.bound||t["do"])&&(t=new _(t))}return this.operator=n[e]||e,this.first=t,this.second=i,this.flip=!!s,this}var n,s;return yt(t,e),n={"==":"===","!=":"!==",of:"in"},s={"!==":"===","===":"!=="},t.prototype.children=["first","second"],t.prototype.isSimpleNumber=S,t.prototype.isUnary=function(){return!this.second},t.prototype.isComplex=function(){var e;return!(this.isUnary()&&("+"===(e=this.operator)||"-"===e))||this.first.isComplex()},t.prototype.isChainable=function(){var e;return"<"===(e=this.operator)||">"===e||">="===e||"<="===e||"==="===e||"!=="===e},t.prototype.invert=function(){var e,n,i,r,o;if(this.isChainable()&&this.first.isChainable()){for(e=!0,n=this;n&&n.operator;)e&&(e=n.operator in s),n=n.first;if(!e)return new _(this).invert();for(n=this;n&&n.operator;)n.invert=!n.invert,n.operator=s[n.operator],n=n.first;return this}return(r=s[this.operator])?(this.operator=r,this.first.unwrap()instanceof t&&this.first.invert(),this):this.second?new _(this).invert():"!"===this.operator&&(i=this.first.unwrap())instanceof t&&("!"===(o=i.operator)||"in"===o||"instanceof"===o)?i:new t("!",this)},t.prototype.unfoldSoak=function(e){var t;return("++"===(t=this.operator)||"--"===t||"delete"===t)&&pt(e,this,"first")},t.prototype.generateDo=function(e){var t,n,s,r,a,c,l,u;for(r=[],n=e instanceof i&&(a=e.value.unwrap())instanceof h?a:e,u=n.params||[],c=0,l=u.length;l>c;c++)s=u[c],s.value?(r.push(s.value),delete s.value):r.push(s);return t=new o(e,r),t["do"]=!0,t},t.prototype.compileNode=function(e){var t,n,i,s;return n=this.isChainable()&&this.first.isChainable(),n||(this.first.front=this.front),"delete"===this.operator&&e.scope.check(this.first.unwrapAll().value)&&this.error("delete operand may not be argument or var"),("--"===(i=this.operator)||"++"===i)&&(s=this.first.unwrapAll().value,vt.call(B,s)>=0)&&this.error('cannot increment/decrement "'+this.first.unwrapAll().value+'"'),this.isUnary()?this.compileUnary(e):n?this.compileChain(e):"?"===this.operator?this.compileExistence(e):(t=[].concat(this.first.compileToFragments(e,F),this.makeCode(" "+this.operator+" "),this.second.compileToFragments(e,F)),e.level<=F?t:this.wrapInBraces(t))},t.prototype.compileChain=function(e){var t,n,i,s;return s=this.first.second.cache(e),this.first.second=s[0],i=s[1],n=this.first.compileToFragments(e,F),t=n.concat(this.makeCode(" "+(this.invert?"&&":"||")+" "),i.compileToFragments(e),this.makeCode(" "+this.operator+" "),this.second.compileToFragments(e,F)),this.wrapInBraces(t)},t.prototype.compileExistence=function(e){var t,n;return!e.isExistentialEquals&&this.first.isComplex()?(n=new x(e.scope.freeVariable("ref")),t=new _(new i(n,this.first))):(t=this.first,n=t),new g(new p(t),n,{type:"if"}).addElse(this.second).compileToFragments(e)},t.prototype.compileUnary=function(e){var n,i,s;return i=[],n=this.operator,i.push([this.makeCode(n)]),"!"===n&&this.first instanceof p?(this.first.negated=!this.first.negated,this.first.compileToFragments(e)):e.level>=w?new _(this).compileToFragments(e):(s="+"===n||"-"===n,("new"===n||"typeof"===n||"delete"===n||s&&this.first instanceof t&&this.first.operator===n)&&i.push([this.makeCode(" ")]),(s&&this.first instanceof t||"new"===n&&this.first.isStatement(e))&&(this.first=new _(this.first)),i.push(this.first.compileToFragments(e,F)),this.flip&&i.reverse(),this.joinFragmentArrays(i,""))},t.prototype.toString=function(e){return t.__super__.toString.call(this,e,this.constructor.name+" "+this.operator)},t}(s),e.In=y=function(e){function t(e,t){this.object=e,this.array=t}return yt(t,e),t.prototype.children=["object","array"],t.prototype.invert=D,t.prototype.compileNode=function(e){var t,n,i,s,r;if(this.array instanceof K&&this.array.isArray()){for(r=this.array.base.objects,i=0,s=r.length;s>i;i++)if(n=r[i],n instanceof U){t=!0;break}if(!t)return this.compileOrTest(e)}return this.compileLoopTest(e)},t.prototype.compileOrTest=function(e){var t,n,i,s,r,o,a,c,h,l,u,p;if(0===this.array.base.objects.length)return[this.makeCode(""+!!this.negated)];for(l=this.object.cache(e,F),o=l[0],r=l[1],u=this.negated?[" !== "," && "]:[" === "," || "],t=u[0],n=u[1],a=[],p=this.array.base.objects,i=c=0,h=p.length;h>c;i=++c)s=p[i],i&&a.push(this.makeCode(n)),a=a.concat(i?r:o,this.makeCode(t),s.compileToFragments(e,w));return e.level<F?a:this.wrapInBraces(a)},t.prototype.compileLoopTest=function(e){var t,n,i,s;return s=this.object.cache(e,C),i=s[0],n=s[1],t=[].concat(this.makeCode(dt("indexOf")+".call("),this.array.compileToFragments(e,C),this.makeCode(", "),n,this.makeCode(") "+(this.negated?"< 0":">= 0"))),st(i)===st(n)?t:(t=i.concat(this.makeCode(", "),t),e.level<C?t:this.wrapInBraces(t))},t.prototype.toString=function(e){return t.__super__.toString.call(this,e,this.constructor.name+(this.negated?"!":""))},t}(s),e.Try=X=function(e){function t(e,t,n,i){this.attempt=e,this.errorVariable=t,this.recovery=n,this.ensure=i}return yt(t,e),t.prototype.children=["attempt","recovery","ensure"],t.prototype.isStatement=J,t.prototype.jumps=function(e){var t;return this.attempt.jumps(e)||(null!=(t=this.recovery)?t.jumps(e):void 0)},t.prototype.makeReturn=function(e){return this.attempt&&(this.attempt=this.attempt.makeReturn(e)),this.recovery&&(this.recovery=this.recovery.makeReturn(e)),this},t.prototype.compileNode=function(e){var t,n,s,r;return e.indent+=H,r=this.attempt.compileToFragments(e,N),t=this.recovery?(s=new x("_error"),this.errorVariable?this.recovery.unshift(new i(this.errorVariable,s)):void 0,[].concat(this.makeCode(" catch ("),s.compileToFragments(e),this.makeCode(") {\n"),this.recovery.compileToFragments(e,N),this.makeCode("\n"+this.tab+"}"))):this.ensure||this.recovery?[]:[this.makeCode(" catch (_error) {}")],n=this.ensure?[].concat(this.makeCode(" finally {\n"),this.ensure.compileToFragments(e,N),this.makeCode("\n"+this.tab+"}")):[],[].concat(this.makeCode(""+this.tab+"try {\n"),r,this.makeCode("\n"+this.tab+"}"),t,n)},t}(s),e.Throw=W=function(e){function t(e){this.expression=e}return yt(t,e),t.prototype.children=["expression"],t.prototype.isStatement=J,t.prototype.jumps=S,t.prototype.makeReturn=G,t.prototype.compileNode=function(e){return[].concat(this.makeCode(this.tab+"throw "),this.expression.compileToFragments(e),this.makeCode(";"))},t}(s),e.Existence=p=function(e){function t(e){this.expression=e}return yt(t,e),t.prototype.children=["expression"],t.prototype.invert=D,t.prototype.compileNode=function(e){var t,n,i,s;return this.expression.front=this.front,i=this.expression.compile(e,F),m.test(i)&&!e.scope.check(i)?(s=this.negated?["===","||"]:["!==","&&"],t=s[0],n=s[1],i="typeof "+i+" "+t+' "undefined" '+n+" "+i+" "+t+" null"):i=""+i+" "+(this.negated?"==":"!=")+" null",[this.makeCode(e.level<=T?i:"("+i+")")]},t}(s),e.Parens=_=function(e){function t(e){this.body=e}return yt(t,e),t.prototype.children=["body"],t.prototype.unwrap=function(){return this.body},t.prototype.isComplex=function(){return this.body.isComplex()},t.prototype.compileNode=function(e){var t,n,i;return n=this.body.unwrap(),n instanceof K&&n.isAtomic()?(n.front=this.front,n.compileToFragments(e)):(i=n.compileToFragments(e,L),t=e.level<F&&(n instanceof A||n instanceof o||n instanceof f&&n.returns),t?i:this.wrapInBraces(i))},t}(s),e.For=f=function(e){function t(e,t){var n;this.source=t.source,this.guard=t.guard,this.step=t.step,this.name=t.name,this.index=t.index,this.body=r.wrap([e]),this.own=!!t.own,this.object=!!t.object,this.object&&(n=[this.index,this.name],this.name=n[0],this.index=n[1]),this.index instanceof K&&this.index.error("index cannot be a pattern matching expression"),this.range=this.source instanceof K&&this.source.base instanceof O&&!this.source.properties.length,this.pattern=this.name instanceof K,this.range&&this.index&&this.index.error("indexes do not apply to range loops"),this.range&&this.pattern&&this.name.error("cannot pattern match over range loops"),this.own&&!this.object&&this.index.error("cannot use own with for-in"),this.returns=!1}return yt(t,e),t.prototype.children=["body","source","guard","step"],t.prototype.compileNode=function(e){var t,n,s,o,a,c,h,l,u,p,d,f,b,k,y,v,w,T,F,L,E,D,S,R,A,I,$,O,B,V,P,U,q,G;return t=r.wrap([this.body]),T=null!=(q=rt(t.expressions))?q.jumps():void 0,T&&T instanceof j&&(this.returns=!1),$=this.range?this.source.base:this.source,I=e.scope,L=this.name&&this.name.compile(e,C),k=this.index&&this.index.compile(e,C),L&&!this.pattern&&I.find(L),k&&I.find(k),this.returns&&(A=I.freeVariable("results")),y=this.object&&k||I.freeVariable("i"),v=this.range&&L||k||y,w=v!==y?""+v+" = ":"",this.step&&!this.range&&(G=this.cacheToCodeFragments(this.step.cache(e,C)),O=G[0],V=G[1],B=V.match(M)),this.pattern&&(L=y),U="",d="",h="",f=this.tab+H,this.range?p=$.compileToFragments(at(e,{index:y,name:L,step:this.step})):(P=this.source.compile(e,C),!L&&!this.own||m.test(P)||(h+=""+this.tab+(D=I.freeVariable("ref"))+" = "+P+";\n",P=D),L&&!this.pattern&&(E=""+L+" = "+P+"["+v+"]"),this.object||(O!==V&&(h+=""+this.tab+O+";\n"),this.step&&B&&(u=0>+B)||(F=I.freeVariable("len")),a=""+w+y+" = 0, "+F+" = "+P+".length",c=""+w+y+" = "+P+".length - 1",s=""+y+" < "+F,o=""+y+" >= 0",this.step?(B?u&&(s=o,a=c):(s=""+V+" > 0 ? "+s+" : "+o,a="("+V+" > 0 ? ("+a+") : "+c+")"),b=""+y+" += "+V):b=""+(v!==y?"++"+y:""+y+"++"),p=[this.makeCode(""+a+"; "+s+"; "+w+b)])),this.returns&&(S=""+this.tab+A+" = [];\n",R="\n"+this.tab+"return "+A+";",t.makeReturn(A)),this.guard&&(t.expressions.length>1?t.expressions.unshift(new g(new _(this.guard).invert(),new x("continue"))):this.guard&&(t=r.wrap([new g(this.guard,t)]))),this.pattern&&t.expressions.unshift(new i(this.name,new x(""+P+"["+v+"]"))),l=[].concat(this.makeCode(h),this.pluckDirectCall(e,t)),E&&(U="\n"+f+E+";"),this.object&&(p=[this.makeCode(""+v+" in "+P)],this.own&&(d="\n"+f+"if (!"+dt("hasProp")+".call("+P+", "+v+")) continue;")),n=t.compileToFragments(at(e,{indent:f}),N),n&&n.length>0&&(n=[].concat(this.makeCode("\n"),n,this.makeCode("\n"))),[].concat(l,this.makeCode(""+(S||"")+this.tab+"for ("),p,this.makeCode(") {"+d+U),n,this.makeCode(""+this.tab+"}"+(R||"")))},t.prototype.pluckDirectCall=function(e,t){var n,s,r,a,c,l,u,p,d,f,m,b,k,g,y;for(s=[],f=t.expressions,c=p=0,d=f.length;d>p;c=++p)r=f[c],r=r.unwrapAll(),r instanceof o&&(u=r.variable.unwrapAll(),(u instanceof h||u instanceof K&&(null!=(m=u.base)?m.unwrapAll():void 0)instanceof h&&1===u.properties.length&&("call"===(b=null!=(k=u.properties[0].name)?k.value:void 0)||"apply"===b))&&(a=(null!=(g=u.base)?g.unwrapAll():void 0)||u,l=new x(e.scope.freeVariable("fn")),n=new K(l),u.base&&(y=[n,u],u.base=y[0],n=y[1]),t.expressions[c]=new o(n,r.args),s=s.concat(this.makeCode(this.tab),new i(l,a).compileToFragments(e,N),this.makeCode(";\n"))));return s},t}(z),e.Switch=q=function(e){function t(e,t,n){this.subject=e,this.cases=t,this.otherwise=n}return yt(t,e),t.prototype.children=["subject","cases","otherwise"],t.prototype.isStatement=J,t.prototype.jumps=function(e){var t,n,i,s,r,o,a;for(null==e&&(e={block:!0}),r=this.cases,i=0,s=r.length;s>i;i++)if(o=r[i],n=o[0],t=o[1],t.jumps(e))return t;return null!=(a=this.otherwise)?a.jumps(e):void 0},t.prototype.makeReturn=function(e){var t,n,i,s,o;for(s=this.cases,n=0,i=s.length;i>n;n++)t=s[n],t[1].makeReturn(e);return e&&(this.otherwise||(this.otherwise=new r([new x("void 0")]))),null!=(o=this.otherwise)&&o.makeReturn(e),this},t.prototype.compileNode=function(e){var t,n,i,s,r,o,a,c,h,l,u,p,d,f,m,b;for(c=e.indent+H,h=e.indent=c+H,o=[].concat(this.makeCode(this.tab+"switch ("),this.subject?this.subject.compileToFragments(e,L):this.makeCode("false"),this.makeCode(") {\n")),f=this.cases,a=l=0,p=f.length;p>l;a=++l){for(m=f[a],s=m[0],t=m[1],b=it([s]),u=0,d=b.length;d>u;u++)i=b[u],this.subject||(i=i.invert()),o=o.concat(this.makeCode(c+"case "),i.compileToFragments(e,L),this.makeCode(":\n"));if((n=t.compileToFragments(e,N)).length>0&&(o=o.concat(n,this.makeCode("\n"))),a===this.cases.length-1&&!this.otherwise)break;r=this.lastNonComment(t.expressions),r instanceof j||r instanceof x&&r.jumps()&&"debugger"!==r.value||o.push(i.makeCode(h+"break;\n"))}return this.otherwise&&this.otherwise.expressions.length&&o.push.apply(o,[this.makeCode(c+"default:\n")].concat(wt.call(this.otherwise.compileToFragments(e,N)),[this.makeCode("\n")])),o.push(this.makeCode(this.tab+"}")),o},t}(s),e.If=g=function(e){function t(e,t,n){this.body=t,null==n&&(n={}),this.condition="unless"===n.type?e.invert():e,this.elseBody=null,this.isChain=!1,this.soak=n.soak}return yt(t,e),t.prototype.children=["condition","body","elseBody"],t.prototype.bodyNode=function(){var e;return null!=(e=this.body)?e.unwrap():void 0},t.prototype.elseBodyNode=function(){var e;return null!=(e=this.elseBody)?e.unwrap():void 0},t.prototype.addElse=function(e){return this.isChain?this.elseBodyNode().addElse(e):(this.isChain=e instanceof t,this.elseBody=this.ensureBlock(e)),this},t.prototype.isStatement=function(e){var t;return(null!=e?e.level:void 0)===N||this.bodyNode().isStatement(e)||(null!=(t=this.elseBodyNode())?t.isStatement(e):void 0)},t.prototype.jumps=function(e){var t;return this.body.jumps(e)||(null!=(t=this.elseBody)?t.jumps(e):void 0)},t.prototype.compileNode=function(e){return this.isStatement(e)?this.compileStatement(e):this.compileExpression(e)},t.prototype.makeReturn=function(e){return e&&(this.elseBody||(this.elseBody=new r([new x("void 0")]))),this.body&&(this.body=new r([this.body.makeReturn(e)])),this.elseBody&&(this.elseBody=new r([this.elseBody.makeReturn(e)])),this},t.prototype.ensureBlock=function(e){return e instanceof r?e:new r([e])},t.prototype.compileStatement=function(e){var n,i,s,r,o,a,c;return s=et(e,"chainChild"),(o=et(e,"isExistentialEquals"))?new t(this.condition.invert(),this.elseBodyNode(),{type:"if"}).compileToFragments(e):(c=e.indent+H,r=this.condition.compileToFragments(e,L),i=this.ensureBlock(this.body).compileToFragments(at(e,{indent:c})),a=[].concat(this.makeCode("if ("),r,this.makeCode(") {\n"),i,this.makeCode("\n"+this.tab+"}")),s||a.unshift(this.makeCode(this.tab)),this.elseBody?(n=a.concat(this.makeCode(" else ")),this.isChain?(e.chainChild=!0,n=n.concat(this.elseBody.unwrap().compileToFragments(e,N))):n=n.concat(this.makeCode("{\n"),this.elseBody.compileToFragments(at(e,{indent:c}),N),this.makeCode("\n"+this.tab+"}")),n):a)},t.prototype.compileExpression=function(e){var t,n,i,s;return i=this.condition.compileToFragments(e,T),n=this.bodyNode().compileToFragments(e,C),t=this.elseBodyNode()?this.elseBodyNode().compileToFragments(e,C):[this.makeCode("void 0")],s=i.concat(this.makeCode(" ? "),n,this.makeCode(" : "),t),e.level>=T?this.wrapInBraces(s):s},t.prototype.unfoldSoak=function(){return this.soak&&this},t}(s),c={wrap:function(e,n,i){var s,a,c,l,u;return e.jumps()?e:(l=new h([],r.wrap([e])),s=[],a=e.contains(this.isLiteralArguments),a&&e.classBody&&a.error("Class bodies shouldn't reference arguments"),(a||e.contains(this.isLiteralThis))&&(u=new x(a?"apply":"call"),s=[new x("this")],a&&s.push(new x("arguments")),l=new K(l,[new t(u)])),l.noReturn=i,c=new o(l,s),n?r.wrap([c]):c)},isLiteralArguments:function(e){return e instanceof x&&"arguments"===e.value&&!e.asKey},isLiteralThis:function(e){return e instanceof x&&"this"===e.value&&!e.asKey||e instanceof h&&e.bound||e instanceof o&&e.isSuper}},pt=function(e,t,n){var i;if(i=t[n].unfoldSoak(e))return t[n]=i.body,i.body=new K(t),i},Y={"extends":function(){return"function(child, parent) { for (var key in parent) { if ("+dt("hasProp")+".call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; }"},bind:function(){return"function(fn, me){ return function(){ return fn.apply(me, arguments); }; }"},indexOf:function(){return"[].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; }"},hasProp:function(){return"{}.hasOwnProperty"},slice:function(){return"[].slice"}},N=1,L=2,C=3,T=4,F=5,w=6,H="  ",b="[$A-Za-z_\\x7f-\\uffff][$\\w\\x7f-\\uffff]*",m=RegExp("^"+b+"$"),M=/^[+-]?\d+$/,E=RegExp("^(?:("+b+")\\.prototype(?:\\.("+b+")|\\[(\"(?:[^\\\\\"\\r\\n]|\\\\.)*\"|'(?:[^\\\\'\\r\\n]|\\\\.)*')\\]|\\[(0x[\\da-fA-F]+|\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\]))|("+b+")$"),k=/^['"]/,dt=function(e){var t;return t="__"+e,V.root.assign(t,Y[e]()),t},ct=function(e,t){return e=e.replace(/\n/g,"$&"+t),e.replace(/\s+$/,"")}}.call(this),t.exports}(),require["./sourcemap"]=function(){var e={},t={exports:e};return function(){var e,n;e=function(){function e(e){this.line=e,this.columns=[]}return e.prototype.add=function(e,t,n){var i,s;return s=t[0],i=t[1],null==n&&(n={}),this.columns[e]&&n.noReplace?void 0:this.columns[e]={line:this.line,column:e,sourceLine:s,sourceColumn:i}},e.prototype.sourceLocation=function(e){for(var t;!((t=this.columns[e])||0>=e);)e--;return t&&[t.sourceLine,t.sourceColumn]},e}(),n=function(){function t(){this.lines=[]}var n,i,s,r;return t.prototype.add=function(t,n,i){var s,r,o,a;return null==i&&(i={}),r=n[0],s=n[1],o=(a=this.lines)[r]||(a[r]=new e(r)),o.add(s,t,i)},t.prototype.sourceLocation=function(e){var t,n,i;for(n=e[0],t=e[1];!((i=this.lines[n])||0>=n);)n--;return i&&i.sourceLocation(t)},t.prototype.generate=function(e,t){var n,i,s,r,o,a,c,h,l,u,p,d,f,m,b,k;for(null==e&&(e={}),null==t&&(t=null),u=0,i=0,r=0,s=0,h=!1,n="",b=this.lines,a=p=0,f=b.length;f>p;a=++p)if(o=b[a])for(k=o.columns,d=0,m=k.length;m>d;d++)if(c=k[d]){for(;u<c.line;)i=0,h=!1,n+=";",u++;h&&(n+=",",h=!1),n+=this.encodeVlq(c.column-i),i=c.column,n+=this.encodeVlq(0),n+=this.encodeVlq(c.sourceLine-r),r=c.sourceLine,n+=this.encodeVlq(c.sourceColumn-s),s=c.sourceColumn,h=!0}return l={version:3,file:e.generatedFile||"",sourceRoot:e.sourceRoot||"",sources:e.sourceFiles||[""],names:[],mappings:n},e.inline&&(l.sourcesContent=[t]),JSON.stringify(l,null,2)},s=5,i=1<<s,r=i-1,t.prototype.encodeVlq=function(e){var t,n,o,a;for(t="",o=0>e?1:0,a=(Math.abs(e)<<1)+o;a||!t;)n=a&r,a>>=s,a&&(n|=i),t+=this.encodeBase64(n);return t},n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",t.prototype.encodeBase64=function(e){return n[e]||function(){throw new Error("Cannot Base64 encode value: "+e)}()},t}(),t.exports=n}.call(this),t.exports}(),require["./coffee-script"]=function(){var e={},t={exports:e};return function(){var t,n,i,s,r,o,a,c,h,l,u,p,d,f,m,b,k,g,y,v,w,T,C={}.hasOwnProperty;if(l=require("fs"),y=require("vm"),k=require("path"),s=require("child_process"),t=require("./lexer").Lexer,f=require("./parser").parser,u=require("./helpers"),i=require("./sourcemap"),e.VERSION="1.6.3",e.helpers=u,e.compile=r=function(e,t){var n,s,r,o,a,c,h,l,d,m,b,k;for(null==t&&(t={}),d=u.merge,t.sourceMap&&(l=new i),a=f.parse(p.tokenize(e,t)).compileToFragments(t),r=0,t.header&&(r+=1),t.shiftLine&&(r+=1),s=0,h="",b=0,k=a.length;k>b;b++)o=a[b],t.sourceMap&&(o.locationData&&l.add([o.locationData.first_line,o.locationData.first_column],[r,s],{noReplace:!0}),m=u.count(o.code,"\n"),r+=m,s=o.code.length-(m?o.code.lastIndexOf("\n"):0)),h+=o.code;return t.header&&(c="Generated by CoffeeScript "+this.VERSION,h="// "+c+"\n"+h),t.sourceMap?(n={js:h},n.sourceMap=l,n.v3SourceMap=l.generate(t,e),n):h},e.tokens=function(e,t){return p.tokenize(e,t)},e.nodes=function(e,t){return"string"==typeof e?f.parse(p.tokenize(e,t)):f.parse(e)},e.run=function(e,t){var n,i;return null==t&&(t={}),i=require.main,null==t.sourceMap&&(t.sourceMap=!0),i.filename=process.argv[1]=t.filename?l.realpathSync(t.filename):".",i.moduleCache&&(i.moduleCache={}),i.paths=require("module")._nodeModulePaths(k.dirname(l.realpathSync(t.filename||"."))),!u.isCoffee(i.filename)||require.extensions?(n=r(e,t),m(),g[i.filename]=n.sourceMap,i._compile(n.js,i.filename)):i._compile(e,i.filename)},e.eval=function(e,t){var n,i,s,o,a,c,h,l,u,p,d,f,m,b;if(null==t&&(t={}),e=e.trim()){if(i=y.Script){if(null!=t.sandbox){if(t.sandbox instanceof i.createContext().constructor)h=t.sandbox;else{h=i.createContext(),f=t.sandbox;for(o in f)C.call(f,o)&&(l=f[o],h[o]=l)}h.global=h.root=h.GLOBAL=h}else h=global;if(h.__filename=t.filename||"eval",h.__dirname=k.dirname(h.__filename),h===global&&!h.module&&!h.require){for(n=require("module"),h.module=d=new n(t.modulename||"eval"),h.require=b=function(e){return n._load(e,d,!0)},d.filename=h.__filename,m=Object.getOwnPropertyNames(require),u=0,p=m.length;p>u;u++)c=m[u],"paths"!==c&&(b[c]=require[c]);b.paths=d.paths=n._nodeModulePaths(process.cwd()),b.resolve=function(e){return n._resolveFilename(e,d)}}}a={};for(o in t)C.call(t,o)&&(l=t[o],a[o]=l);return a.bare=!0,s=r(e,a),h===global?y.runInThisContext(s):y.runInContext(s,h)}},d=function(e,t){var n,i,s;return i=l.readFileSync(t,"utf8"),s=65279===i.charCodeAt(0)?i.substring(1):i,n=r(s,{filename:t,sourceMap:!0,literate:u.isLiterate(t)}),g[t]=n.sourceMap,e._compile(n.js,t)},require.extensions){for(T=[".coffee",".litcoffee",".coffee.md"],v=0,w=T.length;w>v;v++)o=T[v],require.extensions[o]=d;n=require("module"),a=function(e){var t,i;for(i=k.basename(e).split("."),""===i[0]&&i.shift();i.shift();)if(t="."+i.join("."),n._extensions[t])return t;return".js"},n.prototype.load=function(e){var t;return this.filename=e,this.paths=n._nodeModulePaths(k.dirname(e)),t=a(e),n._extensions[t](this,e),this.loaded=!0}}s&&(c=s.fork,s.fork=function(e,t,n){var i;return null==t&&(t=[]),null==n&&(n={}),i=u.isCoffee(e)?"coffee":null,Array.isArray(t)||(t=[],n=t||{}),n.execPath||(n.execPath=i),c(e,t,n)}),p=new t,f.lexer={lex:function(){var e,t;return t=this.tokens[this.pos++],t?(e=t[0],this.yytext=t[1],this.yylloc=t[2],this.yylineno=this.yylloc.first_line):e="",e},setInput:function(e){return this.tokens=e,this.pos=0},upcomingInput:function(){return""}},f.yy=require("./nodes"),f.yy.parseError=function(e,t){var n;return n=t.token,e="unexpected "+(1===n?"end of input":n),u.throwSyntaxError(e,f.lexer.yylloc)},b=!1,g={},m=function(){var t;if(!b)return b=!0,t=require.main,Error.prepareStackTrace=function(t,n){var i,s,r,o,a;return o={},r=function(e,t,n){var i,s;return s=g[e],s&&(i=s.sourceLocation([t-1,n-1])),i?[i[0]+1,i[1]+1]:null},s=function(){var t,s,o;for(o=[],t=0,s=n.length;s>t&&(i=n[t],i.getFunction()!==e.run);t++)o.push("  at "+h(i,r));return o}(),""+t.name+": "+(null!=(a=t.message)?a:"")+"\n"+s.join("\n")+"\n"}},h=function(e,t){var n,i,s,r,o,a,c,h,l,u,p,d;return r=void 0,s="",e.isNative()?s="native":(e.isEval()?(r=e.getScriptNameOrSourceURL(),r||(s=""+e.getEvalOrigin()+", ")):r=e.getFileName(),r||(r="<anonymous>"),h=e.getLineNumber(),i=e.getColumnNumber(),u=t(r,h,i),s=u?""+r+":"+u[0]+":"+u[1]+", <js>:"+h+":"+i:""+r+":"+h+":"+i),o=e.getFunctionName(),a=e.isConstructor(),c=!(e.isToplevel()||a),c?(l=e.getMethodName(),d=e.getTypeName(),o?(p=n="",d&&o.indexOf(d)&&(p=""+d+"."),l&&o.indexOf("."+l)!==o.length-l.length-1&&(n=" [as "+l+"]"),""+p+o+n+" ("+s+")"):""+d+"."+(l||"<anonymous>")+" ("+s+")"):a?"new "+(o||"<anonymous>")+" ("+s+")":o?""+o+" ("+s+")":s}}.call(this),t.exports}(),require["./browser"]=function(){var exports={},module={exports:exports};return function(){var CoffeeScript,compile,runScripts,__indexOf=[].indexOf||function(e){for(var t=0,n=this.length;n>t;t++)if(t in this&&this[t]===e)return t;return-1};CoffeeScript=require("./coffee-script"),CoffeeScript.require=require,compile=CoffeeScript.compile,CoffeeScript.eval=function(code,options){return null==options&&(options={}),null==options.bare&&(options.bare=!0),eval(compile(code,options))},CoffeeScript.run=function(e,t){return null==t&&(t={}),t.bare=!0,t.shiftLine=!0,Function(compile(e,t))()},"undefined"!=typeof window&&null!==window&&("undefined"!=typeof btoa&&null!==btoa&&"undefined"!=typeof JSON&&null!==JSON&&"undefined"!=typeof unescape&&null!==unescape&&"undefined"!=typeof encodeURIComponent&&null!==encodeURIComponent&&(compile=function(e,t){var n,i,s;return null==t&&(t={}),t.sourceMap=!0,t.inline=!0,s=CoffeeScript.compile(e,t),n=s.js,i=s.v3SourceMap,""+n+"\n//@ sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(i)))+"\n//@ sourceURL=coffeescript"}),CoffeeScript.load=function(e,t,n){var i;return null==n&&(n={}),n.sourceFiles=[e],i=window.ActiveXObject?new window.ActiveXObject("Microsoft.XMLHTTP"):new window.XMLHttpRequest,i.open("GET",e,!0),"overrideMimeType"in i&&i.overrideMimeType("text/plain"),i.onreadystatechange=function(){var s;if(4===i.readyState){if(0!==(s=i.status)&&200!==s)throw new Error("Could not load "+e);if(CoffeeScript.run(i.responseText,n),t)return t()}},i.send(null)},runScripts=function(){var e,t,n,i,s,r,o;return o=window.document.getElementsByTagName("script"),t=["text/coffeescript","text/literate-coffeescript"],e=function(){var e,n,i,s;
for(s=[],e=0,n=o.length;n>e;e++)r=o[e],i=r.type,__indexOf.call(t,i)>=0&&s.push(r);return s}(),i=0,s=e.length,(n=function(){var s,r,o;return o=e[i++],s=null!=o?o.type:void 0,__indexOf.call(t,s)>=0?(r={literate:"text/literate-coffeescript"===s},o.src?CoffeeScript.load(o.src,n,r):(r.sourceFiles=["embedded"],CoffeeScript.run(o.innerHTML,r),n())):void 0})(),null},window.addEventListener?window.addEventListener("DOMContentLoaded",runScripts,!1):window.attachEvent("onload",runScripts))}.call(this),module.exports}(),require["./coffee-script"]}();"function"==typeof define&&define.amd?define('coffee-script',[],function(){return CoffeeScript}):root.CoffeeScript=CoffeeScript}(this);

/**
 * @license cs 0.4.3 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/require-cs for details
 */

/*jslint */
/*global define, window, XMLHttpRequest, importScripts, Packages, java,
  ActiveXObject, process, require */

define('cs',['coffee-script'], function (CoffeeScript) {
    
    var fs, getXhr,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        fetchText = function () {
            throw new Error('Environment unsupported.');
        },
        buildMap = {};

    if (typeof process !== "undefined" &&
               process.versions &&
               !!process.versions.node) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');
        fetchText = function (path, callback) {
            callback(fs.readFileSync(path, 'utf8'));
        };
    } else if ((typeof window !== "undefined" && window.navigator && window.document) || typeof importScripts !== "undefined") {
        // Browser action
        getXhr = function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            if (!xhr) {
                throw new Error("getXhr(): XMLHttpRequest not available");
            }

            return xhr;
        };

        fetchText = function (url, callback) {
            var xhr = getXhr();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function (evt) {
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    callback(xhr.responseText);
                }
            };
            xhr.send(null);
        };
        // end browser.js adapters
    } else if (typeof Packages !== 'undefined') {
        //Why Java, why is this so awkward?
        fetchText = function (path, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(path),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                stringBuffer.append(line);

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    }

    return {
        fetchText: fetchText,

        get: function () {
            return CoffeeScript;
        },

        write: function (pluginName, name, write) {
            if (buildMap.hasOwnProperty(name)) {
                var text = buildMap[name];
                write.asModule(pluginName + "!" + name, text);
            }
        },

        version: '0.4.3',

        load: function (name, parentRequire, load, config) {
            var path = parentRequire.toUrl(name + '.coffee');
            fetchText(path, function (text) {

                //Do CoffeeScript transform.
                try {
                    text = CoffeeScript.compile(text, config.CoffeeScript);
                } catch (err) {
                    err.message = "In " + path + ", " + err.message;
                    throw err;
                }

                //Hold on to the transformed text if a build.
                if (config.isBuild) {
                    buildMap[name] = text;
                }

                //IE with conditional comments on cannot handle the
                //sourceURL trick, so skip it if enabled.
                /*@if (@_jscript) @else @*/
                if (!config.isBuild) {
                    text += "\r\n//# sourceURL=" + path;
                }
                /*@end@*/

                load.fromText(name, text);

                //Give result to load. Need to wait until the module
                //is fully parse, which will happen after this
                //execution.
                parentRequire([name], function (value) {
                    load(value);
                });
            });
        }
    };
});

/*
jed.js
v0.5.0beta

https://github.com/SlexAxton/Jed
-----------
A gettext compatible i18n library for modern JavaScript Applications

by Alex Sexton - AlexSexton [at] gmail - @SlexAxton
WTFPL license for use
Dojo CLA for contributions

Jed offers the entire applicable GNU gettext spec'd set of
functions, but also offers some nicer wrappers around them.
The api for gettext was written for a language with no function
overloading, so Jed allows a little more of that.

Many thanks to Joshua I. Miller - unrtst@cpan.org - who wrote
gettext.js back in 2008. I was able to vet a lot of my ideas
against his. I also made sure Jed passed against his tests
in order to offer easy upgrades -- jsgettext.berlios.de
*/
(function (root, undef) {

  // Set up some underscore-style functions, if you already have
  // underscore, feel free to delete this section, and use it
  // directly, however, the amount of functions used doesn't
  // warrant having underscore as a full dependency.
  // Underscore 1.3.0 was used to port and is licensed
  // under the MIT License by Jeremy Ashkenas.
  var ArrayProto    = Array.prototype,
      ObjProto      = Object.prototype,
      slice         = ArrayProto.slice,
      hasOwnProp    = ObjProto.hasOwnProperty,
      nativeForEach = ArrayProto.forEach,
      breaker       = {};

  // We're not using the OOP style _ so we don't need the
  // extra level of indirection. This still means that you
  // sub out for real `_` though.
  var _ = {
    forEach : function( obj, iterator, context ) {
      var i, l, key;
      if ( obj === null ) {
        return;
      }

      if ( nativeForEach && obj.forEach === nativeForEach ) {
        obj.forEach( iterator, context );
      }
      else if ( obj.length === +obj.length ) {
        for ( i = 0, l = obj.length; i < l; i++ ) {
          if ( i in obj && iterator.call( context, obj[i], i, obj ) === breaker ) {
            return;
          }
        }
      }
      else {
        for ( key in obj) {
          if ( hasOwnProp.call( obj, key ) ) {
            if ( iterator.call (context, obj[key], key, obj ) === breaker ) {
              return;
            }
          }
        }
      }
    },
    extend : function( obj ) {
      this.forEach( slice.call( arguments, 1 ), function ( source ) {
        for ( var prop in source ) {
          obj[prop] = source[prop];
        }
      });
      return obj;
    }
  };
  // END Miniature underscore impl

  // Jed is a constructor function
  var Jed = function ( options ) {
    // Some minimal defaults
    this.defaults = {
      "locale_data" : {
        "messages" : {
          "" : {
            "domain"       : "messages",
            "lang"         : "en",
            "plural_forms" : "nplurals=2; plural=(n != 1);"
          }
          // There are no default keys, though
        }
      },
      // The default domain if one is missing
      "domain" : "messages"
    };

    // Mix in the sent options with the default options
    this.options = _.extend( {}, this.defaults, options );
    this.textdomain( this.options.domain );

    if ( options.domain && ! this.options.locale_data[ this.options.domain ] ) {
      throw new Error('Text domain set to non-existent domain: `' + options.domain + '`');
    }
  };

  // The gettext spec sets this character as the default
  // delimiter for context lookups.
  // e.g.: context\u0004key
  // If your translation company uses something different,
  // just change this at any time and it will use that instead.
  Jed.context_delimiter = String.fromCharCode( 4 );

  function getPluralFormFunc ( plural_form_string ) {
    return Jed.PF.compile( plural_form_string || "nplurals=2; plural=(n != 1);");
  }

  function Chain( key, i18n ){
    this._key = key;
    this._i18n = i18n;
  }

  // Create a chainable api for adding args prettily
  _.extend( Chain.prototype, {
    onDomain : function ( domain ) {
      this._domain = domain;
      return this;
    },
    withContext : function ( context ) {
      this._context = context;
      return this;
    },
    ifPlural : function ( num, pkey ) {
      this._val = num;
      this._pkey = pkey;
      return this;
    },
    fetch : function ( sArr ) {
      if ( {}.toString.call( sArr ) != '[object Array]' ) {
        sArr = [].slice.call(arguments);
      }
      return ( sArr && sArr.length ? Jed.sprintf : function(x){ return x; } )(
        this._i18n.dcnpgettext(this._domain, this._context, this._key, this._pkey, this._val),
        sArr
      );
    }
  });

  // Add functions to the Jed prototype.
  // These will be the functions on the object that's returned
  // from creating a `new Jed()`
  // These seem redundant, but they gzip pretty well.
  _.extend( Jed.prototype, {
    // The sexier api start point
    translate : function ( key ) {
      return new Chain( key, this );
    },

    textdomain : function ( domain ) {
      if ( ! domain ) {
        return this._textdomain;
      }
      this._textdomain = domain;
    },

    gettext : function ( key ) {
      return this.dcnpgettext.call( this, undef, undef, key );
    },

    dgettext : function ( domain, key ) {
     return this.dcnpgettext.call( this, domain, undef, key );
    },

    dcgettext : function ( domain , key /*, category */ ) {
      // Ignores the category anyways
      return this.dcnpgettext.call( this, domain, undef, key );
    },

    ngettext : function ( skey, pkey, val ) {
      return this.dcnpgettext.call( this, undef, undef, skey, pkey, val );
    },

    dngettext : function ( domain, skey, pkey, val ) {
      return this.dcnpgettext.call( this, domain, undef, skey, pkey, val );
    },

    dcngettext : function ( domain, skey, pkey, val/*, category */) {
      return this.dcnpgettext.call( this, domain, undef, skey, pkey, val );
    },

    pgettext : function ( context, key ) {
      return this.dcnpgettext.call( this, undef, context, key );
    },

    dpgettext : function ( domain, context, key ) {
      return this.dcnpgettext.call( this, domain, context, key );
    },

    dcpgettext : function ( domain, context, key/*, category */) {
      return this.dcnpgettext.call( this, domain, context, key );
    },

    npgettext : function ( context, skey, pkey, val ) {
      return this.dcnpgettext.call( this, undef, context, skey, pkey, val );
    },

    dnpgettext : function ( domain, context, skey, pkey, val ) {
      return this.dcnpgettext.call( this, domain, context, skey, pkey, val );
    },

    // The most fully qualified gettext function. It has every option.
    // Since it has every option, we can use it from every other method.
    // This is the bread and butter.
    // Technically there should be one more argument in this function for 'Category',
    // but since we never use it, we might as well not waste the bytes to define it.
    dcnpgettext : function ( domain, context, singular_key, plural_key, val ) {
      // Set some defaults

      plural_key = plural_key || singular_key;

      // Use the global domain default if one
      // isn't explicitly passed in
      domain = domain || this._textdomain;

      // Default the value to the singular case
      val = typeof val == 'undefined' ? 1 : val;

      var fallback;

      // Handle special cases

      // No options found
      if ( ! this.options ) {
        // There's likely something wrong, but we'll return the correct key for english
        // We do this by instantiating a brand new Jed instance with the default set
        // for everything that could be broken.
        fallback = new Jed();
        return fallback.dcnpgettext.call( fallback, undefined, undefined, singular_key, plural_key, val );
      }

      // No translation data provided
      if ( ! this.options.locale_data ) {
        throw new Error('No locale data provided.');
      }

      if ( ! this.options.locale_data[ domain ] ) {
        throw new Error('Domain `' + domain + '` was not found.');
      }

      if ( ! this.options.locale_data[ domain ][ "" ] ) {
        throw new Error('No locale meta information provided.');
      }

      // Make sure we have a truthy key. Otherwise we might start looking
      // into the empty string key, which is the options for the locale
      // data.
      if ( ! singular_key ) {
        throw new Error('No translation key found.');
      }

      // Handle invalid numbers, but try casting strings for good measure
      if ( typeof val != 'number' ) {
        val = parseInt( val, 10 );

        if ( isNaN( val ) ) {
          throw new Error('The number that was passed in is not a number.');
        }
      }

      var key  = context ? context + Jed.context_delimiter + singular_key : singular_key,
          locale_data = this.options.locale_data,
          dict = locale_data[ domain ],
          pluralForms = dict[""].plural_forms || (locale_data.messages || this.defaults.locale_data.messages)[""].plural_forms,
          val_idx = getPluralFormFunc(pluralForms)(val) + 1,
          val_list,
          res;

      // Throw an error if a domain isn't found
      if ( ! dict ) {
        throw new Error('No domain named `' + domain + '` could be found.');
      }

      val_list = dict[ key ];

      // If there is no match, then revert back to
      // english style singular/plural with the keys passed in.
      if ( ! val_list || val_idx >= val_list.length ) {
        if (this.options.missing_key_callback) {
          this.options.missing_key_callback(key);
        }
        res = [ null, singular_key, plural_key ];
        return res[ getPluralFormFunc(pluralForms)( val ) + 1 ];
      }

      res = val_list[ val_idx ];

      // This includes empty strings on purpose
      if ( ! res  ) {
        res = [ null, singular_key, plural_key ];
        return res[ getPluralFormFunc(pluralForms)( val ) + 1 ];
      }
      return res;
    }
  });


  // We add in sprintf capabilities for post translation value interolation
  // This is not internally used, so you can remove it if you have this
  // available somewhere else, or want to use a different system.

  // We _slightly_ modify the normal sprintf behavior to more gracefully handle
  // undefined values.

  /**
   sprintf() for JavaScript 0.7-beta1
   http://www.diveintojavascript.com/projects/javascript-sprintf

   Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions are met:
       * Redistributions of source code must retain the above copyright
         notice, this list of conditions and the following disclaimer.
       * Redistributions in binary form must reproduce the above copyright
         notice, this list of conditions and the following disclaimer in the
         documentation and/or other materials provided with the distribution.
       * Neither the name of sprintf() for JavaScript nor the
         names of its contributors may be used to endorse or promote products
         derived from this software without specific prior written permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
   DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
   LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
   ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */
  var sprintf = (function() {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }
    function str_repeat(input, multiplier) {
      for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
      return output.join('');
    }

    var str_format = function() {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function(parse_tree, argv) {
      var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === 'string') {
          output.push(parse_tree[i]);
        }
        else if (node_type === 'array') {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) { // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
              }
              arg = arg[match[2][k]];
            }
          }
          else if (match[1]) { // positional argument (explicit)
            arg = argv[match[1]];
          }
          else { // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
            throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
          }

          // Jed EDIT
          if ( typeof arg == 'undefined' || arg === null ) {
            arg = '';
          }
          // Jed EDIT

          switch (match[8]) {
            case 'b': arg = arg.toString(2); break;
            case 'c': arg = String.fromCharCode(arg); break;
            case 'd': arg = parseInt(arg, 10); break;
            case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
            case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
            case 'o': arg = arg.toString(8); break;
            case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
            case 'u': arg = Math.abs(arg); break;
            case 'x': arg = arg.toString(16); break;
            case 'X': arg = arg.toString(16).toUpperCase(); break;
          }
          arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
          pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : '';
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join('');
    };

    str_format.cache = {};

    str_format.parse = function(fmt) {
      var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        }
        else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push('%');
        }
        else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [], replacement_field = match[2], field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else {
                  throw('[sprintf] huh?');
                }
              }
            }
            else {
              throw('[sprintf] huh?');
            }
            match[2] = field_list;
          }
          else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
          }
          parse_tree.push(match);
        }
        else {
          throw('[sprintf] huh?');
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();

  var vsprintf = function(fmt, argv) {
    argv.unshift(fmt);
    return sprintf.apply(null, argv);
  };

  Jed.parse_plural = function ( plural_forms, n ) {
    plural_forms = plural_forms.replace(/n/g, n);
    return Jed.parse_expression(plural_forms);
  };

  Jed.sprintf = function ( fmt, args ) {
    if ( {}.toString.call( args ) == '[object Array]' ) {
      return vsprintf( fmt, [].slice.call(args) );
    }
    return sprintf.apply(this, [].slice.call(arguments) );
  };

  Jed.prototype.sprintf = function () {
    return Jed.sprintf.apply(this, arguments);
  };
  // END sprintf Implementation

  // Start the Plural forms section
  // This is a full plural form expression parser. It is used to avoid
  // running 'eval' or 'new Function' directly against the plural
  // forms.
  //
  // This can be important if you get translations done through a 3rd
  // party vendor. I encourage you to use this instead, however, I
  // also will provide a 'precompiler' that you can use at build time
  // to output valid/safe function representations of the plural form
  // expressions. This means you can build this code out for the most
  // part.
  Jed.PF = {};

  Jed.PF.parse = function ( p ) {
    var plural_str = Jed.PF.extractPluralExpr( p );
    return Jed.PF.parser.parse.call(Jed.PF.parser, plural_str);
  };

  Jed.PF.compile = function ( p ) {
    // Handle trues and falses as 0 and 1
    function imply( val ) {
      return (val === true ? 1 : val ? val : 0);
    }

    var ast = Jed.PF.parse( p );
    return function ( n ) {
      return imply( Jed.PF.interpreter( ast )( n ) );
    };
  };

  Jed.PF.interpreter = function ( ast ) {
    return function ( n ) {
      var res;
      switch ( ast.type ) {
        case 'GROUP':
          return Jed.PF.interpreter( ast.expr )( n );
        case 'TERNARY':
          if ( Jed.PF.interpreter( ast.expr )( n ) ) {
            return Jed.PF.interpreter( ast.truthy )( n );
          }
          return Jed.PF.interpreter( ast.falsey )( n );
        case 'OR':
          return Jed.PF.interpreter( ast.left )( n ) || Jed.PF.interpreter( ast.right )( n );
        case 'AND':
          return Jed.PF.interpreter( ast.left )( n ) && Jed.PF.interpreter( ast.right )( n );
        case 'LT':
          return Jed.PF.interpreter( ast.left )( n ) < Jed.PF.interpreter( ast.right )( n );
        case 'GT':
          return Jed.PF.interpreter( ast.left )( n ) > Jed.PF.interpreter( ast.right )( n );
        case 'LTE':
          return Jed.PF.interpreter( ast.left )( n ) <= Jed.PF.interpreter( ast.right )( n );
        case 'GTE':
          return Jed.PF.interpreter( ast.left )( n ) >= Jed.PF.interpreter( ast.right )( n );
        case 'EQ':
          return Jed.PF.interpreter( ast.left )( n ) == Jed.PF.interpreter( ast.right )( n );
        case 'NEQ':
          return Jed.PF.interpreter( ast.left )( n ) != Jed.PF.interpreter( ast.right )( n );
        case 'MOD':
          return Jed.PF.interpreter( ast.left )( n ) % Jed.PF.interpreter( ast.right )( n );
        case 'VAR':
          return n;
        case 'NUM':
          return ast.val;
        default:
          throw new Error("Invalid Token found.");
      }
    };
  };

  Jed.PF.extractPluralExpr = function ( p ) {
    // trim first
    p = p.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

    if (! /;\s*$/.test(p)) {
      p = p.concat(';');
    }

    var nplurals_re = /nplurals\=(\d+);/,
        plural_re = /plural\=(.*);/,
        nplurals_matches = p.match( nplurals_re ),
        res = {},
        plural_matches;

    // Find the nplurals number
    if ( nplurals_matches.length > 1 ) {
      res.nplurals = nplurals_matches[1];
    }
    else {
      throw new Error('nplurals not found in plural_forms string: ' + p );
    }

    // remove that data to get to the formula
    p = p.replace( nplurals_re, "" );
    plural_matches = p.match( plural_re );

    if (!( plural_matches && plural_matches.length > 1 ) ) {
      throw new Error('`plural` expression not found: ' + p);
    }
    return plural_matches[ 1 ];
  };

  /* Jison generated parser */
  Jed.PF.parser = (function(){

var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"expressions":3,"e":4,"EOF":5,"?":6,":":7,"||":8,"&&":9,"<":10,"<=":11,">":12,">=":13,"!=":14,"==":15,"%":16,"(":17,")":18,"n":19,"NUMBER":20,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",6:"?",7:":",8:"||",9:"&&",10:"<",11:"<=",12:">",13:">=",14:"!=",15:"==",16:"%",17:"(",18:")",19:"n",20:"NUMBER"},
productions_: [0,[3,2],[4,5],[4,3],[4,3],[4,3],[4,3],[4,3],[4,3],[4,3],[4,3],[4,3],[4,3],[4,1],[4,1]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return { type : 'GROUP', expr: $$[$0-1] }; 
break;
case 2:this.$ = { type: 'TERNARY', expr: $$[$0-4], truthy : $$[$0-2], falsey: $$[$0] }; 
break;
case 3:this.$ = { type: "OR", left: $$[$0-2], right: $$[$0] };
break;
case 4:this.$ = { type: "AND", left: $$[$0-2], right: $$[$0] };
break;
case 5:this.$ = { type: 'LT', left: $$[$0-2], right: $$[$0] }; 
break;
case 6:this.$ = { type: 'LTE', left: $$[$0-2], right: $$[$0] };
break;
case 7:this.$ = { type: 'GT', left: $$[$0-2], right: $$[$0] };
break;
case 8:this.$ = { type: 'GTE', left: $$[$0-2], right: $$[$0] };
break;
case 9:this.$ = { type: 'NEQ', left: $$[$0-2], right: $$[$0] };
break;
case 10:this.$ = { type: 'EQ', left: $$[$0-2], right: $$[$0] };
break;
case 11:this.$ = { type: 'MOD', left: $$[$0-2], right: $$[$0] };
break;
case 12:this.$ = { type: 'GROUP', expr: $$[$0-1] }; 
break;
case 13:this.$ = { type: 'VAR' }; 
break;
case 14:this.$ = { type: 'NUM', val: Number(yytext) }; 
break;
}
},
table: [{3:1,4:2,17:[1,3],19:[1,4],20:[1,5]},{1:[3]},{5:[1,6],6:[1,7],8:[1,8],9:[1,9],10:[1,10],11:[1,11],12:[1,12],13:[1,13],14:[1,14],15:[1,15],16:[1,16]},{4:17,17:[1,3],19:[1,4],20:[1,5]},{5:[2,13],6:[2,13],7:[2,13],8:[2,13],9:[2,13],10:[2,13],11:[2,13],12:[2,13],13:[2,13],14:[2,13],15:[2,13],16:[2,13],18:[2,13]},{5:[2,14],6:[2,14],7:[2,14],8:[2,14],9:[2,14],10:[2,14],11:[2,14],12:[2,14],13:[2,14],14:[2,14],15:[2,14],16:[2,14],18:[2,14]},{1:[2,1]},{4:18,17:[1,3],19:[1,4],20:[1,5]},{4:19,17:[1,3],19:[1,4],20:[1,5]},{4:20,17:[1,3],19:[1,4],20:[1,5]},{4:21,17:[1,3],19:[1,4],20:[1,5]},{4:22,17:[1,3],19:[1,4],20:[1,5]},{4:23,17:[1,3],19:[1,4],20:[1,5]},{4:24,17:[1,3],19:[1,4],20:[1,5]},{4:25,17:[1,3],19:[1,4],20:[1,5]},{4:26,17:[1,3],19:[1,4],20:[1,5]},{4:27,17:[1,3],19:[1,4],20:[1,5]},{6:[1,7],8:[1,8],9:[1,9],10:[1,10],11:[1,11],12:[1,12],13:[1,13],14:[1,14],15:[1,15],16:[1,16],18:[1,28]},{6:[1,7],7:[1,29],8:[1,8],9:[1,9],10:[1,10],11:[1,11],12:[1,12],13:[1,13],14:[1,14],15:[1,15],16:[1,16]},{5:[2,3],6:[2,3],7:[2,3],8:[2,3],9:[1,9],10:[1,10],11:[1,11],12:[1,12],13:[1,13],14:[1,14],15:[1,15],16:[1,16],18:[2,3]},{5:[2,4],6:[2,4],7:[2,4],8:[2,4],9:[2,4],10:[1,10],11:[1,11],12:[1,12],13:[1,13],14:[1,14],15:[1,15],16:[1,16],18:[2,4]},{5:[2,5],6:[2,5],7:[2,5],8:[2,5],9:[2,5],10:[2,5],11:[2,5],12:[2,5],13:[2,5],14:[2,5],15:[2,5],16:[1,16],18:[2,5]},{5:[2,6],6:[2,6],7:[2,6],8:[2,6],9:[2,6],10:[2,6],11:[2,6],12:[2,6],13:[2,6],14:[2,6],15:[2,6],16:[1,16],18:[2,6]},{5:[2,7],6:[2,7],7:[2,7],8:[2,7],9:[2,7],10:[2,7],11:[2,7],12:[2,7],13:[2,7],14:[2,7],15:[2,7],16:[1,16],18:[2,7]},{5:[2,8],6:[2,8],7:[2,8],8:[2,8],9:[2,8],10:[2,8],11:[2,8],12:[2,8],13:[2,8],14:[2,8],15:[2,8],16:[1,16],18:[2,8]},{5:[2,9],6:[2,9],7:[2,9],8:[2,9],9:[2,9],10:[2,9],11:[2,9],12:[2,9],13:[2,9],14:[2,9],15:[2,9],16:[1,16],18:[2,9]},{5:[2,10],6:[2,10],7:[2,10],8:[2,10],9:[2,10],10:[2,10],11:[2,10],12:[2,10],13:[2,10],14:[2,10],15:[2,10],16:[1,16],18:[2,10]},{5:[2,11],6:[2,11],7:[2,11],8:[2,11],9:[2,11],10:[2,11],11:[2,11],12:[2,11],13:[2,11],14:[2,11],15:[2,11],16:[2,11],18:[2,11]},{5:[2,12],6:[2,12],7:[2,12],8:[2,12],9:[2,12],10:[2,12],11:[2,12],12:[2,12],13:[2,12],14:[2,12],15:[2,12],16:[2,12],18:[2,12]},{4:30,17:[1,3],19:[1,4],20:[1,5]},{5:[2,2],6:[1,7],7:[2,2],8:[1,8],9:[1,9],10:[1,10],11:[1,11],12:[1,12],13:[1,13],14:[1,14],15:[1,15],16:[1,16],18:[2,2]}],
defaultActions: {6:[2,1]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this,
        stack = [0],
        vstack = [null], // semantic value stack
        lstack = [], // location stack
        table = this.table,
        yytext = '',
        yylineno = 0,
        yyleng = 0,
        recovering = 0,
        TERROR = 2,
        EOF = 1;

    //this.reductionCount = this.shiftCount = 0;

    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    if (typeof this.lexer.yylloc == 'undefined')
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);

    if (typeof this.yy.parseError === 'function')
        this.parseError = this.yy.parseError;

    function popStack (n) {
        stack.length = stack.length - 2*n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }

    function lex() {
        var token;
        token = self.lexer.lex() || 1; // $end = 1
        // if token isn't its numeric value, convert
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    }

    var symbol, preErrorSymbol, state, action, a, r, yyval={},p,len,newState, expected;
    while (true) {
        // retreive state number from top of stack
        state = stack[stack.length-1];

        // use default actions if available
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol == null)
                symbol = lex();
            // read action for current state and first input
            action = table[state] && table[state][symbol];
        }

        // handle parse error
        _handle_error:
        if (typeof action === 'undefined' || !action.length || !action[0]) {

            if (!recovering) {
                // Report error
                expected = [];
                for (p in table[state]) if (this.terminals_[p] && p > 2) {
                    expected.push("'"+this.terminals_[p]+"'");
                }
                var errStr = '';
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line '+(yylineno+1)+":\n"+this.lexer.showPosition()+"\nExpecting "+expected.join(', ') + ", got '" + this.terminals_[symbol]+ "'";
                } else {
                    errStr = 'Parse error on line '+(yylineno+1)+": Unexpected " +
                                  (symbol == 1 /*EOF*/ ? "end of input" :
                                              ("'"+(this.terminals_[symbol] || symbol)+"'"));
                }
                this.parseError(errStr,
                    {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }

            // just recovered from another error
            if (recovering == 3) {
                if (symbol == EOF) {
                    throw new Error(errStr || 'Parsing halted.');
                }

                // discard current lookahead and grab another
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                symbol = lex();
            }

            // try to recover from error
            while (1) {
                // check for error recovery rule in this state
                if ((TERROR.toString()) in table[state]) {
                    break;
                }
                if (state == 0) {
                    throw new Error(errStr || 'Parsing halted.');
                }
                popStack(1);
                state = stack[stack.length-1];
            }

            preErrorSymbol = symbol; // save the lookahead token
            symbol = TERROR;         // insert generic error symbol as new lookahead
            state = stack[stack.length-1];
            action = table[state] && table[state][TERROR];
            recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
        }

        // this shouldn't happen, unless resolve defaults are off
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: '+state+', token: '+symbol);
        }

        switch (action[0]) {

            case 1: // shift
                //this.shiftCount++;

                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                lstack.push(this.lexer.yylloc);
                stack.push(action[1]); // push state
                symbol = null;
                if (!preErrorSymbol) { // normal execution/no error
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0)
                        recovering--;
                } else { // error just occurred, resume old lookahead f/ before error
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;

            case 2: // reduce
                //this.reductionCount++;

                len = this.productions_[action[1]][1];

                // perform semantic action
                yyval.$ = vstack[vstack.length-len]; // default to $$ = $1
                // default location, uses first token for firsts, last for lasts
                yyval._$ = {
                    first_line: lstack[lstack.length-(len||1)].first_line,
                    last_line: lstack[lstack.length-1].last_line,
                    first_column: lstack[lstack.length-(len||1)].first_column,
                    last_column: lstack[lstack.length-1].last_column
                };
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);

                if (typeof r !== 'undefined') {
                    return r;
                }

                // pop off stack
                if (len) {
                    stack = stack.slice(0,-1*len*2);
                    vstack = vstack.slice(0, -1*len);
                    lstack = lstack.slice(0, -1*len);
                }

                stack.push(this.productions_[action[1]][0]);    // push nonterminal (reduce)
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                // goto new state = table[STATE][NONTERMINAL]
                newState = table[stack[stack.length-2]][stack[stack.length-1]];
                stack.push(newState);
                break;

            case 3: // accept
                return true;
        }

    }

    return true;
}};/* Jison generated lexer */
var lexer = (function(){

var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parseError) {
            this.yy.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext+=ch;
        this.yyleng++;
        this.match+=ch;
        this.matched+=ch;
        var lines = ch.match(/\n/);
        if (lines) this.yylineno++;
        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        this._input = ch + this._input;
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            match = this._input.match(this.rules[rules[i]]);
            if (match) {
                lines = match[0].match(/\n.*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = {first_line: this.yylloc.last_line,
                               last_line: this.yylineno+1,
                               first_column: this.yylloc.last_column,
                               last_column: lines ? lines[lines.length-1].length-1 : this.yylloc.last_column + match[0].length}
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[i],this.conditionStack[this.conditionStack.length-1]);
                if (token) return token;
                else return;
            }
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(), 
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:return 20
break;
case 2:return 19
break;
case 3:return 8
break;
case 4:return 9
break;
case 5:return 6
break;
case 6:return 7
break;
case 7:return 11
break;
case 8:return 13
break;
case 9:return 10
break;
case 10:return 12
break;
case 11:return 14
break;
case 12:return 15
break;
case 13:return 16
break;
case 14:return 17
break;
case 15:return 18
break;
case 16:return 5
break;
case 17:return 'INVALID'
break;
}
};
lexer.rules = [/^\s+/,/^[0-9]+(\.[0-9]+)?\b/,/^n\b/,/^\|\|/,/^&&/,/^\?/,/^:/,/^<=/,/^>=/,/^</,/^>/,/^!=/,/^==/,/^%/,/^\(/,/^\)/,/^$/,/^./];
lexer.conditions = {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],"inclusive":true}};return lexer;})()
parser.lexer = lexer;
return parser;
})();
// End parser

  // Handle node, amd, and global systems
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Jed;
    }
    exports.Jed = Jed;
  }
  else {
    if (typeof define === 'function' && define.amd) {
      define('jed',[], function() {
        return Jed;
      });
    }
    // Leak a global regardless of module system
    root['Jed'] = Jed;
  }

})(this);

var promise = (function() {

    // minipromise
    // One can optionally bestow the promise capabilities to any existing object.
    function promise(obj) {
        if (typeof obj === 'undefined') {
            obj = {};
        }

        var pending = true;
        var fulfilled = false;
        var fulfillHandlers = [];
        var rejectHandlers = [];
        var result;

        obj.then = function(onFulfilled, onRejected) {
            var p = promise();

            fulfillHandlers.push([onFulfilled, p]);
            rejectHandlers.push([onRejected, p]);

            setTimeout(function() {
                if (!pending) {
                    if (fulfilled) {
                        flushHandlers(fulfillHandlers);
                    } else {
                        flushHandlers(rejectHandlers);
                    }
                }
            }, 0);
            return p;
        };

        obj.fulfill = function(value) {
            if (pending) {
                result = value;
                pending = false;
                fulfilled = true;

                flushHandlers(fulfillHandlers);
            }
        };

        obj.reject = function(reason) {
            if (pending) {
                result = reason;
                pending = false;

                flushHandlers(rejectHandlers);
            }
        };

        function flushHandlers(list) {
            while (list.length) {
                var tuple = list.shift();
                var handler = tuple[0];
                var p = tuple[1];
                if (typeof handler === 'function') {
                    try {
                        var subResult = handler(result);
                    } catch (e) {
                        p.reject(e);
                    }
                    if (promise.isPromise(subResult)) {
                        subResult.then(p.fulfill, p.reject);
                    } else {
                        p.fulfill(subResult);
                    }
                } else {
                    if (fulfilled) {
                        p.fulfill(result);
                    } else {
                        p.reject(result);
                    }
                }
            }
        }

        return obj;
    }

    promise.isPromise = function(p) {
        return p && ('then' in p && typeof p.then === 'function');
    }

    // wrap a function in a promise
    promise.avow = function (fn) {
      var p = promise();
      return function() {
        fn.apply(null, [p.fulfill, p.reject].concat(Array.prototype.slice.apply(arguments)));
        return { then: p.then };
      };
    }

    if (this.define !== undefined && define.amd) {
        define('promise', [], promise);
    } else if (typeof module !== 'undefined' && module.exports !== undefined) {
        module.exports = promise;
    }

    return promise;
})();

/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */



/**
 * This file defines an asynchronous version of the localStorage API, backed by
 * an IndexedDB database.  It creates a global asyncStorage object that has
 * methods like the localStorage object.
 *
 * To store a value use setItem:
 *
 *   asyncStorage.setItem('key', 'value');
 *
 * If you want confirmation that the value has been stored, pass a callback
 * function as the third argument:
 *
 *  asyncStorage.setItem('key', 'newvalue', function() {
 *    console.log('new value stored');
 *  });
 *
 * To read a value, call getItem(), but note that you must supply a callback
 * function that the value will be passed to asynchronously:
 *
 *  asyncStorage.getItem('key', function(value) {
 *    console.log('The value of key is:', value);
 *  });
 *
 * Note that unlike localStorage, asyncStorage does not allow you to store and
 * retrieve values by setting and querying properties directly. You cannot just
 * write asyncStorage.key; you have to explicitly call setItem() or getItem().
 *
 * removeItem(), clear(), length(), and key() are like the same-named methods of
 * localStorage, but, like getItem() and setItem() they take a callback
 * argument.
 *
 * The asynchronous nature of getItem() makes it tricky to retrieve multiple
 * values. But unlike localStorage, asyncStorage does not require the values you
 * store to be strings.  So if you need to save multiple values and want to
 * retrieve them together, in a single asynchronous operation, just group the
 * values into a single object. The properties of this object may not include
 * DOM elements, but they may include things like Blobs and typed arrays.
 *
 * Unit tests are in apps/gallery/test/unit/asyncStorage_test.js
 */

define('async_storage',['promise'], function(promise) {
  var DBNAME = 'asyncStorage';
  var DBVERSION = 1;
  var STORENAME = 'keyvaluepairs';
  var db = null;

  // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
  var indexedDB = indexedDB || window.indexedDB || window.webkitIndexedDB ||
                  window.mozIndexedDB || window.OIndexedDB ||
                  window.msIndexedDB;

  function withStore(type, f) {
    if (db) {
      f(db.transaction(STORENAME, type).objectStore(STORENAME));
    } else {
      var openreq = indexedDB.open(DBNAME, DBVERSION);
      openreq.onerror = function withStoreOnError() {
        console.error("asyncStorage: can't open database:", openreq.error.name);
      };
      openreq.onupgradeneeded = function withStoreOnUpgradeNeeded() {
        // First time setup: create an empty object store
        openreq.result.createObjectStore(STORENAME);
      };
      openreq.onsuccess = function withStoreOnSuccess() {
        db = openreq.result;
        f(db.transaction(STORENAME, type).objectStore(STORENAME));
      };
    }
  }

  function getItem(key, callback) {
    var p = promise();
    withStore('readonly', function getItemBody(store) {
      var req = store.get(key);
      req.onsuccess = function getItemOnSuccess() {
        var value = req.result;
        if (value === undefined) {
          value = null;
        }

        if (callback) {
          callback(value);
        }

        p.fulfill(value);
      };
      req.onerror = function getItemOnError() {
        console.error('Error in asyncStorage.getItem(): ', req.error.name);
      };
    });
    return p;
  }

  function setItem(key, value, callback) {
    var p = promise();
    withStore('readwrite', function setItemBody(store) {
      var req = store.put(value, key);
      req.onsuccess = function setItemOnSuccess() {
        if (callback) {
          callback(value);
        }

        p.fulfill(value);
      };
      req.onerror = function setItemOnError() {
        console.error('Error in asyncStorage.setItem(): ', req.error.name);
      };
    });
    return p;
  }

  function removeItem(key, callback) {
    var p = promise();
    withStore('readwrite', function removeItemBody(store) {
      var req = store.delete(key);
      req.onsuccess = function removeItemOnSuccess() {
        if (callback) {
          callback();
        }

        p.fulfill();
      };
      req.onerror = function removeItemOnError() {
        console.error('Error in asyncStorage.removeItem(): ', req.error.name);
      };
    });
    return p;
  }

  function clear(callback) {
    var p = promise();
    withStore('readwrite', function clearBody(store) {
      var req = store.clear();
      req.onsuccess = function clearOnSuccess() {
        if (callback) {
          callback();
        }

        p.fulfill();
      };
      req.onerror = function clearOnError() {
        console.error('Error in asyncStorage.clear(): ', req.error.name);
      };
    });
    return p;
  }

  function length(callback) {
    var p = promise();
    withStore('readonly', function lengthBody(store) {
      var req = store.count();
      req.onsuccess = function lengthOnSuccess() {
        if (callback) {
          callback(req.result);
        }

        p.fulfill(req.result);
      };
      req.onerror = function lengthOnError() {
        console.error('Error in asyncStorage.length(): ', req.error.name);
      };
    });
    return p;
  }

  function key(n, callback) {
    var p = promise();
    if (n < 0) {
      if (callback) {
        callback(null);
      }

      p.fulfill(null);

      return p;
    }

    withStore('readonly', function keyBody(store) {
      var advanced = false;
      var req = store.openCursor();
      req.onsuccess = function keyOnSuccess() {
        var cursor = req.result;
        if (!cursor) {
          // this means there weren't enough keys
          if (callback) {
            callback(null);
          }

          p.fulfill(null);
          return;
        }
        if (n === 0) {
          // We have the first key, return it if that's what they wanted
          if (callback) {
            callback(cursor.key);
          }
          p.fulfill(cursor.key);
        } else {
          if (!advanced) {
            // Otherwise, ask the cursor to skip ahead n records
            advanced = true;
            cursor.advance(n);
          } else {
            // When we get here, we've got the nth key.
            if (callback) {
              callback(cursor.key);
            }

            p.fulfill(cursor.key);
          }
        }
      };
      req.onerror = function keyOnError() {
        console.error('Error in asyncStorage.key(): ', req.error.name);
      };
    });

    return p;
  }

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key
  };
});



// localForage is a library that allows users to create offline Backbone models
// and use IndexedDB to store large pieces of data.
define('localforage',['async_storage', 'promise'], function(asyncStorage, promise) {
    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
    var indexedDB = indexedDB || window.indexedDB || window.webkitIndexedDB ||
                    window.mozIndexedDB || window.OIndexedDB ||
                    window.msIndexedDB;

    // Because indexedDB is available, we'll use it to store data.
    if (!window._FORCE_LOCALSTORAGE && indexedDB) {
        return asyncStorage;
    }

    // Initialize localStorage and create a variable to use throughout the code.
    var localStorage = window.localStorage;

    // If IndexedDB isn't available, we'll fall back to localStorage.
    // Note that this will have considerable performance and storage
    // side-effects (all data will be serialized on save and only data that
    // can be converted to a string via `JSON.stringify()` will be saved).
    // Remove all keys from the datastore, effectively destroying all data in
    // the app's key/value store!
    function clear(callback) {
        var p = promise();

        localStorage.clear();
        if (callback) {
            callback();
        }

        p.fulfill();

        return p;
    }

    // Retrieve an item from the store. Unlike the original async_storage
    // library in Gaia, we don't modify return values at all. If a key's value
    // is `undefined`, we pass that value to the callback function.
    function getItem(key, callback) {
        var p = promise();
        var result = localStorage.getItem(key);

        // If a result was found, parse it from serialized JSON into a
        // JS object. If result isn't truthy, the key is likely
        // undefined and we'll pass it straight to the callback.
        if (result) {
            result = JSON.parse(result);
        }

        if (callback) {
            callback(result);
        }

        p.fulfill(result);

        return p;
    }

    // Same as localStorage's key() method, except takes a callback.
    function key(n, callback) {
        var p = promise();
        var result = localStorage.key(n);

        if (callback) {
            callback(result);
        }

        p.fulfill(result);

        return p;
    }

    // Supply the number of keys in the datastore to the callback function.
    function length(callback) {
        var p = promise();
        var result = localStorage.length;

        if (callback) {
            callback(result);
        }

        p.fulfill(result);

        return p;
    }

    // Remove an item from the store, nice and simple.
    function removeItem(key, callback) {
        var p = promise();

        localStorage.removeItem(key);
        if (callback) {
            callback();
        }

        p.fulfill();

        return p;
    }

    // Set a key's value and run an optional callback once the value is set.
    // Unlike Gaia's implementation, the callback function is passed the value,
    // in case you want to operate on that value only after you're sure it
    // saved, or something like that.
    function setItem(key, value, callback) {
        var p = promise();

        try {
            value = JSON.stringify(value);
        } catch (e) {
            console.error("Couldn't convert value into a JSON string: ",
                          value);
        }

        localStorage.setItem(key, value);
        if (callback) {
            callback(value);
        }

        p.fulfill(value);

        return p;
    }

    return {
        // Default API, from Gaia/localStorage.
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,

        // Pretty, less-verbose API.
        get: getItem,
        set: setItem,
        remove: removeItem,
        removeAll: clear
    };
});

// Generated by CoffeeScript 1.6.3
(function() {
  var Deferred, PENDING, REJECTED, RESOLVED, VERSION, after, execute, flatten, has, installInto, isArguments, isPromise, wrap, _when,
    __slice = [].slice;

  VERSION = '2.4.0';

  PENDING = "pending";

  RESOLVED = "resolved";

  REJECTED = "rejected";

  has = function(obj, prop) {
    return obj != null ? obj.hasOwnProperty(prop) : void 0;
  };

  isArguments = function(obj) {
    return has(obj, 'length') && has(obj, 'callee');
  };

  isPromise = function(obj) {
    return has(obj, 'promise') && typeof (obj != null ? obj.promise : void 0) === 'function';
  };

  flatten = function(array) {
    if (isArguments(array)) {
      return flatten(Array.prototype.slice.call(array));
    }
    if (!Array.isArray(array)) {
      return [array];
    }
    return array.reduce(function(memo, value) {
      if (Array.isArray(value)) {
        return memo.concat(flatten(value));
      }
      memo.push(value);
      return memo;
    }, []);
  };

  after = function(times, func) {
    if (times <= 0) {
      return func();
    }
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  wrap = function(func, wrapper) {
    return function() {
      var args;
      args = [func].concat(Array.prototype.slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  execute = function(callbacks, args, context) {
    var callback, _i, _len, _ref, _results;
    _ref = flatten(callbacks);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      callback = _ref[_i];
      _results.push(callback.call.apply(callback, [context].concat(__slice.call(args))));
    }
    return _results;
  };

  Deferred = function() {
    var candidate, close, closingArguments, doneCallbacks, failCallbacks, state;
    state = PENDING;
    doneCallbacks = [];
    failCallbacks = [];
    closingArguments = {};
    this.promise = function(candidate) {
      var pipe, storeCallbacks;
      candidate = candidate || {};
      candidate.state = function() {
        return state;
      };
      storeCallbacks = function(shouldExecuteImmediately, holder) {
        return function() {
          if (state === PENDING) {
            holder.push.apply(holder, flatten(arguments));
          }
          if (shouldExecuteImmediately()) {
            execute(arguments, closingArguments);
          }
          return candidate;
        };
      };
      candidate.done = storeCallbacks((function() {
        return state === RESOLVED;
      }), doneCallbacks);
      candidate.fail = storeCallbacks((function() {
        return state === REJECTED;
      }), failCallbacks);
      candidate.always = function() {
        var _ref;
        return (_ref = candidate.done.apply(candidate, arguments)).fail.apply(_ref, arguments);
      };
      pipe = function(doneFilter, failFilter) {
        var filter, master;
        master = new Deferred();
        filter = function(source, funnel, callback) {
          if (!callback) {
            return candidate[source](master[funnel]);
          }
          return candidate[source](function() {
            var args, value;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            value = callback.apply(null, args);
            if (isPromise(value)) {
              return value.done(master.resolve).fail(master.reject);
            } else {
              return master[funnel](value);
            }
          });
        };
        filter('done', 'resolve', doneFilter);
        filter('fail', 'reject', failFilter);
        return master;
      };
      candidate.pipe = pipe;
      candidate.then = pipe;
      if (candidate.promise == null) {
        candidate.promise = function() {
          return candidate;
        };
      }
      return candidate;
    };
    this.promise(this);
    candidate = this;
    close = function(finalState, callbacks, context) {
      return function() {
        if (state === PENDING) {
          state = finalState;
          closingArguments = arguments;
          execute(callbacks, closingArguments, context);
          return candidate;
        }
        return this;
      };
    };
    this.resolve = close(RESOLVED, doneCallbacks);
    this.reject = close(REJECTED, failCallbacks);
    this.resolveWith = function(context, args) {
      return close(RESOLVED, doneCallbacks, context).apply(null, args);
    };
    this.rejectWith = function(context, args) {
      return close(REJECTED, failCallbacks, context).apply(null, args);
    };
    return this;
  };

  _when = function() {
    var def, defs, finish, resolutionArgs, trigger, _i, _len;
    defs = flatten(arguments);
    if (defs.length === 1) {
      if (isPromise(defs[0])) {
        return defs[0];
      } else {
        return (new Deferred()).resolve(defs[0]).promise();
      }
    }
    trigger = new Deferred();
    if (!defs.length) {
      return trigger.resolve().promise();
    }
    resolutionArgs = [];
    finish = after(defs.length, function() {
      return trigger.resolve.apply(trigger, resolutionArgs);
    });
    defs.forEach(function(def, index) {
      if (isPromise(def)) {
        return def.done(function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          resolutionArgs[index] = args.length > 1 ? args : args[0];
          return finish();
        });
      } else {
        resolutionArgs[index] = def;
        return finish();
      }
    });
    for (_i = 0, _len = defs.length; _i < _len; _i++) {
      def = defs[_i];
      isPromise(def) && def.fail(trigger.reject);
    }
    return trigger.promise();
  };

  installInto = function(fw) {
    fw.Deferred = function() {
      return new Deferred();
    };
    fw.ajax = wrap(fw.ajax, function(ajax, options) {
      var createWrapper, def, promise, xhr;
      if (options == null) {
        options = {};
      }
      def = new Deferred();
      createWrapper = function(wrapped, finisher) {
        return wrap(wrapped, function() {
          var args, func;
          func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          if (func) {
            func.apply(null, args);
          }
          return finisher.apply(null, args);
        });
      };
      options.success = createWrapper(options.success, def.resolve);
      options.error = createWrapper(options.error, def.reject);
      xhr = ajax(options);
      promise = def.promise();
      promise.abort = function() {
        return xhr.abort();
      };
      return promise;
    });
    return fw.when = _when;
  };

  if (typeof exports !== 'undefined') {
    exports.Deferred = function() {
      return new Deferred();
    };
    exports.when = _when;
    exports.installInto = installInto;
  } else if (typeof define === 'function' && define.amd) {
    define('deferred',[],function() {
      if (typeof Zepto !== 'undefined') {
        return installInto(Zepto);
      } else {
        return Deferred;
      }
    });
  } else if (typeof Zepto !== 'undefined') {
    installInto(Zepto);
  } else {
    this.Deferred = function() {
      return new Deferred();
    };
    this.Deferred.when = _when;
    this.Deferred.installInto = installInto;
  }

}).call(this);

//! moment.js
//! version : 2.4.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
(function(a){function b(a,b){return function(c){return i(a.call(this,c),b)}}function c(a,b){return function(c){return this.lang().ordinal(a.call(this,c),b)}}function d(){}function e(a){u(a),g(this,a)}function f(a){var b=o(a),c=b.year||0,d=b.month||0,e=b.week||0,f=b.day||0,g=b.hour||0,h=b.minute||0,i=b.second||0,j=b.millisecond||0;this._input=a,this._milliseconds=+j+1e3*i+6e4*h+36e5*g,this._days=+f+7*e,this._months=+d+12*c,this._data={},this._bubble()}function g(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return b.hasOwnProperty("toString")&&(a.toString=b.toString),b.hasOwnProperty("valueOf")&&(a.valueOf=b.valueOf),a}function h(a){return 0>a?Math.ceil(a):Math.floor(a)}function i(a,b){for(var c=a+"";c.length<b;)c="0"+c;return c}function j(a,b,c,d){var e,f,g=b._milliseconds,h=b._days,i=b._months;g&&a._d.setTime(+a._d+g*c),(h||i)&&(e=a.minute(),f=a.hour()),h&&a.date(a.date()+h*c),i&&a.month(a.month()+i*c),g&&!d&&bb.updateOffset(a),(h||i)&&(a.minute(e),a.hour(f))}function k(a){return"[object Array]"===Object.prototype.toString.call(a)}function l(a){return"[object Date]"===Object.prototype.toString.call(a)||a instanceof Date}function m(a,b,c){var d,e=Math.min(a.length,b.length),f=Math.abs(a.length-b.length),g=0;for(d=0;e>d;d++)(c&&a[d]!==b[d]||!c&&q(a[d])!==q(b[d]))&&g++;return g+f}function n(a){if(a){var b=a.toLowerCase().replace(/(.)s$/,"$1");a=Kb[a]||Lb[b]||b}return a}function o(a){var b,c,d={};for(c in a)a.hasOwnProperty(c)&&(b=n(c),b&&(d[b]=a[c]));return d}function p(b){var c,d;if(0===b.indexOf("week"))c=7,d="day";else{if(0!==b.indexOf("month"))return;c=12,d="month"}bb[b]=function(e,f){var g,h,i=bb.fn._lang[b],j=[];if("number"==typeof e&&(f=e,e=a),h=function(a){var b=bb().utc().set(d,a);return i.call(bb.fn._lang,b,e||"")},null!=f)return h(f);for(g=0;c>g;g++)j.push(h(g));return j}}function q(a){var b=+a,c=0;return 0!==b&&isFinite(b)&&(c=b>=0?Math.floor(b):Math.ceil(b)),c}function r(a,b){return new Date(Date.UTC(a,b+1,0)).getUTCDate()}function s(a){return t(a)?366:365}function t(a){return 0===a%4&&0!==a%100||0===a%400}function u(a){var b;a._a&&-2===a._pf.overflow&&(b=a._a[gb]<0||a._a[gb]>11?gb:a._a[hb]<1||a._a[hb]>r(a._a[fb],a._a[gb])?hb:a._a[ib]<0||a._a[ib]>23?ib:a._a[jb]<0||a._a[jb]>59?jb:a._a[kb]<0||a._a[kb]>59?kb:a._a[lb]<0||a._a[lb]>999?lb:-1,a._pf._overflowDayOfYear&&(fb>b||b>hb)&&(b=hb),a._pf.overflow=b)}function v(a){a._pf={empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1}}function w(a){return null==a._isValid&&(a._isValid=!isNaN(a._d.getTime())&&a._pf.overflow<0&&!a._pf.empty&&!a._pf.invalidMonth&&!a._pf.nullInput&&!a._pf.invalidFormat&&!a._pf.userInvalidated,a._strict&&(a._isValid=a._isValid&&0===a._pf.charsLeftOver&&0===a._pf.unusedTokens.length)),a._isValid}function x(a){return a?a.toLowerCase().replace("_","-"):a}function y(a,b){return b.abbr=a,mb[a]||(mb[a]=new d),mb[a].set(b),mb[a]}function z(a){delete mb[a]}function A(a){var b,c,d,e,f=0,g=function(a){if(!mb[a]&&nb)try{require("./lang/"+a)}catch(b){}return mb[a]};if(!a)return bb.fn._lang;if(!k(a)){if(c=g(a))return c;a=[a]}for(;f<a.length;){for(e=x(a[f]).split("-"),b=e.length,d=x(a[f+1]),d=d?d.split("-"):null;b>0;){if(c=g(e.slice(0,b).join("-")))return c;if(d&&d.length>=b&&m(e,d,!0)>=b-1)break;b--}f++}return bb.fn._lang}function B(a){return a.match(/\[[\s\S]/)?a.replace(/^\[|\]$/g,""):a.replace(/\\/g,"")}function C(a){var b,c,d=a.match(rb);for(b=0,c=d.length;c>b;b++)d[b]=Pb[d[b]]?Pb[d[b]]:B(d[b]);return function(e){var f="";for(b=0;c>b;b++)f+=d[b]instanceof Function?d[b].call(e,a):d[b];return f}}function D(a,b){return a.isValid()?(b=E(b,a.lang()),Mb[b]||(Mb[b]=C(b)),Mb[b](a)):a.lang().invalidDate()}function E(a,b){function c(a){return b.longDateFormat(a)||a}var d=5;for(sb.lastIndex=0;d>=0&&sb.test(a);)a=a.replace(sb,c),sb.lastIndex=0,d-=1;return a}function F(a,b){var c;switch(a){case"DDDD":return vb;case"YYYY":case"GGGG":case"gggg":return wb;case"YYYYY":case"GGGGG":case"ggggg":return xb;case"S":case"SS":case"SSS":case"DDD":return ub;case"MMM":case"MMMM":case"dd":case"ddd":case"dddd":return zb;case"a":case"A":return A(b._l)._meridiemParse;case"X":return Cb;case"Z":case"ZZ":return Ab;case"T":return Bb;case"SSSS":return yb;case"MM":case"DD":case"YY":case"GG":case"gg":case"HH":case"hh":case"mm":case"ss":case"M":case"D":case"d":case"H":case"h":case"m":case"s":case"w":case"ww":case"W":case"WW":case"e":case"E":return tb;default:return c=new RegExp(N(M(a.replace("\\","")),"i"))}}function G(a){var b=(Ab.exec(a)||[])[0],c=(b+"").match(Hb)||["-",0,0],d=+(60*c[1])+q(c[2]);return"+"===c[0]?-d:d}function H(a,b,c){var d,e=c._a;switch(a){case"M":case"MM":null!=b&&(e[gb]=q(b)-1);break;case"MMM":case"MMMM":d=A(c._l).monthsParse(b),null!=d?e[gb]=d:c._pf.invalidMonth=b;break;case"D":case"DD":null!=b&&(e[hb]=q(b));break;case"DDD":case"DDDD":null!=b&&(c._dayOfYear=q(b));break;case"YY":e[fb]=q(b)+(q(b)>68?1900:2e3);break;case"YYYY":case"YYYYY":e[fb]=q(b);break;case"a":case"A":c._isPm=A(c._l).isPM(b);break;case"H":case"HH":case"h":case"hh":e[ib]=q(b);break;case"m":case"mm":e[jb]=q(b);break;case"s":case"ss":e[kb]=q(b);break;case"S":case"SS":case"SSS":case"SSSS":e[lb]=q(1e3*("0."+b));break;case"X":c._d=new Date(1e3*parseFloat(b));break;case"Z":case"ZZ":c._useUTC=!0,c._tzm=G(b);break;case"w":case"ww":case"W":case"WW":case"d":case"dd":case"ddd":case"dddd":case"e":case"E":a=a.substr(0,1);case"gg":case"gggg":case"GG":case"GGGG":case"GGGGG":a=a.substr(0,2),b&&(c._w=c._w||{},c._w[a]=b)}}function I(a){var b,c,d,e,f,g,h,i,j,k,l=[];if(!a._d){for(d=K(a),a._w&&null==a._a[hb]&&null==a._a[gb]&&(f=function(b){return b?b.length<3?parseInt(b,10)>68?"19"+b:"20"+b:b:null==a._a[fb]?bb().weekYear():a._a[fb]},g=a._w,null!=g.GG||null!=g.W||null!=g.E?h=X(f(g.GG),g.W||1,g.E,4,1):(i=A(a._l),j=null!=g.d?T(g.d,i):null!=g.e?parseInt(g.e,10)+i._week.dow:0,k=parseInt(g.w,10)||1,null!=g.d&&j<i._week.dow&&k++,h=X(f(g.gg),k,j,i._week.doy,i._week.dow)),a._a[fb]=h.year,a._dayOfYear=h.dayOfYear),a._dayOfYear&&(e=null==a._a[fb]?d[fb]:a._a[fb],a._dayOfYear>s(e)&&(a._pf._overflowDayOfYear=!0),c=S(e,0,a._dayOfYear),a._a[gb]=c.getUTCMonth(),a._a[hb]=c.getUTCDate()),b=0;3>b&&null==a._a[b];++b)a._a[b]=l[b]=d[b];for(;7>b;b++)a._a[b]=l[b]=null==a._a[b]?2===b?1:0:a._a[b];l[ib]+=q((a._tzm||0)/60),l[jb]+=q((a._tzm||0)%60),a._d=(a._useUTC?S:R).apply(null,l)}}function J(a){var b;a._d||(b=o(a._i),a._a=[b.year,b.month,b.day,b.hour,b.minute,b.second,b.millisecond],I(a))}function K(a){var b=new Date;return a._useUTC?[b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()]:[b.getFullYear(),b.getMonth(),b.getDate()]}function L(a){a._a=[],a._pf.empty=!0;var b,c,d,e,f,g=A(a._l),h=""+a._i,i=h.length,j=0;for(d=E(a._f,g).match(rb)||[],b=0;b<d.length;b++)e=d[b],c=(F(e,a).exec(h)||[])[0],c&&(f=h.substr(0,h.indexOf(c)),f.length>0&&a._pf.unusedInput.push(f),h=h.slice(h.indexOf(c)+c.length),j+=c.length),Pb[e]?(c?a._pf.empty=!1:a._pf.unusedTokens.push(e),H(e,c,a)):a._strict&&!c&&a._pf.unusedTokens.push(e);a._pf.charsLeftOver=i-j,h.length>0&&a._pf.unusedInput.push(h),a._isPm&&a._a[ib]<12&&(a._a[ib]+=12),a._isPm===!1&&12===a._a[ib]&&(a._a[ib]=0),I(a),u(a)}function M(a){return a.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(a,b,c,d,e){return b||c||d||e})}function N(a){return a.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}function O(a){var b,c,d,e,f;if(0===a._f.length)return a._pf.invalidFormat=!0,a._d=new Date(0/0),void 0;for(e=0;e<a._f.length;e++)f=0,b=g({},a),v(b),b._f=a._f[e],L(b),w(b)&&(f+=b._pf.charsLeftOver,f+=10*b._pf.unusedTokens.length,b._pf.score=f,(null==d||d>f)&&(d=f,c=b));g(a,c||b)}function P(a){var b,c=a._i,d=Db.exec(c);if(d){for(a._pf.iso=!0,b=4;b>0;b--)if(d[b]){a._f=Fb[b-1]+(d[6]||" ");break}for(b=0;4>b;b++)if(Gb[b][1].exec(c)){a._f+=Gb[b][0];break}Ab.exec(c)&&(a._f+="Z"),L(a)}else a._d=new Date(c)}function Q(b){var c=b._i,d=ob.exec(c);c===a?b._d=new Date:d?b._d=new Date(+d[1]):"string"==typeof c?P(b):k(c)?(b._a=c.slice(0),I(b)):l(c)?b._d=new Date(+c):"object"==typeof c?J(b):b._d=new Date(c)}function R(a,b,c,d,e,f,g){var h=new Date(a,b,c,d,e,f,g);return 1970>a&&h.setFullYear(a),h}function S(a){var b=new Date(Date.UTC.apply(null,arguments));return 1970>a&&b.setUTCFullYear(a),b}function T(a,b){if("string"==typeof a)if(isNaN(a)){if(a=b.weekdaysParse(a),"number"!=typeof a)return null}else a=parseInt(a,10);return a}function U(a,b,c,d,e){return e.relativeTime(b||1,!!c,a,d)}function V(a,b,c){var d=eb(Math.abs(a)/1e3),e=eb(d/60),f=eb(e/60),g=eb(f/24),h=eb(g/365),i=45>d&&["s",d]||1===e&&["m"]||45>e&&["mm",e]||1===f&&["h"]||22>f&&["hh",f]||1===g&&["d"]||25>=g&&["dd",g]||45>=g&&["M"]||345>g&&["MM",eb(g/30)]||1===h&&["y"]||["yy",h];return i[2]=b,i[3]=a>0,i[4]=c,U.apply({},i)}function W(a,b,c){var d,e=c-b,f=c-a.day();return f>e&&(f-=7),e-7>f&&(f+=7),d=bb(a).add("d",f),{week:Math.ceil(d.dayOfYear()/7),year:d.year()}}function X(a,b,c,d,e){var f,g,h=new Date(Date.UTC(a,0)).getUTCDay();return c=null!=c?c:e,f=e-h+(h>d?7:0),g=7*(b-1)+(c-e)+f+1,{year:g>0?a:a-1,dayOfYear:g>0?g:s(a-1)+g}}function Y(a){var b=a._i,c=a._f;return"undefined"==typeof a._pf&&v(a),null===b?bb.invalid({nullInput:!0}):("string"==typeof b&&(a._i=b=A().preparse(b)),bb.isMoment(b)?(a=g({},b),a._d=new Date(+b._d)):c?k(c)?O(a):L(a):Q(a),new e(a))}function Z(a,b){bb.fn[a]=bb.fn[a+"s"]=function(a){var c=this._isUTC?"UTC":"";return null!=a?(this._d["set"+c+b](a),bb.updateOffset(this),this):this._d["get"+c+b]()}}function $(a){bb.duration.fn[a]=function(){return this._data[a]}}function _(a,b){bb.duration.fn["as"+a]=function(){return+this/b}}function ab(a){var b=!1,c=bb;"undefined"==typeof ender&&(this.moment=a?function(){return!b&&console&&console.warn&&(b=!0,console.warn("Accessing Moment through the global scope is deprecated, and will be removed in an upcoming release.")),c.apply(null,arguments)}:bb)}for(var bb,cb,db="2.4.0",eb=Math.round,fb=0,gb=1,hb=2,ib=3,jb=4,kb=5,lb=6,mb={},nb="undefined"!=typeof module&&module.exports,ob=/^\/?Date\((\-?\d+)/i,pb=/(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,qb=/^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,rb=/(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,sb=/(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,tb=/\d\d?/,ub=/\d{1,3}/,vb=/\d{3}/,wb=/\d{1,4}/,xb=/[+\-]?\d{1,6}/,yb=/\d+/,zb=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,Ab=/Z|[\+\-]\d\d:?\d\d/i,Bb=/T/i,Cb=/[\+\-]?\d+(\.\d{1,3})?/,Db=/^\s*\d{4}-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d:?\d\d|Z)?)?$/,Eb="YYYY-MM-DDTHH:mm:ssZ",Fb=["YYYY-MM-DD","GGGG-[W]WW","GGGG-[W]WW-E","YYYY-DDD"],Gb=[["HH:mm:ss.SSSS",/(T| )\d\d:\d\d:\d\d\.\d{1,3}/],["HH:mm:ss",/(T| )\d\d:\d\d:\d\d/],["HH:mm",/(T| )\d\d:\d\d/],["HH",/(T| )\d\d/]],Hb=/([\+\-]|\d\d)/gi,Ib="Date|Hours|Minutes|Seconds|Milliseconds".split("|"),Jb={Milliseconds:1,Seconds:1e3,Minutes:6e4,Hours:36e5,Days:864e5,Months:2592e6,Years:31536e6},Kb={ms:"millisecond",s:"second",m:"minute",h:"hour",d:"day",D:"date",w:"week",W:"isoWeek",M:"month",y:"year",DDD:"dayOfYear",e:"weekday",E:"isoWeekday",gg:"weekYear",GG:"isoWeekYear"},Lb={dayofyear:"dayOfYear",isoweekday:"isoWeekday",isoweek:"isoWeek",weekyear:"weekYear",isoweekyear:"isoWeekYear"},Mb={},Nb="DDD w W M D d".split(" "),Ob="M D H h m s w W".split(" "),Pb={M:function(){return this.month()+1},MMM:function(a){return this.lang().monthsShort(this,a)},MMMM:function(a){return this.lang().months(this,a)},D:function(){return this.date()},DDD:function(){return this.dayOfYear()},d:function(){return this.day()},dd:function(a){return this.lang().weekdaysMin(this,a)},ddd:function(a){return this.lang().weekdaysShort(this,a)},dddd:function(a){return this.lang().weekdays(this,a)},w:function(){return this.week()},W:function(){return this.isoWeek()},YY:function(){return i(this.year()%100,2)},YYYY:function(){return i(this.year(),4)},YYYYY:function(){return i(this.year(),5)},gg:function(){return i(this.weekYear()%100,2)},gggg:function(){return this.weekYear()},ggggg:function(){return i(this.weekYear(),5)},GG:function(){return i(this.isoWeekYear()%100,2)},GGGG:function(){return this.isoWeekYear()},GGGGG:function(){return i(this.isoWeekYear(),5)},e:function(){return this.weekday()},E:function(){return this.isoWeekday()},a:function(){return this.lang().meridiem(this.hours(),this.minutes(),!0)},A:function(){return this.lang().meridiem(this.hours(),this.minutes(),!1)},H:function(){return this.hours()},h:function(){return this.hours()%12||12},m:function(){return this.minutes()},s:function(){return this.seconds()},S:function(){return q(this.milliseconds()/100)},SS:function(){return i(q(this.milliseconds()/10),2)},SSS:function(){return i(this.milliseconds(),3)},SSSS:function(){return i(this.milliseconds(),3)},Z:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+i(q(a/60),2)+":"+i(q(a)%60,2)},ZZ:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+i(q(10*a/6),4)},z:function(){return this.zoneAbbr()},zz:function(){return this.zoneName()},X:function(){return this.unix()}},Qb=["months","monthsShort","weekdays","weekdaysShort","weekdaysMin"];Nb.length;)cb=Nb.pop(),Pb[cb+"o"]=c(Pb[cb],cb);for(;Ob.length;)cb=Ob.pop(),Pb[cb+cb]=b(Pb[cb],2);for(Pb.DDDD=b(Pb.DDD,3),g(d.prototype,{set:function(a){var b,c;for(c in a)b=a[c],"function"==typeof b?this[c]=b:this["_"+c]=b},_months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),months:function(a){return this._months[a.month()]},_monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),monthsShort:function(a){return this._monthsShort[a.month()]},monthsParse:function(a){var b,c,d;for(this._monthsParse||(this._monthsParse=[]),b=0;12>b;b++)if(this._monthsParse[b]||(c=bb.utc([2e3,b]),d="^"+this.months(c,"")+"|^"+this.monthsShort(c,""),this._monthsParse[b]=new RegExp(d.replace(".",""),"i")),this._monthsParse[b].test(a))return b},_weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdays:function(a){return this._weekdays[a.day()]},_weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysShort:function(a){return this._weekdaysShort[a.day()]},_weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),weekdaysMin:function(a){return this._weekdaysMin[a.day()]},weekdaysParse:function(a){var b,c,d;for(this._weekdaysParse||(this._weekdaysParse=[]),b=0;7>b;b++)if(this._weekdaysParse[b]||(c=bb([2e3,1]).day(b),d="^"+this.weekdays(c,"")+"|^"+this.weekdaysShort(c,"")+"|^"+this.weekdaysMin(c,""),this._weekdaysParse[b]=new RegExp(d.replace(".",""),"i")),this._weekdaysParse[b].test(a))return b},_longDateFormat:{LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D YYYY",LLL:"MMMM D YYYY LT",LLLL:"dddd, MMMM D YYYY LT"},longDateFormat:function(a){var b=this._longDateFormat[a];return!b&&this._longDateFormat[a.toUpperCase()]&&(b=this._longDateFormat[a.toUpperCase()].replace(/MMMM|MM|DD|dddd/g,function(a){return a.slice(1)}),this._longDateFormat[a]=b),b},isPM:function(a){return"p"===(a+"").toLowerCase().charAt(0)},_meridiemParse:/[ap]\.?m?\.?/i,meridiem:function(a,b,c){return a>11?c?"pm":"PM":c?"am":"AM"},_calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},calendar:function(a,b){var c=this._calendar[a];return"function"==typeof c?c.apply(b):c},_relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},relativeTime:function(a,b,c,d){var e=this._relativeTime[c];return"function"==typeof e?e(a,b,c,d):e.replace(/%d/i,a)},pastFuture:function(a,b){var c=this._relativeTime[a>0?"future":"past"];return"function"==typeof c?c(b):c.replace(/%s/i,b)},ordinal:function(a){return this._ordinal.replace("%d",a)},_ordinal:"%d",preparse:function(a){return a},postformat:function(a){return a},week:function(a){return W(a,this._week.dow,this._week.doy).week},_week:{dow:0,doy:6},_invalidDate:"Invalid date",invalidDate:function(){return this._invalidDate}}),bb=function(b,c,d,e){return"boolean"==typeof d&&(e=d,d=a),Y({_i:b,_f:c,_l:d,_strict:e,_isUTC:!1})},bb.utc=function(b,c,d,e){var f;return"boolean"==typeof d&&(e=d,d=a),f=Y({_useUTC:!0,_isUTC:!0,_l:d,_i:b,_f:c,_strict:e}).utc()},bb.unix=function(a){return bb(1e3*a)},bb.duration=function(a,b){var c,d,e,g=bb.isDuration(a),h="number"==typeof a,i=g?a._input:h?{}:a,j=null;return h?b?i[b]=a:i.milliseconds=a:(j=pb.exec(a))?(c="-"===j[1]?-1:1,i={y:0,d:q(j[hb])*c,h:q(j[ib])*c,m:q(j[jb])*c,s:q(j[kb])*c,ms:q(j[lb])*c}):(j=qb.exec(a))&&(c="-"===j[1]?-1:1,e=function(a){var b=a&&parseFloat(a.replace(",","."));return(isNaN(b)?0:b)*c},i={y:e(j[2]),M:e(j[3]),d:e(j[4]),h:e(j[5]),m:e(j[6]),s:e(j[7]),w:e(j[8])}),d=new f(i),g&&a.hasOwnProperty("_lang")&&(d._lang=a._lang),d},bb.version=db,bb.defaultFormat=Eb,bb.updateOffset=function(){},bb.lang=function(a,b){var c;return a?(b?y(x(a),b):null===b?(z(a),a="en"):mb[a]||A(a),c=bb.duration.fn._lang=bb.fn._lang=A(a),c._abbr):bb.fn._lang._abbr},bb.langData=function(a){return a&&a._lang&&a._lang._abbr&&(a=a._lang._abbr),A(a)},bb.isMoment=function(a){return a instanceof e},bb.isDuration=function(a){return a instanceof f},cb=Qb.length-1;cb>=0;--cb)p(Qb[cb]);for(bb.normalizeUnits=function(a){return n(a)},bb.invalid=function(a){var b=bb.utc(0/0);return null!=a?g(b._pf,a):b._pf.userInvalidated=!0,b},bb.parseZone=function(a){return bb(a).parseZone()},g(bb.fn=e.prototype,{clone:function(){return bb(this)},valueOf:function(){return+this._d+6e4*(this._offset||0)},unix:function(){return Math.floor(+this/1e3)},toString:function(){return this.clone().lang("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},toDate:function(){return this._offset?new Date(+this):this._d},toISOString:function(){return D(bb(this).utc(),"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")},toArray:function(){var a=this;return[a.year(),a.month(),a.date(),a.hours(),a.minutes(),a.seconds(),a.milliseconds()]},isValid:function(){return w(this)},isDSTShifted:function(){return this._a?this.isValid()&&m(this._a,(this._isUTC?bb.utc(this._a):bb(this._a)).toArray())>0:!1},parsingFlags:function(){return g({},this._pf)},invalidAt:function(){return this._pf.overflow},utc:function(){return this.zone(0)},local:function(){return this.zone(0),this._isUTC=!1,this},format:function(a){var b=D(this,a||bb.defaultFormat);return this.lang().postformat(b)},add:function(a,b){var c;return c="string"==typeof a?bb.duration(+b,a):bb.duration(a,b),j(this,c,1),this},subtract:function(a,b){var c;return c="string"==typeof a?bb.duration(+b,a):bb.duration(a,b),j(this,c,-1),this},diff:function(a,b,c){var d,e,f=this._isUTC?bb(a).zone(this._offset||0):bb(a).local(),g=6e4*(this.zone()-f.zone());return b=n(b),"year"===b||"month"===b?(d=432e5*(this.daysInMonth()+f.daysInMonth()),e=12*(this.year()-f.year())+(this.month()-f.month()),e+=(this-bb(this).startOf("month")-(f-bb(f).startOf("month")))/d,e-=6e4*(this.zone()-bb(this).startOf("month").zone()-(f.zone()-bb(f).startOf("month").zone()))/d,"year"===b&&(e/=12)):(d=this-f,e="second"===b?d/1e3:"minute"===b?d/6e4:"hour"===b?d/36e5:"day"===b?(d-g)/864e5:"week"===b?(d-g)/6048e5:d),c?e:h(e)},from:function(a,b){return bb.duration(this.diff(a)).lang(this.lang()._abbr).humanize(!b)},fromNow:function(a){return this.from(bb(),a)},calendar:function(){var a=this.diff(bb().zone(this.zone()).startOf("day"),"days",!0),b=-6>a?"sameElse":-1>a?"lastWeek":0>a?"lastDay":1>a?"sameDay":2>a?"nextDay":7>a?"nextWeek":"sameElse";return this.format(this.lang().calendar(b,this))},isLeapYear:function(){return t(this.year())},isDST:function(){return this.zone()<this.clone().month(0).zone()||this.zone()<this.clone().month(5).zone()},day:function(a){var b=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=a?(a=T(a,this.lang()),this.add({d:a-b})):b},month:function(a){var b,c=this._isUTC?"UTC":"";return null!=a?"string"==typeof a&&(a=this.lang().monthsParse(a),"number"!=typeof a)?this:(b=this.date(),this.date(1),this._d["set"+c+"Month"](a),this.date(Math.min(b,this.daysInMonth())),bb.updateOffset(this),this):this._d["get"+c+"Month"]()},startOf:function(a){switch(a=n(a)){case"year":this.month(0);case"month":this.date(1);case"week":case"isoWeek":case"day":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===a?this.weekday(0):"isoWeek"===a&&this.isoWeekday(1),this},endOf:function(a){return a=n(a),this.startOf(a).add("isoWeek"===a?"week":a,1).subtract("ms",1)},isAfter:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)>+bb(a).startOf(b)},isBefore:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)<+bb(a).startOf(b)},isSame:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)===+bb(a).startOf(b)},min:function(a){return a=bb.apply(null,arguments),this>a?this:a},max:function(a){return a=bb.apply(null,arguments),a>this?this:a},zone:function(a){var b=this._offset||0;return null==a?this._isUTC?b:this._d.getTimezoneOffset():("string"==typeof a&&(a=G(a)),Math.abs(a)<16&&(a=60*a),this._offset=a,this._isUTC=!0,b!==a&&j(this,bb.duration(b-a,"m"),1,!0),this)},zoneAbbr:function(){return this._isUTC?"UTC":""},zoneName:function(){return this._isUTC?"Coordinated Universal Time":""},parseZone:function(){return"string"==typeof this._i&&this.zone(this._i),this},hasAlignedHourOffset:function(a){return a=a?bb(a).zone():0,0===(this.zone()-a)%60},daysInMonth:function(){return r(this.year(),this.month())},dayOfYear:function(a){var b=eb((bb(this).startOf("day")-bb(this).startOf("year"))/864e5)+1;return null==a?b:this.add("d",a-b)},weekYear:function(a){var b=W(this,this.lang()._week.dow,this.lang()._week.doy).year;return null==a?b:this.add("y",a-b)},isoWeekYear:function(a){var b=W(this,1,4).year;return null==a?b:this.add("y",a-b)},week:function(a){var b=this.lang().week(this);return null==a?b:this.add("d",7*(a-b))},isoWeek:function(a){var b=W(this,1,4).week;return null==a?b:this.add("d",7*(a-b))},weekday:function(a){var b=(this.day()+7-this.lang()._week.dow)%7;return null==a?b:this.add("d",a-b)},isoWeekday:function(a){return null==a?this.day()||7:this.day(this.day()%7?a:a-7)},get:function(a){return a=n(a),this[a]()},set:function(a,b){return a=n(a),"function"==typeof this[a]&&this[a](b),this},lang:function(b){return b===a?this._lang:(this._lang=A(b),this)}}),cb=0;cb<Ib.length;cb++)Z(Ib[cb].toLowerCase().replace(/s$/,""),Ib[cb]);Z("year","FullYear"),bb.fn.days=bb.fn.day,bb.fn.months=bb.fn.month,bb.fn.weeks=bb.fn.week,bb.fn.isoWeeks=bb.fn.isoWeek,bb.fn.toJSON=bb.fn.toISOString,g(bb.duration.fn=f.prototype,{_bubble:function(){var a,b,c,d,e=this._milliseconds,f=this._days,g=this._months,i=this._data;i.milliseconds=e%1e3,a=h(e/1e3),i.seconds=a%60,b=h(a/60),i.minutes=b%60,c=h(b/60),i.hours=c%24,f+=h(c/24),i.days=f%30,g+=h(f/30),i.months=g%12,d=h(g/12),i.years=d},weeks:function(){return h(this.days()/7)},valueOf:function(){return this._milliseconds+864e5*this._days+2592e6*(this._months%12)+31536e6*q(this._months/12)},humanize:function(a){var b=+this,c=V(b,!a,this.lang());return a&&(c=this.lang().pastFuture(b,c)),this.lang().postformat(c)},add:function(a,b){var c=bb.duration(a,b);return this._milliseconds+=c._milliseconds,this._days+=c._days,this._months+=c._months,this._bubble(),this},subtract:function(a,b){var c=bb.duration(a,b);return this._milliseconds-=c._milliseconds,this._days-=c._days,this._months-=c._months,this._bubble(),this},get:function(a){return a=n(a),this[a.toLowerCase()+"s"]()},as:function(a){return a=n(a),this["as"+a.charAt(0).toUpperCase()+a.slice(1)+"s"]()},lang:bb.fn.lang,toIsoString:function(){var a=Math.abs(this.years()),b=Math.abs(this.months()),c=Math.abs(this.days()),d=Math.abs(this.hours()),e=Math.abs(this.minutes()),f=Math.abs(this.seconds()+this.milliseconds()/1e3);return this.asSeconds()?(this.asSeconds()<0?"-":"")+"P"+(a?a+"Y":"")+(b?b+"M":"")+(c?c+"D":"")+(d||e||f?"T":"")+(d?d+"H":"")+(e?e+"M":"")+(f?f+"S":""):"P0D"}});for(cb in Jb)Jb.hasOwnProperty(cb)&&(_(cb,Jb[cb]),$(cb.toLowerCase()));_("Weeks",6048e5),bb.duration.fn.asMonths=function(){return(+this-31536e6*this.years())/2592e6+12*this.years()},bb.lang("en",{ordinal:function(a){var b=a%10,c=1===q(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c}}),nb?(module.exports=bb,ab(!0)):"function"==typeof define&&define.amd?define("moment",['require','exports','module'],function(b,c,d){return d.config().noGlobal!==!0&&ab(d.config().noGlobal===a),bb}):ab()}).call(this);

(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define('cs!globals',['zepto', 'localforage', 'moment'], function($, localForage, moment, UserCollection) {
    var GLOBALS, distance, formatTime, mapID, mockL10n, setLanguage, timestamp;
    mapID = "tofumatt.map-tdyvgkb6";
    window.GLOBALS = GLOBALS = {
      API_DATE: "20130901",
      API_URL: "https://api.foursquare.com/v2/",
      AUTH_URL: "",
      CHARACTERS_FOR_AUTOCOMPLETE: 2,
      CLIENT_ID: "Y50ARQDQNJGI2JU3SPTI1MVEM3OZJ1H120H3UXCQVMAI05OJ",
      DATABASE_NAME: "around",
      DEFAULT_MAP_MARKER: "pin-m+0095dd",
      HAS: {
        nativeScroll: (function() {
          return __indexOf.call(window.document.createElement("div").style, "WebkitOverflowScrolling") >= 0;
        })()
      },
      HOUR: 3600,
      LOCALES: ['en-GB', 'en-US'],
      MAP_ID: mapID,
      MAP_URL: "http://a.tiles.mapbox.com/v3/" + mapID + "/",
      MAX_DOWNLOADS: 2,
      MINUTE: 60,
      RECENT_CHECKIN_TIME: 120,
      OBJECT_STORE_NAME: "around",
      SEARCH_NUMBER_VENUES_WITH_PHOTO: 6,
      TOKEN: void 0
    };
    GLOBALS.AUTH_URL = "https://foursquare.com/oauth2/authenticate?client_id=" + GLOBALS.CLIENT_ID + "&response_type=token&redirect_uri=" + window.location.origin;
    GLOBALS.LANGUAGE = window.navigator.language;
    if (!_.contains(GLOBALS.LOCALES, GLOBALS.LANGUAGE)) {
      GLOBALS.LANGUAGE = 'en-US';
    }
    window.moment = moment;
    window.distance = distance = function(length, imperial) {
      if (imperial == null) {
        imperial = false;
      }
      if (imperial) {
        length = length * 0.00062137;
        if (length < 11) {
          length = length.toFixed(1);
        } else {
          length = Math.round(length);
        }
        return "" + length + " mile" + (length === 1 ? '' : 's');
      }
      if (length > 200) {
        length = length / 1000;
        if (length < 11) {
          length = length.toFixed(1);
        }
        return "" + length + " km";
      } else {
        return "" + length + " m";
      }
    };
    window.formatTime = formatTime = function(secs) {
      var hours, minutes, seconds;
      if (isNaN(secs)) {
        return "--:--";
      }
      hours = parseInt(secs / 3600, 10) % 24;
      hours = hours !== 0 ? "" + hours + ":" : "";
      minutes = parseInt(secs / 60, 10) % 60;
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = parseInt(secs % 60, 10);
      seconds = seconds < 10 ? "0" + seconds : seconds;
      return "" + hours + minutes + ":" + seconds;
    };
    mockL10n = function() {
      window._l10n = null;
      return window.l = function(key) {
        return key;
      };
    };
    window.setLanguage = setLanguage = function() {
      var d, error, request;
      d = $.Deferred();
      request = new window.XMLHttpRequest();
      request.open("GET", "locale/" + GLOBALS.LANGUAGE + ".json", true);
      request.addEventListener("load", function(event) {
        var l10n;
        if (request.status === 200) {
          l10n = new Jed({
            locale_data: JSON.parse(request.response)
          });
          window._l10n = l10n;
          window.l = function(key) {
            return l10n.gettext(key);
          };
          $("[data-l10n]").each(function() {
            return $(this).text(window.l($(this).data("l10n")));
          });
        } else {
          mockL10n();
        }
        return d.resolve();
      });
      try {
        request.send();
      } catch (_error) {
        error = _error;
        console.log(error);
        mockL10n();
      }
      return d.promise();
    };
    window.timestamp = timestamp = function(date) {
      if (date == null) {
        date = new Date();
      }
      return Math.round(date.getTime() / 1000);
    };
    return GLOBALS;
  });

}).call(this);

/*! backbone.routefilter - v0.2.0 - 2013-02-16
* https://github.com/boazsender/backbone.routefilter
* Copyright (c) 2013 Boaz Sender; Licensed MIT */

(function(Backbone, _) {

  // Save a reference to the original route method to be called
  // after we pave it over.
  var originalRoute = Backbone.Router.prototype.route;

  // Create a reusable no operation func for the case where a before
  // or after filter is not set. Backbone or Underscore should have
  // a global one of these in my opinion.
  var nop = function(){};

  // Extend the router prototype with a default before function,
  // a default after function, and a pave over of _bindRoutes.
  _.extend(Backbone.Router.prototype, {

    // Add default before filter.
    before: nop,

    // Add default after filter.
    after: nop,

    // Pave over Backbone.Router.prototype.route, the public method used
    // for adding routes to a router instance on the fly, and the
    // method which backbone uses internally for binding routes to handlers
    // on the Backbone.history singleton once it's instantiated.
    route: function(route, name, callback) {

      // If there is no callback present for this route, then set it to
      // be the name that was set in the routes property of the constructor,
      // or the name arguement of the route method invocation. This is what
      // Backbone.Router.route already does. We need to do it again,
      // because we are about to wrap the callback in a function that calls
      // the before and after filters as well as the original callback that
      // was passed in.
      if( !callback ){
        callback = this[ name ];
      }

      // Create a new callback to replace the original callback that calls
      // the before and after filters as well as the original callback
      // internally.
      var wrappedCallback = _.bind( function() {

        // Call the before filter and if it returns false, run the
        // route's original callback, and after filter. This allows
        // the user to return false from within the before filter
        // to prevent the original route callback and after
        // filter from running.
        var callbackArgs = [ route, _.toArray(arguments) ];
        var beforeCallback;

        if ( _.isFunction(this.before) ) {

          // If the before filter is just a single function, then call
          // it with the arguments.
          beforeCallback = this.before;
        } else if ( typeof this.before[route] !== "undefined" ) {

          // otherwise, find the appropriate callback for the route name
          // and call that.
          beforeCallback = this.before[route];
        } else {

          // otherwise, if we have a hash of routes, but no before callback
          // for this route, just use a nop function.
          beforeCallback = nop;
        }

        // If the before callback fails during its execusion (by returning)
        // false, then do not proceed with the route triggering.
        if ( beforeCallback.apply(this, callbackArgs) === false ) {
          return;
        }

        // If the callback exists, then call it. This means that the before
        // and after filters will be called whether or not an actual
        // callback function is supplied to handle a given route.
        if( callback ) {
          callback.apply( this, arguments );
        }

        var afterCallback;
        if ( _.isFunction(this.after) ) {

          // If the after filter is a single funciton, then call it with
          // the proper arguments.
          afterCallback = this.after;

        } else if ( typeof this.after[route] !== "undefined" ) {

          // otherwise if we have a hash of routes, call the appropriate
          // callback based on the route name.
          afterCallback = this.after[route];

        } else {

          // otherwise, if we have a has of routes but no after callback
          // for this route, just use the nop function.
          afterCallback = nop;
        }

        // Call the after filter.
        afterCallback.apply( this, callbackArgs );

      }, this);

      // Call our original route, replacing the callback that was originally
      // passed in when Backbone.Router.route was invoked with our wrapped
      // callback that calls the before and after callbacks as well as the
      // original callback.
      return originalRoute.call( this, route, name, wrappedCallback );
    }

  });

}(Backbone, _));

define("backbone_routefilter", ["backbone"], function(){});

window.Platform = {};

var logFlags = {};

(function() {
    if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;
    var prototype = Array.prototype, indexOf = prototype.indexOf, slice = prototype.slice, push = prototype.push, splice = prototype.splice, join = prototype.join;
    function DOMTokenList(el) {
        this._element = el;
        if (el.className != this._classCache) {
            this._classCache = el.className;
            if (!this._classCache) return;
            var classes = this._classCache.replace(/^\s+|\s+$/g, "").split(/\s+/), i;
            for (i = 0; i < classes.length; i++) {
                push.call(this, classes[i]);
            }
        }
    }
    function setToClassName(el, classes) {
        el.className = classes.join(" ");
    }
    DOMTokenList.prototype = {
        add: function(token) {
            if (this.contains(token)) return;
            push.call(this, token);
            setToClassName(this._element, slice.call(this, 0));
        },
        contains: function(token) {
            return indexOf.call(this, token) !== -1;
        },
        item: function(index) {
            return this[index] || null;
        },
        remove: function(token) {
            var i = indexOf.call(this, token);
            if (i === -1) {
                return;
            }
            splice.call(this, i, 1);
            setToClassName(this._element, slice.call(this, 0));
        },
        toString: function() {
            return join.call(this, " ");
        },
        toggle: function(token) {
            if (indexOf.call(this, token) === -1) {
                this.add(token);
            } else {
                this.remove(token);
            }
        }
    };
    window.DOMTokenList = DOMTokenList;
    function defineElementGetter(obj, prop, getter) {
        if (Object.defineProperty) {
            Object.defineProperty(obj, prop, {
                get: getter
            });
        } else {
            obj.__defineGetter__(prop, getter);
        }
    }
    defineElementGetter(Element.prototype, "classList", function() {
        return new DOMTokenList(this);
    });
})();

if (typeof WeakMap === "undefined") {
    (function() {
        var defineProperty = Object.defineProperty;
        var counter = Date.now() % 1e9;
        var WeakMap = function() {
            this.name = "__st" + (Math.random() * 1e9 >>> 0) + (counter++ + "__");
        };
        WeakMap.prototype = {
            set: function(key, value) {
                var entry = key[this.name];
                if (entry && entry[0] === key) entry[1] = value; else defineProperty(key, this.name, {
                    value: [ key, value ],
                    writable: true
                });
            },
            get: function(key) {
                var entry;
                return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
            },
            "delete": function(key) {
                this.set(key, undefined);
            }
        };
        window.WeakMap = WeakMap;
    })();
}

(function(global) {
    var registrationsTable = new WeakMap();
    var setImmediate = window.msSetImmediate;
    if (!setImmediate) {
        var setImmediateQueue = [];
        var sentinel = String(Math.random());
        window.addEventListener("message", function(e) {
            if (e.data === sentinel) {
                var queue = setImmediateQueue;
                setImmediateQueue = [];
                queue.forEach(function(func) {
                    func();
                });
            }
        });
        setImmediate = function(func) {
            setImmediateQueue.push(func);
            window.postMessage(sentinel, "*");
        };
    }
    var isScheduled = false;
    var scheduledObservers = [];
    function scheduleCallback(observer) {
        scheduledObservers.push(observer);
        if (!isScheduled) {
            isScheduled = true;
            setImmediate(dispatchCallbacks);
        }
    }
    function wrapIfNeeded(node) {
        return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node;
    }
    function dispatchCallbacks() {
        isScheduled = false;
        var observers = scheduledObservers;
        scheduledObservers = [];
        observers.sort(function(o1, o2) {
            return o1.uid_ - o2.uid_;
        });
        var anyNonEmpty = false;
        observers.forEach(function(observer) {
            var queue = observer.takeRecords();
            removeTransientObserversFor(observer);
            if (queue.length) {
                observer.callback_(queue, observer);
                anyNonEmpty = true;
            }
        });
        if (anyNonEmpty) dispatchCallbacks();
    }
    function removeTransientObserversFor(observer) {
        observer.nodes_.forEach(function(node) {
            var registrations = registrationsTable.get(node);
            if (!registrations) return;
            registrations.forEach(function(registration) {
                if (registration.observer === observer) registration.removeTransientObservers();
            });
        });
    }
    function forEachAncestorAndObserverEnqueueRecord(target, callback) {
        for (var node = target; node; node = node.parentNode) {
            var registrations = registrationsTable.get(node);
            if (registrations) {
                for (var j = 0; j < registrations.length; j++) {
                    var registration = registrations[j];
                    var options = registration.options;
                    if (node !== target && !options.subtree) continue;
                    var record = callback(options);
                    if (record) registration.enqueue(record);
                }
            }
        }
    }
    var uidCounter = 0;
    function JsMutationObserver(callback) {
        this.callback_ = callback;
        this.nodes_ = [];
        this.records_ = [];
        this.uid_ = ++uidCounter;
    }
    JsMutationObserver.prototype = {
        observe: function(target, options) {
            target = wrapIfNeeded(target);
            if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
                throw new SyntaxError();
            }
            var registrations = registrationsTable.get(target);
            if (!registrations) registrationsTable.set(target, registrations = []);
            var registration;
            for (var i = 0; i < registrations.length; i++) {
                if (registrations[i].observer === this) {
                    registration = registrations[i];
                    registration.removeListeners();
                    registration.options = options;
                    break;
                }
            }
            if (!registration) {
                registration = new Registration(this, target, options);
                registrations.push(registration);
                this.nodes_.push(target);
            }
            registration.addListeners();
        },
        disconnect: function() {
            this.nodes_.forEach(function(node) {
                var registrations = registrationsTable.get(node);
                for (var i = 0; i < registrations.length; i++) {
                    var registration = registrations[i];
                    if (registration.observer === this) {
                        registration.removeListeners();
                        registrations.splice(i, 1);
                        break;
                    }
                }
            }, this);
            this.records_ = [];
        },
        takeRecords: function() {
            var copyOfRecords = this.records_;
            this.records_ = [];
            return copyOfRecords;
        }
    };
    function MutationRecord(type, target) {
        this.type = type;
        this.target = target;
        this.addedNodes = [];
        this.removedNodes = [];
        this.previousSibling = null;
        this.nextSibling = null;
        this.attributeName = null;
        this.attributeNamespace = null;
        this.oldValue = null;
    }
    function copyMutationRecord(original) {
        var record = new MutationRecord(original.type, original.target);
        record.addedNodes = original.addedNodes.slice();
        record.removedNodes = original.removedNodes.slice();
        record.previousSibling = original.previousSibling;
        record.nextSibling = original.nextSibling;
        record.attributeName = original.attributeName;
        record.attributeNamespace = original.attributeNamespace;
        record.oldValue = original.oldValue;
        return record;
    }
    var currentRecord, recordWithOldValue;
    function getRecord(type, target) {
        return currentRecord = new MutationRecord(type, target);
    }
    function getRecordWithOldValue(oldValue) {
        if (recordWithOldValue) return recordWithOldValue;
        recordWithOldValue = copyMutationRecord(currentRecord);
        recordWithOldValue.oldValue = oldValue;
        return recordWithOldValue;
    }
    function clearRecords() {
        currentRecord = recordWithOldValue = undefined;
    }
    function recordRepresentsCurrentMutation(record) {
        return record === recordWithOldValue || record === currentRecord;
    }
    function selectRecord(lastRecord, newRecord) {
        if (lastRecord === newRecord) return lastRecord;
        if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue;
        return null;
    }
    function Registration(observer, target, options) {
        this.observer = observer;
        this.target = target;
        this.options = options;
        this.transientObservedNodes = [];
    }
    Registration.prototype = {
        enqueue: function(record) {
            var records = this.observer.records_;
            var length = records.length;
            if (records.length > 0) {
                var lastRecord = records[length - 1];
                var recordToReplaceLast = selectRecord(lastRecord, record);
                if (recordToReplaceLast) {
                    records[length - 1] = recordToReplaceLast;
                    return;
                }
            } else {
                scheduleCallback(this.observer);
            }
            records[length] = record;
        },
        addListeners: function() {
            this.addListeners_(this.target);
        },
        addListeners_: function(node) {
            var options = this.options;
            if (options.attributes) node.addEventListener("DOMAttrModified", this, true);
            if (options.characterData) node.addEventListener("DOMCharacterDataModified", this, true);
            if (options.childList) node.addEventListener("DOMNodeInserted", this, true);
            if (options.childList || options.subtree) node.addEventListener("DOMNodeRemoved", this, true);
        },
        removeListeners: function() {
            this.removeListeners_(this.target);
        },
        removeListeners_: function(node) {
            var options = this.options;
            if (options.attributes) node.removeEventListener("DOMAttrModified", this, true);
            if (options.characterData) node.removeEventListener("DOMCharacterDataModified", this, true);
            if (options.childList) node.removeEventListener("DOMNodeInserted", this, true);
            if (options.childList || options.subtree) node.removeEventListener("DOMNodeRemoved", this, true);
        },
        addTransientObserver: function(node) {
            if (node === this.target) return;
            this.addListeners_(node);
            this.transientObservedNodes.push(node);
            var registrations = registrationsTable.get(node);
            if (!registrations) registrationsTable.set(node, registrations = []);
            registrations.push(this);
        },
        removeTransientObservers: function() {
            var transientObservedNodes = this.transientObservedNodes;
            this.transientObservedNodes = [];
            transientObservedNodes.forEach(function(node) {
                this.removeListeners_(node);
                var registrations = registrationsTable.get(node);
                for (var i = 0; i < registrations.length; i++) {
                    if (registrations[i] === this) {
                        registrations.splice(i, 1);
                        break;
                    }
                }
            }, this);
        },
        handleEvent: function(e) {
            e.stopImmediatePropagation();
            switch (e.type) {
              case "DOMAttrModified":
                var name = e.attrName;
                var namespace = e.relatedNode.namespaceURI;
                var target = e.target;
                var record = new getRecord("attributes", target);
                record.attributeName = name;
                record.attributeNamespace = namespace;
                var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;
                forEachAncestorAndObserverEnqueueRecord(target, function(options) {
                    if (!options.attributes) return;
                    if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
                        return;
                    }
                    if (options.attributeOldValue) return getRecordWithOldValue(oldValue);
                    return record;
                });
                break;

              case "DOMCharacterDataModified":
                var target = e.target;
                var record = getRecord("characterData", target);
                var oldValue = e.prevValue;
                forEachAncestorAndObserverEnqueueRecord(target, function(options) {
                    if (!options.characterData) return;
                    if (options.characterDataOldValue) return getRecordWithOldValue(oldValue);
                    return record;
                });
                break;

              case "DOMNodeRemoved":
                this.addTransientObserver(e.target);

              case "DOMNodeInserted":
                var target = e.relatedNode;
                var changedNode = e.target;
                var addedNodes, removedNodes;
                if (e.type === "DOMNodeInserted") {
                    addedNodes = [ changedNode ];
                    removedNodes = [];
                } else {
                    addedNodes = [];
                    removedNodes = [ changedNode ];
                }
                var previousSibling = changedNode.previousSibling;
                var nextSibling = changedNode.nextSibling;
                var record = getRecord("childList", target);
                record.addedNodes = addedNodes;
                record.removedNodes = removedNodes;
                record.previousSibling = previousSibling;
                record.nextSibling = nextSibling;
                forEachAncestorAndObserverEnqueueRecord(target, function(options) {
                    if (!options.childList) return;
                    return record;
                });
            }
            clearRecords();
        }
    };
    global.JsMutationObserver = JsMutationObserver;
    if (!global.MutationObserver && global.WebKitMutationObserver) global.MutationObserver = global.WebKitMutationObserver;
    if (!global.MutationObserver) global.MutationObserver = JsMutationObserver;
})(this);

(function(scope) {
    if (!scope) {
        scope = window.CustomElements = {
            flags: {}
        };
    }
    var flags = scope.flags;
    var hasNative = Boolean(document.register);
    var useNative = !flags.register && hasNative;
    if (useNative) {
        var nop = function() {};
        scope.registry = {};
        scope.upgradeElement = nop;
        scope.watchShadow = nop;
        scope.upgrade = nop;
        scope.upgradeAll = nop;
        scope.upgradeSubtree = nop;
        scope.observeDocument = nop;
        scope.upgradeDocument = nop;
        scope.takeRecords = nop;
    } else {
        function register(name, options) {
            var definition = options || {};
            if (!name) {
                throw new Error("document.register: first argument `name` must not be empty");
            }
            if (name.indexOf("-") < 0) {
                throw new Error("document.register: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(name) + "'.");
            }
            definition.name = name;
            if (!definition.prototype) {
                throw new Error("Options missing required prototype property");
            }
            definition.lifecycle = definition.lifecycle || {};
            definition.ancestry = ancestry(definition.extends);
            resolveTagName(definition);
            resolvePrototypeChain(definition);
            overrideAttributeApi(definition.prototype);
            registerDefinition(name, definition);
            definition.ctor = generateConstructor(definition);
            definition.ctor.prototype = definition.prototype;
            definition.prototype.constructor = definition.ctor;
            if (scope.ready) {
                scope.upgradeAll(document);
            }
            return definition.ctor;
        }
        function ancestry(extnds) {
            var extendee = registry[extnds];
            if (extendee) {
                return ancestry(extendee.extends).concat([ extendee ]);
            }
            return [];
        }
        function resolveTagName(definition) {
            var baseTag = definition.extends;
            for (var i = 0, a; a = definition.ancestry[i]; i++) {
                baseTag = a.is && a.tag;
            }
            definition.tag = baseTag || definition.name;
            if (baseTag) {
                definition.is = definition.name;
            }
        }
        function resolvePrototypeChain(definition) {
            if (!Object.__proto__) {
                var nativePrototype = HTMLElement.prototype;
                if (definition.is) {
                    var inst = document.createElement(definition.tag);
                    nativePrototype = Object.getPrototypeOf(inst);
                }
                var proto = definition.prototype, ancestor;
                while (proto && proto !== nativePrototype) {
                    var ancestor = Object.getPrototypeOf(proto);
                    proto.__proto__ = ancestor;
                    proto = ancestor;
                }
            }
            definition.native = nativePrototype;
        }
        function instantiate(definition) {
            return upgrade(domCreateElement(definition.tag), definition);
        }
        function upgrade(element, definition) {
            if (definition.is) {
                element.setAttribute("is", definition.is);
            }
            element.removeAttribute("unresolved");
            implement(element, definition);
            element.__upgraded__ = true;
            scope.upgradeSubtree(element);
            created(element);
            return element;
        }
        function implement(element, definition) {
            if (Object.__proto__) {
                element.__proto__ = definition.prototype;
            } else {
                customMixin(element, definition.prototype, definition.native);
                element.__proto__ = definition.prototype;
            }
        }
        function customMixin(inTarget, inSrc, inNative) {
            var used = {};
            var p = inSrc;
            while (p !== inNative && p !== HTMLUnknownElement.prototype) {
                var keys = Object.getOwnPropertyNames(p);
                for (var i = 0, k; k = keys[i]; i++) {
                    if (!used[k]) {
                        Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
                        used[k] = 1;
                    }
                }
                p = Object.getPrototypeOf(p);
            }
        }
        function created(element) {
            if (element.createdCallback) {
                element.createdCallback();
            }
        }
        function overrideAttributeApi(prototype) {
            if (prototype.setAttribute._polyfilled) {
                return;
            }
            var setAttribute = prototype.setAttribute;
            prototype.setAttribute = function(name, value) {
                changeAttribute.call(this, name, value, setAttribute);
            };
            var removeAttribute = prototype.removeAttribute;
            prototype.removeAttribute = function(name) {
                changeAttribute.call(this, name, null, removeAttribute);
            };
            prototype.setAttribute._polyfilled = true;
        }
        function changeAttribute(name, value, operation) {
            var oldValue = this.getAttribute(name);
            operation.apply(this, arguments);
            var newValue = this.getAttribute(name);
            if (this.attributeChangedCallback && newValue !== oldValue) {
                this.attributeChangedCallback(name, oldValue, newValue);
            }
        }
        var registry = {};
        function registerDefinition(name, definition) {
            registry[name] = definition;
        }
        function generateConstructor(definition) {
            return function() {
                return instantiate(definition);
            };
        }
        function createElement(tag, typeExtension) {
            var definition = registry[typeExtension || tag];
            if (definition) {
                return new definition.ctor();
            }
            return domCreateElement(tag);
        }
        function upgradeElement(element) {
            if (!element.__upgraded__ && element.nodeType === Node.ELEMENT_NODE) {
                var type = element.getAttribute("is") || element.localName;
                var definition = registry[type];
                return definition && upgrade(element, definition);
            }
        }
        function cloneNode(deep) {
            var n = domCloneNode.call(this, deep);
            scope.upgradeAll(n);
            return n;
        }
        var domCreateElement = document.createElement.bind(document);
        var domCloneNode = Node.prototype.cloneNode;
        document.register = register;
        document.createElement = createElement;
        Node.prototype.cloneNode = cloneNode;
        scope.registry = registry;
        scope.upgrade = upgradeElement;
    }
    scope.hasNative = hasNative;
    scope.useNative = useNative;
})(window.CustomElements);

(function(scope) {
    var logFlags = window.logFlags || {};
    function findAll(node, find, data) {
        var e = node.firstElementChild;
        if (!e) {
            e = node.firstChild;
            while (e && e.nodeType !== Node.ELEMENT_NODE) {
                e = e.nextSibling;
            }
        }
        while (e) {
            if (find(e, data) !== true) {
                findAll(e, find, data);
            }
            e = e.nextElementSibling;
        }
        return null;
    }
    function forRoots(node, cb) {
        var root = node.shadowRoot;
        while (root) {
            forSubtree(root, cb);
            root = root.olderShadowRoot;
        }
    }
    function forSubtree(node, cb) {
        findAll(node, function(e) {
            if (cb(e)) {
                return true;
            }
            forRoots(e, cb);
        });
        forRoots(node, cb);
    }
    function added(node) {
        if (upgrade(node)) {
            insertedNode(node);
            return true;
        }
        inserted(node);
    }
    function addedSubtree(node) {
        forSubtree(node, function(e) {
            if (added(e)) {
                return true;
            }
        });
    }
    function addedNode(node) {
        return added(node) || addedSubtree(node);
    }
    function upgrade(node) {
        if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
            var type = node.getAttribute("is") || node.localName;
            var definition = scope.registry[type];
            if (definition) {
                logFlags.dom && console.group("upgrade:", node.localName);
                scope.upgrade(node);
                logFlags.dom && console.groupEnd();
                return true;
            }
        }
    }
    function insertedNode(node) {
        inserted(node);
        if (inDocument(node)) {
            forSubtree(node, function(e) {
                inserted(e);
            });
        }
    }
    var hasPolyfillMutations = !window.MutationObserver || window.MutationObserver === window.JsMutationObserver;
    scope.hasPolyfillMutations = hasPolyfillMutations;
    var isPendingMutations = false;
    var pendingMutations = [];
    function deferMutation(fn) {
        pendingMutations.push(fn);
        if (!isPendingMutations) {
            isPendingMutations = true;
            var async = window.Platform && window.Platform.endOfMicrotask || setTimeout;
            async(takeMutations);
        }
    }
    function takeMutations() {
        isPendingMutations = false;
        var $p = pendingMutations;
        for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
            p();
        }
        pendingMutations = [];
    }
    function inserted(element) {
        if (hasPolyfillMutations) {
            deferMutation(function() {
                _inserted(element);
            });
        } else {
            _inserted(element);
        }
    }
    function _inserted(element) {
        if (element.enteredViewCallback || element.__upgraded__ && logFlags.dom) {
            logFlags.dom && console.group("inserted:", element.localName);
            if (inDocument(element)) {
                element.__inserted = (element.__inserted || 0) + 1;
                if (element.__inserted < 1) {
                    element.__inserted = 1;
                }
                if (element.__inserted > 1) {
                    logFlags.dom && console.warn("inserted:", element.localName, "insert/remove count:", element.__inserted);
                } else if (element.enteredViewCallback) {
                    logFlags.dom && console.log("inserted:", element.localName);
                    element.enteredViewCallback();
                }
            }
            logFlags.dom && console.groupEnd();
        }
    }
    function removedNode(node) {
        removed(node);
        forSubtree(node, function(e) {
            removed(e);
        });
    }
    function removed(element) {
        if (hasPolyfillMutations) {
            deferMutation(function() {
                _removed(element);
            });
        } else {
            _removed(element);
        }
    }
    function _removed(element) {
        if (element.leftViewCallback || element.__upgraded__ && logFlags.dom) {
            logFlags.dom && console.log("removed:", element.localName);
            if (!inDocument(element)) {
                element.__inserted = (element.__inserted || 0) - 1;
                if (element.__inserted > 0) {
                    element.__inserted = 0;
                }
                if (element.__inserted < 0) {
                    logFlags.dom && console.warn("removed:", element.localName, "insert/remove count:", element.__inserted);
                } else if (element.leftViewCallback) {
                    element.leftViewCallback();
                }
            }
        }
    }
    function inDocument(element) {
        var p = element;
        var doc = window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(document) || document;
        while (p) {
            if (p == doc) {
                return true;
            }
            p = p.parentNode || p.host;
        }
    }
    function watchShadow(node) {
        if (node.shadowRoot && !node.shadowRoot.__watched) {
            logFlags.dom && console.log("watching shadow-root for: ", node.localName);
            var root = node.shadowRoot;
            while (root) {
                watchRoot(root);
                root = root.olderShadowRoot;
            }
        }
    }
    function watchRoot(root) {
        if (!root.__watched) {
            observe(root);
            root.__watched = true;
        }
    }
    function handler(mutations) {
        if (logFlags.dom) {
            var mx = mutations[0];
            if (mx && mx.type === "childList" && mx.addedNodes) {
                if (mx.addedNodes) {
                    var d = mx.addedNodes[0];
                    while (d && d !== document && !d.host) {
                        d = d.parentNode;
                    }
                    var u = d && (d.URL || d._URL || d.host && d.host.localName) || "";
                    u = u.split("/?").shift().split("/").pop();
                }
            }
            console.group("mutations (%d) [%s]", mutations.length, u || "");
        }
        mutations.forEach(function(mx) {
            if (mx.type === "childList") {
                forEach(mx.addedNodes, function(n) {
                    if (!n.localName) {
                        return;
                    }
                    addedNode(n);
                });
                forEach(mx.removedNodes, function(n) {
                    if (!n.localName) {
                        return;
                    }
                    removedNode(n);
                });
            }
        });
        logFlags.dom && console.groupEnd();
    }
    var observer = new MutationObserver(handler);
    function takeRecords() {
        handler(observer.takeRecords());
        takeMutations();
    }
    var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
    function observe(inRoot) {
        observer.observe(inRoot, {
            childList: true,
            subtree: true
        });
    }
    function observeDocument(document) {
        observe(document);
    }
    function upgradeDocument(document) {
        logFlags.dom && console.group("upgradeDocument: ", (document.URL || document._URL || "").split("/").pop());
        addedNode(document);
        logFlags.dom && console.groupEnd();
    }
    scope.watchShadow = watchShadow;
    scope.upgradeAll = addedNode;
    scope.upgradeSubtree = addedSubtree;
    scope.observeDocument = observeDocument;
    scope.upgradeDocument = upgradeDocument;
    scope.takeRecords = takeRecords;
})(window.CustomElements);

(function() {
    var IMPORT_LINK_TYPE = window.HTMLImports ? HTMLImports.IMPORT_LINK_TYPE : "none";
    var parser = {
        selectors: [ "link[rel=" + IMPORT_LINK_TYPE + "]" ],
        map: {
            link: "parseLink"
        },
        parse: function(inDocument) {
            if (!inDocument.__parsed) {
                inDocument.__parsed = true;
                var elts = inDocument.querySelectorAll(parser.selectors);
                forEach(elts, function(e) {
                    parser[parser.map[e.localName]](e);
                });
                CustomElements.upgradeDocument(inDocument);
                CustomElements.observeDocument(inDocument);
            }
        },
        parseLink: function(linkElt) {
            if (isDocumentLink(linkElt)) {
                this.parseImport(linkElt);
            }
        },
        parseImport: function(linkElt) {
            if (linkElt.content) {
                parser.parse(linkElt.content);
            }
        }
    };
    function isDocumentLink(inElt) {
        return inElt.localName === "link" && inElt.getAttribute("rel") === IMPORT_LINK_TYPE;
    }
    var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
    CustomElements.parser = parser;
})();

(function(scope) {
    function bootstrap() {
        CustomElements.parser.parse(document);
        CustomElements.upgradeDocument(document);
        var async = window.Platform && Platform.endOfMicrotask ? Platform.endOfMicrotask : setTimeout;
        async(function() {
            CustomElements.ready = true;
            CustomElements.readyTime = Date.now();
            if (window.HTMLImports) {
                CustomElements.elapsed = CustomElements.readyTime - HTMLImports.readyTime;
            }
            document.body.dispatchEvent(new CustomEvent("WebComponentsReady", {
                bubbles: true
            }));
        });
    }
    if (typeof window.CustomEvent !== "function") {
        window.CustomEvent = function(inType) {
            var e = document.createEvent("HTMLEvents");
            e.initEvent(inType, true, true);
            return e;
        };
    }
    if (document.readyState === "complete" || scope.flags.eager) {
        bootstrap();
    } else if (document.readyState === "interactive" && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
        bootstrap();
    } else {
        var loadEvent = window.HTMLImports ? "HTMLImportsLoaded" : "DOMContentLoaded";
        window.addEventListener(loadEvent, bootstrap);
    }
})(window.CustomElements);

(function() {
    var win = window, doc = document, noop = function() {}, trueop = function() {
        return true;
    }, regexPseudoSplit = /([\w-]+(?:\([^\)]+\))?)/g, regexPseudoReplace = /(\w*)(?:\(([^\)]*)\))?/, regexDigits = /(\d+)/g, keypseudo = {
        action: function(pseudo, event) {
            return pseudo.value.match(regexDigits).indexOf(String(event.keyCode)) > -1 == (pseudo.name == "keypass") || null;
        }
    }, prefix = function() {
        var styles = win.getComputedStyle(doc.documentElement, ""), pre = (Array.prototype.slice.call(styles).join("").match(/-(moz|webkit|ms)-/) || styles.OLink === "" && [ "", "o" ])[1];
        return {
            dom: pre == "ms" ? "MS" : pre,
            lowercase: pre,
            css: "-" + pre + "-",
            js: pre == "ms" ? pre : pre[0].toUpperCase() + pre.substr(1)
        };
    }(), matchSelector = Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + "MatchesSelector"], mutation = win.MutationObserver || win[prefix.js + "MutationObserver"];
    var typeCache = {}, typeString = typeCache.toString, typeRegexp = /\s([a-zA-Z]+)/;
    function typeOf(obj) {
        var type = typeString.call(obj);
        return typeCache[type] || (typeCache[type] = type.match(typeRegexp)[1].toLowerCase());
    }
    function clone(item, type) {
        var fn = clone[type || typeOf(item)];
        return fn ? fn(item) : item;
    }
    clone.object = function(src) {
        var obj = {};
        for (var key in src) obj[key] = clone(src[key]);
        return obj;
    };
    clone.array = function(src) {
        var i = src.length, array = new Array(i);
        while (i--) array[i] = clone(src[i]);
        return array;
    };
    var unsliceable = [ "undefined", "null", "number", "boolean", "string", "function" ];
    function toArray(obj) {
        return unsliceable.indexOf(typeOf(obj)) == -1 ? Array.prototype.slice.call(obj, 0) : [ obj ];
    }
    var str = "";
    function query(element, selector) {
        return (selector || str).length ? toArray(element.querySelectorAll(selector)) : [];
    }
    function parseMutations(element, mutations) {
        var diff = {
            added: [],
            removed: []
        };
        mutations.forEach(function(record) {
            record._mutation = true;
            for (var z in diff) {
                var type = element._records[z == "added" ? "inserted" : "removed"], nodes = record[z + "Nodes"], length = nodes.length;
                for (var i = 0; i < length && diff[z].indexOf(nodes[i]) == -1; i++) {
                    diff[z].push(nodes[i]);
                    type.forEach(function(fn) {
                        fn(nodes[i], record);
                    });
                }
            }
        });
    }
    function mergeOne(source, key, current) {
        var type = typeOf(current);
        if (type == "object" && typeOf(source[key]) == "object") xtag.merge(source[key], current); else source[key] = clone(current, type);
        return source;
    }
    function wrapMixin(tag, key, pseudo, value, original) {
        if (typeof original[key] != "function") original[key] = value; else {
            original[key] = xtag.wrap(original[key], xtag.applyPseudos(pseudo, value, tag.pseudos));
        }
    }
    var uniqueMixinCount = 0;
    function mergeMixin(tag, mixin, original, mix) {
        if (mix) {
            var uniques = {};
            for (var z in original) uniques[z.split(":")[0]] = z;
            for (z in mixin) {
                wrapMixin(tag, uniques[z.split(":")[0]] || z, z, mixin[z], original);
            }
        } else {
            for (var zz in mixin) {
                wrapMixin(tag, zz + ":__mixin__(" + uniqueMixinCount++ + ")", zz, mixin[zz], original);
            }
        }
    }
    function applyMixins(tag) {
        tag.mixins.forEach(function(name) {
            var mixin = xtag.mixins[name];
            for (var type in mixin) {
                var item = mixin[type], original = tag[type];
                if (!original) tag[type] = item; else {
                    switch (type) {
                      case "accessors":
                      case "prototype":
                        for (var z in item) {
                            if (!original[z]) original[z] = item[z]; else mergeMixin(tag, item[z], original[z], true);
                        }
                        break;

                      default:
                        mergeMixin(tag, item, original, type != "events");
                    }
                }
            }
        });
        return tag;
    }
    function delegateAction(pseudo, event) {
        var match, target = event.target;
        if (!target.tagName) return null;
        if (xtag.matchSelector(target, pseudo.value)) match = target; else if (xtag.matchSelector(target, pseudo.value + " *")) {
            var parent = target.parentNode;
            while (!match) {
                if (xtag.matchSelector(parent, pseudo.value)) match = parent;
                parent = parent.parentNode;
            }
        }
        return match ? pseudo.listener = pseudo.listener.bind(match) : null;
    }
    function touchFilter(event) {
        if (event.type.match("touch")) {
            event.target.__touched__ = true;
        } else if (event.target.__touched__ && event.type.match("mouse")) {
            delete event.target.__touched__;
            return;
        }
        return true;
    }
    function createFlowEvent(type) {
        var flow = type == "over";
        return {
            attach: "OverflowEvent" in win ? "overflowchanged" : [],
            condition: function(event, custom) {
                event.flow = type;
                return event.type == type + "flow" || event.orient === 0 && event.horizontalOverflow == flow || event.orient == 1 && event.verticalOverflow == flow || event.orient == 2 && event.horizontalOverflow == flow && event.verticalOverflow == flow;
            }
        };
    }
    function writeProperty(key, event, base, desc) {
        if (desc) event[key] = base[key]; else Object.defineProperty(event, key, {
            writable: true,
            enumerable: true,
            value: base[key]
        });
    }
    var skipProps = {};
    for (var z in document.createEvent("CustomEvent")) skipProps[z] = 1;
    function inheritEvent(event, base) {
        var desc = Object.getOwnPropertyDescriptor(event, "target");
        for (var z in base) {
            if (!skipProps[z]) writeProperty(z, event, base, desc);
        }
        event.baseEvent = base;
    }
    function getArgs(attr, value) {
        return {
            value: attr.boolean ? "" : value,
            method: attr.boolean && !value ? "removeAttribute" : "setAttribute"
        };
    }
    function modAttr(element, attr, name, value) {
        var args = getArgs(attr, value);
        element[args.method](name, args.value);
    }
    function syncAttr(element, attr, name, value, method) {
        var nodes = attr.property ? [ element.xtag[attr.property] ] : attr.selector ? xtag.query(element, attr.selector) : [], index = nodes.length;
        while (index--) nodes[index][method](name, value);
    }
    function updateView(element, name, value) {
        if (element.__view__) {
            element.__view__.updateBindingValue(element, name, value);
        }
    }
    function attachProperties(tag, prop, z, accessor, attr, name) {
        var key = z.split(":"), type = key[0];
        if (type == "get") {
            key[0] = prop;
            tag.prototype[prop].get = xtag.applyPseudos(key.join(":"), accessor[z], tag.pseudos);
        } else if (type == "set") {
            key[0] = prop;
            var setter = tag.prototype[prop].set = xtag.applyPseudos(key.join(":"), attr ? function(value) {
                this.xtag._skipSet = true;
                if (!this.xtag._skipAttr) modAttr(this, attr, name, value);
                if (this.xtag._skipAttr && attr.skip) delete this.xtag._skipAttr;
                accessor[z].call(this, attr.boolean ? !!value : value);
                updateView(this, name, value);
                delete this.xtag._skipSet;
            } : accessor[z] ? function(value) {
                accessor[z].call(this, value);
                updateView(this, name, value);
            } : null, tag.pseudos);
            if (attr) attr.setter = setter;
        } else tag.prototype[prop][z] = accessor[z];
    }
    function parseAccessor(tag, prop) {
        tag.prototype[prop] = {};
        var accessor = tag.accessors[prop], attr = accessor.attribute, name = attr && attr.name ? attr.name.toLowerCase() : prop;
        if (attr) {
            attr.key = prop;
            tag.attributes[name] = attr;
        }
        for (var z in accessor) attachProperties(tag, prop, z, accessor, attr, name);
        if (attr) {
            if (!tag.prototype[prop].get) {
                var method = (attr.boolean ? "has" : "get") + "Attribute";
                tag.prototype[prop].get = function() {
                    return this[method](name);
                };
            }
            if (!tag.prototype[prop].set) tag.prototype[prop].set = function(value) {
                modAttr(this, attr, name, value);
                updateView(this, name, value);
            };
        }
    }
    var readyTags = {};
    function fireReady(name) {
        readyTags[name] = (readyTags[name] || []).filter(function(obj) {
            return (obj.tags = obj.tags.filter(function(z) {
                return z != name && !xtag.tags[z];
            })).length || obj.fn();
        });
    }
    var xtag = {
        tags: {},
        defaultOptions: {
            pseudos: [],
            mixins: [],
            events: {},
            methods: {},
            accessors: {},
            lifecycle: {},
            attributes: {},
            prototype: {
                xtag: {
                    get: function() {
                        return this.__xtag__ ? this.__xtag__ : this.__xtag__ = {
                            data: {}
                        };
                    }
                }
            }
        },
        register: function(name, options) {
            var _name;
            if (typeof name == "string") {
                _name = name.toLowerCase();
            } else {
                return;
            }
            var basePrototype = options.prototype;
            delete options.prototype;
            var tag = xtag.tags[_name] = applyMixins(xtag.merge({}, xtag.defaultOptions, options));
            for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
            for (z in tag.lifecycle) tag.lifecycle[z.split(":")[0]] = xtag.applyPseudos(z, tag.lifecycle[z], tag.pseudos);
            for (z in tag.methods) tag.prototype[z.split(":")[0]] = {
                value: xtag.applyPseudos(z, tag.methods[z], tag.pseudos),
                enumerable: true
            };
            for (z in tag.accessors) parseAccessor(tag, z);
            var ready = tag.lifecycle.created || tag.lifecycle.ready;
            tag.prototype.createdCallback = {
                enumerable: true,
                value: function() {
                    var element = this;
                    xtag.addEvents(this, tag.events);
                    tag.mixins.forEach(function(mixin) {
                        if (xtag.mixins[mixin].events) xtag.addEvents(element, xtag.mixins[mixin].events);
                    });
                    var output = ready ? ready.apply(this, toArray(arguments)) : null;
                    for (var name in tag.attributes) {
                        var attr = tag.attributes[name], hasAttr = this.hasAttribute(name);
                        if (hasAttr || attr.boolean) {
                            this[attr.key] = attr.boolean ? hasAttr : this.getAttribute(name);
                        }
                    }
                    tag.pseudos.forEach(function(obj) {
                        obj.onAdd.call(element, obj);
                    });
                    return output;
                }
            };
            if (tag.lifecycle.inserted) tag.prototype.enteredViewCallback = {
                value: tag.lifecycle.inserted,
                enumerable: true
            };
            if (tag.lifecycle.removed) tag.prototype.leftViewCallback = {
                value: tag.lifecycle.removed,
                enumerable: true
            };
            if (tag.lifecycle.attributeChanged) tag.prototype.attributeChangedCallback = {
                value: tag.lifecycle.attributeChanged,
                enumerable: true
            };
            var setAttribute = tag.prototype.setAttribute || HTMLElement.prototype.setAttribute;
            tag.prototype.setAttribute = {
                writable: true,
                enumberable: true,
                value: function(name, value) {
                    var attr = tag.attributes[name.toLowerCase()];
                    if (!this.xtag._skipAttr) setAttribute.call(this, name, attr && attr.boolean ? "" : value);
                    if (attr) {
                        if (attr.setter && !this.xtag._skipSet) {
                            this.xtag._skipAttr = true;
                            attr.setter.call(this, attr.boolean ? true : value);
                        }
                        value = attr.skip ? attr.boolean ? this.hasAttribute(name) : this.getAttribute(name) : value;
                        syncAttr(this, attr, name, attr.boolean ? "" : value, "setAttribute");
                    }
                    delete this.xtag._skipAttr;
                }
            };
            var removeAttribute = tag.prototype.removeAttribute || HTMLElement.prototype.removeAttribute;
            tag.prototype.removeAttribute = {
                writable: true,
                enumberable: true,
                value: function(name) {
                    var attr = tag.attributes[name.toLowerCase()];
                    if (!this.xtag._skipAttr) removeAttribute.call(this, name);
                    if (attr) {
                        if (attr.setter && !this.xtag._skipSet) {
                            this.xtag._skipAttr = true;
                            attr.setter.call(this, attr.boolean ? false : undefined);
                        }
                        syncAttr(this, attr, name, undefined, "removeAttribute");
                    }
                    delete this.xtag._skipAttr;
                }
            };
            var elementProto = basePrototype ? basePrototype : options["extends"] ? Object.create(doc.createElement(options["extends"]).constructor).prototype : win.HTMLElement.prototype;
            var definition = {
                prototype: Object.create(elementProto, tag.prototype)
            };
            if (options["extends"]) {
                definition["extends"] = options["extends"];
            }
            var reg = doc.register(_name, definition);
            fireReady(_name);
            return reg;
        },
        ready: function(names, fn) {
            var obj = {
                tags: toArray(names),
                fn: fn
            };
            if (obj.tags.reduce(function(last, name) {
                if (xtag.tags[name]) return last;
                (readyTags[name] = readyTags[name] || []).push(obj);
            }, true)) fn();
        },
        mixins: {},
        prefix: prefix,
        captureEvents: [ "focus", "blur", "scroll", "underflow", "overflow", "overflowchanged", "DOMMouseScroll" ],
        customEvents: {
            overflow: createFlowEvent("over"),
            underflow: createFlowEvent("under"),
            animationstart: {
                attach: [ prefix.dom + "AnimationStart" ]
            },
            animationend: {
                attach: [ prefix.dom + "AnimationEnd" ]
            },
            transitionend: {
                attach: [ prefix.dom + "TransitionEnd" ]
            },
            move: {
                attach: [ "mousemove", "touchmove" ],
                condition: touchFilter
            },
            enter: {
                attach: [ "mouseover", "touchenter" ],
                condition: touchFilter
            },
            leave: {
                attach: [ "mouseout", "touchleave" ],
                condition: touchFilter
            },
            scrollwheel: {
                attach: [ "DOMMouseScroll", "mousewheel" ],
                condition: function(event) {
                    event.delta = event.wheelDelta ? event.wheelDelta / 40 : Math.round(event.detail / 3.5 * -1);
                    return true;
                }
            },
            tapstart: {
                observe: {
                    mousedown: doc,
                    touchstart: doc
                },
                condition: touchFilter
            },
            tapend: {
                observe: {
                    mouseup: doc,
                    touchend: doc
                },
                condition: touchFilter
            },
            tapmove: {
                attach: [ "tapstart", "dragend", "touchcancel" ],
                condition: function(event, custom) {
                    switch (event.type) {
                      case "move":
                        return true;

                      case "dragover":
                        var last = custom.lastDrag || {};
                        custom.lastDrag = event;
                        return last.pageX != event.pageX && last.pageY != event.pageY || null;

                      case "tapstart":
                        if (!custom.move) {
                            custom.current = this;
                            custom.move = xtag.addEvents(this, {
                                move: custom.listener,
                                dragover: custom.listener
                            });
                            custom.tapend = xtag.addEvent(doc, "tapend", custom.listener);
                        }
                        break;

                      case "tapend":
                      case "dragend":
                      case "touchcancel":
                        if (!event.touches.length) {
                            if (custom.move) xtag.removeEvents(custom.current, custom.move || {});
                            if (custom.tapend) xtag.removeEvent(doc, custom.tapend || {});
                            delete custom.lastDrag;
                            delete custom.current;
                            delete custom.tapend;
                            delete custom.move;
                        }
                    }
                }
            }
        },
        pseudos: {
            __mixin__: {},
            keypass: keypseudo,
            keyfail: keypseudo,
            delegate: {
                action: delegateAction
            },
            within: {
                action: delegateAction,
                onAdd: function(pseudo) {
                    var condition = pseudo.source.condition;
                    if (condition) pseudo.source.condition = function(event, custom) {
                        return xtag.query(this, pseudo.value).filter(function(node) {
                            return node == event.target || node.contains ? node.contains(event.target) : null;
                        })[0] ? condition.call(this, event, custom) : null;
                    };
                }
            },
            preventable: {
                action: function(pseudo, event) {
                    return !event.defaultPrevented;
                }
            }
        },
        clone: clone,
        typeOf: typeOf,
        toArray: toArray,
        wrap: function(original, fn) {
            return function() {
                var args = toArray(arguments), output = original.apply(this, args);
                fn.apply(this, args);
                return output;
            };
        },
        merge: function(source, k, v) {
            if (typeOf(k) == "string") return mergeOne(source, k, v);
            for (var i = 1, l = arguments.length; i < l; i++) {
                var object = arguments[i];
                for (var key in object) mergeOne(source, key, object[key]);
            }
            return source;
        },
        uid: function() {
            return Math.random().toString(36).substr(2, 10);
        },
        query: query,
        skipTransition: function(element, fn) {
            var prop = prefix.js + "TransitionProperty";
            element.style[prop] = element.style.transitionProperty = "none";
            var callback = fn();
            return xtag.requestFrame(function() {
                xtag.requestFrame(function() {
                    element.style[prop] = element.style.transitionProperty = "";
                    if (callback) xtag.requestFrame(callback);
                });
            });
        },
        requestFrame: function() {
            var raf = win.requestAnimationFrame || win[prefix.lowercase + "RequestAnimationFrame"] || function(fn) {
                return win.setTimeout(fn, 20);
            };
            return function(fn) {
                return raf(fn);
            };
        }(),
        cancelFrame: function() {
            var cancel = win.cancelAnimationFrame || win[prefix.lowercase + "CancelAnimationFrame"] || win.clearTimeout;
            return function(id) {
                return cancel(id);
            };
        }(),
        matchSelector: function(element, selector) {
            return matchSelector.call(element, selector);
        },
        set: function(element, method, value) {
            element[method] = value;
            if (window.CustomElements) CustomElements.upgradeAll(element);
        },
        innerHTML: function(el, html) {
            xtag.set(el, "innerHTML", html);
        },
        hasClass: function(element, klass) {
            return element.className.split(" ").indexOf(klass.trim()) > -1;
        },
        addClass: function(element, klass) {
            var list = element.className.trim().split(" ");
            klass.trim().split(" ").forEach(function(name) {
                if (!~list.indexOf(name)) list.push(name);
            });
            element.className = list.join(" ").trim();
            return element;
        },
        removeClass: function(element, klass) {
            var classes = klass.trim().split(" ");
            element.className = element.className.trim().split(" ").filter(function(name) {
                return name && !~classes.indexOf(name);
            }).join(" ");
            return element;
        },
        toggleClass: function(element, klass) {
            return xtag[xtag.hasClass(element, klass) ? "removeClass" : "addClass"].call(null, element, klass);
        },
        queryChildren: function(element, selector) {
            var id = element.id, guid = element.id = id || "x_" + xtag.uid(), attr = "#" + guid + " > ";
            selector = attr + (selector + "").replace(",", "," + attr, "g");
            var result = element.parentNode.querySelectorAll(selector);
            if (!id) element.removeAttribute("id");
            return toArray(result);
        },
        createFragment: function(content) {
            var frag = doc.createDocumentFragment();
            if (content) {
                var div = frag.appendChild(doc.createElement("div")), nodes = toArray(content.nodeName ? arguments : !(div.innerHTML = content) || div.children), length = nodes.length, index = 0;
                while (index < length) frag.insertBefore(nodes[index++], div);
                frag.removeChild(div);
            }
            return frag;
        },
        manipulate: function(element, fn) {
            var next = element.nextSibling, parent = element.parentNode, frag = doc.createDocumentFragment(), returned = fn.call(frag.appendChild(element), frag) || element;
            if (next) parent.insertBefore(returned, next); else parent.appendChild(returned);
        },
        applyPseudos: function(key, fn, target, source) {
            var listener = fn, pseudos = {};
            if (key.match(":")) {
                var split = key.match(regexPseudoSplit), i = split.length;
                while (--i) {
                    split[i].replace(regexPseudoReplace, function(match, name, value) {
                        if (!xtag.pseudos[name]) throw "pseudo not found: " + name + " " + split;
                        var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
                        pseudo.key = key;
                        pseudo.name = name;
                        pseudo.value = value;
                        pseudo["arguments"] = (value || "").split(",");
                        pseudo.action = pseudo.action || trueop;
                        pseudo.source = source;
                        var last = listener;
                        listener = function() {
                            var args = toArray(arguments), obj = {
                                key: key,
                                name: name,
                                value: value,
                                source: source,
                                arguments: pseudo["arguments"],
                                listener: last
                            };
                            var output = pseudo.action.apply(this, [ obj ].concat(args));
                            if (output === null || output === false) return output;
                            return obj.listener.apply(this, args);
                        };
                        if (target && pseudo.onAdd) {
                            if (target.nodeName) pseudo.onAdd.call(target, pseudo); else target.push(pseudo);
                        }
                    });
                }
            }
            for (var z in pseudos) {
                if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]) || listener;
            }
            return listener;
        },
        removePseudos: function(target, pseudos) {
            pseudos.forEach(function(obj) {
                if (obj.onRemove) obj.onRemove.call(target, obj);
            });
        },
        parseEvent: function(type, fn) {
            var pseudos = type.split(":"), key = pseudos.shift(), custom = xtag.customEvents[key], event = xtag.merge({
                type: key,
                stack: noop,
                condition: trueop,
                attach: [],
                _attach: [],
                pseudos: "",
                _pseudos: [],
                onAdd: noop,
                onRemove: noop
            }, custom || {});
            event.attach = toArray(event.base || event.attach);
            event.chain = key + (event.pseudos.length ? ":" + event.pseudos : "") + (pseudos.length ? ":" + pseudos.join(":") : "");
            var condition = event.condition;
            event.condition = function(e) {
                var t = e.touches, tt = e.targetTouches;
                return condition.apply(this, toArray(arguments));
            };
            var stack = xtag.applyPseudos(event.chain, fn, event._pseudos, event);
            event.stack = function(e) {
                var t = e.touches, tt = e.targetTouches;
                var detail = e.detail || {};
                if (!detail.__stack__) return stack.apply(this, toArray(arguments)); else if (detail.__stack__ == stack) {
                    e.stopPropagation();
                    e.cancelBubble = true;
                    return stack.apply(this, toArray(arguments));
                }
            };
            event.listener = function(e) {
                var args = toArray(arguments), output = event.condition.apply(this, args.concat([ event ]));
                if (!output) return output;
                if (e.type != key) {
                    xtag.fireEvent(e.target, key, {
                        baseEvent: e,
                        detail: output !== true && (output.__stack__ = stack) ? output : {
                            __stack__: stack
                        }
                    });
                } else return event.stack.apply(this, args);
            };
            event.attach.forEach(function(name) {
                event._attach.push(xtag.parseEvent(name, event.listener));
            });
            if (custom && custom.observe && !custom.__observing__) {
                custom.observer = function(e) {
                    var output = event.condition.apply(this, toArray(arguments).concat([ custom ]));
                    if (!output) return output;
                    xtag.fireEvent(e.target, key, {
                        baseEvent: e,
                        detail: output !== true ? output : {}
                    });
                };
                for (var z in custom.observe) xtag.addEvent(custom.observe[z] || document, z, custom.observer, true);
                custom.__observing__ = true;
            }
            return event;
        },
        addEvent: function(element, type, fn, capture) {
            var event = typeof fn == "function" ? xtag.parseEvent(type, fn) : fn;
            event._pseudos.forEach(function(obj) {
                obj.onAdd.call(element, obj);
            });
            event._attach.forEach(function(obj) {
                xtag.addEvent(element, obj.type, obj);
            });
            event.onAdd.call(element, event, event.listener);
            element.addEventListener(event.type, event.stack, capture || xtag.captureEvents.indexOf(event.type) > -1);
            return event;
        },
        addEvents: function(element, obj) {
            var events = {};
            for (var z in obj) {
                events[z] = xtag.addEvent(element, z, obj[z]);
            }
            return events;
        },
        removeEvent: function(element, type, event) {
            event = event || type;
            event.onRemove.call(element, event, event.listener);
            xtag.removePseudos(element, event._pseudos);
            event._attach.forEach(function(obj) {
                xtag.removeEvent(element, obj);
            });
            element.removeEventListener(event.type, event.stack);
        },
        removeEvents: function(element, obj) {
            for (var z in obj) xtag.removeEvent(element, obj[z]);
        },
        fireEvent: function(element, type, options, warn) {
            var event = doc.createEvent("CustomEvent");
            options = options || {};
            if (warn) console.warn("fireEvent has been modified");
            event.initCustomEvent(type, options.bubbles !== false, options.cancelable !== false, options.detail);
            if (options.baseEvent) inheritEvent(event, options.baseEvent);
            try {
                element.dispatchEvent(event);
            } catch (e) {
                console.warn("This error may have been caused by a change in the fireEvent method", e);
            }
        },
        addObserver: function(element, type, fn) {
            if (!element._records) {
                element._records = {
                    inserted: [],
                    removed: []
                };
                if (mutation) {
                    element._observer = new mutation(function(mutations) {
                        parseMutations(element, mutations);
                    });
                    element._observer.observe(element, {
                        subtree: true,
                        childList: true,
                        attributes: !true,
                        characterData: false
                    });
                } else [ "Inserted", "Removed" ].forEach(function(type) {
                    element.addEventListener("DOMNode" + type, function(event) {
                        event._mutation = true;
                        element._records[type.toLowerCase()].forEach(function(fn) {
                            fn(event.target, event);
                        });
                    }, false);
                });
            }
            if (element._records[type].indexOf(fn) == -1) element._records[type].push(fn);
        },
        removeObserver: function(element, type, fn) {
            var obj = element._records;
            if (obj && fn) {
                obj[type].splice(obj[type].indexOf(fn), 1);
            } else {
                obj[type] = [];
            }
        }
    };
    var touching = false, touchTarget = null;
    doc.addEventListener("mousedown", function(e) {
        touching = true;
        touchTarget = e.target;
    }, true);
    doc.addEventListener("mouseup", function() {
        touching = false;
        touchTarget = null;
    }, true);
    doc.addEventListener("dragend", function() {
        touching = false;
        touchTarget = null;
    }, true);
    var UIEventProto = {
        touches: {
            configurable: true,
            get: function() {
                return this.__touches__ || (this.identifier = 0) || (this.__touches__ = touching ? [ this ] : []);
            }
        },
        targetTouches: {
            configurable: true,
            get: function() {
                return this.__targetTouches__ || (this.__targetTouches__ = touching && this.currentTarget && (this.currentTarget == touchTarget || this.currentTarget.contains && this.currentTarget.contains(touchTarget)) ? (this.identifier = 0) || [ this ] : []);
            }
        },
        changedTouches: {
            configurable: true,
            get: function() {
                return this.__changedTouches__ || (this.identifier = 0) || (this.__changedTouches__ = [ this ]);
            }
        }
    };
    for (z in UIEventProto) {
        UIEvent.prototype[z] = UIEventProto[z];
        Object.defineProperty(UIEvent.prototype, z, UIEventProto[z]);
    }
    function addTap(el, tap, e) {
        if (!el.__tap__) {
            el.__tap__ = {
                click: e.type == "mousedown"
            };
            if (el.__tap__.click) el.addEventListener("click", tap.observer); else {
                el.__tap__.scroll = tap.observer.bind(el);
                window.addEventListener("scroll", el.__tap__.scroll, true);
                el.addEventListener("touchmove", tap.observer);
                el.addEventListener("touchcancel", tap.observer);
                el.addEventListener("touchend", tap.observer);
            }
        }
        if (!el.__tap__.click) {
            el.__tap__.x = e.touches[0].pageX;
            el.__tap__.y = e.touches[0].pageY;
        }
    }
    function removeTap(el, tap) {
        if (el.__tap__) {
            if (el.__tap__.click) el.removeEventListener("click", tap.observer); else {
                window.removeEventListener("scroll", el.__tap__.scroll, true);
                el.removeEventListener("touchmove", tap.observer);
                el.removeEventListener("touchcancel", tap.observer);
                el.removeEventListener("touchend", tap.observer);
            }
            delete el.__tap__;
        }
    }
    function checkTapPosition(el, tap, e) {
        var touch = e.changedTouches[0], tol = tap.gesture.tolerance;
        if (touch.pageX < el.__tap__.x + tol && touch.pageX > el.__tap__.x - tol && touch.pageY < el.__tap__.y + tol && touch.pageY > el.__tap__.y - tol) return true;
    }
    xtag.customEvents.tap = {
        observe: {
            mousedown: document,
            touchstart: document
        },
        gesture: {
            tolerance: 8
        },
        condition: function(e, tap) {
            var el = e.target;
            switch (e.type) {
              case "touchstart":
                if (el.__tap__ && el.__tap__.click) removeTap(el, tap);
                addTap(el, tap, e);
                return;

              case "mousedown":
                if (!el.__tap__) addTap(el, tap, e);
                return;

              case "scroll":
              case "touchcancel":
                removeTap(this, tap);
                return;

              case "touchmove":
              case "touchend":
                if (this.__tap__ && !checkTapPosition(this, tap, e)) {
                    removeTap(this, tap);
                    return;
                }
                return e.type == "touchend" || null;

              case "click":
                removeTap(this, tap);
                return true;
            }
        }
    };
    win.xtag = xtag;
    if (typeof define == "function" && define.amd) define('brick',xtag);
    doc.addEventListener("WebComponentsReady", function() {
        xtag.fireEvent(doc.body, "DOMComponentsLoaded");
    });
})();

(function() {
    xtag.register("x-appbar", {
        lifecycle: {
            created: function() {
                var header = xtag.queryChildren(this, "h1,h2,h3,h4,h5,h6")[0];
                if (!header) {
                    header = document.createElement("h1");
                    this.appendChild(header);
                }
                this.xtag.data.header = header;
                this.subheading = this.subheading;
            }
        },
        accessors: {
            heading: {
                attribute: {},
                get: function() {
                    return this.xtag.data.header.innerHTML;
                },
                set: function(value) {
                    this.xtag.data.header.innerHTML = value;
                }
            },
            subheading: {
                attribute: {},
                get: function() {
                    return this.getAttribute("subheading") || "";
                },
                set: function(value) {
                    this.xtag.data.header.setAttribute("subheading", value);
                }
            }
        }
    });
})();

(function() {
    var LEFT_MOUSE_BTN = 0;
    var GET_DEFAULT_LABELS = function() {
        return {
            prev: "←",
            next: "→",
            months: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
            weekdays: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ]
        };
    };
    function normalize(localDate) {
        var normalizedDate = new Date(localDate.valueOf());
        normalizedDate.setHours(0);
        normalizedDate.setMinutes(0);
        normalizedDate.setSeconds(0);
        normalizedDate.setMilliseconds(0);
        return normalizedDate;
    }
    var TODAY = normalize(new Date());
    var DRAG_ADD = "add";
    var DRAG_REMOVE = "remove";
    var CHOSEN_CLASS = "chosen";
    var className = "className";
    function appendChild(parent, child) {
        parent.appendChild(child);
    }
    function parseIntDec(num) {
        return parseInt(num, 10);
    }
    function isWeekdayNum(dayNum) {
        var dayInt = parseIntDec(dayNum);
        return dayInt === dayNum && !isNaN(dayInt) && dayInt >= 0 && dayInt <= 6;
    }
    function isValidDateObj(d) {
        return d instanceof Date && !!d.getTime && !isNaN(d.getTime());
    }
    function isArray(a) {
        if (a && a.isArray) {
            return a.isArray();
        } else {
            return Object.prototype.toString.call(a) === "[object Array]";
        }
    }
    function makeEl(s) {
        var a = s.split(".");
        var tag = a.shift();
        var el = document.createElement(tag);
        el[className] = a.join(" ");
        return el;
    }
    function getWindowViewport() {
        var docElem = document.documentElement;
        var rect = {
            left: docElem.scrollLeft || document.body.scrollLeft || 0,
            top: docElem.scrollTop || document.body.scrollTop || 0,
            width: docElem.clientWidth,
            height: docElem.clientHeight
        };
        rect.right = rect.left + rect.width;
        rect.bottom = rect.top + rect.height;
        return rect;
    }
    function getRect(el) {
        var rect = el.getBoundingClientRect();
        var viewport = getWindowViewport();
        var docScrollLeft = viewport.left;
        var docScrollTop = viewport.top;
        return {
            left: rect.left + docScrollLeft,
            right: rect.right + docScrollLeft,
            top: rect.top + docScrollTop,
            bottom: rect.bottom + docScrollTop,
            width: rect.width,
            height: rect.height
        };
    }
    function addClass(el, c) {
        xtag.addClass(el, c);
    }
    function removeClass(el, c) {
        xtag.removeClass(el, c);
    }
    function hasClass(el, c) {
        return xtag.hasClass(el, c);
    }
    function getYear(d) {
        return d.getFullYear();
    }
    function getMonth(d) {
        return d.getMonth();
    }
    function getDate(d) {
        return d.getDate();
    }
    function getDay(d) {
        return d.getDay();
    }
    function pad(n, padSize) {
        var str = n.toString();
        var padZeros = new Array(padSize).join("0");
        return (padZeros + str).substr(-padSize);
    }
    function iso(d) {
        return [ pad(getYear(d), 4), pad(getMonth(d) + 1, 2), pad(getDate(d), 2) ].join("-");
    }
    var ISO_DATE_REGEX = /(\d{4})[^\d]?(\d{2})[^\d]?(\d{2})/;
    function fromIso(s) {
        if (isValidDateObj(s)) return s;
        var d = ISO_DATE_REGEX.exec(s);
        if (d) {
            return normalize(new Date(d[1], d[2] - 1, d[3]));
        } else {
            return null;
        }
    }
    function parseSingleDate(dateStr) {
        if (isValidDateObj(dateStr)) return dateStr;
        var isoParsed = fromIso(dateStr);
        if (isoParsed) {
            return isoParsed;
        } else {
            var parsedMs = Date.parse(dateStr);
            if (!isNaN(parsedMs)) {
                return normalize(new Date(parsedMs));
            }
            return null;
        }
    }
    function parseMultiDates(multiDateStr) {
        var ranges;
        if (isArray(multiDateStr)) {
            ranges = multiDateStr.slice(0);
        } else if (isValidDateObj(multiDateStr)) {
            return [ multiDateStr ];
        } else if (typeof multiDateStr === "string" && multiDateStr.length > 0) {
            try {
                ranges = JSON.parse(multiDateStr);
                if (!isArray(ranges)) {
                    console.warn("invalid list of ranges", multiDateStr);
                    return null;
                }
            } catch (err) {
                var parsedSingle = parseSingleDate(multiDateStr);
                if (parsedSingle) {
                    return [ parsedSingle ];
                } else {
                    console.warn("unable to parse", multiDateStr, "as JSON or single date");
                    return null;
                }
            }
        } else {
            return null;
        }
        for (var i = 0; i < ranges.length; i++) {
            var range = ranges[i];
            if (isValidDateObj(range)) {
                continue;
            } else if (typeof range === "string") {
                var parsedDate = parseSingleDate(range);
                if (!parsedDate) {
                    console.warn("unable to parse date", range);
                    return null;
                }
                ranges[i] = parsedDate;
            } else if (isArray(range) && range.length === 2) {
                var parsedStartDate = parseSingleDate(range[0]);
                if (!parsedStartDate) {
                    console.warn("unable to parse start date", range[0], "from range", range);
                    return null;
                }
                var parsedEndDate = parseSingleDate(range[1]);
                if (!parsedEndDate) {
                    console.warn("unable to parse end date", range[1], "from range", range);
                    return null;
                }
                if (parsedStartDate.valueOf() > parsedEndDate.valueOf()) {
                    console.warn("invalid range", range, ": start date is after end date");
                    return null;
                }
                ranges[i] = [ parsedStartDate, parsedEndDate ];
            } else {
                console.warn("invalid range value: ", range);
                return null;
            }
        }
        return ranges;
    }
    function from(base, y, m, d) {
        if (y === undefined) y = getYear(base);
        if (m === undefined) m = getMonth(base);
        if (d === undefined) d = getDate(base);
        return normalize(new Date(y, m, d));
    }
    function daysInMonth(month, year) {
        if (!year) {
            year = new Date().getFullYear();
        }
        return new Date(year, month + 1, 0).getDate();
    }
    function relOffset(base, y, m, d) {
        return from(base, getYear(base) + y, getMonth(base) + m, getDate(base) + d);
    }
    function nextMonth(d) {
        var date = d.getDate();
        var daysInNextMonth = daysInMonth(d.getMonth() + 1, d.getFullYear());
        if (date > daysInNextMonth) {
            date = daysInNextMonth;
        }
        console.log(new Date(d.getFullYear(), d.getMonth() + 1, date).toString());
        return new Date(d.getFullYear(), d.getMonth() + 1, date);
    }
    function prevMonth(d) {
        var date = d.getDate();
        var daysInPrevMonth = daysInMonth(d.getMonth() - 1, d.getFullYear());
        if (date > daysInPrevMonth) {
            date = daysInPrevMonth;
        }
        return new Date(d.getFullYear(), d.getMonth() - 1, date);
    }
    function findWeekStart(d, firstWeekday) {
        firstWeekday = parseIntDec(firstWeekday);
        if (!isWeekdayNum(firstWeekday)) {
            firstWeekday = 0;
        }
        for (var step = 0; step < 7; step++) {
            if (getDay(d) === firstWeekday) {
                return d;
            } else {
                d = prevDay(d);
            }
        }
        throw "unable to find week start";
    }
    function findWeekEnd(d, lastWeekDay) {
        lastWeekDay = parseIntDec(lastWeekDay);
        if (!isWeekdayNum(lastWeekDay)) {
            lastWeekDay = 6;
        }
        for (var step = 0; step < 7; step++) {
            if (getDay(d) === lastWeekDay) {
                return d;
            } else {
                d = nextDay(d);
            }
        }
        throw "unable to find week end";
    }
    function findFirst(d) {
        d = new Date(d.valueOf());
        d.setDate(1);
        return normalize(d);
    }
    function findLast(d) {
        return prevDay(relOffset(d, 0, 1, 0));
    }
    function nextDay(d) {
        return relOffset(d, 0, 0, 1);
    }
    function prevDay(d) {
        return relOffset(d, 0, 0, -1);
    }
    function dateMatches(d, matches) {
        if (!matches) return;
        matches = matches.length === undefined ? [ matches ] : matches;
        var foundMatch = false;
        matches.forEach(function(match) {
            if (match.length === 2) {
                if (dateInRange(match[0], match[1], d)) {
                    foundMatch = true;
                }
            } else {
                if (iso(match) === iso(d)) {
                    foundMatch = true;
                }
            }
        });
        return foundMatch;
    }
    function dateInRange(start, end, d) {
        return iso(start) <= iso(d) && iso(d) <= iso(end);
    }
    function sortRanges(ranges) {
        ranges.sort(function(rangeA, rangeB) {
            var dateA = isValidDateObj(rangeA) ? rangeA : rangeA[0];
            var dateB = isValidDateObj(rangeB) ? rangeB : rangeB[0];
            return dateA.valueOf() - dateB.valueOf();
        });
    }
    function makeControls(labelData) {
        var controls = makeEl("div.controls");
        var prev = makeEl("span.prev");
        var next = makeEl("span.next");
        prev.innerHTML = labelData.prev;
        next.innerHTML = labelData.next;
        appendChild(controls, prev);
        appendChild(controls, next);
        return controls;
    }
    function Calendar(data) {
        var self = this;
        data = data || {};
        self._span = data.span || 1;
        self._multiple = data.multiple || false;
        self._viewDate = self._sanitizeViewDate(data.view, data.chosen);
        self._chosenRanges = self._sanitizeChosenRanges(data.chosen, data.view);
        self._firstWeekdayNum = data.firstWeekdayNum || 0;
        self._el = makeEl("div.calendar");
        self._labels = GET_DEFAULT_LABELS();
        self._customRenderFn = null;
        self._renderRecursionFlag = false;
        self.render(true);
    }
    var CALENDAR_PROTOTYPE = Calendar.prototype;
    CALENDAR_PROTOTYPE.makeMonth = function(d) {
        if (!isValidDateObj(d)) throw "Invalid view date!";
        var firstWeekday = this.firstWeekdayNum;
        var chosen = this.chosen;
        var labels = this.labels;
        var month = getMonth(d);
        var sDate = findWeekStart(findFirst(d), firstWeekday);
        var monthEl = makeEl("div.month");
        var monthLabel = makeEl("div.month-label");
        monthLabel.textContent = labels.months[month] + " " + getYear(d);
        appendChild(monthEl, monthLabel);
        var weekdayLabels = makeEl("div.weekday-labels");
        for (var step = 0; step < 7; step++) {
            var weekdayNum = (firstWeekday + step) % 7;
            var weekdayLabel = makeEl("span.weekday-label");
            weekdayLabel.textContent = labels.weekdays[weekdayNum];
            appendChild(weekdayLabels, weekdayLabel);
        }
        appendChild(monthEl, weekdayLabels);
        var week = makeEl("div.week");
        var cDate = sDate;
        var maxDays = 7 * 6;
        for (step = 0; step < maxDays; step++) {
            var day = makeEl("span.day");
            day.setAttribute("data-date", iso(cDate));
            day.textContent = getDate(cDate);
            if (getMonth(cDate) !== month) {
                addClass(day, "badmonth");
            }
            if (dateMatches(cDate, chosen)) {
                addClass(day, CHOSEN_CLASS);
            }
            if (dateMatches(cDate, TODAY)) {
                addClass(day, "today");
            }
            appendChild(week, day);
            var oldDate = cDate;
            cDate = nextDay(cDate);
            if ((step + 1) % 7 === 0) {
                appendChild(monthEl, week);
                week = makeEl("div.week");
                var done = getMonth(cDate) > month || getMonth(cDate) < month && getYear(cDate) > getYear(sDate);
                if (done) break;
            }
        }
        return monthEl;
    };
    CALENDAR_PROTOTYPE._sanitizeViewDate = function(viewDate, chosenRanges) {
        chosenRanges = chosenRanges === undefined ? this.chosen : chosenRanges;
        var saneDate;
        if (isValidDateObj(viewDate)) {
            saneDate = viewDate;
        } else if (isValidDateObj(chosenRanges)) {
            saneDate = chosenRanges;
        } else if (isArray(chosenRanges) && chosenRanges.length > 0) {
            var firstRange = chosenRanges[0];
            if (isValidDateObj(firstRange)) {
                saneDate = firstRange;
            } else {
                saneDate = firstRange[0];
            }
        } else {
            saneDate = TODAY;
        }
        return saneDate;
    };
    function _collapseRanges(ranges) {
        ranges = ranges.slice(0);
        sortRanges(ranges);
        var collapsed = [];
        for (var i = 0; i < ranges.length; i++) {
            var currRange = ranges[i];
            var prevRange = collapsed.length > 0 ? collapsed[collapsed.length - 1] : null;
            var currStart, currEnd;
            var prevStart, prevEnd;
            if (isValidDateObj(currRange)) {
                currStart = currEnd = currRange;
            } else {
                currStart = currRange[0];
                currEnd = currRange[1];
            }
            currRange = dateMatches(currStart, currEnd) ? currStart : [ currStart, currEnd ];
            if (isValidDateObj(prevRange)) {
                prevStart = prevEnd = prevRange;
            } else if (prevRange) {
                prevStart = prevRange[0];
                prevEnd = prevRange[1];
            } else {
                collapsed.push(currRange);
                continue;
            }
            if (dateMatches(currStart, [ prevRange ]) || dateMatches(prevDay(currStart), [ prevRange ])) {
                var minStart = prevStart.valueOf() < currStart.valueOf() ? prevStart : currStart;
                var maxEnd = prevEnd.valueOf() > currEnd.valueOf() ? prevEnd : currEnd;
                var newRange = dateMatches(minStart, maxEnd) ? minStart : [ minStart, maxEnd ];
                collapsed[collapsed.length - 1] = newRange;
            } else {
                collapsed.push(currRange);
            }
        }
        return collapsed;
    }
    CALENDAR_PROTOTYPE._sanitizeChosenRanges = function(chosenRanges, viewDate) {
        viewDate = viewDate === undefined ? this.view : viewDate;
        var cleanRanges;
        if (isValidDateObj(chosenRanges)) {
            cleanRanges = [ chosenRanges ];
        } else if (isArray(chosenRanges)) {
            cleanRanges = chosenRanges;
        } else if (chosenRanges === null || chosenRanges === undefined || !viewDate) {
            cleanRanges = [];
        } else {
            cleanRanges = [ viewDate ];
        }
        var collapsedRanges = _collapseRanges(cleanRanges);
        if (!this.multiple && collapsedRanges.length > 0) {
            var firstRange = collapsedRanges[0];
            if (isValidDateObj(firstRange)) {
                return [ firstRange ];
            } else {
                return [ firstRange[0] ];
            }
        } else {
            return collapsedRanges;
        }
    };
    CALENDAR_PROTOTYPE.addDate = function(dateObj, append) {
        if (isValidDateObj(dateObj)) {
            if (append) {
                this.chosen.push(dateObj);
                this.chosen = this.chosen;
            } else {
                this.chosen = [ dateObj ];
            }
        }
    };
    CALENDAR_PROTOTYPE.removeDate = function(dateObj) {
        if (!isValidDateObj(dateObj)) {
            return;
        }
        var ranges = this.chosen.slice(0);
        for (var i = 0; i < ranges.length; i++) {
            var range = ranges[i];
            if (dateMatches(dateObj, [ range ])) {
                ranges.splice(i, 1);
                if (isArray(range)) {
                    var rangeStart = range[0];
                    var rangeEnd = range[1];
                    var prevDate = prevDay(dateObj);
                    var nextDate = nextDay(dateObj);
                    if (dateMatches(prevDate, [ range ])) {
                        ranges.push([ rangeStart, prevDate ]);
                    }
                    if (dateMatches(nextDate, [ range ])) {
                        ranges.push([ nextDate, rangeEnd ]);
                    }
                }
                this.chosen = _collapseRanges(ranges);
                break;
            }
        }
    };
    CALENDAR_PROTOTYPE.hasChosenDate = function(dateObj) {
        return dateMatches(dateObj, this._chosenRanges);
    };
    CALENDAR_PROTOTYPE.hasVisibleDate = function(dateObj, excludeBadMonths) {
        var startDate = excludeBadMonths ? this.firstVisibleMonth : this.firstVisibleDate;
        var endDate = excludeBadMonths ? findLast(this.lastVisibleMonth) : this.lastVisibleDate;
        return dateMatches(dateObj, [ [ startDate, endDate ] ]);
    };
    CALENDAR_PROTOTYPE.render = function(preserveNodes) {
        var span = this._span;
        var i;
        if (!preserveNodes) {
            this.el.innerHTML = "";
            var ref = this.firstVisibleMonth;
            for (i = 0; i < span; i++) {
                appendChild(this.el, this.makeMonth(ref));
                ref = relOffset(ref, 0, 1, 0);
            }
        } else {
            var days = xtag.query(this.el, ".day");
            var day;
            for (i = 0; i < days.length; i++) {
                day = days[i];
                if (!day.hasAttribute("data-date")) {
                    continue;
                }
                var dateIso = day.getAttribute("data-date");
                var parsedDate = fromIso(dateIso);
                if (!parsedDate) {
                    continue;
                } else {
                    if (dateMatches(parsedDate, this._chosenRanges)) {
                        addClass(day, CHOSEN_CLASS);
                    } else {
                        removeClass(day, CHOSEN_CLASS);
                    }
                    if (dateMatches(parsedDate, [ TODAY ])) {
                        addClass(day, "today");
                    } else {
                        removeClass(day, "today");
                    }
                }
            }
        }
        this._callCustomRenderer();
    };
    CALENDAR_PROTOTYPE._callCustomRenderer = function() {
        if (!this._customRenderFn) return;
        if (this._renderRecursionFlag) {
            throw "Error: customRenderFn causes recursive loop of " + "rendering calendar; make sure your custom rendering " + "function doesn't modify attributes of the x-calendar that " + "would require a re-render!";
        }
        var days = xtag.query(this.el, ".day");
        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            var dateIso = day.getAttribute("data-date");
            var parsedDate = fromIso(dateIso);
            this._renderRecursionFlag = true;
            this._customRenderFn(day, parsedDate ? parsedDate : null, dateIso);
            this._renderRecursionFlag = false;
        }
    };
    Object.defineProperties(CALENDAR_PROTOTYPE, {
        el: {
            get: function() {
                return this._el;
            }
        },
        multiple: {
            get: function() {
                return this._multiple;
            },
            set: function(multi) {
                this._multiple = multi;
                this.chosen = this._sanitizeChosenRanges(this.chosen);
                this.render(true);
            }
        },
        span: {
            get: function() {
                return this._span;
            },
            set: function(newSpan) {
                var parsedSpan = parseIntDec(newSpan);
                if (!isNaN(parsedSpan) && parsedSpan >= 0) {
                    this._span = parsedSpan;
                } else {
                    this._span = 0;
                }
                this.render(false);
            }
        },
        view: {
            attribute: {},
            get: function() {
                return this._viewDate;
            },
            set: function(rawViewDate) {
                var newViewDate = this._sanitizeViewDate(rawViewDate);
                var oldViewDate = this._viewDate;
                this._viewDate = newViewDate;
                this.render(getMonth(oldViewDate) === getMonth(newViewDate) && getYear(oldViewDate) === getYear(newViewDate));
            }
        },
        chosen: {
            get: function() {
                return this._chosenRanges;
            },
            set: function(newChosenRanges) {
                this._chosenRanges = this._sanitizeChosenRanges(newChosenRanges);
                this.render(true);
            }
        },
        firstWeekdayNum: {
            get: function() {
                return this._firstWeekdayNum;
            },
            set: function(weekdayNum) {
                weekdayNum = parseIntDec(weekdayNum);
                if (!isWeekdayNum(weekdayNum)) {
                    weekdayNum = 0;
                }
                this._firstWeekdayNum = weekdayNum;
                this.render(false);
            }
        },
        lastWeekdayNum: {
            get: function() {
                return (this._firstWeekdayNum + 6) % 7;
            }
        },
        customRenderFn: {
            get: function() {
                return this._customRenderFn;
            },
            set: function(newRenderFn) {
                this._customRenderFn = newRenderFn;
                this.render(true);
            }
        },
        chosenString: {
            get: function() {
                if (this.multiple) {
                    var isoDates = this.chosen.slice(0);
                    for (var i = 0; i < isoDates.length; i++) {
                        var range = isoDates[i];
                        if (isValidDateObj(range)) {
                            isoDates[i] = iso(range);
                        } else {
                            isoDates[i] = [ iso(range[0]), iso(range[1]) ];
                        }
                    }
                    return JSON.stringify(isoDates);
                } else if (this.chosen.length > 0) {
                    return iso(this.chosen[0]);
                } else {
                    return "";
                }
            }
        },
        firstVisibleMonth: {
            get: function() {
                return findFirst(this.view);
            }
        },
        lastVisibleMonth: {
            get: function() {
                return relOffset(this.firstVisibleMonth, 0, Math.max(0, this.span - 1), 0);
            }
        },
        firstVisibleDate: {
            get: function() {
                return findWeekStart(this.firstVisibleMonth, this.firstWeekdayNum);
            }
        },
        lastVisibleDate: {
            get: function() {
                return findWeekEnd(findLast(this.lastVisibleMonth), this.lastWeekdayNum);
            }
        },
        labels: {
            get: function() {
                return this._labels;
            },
            set: function(newLabelData) {
                var oldLabelData = this.labels;
                for (var labelType in oldLabelData) {
                    if (!(labelType in newLabelData)) continue;
                    var oldLabel = this._labels[labelType];
                    var newLabel = newLabelData[labelType];
                    if (isArray(oldLabel)) {
                        if (isArray(newLabel) && oldLabel.length === newLabel.length) {
                            newLabel = newLabel.slice(0);
                            for (var i = 0; i < newLabel.length; i++) {
                                newLabel[i] = newLabel[i].toString ? newLabel[i].toString() : String(newLabel[i]);
                            }
                        } else {
                            throw "invalid label given for '" + labelType + "': expected array of " + oldLabel.length + " labels, got " + JSON.stringify(newLabel);
                        }
                    } else {
                        newLabel = String(newLabel);
                    }
                    oldLabelData[labelType] = newLabel;
                }
                this.render(false);
            }
        }
    });
    function _onDragStart(xCalendar, day) {
        var isoDate = day.getAttribute("data-date");
        var dateObj = parseSingleDate(isoDate);
        var toggleEventName;
        if (hasClass(day, CHOSEN_CLASS)) {
            xCalendar.xtag.dragType = DRAG_REMOVE;
            toggleEventName = "datetoggleoff";
        } else {
            xCalendar.xtag.dragType = DRAG_ADD;
            toggleEventName = "datetoggleon";
        }
        xCalendar.xtag.dragStartEl = day;
        xCalendar.xtag.dragAllowTap = true;
        if (!xCalendar.noToggle) {
            xtag.fireEvent(xCalendar, toggleEventName, {
                detail: {
                    date: dateObj,
                    iso: isoDate
                }
            });
        }
        xCalendar.setAttribute("active", true);
        day.setAttribute("active", true);
    }
    function _onDragMove(xCalendar, day) {
        var isoDate = day.getAttribute("data-date");
        var dateObj = parseSingleDate(isoDate);
        if (day !== xCalendar.xtag.dragStartEl) {
            xCalendar.xtag.dragAllowTap = false;
        }
        if (!xCalendar.noToggle) {
            if (xCalendar.xtag.dragType === DRAG_ADD && !hasClass(day, CHOSEN_CLASS)) {
                xtag.fireEvent(xCalendar, "datetoggleon", {
                    detail: {
                        date: dateObj,
                        iso: isoDate
                    }
                });
            } else if (xCalendar.xtag.dragType === DRAG_REMOVE && hasClass(day, CHOSEN_CLASS)) {
                xtag.fireEvent(xCalendar, "datetoggleoff", {
                    detail: {
                        date: dateObj,
                        iso: isoDate
                    }
                });
            }
        }
        if (xCalendar.xtag.dragType) {
            day.setAttribute("active", true);
        }
    }
    function _onDragEnd(e) {
        var xCalendars = xtag.query(document, "x-calendar");
        for (var i = 0; i < xCalendars.length; i++) {
            var xCalendar = xCalendars[i];
            xCalendar.xtag.dragType = null;
            xCalendar.xtag.dragStartEl = null;
            xCalendar.xtag.dragAllowTap = false;
            xCalendar.removeAttribute("active");
        }
        var days = xtag.query(document, "x-calendar .day[active]");
        for (var j = 0; j < days.length; j++) {
            days[j].removeAttribute("active");
        }
    }
    function _pointIsInRect(x, y, rect) {
        return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom;
    }
    var DOC_MOUSEUP_LISTENER = null;
    var DOC_TOUCHEND_LISTENER = null;
    xtag.register("x-calendar", {
        lifecycle: {
            created: function() {
                this.innerHTML = "";
                var chosenRange = this.getAttribute("chosen");
                this.xtag.calObj = new Calendar({
                    span: this.getAttribute("span"),
                    view: parseSingleDate(this.getAttribute("view")),
                    chosen: parseMultiDates(chosenRange),
                    multiple: this.hasAttribute("multiple"),
                    firstWeekdayNum: this.getAttribute("first-weekday-num")
                });
                appendChild(this, this.xtag.calObj.el);
                this.xtag.calControls = null;
                this.xtag.dragType = null;
                this.xtag.dragStartEl = null;
                this.xtag.dragAllowTap = false;
            },
            inserted: function() {
                if (!DOC_MOUSEUP_LISTENER) {
                    DOC_MOUSEUP_LISTENER = xtag.addEvent(document, "mouseup", _onDragEnd);
                }
                if (!DOC_TOUCHEND_LISTENER) {
                    DOC_TOUCHEND_LISTENER = xtag.addEvent(document, "touchend", _onDragEnd);
                }
                this.render(false);
            },
            removed: function() {
                if (xtag.query(document, "x-calendar").length === 0) {
                    if (DOC_MOUSEUP_LISTENER) {
                        xtag.removeEvent(document, "mouseup", DOC_MOUSEUP_LISTENER);
                        DOC_MOUSEUP_LISTENER = null;
                    }
                    if (DOC_TOUCHEND_LISTENER) {
                        xtag.removeEvent(document, "touchend", DOC_TOUCHEND_LISTENER);
                        DOC_TOUCHEND_LISTENER = null;
                    }
                }
            }
        },
        events: {
            "tap:delegate(.next)": function(e) {
                var xCalendar = e.currentTarget;
                xCalendar.nextMonth();
                xtag.fireEvent(xCalendar, "nextmonth");
            },
            "tap:delegate(.prev)": function(e) {
                var xCalendar = e.currentTarget;
                xCalendar.prevMonth();
                xtag.fireEvent(xCalendar, "prevmonth");
            },
            "tapstart:delegate(.day)": function(e) {
                if (!e.touches && e.button && e.button !== LEFT_MOUSE_BTN) {
                    return;
                }
                e.preventDefault();
                if (e.baseEvent) e.baseEvent.preventDefault();
                _onDragStart(e.currentTarget, this);
            },
            touchmove: function(e) {
                if (!(e.touches && e.touches.length > 0)) {
                    return;
                }
                var xCalendar = e.currentTarget;
                if (!xCalendar.xtag.dragType) {
                    return;
                }
                var touch = e.touches[0];
                var days = xtag.query(xCalendar, ".day");
                for (var i = 0; i < days.length; i++) {
                    var day = days[i];
                    if (_pointIsInRect(touch.pageX, touch.pageY, getRect(day))) {
                        _onDragMove(xCalendar, day);
                    } else {
                        day.removeAttribute("active");
                    }
                }
            },
            "mouseover:delegate(.day)": function(e) {
                var xCalendar = e.currentTarget;
                var day = this;
                _onDragMove(xCalendar, day);
            },
            "mouseout:delegate(.day)": function(e) {
                var day = this;
                day.removeAttribute("active");
            },
            "tapend:delegate(.day)": function(e) {
                var xCalendar = e.currentTarget;
                if (!xCalendar.xtag.dragAllowTap) {
                    return;
                }
                var day = this;
                var isoDate = day.getAttribute("data-date");
                var dateObj = parseSingleDate(isoDate);
                xtag.fireEvent(xCalendar, "datetap", {
                    detail: {
                        date: dateObj,
                        iso: isoDate
                    }
                });
            },
            datetoggleon: function(e) {
                var xCalendar = this;
                xCalendar.toggleDateOn(e.detail.date, xCalendar.multiple);
            },
            datetoggleoff: function(e) {
                var xCalendar = this;
                xCalendar.toggleDateOff(e.detail.date);
            }
        },
        accessors: {
            controls: {
                attribute: {
                    "boolean": true
                },
                set: function(hasControls) {
                    if (hasControls && !this.xtag.calControls) {
                        this.xtag.calControls = makeControls(this.xtag.calObj.labels);
                        appendChild(this, this.xtag.calControls);
                    }
                }
            },
            multiple: {
                attribute: {
                    "boolean": true
                },
                get: function() {
                    return this.xtag.calObj.multiple;
                },
                set: function(multi) {
                    this.xtag.calObj.multiple = multi;
                    this.chosen = this.chosen;
                }
            },
            span: {
                attribute: {},
                get: function() {
                    return this.xtag.calObj.span;
                },
                set: function(newCalSpan) {
                    this.xtag.calObj.span = newCalSpan;
                }
            },
            view: {
                attribute: {},
                get: function() {
                    return this.xtag.calObj.view;
                },
                set: function(newView) {
                    var parsedDate = parseSingleDate(newView);
                    if (parsedDate) {
                        this.xtag.calObj.view = parsedDate;
                    }
                }
            },
            chosen: {
                attribute: {
                    skip: true
                },
                get: function() {
                    var chosenRanges = this.xtag.calObj.chosen;
                    if (!this.multiple) {
                        if (chosenRanges.length > 0) {
                            var firstRange = chosenRanges[0];
                            if (isValidDateObj(firstRange)) {
                                return firstRange;
                            } else {
                                return firstRange[0];
                            }
                        } else {
                            return null;
                        }
                    } else {
                        return this.xtag.calObj.chosen;
                    }
                },
                set: function(newDates) {
                    var parsedDateRanges = this.multiple ? parseMultiDates(newDates) : parseSingleDate(newDates);
                    if (parsedDateRanges) {
                        this.xtag.calObj.chosen = parsedDateRanges;
                    } else {
                        this.xtag.calObj.chosen = null;
                    }
                    if (this.xtag.calObj.chosenString) {
                        this.setAttribute("chosen", this.xtag.calObj.chosenString);
                    } else {
                        this.removeAttribute("chosen");
                    }
                }
            },
            firstWeekdayNum: {
                attribute: {
                    name: "first-weekday-num"
                },
                set: function(weekdayNum) {
                    this.xtag.calObj.firstWeekdayNum = weekdayNum;
                }
            },
            noToggle: {
                attribute: {
                    "boolean": true,
                    name: "notoggle"
                },
                set: function(toggleDisabled) {
                    if (toggleDisabled) {
                        this.chosen = null;
                    }
                }
            },
            firstVisibleMonth: {
                get: function() {
                    return this.xtag.calObj.firstVisibleMonth;
                }
            },
            lastVisibleMonth: {
                get: function() {
                    return this.xtag.calObj.lastVisibleMonth;
                }
            },
            firstVisibleDate: {
                get: function() {
                    return this.xtag.calObj.firstVisibleDate;
                }
            },
            lastVisibleDate: {
                get: function() {
                    return this.xtag.calObj.lastVisibleDate;
                }
            },
            customRenderFn: {
                get: function() {
                    return this.xtag.calObj.customRenderFn;
                },
                set: function(newRenderFn) {
                    this.xtag.calObj.customRenderFn = newRenderFn;
                }
            },
            labels: {
                get: function() {
                    return JSON.parse(JSON.stringify(this.xtag.calObj.labels));
                },
                set: function(newLabelData) {
                    this.xtag.calObj.labels = newLabelData;
                    var labels = this.xtag.calObj.labels;
                    var prevControl = this.querySelector(".controls > .prev");
                    if (prevControl) prevControl.textContent = labels.prev;
                    var nextControl = this.querySelector(".controls > .next");
                    if (nextControl) nextControl.textContent = labels.next;
                }
            }
        },
        methods: {
            render: function(preserveNodes) {
                this.xtag.calObj.render(preserveNodes);
            },
            prevMonth: function() {
                var calObj = this.xtag.calObj;
                calObj.view = prevMonth(calObj.view);
            },
            nextMonth: function() {
                var calObj = this.xtag.calObj;
                calObj.view = nextMonth(calObj.view);
            },
            toggleDateOn: function(newDateObj, append) {
                this.xtag.calObj.addDate(newDateObj, append);
                this.chosen = this.chosen;
            },
            toggleDateOff: function(dateObj) {
                this.xtag.calObj.removeDate(dateObj);
                this.chosen = this.chosen;
            },
            toggleDate: function(dateObj, appendIfAdd) {
                if (this.xtag.calObj.hasChosenDate(dateObj)) {
                    this.toggleDateOff(dateObj);
                } else {
                    this.toggleDateOn(dateObj, appendIfAdd);
                }
            },
            hasVisibleDate: function(dateObj, excludeBadMonths) {
                return this.xtag.calObj.hasVisibleDate(dateObj, excludeBadMonths);
            }
        }
    });
})();

(function() {
    var BEFORE_ANIM_ATTR = "_before-animation";
    function HistoryStack(validatorFn, itemCap) {
        this._historyStack = [];
        this.currIndex = -1;
        this._itemCap = undefined;
        this.itemCap = itemCap;
        this._validatorFn = validatorFn ? validatorFn : function(x) {
            return true;
        };
    }
    var HISTORYSTACK_PROTOTYPE = HistoryStack.prototype;
    HISTORYSTACK_PROTOTYPE.pushState = function(newState) {
        if (this.canRedo) {
            this._historyStack.splice(this.currIndex + 1, this._historyStack.length - (this.currIndex + 1));
        }
        this._historyStack.push(newState);
        this.currIndex = this._historyStack.length - 1;
        this.sanitizeStack();
        if (this._itemCap !== "none" && this._historyStack.length > this._itemCap) {
            var len = this._historyStack.length;
            this._historyStack.splice(0, len - this._itemCap);
            this.currIndex = this._historyStack.length - 1;
        }
    };
    HISTORYSTACK_PROTOTYPE.sanitizeStack = function() {
        var validatorFn = this._validatorFn;
        var lastValidState;
        var i = 0;
        while (i < this._historyStack.length) {
            var state = this._historyStack[i];
            if (state !== lastValidState && validatorFn(state)) {
                lastValidState = state;
                i++;
            } else {
                this._historyStack.splice(i, 1);
                if (i <= this.currIndex) {
                    this.currIndex--;
                }
            }
        }
    };
    HISTORYSTACK_PROTOTYPE.forwards = function() {
        if (this.canRedo) {
            this.currIndex++;
        }
        this.sanitizeStack();
    };
    HISTORYSTACK_PROTOTYPE.backwards = function() {
        if (this.canUndo) {
            this.currIndex--;
        }
        this.sanitizeStack();
    };
    Object.defineProperties(HISTORYSTACK_PROTOTYPE, {
        DEFAULT_CAP: {
            value: 10
        },
        itemCap: {
            get: function() {
                return this._itemCap;
            },
            set: function(newCap) {
                if (newCap === undefined) {
                    this._itemCap = this.DEFAULT_CAP;
                } else if (newCap === "none") {
                    this._itemCap = "none";
                } else {
                    var num = parseInt(newCap, 10);
                    if (isNaN(newCap) || newCap <= 0) {
                        throw "attempted to set invalid item cap: " + newCap;
                    }
                    this._itemCap = num;
                }
            }
        },
        canUndo: {
            get: function() {
                return this.currIndex > 0;
            }
        },
        canRedo: {
            get: function() {
                return this.currIndex < this._historyStack.length - 1;
            }
        },
        numStates: {
            get: function() {
                return this._historyStack.length;
            }
        },
        currState: {
            get: function() {
                var index = this.currIndex;
                if (0 <= index && index < this._historyStack.length) {
                    return this._historyStack[index];
                }
                return null;
            }
        }
    });
    function getDurationStr(elem) {
        var style = window.getComputedStyle(elem);
        var browserDurationName = xtag.prefix.js + "TransitionDuration";
        if (style.transitionDuration) {
            return style.transitionDuration;
        } else {
            return style[browserDurationName];
        }
    }
    function durationStrToMs(str) {
        if (typeof str !== typeof "") {
            return 0;
        }
        var reg = /^(\d*\.?\d+)(m?s)$/;
        var matchInfo = str.toLowerCase().match(reg);
        if (matchInfo) {
            var strVal = matchInfo[1];
            var unit = matchInfo[2];
            var val = parseFloat(strVal);
            if (isNaN(val)) {
                throw "value error";
            }
            if (unit === "s") {
                return val * 1e3;
            } else if (unit === "ms") {
                return val;
            } else {
                throw "unit error";
            }
        } else {
            return 0;
        }
    }
    function posModulo(x, divisor) {
        return (x % divisor + divisor) % divisor;
    }
    function _getAllCards(elem) {
        return xtag.queryChildren(elem, "x-card");
    }
    function _getCardAt(deck, targetIndex) {
        var cards = _getAllCards(deck);
        return isNaN(parseInt(targetIndex, 10)) || targetIndex < 0 || targetIndex >= cards.length ? null : cards[targetIndex];
    }
    function _getCardIndex(deck, card) {
        var allCards = _getAllCards(deck);
        return allCards.indexOf(card);
    }
    function _animateCardReplacement(deck, oldCard, newCard, cardAnimName, isReverse) {
        deck.xtag._selectedCard = newCard;
        var animTimeStamp = new Date();
        deck.xtag._lastAnimTimestamp = animTimeStamp;
        var _onComplete = function() {
            if (animTimeStamp === deck.xtag._lastAnimTimestamp) {
                _sanitizeCardAttrs(deck);
                xtag.fireEvent(deck, "shuffleend", {
                    detail: {
                        oldCard: oldCard,
                        newCard: newCard
                    }
                });
            }
        };
        if (newCard === oldCard) {
            _onComplete();
            return;
        }
        var oldCardAnimReady = false;
        var newCardAnimReady = false;
        var animationStarted = false;
        var _attemptBeforeCallback = function() {
            if (oldCardAnimReady && newCardAnimReady) {
                _getAllCards(deck).forEach(function(card) {
                    card.removeAttribute("selected");
                    card.removeAttribute("leaving");
                });
                oldCard.setAttribute("leaving", true);
                newCard.setAttribute("selected", true);
                deck.xtag._selectedCard = newCard;
                deck.selectedIndex = _getCardIndex(deck, newCard);
                if (isReverse) {
                    oldCard.setAttribute("reverse", true);
                    newCard.setAttribute("reverse", true);
                }
                xtag.fireEvent(deck, "shufflestart", {
                    detail: {
                        oldCard: oldCard,
                        newCard: newCard
                    }
                });
            }
        };
        var _attemptAnimation = function() {
            if (animationStarted) {
                return;
            }
            if (!(oldCardAnimReady && newCardAnimReady)) {
                return;
            }
            _doAnimation();
        };
        var _doAnimation = function() {
            animationStarted = true;
            var oldCardDone = false;
            var newCardDone = false;
            var animationComplete = false;
            var onTransitionComplete = function(e) {
                if (animationComplete) {
                    return;
                }
                if (e.target === oldCard) {
                    oldCardDone = true;
                    oldCard.removeEventListener("transitionend", onTransitionComplete);
                } else if (e.target === newCard) {
                    newCardDone = true;
                    newCard.removeEventListener("transitionend", onTransitionComplete);
                }
                if (oldCardDone && newCardDone) {
                    animationComplete = true;
                    _onComplete();
                }
            };
            oldCard.addEventListener("transitionend", onTransitionComplete);
            newCard.addEventListener("transitionend", onTransitionComplete);
            var oldDuration = durationStrToMs(getDurationStr(oldCard));
            var newDuration = durationStrToMs(getDurationStr(newCard));
            var maxDuration = Math.max(oldDuration, newDuration);
            var waitMultiplier = 1.15;
            var timeoutDuration = cardAnimName.toLowerCase() === "none" ? 0 : Math.ceil(maxDuration * waitMultiplier);
            if (timeoutDuration === 0) {
                animationComplete = true;
                oldCard.removeEventListener("transitionend", onTransitionComplete);
                newCard.removeEventListener("transitionend", onTransitionComplete);
                oldCard.removeAttribute(BEFORE_ANIM_ATTR);
                newCard.removeAttribute(BEFORE_ANIM_ATTR);
                _onComplete();
            } else {
                oldCard.removeAttribute(BEFORE_ANIM_ATTR);
                newCard.removeAttribute(BEFORE_ANIM_ATTR);
                window.setTimeout(function() {
                    if (animationComplete) {
                        return;
                    }
                    animationComplete = true;
                    oldCard.removeEventListener("transitionend", onTransitionComplete);
                    newCard.removeEventListener("transitionend", onTransitionComplete);
                    _onComplete();
                }, timeoutDuration);
            }
        };
        xtag.skipTransition(oldCard, function() {
            oldCard.setAttribute("card-anim-type", cardAnimName);
            oldCard.setAttribute(BEFORE_ANIM_ATTR, true);
            oldCardAnimReady = true;
            _attemptBeforeCallback();
            return _attemptAnimation;
        }, this);
        xtag.skipTransition(newCard, function() {
            newCard.setAttribute("card-anim-type", cardAnimName);
            newCard.setAttribute(BEFORE_ANIM_ATTR, true);
            newCardAnimReady = true;
            _attemptBeforeCallback();
            return _attemptAnimation;
        }, this);
    }
    function _replaceCurrCard(deck, newCard, transitionType, progressType, ignoreHistory) {
        var oldCard = deck.xtag._selectedCard;
        if (oldCard === newCard) {
            var eDetail = {
                detail: {
                    oldCard: oldCard,
                    newCard: newCard
                }
            };
            xtag.fireEvent(deck, "shufflestart", eDetail);
            xtag.fireEvent(deck, "shuffleend", eDetail);
            return;
        }
        _sanitizeCardAttrs(deck);
        if (transitionType === undefined) {
            console.log("defaulting to none transition");
            transitionType = "none";
        }
        var isReverse;
        switch (progressType) {
          case "forward":
            isReverse = false;
            break;

          case "reverse":
            isReverse = true;
            break;

          default:
            if (!oldCard) {
                isReverse = false;
            }
            var allCards = _getAllCards(deck);
            if (allCards.indexOf(newCard) < allCards.indexOf(oldCard)) {
                isReverse = true;
            } else {
                isReverse = false;
            }
            break;
        }
        if (newCard.hasAttribute("transition-override")) {
            transitionType = newCard.getAttribute("transition-override");
        }
        if (!ignoreHistory) {
            deck.xtag.history.pushState(newCard);
        }
        _animateCardReplacement(deck, oldCard, newCard, transitionType, isReverse);
    }
    function _replaceWithIndex(deck, targetIndex, transitionType, progressType) {
        var newCard = _getCardAt(deck, targetIndex);
        if (!newCard) {
            throw "no card at index " + targetIndex;
        }
        _replaceCurrCard(deck, newCard, transitionType, progressType);
    }
    function _sanitizeCardAttrs(deck) {
        if (!deck.xtag._initialized) return;
        var cards = _getAllCards(deck);
        var currCard = deck.xtag._selectedCard;
        if (!currCard || currCard.parentNode !== deck) {
            if (cards.length > 0) {
                if (deck.xtag.history && deck.xtag.history.numStates > 0) {
                    currCard = deck.xtag.history.currState;
                } else {
                    currCard = cards[0];
                }
            } else {
                currCard = null;
            }
        }
        cards.forEach(function(card) {
            card.removeAttribute("leaving");
            card.removeAttribute(BEFORE_ANIM_ATTR);
            card.removeAttribute("card-anim-type");
            card.removeAttribute("reverse");
            if (card !== currCard) {
                card.removeAttribute("selected");
            } else {
                card.setAttribute("selected", true);
            }
        });
        deck.xtag._selectedCard = currCard;
        deck.selectedIndex = _getCardIndex(deck, currCard);
    }
    xtag.register("x-deck", {
        lifecycle: {
            created: function() {
                var self = this;
                self.xtag._initialized = true;
                var _historyValidator = function(card) {
                    return card.parentNode === self;
                };
                self.xtag.history = new HistoryStack(_historyValidator, HistoryStack.DEFAULT_CAP);
                self.xtag._selectedCard = self.xtag._selectedCard ? self.xtag._selectedCard : null;
                self.xtag._lastAnimTimestamp = null;
                self.xtag.transitionType = "scrollLeft";
                var initCard = self.getCardAt(self.getAttribute("selected-index"));
                if (initCard) {
                    self.xtag._selectedCard = initCard;
                }
                _sanitizeCardAttrs(self);
                var currCard = self.xtag._selectedCard;
                if (currCard) {
                    self.xtag.history.pushState(currCard);
                }
            }
        },
        events: {
            "show:delegate(x-card)": function(e) {
                var card = this;
                card.show();
            }
        },
        accessors: {
            transitionType: {
                attribute: {
                    name: "transition-type"
                },
                get: function() {
                    return this.xtag.transitionType;
                },
                set: function(newType) {
                    this.xtag.transitionType = newType;
                }
            },
            selectedIndex: {
                attribute: {
                    skip: true,
                    name: "selected-index"
                },
                get: function() {
                    return _getCardIndex(this, this.xtag._selectedCard);
                },
                set: function(newIndex) {
                    if (this.selectedIndex !== newIndex) {
                        _replaceWithIndex(this, newIndex, "none");
                    }
                    this.setAttribute("selected-index", newIndex);
                }
            },
            historyCap: {
                attribute: {
                    name: "history-cap"
                },
                get: function() {
                    return this.xtag.history.itemCap;
                },
                set: function(itemCap) {
                    this.xtag.history.itemCap = itemCap;
                }
            },
            numCards: {
                get: function() {
                    return this.getAllCards().length;
                }
            },
            currHistorySize: {
                get: function() {
                    return this.xtag.history.numStates;
                }
            },
            currHistoryIndex: {
                get: function() {
                    return this.xtag.history.currIndex;
                }
            },
            cards: {
                get: function() {
                    return this.getAllCards();
                }
            },
            selectedCard: {
                get: function() {
                    return this.getSelectedCard();
                }
            }
        },
        methods: {
            shuffleTo: function(index, progressType) {
                var targetCard = _getCardAt(this, index);
                if (!targetCard) {
                    throw "invalid shuffleTo index " + index;
                }
                var transitionType = this.xtag.transitionType;
                _replaceWithIndex(this, index, transitionType, progressType);
            },
            shuffleNext: function(progressType) {
                progressType = progressType ? progressType : "auto";
                var cards = _getAllCards(this);
                var currCard = this.xtag._selectedCard;
                var currIndex = cards.indexOf(currCard);
                if (currIndex > -1) {
                    this.shuffleTo(posModulo(currIndex + 1, cards.length), progressType);
                }
            },
            shufflePrev: function(progressType) {
                progressType = progressType ? progressType : "auto";
                var cards = _getAllCards(this);
                var currCard = this.xtag._selectedCard;
                var currIndex = cards.indexOf(currCard);
                if (currIndex > -1) {
                    this.shuffleTo(posModulo(currIndex - 1, cards.length), progressType);
                }
            },
            getAllCards: function() {
                return _getAllCards(this);
            },
            getSelectedCard: function() {
                return this.xtag._selectedCard;
            },
            getCardIndex: function(card) {
                return _getCardIndex(this, card);
            },
            getCardAt: function(index) {
                return _getCardAt(this, index);
            },
            historyBack: function(progressType) {
                var history = this.xtag.history;
                var deck = this;
                if (history.canUndo) {
                    history.backwards();
                    var newCard = history.currState;
                    if (newCard) {
                        _replaceCurrCard(this, newCard, this.transitionType, progressType, true);
                    }
                }
            },
            historyForward: function(progressType) {
                var history = this.xtag.history;
                var deck = this;
                if (history.canRedo) {
                    history.forwards();
                    var newCard = history.currState;
                    if (newCard) {
                        _replaceCurrCard(this, newCard, this.transitionType, progressType, true);
                    }
                }
            }
        }
    });
    xtag.register("x-card", {
        lifecycle: {
            inserted: function() {
                var self = this;
                var deckContainer = self.parentNode;
                if (deckContainer) {
                    if (deckContainer.tagName.toLowerCase() === "x-deck") {
                        _sanitizeCardAttrs(deckContainer);
                        self.xtag.parentDeck = deckContainer;
                        xtag.fireEvent(deckContainer, "cardadd", {
                            detail: {
                                card: self
                            }
                        });
                    }
                }
            },
            created: function() {
                var deckContainer = this.parentNode;
                if (deckContainer && deckContainer.tagName.toLowerCase() === "x-deck") {
                    this.xtag.parentDeck = deckContainer;
                }
            },
            removed: function() {
                var self = this;
                if (!self.xtag.parentDeck) {
                    return;
                }
                var deck = self.xtag.parentDeck;
                deck.xtag.history.sanitizeStack();
                _sanitizeCardAttrs(deck);
                xtag.fireEvent(deck, "cardremove", {
                    detail: {
                        card: self
                    }
                });
            }
        },
        accessors: {
            transitionOverride: {
                attribute: {
                    name: "transition-override"
                }
            }
        },
        methods: {
            show: function() {
                var deck = this.parentNode;
                if (deck === this.xtag.parentDeck) {
                    deck.shuffleTo(deck.getCardIndex(this));
                }
            }
        }
    });
})();

(function() {
    xtag.register("x-flipbox", {
        lifecycle: {
            created: function() {
                if (this.firstElementChild) {
                    xtag.skipTransition(this.firstElementChild, function() {});
                }
                if (this.lastElementChild) {
                    xtag.skipTransition(this.lastElementChild, function() {});
                }
                if (!this.hasAttribute("direction")) {
                    this.xtag._direction = "right";
                }
            }
        },
        events: {
            "transitionend:delegate(*:first-child)": function(e) {
                var frontCard = e.target;
                var flipBox = frontCard.parentNode;
                if (flipBox.nodeName.toLowerCase() === "x-flipbox") {
                    xtag.fireEvent(flipBox, "flipend");
                }
            },
            "show:delegate(*:first-child)": function(e) {
                var frontCard = e.target;
                var flipBox = frontCard.parentNode;
                if (flipBox.nodeName.toLowerCase() === "x-flipbox") {
                    flipBox.flipped = false;
                }
            },
            "show:delegate(*:last-child)": function(e) {
                var backCard = e.target;
                var flipBox = backCard.parentNode;
                if (flipBox.nodeName.toLowerCase() === "x-flipbox") {
                    flipBox.flipped = true;
                }
            }
        },
        accessors: {
            direction: {
                attribute: {},
                get: function() {
                    return this.xtag._direction;
                },
                set: function(value) {
                    xtag.skipTransition(this.firstElementChild, function() {
                        this.setAttribute("_anim-direction", value);
                    }, this);
                    xtag.skipTransition(this.lastElementChild, function() {
                        this.setAttribute("_anim-direction", value);
                    }, this);
                    this.xtag._direction = value;
                }
            },
            flipped: {
                attribute: {
                    "boolean": true
                }
            }
        },
        methods: {
            toggle: function() {
                this.flipped = !this.flipped;
            },
            showFront: function() {
                this.flipped = false;
            },
            showBack: function() {
                this.flipped = true;
            }
        }
    });
})();

(function() {
    function getLayoutElements(layout) {
        var first = layout.firstElementChild;
        if (!first) return {
            header: null,
            section: null,
            footer: null
        };
        var second = first.nextElementSibling;
        return {
            header: first.nodeName == "HEADER" ? first : null,
            section: first.nodeName == "SECTION" ? first : second && second.nodeName == "SECTION" ? second : null,
            footer: layout.lastElementChild.nodeName == "FOOTER" ? layout.lastElementChild : null
        };
    }
    function getLayoutScroll(layout, element) {
        var scroll = element.__layoutScroll__ = element.__layoutScroll__ || Object.defineProperty(element, "__layoutScroll__", {
            value: {
                last: element.scrollTop
            }
        }).__layoutScroll__;
        var now = element.scrollTop, buffer = layout.scrollBuffer;
        scroll.max = scroll.max || Math.max(now + buffer, buffer);
        scroll.min = scroll.min || Math.max(now - buffer, buffer);
        return scroll;
    }
    function maxContent(layout, elements) {
        layout.setAttribute("content-maximizing", null);
        if (elements.section) {
            if (elements.header) elements.section.style.marginTop = "-" + elements.header.getBoundingClientRect().height + "px";
            if (elements.footer) elements.section.style.marginBottom = "-" + elements.footer.getBoundingClientRect().height + "px";
        }
    }
    function minContent(layout, elements) {
        layout.removeAttribute("content-maximized");
        layout.removeAttribute("content-maximizing");
        if (elements.section) {
            elements.section.style.marginTop = "";
            elements.section.style.marginBottom = "";
        }
    }
    function evaluateScroll(event) {
        if (!event.currentTarget.hasAttribute("content-maximizing")) {
            var target = event.target, layout = event.currentTarget;
            if (this.scrollhide && (target.parentNode == layout || xtag.matchSelector(target, layout.scrollTarget))) {
                var now = target.scrollTop, buffer = layout.scrollBuffer, elements = getLayoutElements(layout), scroll = getLayoutScroll(layout, target);
                if (now > scroll.last) scroll.min = Math.max(now - buffer, buffer); else if (now < scroll.last) scroll.max = Math.max(now + buffer, buffer);
                if (!layout.maxcontent) {
                    if (now > scroll.max && !layout.hasAttribute("content-maximized")) maxContent(layout, elements); else if (now < scroll.min) minContent(layout, elements);
                }
                scroll.last = now;
            }
        }
    }
    xtag.register("x-layout", {
        lifecycle: {
            created: function() {}
        },
        events: {
            scroll: evaluateScroll,
            transitionend: function(e) {
                var elements = getLayoutElements(this);
                if (this.hasAttribute("content-maximizing") && (e.target == elements.header || e.target == elements.section || e.target == elements.footer)) {
                    this.setAttribute("content-maximized", null);
                    this.removeAttribute("content-maximizing");
                }
            },
            "tap:delegate(section)": function(e) {
                var layout = e.currentTarget;
                if (layout.taphide && this.parentNode == layout) {
                    var elements = getLayoutElements(layout);
                    if (layout.hasAttribute("content-maximizing") || layout.hasAttribute("content-maximized")) {
                        if (!layout.maxcontent) minContent(layout, elements);
                    } else maxContent(layout, elements);
                }
            },
            "mouseover:delegate(section)": function(e) {
                var layout = e.currentTarget;
                if (layout.hoverhide && this.parentNode == layout && !layout.hasAttribute("content-maximized") && !layout.hasAttribute("content-maximizing") && (!e.relatedTarget || this.contains(e.target))) {
                    maxContent(layout, getLayoutElements(layout));
                }
            },
            "mouseout:delegate(section)": function(e) {
                var layout = e.currentTarget;
                if (layout.hoverhide && this.parentNode == layout && (layout.hasAttribute("content-maximized") || layout.hasAttribute("content-maximizing")) && (layout == e.relatedTarget || !layout.contains(e.relatedTarget))) {
                    minContent(layout, getLayoutElements(layout));
                }
            }
        },
        accessors: {
            scrollTarget: {
                attribute: {
                    name: "scroll-target"
                }
            },
            scrollBuffer: {
                attribute: {
                    name: "scroll-buffer"
                },
                get: function() {
                    return Number(this.getAttribute("scroll-buffer")) || 30;
                }
            },
            taphide: {
                attribute: {
                    "boolean": true
                }
            },
            hoverhide: {
                attribute: {
                    "boolean": true
                }
            },
            scrollhide: {
                attribute: {
                    "boolean": true
                }
            },
            maxcontent: {
                attribute: {
                    "boolean": true
                },
                set: function(value) {
                    var elements = getLayoutElements(this);
                    if (value) maxContent(this, elements); else if (!this.hasAttribute("content-maximizing")) minContent(this, elements);
                }
            }
        }
    });
})();

(function() {
    var transform = xtag.prefix.js + "Transform";
    function getState(el) {
        var selected = xtag.query(el, "x-slides > x-slide[selected]")[0] || 0;
        return [ selected ? xtag.query(el, "x-slides > x-slide").indexOf(selected) : selected, el.firstElementChild.children.length - 1 ];
    }
    function slide(el, index) {
        var slides = xtag.toArray(el.firstElementChild.children);
        slides.forEach(function(slide) {
            slide.removeAttribute("selected");
        });
        slides[index || 0].setAttribute("selected", true);
        var translate = "translate" + (el.getAttribute("orientation") || "x") + "(" + (index || 0) * (-100 / slides.length) + "%)";
        el.firstElementChild.style[transform] = translate;
        el.firstElementChild.style.transform = translate;
    }
    function init(toSelected) {
        var slides = this.firstElementChild;
        if (!slides || !slides.children.length || slides.tagName.toLowerCase() != "x-slides") return;
        var children = xtag.toArray(slides.children), size = 100 / (children.length || 1), orient = this.getAttribute("orientation") || "x", style = orient == "x" ? [ "width", "height" ] : [ "height", "width" ];
        slides.style[style[1]] = "100%";
        slides.style[style[0]] = children.length * 100 + "%";
        slides.style[transform] = "translate" + orient + "(0%)";
        slides.style.transform = "translate" + orient + "(0%)";
        children.forEach(function(slide) {
            slide.style[style[0]] = size + "%";
            slide.style[style[1]] = "100%";
        });
        if (toSelected) {
            var selected = slides.querySelector("[selected]");
            if (selected) slide(this, children.indexOf(selected) || 0);
        }
    }
    xtag.register("x-slidebox", {
        lifecycle: {
            created: function() {
                init();
            }
        },
        events: {
            transitionend: function(e) {
                if (e.target == this.firstElementChild) {
                    xtag.fireEvent(this, "slideend");
                }
            },
            "show:delegate(x-slide)": function(e) {
                var slide = e.target;
                if (slide.parentNode.nodeName.toLowerCase() === "x-slides" && slide.parentNode.parentNode.nodeName.toLowerCase() === "x-slidebox") {
                    var slideWrap = slide.parentNode;
                    var box = slideWrap.parentNode;
                    var slides = xtag.query(slideWrap, "x-slide");
                    box.slideTo(slides.indexOf(slide));
                }
            }
        },
        accessors: {
            orientation: {
                get: function() {
                    return this.getAttribute("orientation");
                },
                set: function(value) {
                    var slidebox = this;
                    xtag.skipTransition(slidebox.firstElementChild, function() {
                        slidebox.setAttribute("orientation", value.toLowerCase());
                        init.call(slidebox, true);
                    });
                }
            }
        },
        methods: {
            slideTo: function(index) {
                slide(this, index);
            },
            slideNext: function() {
                var shift = getState(this);
                shift[0]++;
                slide(this, shift[0] > shift[1] ? 0 : shift[0]);
            },
            slidePrevious: function() {
                var shift = getState(this);
                shift[0]--;
                slide(this, shift[0] < 0 ? shift[1] : shift[0]);
            }
        }
    });
    xtag.register("x-slide", {
        lifecycle: {
            inserted: function() {
                var ancestor = this.parentNode.parentNode;
                if (ancestor.tagName.toLowerCase() == "x-slidebox") init.call(ancestor, true);
            },
            created: function(e) {
                if (this.parentNode) {
                    var ancestor = this.parentNode.parentNode;
                    if (ancestor.tagName.toLowerCase() == "x-slidebox") init.call(ancestor, true);
                }
            }
        }
    });
})();

(function() {
    var KEYCODES = {
        33: "PAGE_UP",
        34: "PAGE_DOWN",
        35: "END",
        36: "HOME",
        37: "LEFT_ARROW",
        38: "UP_ARROW",
        39: "RIGHT_ARROW",
        40: "DOWN_ARROW"
    };
    var LEFT_MOUSE_BTN = 0;
    function isNum(num) {
        return !isNaN(parseFloat(num));
    }
    function hasNumAttr(elem, attrName) {
        return elem.hasAttribute(attrName) && isNum(elem.getAttribute(attrName));
    }
    function roundToStep(rawRangeVal, step, rangeMin, roundFn) {
        roundFn = roundFn ? roundFn : Math.round;
        rangeMin = isNum(rangeMin) ? rangeMin : 0;
        if (!isNum(rawRangeVal)) {
            throw "invalid value " + rawRangeVal;
        }
        if (!isNum(step) || +step <= 0) {
            throw "invalid step " + step;
        }
        return roundFn((rawRangeVal - rangeMin) / step) * step + rangeMin;
    }
    function constrainToSteppedRange(value, min, max, step) {
        if (value < min) {
            return min;
        } else if (value > max) {
            return Math.max(min, roundToStep(max, step, min, Math.floor));
        } else {
            return value;
        }
    }
    function getDefaultVal(min, max, step) {
        var roundedVal = roundToStep((max - min) / 2 + min, step, min);
        return constrainToSteppedRange(roundedVal, min, max, step);
    }
    function _rawValToFraction(slider, value) {
        var min = slider.min;
        var max = slider.max;
        return (value - min) / (max - min);
    }
    function _fractionToRawVal(slider, fraction) {
        var min = slider.min;
        var max = slider.max;
        return (max - min) * fraction + min;
    }
    function _fractionToCorrectedVal(slider, sliderFraction) {
        sliderFraction = Math.min(Math.max(0, sliderFraction), 1);
        var rawVal = _fractionToRawVal(slider, sliderFraction);
        var roundedVal = roundToStep(rawVal, slider.step, slider.min);
        return constrainToSteppedRange(roundedVal, slider.min, slider.max, slider.step);
    }
    function _positionThumb(slider, value) {
        var thumb = slider.xtag.polyFillSliderThumb;
        if (!thumb) {
            return;
        }
        var sliderRect = slider.getBoundingClientRect();
        var thumbRect = thumb.getBoundingClientRect();
        var fraction = _rawValToFraction(slider, value);
        var availableWidth = Math.max(sliderRect.width - thumbRect.width, 0);
        var newThumbX = availableWidth * fraction;
        var finalPercentage = newThumbX / sliderRect.width;
        thumb.style.left = finalPercentage * 100 + "%";
    }
    function _redraw(slider) {
        _positionThumb(slider, slider.value);
    }
    function _onMouseInput(slider, pageX, pageY) {
        var inputEl = slider.xtag.rangeInputEl;
        var inputOffsets = inputEl.getBoundingClientRect();
        var inputClickX = pageX - inputOffsets.left;
        var oldValue = slider.value;
        var newValue = _fractionToCorrectedVal(slider, inputClickX / inputOffsets.width);
        slider.value = newValue;
        xtag.fireEvent(slider, "input");
        _redraw(slider);
    }
    function _onDragStart(slider, pageX, pageY) {
        slider.xtag.dragInitVal = slider.value;
        _onMouseInput(slider, pageX, pageY);
        var callbacks = slider.xtag.callbackFns;
        var _addBodyListener = function(event, listener) {
            document.body.addEventListener(event, listener);
        };
        _addBodyListener("mousemove", callbacks.onMouseDragMove);
        _addBodyListener("touchmove", callbacks.onTouchDragMove);
        _addBodyListener("mouseup", callbacks.onDragEnd);
        _addBodyListener("touchend", callbacks.onDragEnd);
        var thumb = slider.xtag.polyFillSliderThumb;
        if (thumb) {
            thumb.setAttribute("active", true);
        }
    }
    function _onDragMove(slider, pageX, pageY) {
        _onMouseInput(slider, pageX, pageY);
    }
    function _makeCallbackFns(slider) {
        return {
            onMouseDragStart: function(e) {
                if (e.button !== LEFT_MOUSE_BTN) {
                    return;
                }
                _onDragStart(slider, e.pageX, e.pageY);
                e.preventDefault();
            },
            onTouchDragStart: function(e) {
                var touches = e.targetTouches;
                if (touches.length !== 1) {
                    return;
                }
                _onDragStart(slider, touches[0].pageX, touches[0].pageY);
                e.preventDefault();
            },
            onMouseDragMove: function(e) {
                _onDragMove(slider, e.pageX, e.pageY);
                e.preventDefault();
            },
            onTouchDragMove: function(e) {
                var touches = e.targetTouches;
                if (touches.length !== 1) {
                    return;
                }
                _onDragMove(slider, touches[0].pageX, touches[0].pageY);
                e.preventDefault();
            },
            onDragEnd: function(e) {
                var callbacks = slider.xtag.callbackFns;
                var _removeBodyListener = function(event, listener) {
                    document.body.removeEventListener(event, listener);
                };
                _removeBodyListener("mousemove", callbacks.onMouseDragMove);
                _removeBodyListener("touchmove", callbacks.onTouchDragMove);
                _removeBodyListener("mouseup", callbacks.onDragEnd);
                _removeBodyListener("touchend", callbacks.onDragEnd);
                var thumb = slider.xtag.polyFillSliderThumb;
                if (thumb) {
                    thumb.removeAttribute("active");
                }
                if (slider.value !== slider.xtag.dragInitVal) {
                    xtag.fireEvent(slider, "change");
                }
                slider.xtag.dragInitVal = null;
                e.preventDefault();
            },
            onKeyDown: function(e) {
                var keyCode = e.keyCode;
                if (keyCode in KEYCODES) {
                    var oldVal = this.value;
                    var min = this.min;
                    var max = this.max;
                    var step = this.step;
                    var rangeSize = Math.max(0, max - min);
                    var largeStep = Math.max(rangeSize / 10, step);
                    switch (KEYCODES[keyCode]) {
                      case "LEFT_ARROW":
                      case "DOWN_ARROW":
                        this.value = Math.max(oldVal - step, min);
                        break;

                      case "RIGHT_ARROW":
                      case "UP_ARROW":
                        this.value = Math.min(oldVal + step, max);
                        break;

                      case "HOME":
                        this.value = min;
                        break;

                      case "END":
                        this.value = max;
                        break;

                      case "PAGE_DOWN":
                        this.value = Math.max(oldVal - largeStep, min);
                        break;

                      case "PAGE_UP":
                        this.value = Math.min(oldVal + largeStep, max);
                        break;

                      default:
                        break;
                    }
                    if (this.value !== oldVal) {
                        xtag.fireEvent(this, "change");
                    }
                    e.preventDefault();
                }
            }
        };
    }
    xtag.register("x-slider", {
        lifecycle: {
            created: function() {
                var self = this;
                self.xtag.callbackFns = _makeCallbackFns(self);
                self.xtag.dragInitVal = null;
                var input = document.createElement("input");
                xtag.addClass(input, "input");
                input.setAttribute("type", "range");
                var initMax = hasNumAttr(self, "max") ? +self.getAttribute("max") : 100;
                var initMin = hasNumAttr(self, "min") ? +self.getAttribute("min") : 0;
                var initStep = hasNumAttr(self, "step") ? +self.getAttribute("step") : 1;
                initStep = initStep > 0 ? initStep : 1;
                var initVal = hasNumAttr(self, "value") ? +self.getAttribute("value") : getDefaultVal(initMin, initMax, initStep);
                input.setAttribute("max", initMax);
                input.setAttribute("min", initMin);
                input.setAttribute("step", initStep);
                input.setAttribute("value", initVal);
                self.xtag.rangeInputEl = input;
                self.appendChild(self.xtag.rangeInputEl);
                self.xtag.polyFillSliderThumb = null;
                if (input.type !== "range" || self.hasAttribute("polyfill")) {
                    self.setAttribute("polyfill", true);
                } else {
                    self.removeAttribute("polyfill");
                }
                _redraw(self);
            },
            attributeChanged: function() {
                _redraw(this);
            }
        },
        events: {
            "change:delegate(input[type=range])": function(e) {
                e.stopPropagation();
                xtag.fireEvent(e.currentTarget, "change");
            },
            "input:delegate(input[type=range])": function(e) {
                e.stopPropagation();
                xtag.fireEvent(e.currentTarget, "input");
            },
            "focus:delegate(input[type=range])": function(e) {
                var slider = e.currentTarget;
                xtag.fireEvent(slider, "focus", {}, {
                    bubbles: false
                });
            },
            "blur:delegate(input[type=range])": function(e) {
                var slider = e.currentTarget;
                xtag.fireEvent(slider, "blur", {}, {
                    bubbles: false
                });
            }
        },
        accessors: {
            polyfill: {
                attribute: {
                    "boolean": true
                },
                set: function(isPolyfill) {
                    var callbackFns = this.xtag.callbackFns;
                    if (isPolyfill) {
                        this.setAttribute("tabindex", 0);
                        this.xtag.rangeInputEl.setAttribute("tabindex", -1);
                        this.xtag.rangeInputEl.setAttribute("readonly", true);
                        if (!this.xtag.polyFillSliderThumb) {
                            var sliderThumb = document.createElement("span");
                            xtag.addClass(sliderThumb, "slider-thumb");
                            this.xtag.polyFillSliderThumb = sliderThumb;
                            this.appendChild(sliderThumb);
                        }
                        _redraw(this);
                        this.addEventListener("mousedown", callbackFns.onMouseDragStart);
                        this.addEventListener("touchstart", callbackFns.onTouchDragStart);
                        this.addEventListener("keydown", callbackFns.onKeyDown);
                    } else {
                        this.removeAttribute("tabindex");
                        this.xtag.rangeInputEl.removeAttribute("tabindex");
                        this.xtag.rangeInputEl.removeAttribute("readonly");
                        this.removeEventListener("mousedown", callbackFns.onMouseDragStart);
                        this.removeEventListener("touchstart", callbackFns.onTouchDragStart);
                        this.removeEventListener("keydown", callbackFns.onKeyDown);
                    }
                }
            },
            max: {
                attribute: {
                    selector: "input[type=range]"
                },
                get: function() {
                    return +this.xtag.rangeInputEl.getAttribute("max");
                }
            },
            min: {
                attribute: {
                    selector: "input[type=range]"
                },
                get: function() {
                    return +this.xtag.rangeInputEl.getAttribute("min");
                }
            },
            step: {
                attribute: {
                    selector: "input[type=range]"
                },
                get: function() {
                    return +this.xtag.rangeInputEl.getAttribute("step");
                }
            },
            name: {
                attribute: {
                    selector: "input[type=range]"
                },
                set: function(newName) {
                    var input = this.xtag.rangeInputEl;
                    if (newName === null || newName === undefined) {
                        input.removeAttribute("name");
                    } else {
                        input.setAttribute("name", newName);
                    }
                }
            },
            value: {
                attribute: {
                    selector: "input[type=range]"
                },
                get: function() {
                    return +this.xtag.rangeInputEl.value;
                },
                set: function(rawVal) {
                    if (!isNum(rawVal)) {
                        rawVal = getDefaultVal(this.min, this.max, this.step);
                    }
                    rawVal = +rawVal;
                    var min = this.min;
                    var max = this.max;
                    var step = this.step;
                    var roundedVal = roundToStep(rawVal, step, min);
                    var finalVal = constrainToSteppedRange(roundedVal, min, max, step);
                    this.xtag.rangeInputEl.value = finalVal;
                    _redraw(this);
                }
            },
            inputElem: {
                get: function() {
                    return this.xtag.rangeInputEl;
                }
            }
        },
        methods: {}
    });
})();

(function() {
    function getWindowViewport() {
        var docElem = document.documentElement;
        var rect = {
            left: docElem.scrollLeft || document.body.scrollLeft || 0,
            top: docElem.scrollTop || document.body.scrollTop || 0,
            width: docElem.clientWidth,
            height: docElem.clientHeight
        };
        rect.right = rect.left + rect.width;
        rect.bottom = rect.top + rect.height;
        return rect;
    }
    function getRect(el) {
        var rect = el.getBoundingClientRect();
        var viewport = getWindowViewport();
        var docScrollLeft = viewport.left;
        var docScrollTop = viewport.top;
        return {
            left: rect.left + docScrollLeft,
            right: rect.right + docScrollLeft,
            top: rect.top + docScrollTop,
            bottom: rect.bottom + docScrollTop,
            width: rect.width,
            height: rect.height
        };
    }
    function _pointIsInRect(x, y, rect) {
        return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom;
    }
    xtag.register("x-tabbar", {
        lifecycle: {
            created: function() {
                this.xtag.overallEventToFire = "show";
            }
        },
        events: {
            "tap:delegate(x-tabbar-tab)": function(e) {
                var activeTab = xtag.query(this.parentNode, "x-tabbar-tab[selected]");
                if (activeTab.length) {
                    activeTab.forEach(function(t) {
                        t.removeAttribute("selected");
                    });
                }
                this.setAttribute("selected", true);
            }
        },
        accessors: {
            tabs: {
                get: function() {
                    return xtag.queryChildren(this, "x-tabbar-tab");
                }
            },
            targetEvent: {
                attribute: {
                    name: "target-event"
                },
                get: function() {
                    return this.xtag.overallEventToFire;
                },
                set: function(newEventType) {
                    this.xtag.overallEventToFire = newEventType;
                }
            }
        },
        methods: {}
    });
    function _onTabbarTabTap(tabEl) {
        if (tabEl.parentNode.nodeName.toLowerCase() === "x-tabbar") {
            var targetEvent = tabEl.targetEvent;
            var targets = tabEl.targetSelector ? xtag.query(document, tabEl.targetSelector) : tabEl.targetElems;
            targets.forEach(function(targ) {
                xtag.fireEvent(targ, targetEvent);
            });
        }
    }
    xtag.register("x-tabbar-tab", {
        lifecycle: {
            created: function() {
                this.xtag.targetSelector = null;
                this.xtag.overrideTargetElems = null;
                this.xtag.targetEvent = null;
            }
        },
        events: {
            tap: function(e) {
                var tabEl = e.currentTarget;
                if (e.changedTouches && e.changedTouches.length > 0) {
                    var releasedTouch = e.changedTouches[0];
                    var tabRect = getRect(tabEl);
                    if (_pointIsInRect(releasedTouch.pageX, releasedTouch.pageY, tabRect)) {
                        _onTabbarTabTap(tabEl);
                    }
                } else {
                    _onTabbarTabTap(tabEl);
                }
            }
        },
        accessors: {
            targetSelector: {
                attribute: {
                    name: "target-selector"
                },
                get: function() {
                    return this.xtag.targetSelector;
                },
                set: function(newTargetSelector) {
                    this.xtag.targetSelector = newTargetSelector;
                    if (newTargetSelector) {
                        this.xtag.overrideTargetElems = null;
                    }
                }
            },
            targetElems: {
                get: function() {
                    if (this.targetSelector) {
                        return xtag.query(document, this.targetSelector);
                    } else if (this.xtag.overrideTargetElems !== null) {
                        return this.xtag.overrideTargetElems;
                    } else {
                        return [];
                    }
                },
                set: function(newElems) {
                    this.removeAttribute("target-selector");
                    this.xtag.overrideTargetElems = newElems;
                }
            },
            targetEvent: {
                attribute: {
                    name: "target-event"
                },
                get: function() {
                    if (this.xtag.targetEvent) {
                        return this.xtag.targetEvent;
                    } else if (this.parentNode.nodeName.toLowerCase() === "x-tabbar") {
                        return this.parentNode.targetEvent;
                    } else {
                        throw "tabbar-tab is missing event to fire";
                    }
                },
                set: function(newEvent) {
                    this.xtag.targetEvent = newEvent;
                }
            }
        },
        methods: {}
    });
})();

(function() {
    function setScope(toggle) {
        var form = toggle.xtag.inputEl.form;
        if (form) toggle.removeAttribute("x-toggle-no-form"); else toggle.setAttribute("x-toggle-no-form", "");
        toggle.xtag.scope = toggle.parentNode ? form || document : null;
    }
    function updateScope(scope) {
        var names = {}, docSelector = scope == document ? "[x-toggle-no-form]" : "";
        xtag.query(scope, "x-toggle[name]" + docSelector).forEach(function(toggle) {
            var name = toggle.name;
            if (name && !names[name]) {
                var named = xtag.query(scope, 'x-toggle[name="' + name + '"]' + docSelector), type = named.length > 1 ? "radio" : "checkbox";
                named.forEach(function(toggle) {
                    if (toggle.xtag && toggle.xtag.inputEl) {
                        toggle.type = type;
                    }
                });
                names[name] = true;
            }
        });
    }
    var shifted = false;
    xtag.addEvents(document, {
        DOMComponentsLoaded: function() {
            updateScope(document);
            xtag.toArray(document.forms).forEach(updateScope);
        },
        WebComponentsReady: function() {
            updateScope(document);
            xtag.toArray(document.forms).forEach(updateScope);
        },
        keydown: function(e) {
            shifted = e.shiftKey;
        },
        keyup: function(e) {
            shifted = e.shiftKey;
        },
        "focus:delegate(x-toggle)": function(e) {
            this.setAttribute("focus", "");
        },
        "blur:delegate(x-toggle)": function(e) {
            this.removeAttribute("focus");
        },
        "tap:delegate(x-toggle)": function(e) {
            if (shifted && this.group) {
                var toggles = this.groupToggles, active = this.xtag.scope.querySelector('x-toggle[group="' + this.group + '"][active]');
                if (active && this != active) {
                    var self = this, state = active.checked, index = toggles.indexOf(this), activeIndex = toggles.indexOf(active), minIndex = Math.min(index, activeIndex), maxIndex = Math.max(index, activeIndex);
                    toggles.slice(minIndex, maxIndex).forEach(function(toggler) {
                        if (toggler != self) toggler.checked = state;
                    });
                }
            }
        },
        "change:delegate(x-toggle)": function(e) {
            var active = this.xtag.scope.querySelector('x-toggle[group="' + this.group + '"][active]');
            this.checked = shifted && active && this != active ? active.checked : this.xtag.inputEl.checked;
            if (this.group) {
                this.groupToggles.forEach(function(toggle) {
                    toggle.active = false;
                });
                this.active = true;
            }
        }
    });
    xtag.register("x-toggle", {
        lifecycle: {
            created: function() {
                this.innerHTML = '<label class="x-toggle-input-wrap">' + '<input type="checkbox"></input>' + "</label>" + '<div class="x-toggle-check"></div>' + '<div class="x-toggle-content"></div>';
                this.xtag.inputWrapEl = this.querySelector(".x-toggle-input-wrap");
                this.xtag.inputEl = this.xtag.inputWrapEl.querySelector("input");
                this.xtag.contentWrapEl = this.querySelector(".x-toggle-content-wrap");
                this.xtag.checkEl = this.querySelector(".x-toggle-check");
                this.xtag.contentEl = this.querySelector(".x-toggle-content");
                this.type = "checkbox";
                setScope(this);
                var name = this.getAttribute("name");
                if (name) this.xtag.inputEl.name = this.getAttribute("name");
                if (this.hasAttribute("checked")) this.checked = true;
            },
            inserted: function() {
                setScope(this);
                if (this.parentNode && this.parentNode.nodeName.toLowerCase() === "x-togglegroup") {
                    if (this.parentNode.hasAttribute("name")) {
                        this.name = this.parentNode.getAttribute("name");
                    }
                    if (this.parentNode.hasAttribute("group")) {
                        this.group = this.parentNode.getAttribute("group");
                    }
                    this.setAttribute("no-box", true);
                }
                if (this.name) updateScope(this.xtag.scope);
            },
            removed: function() {
                updateScope(this.xtag.scope);
                setScope(this);
            }
        },
        accessors: {
            noBox: {
                attribute: {
                    name: "no-box",
                    "boolean": true
                },
                set: function() {}
            },
            type: {
                attribute: {},
                set: function(newType) {
                    this.xtag.inputEl.type = newType;
                }
            },
            label: {
                attribute: {},
                get: function() {
                    return this.xtag.contentEl.innerHTML;
                },
                set: function(newLabelContent) {
                    this.xtag.contentEl.innerHTML = newLabelContent;
                }
            },
            active: {
                attribute: {
                    "boolean": true
                }
            },
            group: {
                attribute: {}
            },
            groupToggles: {
                get: function() {
                    return xtag.query(this.xtag.scope, 'x-toggle[group="' + this.group + '"]');
                }
            },
            name: {
                attribute: {
                    skip: true
                },
                get: function() {
                    return this.getAttribute("name");
                },
                set: function(name) {
                    if (name === null) {
                        this.removeAttribute("name");
                        this.type = "checkbox";
                    } else {
                        this.setAttribute("name", name);
                    }
                    this.xtag.inputEl.name = name;
                    updateScope(this.xtag.scope);
                }
            },
            checked: {
                get: function() {
                    return this.xtag.inputEl.checked;
                },
                set: function(value) {
                    var name = this.name, state = value === "true" || value === true;
                    if (name) {
                        var scopeSelector = this.xtag.scope == document ? "[x-toggle-no-form]" : "";
                        var selector = 'x-toggle[checked][name="' + name + '"]' + scopeSelector;
                        var previous = this.xtag.scope.querySelector(selector);
                        if (previous) previous.removeAttribute("checked");
                    }
                    this.xtag.inputEl.checked = state;
                    if (state) this.setAttribute("checked", ""); else this.removeAttribute("checked");
                }
            },
            value: {
                attribute: {},
                get: function() {
                    return this.xtag.inputEl.value;
                },
                set: function(newVal) {
                    this.xtag.inputEl.value = newVal;
                }
            }
        }
    });
})();

(function() {
    var TIP_ORIENT_ARROW_DIR_MAP = {
        top: "down",
        bottom: "up",
        left: "right",
        right: "left"
    };
    var OUTER_TRIGGER_MANAGER;
    var PRESET_STYLE_LISTENERFNS;
    var PREV_SIB_SELECTOR = "_previousSibling";
    var NEXT_SIB_SELECTOR = "_nextSibling";
    var ARROW_DIR_ATTR = "arrow-direction";
    var AUTO_ORIENT_ATTR = "_auto-orientation";
    function isValidOrientation(orient) {
        return orient in TIP_ORIENT_ARROW_DIR_MAP;
    }
    function getWindowViewport() {
        var docElem = document.documentElement;
        var rect = {
            left: docElem.scrollLeft || document.body.scrollLeft || 0,
            top: docElem.scrollTop || document.body.scrollTop || 0,
            width: docElem.clientWidth,
            height: docElem.clientHeight
        };
        rect.right = rect.left + rect.width;
        rect.bottom = rect.top + rect.height;
        return rect;
    }
    function getRect(el) {
        var rect = el.getBoundingClientRect();
        var viewport = getWindowViewport();
        var docScrollLeft = viewport.left;
        var docScrollTop = viewport.top;
        return {
            left: rect.left + docScrollLeft,
            right: rect.right + docScrollLeft,
            top: rect.top + docScrollTop,
            bottom: rect.bottom + docScrollTop,
            width: rect.width,
            height: rect.height
        };
    }
    function getScale(el, rect) {
        rect = rect !== undefined ? rect : getRect(el);
        return {
            x: el.offsetWidth ? rect.width / el.offsetWidth : 1,
            y: el.offsetHeight ? rect.height / el.offsetHeight : 1
        };
    }
    function getRectIntersection(rectA, rectB) {
        if (rectA.right < rectB.left || rectB.right < rectA.left || rectA.bottom < rectB.top || rectB.bottom < rectA.top) {
            return null;
        }
        var intersection = {
            left: Math.max(rectA.left, rectB.left),
            top: Math.max(rectA.top, rectB.top),
            right: Math.min(rectA.right, rectB.right),
            bottom: Math.min(rectA.bottom, rectB.bottom)
        };
        intersection.width = intersection.right - intersection.left;
        intersection.height = intersection.bottom - intersection.top;
        if (intersection.width < 0 || intersection.height < 0) {
            return null;
        }
        return intersection;
    }
    function CachedListener(elem, eventType, listenerFn) {
        this.eventType = eventType;
        this.listenerFn = listenerFn;
        this.elem = elem;
        this._attachedFn = null;
    }
    CachedListener.prototype.attachListener = function() {
        if (!this._attachedFn) {
            this._attachedFn = xtag.addEvent(this.elem, this.eventType, this.listenerFn);
        }
    };
    CachedListener.prototype.removeListener = function() {
        if (this._attachedFn) {
            xtag.removeEvent(this.elem, this.eventType, this._attachedFn);
            this._attachedFn = null;
        }
    };
    function OuterTriggerEventStruct(eventType) {
        this._cachedListener = null;
        this._tooltips = [];
        var struct = this;
        var outerTriggerListener = function(e) {
            struct._tooltips.forEach(function(tooltip) {
                if (!tooltip.xtag._skipOuterClick && tooltip.hasAttribute("visible") && !tooltip.ignoreOuterTrigger && !hasParentNode(e.target, tooltip)) {
                    _hideTooltip(tooltip);
                }
                tooltip.xtag._skipOuterClick = false;
            });
        };
        var cachedListener = this._cachedListener = new CachedListener(document, eventType, outerTriggerListener);
        cachedListener.attachListener();
    }
    OuterTriggerEventStruct.prototype.destroy = function() {
        this._cachedListener.removeListener();
        this._cachedListener = null;
        this._tooltips = null;
    };
    OuterTriggerEventStruct.prototype.containsTooltip = function(tooltip) {
        return this._tooltips.indexOf(tooltip) !== -1;
    };
    OuterTriggerEventStruct.prototype.addTooltip = function(tooltip) {
        if (!this.containsTooltip(tooltip)) {
            this._tooltips.push(tooltip);
        }
    };
    OuterTriggerEventStruct.prototype.removeTooltip = function(tooltip) {
        if (this.containsTooltip(tooltip)) {
            this._tooltips.splice(this._tooltips.indexOf(tooltip), 1);
        }
    };
    Object.defineProperties(OuterTriggerEventStruct.prototype, {
        numTooltips: {
            get: function() {
                return this._tooltips.length;
            }
        }
    });
    function OuterTriggerManager() {
        this.eventStructDict = {};
    }
    OuterTriggerManager.prototype.registerTooltip = function(eventType, tooltip) {
        if (eventType in this.eventStructDict) {
            var eventStruct = this.eventStructDict[eventType];
            if (!eventStruct.containsTooltip(tooltip)) {
                eventStruct.addTooltip(tooltip);
            }
        } else {
            this.eventStructDict[eventType] = new OuterTriggerEventStruct(eventType);
            this.eventStructDict[eventType].addTooltip(tooltip);
        }
    };
    OuterTriggerManager.prototype.unregisterTooltip = function(eventType, tooltip) {
        if (eventType in this.eventStructDict && this.eventStructDict[eventType].containsTooltip(tooltip)) {
            var eventStruct = this.eventStructDict[eventType];
            eventStruct.removeTooltip(tooltip);
            if (eventStruct.numTooltips === 0) {
                eventStruct.destroy();
                delete this.eventStructDict[eventType];
            }
        }
    };
    OUTER_TRIGGER_MANAGER = new OuterTriggerManager();
    function _mkPrevSiblingTargetListener(tooltip, eventName, callback) {
        var filteredCallback = function(e) {
            if (callback && hasParentNode(e.target, tooltip.previousElementSibling)) {
                callback.call(tooltip.previousElementSibling, e);
            }
        };
        return new CachedListener(document.documentElement, eventName, filteredCallback);
    }
    function _mkNextSiblingTargetListener(tooltip, eventName, callback) {
        var eventDelegateStr = eventName + ":delegate(x-tooltip+*)";
        var filteredCallback = function(e) {
            if (callback && this === tooltip.nextElementSibling) {
                callback.call(this, e);
            }
        };
        return new CachedListener(document.documentElement, eventDelegateStr, filteredCallback);
    }
    function _getTargetDelegatedListener(tooltip, targetSelector, eventName, targetCallback) {
        if (targetSelector === PREV_SIB_SELECTOR) {
            return _mkPrevSiblingTargetListener(tooltip, eventName, targetCallback);
        } else if (targetSelector === NEXT_SIB_SELECTOR) {
            return _mkNextSiblingTargetListener(tooltip, eventName, targetCallback);
        } else {
            var delegateEventStr = eventName + ":delegate(" + targetSelector + ")";
            return new CachedListener(document.documentElement, delegateEventStr, function(e) {
                var delegatedElem = this;
                if (!hasParentNode(delegatedElem, tooltip)) {
                    targetCallback.call(delegatedElem, e);
                }
            });
        }
    }
    PRESET_STYLE_LISTENERFNS = {
        custom: function(tooltip, targetSelector) {
            return [];
        },
        hover: function(tooltip, targetSelector) {
            var createdListeners = [];
            var hoverOutTimer = null;
            var hideDelay = 200;
            var cancelTimerFn = function() {
                if (hoverOutTimer) {
                    window.clearTimeout(hoverOutTimer);
                }
                hoverOutTimer = null;
            };
            var showTipTargetFn = mkIgnoreSubchildrenFn(function(e) {
                cancelTimerFn();
                var delegatedElem = this;
                var fromElem = e.relatedTarget || e.toElement;
                if (!hasParentNode(fromElem, tooltip)) {
                    _showTooltip(tooltip, delegatedElem);
                }
            });
            var hideTipTargetFn = mkIgnoreSubchildrenFn(function(e) {
                cancelTimerFn();
                var toElem = e.relatedTarget || e.toElement;
                if (!hasParentNode(toElem, tooltip)) {
                    hoverOutTimer = window.setTimeout(function() {
                        if (tooltip.triggerStyle === "hover") {
                            _hideTooltip(tooltip);
                        }
                    }, hideDelay);
                }
            });
            var targetEnterListener = _getTargetDelegatedListener(tooltip, targetSelector, "enter", showTipTargetFn);
            var targetExitListener = _getTargetDelegatedListener(tooltip, targetSelector, "leave", hideTipTargetFn);
            createdListeners.push(targetEnterListener);
            createdListeners.push(targetExitListener);
            var showTipTooltipFn = mkIgnoreSubchildrenFn(function(e) {
                cancelTimerFn();
                var fromElem = e.relatedTarget || e.toElement;
                var lastTarget = tooltip.xtag.lastTargetElem;
                if (!tooltip.hasAttribute("visible") && lastTarget && !hasParentNode(fromElem, lastTarget)) {
                    _showTooltip(tooltip, lastTarget);
                }
            });
            var hideTipTooltipFn = mkIgnoreSubchildrenFn(function(e) {
                cancelTimerFn();
                var toElem = e.relatedTarget || e.toElement;
                var lastTarget = tooltip.xtag.lastTargetElem;
                if (lastTarget && !hasParentNode(toElem, lastTarget)) {
                    hoverOutTimer = window.setTimeout(function() {
                        if (tooltip.triggerStyle === "hover") {
                            _hideTooltip(tooltip);
                        }
                    }, hideDelay);
                }
            });
            createdListeners.push(new CachedListener(tooltip, "enter", showTipTooltipFn));
            createdListeners.push(new CachedListener(tooltip, "leave", hideTipTooltipFn));
            return createdListeners;
        }
    };
    function mkGenericListeners(tooltip, targetSelector, eventName) {
        var createdListeners = [];
        var targetTriggerFn = function(e) {
            var delegatedElem = this;
            tooltip.xtag._skipOuterClick = true;
            if (tooltip.hasAttribute("visible")) {
                if (delegatedElem === tooltip.xtag.lastTargetElem) {
                    _hideTooltip(tooltip);
                } else {
                    _showTooltip(tooltip, delegatedElem);
                }
            } else {
                _showTooltip(tooltip, delegatedElem);
            }
        };
        var delegatedTargetListener = _getTargetDelegatedListener(tooltip, targetSelector, eventName, targetTriggerFn);
        createdListeners.push(delegatedTargetListener);
        return createdListeners;
    }
    function searchAncestors(elem, conditionFn) {
        while (elem) {
            if (conditionFn(elem)) {
                return elem;
            }
            elem = elem.parentNode;
        }
        return null;
    }
    function hasParentNode(elem, parent) {
        if (parent.contains) {
            return parent.contains(elem);
        } else {
            var condition = function(el) {
                return el === parent;
            };
            return !!searchAncestors(elem, condition);
        }
    }
    function mkIgnoreSubchildrenFn(callback) {
        return function(e) {
            var containerElem = this;
            var relElem = e.relatedTarget || e.toElement;
            if (relElem) {
                if (!hasParentNode(relElem, containerElem)) {
                    callback.call(this, e);
                }
            } else {
                callback.call(this, e);
            }
        };
    }
    function _selectorToElems(tooltip, selector) {
        var elems = [];
        if (selector === PREV_SIB_SELECTOR) {
            elems = tooltip.previousElementSibling ? [ tooltip.previousElementSibling ] : [];
        } else if (selector === NEXT_SIB_SELECTOR) {
            elems = tooltip.nextElementSibling ? [ tooltip.nextElementSibling ] : [];
        } else {
            elems = xtag.query(document, selector);
        }
        var i = 0;
        while (i < elems.length) {
            var elem = elems[i];
            if (hasParentNode(elem, tooltip)) {
                elems.splice(i, 1);
            } else {
                i++;
            }
        }
        return elems;
    }
    function overlaps(elemA, elemB) {
        var _pointIsInRect = function(x, y, rect) {
            return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom;
        };
        var rectA = getRect(elemA);
        var rectB = getRect(elemB);
        var _cornersOverlapBox = function(rectA, rectB) {
            return _pointIsInRect(rectA.left, rectA.top, rectB) || _pointIsInRect(rectA.right, rectA.top, rectB) || _pointIsInRect(rectA.right, rectA.bottom, rectB) || _pointIsInRect(rectA.left, rectA.bottom, rectB);
        };
        var _isCrossIntersect = function(rectA, rectB) {
            return rectA.top <= rectB.top && rectB.bottom <= rectA.bottom && rectB.left <= rectA.left && rectA.right <= rectB.right;
        };
        return _cornersOverlapBox(rectA, rectB) || _cornersOverlapBox(rectB, rectA) || _isCrossIntersect(rectA, rectB) || _isCrossIntersect(rectB, rectA);
    }
    function getRotationDims(width, height, degrees) {
        var radians = degrees * (Math.PI / 180);
        var rotatedHeight = width * Math.sin(radians) + height * Math.cos(radians);
        var rotatedWidth = width * Math.cos(radians) + height * Math.sin(radians);
        return {
            height: rotatedHeight,
            width: rotatedWidth
        };
    }
    function constrainNum(num, min, max) {
        var output = num;
        output = min !== undefined && min !== null ? Math.max(min, output) : output;
        output = max !== undefined && max !== null ? Math.min(max, output) : output;
        return output;
    }
    function _coordsRelToNewContext(x, y, oldContext, newContext, contextScale) {
        var viewportX, viewportY;
        if (oldContext === window) {
            viewportX = x;
            viewportY = y;
        } else {
            var oldContextRect = getRect(oldContext);
            viewportX = x - oldContextRect.left;
            viewportY = y - oldContextRect.top;
        }
        var newContextRect = getRect(newContext);
        contextScale = contextScale ? contextScale : getScale(newContext, newContextRect);
        var borderTop = newContext.clientTop * contextScale.y;
        var borderLeft = newContext.clientLeft * contextScale.x;
        var scrollTop = newContext.scrollTop * contextScale.y;
        var scrollLeft = newContext.scrollLeft * contextScale.x;
        var translatedCoords = {
            left: viewportX - newContextRect.left - borderLeft,
            top: viewportY - newContextRect.top - borderTop
        };
        if (!hasParentNode(document.body, newContext) && hasParentNode(newContext, document.body)) {
            translatedCoords.top += scrollTop;
            translatedCoords.left += scrollLeft;
        }
        return translatedCoords;
    }
    function _getTooltipConstraints(tooltip, contextRect) {
        if (!contextRect) {
            contextRect = getRect(tooltip.offsetParent || tooltip.parentNode);
        }
        var viewport = getWindowViewport();
        var bounds = viewport;
        if (!tooltip.allowOverflow) {
            bounds = getRectIntersection(viewport, contextRect);
            if (!bounds) bounds = contextRect;
        }
        return bounds;
    }
    function _pickBestTooltipOrient(tooltip, validPositionDataList) {
        if (validPositionDataList.length === 0) return null;
        var bounds = _getTooltipConstraints(tooltip);
        var minX = bounds.left;
        var minY = bounds.top;
        var maxX = bounds.right;
        var maxY = bounds.bottom;
        var inContextData = [];
        var notInContextData = [];
        for (var i = 0; i < validPositionDataList.length; i++) {
            var data = validPositionDataList[i];
            var rect = data.rect;
            if (rect.left < minX || rect.top < minY || rect.right > maxX || rect.bottom > maxY) {
                notInContextData.push(data);
            } else {
                inContextData.push(data);
            }
        }
        var filterDataList = inContextData.length > 0 ? inContextData : notInContextData;
        return filterDataList[0].orient;
    }
    function _forceDisplay(elem) {
        elem.setAttribute("_force-display", true);
    }
    function _unforceDisplay(elem) {
        elem.removeAttribute("_force-display");
    }
    function _autoPositionTooltip(tooltip, targetElem) {
        tooltip.removeAttribute(AUTO_ORIENT_ATTR);
        var arrow = tooltip.xtag.arrowEl, positionRect = null;
        var validOrientDataList = [];
        for (var tmpOrient in TIP_ORIENT_ARROW_DIR_MAP) {
            arrow.setAttribute(ARROW_DIR_ATTR, TIP_ORIENT_ARROW_DIR_MAP[tmpOrient]);
            positionRect = _positionTooltip(tooltip, targetElem, tmpOrient);
            if (!positionRect) {
                continue;
            }
            _forceDisplay(tooltip);
            if (!overlaps(tooltip, targetElem)) {
                validOrientDataList.push({
                    orient: tmpOrient,
                    rect: positionRect
                });
            }
            _unforceDisplay(tooltip);
        }
        var bestOrient = _pickBestTooltipOrient(tooltip, validOrientDataList);
        if (!bestOrient) bestOrient = "top";
        tooltip.setAttribute(AUTO_ORIENT_ATTR, bestOrient);
        arrow.setAttribute(ARROW_DIR_ATTR, TIP_ORIENT_ARROW_DIR_MAP[bestOrient]);
        if (isValidOrientation(bestOrient) && bestOrient !== tmpOrient) {
            return _positionTooltip(tooltip, targetElem, bestOrient);
        } else {
            return positionRect;
        }
    }
    function _positionTooltip(tooltip, targetElem, orientation, reattemptDepth) {
        if (!tooltip.parentNode) {
            tooltip.left = "";
            tooltip.top = "";
            return null;
        }
        reattemptDepth = reattemptDepth === undefined ? 0 : reattemptDepth;
        var arrow = tooltip.xtag.arrowEl;
        if (!isValidOrientation(orientation)) {
            return _autoPositionTooltip(tooltip, targetElem);
        }
        var tipContext = tooltip.offsetParent ? tooltip.offsetParent : tooltip.parentNode;
        if (!reattemptDepth) {
            tooltip.style.top = "";
            tooltip.style.left = "";
            arrow.style.top = "";
            arrow.style.left = "";
        }
        _forceDisplay(tooltip);
        var viewport = getWindowViewport();
        var contextRect = getRect(tipContext);
        var contextScale = getScale(tipContext, contextRect);
        var contextViewWidth = tipContext.clientWidth * contextScale.x;
        var contextViewHeight = tipContext.clientHeight * contextScale.y;
        var targetRect = getRect(targetElem);
        var targetWidth = targetRect.width;
        var targetHeight = targetRect.height;
        var tooltipRect = getRect(tooltip);
        var tooltipScale = getScale(tooltip, tooltipRect);
        var origTooltipWidth = tooltipRect.width;
        var origTooltipHeight = tooltipRect.height;
        var renderedTooltipWidth = tooltipRect.width;
        var renderedTooltipHeight = tooltipRect.height;
        var tipPlacementOffsetX = (renderedTooltipWidth - origTooltipWidth) / 2;
        var tipPlacementOffsetY = (renderedTooltipHeight - origTooltipHeight) / 2;
        var arrowWidth = arrow.offsetWidth * tooltipScale.x;
        var arrowHeight = arrow.offsetHeight * tooltipScale.y;
        var arrowRotationDegs = 45;
        var arrowDims = getRotationDims(arrowWidth, arrowHeight, arrowRotationDegs);
        arrowWidth = arrowDims.width;
        arrowHeight = arrowDims.height;
        if (orientation === "top" || orientation === "bottom") {
            arrowHeight /= 2;
        } else {
            arrowWidth /= 2;
        }
        var bounds = _getTooltipConstraints(tooltip, contextRect);
        var minRawLeft = bounds.left;
        var minRawTop = bounds.top;
        var maxRawLeft = bounds.right - origTooltipWidth;
        var maxRawTop = bounds.bottom - origTooltipHeight;
        var idealTipCenterAlignCoords = {
            left: targetRect.left + (targetWidth - origTooltipWidth) / 2,
            top: targetRect.top + (targetHeight - origTooltipHeight) / 2
        };
        var idealRawLeft = idealTipCenterAlignCoords.left;
        var idealRawTop = idealTipCenterAlignCoords.top;
        if (orientation === "top") {
            idealRawTop = targetRect.top - renderedTooltipHeight - arrowHeight;
            maxRawTop -= arrowHeight;
        } else if (orientation === "bottom") {
            idealRawTop = targetRect.top + targetHeight + arrowHeight;
            maxRawTop -= arrowHeight;
        } else if (orientation === "left") {
            idealRawLeft = targetRect.left - renderedTooltipWidth - arrowWidth;
            maxRawLeft -= arrowWidth;
        } else if (orientation === "right") {
            idealRawLeft = targetRect.left + targetWidth + arrowWidth;
            maxRawLeft -= arrowWidth;
        } else {
            throw "invalid orientation " + orientation;
        }
        var rawLeft = constrainNum(idealRawLeft, minRawLeft, maxRawLeft);
        var rawTop = constrainNum(idealRawTop, minRawTop, maxRawTop);
        rawLeft += tipPlacementOffsetX;
        rawTop += tipPlacementOffsetY;
        var _isFixed = function(el) {
            if (!window.getComputedStyle || el === document || el === document.documentElement) {
                return false;
            }
            var styles;
            try {
                styles = window.getComputedStyle(el);
            } catch (e) {
                return false;
            }
            return styles && styles.position === "fixed";
        };
        var newLeft;
        var newTop;
        var fixedAncestor = searchAncestors(targetElem, _isFixed);
        if (fixedAncestor && !hasParentNode(tooltip, fixedAncestor)) {
            newLeft = rawLeft - viewport.left;
            newTop = rawTop - viewport.top;
            tooltip.setAttribute("_target-fixed", true);
        } else {
            var relativeCoords = _coordsRelToNewContext(rawLeft, rawTop, window, tipContext, contextScale);
            newLeft = relativeCoords.left;
            newTop = relativeCoords.top;
            tooltip.removeAttribute("_target-fixed");
        }
        tooltip.style.top = newTop + "px";
        tooltip.style.left = newLeft + "px";
        var maxVal;
        var arrowParentSize;
        var arrowStyleProp;
        var rawArrowCenter;
        var tipTargetDiff;
        if (orientation === "top" || orientation === "bottom") {
            rawArrowCenter = (targetWidth - arrowWidth) / 2;
            tipTargetDiff = targetRect.left - rawLeft;
            maxVal = origTooltipWidth - arrowWidth;
            arrowParentSize = origTooltipWidth;
            arrowStyleProp = "left";
        } else {
            rawArrowCenter = (targetHeight - arrowHeight) / 2;
            tipTargetDiff = targetRect.top - rawTop;
            maxVal = origTooltipHeight - arrowHeight;
            arrowParentSize = origTooltipHeight;
            arrowStyleProp = "top";
        }
        var arrowVal = constrainNum(rawArrowCenter + tipTargetDiff, 0, maxVal);
        var arrowFrac = arrowParentSize ? arrowVal / arrowParentSize : 0;
        arrow.style[arrowStyleProp] = arrowFrac * 100 + "%";
        var newTooltipWidth = tooltip.offsetWidth * tooltipScale.x;
        var newTooltipHeight = tooltip.offsetHeight * tooltipScale.y;
        var newContextViewWidth = tipContext.clientWidth * contextScale.x;
        var newContextViewHeight = tipContext.clientHeight * contextScale.y;
        _unforceDisplay(tooltip);
        var recursionLimit = 2;
        if (reattemptDepth < recursionLimit && (origTooltipWidth !== newTooltipWidth || origTooltipHeight !== newTooltipHeight || contextViewWidth !== newContextViewWidth || contextViewHeight !== newContextViewHeight)) {
            return _positionTooltip(tooltip, targetElem, orientation, reattemptDepth + 1);
        } else {
            return {
                left: rawLeft,
                top: rawTop,
                width: newTooltipWidth,
                height: newTooltipHeight,
                right: rawLeft + newTooltipWidth,
                bottom: rawTop + newTooltipHeight
            };
        }
    }
    function _showTooltip(tooltip, triggerElem) {
        if (triggerElem === tooltip) {
            console.warn("The tooltip's target element is the tooltip itself!" + " Is this intentional?");
        }
        var arrow = tooltip.xtag.arrowEl;
        if (!arrow.parentNode) {
            console.warn("The inner component DOM of the tooltip " + "appears to be missing. Make sure to edit tooltip" + " contents through the .contentEl property instead of" + "directly on the x-tooltip to avoid " + "clobbering the component's internals.");
        }
        var targetOrient = tooltip.orientation;
        var _readyToShowFn = function() {
            _unforceDisplay(tooltip);
            tooltip.setAttribute("visible", true);
            xtag.fireEvent(tooltip, "tooltipshown", {
                triggerElem: triggerElem
            });
        };
        if (triggerElem) {
            tooltip.xtag.lastTargetElem = triggerElem;
            xtag.skipTransition(tooltip, function() {
                _positionTooltip(tooltip, triggerElem, targetOrient);
                return _readyToShowFn;
            });
        } else {
            tooltip.style.top = "";
            tooltip.style.left = "";
            arrow.style.top = "";
            arrow.style.left = "";
            _readyToShowFn();
        }
    }
    function _hideTooltip(tooltip) {
        if (isValidOrientation(tooltip.orientation)) {
            tooltip.removeAttribute(AUTO_ORIENT_ATTR);
        }
        if (tooltip.hasAttribute("visible")) {
            _forceDisplay(tooltip);
            tooltip.xtag._hideTransitionFlag = true;
            tooltip.removeAttribute("visible");
        }
    }
    function _destroyListeners(tooltip) {
        var cachedListeners = tooltip.xtag.cachedListeners;
        cachedListeners.forEach(function(cachedListener) {
            cachedListener.removeListener();
        });
        tooltip.xtag.cachedListeners = [];
        OUTER_TRIGGER_MANAGER.unregisterTooltip(tooltip.triggerStyle, tooltip);
    }
    function _updateTriggerListeners(tooltip, newTargetSelector, newTriggerStyle) {
        if (!tooltip.parentNode) {
            return;
        }
        if (newTargetSelector === undefined || newTargetSelector === null) {
            newTargetSelector = tooltip.targetSelector;
        }
        if (newTriggerStyle === undefined || newTriggerStyle === null) {
            newTriggerStyle = tooltip.triggerStyle;
        }
        var newTriggerElems = _selectorToElems(tooltip, newTargetSelector);
        if (newTriggerElems.indexOf(tooltip.xtag.lastTargetElem) === -1) {
            tooltip.xtag.lastTargetElem = newTriggerElems.length > 0 ? newTriggerElems[0] : null;
            _positionTooltip(tooltip, tooltip.xtag.lastTargetElem, tooltip.orientation);
        }
        _destroyListeners(tooltip);
        var listeners;
        if (newTriggerStyle in PRESET_STYLE_LISTENERFNS) {
            var getListenersFn = PRESET_STYLE_LISTENERFNS[newTriggerStyle];
            listeners = getListenersFn(tooltip, newTargetSelector);
        } else {
            listeners = mkGenericListeners(tooltip, newTargetSelector, newTriggerStyle);
            OUTER_TRIGGER_MANAGER.registerTooltip(newTriggerStyle, tooltip);
        }
        listeners.forEach(function(listener) {
            listener.attachListener();
        });
        tooltip.xtag.cachedListeners = listeners;
        _hideTooltip(tooltip);
    }
    xtag.register("x-tooltip", {
        lifecycle: {
            created: function() {
                var self = this;
                self.xtag.contentEl = document.createElement("div");
                self.xtag.arrowEl = document.createElement("span");
                xtag.addClass(self.xtag.contentEl, "tooltip-content");
                xtag.addClass(self.xtag.arrowEl, "tooltip-arrow");
                self.xtag.contentEl.innerHTML = self.innerHTML;
                self.innerHTML = "";
                self.appendChild(self.xtag.contentEl);
                self.appendChild(self.xtag.arrowEl);
                self.xtag._orientation = "auto";
                self.xtag._targetSelector = PREV_SIB_SELECTOR;
                self.xtag._triggerStyle = "click";
                var triggeringElems = _selectorToElems(self, self.xtag._targetSelector);
                self.xtag.lastTargetElem = triggeringElems.length > 0 ? triggeringElems[0] : null;
                self.xtag.cachedListeners = [];
                self.xtag._hideTransitionFlag = false;
                self.xtag._skipOuterClick = false;
            },
            inserted: function() {
                _updateTriggerListeners(this, this.xtag._targetSelector, this.xtag._triggerStyle);
            },
            removed: function() {
                _destroyListeners(this);
            }
        },
        events: {
            transitionend: function(e) {
                var tooltip = e.currentTarget;
                if (tooltip.xtag._hideTransitionFlag && !tooltip.hasAttribute("visible")) {
                    tooltip.xtag._hideTransitionFlag = false;
                    xtag.fireEvent(tooltip, "tooltiphidden");
                }
                _unforceDisplay(tooltip);
            }
        },
        accessors: {
            orientation: {
                attribute: {},
                get: function() {
                    return this.xtag._orientation;
                },
                set: function(newOrientation) {
                    newOrientation = newOrientation.toLowerCase();
                    var arrow = this.querySelector(".tooltip-arrow");
                    var newArrowDir = null;
                    if (isValidOrientation(newOrientation)) {
                        newArrowDir = TIP_ORIENT_ARROW_DIR_MAP[newOrientation];
                        arrow.setAttribute(ARROW_DIR_ATTR, newArrowDir);
                        this.removeAttribute(AUTO_ORIENT_ATTR);
                    } else {
                        arrow.removeAttribute(ARROW_DIR_ATTR);
                    }
                    this.xtag._orientation = newOrientation;
                    this.refreshPosition();
                }
            },
            triggerStyle: {
                attribute: {
                    name: "trigger-style"
                },
                get: function() {
                    return this.xtag._triggerStyle;
                },
                set: function(newTriggerStyle) {
                    _updateTriggerListeners(this, this.targetSelector, newTriggerStyle);
                    this.xtag._triggerStyle = newTriggerStyle;
                }
            },
            targetSelector: {
                attribute: {
                    name: "target-selector"
                },
                get: function() {
                    return this.xtag._targetSelector;
                },
                set: function(newSelector) {
                    var newTriggerElems = _selectorToElems(this, newSelector);
                    _updateTriggerListeners(this, newSelector, this.triggerStyle);
                    this.xtag._targetSelector = newSelector;
                }
            },
            ignoreOuterTrigger: {
                attribute: {
                    "boolean": true,
                    name: "ignore-outer-trigger"
                }
            },
            ignoreTooltipPointerEvents: {
                attribute: {
                    "boolean": true,
                    name: "ignore-tooltip-pointer-events"
                }
            },
            allowOverflow: {
                attribute: {
                    "boolean": true,
                    name: "allow-overflow"
                },
                set: function(allowsOverflow) {
                    this.refreshPosition();
                }
            },
            contentEl: {
                get: function() {
                    return this.xtag.contentEl;
                },
                set: function(newContentElem) {
                    var oldContent = this.xtag.contentEl;
                    xtag.addClass(newContentElem, "tooltip-content");
                    this.replaceChild(newContentElem, oldContent);
                    this.xtag.contentEl = newContentElem;
                    this.refreshPosition();
                }
            },
            presetTriggerStyles: {
                get: function() {
                    var output = [];
                    for (var presetName in PRESET_STYLE_LISTENERFNS) {
                        output.push(presetName);
                    }
                    return output;
                }
            },
            targetElems: {
                get: function() {
                    return _selectorToElems(this, this.targetSelector);
                }
            }
        },
        methods: {
            refreshPosition: function() {
                if (this.xtag.lastTargetElem) {
                    _positionTooltip(this, this.xtag.lastTargetElem, this.orientation);
                }
            },
            show: function() {
                _showTooltip(this, this.xtag.lastTargetElem);
            },
            hide: function() {
                _hideTooltip(this);
            },
            toggle: function() {
                if (this.hasAttribute("visible")) {
                    this.hide();
                } else {
                    this.show();
                }
            }
        }
    });
})();
(function() {
  define('cs!lib/geo',['zepto', 'localforage'], function($, localForage) {
    var CACHE_TIME_NO_UPDATE, CACHE_TIME_WITH_UPDATE, GEO_PADDING, filterNearby, getCurrentPosition, isNearby, staticMap;
    CACHE_TIME_NO_UPDATE = 30;
    CACHE_TIME_WITH_UPDATE = window.GLOBALS.MINUTE * 5;
    GEO_PADDING = 350;
    getCurrentPosition = function(successCallback, failureCallback, forceUpdate) {
      var d;
      if (forceUpdate == null) {
        forceUpdate = false;
      }
      d = $.Deferred();
      localForage.getItem('_geo_last_getCurrentPosition', function(geoCache) {
        if (forceUpdate || !geoCache || geoCache.lastUpdated + CACHE_TIME_NO_UPDATE < window.timestamp()) {
          console.info("Getting new geodata.");
          if (!(!geoCache || geoCache.lastUpdated + CACHE_TIME_WITH_UPDATE < window.timestamp())) {
            console.info("Using cached geodata while we update.");
            if (successCallback) {
              successCallback(geoCache, geoCache.coords, geoCache.coords.accuracy);
            }
            d.resolve(geoCache, geoCache.coords, geoCache.coords.accuracy);
          }
          return window.navigator.geolocation.getCurrentPosition(function(position) {
            var k, positionCopy, v, _ref;
            position.coords.lat = position.coords.latitude;
            position.coords.lng = position.coords.longitude;
            positionCopy = {
              coords: {},
              lastUpdated: window.timestamp(),
              timestamp: position.timestamp
            };
            _ref = position.coords;
            for (k in _ref) {
              v = _ref[k];
              positionCopy.coords[k] = v;
            }
            localForage.setItem('_geo_last_getCurrentPosition', positionCopy);
            if (successCallback) {
              successCallback(position, position.coords, position.coords.accuracy);
            }
            return d.resolve(position, position.coords, position.coords.accuracy);
          }, function(position) {
            if (failureCallback) {
              failureCallback(position, null, null);
            }
            return d.reject(position, null, null);
          });
        } else {
          console.info("Getting cached geodata.");
          if (successCallback) {
            successCallback(geoCache, geoCache.coords, geoCache.coords.accuracy);
          }
          return d.resolve(geoCache, geoCache.coords, geoCache.coords.accuracy);
        }
      });
      return d.promise();
    };
    filterNearby = function(collection, position) {
      var d;
      if (position == null) {
        position = null;
      }
      d = $.Deferred();
      getCurrentPosition().done(function(position) {
        var bounds;
        bounds = L.latLngBounds([[position.coords.latitude - 0.0001, position.coords.longitude - 0.0001], [position.coords.latitude + 0.0001, position.coords.longitude - 0.0001], [position.coords.latitude - 0.0001, position.coords.longitude + 0.0001], [position.coords.latitude + 0.0001, position.coords.longitude + 0.0001]]).pad(GEO_PADDING);
        return d.resolve(_.filter(collection, function(item) {
          if (!(item.location && (item.location.lat || item.location.latitude) && (item.location.lng || item.location.longitude))) {
            return false;
          }
          return bounds.contains(L.latLng(item.location.lat || item.location.latitude, item.location.lng || item.location.longitude));
        }));
      }).fail(d.reject);
      return d.promise();
    };
    isNearby = function(lat, lng) {
      var d;
      d = $.Deferred();
      getCurrentPosition().done(function(position) {
        var bounds;
        bounds = L.latLngBounds([[position.coords.latitude - 0.0001, position.coords.longitude - 0.0001], [position.coords.latitude + 0.0001, position.coords.longitude - 0.0001], [position.coords.latitude - 0.0001, position.coords.longitude + 0.0001], [position.coords.latitude + 0.0001, position.coords.longitude + 0.0001]]).pad(GEO_PADDING);
        return d.resolve(bounds.contains(L.latLng(lat, lng)));
      });
      return d.promise();
    };
    staticMap = function(coords, pins, zoomLevel, size) {
      var marker, pin, pinString, _i, _len;
      if (coords == null) {
        coords = null;
      }
      if (pins == null) {
        pins = [];
      }
      if (zoomLevel == null) {
        zoomLevel = 14;
      }
      if (size == null) {
        size = [$(window).width(), 125];
      }
      if (!coords) {
        return "";
      }
      pinString = "";
      for (_i = 0, _len = pins.length; _i < _len; _i++) {
        pin = pins[_i];
        if (pin[2] && pin[2].match('https?:\/\/')) {
          marker = "url-" + (encodeURIComponent(pin[2]));
        } else if (pin[2]) {
          marker = pins[2];
        } else {
          marker = window.GLOBALS.DEFAULT_MAP_MARKER;
        }
        marker = window.GLOBALS.DEFAULT_MAP_MARKER;
        pinString += "" + marker + "(" + pin[1] + "," + pin[0] + ")/";
      }
      return "" + window.GLOBALS.MAP_URL + pinString + coords[1] + "," + coords[0] + "," + zoomLevel + "/" + size[0] + "x" + size[1] + ".png";
    };
    return {
      filterNearby: filterNearby,
      getCurrentPosition: getCurrentPosition,
      isNearby: isNearby,
      staticMap: staticMap
    };
  });

}).call(this);

//   (c) 2013 Henrik Joreteg
//   MIT Licensed
//   For all details and documentation:
//   https://github.com/HenrikJoreteg/human-model
(function () {
  

  // Initial setup
  // -------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;
  var toString = Object.prototype.toString;
  var slice = Array.prototype.slice;

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  var define;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // Require Backbone, if we're on the server, and it's not already present.
  var Backbone = root.Backbone;
  if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone');

  // Backbone Collection compatibility fix:
  // In backbone, when you add an already instantiated model to a collection
  // the collection checks to see if what you're adding is already a model
  // the problem is, it does this witn an instanceof check. We're wanting to
  // use completely different models so the instanceof will fail even if they
  // are "real" models. So we work around this by overwriting this method from
  // backbone 1.0.0. The only difference is it looks for an initialize method
  // (which both Backbone and HumanModel will always have) to determine whether
  // an instantiated model or a simple object is being passed in.
  Backbone.Collection.prototype._prepareModel = function (attrs, options) {
    if (_.isFunction(attrs.initialize)) {
      if (!attrs.collection) attrs.collection = this;
      return attrs;
    }
    options || (options = {});
    options.collection = this;
    var model = new this.model(attrs, options);
    if (!model._validate(attrs, options)) {
      this.trigger('invalid', this, attrs, options);
      return false;
    }
    return model;
  };


  var createDerivedProperty = function (modelProto, name, definition) {
    var def = modelProto._derived[name] = {
      fn: _.isFunction(definition) ? definition : definition.fn,
      cache: (definition.cache !== false),
      depList: definition.deps || []
    };

    // add to our shared dependency list
    _.each(def.depList, function (dep) {
      modelProto._deps[dep] = _(modelProto._deps[dep] || []).union([name]);
    });

    // defined a top-level getter for derived names
    Object.defineProperty(modelProto, name, {
      get: function () {
        // is this a derived property we should cache?
        if (this._derived[name].cache) {
          // read through cache
          return this._cache[name] || (this._cache[name] = this._derived[name].fn.apply(this));
        } else {
          return this._derived[name].fn.apply(this);
        }
      },
      set: function () {
        throw new TypeError('"' + name + '" is a derived property, it can\'t be set directly.');
      }
    });
  };


  // Registry
  // ---------------

  // Internal storage for models, seperate namespace
  // storage from default to prevent collision of matching
  // model type+id and namespace name

  var Registry = function () {
    this._cache = {};
    this._namespaces = {};
  };

  // Attach all inheritable methods to the Registry prototype.
  _.extend(Registry.prototype, {
    // Get the general or namespaced internal cache
    _getCache: function (ns) {
      if (ns) {
        this._namespaces[ns] || (this._namespaces[ns] = {});
        return this._namespaces[ns];
      }
      return this._cache;
    },

    // Find the cached model
    lookup: function (type, id, ns) {
      var cache = this._getCache(ns);
      return cache && cache[type + id];
    },

    // Add a model to the cache if it has not already been set
    store: function (model) {
      var cache = this._getCache(model._namespace),
        key = model.type + model.getId();
      // Prevent overriding a previously stored model
      cache[key] = cache[key] || model;
      return this;
    },

    // Remove a stored model from the cache, return `true` if removed
    remove: function (type, id, ns) {
      var cache = this._getCache(ns);
      if (this.lookup.apply(this, arguments)) {
        delete cache[type + id];
        return true;
      }
      return false;
    },

    // Reset internal cache
    clear: function () {
      this._cache = {};
      this._namespaces = {};
    }
  });

  // HumanModel
  // ------------
  var registry = new Registry();

  // our dataTypes
  var dataTypes = {
    date: {
      set: function (newVal) {
        var newType;
        if (!_.isDate(newVal)) {
          try {
            newVal = (new Date(parseInt(newVal, 10))).valueOf();
            newType = 'date';
          } catch (e) {
            newType = typeof newVal;
          }
        } else {
          newType = 'date';
          newVal = newVal.valueOf();
        }
        return {
          val: newVal,
          type: newType
        };
      },
      get: function (val) {
        return new Date(val);
      }
    },
    array: {
      set: function (newVal) {
        return {
          val: newVal,
          type: _.isArray(newVal) ? 'array' : typeof newVal
        };
      }
    },
    object: {
      set: function (newVal) {
        var newType = typeof newVal;
        // we have to have a way of supporting "missing" objects.
        // Null is an object, but setting a value to undefined
        // should work too, IMO. We just override it, in that case.
        if (newType !== 'object' && _.isUndefined(newVal)) {
          newVal = null;
          newType = 'object';
        }
        return {
          val: newVal,
          type: newType
        };
      }
    }
  };

  define = function (spec) {
    spec || (spec = {});
    var key;

    // create our constructor
    var HumanModel = function (attrs, options) {
      attrs || (attrs = {});
      options || (options = {});
      this.cid = _.uniqueId('model');
      // set the collection if passed in
      this.collection = options.collection || undefined;
      if (options.parse) attrs = this.parse(attrs, options) || {};
      this.registry = options.registry || registry;
      options._attrs = attrs;
      this._namespace = options.namespace;
      this._initted = false;
      this._values = {};
      this._initCollections();
      this._cache = {};
      this._previousAttributes = {};
      this._events = {};

      this.set(attrs, _.extend({silent: true}, options));
      this._changed = {};
      this.initialize.apply(this, arguments);
      if (attrs[this.idAttribute]) this.registry.store(this);
      this._initted = true;
      if (this.seal) {
        Object.seal(this);
      }
    };

    // define a few fixed properties
    Object.defineProperties(HumanModel.prototype, {
      attributes: {
        get: function () {
          return this._getAttributes(true);
        }
      },
      json: {
        get: function () {
          return JSON.stringify(this.serialize());
        }
      },
      derived: {
        get: function () {
          var res = {};
          for (var item in this._derived) res[item] = this._derived[item].fn.apply(this);
          return res;
        }
      },
      toTemplate: {
        get: function () {
          return _.extend(this._getAttributes(true), this.derived);
        }
      }
    });



    // Attach all inheritable methods to the Model prototype.
    _.extend(HumanModel.prototype, Backbone.Events, {
      idAttribute: 'id',

      // storage for our rules about derived properties
      _derived: {},
      _deps: {},
      _definition: {},

      // can be allow, ignore, reject
      extraProperties: 'ignore',

      getId: function () {
        return this.get(this.idAttribute);
      },

      // stubbed out to be overwritten
      initialize: function () {
        return this;
      },

      // backbone compatibility
      parse: function (resp, options) {
        return resp;
      },

      // serialize does nothing by default
      serialize: function () {
        return this._getAttributes(false, true);
      },

      // Remove model from the registry and unbind events
      remove: function () {
        if (this.getId()) {
          this.registry.remove(this.type, this.getId(), this._namespace);
        }
        this.trigger('remove', this);
        this.off();
        return this;
      },

      set: function (key, value, options) {
        var self = this;
        var extraProperties = this.extraProperties;
        var changing, previous, changes,
          newType, interpretedType, newVal, def,
          attr, attrs, silent, unset, currentVal;

        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (_.isObject(key) || key === null) {
          attrs = key;
          options = value;
        } else {
          attrs = {};
          attrs[key] = value;
        }

        options = options || {};

        if (!this._validate(attrs, options)) return false;

        // Extract attributes and options.
        unset = options.unset;
        silent = options.silent;
        changes = [];
        changing = this._changing;
        this._changing = true;

        // if not already changing, store previous
        if (!changing) {
          this._previousAttributes = this._getAttributes(true);
          this._changed = {};
        }
        previous = this._previousAttributes;

        // For each `set` attribute...
        for (attr in attrs) {
          newVal = attrs[attr];
          newType = typeof newVal;
          currentVal = this._values[attr];
          def = this._definition[attr];

          if (!def) {
            if (extraProperties === 'ignore') {
              continue;
            } else if (extraProperties === 'reject') {
              throw new TypeError('No "' + attr + '" property defined on ' + (this.type || 'this') + ' model and allowOtherProperties not set.');
            } else if (extraProperties === 'allow') {
              def = this._createPropertyDefinition(attr, 'any');
            }
          }

          // check type if we have one
          if (dataTypes[def.type]) {
            var cast = dataTypes[def.type].set(newVal);
            newVal = cast.val;
            newType = cast.type;
          }

          // If we've defined a test, run it
          if (def.test) {
            var err = def.test(newVal, newType);
            if (err) {
              throw new TypeError('Property \'' + attr + '\' failed validation with error: ' + err);
            }
          }

          // If we are required but undefined, throw error.
          // If we are null and are not allowing null, throw error
          // If we have a defined type and the new type doesn't match, and we are not null, throw error.

          if (_.isUndefined(newVal) && def.required) {
            throw new TypeError('Required property \'' + attr + '\' must be of type ' + def.type + '. Tried to set ' + newVal);
          }
          if (_.isNull(newVal) && def.required && !def.allowNull) {
            throw new TypeError('Property \'' + attr + '\' must be of type ' + def.type + ' (cannot be null). Tried to set ' + newVal);
          }
          if ((def.type && def.type !== 'any' && def.type !== newType) && !_.isNull(newVal) && !_.isUndefined(newVal)) {
            throw new TypeError('Property \'' + attr + '\' must be of type ' + def.type + '. Tried to set ' + newVal);
          }
          if (def.values && !_.contains(def.values, newVal)) {
            throw new TypeError('Property \'' + attr + '\' must be one of values: ' + def.values.map(function (item) { return item.toString(); }).join(', '));
          }

          // enforce `setOnce` for properties if set
          if (def.setOnce && currentVal !== undefined && !_.isEqual(currentVal, newVal)) {
            throw new TypeError('Property \'' + key + '\' can only be set once.');
          }

          // push to changes array if different
          if (!_.isEqual(currentVal, newVal)) {
            changes.push({prev: currentVal, val: newVal, key: attr});
          }

          // keep track of changed attributes
          if (!_.isEqual(previous[attr], newVal)) {
            self._changed[attr] = newVal;
          } else {
            delete self._changed[attr];
          }
        }

        // actually update our values
        _.each(changes, function (change) {
          self._previousAttributes[change.key] = change.prev;
          if (unset) {
            delete self._values[change.key];
          } else {
            self._values[change.key] = change.val;
          }
        });

        var triggers = [];

        function gatherTriggers(key) {
          triggers.push(key);
          _.each((self._deps[key] || []), function (derTrigger) {
            gatherTriggers(derTrigger);
          });
        }

        if (!silent && changes.length) self._pending = true;
        _.each(changes, function (change) {
          gatherTriggers(change.key);
        });

        _.each(_.uniq(triggers), function (key) {
          var derived = self._derived[key];
          if (derived && derived.cache) {
            self._previousAttributes[key] = self._cache[key];
            delete self._cache[key];
          }
          if (!silent) self.trigger('change:' + key, self, self[key]);
        });

        // You might be wondering why there's a `while` loop here. Changes can
        // be recursively nested within `"change"` events.
        if (changing) return this;
        if (!silent) {
          while (this._pending) {
            this._pending = false;
            this.trigger('change', this, options);
          }
        }
        this._pending = false;
        this._changing = false;
        return this;
      },

      get: function (attr) {
        return this[attr];
      },

      // Get all of the attributes of the model at the time of the previous
      // `"change"` event.
      previousAttributes: function () {
        return _.clone(this._previousAttributes);
      },

      save: function (key, val, options) {
        var attrs, method, xhr, attributes = this.attributes;

        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (key == null || typeof key === 'object') {
          attrs = key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }

        options = _.extend({validate: true}, options);

        // If we're not waiting and attributes exist, save acts as
        // `set(attr).save(null, opts)` with validation. Otherwise, check if
        // the model will be valid when the attributes, if any, are set.
        if (attrs && !options.wait) {
          if (!this.set(attrs, options)) return false;
        } else {
          if (!this._validate(attrs, options)) return false;
        }

        // After a successful server-side save, the client is (optionally)
        // updated with the server-side state.
        if (options.parse === void 0) options.parse = true;
        var model = this;
        var success = options.success;
        options.success = function (resp) {
          var serverAttrs = model.parse(resp, options);
          if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
          if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
            return false;
          }
          if (success) success(model, resp, options);
          model.trigger('sync', model, resp, options);
        };
        wrapError(this, options);

        method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
        if (method === 'patch') options.attrs = attrs;
        // if we're waiting we haven't actually set our attributes yet so
        // we need to do make sure we send right data
        if (options.wait) options.attrs = _.extend(model.serialize(), attrs);
        xhr = this.sync(method, this, options);

        return xhr;
      },

      // Fetch the model from the server. If the server's representation of the
      // model differs from its current attributes, they will be overridden,
      // triggering a `"change"` event.
      fetch: function (options) {
        options = options ? _.clone(options) : {};
        if (options.parse === void 0) options.parse = true;
        var model = this;
        var success = options.success;
        options.success = function (resp) {
          if (!model.set(model.parse(resp, options), options)) return false;
          if (success) success(model, resp, options);
          model.trigger('sync', model, resp, options);
        };
        wrapError(this, options);
        return this.sync('read', this, options);
      },

      // Destroy this model on the server if it was already persisted.
      // Optimistically removes the model from its collection, if it has one.
      // If `wait: true` is passed, waits for the server to respond before removal.
      destroy: function (options) {
        options = options ? _.clone(options) : {};
        var model = this;
        var success = options.success;

        var destroy = function () {
          model.trigger('destroy', model, model.collection, options);
        };

        options.success = function (resp) {
          if (options.wait || model.isNew()) destroy();
          if (success) success(model, resp, options);
          if (!model.isNew()) model.trigger('sync', model, resp, options);
        };

        if (this.isNew()) {
          options.success();
          return false;
        }
        wrapError(this, options);

        var xhr = this.sync('delete', this, options);
        if (!options.wait) destroy();
        return xhr;
      },

      // Determine if the model has changed since the last `"change"` event.
      // If you specify an attribute name, determine if that attribute has changed.
      hasChanged: function (attr) {
        if (attr == null) return !_.isEmpty(this._changed);
        return _.has(this._changed, attr);
      },

      // Return an object containing all the attributes that have changed, or
      // false if there are no changed attributes. Useful for determining what
      // parts of a view need to be updated and/or what attributes need to be
      // persisted to the server. Unset attributes will be set to undefined.
      // You can also pass an attributes object to diff against the model,
      // determining if there *would be* a change.
      changedAttributes: function (diff) {
        if (!diff) return this.hasChanged() ? _.clone(this._changed) : false;
        var val, changed = false;
        var old = this._changing ? this._previousAttributes : this._getAttributes(true);
        for (var attr in diff) {
          if (_.isEqual(old[attr], (val = diff[attr]))) continue;
          (changed || (changed = {}))[attr] = val;
        }
        return changed;
      },

      toJSON: function () {
        return this.serialize();
      },

      // Returns `true` if the attribute contains a value that is not null
      // or undefined.
      has: function (attr) {
        return this.get(attr) != null;
      },

      // Default URL for the model's representation on the server -- if you're
      // using Backbone's restful methods, override this to change the endpoint
      // that will be called.
      url: function () {
        var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
        if (this.isNew()) return base;
        return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.getId());
      },

      // A model is new if it has never been saved to the server, and lacks an id.
      isNew: function () {
        return this.getId() == null;
      },

      // return copy of model
      clone: function () {
        return new this.constructor(this._getAttributes(true));
      },

      // Check if the model is currently in a valid state.
      isValid: function (options) {
        return this._validate({}, _.extend(options || {}, { validate: true }));
      },

      // return escaped property
      escape: function (attr) {
        return _.escape(this[attr]);
      },

      // Proxy `Backbone.sync` by default -- but override this if you need
      // custom syncing semantics for *this* particular model.
      sync: function () {
        return Backbone.sync.apply(this, arguments);
      },

      unset: function (attr, options) {
        var def = this._definition[attr];
        var type = def.type;
        var val;
        if (def.required) {
          if (!_.isUndefined(def.default)) {
            val = def.default;
          } else {
            val = this._getDefaultForType(type);
          }
          return this.set(attr, val, options);
        } else {
          return this.set(attr, val, _.extend({}, options, {unset: true}));
        }
      },

      clear: function (options) {
        var self = this;
        _.each(this._getAttributes(true), function (val, key) {
          self.unset(key, options);
        });
        return this;
      },

      // Run validation against the next complete set of model attributes,
      // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
      _validate: function (attrs, options) {
        if (!options.validate || !this.validate) return true;
        attrs = _.extend({}, this.attributes, attrs);
        var error = this.validationError = this.validate(attrs, options) || null;
        if (!error) return true;
        this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
        return false;
      },

      // Get default values for a certain type
      _getDefaultForType: function (type) {
        if (type === 'string') {
          return '';
        } else if (type === 'object') {
          return {};
        } else if (type === 'array') {
          return [];
        }
      },

      // convenience methods for manipulating array properties
      addListVal: function (prop, value, prepend) {
        var list = _.clone(this[prop]) || [];
        if (!_(list).contains(value)) {
          list[prepend ? 'unshift' : 'push'](value);
          this[prop] = list;
        }
        return this;
      },

      previous: function (attr) {
        if (attr == null || !Object.keys(this._previousAttributes).length) return null;
        return this._previousAttributes[attr];
      },

      removeListVal: function (prop, value) {
        var list = _.clone(this[prop]) || [];
        if (_(list).contains(value)) {
          this[prop] = _(list).without(value);
        }
        return this;
      },

      hasListVal: function (prop, value) {
        return _.contains(this[prop] || [], value);
      },

      // -----------------------------------------------------------------------

      _initCollections: function () {
        var coll;
        if (!this._collections) return;
        for (coll in this._collections) {
          this[coll] = new this._collections[coll]();
          this[coll].parent = this;
        }
      },

      // Check that all required attributes are present
      _verifyRequired: function () {
        var attrs = this._getAttributes(true); // should include session
        for (var def in this._definition) {
          if (this._definition[def].required && typeof attrs[def] === 'undefined') {
            return false;
          }
        }
        return true;
      },

      _createPropertyDefinition: function (name, desc, isSession) {
        var self = this;
        var def = this._definition[name] = {};
        var type;
        if (_.isString(desc)) {
          // grab our type if all we've got is a string
          type = this._ensureValidType(desc);
          if (type) def.type = type;
        } else {
          type = this._ensureValidType(desc[0] || desc.type);
          if (type) def.type = type;
          if (desc[1] || desc.required) def.required = true;
          // set default if defined
          def.default = !_.isUndefined(desc[2]) ? desc[2] : desc.default;
          def.allowNull = desc.allowNull ? desc.allowNull : false;
          if (desc.setOnce) def.setOnce = true;
          if (def.required && _.isUndefined(def.default)) def.default = this._getDefaultForType(type);
          def.test = desc.test;
          def.values = desc.values;
        }
        if (isSession) def.session = true;

        // define a getter/setter on the prototype
        // but they get/set on the instance
        Object.defineProperty(self, name, {
          set: function (val) {
            this.set(name, val);
          },
          get: function () {
            var result = this._values[name];
            if (typeof result !== 'undefined') {
              if (dataTypes[def.type] && dataTypes[def.type].get) {
                result = dataTypes[def.type].get(result);
              }
              return result;
            }
            return def.default;
          }
        });

        return def;
      },

      // just makes friendlier errors when trying to define a new model
      // only used when setting up original property definitions
      _ensureValidType: function (type) {
        return _.contains(['string', 'number', 'boolean', 'array', 'object', 'date', 'any'].concat(_.keys(dataTypes)), type) ? type : undefined;
      },

      _getAttributes: function (includeSession, raw) {
        var res = {};
        var val, item, def;
        for (item in this._definition) {
          def = this._definition[item];
          if (!def.session || (includeSession && def.session)) {
            val = (raw) ? this._values[item] : this[item];
            if (typeof val === 'undefined') val = def.default;
            if (typeof val !== 'undefined') res[item] = val;
          }
        }
        return res;
      }
    });

    // Underscore methods that we want to implement on the Model.
    var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

    // Mix in each Underscore method as a proxy to `Model#attributes`.
    _.each(modelMethods, function (method) {
      HumanModel.prototype[method] = function () {
        var args = slice.call(arguments);
        args.unshift(this.attributes);
        return _[method].apply(_, args);
      };
    });

    for (key in spec) {
      if (key === 'props' || key === 'session') {
        _.each(spec[key], function (def, name) {
          HumanModel.prototype._createPropertyDefinition.call(HumanModel.prototype, name, def, key === 'session');
        });
        //HumanModel.prototype['_' + key] = spec[key];
      } else if (key === 'derived') {
        _.each(spec[key], function (def, name) {
          createDerivedProperty(HumanModel.prototype, name, def);
        });
      } else if (key === 'collections') {
        HumanModel.prototype._collections = spec[key];
      } else {
        HumanModel.prototype[key] = spec[key];
      }
    }

    HumanModel.registry = registry;

    return HumanModel;
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function (resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function () {
    throw new Error('A "url" property or function must be specified');
  };

  var out = {
    define: define,
    registry: registry,
    Registry: Registry,
    dataTypes: dataTypes
  };

  if (typeof exports !== 'undefined') {
    module.exports = out;
  } else {
    window.HumanModel = out;
  }

}).call(this);

define("human_model", ["backbone"], (function (global) {
    return function () {
        var ret, fn;
        return ret || global.HumanModel;
    };
}(this)));

(function() {
  define('cs!lib/api',['zepto'], function($) {
    var defaultErrorHander, defaultSuccessHandler, request, upload;
    request = function(url, args) {
      var data;
      if (args == null) {
        args = {};
      }
      if (window.GLOBALS.TOKEN) {
        data = {
          oauth_token: window.GLOBALS.TOKEN,
          v: window.GLOBALS.API_DATE
        };
      } else {
        data = {
          v: window.GLOBALS.API_DATE
        };
      }
      if (args.data) {
        _.extend(data, args.data);
      }
      console.debug("" + (args.requestMethod || 'GET') + " /" + url, data);
      return $.ajax({
        type: args.requestMethod || "GET",
        data: data,
        dataType: 'json',
        url: "" + window.GLOBALS.API_URL + url,
        success: args.success || defaultSuccessHandler,
        error: args.error || defaultErrorHander
      });
    };
    upload = function(url, postData) {
      var d, data, formData, k, v;
      if (postData == null) {
        postData = {};
      }
      d = $.Deferred();
      data = {
        oauth_token: window.GLOBALS.TOKEN,
        v: window.GLOBALS.API_DATE
      };
      if (postData) {
        _.extend(data, postData);
      }
      request = new XMLHttpRequest();
      formData = new FormData();
      for (k in data) {
        v = data[k];
        formData.append(k, v);
      }
      console.debug("UPLOAD (POST) /" + url, data);
      request.open('POST', "" + window.GLOBALS.API_URL + "photos/add", true);
      request.responseType = 'json';
      request.addEventListener('error', d.reject);
      request.addEventListener('readystatechange', function() {
        if (request.readyState === 4) {
          return d.resolve(request.response);
        }
      });
      request.send(formData);
      return d.promise();
    };
    defaultErrorHander = function(xhr, errorType, error) {
      return console.error("Foursquare API Error | " + xhr.status, xhr, errorType, error);
    };
    defaultSuccessHandler = function(response, status, xhr) {
      return console.info("Foursquare API Response | " + xhr.status, response, xhr);
    };
    return {
      request: request,
      upload: upload
    };
  });

}).call(this);

(function() {
  define('cs!models/checkin',['human_model'], function(HumanModel) {
    
    var Checkin;
    Checkin = HumanModel.define({
      type: "checkin",
      props: {
        id: {
          setOnce: true,
          type: "string"
        },
        comments: ['object'],
        photos: ['object'],
        source: ['object'],
        user: ['object'],
        venue: ['object'],
        shout: ['string'],
        createdAt: ['date'],
        isFromFriend: ['boolean', true, false],
        lastUpdated: ["number"],
        isFullObject: ['boolean', true, false]
      },
      derived: {
        location: {
          deps: ['venue'],
          fn: function() {
            return this.venue.location;
          }
        },
        url: {
          deps: ['id'],
          fn: function() {
            return "#/checkins/" + this.id;
          }
        }
      },
      session: {
        response: ["object"]
      },
      isOutdated: function() {
        return this.lastUpdated + (window.GLOBALS.HOUR * 12) < window.timestamp();
      }
    });
    return Checkin;
  });

}).call(this);

(function() {
  define('cs!models/user',['zepto', 'cs!lib/geo', 'human_model', 'cs!lib/api', 'cs!models/checkin'], function($, Geo, HumanModel, API, Checkin) {
    
    var CONSTANTS, User;
    CONSTANTS = {
      RELATIONSHIP: {
        SELF: 'self',
        FRIEND: 'friend',
        REQUEST_SENT: 'pendingMe',
        REQUEST_RECEIVED: 'pendingThem',
        FOLLOWING: 'followingThem',
        NONE: null
      },
      TYPE: {
        USER: null,
        PAGE: 'page',
        CHAIN: 'chain',
        CELEBRITY: 'celebrity',
        VENUE: 'venuePage'
      }
    };
    User = HumanModel.define({
      type: "user",
      props: {
        id: {
          setOnce: true,
          type: "string"
        },
        firstName: ['string'],
        lastName: ['string'],
        photo: ['object'],
        relationship: {
          allowNull: true,
          "default": CONSTANTS.RELATIONSHIP.NONE,
          type: "string"
        },
        type: {
          allowNull: true,
          "default": CONSTANTS.TYPE.USER,
          type: "string"
        },
        homeCity: ['string'],
        gender: ['string'],
        bio: ['string'],
        checkins: ['object'],
        currentLocation: ['object'],
        access_token: ['string', true],
        lastUpdated: ["number"]
      },
      derived: {
        name: {
          deps: ['firstName', 'lastName'],
          fn: function() {
            var nameString;
            nameString = "";
            if (this.firstName) {
              nameString += this.firstName;
            }
            if (this.lastName) {
              nameString += " " + this.lastName;
            }
            return nameString;
          }
        }
      },
      checkIn: function(venue, shout) {
        var d,
          _this = this;
        if (shout == null) {
          shout = null;
        }
        d = $.Deferred();
        Geo.getCurrentPosition().done(function(position, latLng, accuracy) {
          var postData;
          postData = {
            venueId: venue
          };
          if (!position.code && position.coords) {
            _.extend(postData, {
              ll: "" + latLng.lat + "," + latLng.lng,
              llAcc: accuracy
            });
          }
          if (shout && shout.length) {
            _.extend(postData, {
              shout: shout
            });
          }
          return API.request('checkins/add', {
            data: postData,
            requestMethod: "POST"
          }).done(function(data) {
            var checkin;
            _this.currentLocation = {
              timestamp: window.timestamp(),
              venue: data.response.checkin.venue
            };
            _this.save();
            checkin = new Checkin(data.response.checkin);
            checkin.isFromFriend = true;
            checkin.response = data.response;
            window.GLOBALS.Checkins.add(checkin);
            checkin.save();
            return d.resolve(checkin);
          });
        });
        return d.promise();
      },
      isOutdated: function() {
        return this.lastUpdated + window.GLOBALS.HOUR < window.timestamp();
      },
      profilePhoto: function(size) {
        if (size == null) {
          size = 100;
        }
        if (!this.photo) {
          return "";
        }
        return "" + this.photo.prefix + size + "x" + size + this.photo.suffix;
      }
    });
    return _.extend(User, CONSTANTS);
  });

}).call(this);

/**
 * Adapted from the official plugin text.js
 *
 * Uses UnderscoreJS micro-templates : http://documentcloud.github.com/underscore/#template
 * @author Julien Cabanès <julien@zeeagency.com>
 * @version 0.2
 * 
 * @license RequireJS text 0.24.0 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
/*jslint regexp: false, nomen: false, plusplus: false, strict: false */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false */

(function () {
    var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
    
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        
        buildMap = [],
        
        templateSettings = {
            evaluate    : /<%([\s\S]+?)%>/g,
            interpolate : /<%=([\s\S]+?)%>/g
        },

        /**
         * JavaScript micro-templating, similar to John Resig's implementation.
         * Underscore templating handles arbitrary delimiters, preserves whitespace,
         * and correctly escapes quotes within interpolated code.
         */
        template = function(str, data) {
            var c  = templateSettings;
            var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
                'with(obj||{}){__p.push(\'' +
                str.replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(c.interpolate, function(match, code) {
                    return "'," + code.replace(/\\'/g, "'") + ",'";
                    })
                    .replace(c.evaluate || null, function(match, code) {
                    return "');" + code.replace(/\\'/g, "'")
                                        .replace(/[\r\n\t]/g, ' ') + "; __p.push('";
                    })
                    .replace(/\r/g, '')
                    .replace(/\n/g, '')
                    .replace(/\t/g, '')
                    + "');}return __p.join('');";
            return tmpl;
            
            /** /
            var func = new Function('obj', tmpl);
            return data ? func(data) : func;
            /**/
        };

    define('tpl',[],function () {
        var tpl;

        var get, fs;
        if (typeof window !== "undefined" && window.navigator && window.document) {
            get = function (url, callback) {
                
                var xhr = tpl.createXhr();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function (evt) {
                    //Do not explicitly handle errors, those should be
                    //visible via console output in the browser.
                    if (xhr.readyState === 4) {
                        callback(xhr.responseText);
                    }
                };
                xhr.send(null);
            };
        } else if (typeof process !== "undefined" &&
                process.versions &&
                !!process.versions.node) {
            //Using special require.nodeRequire, something added by r.js.
            fs = require.nodeRequire('fs');

            get = function (url, callback) {
                
                callback(fs.readFileSync(url, 'utf8'));
            };
        }
        return tpl = {
            version: '0.24.0',
            strip: function (content) {
                //Strips <?xml ...?> declarations so that external SVG and XML
                //documents can be added to a document without worry. Also, if the string
                //is an HTML document, only the part inside the body tag is returned.
                if (content) {
                    content = content.replace(xmlRegExp, "");
                    var matches = content.match(bodyRegExp);
                    if (matches) {
                        content = matches[1];
                    }
                } else {
                    content = "";
                }
                
                return content;
            },

            jsEscape: function (content) {
                return content.replace(/(['\\])/g, '\\$1')
                    .replace(/[\f]/g, "\\f")
                    .replace(/[\b]/g, "\\b")
                    .replace(/[\n]/g, "")
                    .replace(/[\t]/g, "")
                    .replace(/[\r]/g, "");
            },

            createXhr: function () {
                //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
                var xhr, i, progId;
                if (typeof XMLHttpRequest !== "undefined") {
                    return new XMLHttpRequest();
                } else {
                    for (i = 0; i < 3; i++) {
                        progId = progIds[i];
                        try {
                            xhr = new ActiveXObject(progId);
                        } catch (e) {}

                        if (xhr) {
                            progIds = [progId];  // so faster next time
                            break;
                        }
                    }
                }

                if (!xhr) {
                    throw new Error("require.getXhr(): XMLHttpRequest not available");
                }

                return xhr;
            },

            get: get,

            load: function (name, req, onLoad, config) {
                
                //Name has format: some.module.filext!strip
                //The strip part is optional.
                //if strip is present, then that means only get the string contents
                //inside a body tag in an HTML string. For XML/SVG content it means
                //removing the <?xml ...?> declarations so the content can be inserted
                //into the current doc without problems.

                var strip = false, url, index = name.indexOf("."),
                    modName = name.substring(0, index),
                    ext = name.substring(index + 1, name.length);

                index = ext.indexOf("!");
                
                if (index !== -1) {
                    //Pull off the strip arg.
                    strip = ext.substring(index + 1, ext.length);
                    strip = strip === "strip";
                    ext = ext.substring(0, index);
                }

                //Load the tpl.
                url = 'nameToUrl' in req ? req.nameToUrl(modName, "." + ext) : req.toUrl(modName + "." + ext);
                
                tpl.get(url, function (content) {
                    content = template(content);
                    
                    if(!config.isBuild) {
                    //if(typeof window !== "undefined" && window.navigator && window.document) {
                        content = new Function('obj', content);
                    }
                    content = strip ? tpl.strip(content) : content;
                    
                    if (config.isBuild && config.inlineText) {
                        buildMap[name] = content;
                    }
                    onLoad(content);
                });

            },

            write: function (pluginName, moduleName, write) {
                if (moduleName in buildMap) {
                    var content = tpl.jsEscape(buildMap[moduleName]);
                    write("define('" + pluginName + "!" + moduleName  +
                        "', function() {return function(obj) { " +
                            content.replace(/(\\')/g, "'").replace(/(\\\\)/g, "\\")+
                        "}});\n");
                }
            }
        };
        return function() {};   
    });
//>>excludeEnd('excludeTpl')
}());

define('tpl!templates/app.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<x-layout>  <x-appbar>    <div id="back" class="text">', l('Back') ,'</div>    <header></header>    <div id="explore-link" class="text">', l('Explore') ,'</div>  </x-appbar>  <div id="content"></div></x-layout>');}return __p.join('');}});

(function() {
  define('cs!views/app',['zepto', 'underscore', 'backbone', 'brick', 'cs!models/user', 'tpl!templates/app.html.ejs'], function($, _, Backbone, xtag, User, AppTemplate) {
    
    var AppView;
    return AppView = Backbone.View.extend({
      currentView: null,
      el: 'body',
      $el: $('body'),
      template: AppTemplate,
      events: {
        'click #back': 'goBack',
        'click #explore-link': 'explore',
        'click #full-modal .accept': 'destroyFullModal',
        'click #full-modal-bg': 'destroyFullModal',
        'longTap #back': 'goToTimeline'
      },
      initialize: function() {
        var _this = this;
        _.bindAll(this);
        this.render();
        this._resizeContent();
        this._resizing = false;
        return $(window).on('resize', function() {
          if (_this._resizing) {
            return;
          }
          _this._resizing = true;
          return setTimeout(_this._resizeContent, 300);
        });
      },
      render: function() {
        $(this.$el).html(this.template);
        return window.GLOBALS.Users.fetch().done(this._checkForSelfUser);
      },
      destroyFullModal: function() {
        this.trigger('destroy:modal');
        return $('#full-modal,#full-modal-bg').remove();
      },
      explore: function() {
        return window.router.navigate('explore', {
          replace: false,
          trigger: true
        });
      },
      goBack: function() {
        return window.history.back();
      },
      goToTimeline: function() {
        return window.router.navigate('', {
          replace: true,
          trigger: true
        });
      },
      _checkForSelfUser: function() {
        if (this.selfUser || window.location.hash.match('access_token=')) {
          return;
        }
        this.selfUser = window.GLOBALS.Users.getSelf();
        if (!this.selfUser) {
          console.info("No user with relationship: RELATIONSHIP_SELF found");
          return window.location.hash = "login";
        }
      },
      _resizeContent: function() {
        $('#content').css('min-height', $(window).height() - $('x-appbar').height());
        return this._resizing = false;
      }
    });
  });

}).call(this);

(function() {
  define('cs!models/venue',["zepto", "cs!lib/api", "human_model"], function($, API, HumanModel) {
    
    var CONSTANTS, Venue;
    CONSTANTS = {
      PHOTOS_RETURNED_FROM_GET_CALL: 6,
      SECTIONS: {
        "Everything": null,
        "Food": "food",
        "Drinks": "drinks",
        "Coffee": "coffee",
        "Shopping": "shops",
        "Arts": "arts",
        "Outdoors": "outdoors",
        "Sights": "sights",
        "Trending": "trending",
        "Specials": "specials",
        "Where to go next?": "nextVenues",
        "Top Picks": "topPicks"
      }
    };
    Venue = HumanModel.define({
      type: "venue",
      initialize: function(data) {
        if (data.attributes) {
          return this._attributes = data.attributes;
        }
      },
      props: {
        id: {
          setOnce: true,
          type: "string"
        },
        name: ["string"],
        location: [
          "object", true, {
            lat: null,
            lng: null
          }
        ],
        _attributes: ["object"],
        categories: ["array"],
        price: ["object"],
        verified: ["boolean", true, false],
        mayor: ["object"],
        shortUrl: ["string"],
        canonicalUrl: ["string"],
        photos: ["array"],
        likes: ["object"],
        like: ["boolean"],
        dislike: ["boolean"],
        lastUpdated: ["number"],
        isFullObject: ['boolean', true, false]
      },
      derived: {
        info: {
          deps: ['_attributes'],
          fn: function() {
            if (!this._attributes.groups) {
              return [];
            }
            return _.map(this._attributes.groups, function(group) {
              return {
                name: group.items[0].displayName,
                value: group.items[0].displayValue
              };
            });
          }
        },
        streetAddress: {
          deps: ['location'],
          fn: function() {
            var crossStreet;
            if (!this.location.address) {
              return null;
            }
            crossStreet = this.location.crossStreet ? " (" + this.location.crossStreet + ")" : "";
            return "" + this.location.address + crossStreet;
          }
        },
        url: {
          deps: ['id'],
          fn: function() {
            return "#/venues/" + this.id;
          }
        },
        urlForTips: {
          deps: ['id'],
          fn: function() {
            return "#/venues/" + this.id + "/tips";
          }
        }
      },
      addPhoto: function(photo, postData) {
        var d,
          _this = this;
        if (postData == null) {
          postData = {};
        }
        d = $.Deferred();
        if (photo.size > 5000000) {
          d.reject(l("Photo is too large; maximum photo size is 5MB."));
          return d.promise();
        }
        if (photo.type === 'image/jpg') {
          d.reject(l("Photo file must be JPEG."));
          return d.promise();
        }
        API.upload("photos/add", {
          photo: photo,
          venueId: this.id
        }).done(function(data) {
          if (data.response.photo) {
            _this.photos.push(data.response.photo);
            _this.save();
            return d.resolve(data.response.photo);
          } else {
            return d.reject(l("Upload failed. Please try again."));
          }
        }).fail(function() {
          return d.reject(l("Upload failed. Please try again."));
        });
        return d.promise();
      },
      changeDislike: function(forceRemove) {
        var action,
          _this = this;
        if (forceRemove == null) {
          forceRemove = false;
        }
        action = this.dislike || forceRemove ? '0' : '1';
        return API.request("venues/" + this.id + "/dislike", {
          data: {
            action: action
          },
          requestMethod: "POST"
        }).done(function(data) {
          if (_this.like && action === '1') {
            _this.changeLike(true);
          }
          _this.dislike = !_this.dislike;
          return _this.save();
        });
      },
      changeLike: function(forceRemove) {
        var action,
          _this = this;
        if (forceRemove == null) {
          forceRemove = false;
        }
        action = this.like || forceRemove ? '0' : '1';
        return API.request("venues/" + this.id + "/like", {
          data: {
            action: action
          },
          requestMethod: "POST"
        }).done(function(data) {
          if (_this.dislike && action === '1') {
            _this.changeDislike(true);
          }
          _this.likes = data.response;
          return _this.like = !_this.like;
        });
      },
      getPhotos: function() {
        var _this = this;
        return API.request("venues/" + this.id + "/photos").done(function(data) {
          if (data.response.photos && data.response.photos.items) {
            _this.photos = data.response.photos.items;
          } else {
            _this.photos = [];
          }
          return _this.save();
        });
      },
      hours: function() {
        var d;
        d = $.Deferred();
        API.request("venues/" + this.id + "/hours").done(function(data) {
          var hours, popular;
          hours = {};
          popular = {};
          if (data.response && data.response.hours.length) {
            data.response.hours.forEach(function(day) {
              hours[day.days[0]] = [];
              return day.open.forEach(function(segment) {
                return hours[day.days[0]].push({
                  closes: segment.end,
                  opens: segment.start
                });
              });
            });
          }
          if (data.response && data.response.popular.timeframes.length) {
            data.response.popular.timeframes.forEach(function(day) {
              popular[day.days[0]] = [];
              return day.open.forEach(function(segment) {
                return popular[day.days[0]].push({
                  closes: segment.end,
                  opens: segment.start
                });
              });
            });
          }
          return d.resolve({
            hours: hours,
            popular: popular
          });
        }).fail(function() {
          return d.reject();
        });
        return d.promise();
      },
      isOutdated: function() {
        return this.lastUpdated + window.GLOBALS.HOUR < window.timestamp();
      },
      photo: function(index) {
        if (index == null) {
          index = 0;
        }
        if (!(this.photos.length && this.photos[index])) {
          return null;
        }
        return "" + this.photos[index].prefix + this.photos[index].width + "x" + this.photos[index].height + this.photos[index].suffix;
      },
      tips: function() {
        return window.GLOBALS.Tips.getForVenue(this.id);
      },
      session: {
        flags: [
          "object", false, {
            outsideRadius: false,
            exactMatch: false
          }
        ],
        hereNow: ["object"]
      }
    });
    return _.extend(Venue, CONSTANTS);
  });

}).call(this);

define('tpl!templates/modal.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (isFullModal) { ; __p.push('  <div id="full-modal-bg"></div>'); } ; __p.push('<div '); if (isFullModal) { ; __p.push('id="full-modal"'); } ; __p.push(' class="modal '); if (!isFullModal) { ; __p.push('standard'); } ; __p.push('">  <div class="content">    ', fixedContent ,'    ', templateHTML ,'  </div>  '); if (isFullModal) { ; __p.push('    <div class="accept">', l('Cancel') ,'</div>  '); } ; __p.push('</div>');}return __p.join('');}});

(function() {
  define('cs!views/modal',['zepto', 'underscore', 'backbone', 'tpl!templates/modal.html.ejs'], function($, _, Backbone, ModalTemplate) {
    
    var ModalView;
    ModalView = Backbone.View.extend({
      _el: '#modal-content',
      fixedContent: '',
      isFullModal: false,
      modal: null,
      events: {
        "click .cancel": "dismiss"
      },
      initialize: function() {
        if (this.isFullModal) {
          if ($('#full-modal').length) {
            return;
          }
        } else {
          if ($('.modal.standard').length) {
            return;
          }
        }
        _.bindAll(this);
        $('body').append(ModalTemplate({
          element: this._el,
          fixedContent: this.fixedContent,
          isFullModal: this.isFullModal,
          templateHTML: "<div id=\"" + (this._el.replace('#', '')) + "\">" + (this.template(this._templateData())) + "</div>"
        }));
        this.setElement(this._el);
        if (this._initialize) {
          this._initialize();
        }
        return this.render();
      },
      render: function() {
        var html;
        html = this.template(this._templateData());
        this.$el.html(html);
        if (this._render) {
          return this._render();
        }
      },
      dismiss: function() {
        var $parent;
        $parent = this.$el.parent().parent();
        this.remove();
        return $parent.remove();
      },
      _templateData: function() {
        return {};
      }
    });
    return ModalView;
  });

}).call(this);

define('tpl!templates/checkins/confirm.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div>  <h2>', venue.name ,'</h2>  <label for="checkin-comment" class="hide">', l('Comment on your check-in') ,'</label>  <textarea id="checkin-comment" placeholder="', l('What are you up to?') ,'" maxlength="140"></textarea></div><button class="cancel">', l('Cancel') ,'</button><button class="accept" data-venue="', venue.id ,'">', l('Check in') ,'</button>');}return __p.join('');}});

define('tpl!templates/checkins/create-from-venues.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (position && venues && venues.length) { ; __p.push('  <ul>    '); venues.forEach(function(venue) { ; __p.push('      ', VenueShowListItemTemplate({        showLink: false,        venue: venue      }) ,'    '); }) ; __p.push('  </ul>'); } else if (position && venues === null) { ; __p.push('  <p id="loading-text">', l('No venues found.') ,'</p>'); } else if (position) { ; __p.push('  <p id="loading-text">', l('Finding places near you.') ,'<span class="circle-small"></span></p>'); } else { ; __p.push('  <p id="loading-text">', l('Getting your location.') ,'<span class="circle-small"></span></p>'); } ; __p.push('');}return __p.join('');}});

define('tpl!templates/checkins/header.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="area-container">  <p class="data-attribution">', ('Data from ') ,'<a href="https://foursquare.com/" target="_blank">Foursquare</a></p>  <form class="venue-search" autocomplete="off">    <label class="hide" for="venue-search">', l('Search for a venue') ,'</label>    <input type="search" id="venue-search" value="', venueSearchValue ,'" placeholder="', l('Search places') ,'">    <button type="reset"><i class="fa fa-times"></i></button>    <button type="submit"><i class="fa fa-search"></i></button>  </form></div>');}return __p.join('');}});

define('tpl!templates/checkins/insight.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<h2>', l('Right on!') ,'</h2><p>  ', l("We have you checked in at") ,' <br>  <strong>', checkin.venue.name ,'</strong>!</p>'); if (checkin.response.checkin.score.total) { ; __p.push('  <ul class="points">    '); checkin.response.checkin.score.scores.forEach(function (score) { ; __p.push('      <li><img src="', score.icon ,'"> ', score.message ,' <strong>+', score.points ,'</strong></li>    '); }) ; __p.push('  </ul>'); } else { ; __p.push('  <p class="points">', l('Awwww, no points for this checkin.') ,'</p>'); } ; __p.push('<button class="cancel">', l('Dismiss') ,'</button>');}return __p.join('');}});

define('tpl!templates/checkins/show.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="checkin">  <a href="#venues/', checkin.venue.id ,'" class="arrow"><i class="fa fa-arrow-circle-o-right"></i></a>  '); if (checkin.user) { ; __p.push('    <a href="#users/', checkin.user.id ,'">      <img src="', checkin.user.photo.prefix ,'100x100', checkin.user.photo.suffix ,'" alt="', checkin.user.firstName ,'" class="profile-photo">      <h3 class="user">', checkin.user.firstName ,'</h3>    </a>  '); } ; __p.push('  <h2 class="venue"><a href="#venues/', checkin.venue.id ,'">', checkin.venue.name ,'</a></h2>  <h4><time datetime="', window.moment.unix(checkin.createdAt).format() ,'">', window.moment.unix(checkin.createdAt).fromNow() ,'</time></h4>    '); if (checkin.shout) { ; __p.push('    <p class="shout">', checkin.shout ,'</p>  '); } ; __p.push('</div>');}return __p.join('');}});

define('tpl!templates/venues/show-list-item.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<li class="venue" data-venue="', venue.id ,'">  '); if (showLink) { ; __p.push('<a href="', venue.url ,'">'); } ; __p.push('    '); if (venue.photos && venue.photos.length) { ; __p.push('      <div class="photo">        <img src="', venue.photo() ,'">      </div>    '); } else if (venue.categories && venue.categories.length && venue.categories[0].icon) { ; __p.push('      <div class="icon">        <img src="', venue.categories[0].icon.prefix ,'88', venue.categories[0].icon.suffix ,'">      </div>    '); } else { ; __p.push('      <div class="icon">        <i class="fa fa-question"></i>      </div>    '); } ; __p.push('    <span class="arrow" data-venue="', venue.id ,'"><i class="fa fa-arrow-circle-o-right"></i></span>    <h3>', venue.name ,'</h3>    '); if (venue.location.address) { ; __p.push('      <h4>', venue.location.address ,'</h4>    '); } ; __p.push('    '); if (venue.location.distance) { ; __p.push('      <h4>', window.distance(venue.location.distance) ,'</h4>    '); } ; __p.push('    '); if (venue.hereNow && venue.hereNow.count) { ; __p.push('      <p>        ', venue.hereNow.count ,'        '); if (venue.hereNow.count == 1) { ; __p.push('          ', l('person is here.') ,'        '); } else { ; __p.push('          ', l('people are here.') ,'        '); } ; __p.push('      </p>    '); } ; __p.push('  '); if (showLink) { ; __p.push('</a>'); } ; __p.push('</li>');}return __p.join('');}});

(function() {
  define('cs!views/checkins',['zepto', 'underscore', 'backbone', 'cs!lib/api', 'cs!lib/geo', 'cs!models/checkin', 'cs!models/venue', 'cs!views/modal', 'tpl!templates/checkins/confirm.html.ejs', 'tpl!templates/checkins/create-from-venues.html.ejs', 'tpl!templates/checkins/header.html.ejs', 'tpl!templates/checkins/insight.html.ejs', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/venues/show-list-item.html.ejs'], function($, _, Backbone, API, Geo, Checkin, Venue, ModalView, ConfirmTemplate, CreateFromVenuesTemplate, HeaderTemplate, InsightTemplate, ShowTemplate, VenueShowListItemTemplate) {
    
    var ConfirmView, CreateView, InsightModalView, ModalFromVenuesView, ShowView;
    ConfirmView = ModalView.extend({
      _el: '#confirm-checkin',
      model: Venue,
      template: ConfirmTemplate,
      events: {
        "click .accept": "checkInToVenue",
        "click .cancel": "dismiss"
      },
      checkInToVenue: function() {
        window.app.destroyFullModal();
        new CreateView({
          shout: $('#checkin-comment').val(),
          venueID: this.model.id
        });
        return this.dismiss();
      },
      _templateData: function() {
        return {
          venue: this.model
        };
      }
    });
    CreateView = Backbone.View.extend({
      initialize: function() {
        var user,
          _this = this;
        if (!user) {
          user = window.GLOBALS.Users.getSelf();
        }
        return user.checkIn(this.options.venueID, this.options.shout).done(function(checkin) {
          window.router.navigate("/venues/" + checkin.venue.id, {
            replace: true,
            trigger: true
          });
          return new InsightModalView({
            _el: '#checkin-insight',
            model: checkin
          });
        });
      }
    });
    InsightModalView = ModalView.extend({
      model: Checkin,
      template: InsightTemplate,
      _templateData: function() {
        return {
          checkin: this.model
        };
      }
    });
    ModalFromVenuesView = ModalView.extend({
      fixedContent: '<div id="map"></div>',
      headerLocation: null,
      isFullModal: true,
      map: null,
      position: null,
      searchResult: null,
      section: null,
      template: CreateFromVenuesTemplate,
      user: null,
      venueSearchValue: '',
      venues: [],
      venueMarkers: [],
      _cancelMap: false,
      _originalVenues: [],
      _preventModal: false,
      _skipResetCheck: false,
      events: {
        "longTap .venue .arrow": "goToVenue",
        "click .venue": "showCheckinOptions",
        "longTap .venue": "checkInToVenue"
      },
      _initialize: function() {
        return Geo.getCurrentPosition().done(this._geoSuccess).fail(this._geoError);
      },
      _render: function() {
        var bounds, latLngBounds,
          _this = this;
        if (!$('.modal .area-container').length) {
          $('#modal-content').before(HeaderTemplate(this._templateData()));
        }
        $('.modal .area-container .venue-search').on('reset', this.resetSearch);
        $('.modal .area-container #venue-search').on('blur', this.blurSearch);
        $('.modal .area-container #venue-search').on('focus', this.focusSearch);
        $('.modal .area-container #venue-search').on('input', this.checkSearchInputLength);
        $('.modal .area-container #venue-search').on('input', this.searchForVenue);
        this.checkSearchInputLength();
        if (this.position && this.venues && this.venues.length) {
          bounds = new L.Bounds();
          this.venueMarkers.forEach(function(marker) {
            return _this.map.removeLayer(marker);
          });
          _.first(this.venues, 5).forEach(function(v) {
            var marker;
            marker = L.marker([v.location.lat, v.location.lng]);
            marker.addTo(_this.map);
            _this.venueMarkers.push(marker);
            return bounds.extend([v.location.lat, v.location.lng]);
          });
          latLngBounds = new L.LatLngBounds([[bounds.min.x, bounds.min.y], [bounds.max.x, bounds.max.y]]);
          return this.map.fitBounds(latLngBounds, {
            padding: [25, 25]
          });
        }
      },
      blurSearch: function() {
        return setTimeout(function() {
          return $('#map').removeClass('hide-on-mobile');
        }, 300);
      },
      changeSectionSearch: function(event) {
        this.section = $(event.target).children('option')[event.target.selectedIndex].value;
        this.venues = [];
        this.getVenues();
        return this.render();
      },
      checkInToVenue: function(event) {
        if (this._preventModal) {
          return;
        }
        window.app.destroyFullModal();
        return new CreateView({
          venueID: $(event.currentTarget).data('venue')
        });
      },
      checkSearchInputLength: function(event) {
        var $input;
        if (this._skipResetCheck) {
          this._skipResetCheck = false;
          return;
        }
        $input = event ? $(event.target) : $('#venue-search');
        if (!$input.length) {
          return;
        }
        if ($input.val().length) {
          return $('.venue-search button[type=reset]').addClass('visible');
        } else {
          return this.resetSearch();
        }
      },
      focusSearch: function() {
        return $('#map').addClass('hide-on-mobile');
      },
      getVenues: function() {
        var _this = this;
        if (!this.position) {
          return;
        }
        return window.GLOBALS.Venues.near({
          ll: "" + this.position.coords.latitude + "," + this.position.coords.longitude,
          accuracy: this.position.coords.accuracy
        }, this.section).done(function(venues) {
          var $areaContainer;
          _this.venues = venues;
          $areaContainer = $('.modal .area-container');
          if ($areaContainer.length) {
            $areaContainer.replaceWith(HeaderTemplate(_this._templateData()));
          }
          if (_this.venues.length) {
            _this._originalVenues = _this.venues;
            return _this.render();
          } else {
            console.info("Nothing available for " + _this.section + "; searching for everything instead.");
            _this.section = null;
            return _this.getVenues();
          }
        }).fail(function() {
          return window.alert("Error getting venues!");
        });
      },
      goToVenue: function(event) {
        this._preventModal = true;
        event.stopPropagation();
        window.app.destroyFullModal();
        return window.router.navigate("venues/" + ($(event.currentTarget).data('venue')), {
          replace: false,
          trigger: true
        });
      },
      loadOldVenues: function() {
        if (this._originalVenues.length) {
          this.venues = this._originalVenues;
          this._skipResetCheck = true;
          return this.render();
        }
      },
      resetSearch: function() {
        $('#venue-search').val('');
        $('.venue-search button[type=reset]').removeClass('visible');
        this._skipResetCheck = true;
        this.checkSearchInputLength();
        return this.loadOldVenues();
      },
      searchForVenue: function(event) {
        var searchQuery,
          _this = this;
        searchQuery = $("#venue-search").val();
        if (!searchQuery.length) {
          return;
        }
        if (event && $(event.target).attr('id') === 'venue-search') {
          if (!(searchQuery.length >= window.GLOBALS.CHARACTERS_FOR_AUTOCOMPLETE)) {
            return;
          }
        }
        if (this.searchRequest) {
          this.searchRequest._request.abort();
        }
        return this.searchRequest = window.GLOBALS.Venues.search({
          intent: 'checkin',
          ll: "" + this.position.coords.latitude + "," + this.position.coords.longitude,
          query: searchQuery
        }).done(function(venues) {
          _this.venues = venues;
          _this.searchRequest = null;
          _this._getPhotosForVenues(_this.venues);
          return _this.render();
        });
      },
      showCheckinOptions: function(event) {
        if (this._preventModal) {
          return;
        }
        return window.GLOBALS.Venues.get($(event.currentTarget).data('venue')).done(function(venue) {
          return new ConfirmView({
            model: venue
          });
        });
      },
      showMap: function() {
        this.map = L.mapbox.map('map', window.GLOBALS.MAP_ID, {
          zoomControl: false
        }).setView([this.position.coords.latitude, this.position.coords.longitude], 14);
        this.map.dragging.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
        this.map.scrollWheelZoom.disable();
        if (this.map.tap) {
          return this.map.tap.disable();
        }
      },
      _cleanUpMap: function() {
        this._cancelMap = true;
        return this.map.remove();
      },
      _geoSuccess: function(position, coords, accuracy) {
        this.position = position;
        this.showMap();
        this.getVenues();
        return this.render();
      },
      _geoError: function() {},
      _getPhotosForVenues: function(venues) {
        var _this = this;
        return _.first(venues, window.GLOBALS.SEARCH_NUMBER_VENUES_WITH_PHOTO).forEach(function(v) {
          if (!v.photos) {
            return v.getPhotos().done(_this.render);
          }
        });
      },
      _templateData: function() {
        return {
          headerLocation: this.headerLocation,
          sectionEnabled: this.section,
          sections: Venue.SECTIONS,
          position: this.position,
          VenueShowListItemTemplate: VenueShowListItemTemplate,
          venues: this.venues,
          venueSearchValue: $('#venue-search').val()
        };
      }
    });
    ShowView = Backbone.View.extend({
      template: ShowTemplate
    });
    return {
      ConfirmModal: ConfirmView,
      Create: CreateView,
      InsightModal: InsightModalView,
      ModalFromVenues: ModalFromVenuesView
    };
  });

}).call(this);

define('tpl!templates/timeline/show.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="map" '); if (mapURL) { ; __p.push('style="background-image: url(\'', mapURL ,'\')"'); } ; __p.push('></div><h1 class="happening">  ', l("What's Happening") ,'  '); if (loadingCheckins) { ; __p.push('    <span class="circle-small"></span>  '); } else { ; __p.push('    <span class="refresh"><i class="fa fa-refresh"><span class="hide">', l('Refresh') ,'</span></i></span>  '); } ; __p.push('</h1><x-tabbar>  <x-tabbar-tab data-scope="nearby" data-target-selector="#timeline .nearby" '); if (scope === 'nearby') {; __p.push('class="active"'); } ; __p.push('>', l('Near me') ,'</x-tabbar-tab>  <x-tabbar-tab data-scope="worldwide" data-target-selector="#timeline .worldwide" '); if (scope === 'worldwide') {; __p.push('class="active"'); } ; __p.push('>', l('Worldwide') ,'</x-tabbar-tab></x-tabbar><x-slidebox orientation="x">  <x-slides>    <x-slide class="nearby '); if (scope === 'nearby') {; __p.push('active'); } ; __p.push('">      '); if (nearbyCheckins && !nearbyCheckins.length) { ; __p.push('        <div class="checkin">          <h1>', l('No friends are nearby.') ,'</h1>          <p>', l('Tap “Worldwide” to see all of your friend’s recent checkins.') ,'</p>        </div>      '); } else { ; __p.push('        '); for (var i in nearbyCheckins) { ; __p.push('          ', CheckinShowTemplate({checkin: nearbyCheckins[i]}) ,'        '); } ; __p.push('      '); } ; __p.push('    </x-slide>    <x-slide class="worldwide '); if (scope === 'worldwide') {; __p.push('active'); } ; __p.push('">      '); for (var i in checkins) { ; __p.push('        ', CheckinShowTemplate({checkin: checkins[i]}) ,'      '); } ; __p.push('    </x-slide>  </x-slides></x-slidebox><p class="attribution">', l('Data from ') ,'<a href="https://foursquare.com/" target="_blank">Foursquare</a>.<!-- <a href="#learn-more-link">', l('Learn more') ,'</a>--></p><footer>  <button class="check-in">', l('Check In') ,'</button></footer>');}return __p.join('');}});

(function() {
  define('cs!views/timeline',['zepto', 'underscore', 'backbone', 'moment', 'cs!lib/geo', 'cs!views/checkins', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], function($, _, Backbone, moment, Geo, CheckinViews, CheckinShowTemplate, TimelineShowTemplate) {
    
    var ShowView;
    ShowView = Backbone.View.extend({
      el: "#timeline",
      $el: $("#timeline"),
      modal: false,
      template: TimelineShowTemplate,
      fixedContent: '<div id="timeline"></div>',
      checkins: null,
      loadingCheckins: true,
      mapURL: null,
      nearbyCheckins: null,
      _timeoutForRefresh: null,
      _timeoutLength: 30000,
      events: {
        'click #timeline .check-in': 'showCheckinModal',
        'click #timeline .happening': 'refreshFriendsCheckins',
        'click x-tabbar-tab': 'toggleTabs'
      },
      initialize: function() {
        var _this = this;
        _.bindAll(this);
        $('#content').html(this.fixedContent);
        this.setElement('#timeline');
        this.user = window.GLOBALS.Users.getSelf();
        Geo.getCurrentPosition().done(function(position, latLng) {
          _this.mapURL = Geo.staticMap([latLng.lat, latLng.lng], [[latLng.lat, latLng.lng, _this.user.profilePhoto()]], 13, [$(window).width(), 100]);
          return _this.render();
        });
        window.GLOBALS.Checkins.recent().done(this.loadCheckins);
        return this.render();
      },
      render: function() {
        var html;
        html = this.template({
          checkins: this.checkins,
          CheckinShowTemplate: CheckinShowTemplate,
          loadingCheckins: this.loadingCheckins,
          mapURL: this.mapURL,
          nearbyCheckins: this.nearbyCheckins,
          scope: this.options.scope,
          user: this.user
        });
        return this.$el.html(html);
      },
      destroyCheckinModal: function() {
        this.checkinView.remove();
        delete this.checkinView;
        return window.app.off('destroy:modal', this.destroyCheckinModal);
      },
      loadCheckins: function(checkins) {
        var _this = this;
        this.checkins = checkins;
        Geo.filterNearby(checkins).done(function(nearby) {
          _this.nearbyCheckins = nearby;
          _this.loadingCheckins = false;
          _this.render();
          if (!_this.nearbyCheckins || _this.nearbyCheckins.length === 0) {
            return window.router.navigate("worldwide", {
              replace: true,
              trigger: true
            });
          }
        });
        $('#timeline .happening').removeClass('refreshing');
        this.render();
        return this.refreshTimes();
      },
      refreshFriendsCheckins: function(event) {
        $(event.target).addClass('refreshing');
        this.loadingCheckins = true;
        this.render();
        return window.GLOBALS.Checkins.recent(true).done(this.loadCheckins);
      },
      refreshTimes: function() {
        $('.checkin time').each(function() {
          return $(this).text(moment($(this).attr('datetime')).fromNow());
        });
        return this._timeoutForRefresh = setTimeout(this.refreshTimes, this._timeoutLength);
      },
      showCheckinModal: function() {
        if ($('#full-modal').length) {
          return;
        }
        this.checkinView = new CheckinViews.ModalFromVenues({
          _el: '#venues'
        });
        return window.app.on('destroy:modal', this.destroyCheckinModal);
      },
      toggleTabs: function(event) {
        this.$('x-tabbar-tab,x-slide').removeClass('active');
        $(event.target).addClass('active');
        $($(event.target).data('target-selector')).addClass('active');
        this.options.scope = $(event.target).data('scope');
        return window.router.navigate($(event.target).data('scope'), {
          replace: true,
          trigger: false
        });
      }
    });
    return {
      Show: ShowView
    };
  });

}).call(this);

define('tpl!templates/users/list.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('');}return __p.join('');}});

define('tpl!templates/users/login.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="login">  <h1>', l('Sign in to Foursquare') ,'</h1>  <p>', l('around is a Foursquare app for Firefox OS, mobile phones, and web browsers.') ,'</p>  <p>', l('Tap the connect button below to link your Foursquare account and start exploring venues nearby.') ,'</p>  <div class="center">    <a id="sign-in" href="', loginURL ,'">', l('Sign in with Foursquare') ,'</a>  </div></div>');}return __p.join('');}});

define('tpl!templates/users/show.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (user) { ; __p.push('  <img src="', user.profilePhoto() ,'" alt="', l('Profile photo for ') + user.name ,'" class="profile-photo">  <div class="profile-summary">    <h1>', user.name ,'</h1>    <h2 class="subheader">', l('From:') ,' ', user.homeCity ,'</h2>    <p>', user.bio ,'</p>    '); if (user.checkins && user.checkins.items.length) { ; __p.push('      <h2>        <!--          If the user checked in less than a few hours ago, we\'ll say          they\'re still there.        -->        ', user.checkins.items[0].createdAt + window.GLOBALS.RECENT_CHECKIN_TIME > window.timestamp() ? l('Currently at:') : l('Last at:') ,'        <a href="#venues/', user.checkins.items[0].venue.id ,'">', user.checkins.items[0].venue.name ,'</a>      </h2>    '); } ; __p.push('    <!-- Show recent checkins -->    '); if (user.checkins && user.checkins.items && user.checkins.items.length) { ; __p.push('      <h1>', l('History') ,'</h1>      <div class="checkins">        '); user.checkins.items.forEach(function(checkin) { ; __p.push('          ', CheckinShowTemplate({checkin: checkin}) ,'        '); }) ; __p.push('      </div>    '); } ; __p.push('  </div>'); } else { ; __p.push('  <h2>', l('Error') ,'</h2>  <p>', l('User not found.') ,'</p>'); } ; __p.push('');}return __p.join('');}});

(function() {
  define('cs!views/users',['zepto', 'underscore', 'backbone', 'localforage', 'cs!models/user', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/users/list.html.ejs', 'tpl!templates/users/login.html.ejs', 'tpl!templates/users/show.html.ejs'], function($, _, Backbone, localForage, User, CheckinShowTemplate, ListTemplate, LoginTemplate, ShowTemplate) {
    
    var CreateSelf, ListView, LoginView, ShowView;
    CreateSelf = function(token) {
      var d, request;
      d = $.Deferred();
      request = $.ajax({
        type: 'GET',
        dataType: 'json',
        url: "" + window.GLOBALS.API_URL + "users/self?oauth_token=" + token + "&v=" + window.GLOBALS.API_DATE
      });
      request.done(function(data) {
        var user;
        window.GLOBALS.TOKEN = token;
        user = new User(data.response.user);
        user.set({
          access_token: token,
          relationship: User.RELATIONSHIP.SELF,
          _isFullObject: true,
          _lastUpdated: window.timestamp()
        });
        window.GLOBALS.Users.add(user);
        user.save();
        return $.when(localForage.setItem('_ACCESS_TOKEN', token)).done(function() {
          return d.resolve(user);
        });
      });
      return d.promise();
    };
    ListView = Backbone.View.extend({
      template: ListTemplate
    });
    LoginView = Backbone.View.extend({
      el: '#content',
      $el: $('#content'),
      template: LoginTemplate,
      initialize: function() {
        return this.render();
      },
      render: function() {
        var html;
        html = this.template({
          loginURL: window.GLOBALS.AUTH_URL
        });
        return $(this.$el).html(html);
      }
    });
    ShowView = Backbone.View.extend({
      model: User,
      template: ShowTemplate,
      initialize: function() {
        var _this = this;
        return window.GLOBALS.Users.get(this.id).done(function(user) {
          _this.model = user;
          return _this.render();
        }).fail(function() {
          _this.model = null;
          return _this.render();
        });
      },
      render: function() {
        var html;
        html = this.template({
          CheckinShowTemplate: CheckinShowTemplate,
          user: this.model
        });
        return $(this.$el).html(html);
      }
    });
    return {
      CreateSelf: CreateSelf,
      List: ListView,
      Login: LoginView,
      Show: ShowView
    };
  });

}).call(this);

(function() {
  define('cs!models/tip',["human_model"], function(HumanModel) {
    
    var Tip;
    Tip = HumanModel.define({
      type: "tip",
      props: {
        id: {
          setOnce: true,
          type: "string"
        },
        text: ["string"],
        location: [
          "object", true, {
            lat: null,
            lng: null
          }
        ],
        createdAt: ['date'],
        status: ['string'],
        url: ['string'],
        user: ['object'],
        venue: ['object'],
        likes: ['object'],
        _venueID: ['string'],
        lastUpdated: ["number"]
      },
      isOutdated: function() {
        return this.lastUpdated + (window.GLOBALS.HOUR * 12) < window.timestamp();
      }
    });
    return _.extend(Tip);
  });

}).call(this);

define('tpl!templates/venues/create-tip.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div>  <h2>', venue.name ,'</h2>  <label for="tip-text" class="hide">', l('Leave a tip for this venue') ,'</label>  <textarea id="tip-text" data-venue="', venue.id ,'" placeholder="', l('Leave a tip for this place') ,'" maxlength="200"></textarea></div><button class="cancel">', l('Cancel') ,'</button><button class="accept" data-venue="', venue.id ,'">', l('Leave tip') ,'</button>');}return __p.join('');}});

define('tpl!templates/venues/explore.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="area-container">  <p class="data-attribution">', ('Data from ') ,'<a href="https://foursquare.com/" target="_blank">Foursquare</a></p>  '); if (sections) { ; __p.push('    <div id="sections">      <span>', l('Find:') ,'</span>      <select>        '); for (var s in sections) { ; __p.push('          <option value="', sections[s] ,'" ', sectionEnabled === sections[s] ? 'selected' : '' ,'>', s ,'</option>        '); } ; __p.push('      </select>    </div>  '); } ; __p.push('</div>'); if (venues && venues.length) { ; __p.push('  <ul class="venues">    '); venues.forEach(function(venue) { ; __p.push('      ', VenueShowListItemTemplate({        showLink: true,        venue: venue      }) ,'    '); }) ; __p.push('  </ul>'); } ; __p.push('');}return __p.join('');}});

define('tpl!templates/venues/list.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('');}return __p.join('');}});

define('tpl!templates/venues/show.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (venue && venue.id) { ; __p.push('  <div class="map venue" style="background-image: url(\'', mapURL ,'\')"></div>  <div class="venue-summary summary" id="venue-', venue.id ,'">    <div class="center">      <h1>', venue.name ,'</h1>      '); if (venue.categories.length || venue.location.city) { ; __p.push('        <h3 class="category subheader">          '); if (venue.categories.length) { ; __p.push('            ', venue.categories[0].name ,'          '); } ; __p.push('          '); if (!isLocal) { ; __p.push('            '); if (venue.categories.length || venue.location.city) { ; __p.push('              <small>', l('in') ,'            '); } ; __p.push('            '); if (venue.location.city) { ; __p.push('              ', venue.location.city ,'              '); if (venue.categories.length) { ; __p.push('                </small>              '); } ; __p.push('            '); } ; __p.push('          '); } ; __p.push('        </h3>      '); } ; __p.push('      '); if (hours) { ; __p.push('        <h3 class="hours subheader"></h3>      '); } else if (venue.hours && venue.hours.length && !venue.hours.isOpen) { ; __p.push('        <h3 class="hours subheader">', l('Closed right now') ,'</h3>      '); } ; __p.push('      '); if (venue.price && venue.price.tier) { ; __p.push('        <h3 title="', venue.price.message ,'">          ', l('Price:') ,'          '); for (var i = 1; i <= venue.price.tier; i++) { ; __p.push('            <i class="fa fa-circle"></i>          '); } ; __p.push('          '); for (var i = 1; i <= (4 - venue.price.tier); i++) { ; __p.push('            <i class="fa fa-circle-o"></i>          '); } ; __p.push('        </h3>      '); } ; __p.push('      '); if (!user.currentLocation || (user.currentLocation.venue.id !== venue.id && user.currentLocation.timestamp + (window.GLOBALS.HOUR * 1.5) < window.timestamp())) { ; __p.push('        <button class="check-in" data-venue="', venue.id ,'">', l('Check in here') ,'</button>      '); } else { ; __p.push('        <span class="you-are-here">', l("You're here!") ,'</span>      '); } ; __p.push('      <div class="like-buttons">        '); if (venue.like) { ; __p.push('          <button class="like" data-venue="', venue.id ,'" title="', l('You liked this place!') ,'"><i class="fa fa-thumbs-up"></i> ', l('Liked!') ,'</button>        '); } else { ; __p.push('          <button class="like" data-venue="', venue.id ,'" title="', l('Like this place to get better recommendations.') ,'"><i class="fa fa-thumbs-o-up"></i> ', l('Like') ,'</button>        '); } ; __p.push('        '); if (venue.dislike) { ; __p.push('          <button class="dislike" data-venue="', venue.id ,'" title="', l("Sorry you didn't like this place :-(") ,'"><i class="fa fa-thumbs-down"></i> ', l('Disliked') ,'</button>        '); } else { ; __p.push('          <button class="dislike" data-venue="', venue.id ,'" title="', l("Didn't have a good time?") ,'"><i class="fa fa-thumbs-o-down"></i> ', l('Dislike') ,'</button>        '); } ; __p.push('      </div>    </div>    <p>', venue.description ,'</p>  </div>  '); if (tips && tips.length) { ; __p.push('    <h1>', l('Tips') ,'</h1>    <ul class="venue tips">      '); _.first(tips, 3).forEach(function(tip) { ; __p.push('        <li class="tip">          <p class="text">', tip.text ,'</p>          <p class="author"><cite><a href="#/users/', tip.user.id ,'">', tip.user.firstName ,'</a></cite></p>        </li>      '); }) ; __p.push('    </ul>    <div class="more-tips center">      <button class="leave-tip" data-venue="', venue.id ,'">', l('Leave a tip') ,'</button>      '); if (tips && tips.length > 3) { ; __p.push('        <a class="read-all-tips" href="#venues/', venue.id ,'/tips">', l('Read all tips') ,'</a>      '); } ; __p.push('    </div>  '); } else { ; __p.push('    <h1>', l('Tips') ,'</h1>    <div class="more-tips center">      <button class="leave-tip" data-venue="', venue.id ,'">', l('Leave a tip') ,'</button>    </div>  '); } ; __p.push('  '); if (venue.photos && venue.photos.length) { ; __p.push('    <h1>', l('Photos') ,'</h1>    <ul class="venue photos">      '); venue.photos.forEach(function(photo) { ; __p.push('        <!-- TODO: Obviously, add a modal photo viewer -->        <li><a class="photo" style="background-image: url(', photo.prefix ,'', photo.width ,'x', photo.height ,'', photo.suffix ,');" href="', photo.prefix ,'', photo.width ,'x', photo.height ,'', photo.suffix ,'" target="_blank"></a></li>      '); }) ; __p.push('    </ul>  '); } ; __p.push('  <div class="center">    <label for="upload-photo" class="hide">', l('Upload a photo') ,'</label>    <input type="file" id="upload-photo" name="upload-photo" data-venue="', venue.id ,'" class="hide">    <button class="upload-photo" data-venue="', venue.id ,'">', l('Upload a photo') ,'</button>  </div>  <p class="attribution"><a href="https://foursquare.com/v/', venue.id ,'?ref=', window.GLOBALS.CLIENT_ID ,'" target="_blank">', l("See this venue on Foursquare's website.") ,'</a></p>'); } else if (isLoading) { ; __p.push('  <div class="map venue"></div>  <div class="venue-summary summary">    <div class="center">      <h1>', l('Loading') ,'<span class="circle-small"></span></h1>    </div>  </div>'); } else { ; __p.push('  <h2>', l('Error') ,'</h2>  <p>', l('Venue not found.') ,'</p>'); } ; __p.push('');}return __p.join('');}});

define('tpl!templates/venues/tips.html.ejs', function() {return function(obj) { var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (venue && venue.id) { ; __p.push('  <div class="venue-summary summary" id="venue-', venue.id ,'">    '); if (tips) { ; __p.push('      <div class="center">        <h1>', l('Tips left at ') ,'', venue.name ,'</h1>      </div>      <ul class="venue tips">        '); tips.forEach(function(tip) { ; __p.push('          <li class="tip">            <p class="text">', tip.text ,'</p>            <p class="author"><cite><a href="#/users/', tip.user.id ,'">', tip.user.firstName ,'</a></cite></p>          </li>        '); }) ; __p.push('      </ul>    '); } else { ; __p.push('      <div class="center">        <h1>', l('No tips for ') ,'', venue.name ,'</h1>      </div>    '); } ; __p.push('  </div>  <p class="attribution"><a href="https://foursquare.com/v/', venue.id ,'?ref=', window.GLOBALS.CLIENT_ID ,'" target="_blank">', l("See this venue on Foursquare's website.") ,'</a></p>'); } else if (isLoading) { ; __p.push('  <div class="venue-summary summary">    <div class="center">      <h1>', l('Loading') ,'<span class="circle-small"></span></h1>    </div>  </div>'); } else { ; __p.push('  <h2>', l('Error') ,'</h2>  <p>', l('Venue not found.') ,'</p>'); } ; __p.push('');}return __p.join('');}});

(function() {
  define('cs!views/venues',['zepto', 'underscore', 'backbone', 'cs!lib/api', 'cs!lib/geo', 'localforage', 'cs!models/tip', 'cs!models/venue', 'cs!views/checkins', 'cs!views/modal', 'tpl!templates/venues/create-tip.html.ejs', 'tpl!templates/venues/explore.html.ejs', 'tpl!templates/venues/list.html.ejs', 'tpl!templates/venues/show.html.ejs', 'tpl!templates/venues/show-list-item.html.ejs', 'tpl!templates/venues/tips.html.ejs'], function($, _, Backbone, API, Geo, localForage, Tip, Venue, CheckinViews, ModalView, CreateTipTemplate, ExploreTemplate, ListTemplate, ShowTemplate, ShowListItemTemplate, TipsTemplate) {
    
    var CreateTip, ExploreView, ListView, ShowView, TipsView;
    CreateTip = ModalView.extend({
      _el: '#create-tip',
      model: Venue,
      template: CreateTipTemplate,
      _isPosting: false,
      events: {
        "click .accept": "addTip",
        "click .cancel": "dismiss"
      },
      addTip: function() {
        var _this = this;
        if (this._isPosting) {
          return;
        }
        this._isPosting = true;
        return API.request("tips/add", {
          data: {
            text: $('#tip-text').val(),
            venueId: $('#tip-text').data('venue')
          },
          requestMethod: "POST"
        }).done(function(data) {
          var tipModel;
          tipModel = new Tip(data.response.tip);
          tipModel.lastUpdated = window.timestamp();
          tipModel._venueID = $('#tip-text').data('venue');
          window.GLOBALS.Tips.add(tipModel);
          tipModel.save();
          return _this.dismiss();
        });
      },
      _templateData: function() {
        return {
          venue: this.model
        };
      }
    });
    ListView = Backbone.View.extend({
      model: Venue,
      models: null,
      template: ListTemplate,
      initialize: function() {
        var _this = this;
        return window.GLOBALS.Venues.where(this.ids).done(function(venues) {
          _this.models = venues;
          return _this.render();
        }).fail(function() {
          return _this.render();
        });
      },
      render: function() {
        var html;
        html = this.template({
          venues: this.models
        });
        return $(this.$el).html(html);
      }
    });
    ExploreView = Backbone.View.extend({
      el: '.explore',
      $el: $('.explore'),
      template: ExploreTemplate,
      fixedContent: '\
      <div id="map" class="map"></div>\
      <div class="explore"></div>\
    ',
      headerLocation: null,
      isFullModal: true,
      map: null,
      position: null,
      searchResult: null,
      section: null,
      user: null,
      venueSearchValue: '',
      venues: [],
      venueMarkers: [],
      events: {
        "change .explore select": "changeSectionSearch"
      },
      initialize: function() {
        _.bindAll(this);
        $('#content').html(this.fixedContent);
        this.setElement('.explore');
        this.section = this.options.section;
        this.render();
        return Geo.getCurrentPosition().done(this._geoSuccess).fail(this._geoError);
      },
      render: function() {
        var bounds, latLngBounds,
          _this = this;
        this.$el.html(this.template({
          headerLocation: this.headerLocation,
          sectionEnabled: this.section,
          sections: Venue.SECTIONS,
          position: this.position,
          VenueShowListItemTemplate: ShowListItemTemplate,
          venues: this.venues
        }));
        $('x-appbar header').text(this.headerLocation);
        if (this.position && this.venues && this.venues.length) {
          bounds = new L.Bounds();
          this.venueMarkers.forEach(function(marker) {
            return _this.map.removeLayer(marker);
          });
          _.first(this.venues, 5).forEach(function(v) {
            var marker;
            marker = L.marker([v.location.lat, v.location.lng]);
            marker.addTo(_this.map);
            _this.venueMarkers.push(marker);
            return bounds.extend([v.location.lat, v.location.lng]);
          });
          latLngBounds = new L.LatLngBounds([[bounds.min.x, bounds.min.y], [bounds.max.x, bounds.max.y]]);
          return this.map.fitBounds(latLngBounds, {
            padding: [25, 25]
          });
        }
      },
      changeSectionSearch: function(event) {
        this.section = $(event.target).children('option')[event.target.selectedIndex].value;
        window.router.navigate("explore" + (this.section ? '/' : '') + this.section, {
          replace: true,
          trigger: false
        });
        this.venues = [];
        this.getVenues();
        return this.render();
      },
      getVenues: function() {
        var section,
          _this = this;
        if (!this.position) {
          return;
        }
        section = this.section;
        return localForage.getItem("explore-" + section, function(data) {
          if (data && data.timestamp + (window.GLOBALS.MINUTE * 2) > window.timestamp()) {
            _this.headerLocation = data.headerLocation;
            _this.venues = _.map(JSON.parse(data.venues), function(v) {
              return new Venue(v);
            });
            return _this.render();
          }
          return window.GLOBALS.Venues.near({
            ll: "" + _this.position.coords.latitude + "," + _this.position.coords.longitude,
            accuracy: _this.position.coords.accuracy
          }, section).done(function(venues, data) {
            _this.venues = venues;
            _this.headerLocation = data.response.headerFullLocation;
            if (_this.venues.length) {
              localForage.setItem("explore-" + section, {
                headerLocation: _this.headerLocation,
                timestamp: window.timestamp(),
                venues: JSON.stringify(_this.venues)
              });
              return _this.render();
            } else {
              console.info("Nothing available for " + _this.section + "; searching for everything instead.");
              _this.section = null;
              return _this.getVenues();
            }
          }).fail(function() {
            return window.alert("Error getting venues!");
          });
        });
      },
      showMap: function() {
        this.map = L.mapbox.map('map', window.GLOBALS.MAP_ID, {
          zoomControl: false
        }).setView([this.position.coords.latitude, this.position.coords.longitude], 14);
        this.map.dragging.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
        this.map.scrollWheelZoom.disable();
        if (this.map.tap) {
          return this.map.tap.disable();
        }
      },
      _cleanUpMap: function() {
        this._cancelMap = true;
        return this.map.remove();
      },
      _geoSuccess: function(position, coords, accuracy) {
        this.position = position;
        this.showMap();
        this.getVenues();
        return this.render();
      },
      _geoError: function() {}
    });
    ShowView = Backbone.View.extend({
      el: '#content',
      $el: $('#content'),
      model: Venue,
      template: ShowTemplate,
      hours: null,
      isLoading: true,
      isLocal: true,
      tips: [],
      events: {
        'click .venue-summary .check-in': 'checkIn',
        'click .photos.venue .photo': 'showPhoto',
        'click .venue-summary .like': 'like',
        'click .more-tips .leave-tip': 'leaveTip',
        'click .venue-summary .dislike': 'dislike',
        'click .upload-photo': 'activateUpload',
        'change #upload-photo': 'uploadPhoto'
      },
      mapURL: null,
      initialize: function() {
        var _this = this;
        _.bindAll(this);
        this.render();
        return window.GLOBALS.Venues.get(this.id).done(function(venue) {
          _this.isLoading = false;
          _this.model = venue;
          _this.model.on('change', _this.render);
          _this.mapURL = Geo.staticMap([venue.location.lat, venue.location.lng], [[venue.location.lat, venue.location.lng]], 16, [$(window).width(), 125]);
          _this.render();
          Geo.isNearby(venue.location.lat, venue.location.lng).done(function(isLocal) {
            _this.isLocal = isLocal;
            if (!_this.isLocal) {
              return _this.render();
            }
          });
          return venue.tips().done(function(tips) {
            if (!$("#venue-" + _this.model.id).length) {
              return;
            }
            _this.tips = tips;
            return _this.render();
          });
        }).fail(function() {
          return _this.render();
        });
      },
      render: function() {
        var html;
        html = this.template({
          hours: this.hours,
          isLoading: this.isLoading,
          isLocal: this.isLocal,
          mapURL: this.mapURL,
          tips: this.tips,
          user: window.GLOBALS.Users.getSelf(),
          venue: this.model
        });
        return $(this.$el).html(html);
      },
      activateUpload: function() {
        return $('#upload-photo').click();
      },
      checkIn: function(event) {
        if ($(event.target).data('venue') !== this.model.id) {
          return;
        }
        return new CheckinViews.ConfirmModal({
          model: this.model
        });
      },
      dislike: function(event) {
        if ($(event.target).data('venue') !== this.model.id) {
          return;
        }
        event.target.disabled = true;
        return this.model.changeDislike($(event.target).data('action'));
      },
      leaveTip: function(event) {
        if ($(event.target).data('venue') !== this.model.id) {
          return;
        }
        return new CreateTip({
          model: this.model
        });
      },
      like: function(event) {
        if ($(event.target).data('venue') !== this.model.id) {
          return;
        }
        event.target.disabled = true;
        return this.model.changeLike($(event.target).data('action'));
      },
      showPhoto: function(event) {
        var openURL;
        if (window.MozActivity) {
          event.preventDefault();
          return openURL = new MozActivity({
            name: "view",
            data: {
              type: "url",
              url: $(event.target).attr("href")
            }
          });
        }
      },
      uploadPhoto: function(event) {
        if ($(event.target).data('venue') !== this.model.id) {
          return;
        }
        if (!event.target.files.length) {
          return;
        }
        return this.model.addPhoto(event.target.files[0]).done(this.render).fail(window.alert);
      }
    });
    TipsView = Backbone.View.extend({
      el: '#content',
      $el: $('#content'),
      model: Venue,
      template: TipsTemplate,
      isLoading: true,
      tips: [],
      initialize: function() {
        var _this = this;
        _.bindAll(this);
        this.render();
        return window.GLOBALS.Venues.get(this.id).done(function(venue) {
          _this.isLoading = false;
          _this.model = venue;
          _this.render();
          return venue.tips().done(function(tips) {
            if (!$("#venue-" + _this.model.id).length) {
              return;
            }
            _this.tips = tips;
            return _this.render();
          });
        }).fail(function() {
          return _this.render();
        });
      },
      render: function() {
        var html;
        html = this.template({
          isLoading: this.isLoading,
          tips: this.tips,
          venue: this.model
        });
        return $(this.$el).html(html);
      }
    });
    return {
      Explore: ExploreView,
      List: ListView,
      Show: ShowView,
      Tips: TipsView
    };
  });

}).call(this);

(function() {
  define('cs!routes',['zepto', 'backbone', 'backbone_routefilter', 'cs!views/app', 'cs!views/checkins', 'cs!views/timeline', 'cs!views/users', 'cs!views/venues'], function($, Backbone, BackboneRoutefilter, AppView, CheckinViews, TimelineViews, UserViews, VenueViews) {
    
    var AppRouter, appView;
    appView = void 0;
    AppRouter = Backbone.Router.extend({
      routes: {
        "access_token=:token": "userCreate",
        "checkins/:id": "checkinShow",
        "explore": "explore",
        "explore/:section": "explore",
        "login": "userLogin",
        "users/:id": "userShow",
        "venues/:id": "venueShow",
        "venues/:id/tips": "venueShowTips",
        "nearby": "index",
        "worldwide": "index",
        "": "index"
      },
      initialize: function() {
        _.bindAll(this);
        if (window.location.hash === '') {
          window.location.hash = '#';
        }
        appView = new AppView();
        window.app = appView;
        return this;
      },
      after: function(route) {
        return this._historyCleanup(route);
      },
      index: function() {
        var startingScope;
        if (window.location.hash === '#worldwide') {
          startingScope = 'worldwide';
        } else {
          startingScope = 'nearby';
        }
        return appView.currentView = new TimelineViews.Show({
          scope: startingScope
        });
      },
      checkinShow: function() {},
      explore: function(section) {
        return appView.currentView = new VenueViews.Explore({
          section: section
        });
      },
      userCreate: function(token) {
        var _this = this;
        return $.when(UserViews.CreateSelf(token)).done(function() {
          return _this.navigate('', {
            replace: true,
            trigger: true
          });
        });
      },
      userLogin: function() {
        if (window.GLOBALS.Users.getSelf()) {
          return this.navigate('', {
            replace: true,
            trigger: true
          });
        } else {
          return appView.currentView = new UserViews.Login();
        }
      },
      userShow: function(id) {
        return appView.currentView = new UserViews.Show({
          el: "#content",
          $el: $("#content"),
          id: id
        });
      },
      venueShow: function(id) {
        return appView.currentView = new VenueViews.Show({
          el: "#content",
          $el: $("#content"),
          id: id
        });
      },
      venueShowTips: function(id) {
        return appView.currentView = new VenueViews.Tips({
          el: "#content",
          $el: $("#content"),
          id: id
        });
      },
      _historyCleanup: function(route) {
        if (route === 'login') {
          $('body').addClass('login');
        } else {
          $('body').removeClass('login');
        }
        if (_.contains(['', 'login', 'nearby', 'worldwide'], route)) {
          return $('body').addClass('hide-back-button');
        } else {
          return $('body').removeClass('hide-back-button');
        }
      }
    });
    return AppRouter;
  });

}).call(this);

// backbone.localForage allows users of Backbone.js to store their collections
// entirely offline with no communication to a REST server. It uses IndexedDB
// or localStorage (depending on availability) to store the data. This allows
// apps on Chrome and Firefox to use async, offline storage, which is cool.
//
// Inspiration for this file comes from a few backbone.localstorage
// implementations.
define('backbone_store',["underscore", "zepto", "backbone", "localforage"], function (_, $, Backbone, localForage) {
    function S4() {
        return ((1 + Math.random()) * 65536 | 0).toString(16).substring(1);
    }

    function guid() {
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }

    var OfflineStore = function(name) {
        // Initialize data as null so we can test to see if it's been loaded
        // from our data store later on.
        this.data = null;
        this.name = name;
    };

    _.extend(OfflineStore.prototype, {
        save: function (callback) {
            var d = $.Deferred();

            localForage.setItem(this.name, JSON.stringify(this.data), function(data) {
                if (callback) {
                    callback(data);
                }

                d.resolve(data);
            });

            return d.promise();
        },

        create: function(model, callbacks) {
            var d = $.Deferred();

            if (this.data) {
                if (!model.id) model.id = model.attributes.id = guid();
                this.data[model.id] = model;
                this.save(function() {
                    if (callbacks.success) {
                        callbacks.success(model);
                    }

                    d.resolve(model);
                });
            } else {
                var self = this;

                localForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    if (!model.id) model.id = model.attributes.id = guid();
                    self.data[model.id] = model;
                    self.save(function() {
                        if (callbacks.success) {
                            callbacks.success(model);
                        }

                        d.resolve(model);
                    });
                });
            }

            return d.promise();
        },

        update: function(model, callbacks) {
            var d = $.Deferred();

            if (this.data) {
                this.data[model.id] = model;
                this.save(function() {
                    if (callbacks.success) {
                        callbacks.success(model);
                    }

                    d.resolve(model);
                });
            } else {
                var self = this;

                localForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    self.data[model.id] = model;
                    self.save(function() {
                        if (callbacks.success) {
                            callbacks.success(model);
                        }

                        d.resolve(model);
                    });
                });
            }

            return d.promise();
        },

        find: function(model, callbacks) {
            var d = $.Deferred();

            if (this.data) {
                if (callbacks.success) {
                    callbacks.success(this.data[model.id]);
                }

                d.resolve(this.data[model.id]);
            } else {
                var self = this;

                localForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    if (callbacks.success) {
                        callbacks.success(self.data[model.id]);
                    }

                    d.resolve(self.data[model.id]);
                });
            }

            return d.promise();
        },

        findAll: function(callbacks) {
            var d = $.Deferred();

            if (this.data) {
                if (callbacks.success) {
                    callbacks.success(_.values(this.data));
                }

                d.resolve(_.values(this.data));
            } else {
                var self = this;

                localForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};
                    if (callbacks.success) {
                        callbacks.success(_.values(self.data));
                    }

                    d.resolve(_.values(self.data));
                });
            }

            return d.promise();
        },

        destroy: function(model, callbacks) {
            var d = $.Deferred();

            if (this.data) {
                delete this.data[model.id];
                this.save(function() {
                    if (callbacks.success) {
                        callbacks.success(model);
                    }

                    d.resolve(model);
                });
            } else {
                var self = this;

                localForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    delete self.data[model.id];
                    self.save(function() {
                        if (callbacks.success) {
                            callbacks.success(model);
                        }

                        d.resolve(model);
                    });
                });
            }

            return d.promise();
        }
    });

    // Override Backbone.sync to call our custom offline sync only.
    // TODO: Allow access to original sync?
    Backbone.sync = function(method, model, options) {
        var store = model.offlineStore || model.localStorage || model.collection.offlineStore || model.collection.localStorage;

        switch (method) {
            case "read":
                return model.id ? store.find(model, options) : store.findAll(options);
                break;
            case "create":
                return store.create(model, options);
                break;
            case "update":
                return store.update(model, options);
                break;
            case "delete":
                return store.destroy(model, options);
                break;
        }
    };

    return OfflineStore;
});

(function() {
  define('cs!collections/checkins',['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!lib/geo', 'localforage', 'cs!lib/api', 'cs!models/checkin'], function(_, $, Backbone, Store, Geo, localForage, API, Checkin) {
    
    var CheckinCollection;
    CheckinCollection = Backbone.Collection.extend({
      model: Checkin,
      offlineStore: new Store('Checkins'),
      comparator: function(checkin) {
        return -checkin.createdAt.getTime();
      },
      get: function(id, forceUpdate) {
        var d, results,
          _this = this;
        if (forceUpdate == null) {
          forceUpdate = false;
        }
        d = $.Deferred();
        results = this.where({
          id: id
        });
        if (!(!results.length || results[0].isOutdated() || !results[0].isFullObject || forceUpdate)) {
          d.resolve(results[0]);
          return d.promise();
        }
        API.request("checkins/" + id).done(function(data) {
          var checkin;
          checkin = new Checkin(data.response.checkin);
          checkin.isFullObject = true;
          checkin.lastUpdated = window.timestamp();
          _this.add(checkin, {
            merge: true
          });
          checkin.save();
          return d.resolve(checkin);
        }).fail(function(xhr, type) {
          return d.reject(xhr);
        });
        return d.promise();
      },
      recent: function(forceUpdate) {
        var checkins, d,
          _this = this;
        if (forceUpdate == null) {
          forceUpdate = false;
        }
        d = $.Deferred();
        checkins = this.where({
          isFromFriend: true
        });
        localForage.getItem("lastUpdatedTimestamp-checkins/recent", function(lastUpdatedTimestamp) {
          if (!lastUpdatedTimestamp || lastUpdatedTimestamp + window.GLOBALS.HOUR < window.timestamp() || forceUpdate) {
            localForage.setItem("lastUpdatedTimestamp-checkins/recent", window.timestamp());
            return API.request("checkins/recent", {
              data: {
                afterTimestamp: lastUpdatedTimestamp || '1'
              }
            }).done(function(data) {
              data.response.recent.forEach(function(c) {
                var checkin;
                checkin = new Checkin(c);
                checkin.isFromFriend = true;
                checkin.isFullObject = true;
                _this.add(checkin, {
                  merge: true
                });
                checkin.save();
                window.GLOBALS.Users.get(checkin.user.id);
                return window.GLOBALS.Venues.get(checkin.venue.id);
              });
              checkins = _this.where({
                isFromFriend: true
              });
              return d.resolve(_this._onePerUser(checkins));
            }).fail(d.reject);
          } else {
            return d.resolve(_this._onePerUser(checkins));
          }
        });
        return d.promise();
      },
      _onePerUser: function(collection) {
        var users;
        users = [];
        return _.filter(collection, function(model) {
          if (_.contains(users, model.user.id)) {
            return false;
          } else {
            users.push(model.user.id);
            return true;
          }
        });
      }
    });
    return CheckinCollection;
  });

}).call(this);

(function() {
  define('cs!collections/tips',['underscore', 'zepto', 'backbone', 'backbone_store', 'localforage', 'cs!lib/api', 'cs!models/tip'], function(_, $, Backbone, Store, localForage, API, Tip) {
    
    var TipCollection;
    TipCollection = Backbone.Collection.extend({
      model: Tip,
      offlineStore: new Store('Tips'),
      getForVenue: function(venue) {
        var d, results,
          _this = this;
        d = $.Deferred();
        results = this.where({
          _venueID: venue.id || venue
        });
        if (results.length) {
          d.resolve(results);
          return d.promise();
        }
        API.request("venues/" + (venue.id || venue) + "/tips").done(function(data) {
          var tip, tips, _i, _len, _ref;
          tips = [];
          _ref = data.response.tips.items;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tip = _ref[_i];
            tip = new Tip(tip);
            tip.isFullObject = true;
            tip.lastUpdated = window.timestamp();
            tip._venueID = venue.id || venue;
            _this.add(tip, {
              merge: true
            });
            tip.save();
            tips.push(tip);
          }
          return d.resolve(tips);
        }).fail(function(xhr, type) {
          return d.reject(xhr);
        });
        return d.promise();
      }
    });
    return TipCollection;
  });

}).call(this);

(function() {
  define('cs!collections/users',['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!lib/api', 'cs!models/user'], function(_, $, Backbone, Store, API, User) {
    
    var UserCollection;
    UserCollection = Backbone.Collection.extend({
      model: User,
      offlineStore: new Store("Users"),
      _selfRequest: null,
      initialize: function(storeName) {
        if (storeName) {
          return this.offlineStore = new Store(storeName);
        }
      },
      get: function(id, forceUpdate) {
        var d, results,
          _this = this;
        if (forceUpdate == null) {
          forceUpdate = false;
        }
        d = $.Deferred();
        results = this.where({
          id: id
        });
        if (!(!results.length || results[0].isOutdated() || forceUpdate)) {
          d.resolve(results[0]);
          return d.promise();
        }
        API.request("users/" + id).done(function(data) {
          var user;
          user = new User(data.response.user);
          user.lastUpdated = window.timestamp();
          _this.add(user, {
            merge: true
          });
          user.save();
          return d.resolve(user);
        }).fail(function(xhr, type) {
          return d.reject(xhr, type);
        });
        return d.promise();
      },
      getSelf: function() {
        var user,
          _this = this;
        user = this.where({
          relationship: User.RELATIONSHIP.SELF
        });
        if (user.length) {
          if (user[0].isOutdated() && !this._selfRequest) {
            this._selfRequest = this.get(user[0].id, true).done(function() {
              return _this._selfRequest = null;
            });
          }
          return user[0];
        } else {
          return null;
        }
      }
    });
    return UserCollection;
  });

}).call(this);

(function() {
  define('cs!collections/venues',['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!lib/api', 'cs!models/venue'], function(_, $, Backbone, Store, API, Venue) {
    
    var VenuesCollection;
    VenuesCollection = Backbone.Collection.extend({
      model: Venue,
      offlineStore: new Store('Venues'),
      get: function(id, forceUpdate) {
        var d, results,
          _this = this;
        if (forceUpdate == null) {
          forceUpdate = false;
        }
        d = $.Deferred();
        results = this.where({
          id: id
        });
        if (!(!results.length || results[0].isOutdated() || !results[0].isFullObject || forceUpdate)) {
          d.resolve(results[0]);
          return d.promise();
        }
        API.request("venues/" + id).done(function(data) {
          var venue;
          data.response.venue.photos = _this._setPhotos(data.response.venue.photos.groups);
          venue = new Venue(data.response.venue);
          venue.isFullObject = true;
          venue.lastUpdated = window.timestamp();
          _this.add(venue, {
            merge: true
          });
          venue.save();
          d.resolve(venue);
          if (!(venue.photos.length >= Venue.PHOTOS_RETURNED_FROM_GET_CALL)) {
            return;
          }
          return venue.getPhotos().done(function() {
            return d.resolve(venue);
          });
        }).fail(function(xhr, type) {
          return d.reject(xhr.response);
        });
        return d.promise();
      },
      near: function(coords, section) {
        var d, options, request,
          _this = this;
        if (section == null) {
          section = null;
        }
        d = $.Deferred();
        options = _.extend(coords, {
          sortByDistance: 1,
          venuePhotos: 1
        });
        if (section) {
          options.section = section;
        }
        request = API.request("venues/explore", {
          data: options
        }).done(function(data) {
          var venues;
          venues = [];
          _(data.response.groups[0].items).each(function(item) {
            var venue;
            item.venue.photos = _this._setPhotos(item.venue.photos.groups);
            venue = new Venue(item.venue);
            venue.lastUpdated = window.timestamp();
            _this.add(venue);
            venue.save();
            return venues.push(venue);
          });
          return d.resolve(venues, data);
        }).fail(d.reject);
        return _.merge(d.promise(), {
          _request: request
        });
      },
      search: function(searchArgs) {
        var d, request,
          _this = this;
        if (searchArgs == null) {
          searchArgs = {};
        }
        d = $.Deferred();
        request = API.request("venues/search", {
          data: searchArgs
        }).done(function(data) {
          var venues;
          if (data.response.venues && data.response.venues.length) {
            venues = [];
            _(data.response.venues).each(function(venue) {
              if (venue.photos) {
                venue.photos = _this._setPhotos(venue.photos.groups);
              }
              venue = new Venue(venue);
              venue.lastUpdated = window.timestamp();
              _this.add(venue);
              venue.save();
              return venues.push(venue);
            });
            return d.resolve(venues, data);
          } else {
            return d.resolve([]);
          }
        });
        return _.merge(d.promise(), {
          _request: request
        });
      },
      _setPhotos: function(photos) {
        var photoGroup;
        photoGroup = _.filter(photos, function(group) {
          return group.type === "venue";
        });
        if (photoGroup[0]) {
          return photoGroup[0].items;
        } else {
          return [];
        }
      }
    });
    return VenuesCollection;
  });

}).call(this);

(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define('cs!app',['zepto', 'jed', 'localforage', 'deferred', 'cs!globals', 'cs!routes', 'cs!collections/checkins', 'cs!collections/tips', 'cs!collections/users', 'cs!collections/venues'], function($, Jed, localForage, Deferred, GLOBALS, Routes, CheckinCollection, TipCollection, UserCollection, VenueCollection) {
    
    var Checkins, Tips, Users, Venues;
    if (window.GLOBALS.HAS.nativeScroll) {
      $('body').addClass('native-scroll');
    }
    if (__indexOf.call(window.navigator, "geolocation") >= 0) {
      return alert("No geolocation available. Sorry; app won't work for now!");
    }
    window.GLOBALS.Checkins = Checkins = new CheckinCollection();
    window.GLOBALS.Tips = Tips = new TipCollection();
    window.GLOBALS.Users = Users = new UserCollection();
    window.GLOBALS.Venues = Venues = new VenueCollection();
    return $.when(localForage.getItem('_ACCESS_TOKEN').then(function(token) {
      return window.GLOBALS.TOKEN = token;
    })).then(window.setLanguage).done(function() {
      return $.when(Checkins.fetch(), Tips.fetch(), Users.fetch(), Venues.fetch()).done(function() {
        var router;
        router = new Routes();
        window.router = router;
        return Backbone.history.start();
      });
    });
  });

}).call(this);

/* global require:true */
/*!
 around | https://github.com/tofumatt/around

 HTML5 Foursquare Client
*/

// Require.js shortcuts to our libraries.
require.config({
    paths: {
        'async_storage': 'vendor/async_storage',
        'backbone': 'vendor/backbone',
        'backbone_promises': 'vendor/backbone.promises',
        'backbone_routefilter': 'vendor/backbone.routefilter',
        'backbone_store': 'vendor/backbone.localforage',
        'brick': 'vendor/brick',
        'coffee-script': 'vendor/coffee-script',
        'cs': 'vendor/cs',
        'deferred': 'vendor/deferred',
        'human_model': 'vendor/human-model',
        'jed': 'vendor/jed',
        'localforage': 'vendor/localforage',
        'moment': 'vendor/moment',
        'promise': 'vendor/promise',
        'tpl': 'vendor/tpl',
        'underscore': 'vendor/lodash',
        'zepto': 'vendor/zepto'
    },
    // The shim config allows us to configure dependencies for scripts that do
    // not call define() to register a module.
    shim: {
        async_storage: {
            deps: [
                'promise'
            ],
            exports: 'asyncStorage'
        },
        backbone: {
            deps: [
                'underscore',
                'zepto'
            ],
            exports: 'Backbone'
        },
        backbone_routefilter: {
            deps: [
                'backbone'
            ]
        },
        brick: {
            exports: 'xtag'
        },
        deferred: {
            deps: [
                'zepto'
            ],
            exports: 'deferred'
        },
        human_model: {
            deps: [
                'backbone'
            ],
            exports: 'HumanModel'
        },
        moment: {
            exports: 'moment'
        },
        promise: {
            exports: 'promise'
        },
        underscore: {
            exports: '_'
        },
        zepto: {
            exports: 'Zepto'
        }
    }
});

require(['backbone_promises', 'cs!app']);

define("main", function(){});