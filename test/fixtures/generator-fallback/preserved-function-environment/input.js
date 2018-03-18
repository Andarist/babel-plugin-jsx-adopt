class Title extends React.Component {
  render() {
    const numbers = []
    let number
    do {
      number = adopt(<Countdown max={this.props.max}/>)
      numbers.push(number)
    } while (number)

    return <span>{numbers.join(', ')}</span>
  }
}
