const Context = React.createContext({
  foo: 'foo',
  bar: 'bar'
});

class Title extends React.Component {
  render() {
    let foo, bar;
    return <Context.Consumer>{_foo$bar => {
        ({
          foo,
          bar
        } = _foo$bar);
        return <h1>
        {foo + ' ' + bar}
      </h1>;
      }}</Context.Consumer>;
  }

}
