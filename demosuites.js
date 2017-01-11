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
}; test.title = "Basics"; return test; })()

(function() {var test = function() {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      type('Hello!', find('wrapping label')),
      type('Hi there!', find('external to its field')),
      type('Found it!', find('scope to the specific fieldset', 'input label'))
    );
  }
}; test.title = "Labels and fieldsets"; return test; })()

(function() {var test = function() {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      click(find('Form fields', 'input text')),
      type(' it is', find('Form fields', 'input text')),
      click(find('placeholder')),
      type('found by placeholder', find('placeholder')),
      click(find('textarea text')),
      clear(find('textarea text')),
      type('replaced previous', find('textarea text')),
      click(find('lorem')),
      click(find('finnish', 'ipsum'))
    );
  }
}; test.title = "Form fields"; return test; })()



]; suite.title = "Demo suite"; return suite; })()
]