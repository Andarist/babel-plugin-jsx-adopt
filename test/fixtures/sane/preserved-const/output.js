const Context = React.createContext('foo');

class Title extends React.Component {
  render() {
    return <Context.Consumer>{_foo => {
        const foo = _foo;
        return <h1>
        {foo}
      </h1>;
      }}</Context.Consumer>;
  }

}
