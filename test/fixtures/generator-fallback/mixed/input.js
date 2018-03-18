class Title extends React.Component {
  render() {
    let answer = adopt(<Answer />)

    const numbers = []
    let number
    do {
      number = adopt(<Countdown max={5}/>)
      numbers.push(number)
    } while (number)

    return <span>{numbers.join(', ') + '\n The answer is ' + answer}</span>
  }
}
