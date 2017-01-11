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
      highlight(find('fallback-to-avoid')),
      type('Hello!', find('wrapping label')),
      type('Hi there!', find('external to its field')),
      type('Found it!', find('scope to the specific fieldset', 'input label'))
    );
  }
}; test.title = "Demo test"; return test; })()
]; suite.title = "Demo suite"; return suite; })()
]