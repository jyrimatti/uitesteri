
$(function() {
    window.onmessage = function(original) { return function(e) {
        console.debug('uitesteri-gui received message: ');
        console.debug(e);
        if (e.data.name == 'load') {
            postMsg({ name: 'init', url: 'https://cdnjs.cloudflare.com/ajax/libs/yui/3.18.0/yui/yui-min.js' }, '*');
            setTimeout(function() {
                postMsg({ name: 'init', url: 'https://lahteenmaki.net/uitesteri/uitesteri-runner.js' }, '*');
            }, 200); // why do I need the delay?
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

var postMsg = function(data) {
    var testframe = document.getElementById('testframe');
    console.debug('uitesteri-gui posting message:');
    console.debug(data);
    testframe.contentWindow.postMessage(data, '*');
};

var addSuite = function(suite) {
    var suiteHTML = $('<div class="suite"><h3 contenteditable>' + (suite.title ? suite.title : 'unnamed suite') + '</h3><button class="remove" onclick="removeSuite(this)" title="Remove suite">-</button><button onclick="newTest(this)" title="Add test">+</button><button class="run" onclick="runSuite(this)">&#9658;</button><div class="suitetests"></div></div>')
        .appendTo($('.suites'));
    var testContainer = $('.suitetests', suiteHTML);
    suite.forEach(function(test) {
        addTest(testContainer, test);
    });
};

var addTest = function(suite, test) {
    $('<div class="test"><h4 contenteditable></h4><span class="elapsed"></span><button class="run" onclick="runTest(this)">&#9658;</button><button class="remove" onclick="removeTest(this)" title="Remove test">-</button><pre contenteditable class="prettyprint lang-js"></pre><div class="results"></div></div>')
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
    postMsg({ name: 'speed', speed: 0 }, '*');
    postMsg({ name: 'continue' }, '*');
};

var pause = function() {
    $(document.body).addClass('paused');
    postMsg({ name: 'speed', speed: 0 }, '*');
};

var play = function() {
    $(document.body).removeClass('paused');
    postMsg({ name: 'speed', speed: document.getElementById('speed').value }, '*');
    postMsg({ name: 'continue' }, '*');
};

var run = function(tests) {
    if (tests.length == 0) {
        return;
    }

    var test = tests[0];
    test.scrollIntoView(false);

    $(document.body).addClass('running');
    $(test).addClass('running');
    var testframe = document.getElementById('testframe');
    runIn(testframe, eval('(' + $(test).find('pre').text() + ')'), function(res) {
        $(document.body).removeClass('running');
        $(document.body).removeClass('paused');
        $(test).removeClass('running');
        finished(test, res);
        run(tests.slice(1));
    }); 
};

var finished = function(test, results) {
    console.info(results);
    $(test).addClass(errors(results).length > 0 ? 'failed' : 'success')
      .find('.elapsed').text('(' + (results.results.ended-results.results.started) + 'ms)')
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
    postMsg({ name: 'speed', speed: speed }, '*');
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
      'function() {\n' +
      '  with (uitesteri) with (commands) {\n' +
      '    return steps(\n' +
      '      // TODO: add steps here\n' +
      '    );\n' +
      '  }\n' +
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
    $('body *').hide();
    $('#export')
        .text('[\n' + $('.suite').map(function() {
            var suiteName = $('h3', this).text();
            return '(function() {var suite = [\n\n' + $('.test', this).map(function() {
                var testName = $('h4', this).text();
                return '(function() {var test = function() {\n' + $('pre', this).text() + '\n; test.name = "' + testName + '"; return test; })()';
            }).toArray().join(',\n\n') + '\n\n]; suite.name = "' + suiteName + '"; return suite; })()';
        }).toArray().join(',\n\n\n\n') + '\n]\n')
        .show()
        .click(function() { $('body *').show(); $(this).hide(); });
};

var runIn = function(iframe, test, callback) {
    var originalHandler = window.onmessage;
    if (originalHandler && originalHandler.uitestHandler)
        throw new Error('Already executing');

    var doRun = function(skip) {
        postMsg({ name: 'speed', speed: document.getElementById('speed').value }, '*');
        postMsg({ name: 'run', test: test.toString(), skip: skip }, '*');
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
            }, 1000);  // why do I need the delay?
        }
    };
    newHandler.uitestHandler = true;
    window.onmessage = newHandler;
    doRun();
};