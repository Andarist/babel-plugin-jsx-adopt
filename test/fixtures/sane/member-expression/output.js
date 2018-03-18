const Context = React.createContext('foo');

class Title extends React.Component {
  render() {
    return <Context.Consumer>{_foo => {
        this.foo = _foo;
        return <h1>
        {this.foo}
      </h1>;
      }}</Context.Consumer>;
  }

}
