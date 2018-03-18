class Title extends React.Component {
  render() {
    let theme = adopt(<ThemeContext.Consumer />)
    let toggled = adopt(<ToggleContext.Consumer />)
    return (
      <h1 style={{color: theme.color}}>
        {toggled ? this.props.children : null}
      </h1>
    );
  }
}
