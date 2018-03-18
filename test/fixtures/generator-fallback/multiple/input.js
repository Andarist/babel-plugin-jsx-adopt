class Title extends React.Component {
  render() {
    const numbers = []
    let number
    do {
      number = adopt(<Countdown max={5}/>)
      numbers.push(number)
    } while (number)

    const answer = Math.random() > 0.5 ? adopt(<Counter />) : 42

    return <span>{numbers.join(', ') + '\n The answer is ' + answer}</span>
  }
}
