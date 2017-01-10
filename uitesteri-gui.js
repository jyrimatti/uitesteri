
$(function() {
    window.onmessage = function(original) { return function(e) {
        console.debug('uitesteri-gui received message: ');
        console.debug(e);
        if (e.data.name == 'load') {
            postMessage({ name: 'init', url: 'https://cdnjs.cloudflare.com/ajax/libs/yui/3.18.1/yui-base/yui-base-min.js' }, '*');
            setTimeout(function() {
                postMessage({ name: 'init', url: 'https://cdnjs.cloudflare.com/ajax/libs/yui/3.18.1/event-simulate/event-simulate-min.js' }, '*');
            }, 50); // why do I need the delay?
            setTimeout(function() {
                var basepath = window.location.href.substring(0, window.location.href.replace(window.location.hash, '').lastIndexOf('/') + 1);
                postMessage({ name: 'init', url: basepath + 'uitesteri-runner.js' }, '*');
            }, 100); // why do I need the delay?
        }
        if (original) {
            original(e);
        }
    };}(window.onmessage);

    if (window.location.hash.length <= 1) {
        window.location.hash = 'https://raw.githubusercontent.com/jyrimatti/uitesteri/master/demosuites.js';
    }
    if (window.location.hash.length > 1) {
        var load = window.location.hash.substring(1);
        $.get(load).success(function(data) {
            eval(data).forEach(function(s) { addSuite(s); });
        });
    }

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
    var suiteHTML = $('<div class="suite"><h3 contenteditable>' + (suite.title ? suite.title : 'unnamed suite') + '</h3><button class="runSuite" onclick="runSuite(this)">-></button><button class="remove" onclick="removeSuite(this)" title="Remove suite">-</button><button onclick="newTest(this)" title="Add test">+</button><div class="content"><div class="suitetests"></div></div></div>')
        .appendTo($('.suites'));
    var testContainer = $('.suitetests', suiteHTML);
    suite.forEach(function(test) {
        addTest(testContainer, test);
    });
};

var addTest = function(suite, test) {
    $('<div class="test"><h4 contenteditable></h4><button class="run" onclick="runTest(this)">-></button><button class="remove" onclick="removeTest(this)" title="Remove test">-</button><div class="content"><pre contenteditable class="prettyprint lang-js"></pre><div class="elapsed"></div><div class="results"></div></div></div>')
        .appendTo(suite)
        .find('.prettyprint').text(test.toString())
        .parents('.test').find('h4').text(test.title ? test.title : 'unnamed test');
}

var resetTest = function(test) {
    $(test).removeClass('success')
              .removeClass('failed')
              .find('.elapsed').empty()
              .parent().find('.results').empty();
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
    $(test).addClass(errors(results).length > 0 ? 'failed' : 'success')
      .find('.elapsed').text('Elapsed: ' + (results.results.ended-results.results.started) + 'ms')
      .parent().find('.results').text(JSON.stringify(errors(results).map(function(r) { return r.exception.message; })));
};

var errors = function(results) {
    return results.results.results.filter(function(r) {
        return r.exception;
    });
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

window.newTest = function(self) {
    addTest($(self).parents('.suite'),
      'with (uitesteri) with (commands) {\n' +
      '  return steps(\n' +
      '  );\n' +
      '}'
    );
};

window.newSuite = function(self) {
    addSuite([]);
};

window.removeSuite = function(self) {
    $(self).parents('.suite').remove();
};

window.removeTest = function(self) {
    $(self).parents('.test').remove();
};

window.exportTests = function() {
    $('section').hide();
    $('#export')
        .text('[\n' + $('.suite').map(function() {
            var suiteName = $('h3', this).text();
            return '(function() {var suite = [\n' + $('.test', this).map(function() {
                var testName = $('h4', this).text();
                return '(function() {var test = function() {\n' + $('pre', this).text() + '\n; test.name = "' + testName + '"; return test; })()';
            }).toArray().join(',\n') + '\n]; suite.name = "' + suiteName + '"; return suite; })()';
        }).toArray().join(',\n') + '\n]')
        .show()
        .click(function() { $(this).hide(); $('section').show(); });
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
            }, 150);  // why do I need the delay?
        }
    };
    newHandler.uitestHandler = true;
    window.onmessage = newHandler;
    doRun();
};