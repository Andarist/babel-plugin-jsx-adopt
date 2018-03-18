const Context = React.createContext(['foo', 'bar']);

class Title extends React.Component {
  render() {
    return <Context.Consumer>{([foo, bar]) => {
        return <h1>
        {foo + ' ' + bar}
      </h1>;
      }}</Context.Consumer>;
  }

}
