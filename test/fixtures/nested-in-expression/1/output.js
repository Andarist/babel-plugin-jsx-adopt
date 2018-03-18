class Title extends React.Component {
  render() {
    let foo = 'foo',
        bar;
    'pre', 42;
    return <ThemeContext.Consumer>{theme => {
        let post = 'post';
        return <h1 style={{
          color: theme === 'light' ? '#000' : '#fff'
        }}>
        {this.props.children}
      </h1>;
      }}</ThemeContext.Consumer>;
  }

}
