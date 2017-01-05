(function() {
    var originalMessageHandler = window.onmessage;
    window.onmessage = function(e) {
        if (e.data.name == 'init') {
            uitesteri.init();
            uitesteri.speed = e.data.speed;
        } else if (e.data.name == 'speed') {
            uitesteri.speed = e.data.speed;
        } else if (e.data.name == 'continue') {
            window.cont();
        }
        if (originalMessageHandler)
            originalMessageHandler(e);
    };
    var originalLoadHandler = window.onload;
    window.onload = function(e) {
        parent.postMessage({ name: 'load' }, '*');
        if (originalLoadHandler)
            originalLoadHandler(e);
    };
    window.onbeforeunload = function() {
        uitesteri.unloading = true;
    };
})();
window.uitesteri = {
    speed: 200,

    steps: function(stepsVarArgs) {
        return Array.prototype.concat.apply([], arguments);
    },

    find: function(textVarArgs) {
        var args = arguments;
        return function() {
            var context = document.body;
            for(var i = 0; i < args.length; i++) {
                context = uitesteri.findFrom(args[i], context)();
            }
            context.scrollIntoView(false);
            return context;
        };
    },
    
    findFrom: function(text, context) {
        var text = text.trim();
        return function() {
            var elements = $(':contains("' + text + '")', context);
            elements = elements.not(elements.parents());

            var inputs = $('input[value="' + text + '"]', context);

            var images = $('img[alt*="' + text + '"]', context);

            var data = $('*[data-uitesteri*="' + text + '"]', context);

            var results = elements.add(inputs).add(images).add(data);
            if (results.length == 0 && context != document.body)
                return uitesteri.findFrom(text, context.parentNode)();
            else if (results.length == 0)
                throw new Error("Selector (" + text + ") returns no results!");
            else if (results.length > 1) {
                var visibleResults = results.filter(':visible');
                if (visibleResults.length > 1)
                    throw new Error("Selector (" + text + ") returns more than one result! Returning: " + results.get());
                else if (visibleResults.length == 1)
                    return visibleResults.get(0);
            }
            return results.get(0);
        };
    },
    
    init: function() {
        if (!document.getElementById("uitesteri-pointer")) {
            var pointer = $('<div id="uitesteri-pointer"><div></div></div>').appendTo(document.body);
            $(window).mousemove(function(e) {
                pointer.css('left', e.clientX).css('top', e.clientY);
            });
            var originalMessageHandler = window.onmessage;
            window.onmessage = function(e) {
                if (e.data.name == 'run') {
                    var test = eval('(' + e.data.test + ')');
                    var commands = typeof test == 'function' ? test() : test;
                    if (e.data.skip)
                        commands = commands.slice(e.data.skip);
                    uitesteri.run(commands, function(res) {
                        parent.postMessage({ name: 'finished', results: res }, '*');
                    });
                }
                if (originalMessageHandler)
                    originalMessageHandler(e);
            };
            var originalUnloadHandler = window.onunload;
            window.onunload = function(e) {
                parent.postMessage({ name: 'unload' }, '*');
            };

            $(document).mouseover(function(e) {
                if (uitesteri.speed > 0)
                    $(e.target).parents().addClass('hover');
            });
            $(document).mouseout(function(e) {
                if (uitesteri.speed > 0)
                    $(e.target).parents().removeClass('hover');
            });
            $(document.head).append('<style type="text/css">' +
                '.uitesteri-click { border: 2px solid red; }' +
                '#uitesteri-pointer { position: fixed; opacity: 0.8; overflow: hidden; z-index: 999999; width: 13px; height: 13px; border-radius: 11px; border: 1px solid green; padding: 0; margin: 0; background-clip: content-box; }' +
                '#uitesteri-pointer div { width: 5px; height: 5px; background-color: red; border-radius: 10px; border: 4px solid white; padding: 0; }' +
                '</style>');
        }
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
            var xFn = function() { return elemFn().getBoundingClientRect().left; };
            var yFn = function() { return elemFn().getBoundingClientRect().top; };
            return uitesteri.commands.mousemove(xFn, yFn).concat([{
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
            var xFn = function() { return elemFn().getBoundingClientRect().left; };
            var yFn = function() { return elemFn().getBoundingClientRect().top; };
            return uitesteri.commands.mousemove(xFn, yFn).concat([{
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
            return [{
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
            }];
        },
        type: function(text, elemFn) {
            if (text.length == 0) {
                return [{
                    name: 'type',
                    text: text,
                    elemFn: elemFn
                }];
            } else {
                return text.split('').map(function(char) { return {
                    name: 'type',
                    text: char,
                    elemFn: elemFn
                }});
            }
        },
        clear: function(elemFn) {
            return [{
                name: 'clear',
                elemFn: elemFn
            }];
        },
        gotoLocation: function(location) {
            return [{
                name: 'gotoLocation',
                location: location
            }];
        },
        highlight: function(elemFn) {
            var xFn = function() { return elemFn().getBoundingClientRect().left; };
            var yFn = function() { return elemFn().getBoundingClientRect().top; };
            return uitesteri.commands.mousemove(xFn, yFn).concat([{
                name: 'highlight',
                elemFn: elemFn
            }]);
        }
    },

    runIn: function(iframe, test, callback) {
        var originalHandler = window.onmessage;
        if (originalHandler && originalHandler.uitestHandler)
            throw new Error('Already executing');

        var doRun = function(skip) {
            iframe.contentWindow.postMessage({ name: 'init', speed: uitesteri.speed }, '*');
            iframe.contentWindow.postMessage({ name: 'run', test: test.toString(), skip: skip }, '*');
        };

        var executedResults = [];
        var newHandler = function(e) {
            if (e.data.name == 'finished') {
                window.onmessage = originalHandler;
                var allResults = e.data.results;
                allResults.results = executedResults.concat(allResults.results);
                callback({test: test, results: allResults });
            } else if (e.data.name == 'commandExecuted') {
                console.log(e.data.result);
                executedResults.push(e.data.result);
            } else if (e.data.name == 'load') {
                doRun(executedResults.length);
            }
            if (originalHandler)
                originalHandler(e);
        };
        newHandler.uitestHandler = true;
        window.onmessage = newHandler;
        doRun();
    },
    
    run: function(commands, callback) {
        if (commands.length == 0) {
            if (callback)
                callback({
                    started: new Date().getTime(),
                    results: [],
                    ended: new Date().getTime()
                });
            return;
        }
        uitesteri.init();
        
        var head = commands[0];
        var tail = commands.slice(1);
        uitesteri.runCommand(head, function(singleResult) {
            parent.postMessage({ name: 'commandExecuted', result: singleResult }, '*');
            if (uitesteri.unloading)
                return;
            window.cont = function() {
                uitesteri.run(tail, function(allResults) {
                    allResults.results.push(singleResult);
                    if (singleResult.started < allResults.started)
                        allResults.started = singleResult.started;
                    if (callback)
                        callback(allResults);
                });
            };
            if (uitesteri.speed > 0) {
                setTimeout(window.cont, uitesteri.speed);
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
            callback(ret);
        }

        try {
            uitesteri.commandRunners[command.name](command);
            ret.waitStarted = new Date().getTime();
            uitesteri.waitAjax(onFinish);
        } catch (e) {
            ret.exception = { name: e.name, message: e.message, fileName: e.fileName, lineNumber: e.lineNumber };
            onFinish();
        }
    },

    waitAjax: function(callback, delay) {
        if (!delay) delay = 1;
        setTimeout(function() {
            if ($.active > 0)
                uitesteri.waitAjax(callback, delay*2);
            else
                callback();
        }, delay);
    },
    
    commandRunners: {
        mousemove: function(c) {
            if (uitesteri.speed == 0)
                $('#uitesteri-pointer').css('left', c.xFn()).css('top', c.yFn());
            else
                $('#uitesteri-pointer').animate({left: c.xFn(), top: c.yFn()}, {duration: uitesteri.speed});
        },
        mouseover: function(c) {
            $(document.elementFromPoint(c.xFn(), c.yFn())).simulate('mouseover');
        },
        click: function(c) {
            var e = c.elemFn();
            var nodeName = e.nodeName.toLowerCase();
            if (nodeName == 'option') {
                // don't seem to be able to simulate the actual click on options...
                e.selected = true;
            } else if (nodeName == 'label') {
                // for labels instead focus the actual target field
                var forElement;
                if (e.hasAttribute('for')) {
                    forElement = $(e.ownerDocument.getElementById(e.getAttribute('for')));
                    if (!forElement.is(':input')) {
                        forElement = $(':input', forElement).first();
                        if (forElement.length == 0)
                            forElement = $(':input', forElement.parent()).first();
                    }
                } else {
                    forElement = $(':input', e);
                }
                forElement.simulate('mousedown');
                forElement.simulate('focus');

                // select2 plugin
                if (forElement.hasClass('select2-focusser'))
                    forElement.siblings().simulate('mousedown');
            } else {
                $(e).addClass('uitesteri-click').simulate('click');
                $('#uitesteri-pointer').animate({width: '2px', height: '2px', margin: '5px'}, uitesteri.speed/2);
                setTimeout(function() {$('#uitesteri-pointer').animate({width: '13px', height: '13px', margin: 0}, uitesteri.speed);}, uitesteri.speed/2);
                setTimeout(function() { $(e).removeClass('uitesteri-click'); }, uitesteri.speed*2);
            }
        },
        mousedown: function(c) {
            $(c.elemFn()).simulate('mousedown');
        },
        mouseup: function(c) {
            $(c.elemFn()).simulate('mouseup');
        },
        drag: function(c) {
            var elem = c.elemFn();
            
            // jquery datetimepicker plugin
            if (elem.nodeName.toLowerCase() == 'dt' && $(elem.parentNode.parentNode).hasClass('ui-timepicker-div'))
                elem = $('.ui-slider-handle', elem.nextSibling).get(0);

            var dx = elem.parentNode.clientWidth > elem.parentNode.clientHeight ? c.toPercentage*elem.parentNode.clientWidth/100 : 0;
            var dy = elem.parentNode.clientWidth > elem.parentNode.clientHeight ? 0 : c.toPercentage*elem.parentNode.clientHeight/100;
            $(elem).simulate('drag', { dx: dx, dy: dy, moves: parseInt(uitesteri.speed/100) });
        },
        clickPoint: function(c) {
            $(document.elementFromPoint(c.x, c.y)).simulate('click');
        },
        keyup: function(c) {
            $(c.elemFn()).simulate(c.name, {keyCode: c.keyCode, charCode: c.keyCode, which: c.which});
        },
        keydown: function(c) {
            $(c.elemFn()).simulate(c.name, {keyCode: c.keyCode, charCode: c.keyCode, which: c.which});
        },
        keypress: function(c) {
            $(c.elemFn()).simulate(c.name, {keyCode: c.keyCode, charCode: c.keyCode, which: c.which});
        },
        type: function(c) {
            var elem = c.elemFn();
            var target = $('input,textarea', elem);
            if (target.length == 0 && elem.nodeName.toLowerCase() == 'label')
                target = $('#' + elem.attributes['for'].value);
            if (target.length == 0)
                target = $('input,textarea', elem.parentNode);
            
            target.val(target.val() + c.text);
        },
        clear: function(c) {
            var elem = c.elemFn();
            var target = $('input,textarea', elem);
            if (target.length == 0 && elem.nodeName.toLowerCase() == 'label')
                target = $('#' + elem.attributes['for'].value);
            if (target.length == 0)
                target = $('input,textarea', elem.parentNode);
            
            target.val('');
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
    }
};
