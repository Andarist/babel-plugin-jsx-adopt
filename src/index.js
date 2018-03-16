import jsx from '@babel/plugin-syntax-jsx'

export default ({ types: t }) => {
  // const buildAdopted = template.expression(`
  //   <TAG>{CONSUMED => {
  //     REST
  //   }}</TAG>
  // `, {
  //   plugins: ['jsx'],
  // })
  const buildAdopted = ({ TAG, CONSUMED, REST }) => {
    const openingTag = t.cloneNode(TAG)
    openingTag.selfClosing = false
    const closingTag = t.cloneNode(TAG)
    closingTag.type = 'JSXClosingElement'
    return t.jsxElement(openingTag, closingTag, [
      t.jsxExpressionContainer(t.arrowFunctionExpression([CONSUMED], t.blockStatement(REST))),
    ])
  }

  return {
    inherits: jsx,
    visitor: {
      CallExpression(path) {
        if (path.get('callee.name').node !== 'adopt') {
          return
        }

        const consumer = path.get('arguments.0')

        if (!consumer.isJSXElement()) {
          return
        }

        const stmt = path.findParent(p => p.isStatement())

        if (path.parentPath.isVariableDeclarator()) {
          const nextSiblings = stmt.getAllNextSiblings()

          stmt.replaceWith(
            t.returnStatement(
              buildAdopted({
                TAG: consumer.get('openingElement').node,
                CONSUMED: path.parentPath.get('id').node,
                REST: nextSiblings.map(p => p.node),
              }),
            ),
          )

          nextSiblings.forEach(path => path.remove())
        }
      },
    },
  }
}
