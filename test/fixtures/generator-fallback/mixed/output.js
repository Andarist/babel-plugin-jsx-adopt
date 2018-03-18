function _adoptChildren(it, adopted) {
  const {
    value: element,
    done
  } = it.next(adopted);
  if (done) return element;

  element.props.children = adopted => _adoptChildren(it, adopted);

  return element;
}

class Title extends React.Component {
  render() {
    return <Answer>{answer => {
        function* _adopter() {
          const numbers = [];
          let number;

          do {
            number = yield <Countdown max={5} />;
            numbers.push(number);
          } while (number);

          return <span>{numbers.join(', ') + '\n The answer is ' + answer}</span>;
        }

        return _adoptChildren(_adopter());
      }}</Answer>;
  }

}
