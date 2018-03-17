class Title extends React.Component {
  render() {
    const theme = adopt(<ThemeContext.Consumer />);
    const toggled = adopt(<ToggleContext.Consumer />);
    return (
      <h1 style={{color: theme.color}}>
        {toggled ? this.props.children : null}
      </h1>
    );
  }
}
