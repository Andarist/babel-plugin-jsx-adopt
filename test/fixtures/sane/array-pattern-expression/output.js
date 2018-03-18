const Context = React.createContext(['foo', 'bar']);

class Title extends React.Component {
  render() {
    let foo, bar;
    return <Context.Consumer>{_ref => {
        [foo, bar] = _ref;
        return <h1>
        {foo + ' ' + bar}
      </h1>;
      }}</Context.Consumer>;
  }

}
