
var createScript = function(uri) {
    var script = document.createElement('script');
        
    var type = document.createAttribute('type');
    type.value = 'text/javascript';
    script.setAttributeNode(type);

    var src = document.createAttribute('src');
    src.value = uri;
    script.setAttributeNode(src);

    document.body.appendChild(script);
}

$(function() {
    window.onmessage = function(original) { return function(e) {
        console.debug('uitesteri-gui received message: ');
        console.debug(e);
        if (e.data.name == 'load') {
            postMsg({ name: 'init', url: 'https://cdnjs.cloudflare.com/ajax/libs/yui/3.18.0/yui/yui-min.js' }, '*');
            setTimeout(function() {
                postMsg({ name: 'init', url: (window.location.protocol == 'file:' ? 'https://lahteenmaki.net/uitesteri' : window.location.protocol + '//' + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))) + '/uitesteri-runner.js' }, '*');
            }, 200); // why do I need the delay?
        }
        if (original) {
            original(e);
        }
    };}(window.onmessage);

    
    var load = window.location.hash.length > 1 ? window.location.hash.substring(1) : 'demosuites.js';
    window.history.replaceState(null, null, window.location.pathname + window.location.search);
    createScript(load);

    var autorun = getParameterByName('autorun');
    if (autorun === '') {
        console.info('Autorunning all tests');
        setTimeout(runall, 1000);
    } else if (autorun) {
        setTimeout(function() {
            $('.suite h3:contains(' + autorun + ')').each(function() {
                console.info('Autorunning suite: ' + $(this).text());
                $(this).parents('.suite').find('button.run').click();
            });
        }, 1000);
    }
});

var getParameterByName = function(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var postMsg = function(data) {
    var testframe = document.getElementById('testframe');
    console.debug('uitesteri-gui posting message:');
    console.debug(data);
    testframe.contentWindow.postMessage(data, '*');
};

window.addSuites = function(suites) {
    suites.forEach(addSuite);
};

var addSuite = function(suite) {
    var suiteHTML = $('<div class="suite"><h3 contenteditable>' + (suite.title ? suite.title : 'unnamed suite') + '</h3><button class="remove" onclick="removeSuite(this)" title="Remove suite">-</button><button onclick="newTest(this)" title="Add test">+</button><button class="run" onclick="runSuite(this)">&#9658;</button><div class="suitetests"></div></div>')
        .appendTo($('.suites'));
    var testContainer = $('.suitetests', suiteHTML);
    suite.forEach(function(test) {
        addTest(testContainer, test);
    });
    return suiteHTML;
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
    window.history.replaceState(null, null, window.location.pathname + '?autorun');
    $('.test').each(function() {resetTest(this);});
    $('#speed').val(1);
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
    var ms = results.results.ended-results.results.started;
    $(test).addClass(errors(results).length > 0 ? 'failed' : 'success')
      .find('.elapsed').attr('data-elapsed', ms).text('(' + ms + 'ms)')
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
    $('body > *').hide();
    $('#export')
        .text('addSuites([\n' + $('.suite').map(function() {
            var suiteName = $('h3', this).text();
            return '(function() {var suite = [\n\n' + $('.test', this).map(function() {
                var testName = $('h4', this).text();
                return '(function() {var test = function() {\n' + $('pre', this).text() + '\n; test.name = "' + testName + '"; return test; })()';
            }).toArray().join(',\n\n') + '\n\n]; suite.name = "' + suiteName + '"; return suite; })()';
        }).toArray().join(',\n\n\n\n') + '\n]);\n')
        .show()
        .click(function() { $('body > *').show(); $(this).hide(); });
};

window.downloadResults = function(self) {
    $(self).attr('href', 'data:application/octet-stream;charset=utf-8;base64,' + btoa(resultsXML()));
};

window.resultsXML = function() {
    var suites = $('.suite');
    var errors = $('.error', suites).size();
    var failures = $('.failed', suites).size();
    var time = 0;
    $('.test .elapsed', suites).each(function() { time += parseInt($(this).attr('data-elapsed')); });

    return '' +
    '<?xml version="1.0" encoding="UTF-8"?>\n' +    
    '<testsuites errors="' + errors + '" failures="' + failures + '" time="' + (time/1000) + '">\n' +
    
    suites.get().map(function(suite) {
        var suiteTests = $('.test', suite);
        var errors = $('.error', suite).size();
        var failures = $('.failed', suite).size();
        var name = escapeXML($('h3', suite).text());
        var tests = suiteTests.size();
        var suiteTime = 0;
        $('.elapsed', suiteTests).each(function() { suiteTime += parseInt($(this).attr('data-elapsed')); });
        return '' +
    '    <testsuite errors="' + errors + '" failures="' + failures + '" name="' + name + '" tests="' + tests + '" time="' + (suiteTime/1000) + '">\n' +
            suiteTests.get().map(function(test) {
                var name = escapeXML($('h4', test).text());
                var testTime = parseInt($('.elapsed', test).attr('data-elapsed'));
                var message = escapeXML($('.results', test).text());
                return '' +
       '        <testcase name="' + name + '" time="' + (testTime/1000) + '">\n' +
       ($(test).hasClass('failed') ?
       '            <failure message="' + message + '" />\n'
       : $(test).hasClass('error') ?
       '            <error message="' + message + '" />\n'
       : '') +
       '        </testcase>';
            }).join('\n') + '\n' +
    '    </testsuite>';
    }).join('\n') + '\n' +
    '</testsuites>';
};

window.escapeXML = function(text) {
    return text.replace(new RegExp('&', 'g'), '&amp;').replace(new RegExp('"', 'g'), '&quot;').replace(new RegExp("'", 'g'), '&apos;').replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;')
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