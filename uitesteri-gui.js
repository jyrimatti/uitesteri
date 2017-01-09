
$(function() {
    window.onmessage = function(original) { return function(e) {
        console.debug('uitesteri-gui received message: ');
        console.debug(e);
        if (e.data.name == 'load') {
            postMessage({ name: 'init', url: 'https://cdnjs.cloudflare.com/ajax/libs/yui/3.18.1/yui-base/yui-base-min.js' }, '*');
            setTimeout(function() {
                postMessage({ name: 'init', url: 'https://cdnjs.cloudflare.com/ajax/libs/yui/3.18.1/event-simulate/event-simulate-min.js' }, '*');
            }, 25); // why do I need the delay?
            setTimeout(function() {
                var basepath = window.location.href.substring(0, window.location.href.replace(window.location.hash, '').lastIndexOf('/') + 1);
                postMessage({ name: 'init', url: basepath + 'uitesteri-runner.js' }, '*');
            }, 50); // why do I need the delay?
        }
        if (original) {
            original(e);
        }
    };}(window.onmessage);

    if (window.location.hash.length <= 1) {
        window.location.hash = 'https://raw.githubusercontent.com/jyrimatti/uitesteri/master/demosuite.js';
    }
    if (window.location.hash.length > 1) {
        var load = window.location.hash.substring(1);
        $.get(load).success(function(data) {
            addSuite(eval(data));
        });
    }

    resetNewTest();

    if (window.location.search.indexOf('autorun') != -1) {
        runall();
    }
});

var postMessage = function(data) {
    var testframe = document.getElementById('testframe');
    console.debug('uitesteri-gui posting message:');
    console.debug(data);
    testframe.contentWindow.postMessage(data, '*');
};

var addSuite = function(suite) {
    var suiteHTML = $('<div class="suite"><h3>' + (suite.name ? suite.name : 'unnamed suite') + '</h3><div class="content"><button class="runSuite" onclick="runSuite(this)">aja</button><div class="suitetests"></div></div></div>').appendTo($('.tests'));
    var testContainer = $('.suitetests', suiteHTML);
    suite.forEach(function(test) {
        $('<div class="test"><div class="name"></div><div class="content"><button class="runtest" onclick="runTest(this)">aja</button><pre contenteditable class="prettyprint lang-js"></pre><div class="results"></div></div></div>').appendTo(testContainer)
            .find('.prettyprint').text(test.toString())
            .parents('.test').find('.name').text(test.name ? test.name : 'unnamed test');
    });
};

var resetTest = function(test) {
    $(test).removeClass('success')
              .removeClass('failed')
              .find('.results').empty();
};

var runall = function() {
    $('.test').each(function() {resetTest(this);});
    run($('.test'));
};

var step = function() {
    postMessage({ name: 'continue' }, '*');
};

var run = function(tests) {
    if (tests.length == 0) {
        return;
    }
    $(tests[0]).addClass('running');
    var testframe = document.getElementById('testframe');
    runIn(testframe, eval('(' + $(tests[0]).find('pre').text() + ')'), function(res) {
        $(tests[0]).removeClass('running');
        finished(tests[0], res);
        run(tests.slice(1));
    }); 
};

var finished = function(test, results) {
    console.info(results);
    $(test).filter(function() {
        return $('pre', this).text() == results.test;
    }).addClass(succeeded(results) ? 'success' : 'failed')
      .find('.results').text('Elapsed: ' + (results.results.ended-results.results.started) + 'ms');
};

var succeeded = function(results) {
    return results.results.results.filter(function(r) {
        return r.exception;
    }).length == 0;
};

var resetNewTest = function() {
    $('#newTest').val('function newtest() {\n  with (uitest) with (commands) {\n    return steps(\n    );\n  }\n}');
};

window.speedChange = function(self) {
    var speed = self.value;
    console.info('Changing speed to ' + speed);
    postMessage({ name: 'speed', speed: speed }, '*');
};

window.runTest = function(self) {
    var test = $(self).parents('.test');
    resetTest(test);
    run(test);
};

window.runSuite = function(self) {
    $(self).find('.test').each(function() {resetTest(this);});
    run($(self).parents('.suite').find('.test'));
};

window.addTest = function() {
    var newTestOrSuite = $('#newTest').val();
    if (newTestOrSuite.startsWith('(')) {
        newTestOrSuite = newTestOrSuite;
    } else {
        newTestOrSuite = '(' + newTestOrSuite + ')';
    }
    var evalled = eval(newTestOrSuite);
    if (evalled === undefined) {
        throw "Error evaluating test or suite";
    } else if (!(evalled instanceof Array)) {
        evalled = [evalled]; 
    }
    
    resetNewTest();
    addSuite(evalled);
};

var runIn = function(iframe, test, callback) {
    var originalHandler = window.onmessage;
    if (originalHandler && originalHandler.uitestHandler)
        throw new Error('Already executing');

    var doRun = function(skip) {
        postMessage({ name: 'speed', speed: document.getElementById('speed').value }, '*');
        postMessage({ name: 'run', test: test.toString(), skip: skip }, '*');
    };

    var executedResults = [];
    var newHandler = function(e) {
        if (originalHandler) {
            originalHandler(e);
        }

        if (e.data.name == 'finished') {
            window.onmessage = originalHandler;
            var allResults = e.data.results;
            allResults.results = executedResults.concat(allResults.results);
            callback({test: test, results: allResults });
        } else if (e.data.name == 'commandExecuted') {
            console.debug(e.data.result);
            executedResults.push(e.data.result);
        } else if (e.data.name == 'load') {
            setTimeout(function() {
                doRun(executedResults.length);
            }, 75);  // why do I need the delay?
        }
    };
    newHandler.uitestHandler = true;
    window.onmessage = newHandler;
    doRun();
};