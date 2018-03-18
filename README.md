# babel-plugin-jsx-adopt

> This plugin transforms `adopt` calls to render props. Idea based on [this gist](https://gist.github.com/trueadm/35f083d32e5af93dd8fd706dae378123#file-2-future-ideas-js-L24).
> ⚠️ **Experimental:** Code you are likely to write should be transformed just fine, convoluted/edge cases might not be covered yet.

## Example

### Input

```js
const Example = () => {
  const theme = adopt(<Theme />)
  const counter = adopt(<Counter />)
  const toggle = adopt(<Toggle />)

  return (
    <div style={{ color: theme === 'light' ? '#000' : '#fff' }}>
      <span>{`Count: ${counter}`}</span>
      <button onClick={toggle}>{'Toggle'}</button>
    </div>
  )
}
```

### Output

```js
const Example = () => {
  return (
    <Theme>
      {theme => (
        <Counter>
          {counter => (
            <Toggle>
              {toggle => (
                <div style={{ color: theme === 'light' ? '#000' : '#fff' }}>
                  <span>{`Count: ${counter}`}</span>
                  <button onClick={toggle}>{'Toggle'}</button>
                </div>
              )}
            </Toggle>
          )}
        </Counter>
      )}
    </Theme>
  )
}
```

## Installation

```sh
npm install --save-dev babel-plugin-jsx-adopt
```

If you want to use it with babel@7, you should also install `babel-core@^7.0.0-0` (just to prevent peer dep warnings).

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["babel-plugin-jsx-adopt"]
}
```

### Via CLI

```sh
babel --plugins babel-plugin-jsx-adopt script.js
```

### Via Node API

```javascript
require('babel-core').transform('code', {
  plugins: ['babel-plugin-jsx-adopt'],
})
```
