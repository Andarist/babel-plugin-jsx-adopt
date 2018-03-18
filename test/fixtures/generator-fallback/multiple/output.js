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
      const numbers = [];
      let number;

      do {
        number = yield <Countdown max={5} />;
        numbers.push(number);
      } while (number);

      const answer = Math.random() > 0.5 ? yield <Counter /> : 42;
      return <span>{numbers.join(', ') + '\n The answer is ' + answer}</span>;
    }

    return _adoptChildren(_adopter());
  }

}
