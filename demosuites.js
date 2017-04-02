addSuites([

(function() {var suite = [

(function() {var test = function () {
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

(function() {var test = function () {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('demo.html'),
      type('Hello!', find('wrapping label')),
      type('Hi there!', find('external to its field')),
      type('Found it!', find('scope to the specific fieldset', 'input label'))
    );
  }
}; test.title = "Labels and fieldsets"; return test; })(),

(function() {var test = function () {
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
      click(find('submit button')),
      type('typing', find('datalist')),
      click(find('datalist', 'vidi')),
      type('a42', find('numbers')),
      write('1982-01-22', find('dates')),
      write('#0000ff', find('color')),
      write(7, find('range')),
      write('2014-02', find('month')),
      write('2017-W12', find('week')),
      write('12:12:12.111', find('to a time')),
      write('1982-01-22T09:09', find('datetime-local')),
      type('foo', find('an email')),
      type('bar', find('a search')),
      type('baz', find('a tel')),
      type('quux', find('a url'))
    );
  }
}; test.title = "Form fields"; return test; })()



]; suite.title = "Demo suite"; return suite; })(),


(function() {var suite = [

(function() {var test = function () {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('https://lahteenmaki.net/https/www.lupapiste.fi/'),
      click(find('Luvanhakija')),
      highlight(find('Rekisteröidy pankkitunnuksilla')),
      highlight(find('Valitse kartalta hankkeesi sijainti')),
      highlight(find('Tee neuvontapyyntö')),
      highlight(find('Jätä hakemus')),
      type('Kangasala', find('Kirjoita kunnan nimi')),
      click(find('Katso mistä kunnista', '')),
      highlight(find('Rekisteröidy palveluun')),
      highlight(find('Lupapisteen prosessi'))
    );
  }
}; test.title = "Luvanhakija"; return test; })()



]; suite.title = "Lupapiste suite"; return suite; })(),


(function() {var suite = [

(function() {var test = function () {
  with (uitesteri) with (commands) {
    var zoomslider = function() {return document.getElementsByClassName('ol-zoomslider')[0]};
    return steps(
      gotoLocation('https://lahteenmaki.net/https/rata.digitraffic.fi/infra-api/'),
      click(find('Zoom in')),
      click(find('Zoom in')),
      click(find('Zoom out')),
      click(find('Zoom out')),
      drag(zoomslider, 30),
      highlight(find('500 m')),
      drag(zoomslider, 70),
      highlight(find('10 km'))
    );
  }
}; test.title = "Zoom"; return test; })()



]; suite.title = "Infra-API suite"; return suite; })(),


(function() {var suite = [

(function() {var test = function () {
  with (uitesteri) with (commands) {
    return steps(
      gotoLocation('https://lahteenmaki.net/https/rata.digitraffic.fi/vuosisuunnitelmat/')
      
    );
  }
}; test.title = "Zoom"; return test; })()



]; suite.title = "Vuosisuunnitelmat suite"; return suite; })()
]);