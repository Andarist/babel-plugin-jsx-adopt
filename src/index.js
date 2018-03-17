import jsx from '@babel/plugin-syntax-jsx'

const flatMap = (iteratee, arr) => [].concat(...arr.map(iteratee))
const last = arr => (arr.length > 0 ? arr[arr.length - 1] : undefined)

export default ({ types: t }) => {
  const tryUnnesting = ({ parentPath, node, key }, state = { success: true, nodes: [node], index: 0, id: null }) => {
    if (parentPath.isExpressionStatement()) {
      return state
    } else if (parentPath.isVariableDeclarator()) {
      if (state.nodes.length - 1 === state.index) {
        state.id = parentPath.get('id').node
      }
      state.nodes = [...state.nodes.slice(0, -1), t.assignmentExpression(operator, left, last(state.nodes))]

      // const { key } = parentPath
      // const declaration = parentPath.parentPath
      // const { kind } = declaration.node
      // nodes.push(
      //   declaration
      //     .get('declarations')
      //     .map(p => t.variableDeclaration(kind, p.node))
      // )
      // return nodes
      return { success: false }
    } else if (parentPath.isVariableDeclaration()) {
      return { success: false }
    } else if (parentPath.isAssignmentExpression()) {
      const { operator, left } = parentPath.node
      if (state.nodes.length - 1 === state.index) {
        state.id = parentPath.get('left').node
      }
      state.nodes = [...state.nodes.slice(0, -1), t.assignmentExpression(operator, left, last(state.nodes))]
      return tryUnnesting(parentPath, state)
    } else if (parentPath.isSequenceExpression()) {
      state.index += key
      state.nodes = flatMap((p, i) => (i === key ? state.nodes : p.node), parentPath.get('expressions'))
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
          stmt.replaceWithMultiple(nodes.map(node => t.expressionStatement(node)))
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
