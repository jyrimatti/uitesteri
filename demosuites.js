[
(function() {var suite = [

(function() {var test = function() {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      highlight(find('Whatever you search')),
      highlight(find('specific piece of text')),
      highlight(find('Images can be found')),
      click(find('Earth')),
      highlight(find('sub header', 'subsub-header', 'foo')),
      highlight(find('fallback-to-avoid'))
    );
  }
}; test.title = "Basics"; return test; })(),

(function() {var test = function() {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      type('Hello!', find('wrapping label')),
      type('Hi there!', find('external to its field')),
      type('Found it!', find('scope to the specific fieldset', 'input label'))
    );
  }
}; test.title = "Labels and fieldsets"; return test; })(),

(function() {var test = function() {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      type(' it is', find('Form fields', 'input text')),
      type('found by placeholder', find('placeholder')),
      clear(find('textarea text')),
      type('replaced previous', find('textarea text')),
      click(find('finnish', 'ipsum')),
      click(find('radio 1')),
      click(find('radio 2')),
      click(find('checkbox')),
      click(find('button element')),
      click(find('submit button'))
    );
  }
}; test.title = "Form fields"; return test; })()



]; suite.title = "Demo suite"; return suite; })()
]