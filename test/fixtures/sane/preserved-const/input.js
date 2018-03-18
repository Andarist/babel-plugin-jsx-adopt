const Context = React.createContext('foo')

class Title extends React.Component {
  render() {
    const foo = adopt(<Context.Consumer />)
    return (
      <h1>
        {foo}
      </h1>
    );
  }
}
