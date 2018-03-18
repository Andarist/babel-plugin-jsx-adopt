class Title extends React.Component {
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
