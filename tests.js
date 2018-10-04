
const wait = (sleep) => new Promise(resolve => setTimeout(resolve, sleep));

const assertEqual = (a, b, message) => {
  if (a !== b) {
    throw new Error(`Expected ${a} to equal ${b}: ${message}`);
  }
}
const assert = (val, message) => {
  if (!val) {
    throw new Error(message);
  }
}
const getValidCSSName = () => [...new Array(10)].map(_ =>
  String.fromCharCode(97 + Math.floor(Math.random()*26))).join('');

const getValidCSSPropName = () => `--${getValidCSSName()}`;

const createStyle = str => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(str));
  document.head.appendChild(style);
}

const ANIMATION_NAME = 'test-animation';
const KEYFRAME_PROP = '--keyframe-property';
const tests = [];
const container = document.querySelector('#tests');

function addTest (desc, fn, selector) {
  const el = container.querySelector(selector);
  el.querySelector('.desc').innerText = desc;
  tests.push({ desc, fn, el });
}

async function runTests () {
  for (let test of tests) {
    const { el, fn } = test;
    el.querySelector('.source').innerText = fn.toString();
    try {
      await fn(el);
      el.querySelector('.current').classList.add('supported');
    } catch (e) {
      el.querySelector('.current').classList.add('unsupported');
      console.warn(e);
    }
  }
}

addTest('attributeStyleMap.get(v) returns CSSUnitValue for <number> type', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>',
    inherits: false,
    initialValue: '0',
  });

  el.attributeStyleMap.set(name, '10');
  assert(el.attributeStyleMap.get(name) instanceof CSSUnitValue);
}, '#attrstylemap-get-type');

addTest('attributeStyleMap.get(v) returns CSSUnitValue for <number> type', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<transform-list>',
    inherits: false,
    initialValue: 'translate3d(0, 0, 0)'
  });

  el.style.setProperty(name, 'translate3d(10px, 20px, 30px) rotate3d(0, 1, 0, 45deg)');
  assert(el.attributeStyleMap.get(name) instanceof CSSTransformValue);
}, '#attrstylemap-get-transform-value');

addTest('attributeStyleMap.set() can set a list via <number>#', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>#',
    inherits: false,
    initialValue: '0, 0, 0',
  });

  // Results in "TypeError: Failed to execute 'set' on 'StylePropertyMap': Invalid type for property"
  // for all below arguments in Chromium 71
  const argSet = [
    ['10, 20, 30'],
    ['10', '20', '30'],
    [CSS.number(10), CSS.number(20), CSS.number(30)],
    [[CSS.number(10), CSS.number(20), CSS.number(30)]],
  ];

  for (let args of argSet) {
    let thrown = false;
    try {
      values = el.attributeStyleMap.set(name, ...args);
    } catch (e) { thrown = true; }
    if (!thrown) {
      break;
    }
  }

  const values = el.attributeStyleMap.getAll(name);
  assertEqual(values.length, 3);
  assert(values.every((v, i) => v.value === ((i+1)*10)));
}, '#attrstylemap-set-list');

addTest('computedStyleMap().get(v) returns CSSUnitValue for <number> type', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>',
    inherits: false,
    initialValue: '0',
  });

  assert(el.computedStyleMap().get(name) instanceof CSSUnitValue);
}, '#computedstylemap-get-type');

addTest('computedStyleMap().get(v) returns CSSTransformValue for <transform-list>', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<transform-list>',
    inherits: false,
    initialValue: 'translate3d(0, 0, 0)'
  });

  el.style.setProperty(name, 'translate3d(10px, 20px, 30px) rotate3d(0, 1, 0, 45deg)');
  assert(el.attributeStyleMap.get(name) instanceof CSSTransformValue);
}, '#computedstylemap-get-transform-value');

addTest('CSS transitions interpolate over <number>', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>',
    inherits: false,
    initialValue: '0',
  });

  el.attributeStyleMap.set('transition', `${name} 5s`);
  el.attributeStyleMap.set(name, '10');

  await wait(100);

  const value = el.computedStyleMap().get(name).value;

  assert(value > 0);
  assert(value < 10);
}, '#interpolate-transitions');

addTest('CSS keyframes interpolate over <number>', async function (el) {
  const name = getValidCSSPropName();
  const animation = getValidCSSName();

  createStyle(`
    @keyframes ${animation} {
      from { ${name}: 0; }
      to{ ${name}: 10; }
    }
  `);

  CSS.registerProperty({
    name,
    syntax: '<number>',
    inherits: false,
    initialValue: '0',
  });

  el.attributeStyleMap.set('animation', `${animation} 5s alternate infinite`);

  await wait(100);

  const value = el.computedStyleMap().get(name).value;

  assert(value > 0);
  assert(value < 10);
}, '#interpolate-keyframes');

addTest('CSS transitions interpolate over <number># list', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>#',
    inherits: false,
    initialValue: '0, 0, 0',
  });

  el.attributeStyleMap.set('transition', `${name} 5s`);
  // @TODO this doesn't work? 'Invalid type for property'
  //el.attributeStyleMap.set(name, CSSStyleValue.parseAll(name, '10, 20, 30'));
  el.style.setProperty(name, '10, 20, 30');

  await wait(100);

  const values = el.computedStyleMap().getAll(name);
  assertEqual(values.length, 3);

  for (let cssObj of values) {
    assert(cssObj.value > 0);
    assert(cssObj.value < 10);
  }
}, '#interpolate-transitions-list');

addTest('CSS keyframes interpolate over <number># list', async function (el) {
  const name = getValidCSSPropName();
  const animation = getValidCSSName();

  createStyle(`
    @keyframes ${animation} {
      from { ${name}: 0, 0, 0; }
      to{ ${name}: 10, 20, 30; }
    }
  `);

  CSS.registerProperty({
    name,
    syntax: '<number>#',
    inherits: false,
    initialValue: '0, 0, 0',
  });

  el.attributeStyleMap.set('animation', `${animation} 5s alternate infinite`);

  await wait(100);

  const values = el.computedStyleMap().getAll(name);
  assertEqual(values.length, 3);

  for (let cssObj of values) {
    assert(cssObj.value > 0);
    assert(cssObj.value < 10);
  }
}, '#interpolate-keyframes-list');

addTest('CSSStyleValue.parse returns an CSSUnitType for <number>', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>',
    inherits: false,
    initialValue: '0',
  });

  const parsed = CSSStyleValue.parse(name, '10');
  assert(parsed instanceof CSSUnitValue);
  assert(parsed.value === 10);
  assert(parsed.unit === 'number');
}, '#css-parse-type');

addTest('CSSStyleValue.parseAll returns a list of CSSUnitType for <number>#', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>#',
    inherits: false,
    initialValue: '0, 0, 0',
  });

  const values = CSSStyleValue.parseAll(name, '10, 10, 10');
  assertEqual(values.length, 3);

  for (let cssObj of values) {
    assert(cssObj instanceof CSSUnitValue);
    assert(cssObj.value === 10);
  }
}, '#css-parse-all-type-pound');

addTest('CSSStyleValue.parseAll returns a list of CSSUnitType for <number>+', async function (el) {
  const name = getValidCSSPropName();
  CSS.registerProperty({
    name,
    syntax: '<number>+',
    inherits: false,
    initialValue: '0 0 0',
  });

  const values = CSSStyleValue.parseAll(name, '10 10 10');
  assertEqual(values.length, 3);

  for (let cssObj of values) {
    assert(cssObj instanceof CSSUnitValue);
    assert(cssObj.value === 10);
  }
}, '#css-parse-all-type-plus');



runTests();
