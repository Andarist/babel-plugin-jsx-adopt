const ThemeContext = React.createContext('light');

class Title extends React.Component {
  render() {
    return <ThemeContext.Consumer>{theme => {
        return <h1 style={{
          color: theme === 'light' ? '#000' : '#fff'
        }}>
        {this.props.children}
      </h1>;
      }}</ThemeContext.Consumer>;
  }

}
