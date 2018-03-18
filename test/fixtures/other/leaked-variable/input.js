let theme

class Title extends React.Component {
  render() {
    theme = adopt(<ThemeContext.Consumer />)
    return (
      <h1 style={{color: theme === 'light' ? '#000' : '#fff'}}>
        {this.props.children}
      </h1>
    );
  }
}
