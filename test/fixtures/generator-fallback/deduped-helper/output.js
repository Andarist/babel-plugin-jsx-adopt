function _adoptChildren(it, adopted) {
  const {
    value: element,
    done
  } = it.next(adopted);
  if (done) return element;
  return React.cloneElement(element, null, adopted => _adoptChildren(it, adopted));
}

class Title extends React.Component {
  render() {
    function* _adopter() {
      const counter = Math.random() > 0.5 ? yield <Counter /> : 42;
      return <span>{'The answer is ' + counter}</span>;
    }

    return _adoptChildren(_adopter());
  }

}

class Subtitle extends React.Component {
  render() {
    function* _adopter2() {
      const numbers = [];
      let number;

      do {
        number = yield <Countdown max={5} />;
        numbers.push(number);
      } while (number);

      return <span>{numbers.join(', ')}</span>;
    }

    return _adoptChildren(_adopter2());
  }

}
