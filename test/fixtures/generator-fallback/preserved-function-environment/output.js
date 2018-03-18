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
    var _this = this;

    function* _adopter() {
      const numbers = [];
      let number;

      do {
        number = yield <Countdown max={_this.props.max} />;
        numbers.push(number);
      } while (number);

      return <span>{numbers.join(', ')}</span>;
    }

    return _adoptChildren(_adopter());
  }

}
