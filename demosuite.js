(function() {var suite = [
function Demo_test() {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      highlight(find('Whatever you search')),
      highlight(find('specific piece of text')),
      highlight(find('Images can be found')),
      click(find('schools')),
      highlight(find('sub header', 'subsub-header', 'foo')),
      highlight(find('fallback-to-avoid')),
      type('Hello!', find('wrapping label')),
      type('Hi there!', find('external to its field')),
      type('Found it!', find('scope to the specific fieldset', 'input label'))
    );
  }
}
]; suite.name = 'Demo Suite'; return suite; })()