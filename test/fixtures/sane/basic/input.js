const ThemeContext = React.createContext('light')

class Title extends React.Component {
  render() {
    let theme = adopt(<ThemeContext.Consumer />)
    return (
      <h1 style={{color: theme === 'light' ? '#000' : '#fff'}}>
        {this.props.children}
      </h1>
    );
  }
}
