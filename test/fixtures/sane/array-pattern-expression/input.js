const Context = React.createContext(['foo', 'bar'])

class Title extends React.Component {
  render() {
    let foo, bar
    [foo, bar] = adopt(<Context.Consumer />)
    return (
      <h1>
        {foo + ' ' + bar}
      </h1>
    );
  }
}
