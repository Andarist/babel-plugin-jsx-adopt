import jsx from '@babel/plugin-syntax-jsx'

const last = arr => (arr.length > 0 ? arr[arr.length - 1] : undefined)

export default ({ types: t }) => {
  const tryUnnesting = ({ parentPath, node, key }, state = { success: true, nodes: [node], index: 0, id: null }) => {
    if (parentPath.isExpressionStatement()) {
      return state
    } else if (parentPath.isVariableDeclarator()) {
      const id = parentPath.get('id').node
      const { key: parentKey, parentPath: declaration } = parentPath
      const { kind, declarations } = declaration.node

      if (state.nodes.length - 1 === state.index) {
        state.id = id
      }

      if (parentKey > 0) {
        state.index++
      }

      state.nodes = [
        parentKey > 0 && t.variableDeclaration(kind, declarations.slice(0, parentKey)),
        ...state.nodes.slice(0, -1),
        t.variableDeclaration(kind, [t.variableDeclarator(id, last(state.nodes))]),
        parentKey < declarations.length - 1 && t.variableDeclaration(kind, declarations.slice(parentKey + 1)),
      ].filter(Boolean)

      return state
    } else if (parentPath.isAssignmentExpression()) {
      const { operator, left } = parentPath.node
      if (state.nodes.length - 1 === state.index) {
        state.id = parentPath.get('left').node
      }
      state.nodes = [...state.nodes.slice(0, -1), t.assignmentExpression(operator, left, last(state.nodes))]
      return tryUnnesting(parentPath, state)
    } else if (parentPath.isSequenceExpression()) {
      const { expressions } = parentPath.node

      if (key > 0) {
        state.index++
      }

      state.nodes = [
        key > 0 && t.sequenceExpression(expressions.slice(0, key)),
        ...state.nodes,
        key < expressions.length - 1 && t.sequenceExpression(expressions.slice(key + 1)),
      ].filter(Boolean)

      return tryUnnesting(parentPath, state)
    } else {
      return { success: false }
    }
  }

  const buildAdopted = ({ TAG, ADOPTED, REST }) => {
    /*
      <TAG>{ADOPTED => {
        REST
      }}</TAG>
    */
    const openingTag = t.cloneNode(TAG)
    openingTag.selfClosing = false
    const closingTag = t.cloneNode(TAG)
    closingTag.type = 'JSXClosingElement'
    return t.jsxElement(openingTag, closingTag, [
      t.jsxExpressionContainer(t.arrowFunctionExpression([ADOPTED], t.blockStatement(REST))),
    ])
  }

  const getId = stmt => {
    if (stmt.isExpressionStatement()) {
      return stmt.get('expression.left.name').node
    }
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

        const { success, nodes, index, id } = tryUnnesting(path)

        if (success === false) {
          // generator logic
          return
        }

        const stmt = path.findParent(p => p.isStatement())
        const stmtKey = stmt.key

        if (nodes.length > 1) {
          stmt.replaceWithMultiple(nodes.map(node => (t.isStatement(node) ? node : t.expressionStatement(node))))
        }

        const updatedStmt = stmt.getSibling(stmtKey + index)
        const nextSiblings = updatedStmt.getAllNextSiblings()

        updatedStmt.replaceWith(
          t.returnStatement(
            buildAdopted({
              TAG: consumer.get('openingElement').node,
              ADOPTED: id,
              REST: nextSiblings.map(p => p.node),
            }),
          ),
        )

        nextSiblings.forEach(path => path.remove())
      },
    },
  }
}
