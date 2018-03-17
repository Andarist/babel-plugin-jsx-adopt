class Title extends React.Component {
  render() {
    return <ThemeContext.Consumer>{theme => {
        return <ToggleContext.Consumer>{toggled => {
            return <h1 style={{
              color: theme.color
            }}>
        {toggled ? this.props.children : null}
      </h1>;
          }}</ToggleContext.Consumer>;
      }}</ThemeContext.Consumer>;
  }

}
