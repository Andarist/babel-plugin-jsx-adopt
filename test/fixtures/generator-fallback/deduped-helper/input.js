class Title extends React.Component {
  render() {
    const counter = Math.random() > 0.5 ? adopt(<Counter />) : 42
    return <span>{'The answer is ' + counter}</span>
  }
}

class Subtitle extends React.Component {
  render() {
    const numbers = []
    let number
    do {
      number = adopt(<Countdown max={5}/>)
      numbers.push(number)
    } while (number)

    return <span>{numbers.join(', ')}</span>
  }
}
