class Title extends React.Component {
  render() {
    const counter = Math.random() > 0.5 ? adopt(<Counter />) : 42
    return <span>{'The answer is ' + counter}</span>
  }
}
