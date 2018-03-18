const Context = React.createContext('foo')

class Title extends React.Component {
  render() {
    this.foo = adopt(<Context.Consumer />)
    return (
      <h1>
        {this.foo}
      </h1>
    );
  }
}
