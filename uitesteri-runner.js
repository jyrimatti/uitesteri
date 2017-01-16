(function() {
    window.onmessage = function(original) { return function(e) {
        console.debug('uitesteri-runner received message: ');
        console.debug(e);
        if (e.data.name == 'speed') {
            uitesteri.speed = e.data.speed;
        } else if (e.data.name == 'continue') {
            uitesteri.cont();
        } else if (e.data.name == 'run') {
            try {
                var test = eval('(' + e.data.test + ')');
                var commands = typeof test == 'function' ? test() : test;
                if (e.data.skip) {
                    commands = commands.slice(e.data.skip);
                }
                uitesteri.run(commands, function(res) {
                    uitesteri.postMessage({ name: 'finished', results: res });
                });
            } catch (e) {
                uitesteri.run([], function(res) {
                    console.log(e);
                    res.results = {exception: { name: e.name, message: e.message, fileName: e.fileName, lineNumber: e.lineNumber }};
                    uitesteri.postMessage({ name: 'finished', results: res });
                });
            }
        }
        if (original) {
            original(e);
        }
    };}(window.onmessage);

    window.onbeforeunload = function(original) { return function() {
        uitesteri.unloading = true;
        if (original) {
            original(e);
        }
    };}(window.onbeforeunload);

    window.onunload = function(original) { return function(e) {
        uitesteri.postMessage({ name: 'unload' });
        if (original) {
            original(e);
        }
    };}(window.onunload);

    var pointer = document.createElement('div');
    pointer.appendChild(document.createElement('div'));
    var attr = document.createAttribute('id');
    attr.value = 'uitesteri-pointer';
    pointer.setAttributeNode(attr);
    document.body.appendChild(pointer);

    document.onmouseover = function(original) { return function(e) {
        if (uitesteri.speed > 0) {
            var parent = e.target.parentNode;
            while (parent && parent.classList) {
                parent.classList.add('hover');
                parent = e.parentNode;
            }
        }
    };}(window.onmouseover);

    document.onmouseout = function(original) { return function(e) {
        if (uitesteri.speed > 0) {
            var parent = e.target.parentNode;
            while (parent && parent.classList) {
                parent.classList.remove('hover');
                parent = e.parentNode;
            }
        }
    };}(window.onmouseout);

    var style = document.createElement('style');
    var sattr = document.createAttribute('type');
    sattr.value = 'text/css';
    style.textContent = '.uitesteri-click { border: 2px solid red; }'
        + '#uitesteri-pointer { position: fixed; opacity: 0.8; overflow: hidden; z-index: 999999; width: 13px; height: 13px; border-radius: 11px; border: 1px solid green; padding: 0; margin: 0; background-clip: content-box; }'
        + '#uitesteri-pointer div { width: 5px; height: 5px; background-color: red; border-radius: 10px; border: 4px solid white; padding: 0; }'
    ;
    document.head.appendChild(style);
})();

window.uitesteri = {
    speed: 200,

    postMessage: function(data) {
        console.debug('uitesteri-runner posting message:');
        console.debug(data);
        parent.postMessage(data, '*');
    },

    steps: function(stepsVarArgs) {
        return Array.prototype.concat.apply([], arguments);
    },

    find: function(textVarArgs) {
        var args = arguments;
        return (function() {
            var context;
            return function() {
                if (!context) {
                    context = document.body;
                    for(var i = 0; i < args.length; i++) {
                        context = uitesteri.findFrom(args[i], context)();
                    }
                }
                context.scrollIntoView();
                var elementRectTop = uitesteri.getY(function() { return context; })();
                var absoluteElementTop = elementRectTop + window.pageYOffset;
                var middle = absoluteElementTop - (window.innerHeight / 2);
                window.scrollTo(0, middle);
                return context;
            };
        })();
    },
    
    findFrom: function(text, context) {
        var text = text.trim();
        return function() {
            var textNodesUnder = function(context) {
              var n, a=[], walk=document.createTreeWalker(context,NodeFilter.SHOW_TEXT,null,false);
              while(n=walk.nextNode()) a.push(n);
              return a;
            }
            var elements = textNodesUnder(context).filter(function(node) { return node.textContent.indexOf(text) > -1; }).map(function(node) { return node.parentNode; });

            var inputs = Array.prototype.slice.call(context.querySelectorAll('input[value*="' + text + '"],input[placeholder*="' + text + '"]'));

            var optgroups = Array.prototype.slice.call(context.querySelectorAll('optgroup[label*="' + text + '"]'));

            var options = Array.prototype.slice.call(context.querySelectorAll('option[value*="' + text + '"]'));

            var images = Array.prototype.slice.call(context.querySelectorAll('img[alt*="' + text + '"]'));

            var data = Array.prototype.slice.call(context.querySelectorAll('[data-uitesteri*="' + text + '"]'));

            var results = elements.concat(inputs).concat(optgroups).concat(options).concat(images).concat(data);
            if (results.length == 0 && context != document.body) {
                return uitesteri.findFrom(text, context.parentNode)();
            } else if (results.length == 0) {
                throw new Error("Selector (" + text + ") returns no results!");
            } else if (results.length > 1) {
                var visibleResults = results.filter(uitesteri.isVisible);
                if (visibleResults.length > 1) {
                    throw new Error("Selector (" + text + ") returns more than one result! Returning: " + results);
                } else if (visibleResults.length == 1) {
                    return visibleResults[0];
                }
            }
            return results[0];
        };
    },

    run: function(commands, callback) {
        var finalResults = function() {
            return {
                started: new Date().getTime(),
                results: [],
                ended: new Date().getTime()
            };
        };
        if (commands.length == 0) {
            uitesteri.cont = undefined;
            if (callback) {
                callback(finalResults());
            }
            return;
        }
        
        var head = commands[0];
        var tail = commands.slice(1);
        uitesteri.runCommand(head, function(singleResult) {
            uitesteri.postMessage({ name: 'commandExecuted', result: singleResult }, '*');
            if (uitesteri.unloading) {
                return;
            }
            if (singleResult.exception) {
                if (callback) {
                    callback(finalResults());
                }
                return;
            }

            uitesteri.cont = function() {
                uitesteri.run(tail, function(allResults) {
                    allResults.results.push(singleResult);
                    if (singleResult.started < allResults.started) {
                        allResults.started = singleResult.started;
                    }
                    if (callback) {
                        callback(allResults);
                    }
                });
            };
            if (uitesteri.speed > 0) {
                setTimeout(uitesteri.cont, uitesteri.speed);
            }
        });
    },

    runCommand: function(command, callback) {
        var ret = {
            name: command.name,
            started: new Date().getTime(),
            waitStarted: undefined,
            ended: undefined,
            exception: undefined
        };
        var onFinish = function() {
            ret.ended = new Date().getTime();
            if (callback) {
                callback(ret);
            }
        }

        try {
            uitesteri.commandRunners[command.name](command);
            ret.waitStarted = new Date().getTime();
            uitesteri.waitAjax(onFinish);
        } catch (e) {
            ret.exception = { name: e.name, message: e.message, fileName: e.fileName, lineNumber: e.lineNumber };
            console.log(e);
            onFinish();
        }
    },

    waitAjax: function(callback, delay) {
        if (!delay) delay = 1;
        setTimeout(function() {
            // if last known ajax request was active during last 500ms...
            if (new Date() - uitesteri.lastAjaxActiveTime() < 500)
                uitesteri.waitAjax(callback, delay*2);
            else
                callback();
        }, delay);
    },

    lastAjaxActiveTime: (function() {
        var oldSend = XMLHttpRequest.prototype.send;
        var active = 0;
        var lastFinishTime = new Date();

        XMLHttpRequest.prototype.send = function() {
            active += 1;
            oldSend.apply(this, arguments);
            this.addEventListener('readystatechange', function() {
                if (this.readyState === XMLHttpRequest.DONE) {
                    active -= 1;
                    lastFinishTime = new Date();
                }
            }, false);
        };

        return function() {
            return active > 0 ? new Date() : lastFinishTime;
        };
    })(),

    simulate: function(elem, event, args) {
        return YUI().use('node-event-simulate', function(Y) {
            if (event == 'tap' || event == 'doubletap' || event == 'press' || event == 'move' || event == 'flick' || event == 'pinch' || event == 'rotate') {
                Y.one(elem).simulateGesture(event, args);
            } else {
                Y.one(elem).simulate(event, args);
            }
        });
    },

    getX: function(elemFn) {
        return function() {
            var elem = elemFn();
            while (elem.nodeName.toLowerCase() == 'option' || elem.nodeName.toLowerCase() == 'optgroup') {
                elem = elem.parentNode;
            }
            return elem.getBoundingClientRect().left;
        };
    },

    getY: function(elemFn) {
        return function() {
            var elem = elemFn();
            while (elem.nodeName.toLowerCase() == 'option' || elem.nodeName.toLowerCase() == 'optgroup') {
                elem = elem.parentNode;
            }
            return elem.getBoundingClientRect().top;
        }
    },

    resolveField: function(elemFn) {
        return function() {
            var elem = elemFn();
            while (elem.nodeName.toLowerCase() == 'option' || elem.nodeName.toLowerCase() == 'optgroup') {
                elem = elem.parentNode;
            }

            var target = elem;
            if (elem.nodeName.toLowerCase() != 'input' && elem.nodeName.toLowerCase() != 'textarea' && elem.nodeName.toLowerCase() != 'select') {
                target = elem.querySelector('input,textarea,select');
            }
            if (!target && elem.nodeName.toLowerCase() == 'label' && elem.attributes['for']) {
                target = document.getElementById(elem.attributes['for'].value);
            }
            if (!target) {
                target = elem.querySelector('input,textarea,select');
            }
            return target;
        };
    },
    
    commands: {
        mousemove: function(xFn, yFn) {
            return [{
                name: 'mousemove',
                xFn: xFn,
                yFn: yFn
            },{
                name: 'mouseover',
                xFn: xFn,
                yFn: yFn
            }];
        },
        click: function(elemFn) {
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat([{
                name: 'mousedown',
                elemFn: elemFn
            }, {
                name: 'click',
                elemFn: elemFn
            }, {
                name: 'mouseup',
                elemFn: elemFn
            }]);
        },
        drag: function(elemFn, toPercentage) {
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat([{
                name: 'drag',
                toPercentage: toPercentage,
                elemFn: elemFn
            }]);
        },
        clickPoint: function(x, y) {
            return uitesteri.commands.mousemove(function() { return x; }, function() { return y; }).concat([{
                name: 'clickPoint',
                x: x,
                y: y
            }]);
        },
        press: function(keyCode, elemFn) {
            elemFn = uitesteri.resolveField(elemFn);
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat([{
                name: 'keydown',
                keyCode: keyCode,
                elemFn: elemFn
            }, {
                name: 'keypress',
                keyCode: keyCode,
                elemFn: elemFn
            }, {
                name: 'keyup',
                keyCode: keyCode,
                elemFn: elemFn
            }]);
        },
        type: function(text, elemFn) {
            elemFn = uitesteri.resolveField(elemFn);
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat(
                text.length == 0
                    ? [{
                        name: 'type',
                        text: text,
                        elemFn: elemFn
                    }]
                    : text.split('').map(function(char) { return {
                        name: 'type',
                        text: char,
                        elemFn: elemFn
                    }}));
        },
        write: function(text, elemFn) {
            elemFn = uitesteri.resolveField(elemFn);
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat(
                [{
                    name: 'write',
                    text: text,
                    elemFn: elemFn
                }]);
        },
        clear: function(elemFn) {
            elemFn = uitesteri.resolveField(elemFn);
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat([{
                name: 'clear',
                elemFn: elemFn
            }]);
        },
        gotoLocation: function(location) {
            return [{
                name: 'gotoLocation',
                location: location
            }];
        },
        highlight: function(elemFn) {
            return uitesteri.commands.mousemove(uitesteri.getX(elemFn), uitesteri.getY(elemFn)).concat([{
                name: 'highlight',
                elemFn: elemFn
            }]);
        }
    },
    
    commandRunners: {
        mousemove: function(c) {
            var elem = document.getElementById('uitesteri-pointer')
            elem.style.left = c.xFn();
            elem.style.top = c.yFn();
            if (uitesteri.speed > 0) {
                elem.style.transition = 'left ' + uitesteri.speed + "ms";
                elem.style.transition = 'top ' + uitesteri.speed + "ms";
            }
        },
        mouseover: function(c) {
            var elem = document.elementFromPoint(c.xFn(), c.yFn());
            uitesteri.simulate(elem, 'mouseover');
        },
        click: function(c) {
            var e = c.elemFn();
            var nodeName = e.nodeName.toLowerCase();
            if (nodeName == 'option') {
                // don't seem to be able to simulate the actual click on options...
                var parent = e.parentNode;
                while (parent.nodeName.toLowerCase() != 'select' && parent.nodeName.toLowerCase() != 'datalist') {
                    parent = parent.parentNode;
                }
                if (parent.nodeName.toLowerCase() == 'select') {
                    e.selected = true;
                } else {
                    document.querySelector('input[list="' + parent.getAttribute('id') + '"]').value = e.getAttribute('value');
                }
            } else if (nodeName == 'label') {
                // for labels instead focus the actual target field
                var forElement;
                if (e.hasAttribute('for')) {
                    forElement = e.ownerDocument.getElementById(e.getAttribute('for'));
                } else {
                    forElement = e.querySelector('input, textarea, select');
                }
                uitesteri.simulate(forElement, 'mousedown');
                uitesteri.simulate(forElement, 'focus');
                uitesteri.simulate(forElement, 'click');

                // select2 plugin
                if (forElement.classList.contains('select2-focusser')) {
                    uitesteri.simulate(forElement.parentNode.childNodes, 'mousedown');
                }
            } else {
                e.classList.add('uitesteri-click');
                uitesteri.simulate(e, 'click');
                var pointer = document.getElementById('uitesteri-pointer');
                
                pointer.style.width = '2px';
                pointer.style.height = '2px';
                pointer.style.margin = '5px';
                if (uitesteri.speed > 0) {
                    pointer.style.transition = 'width ' + uitesteri.speed/2 + 'ms';
                    pointer.style.transition = 'height ' + uitesteri.speed/2 + 'ms';
                    pointer.style.transition = 'margin ' + uitesteri.speed/2 + 'ms';
                
                    setTimeout(function() {
                        pointer.style.width = '13px';
                        pointer.style.height = '13px';
                        pointer.style.margin = 0;
                        pointer.style.transition = 'width ' + uitesteri.speed + 'ms';
                        pointer.style.transition = 'height ' + uitesteri.speed + 'ms';
                        pointer.style.transition = 'margin ' + uitesteri.speed + 'ms';
                    }, uitesteri.speed/2);
                }

                setTimeout(function() {
                    e.classList.remove('uitesteri-click');
                }, uitesteri.speed*2);
            }
        },
        mousedown: function(c) {
            var elem = c.elemFn();
            uitesteri.simulate(elem, 'mousedown');
        },
        mouseup: function(c) {
            var elem = c.elemFn();
            uitesteri.simulate(elem, 'mouseup');
        },
        drag: function(c) {
            var elem = c.elemFn();
            
            // jquery datetimepicker plugin
            if (elem.nodeName.toLowerCase() == 'dt' && elem.parentNode.parentNode.classList.contains('ui-timepicker-div')) {
                elem = elem.nextSibling.querySelector('.ui-slider-handle');
            }

            var dx = elem.parentNode.clientWidth > elem.parentNode.clientHeight ? c.toPercentage*elem.parentNode.clientWidth/100 : 0;
            var dy = elem.parentNode.clientWidth > elem.parentNode.clientHeight ? 0 : c.toPercentage*elem.parentNode.clientHeight/100;
            uitesteri.simulate(elem, 'drag', { dx: dx, dy: dy, moves: parseInt(uitesteri.speed/100) });
        },
        clickPoint: function(c) {
            var elem = document.elementFromPoint(c.x, c.y);
            uitesteri.simulate(elem, 'click');
        },
        keyup: function(c) {
            var elem = c.elemFn();
            uitesteri.simulate(elem, c.name, {keyCode: c.keyCode, charCode: c.keyCode});
        },
        keydown: function(c) {
            var elem = c.elemFn();
            uitesteri.simulate(elem, c.name, {keyCode: c.keyCode, charCode: c.keyCode});
        },
        keypress: function(c) {
            var elem = c.elemFn();
            uitesteri.simulate(elem, c.name, {keyCode: c.keyCode, charCode: c.keyCode});
        },
        type: function(c) {
            var elem = c.elemFn();
            elem.value += c.text;
        },
        write: function(c) {
            var elem = c.elemFn();
            elem.value = c.text;
        },
        clear: function(c) {
            var elem = c.elemFn();
            elem.value = '';
        },
        gotoLocation: function(c) {
        	if (c.location.indexOf('/') == 0) {
        		window.location.pathname = c.location;
        	} else if (c.location.indexOf('http') == 0) {
                window.location = c.location;
            } else {
            	window.location.pathname = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/' + c.location;
        	}
        },
        highlight: function(c) {
            var elem = c.elemFn();
            if (document.body.createTextRange) {
                var range = document.body.createTextRange();
                range.moveToElementText(elem);
                range.select();
            } else if (window.getSelection) {
                var selection = window.getSelection();        
                var range = document.createRange();
                range.selectNodeContents(elem);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    },

    // https://github.com/mousemke/true-visibility
    /**
     * ## isVisible
     *
     * @author Jason Farrell (http://useallfive.com/)
     * @author Mouse Braun (mouse@knoblau.ch)
     *
     * Checks if a DOM element is truly visible.
     */
    isVisible: function( _el ) {
        'use strict';

        var VISIBLE_PADDING = 2;

        /*
         * allows selector strings
         */
        if ( typeof _el === 'string' )
        {
            _el = document.querySelector( _el );
        }

        /**
         * ## inDocument
         *
         * checks if an element is in the document
         *
         * @param {DOMElement} element element to check
         *
         * @return {Boolean} in document or not
         */
        var _inDocument = function( element )
        {
            while ( element = element.parentNode )
            {
                if ( element === document )
                {
                    return true;
                }
            }
            return false;
        };

        /**
         * ## _isVisible
         *
         * Checks if a DOM element is visible. Takes into
         * consideration its parents and overflow.
         *
         * @param {DOMElement} el the DOM element to check if is visible
         * @param {Number} t Top corner position number
         * @param {Number} r Right corner position number
         * @param {Number} b Bottom corner position number
         * @param {Number} l Left corner position number
         * @param {Number} w Element width number
         * @param {Number} h Element height number
         *
         * @return _Boolean_ [description]
         */
        var _isVisible = function( el, t, r, b, l, w, h )
        {
            var style = getComputedStyle( el );

            if ( style.opacity === '0' || style.display === 'none' ||
                style.visibility === 'hidden' )
            {
                return false;
            }

            var p = el.parentNode;

            if ( p )
            {
                if ( p === document )
                {
                    return true;
                }

                var pStyle      = getComputedStyle( p );
                var pOverflow   = pStyle.overflow;

                /**
                 * check if the target element is to the right, left, under, or
                 * above it's parent
                 */
                if ( pOverflow === 'hidden' || pOverflow === 'scroll' )
                {
                    if ( l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft ||
                        l + w - VISIBLE_PADDING < p.scrollLeft ||
                        t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop ||
                        t + h - VISIBLE_PADDING < p.scrollTop )
                    {
                        return false;
                    }
                }

                if ( p === el.offsetParent )
                {
                    l += p.offsetLeft;
                    t += p.offsetTop;
                }

                return _isVisible( p, t, r, b, l, w, h );
            }

            return true;
        };

        /*
         * only check once.  it's parents aren't going to be any more or less in
         * the document
         */
        if ( !_el || !_inDocument( _el ) )
        {
            return false;
        }

        var t = _el.offsetTop;
        var l = _el.offsetLeft;
        var b = t + _el.offsetHeight;
        var r = l + _el.offsetWidth;
        var w = _el.offsetWidth;
        var h = _el.offsetHeight;

        return _isVisible( _el, t, r, b, l, w, h );
    }

};
