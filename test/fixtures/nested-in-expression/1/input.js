class Title extends React.Component {
  render() {
    let foo = 'foo', bar, theme = ('pre', 42, adopt(<ThemeContext.Consumer />)), post = 'post';
    return (
      <h1 style={{color: theme === 'light' ? '#000' : '#fff'}}>
        {this.props.children}
      </h1>
    );
  }
}
