import jsx from '@babel/plugin-syntax-jsx'

const last = arr => (arr.length > 0 ? arr[arr.length - 1] : undefined)
const memoize = fn => {
  let cached
  return (...args) => {
    if (cached) {
      return cached
    }

    return (cached = fn(...args))
  }
}

export default ({ types: t, template }) => {
  const addAdoptChildren = memoize(file => {
    const id = file.scope.generateUidIdentifier('adoptChildren')
    const helper = template(`
      function ID(it, adopted) {
        const { value: element, done } = it.next(adopted)
        if (done) return element
        return React.cloneElement(element, null, adopted => ID(it, adopted))
      }
    `)({ ID: id })
    const [inserted] = file.path.unshiftContainer('body', [helper])
    file.scope.registerDeclaration(inserted)
    return id
  })

  const tryUnnesting = (
    { parentPath, node, key, scope },
    state = { success: true, nodes: [node], index: 0, id: null },
  ) => {
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
      const id = parentPath.get('left').node

      if (state.nodes.length - 1 === state.index) {
        state.id = scope.generateUidIdentifierBasedOnNode(id)
      }

      state.nodes = [
        ...state.nodes.slice(0, -1),
        t.assignmentExpression(operator, left, last(state.nodes)),
        state.id && t.assignmentExpression('=', id, state.id),
      ].filter(Boolean)
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

  const isAdoptingCall = path => path.get('callee.name').node === 'adopt' && path.get('arguments.0').isJSXElement()

  const convertToGenerator = (file, fnPath) => {
    const id = fnPath.scope.generateUidIdentifier('adopter')
    const bodyPath = fnPath.get('body')
    const gen = t.functionDeclaration(id, [], bodyPath.node, true)

    bodyPath.replaceWith(
      t.blockStatement([
        gen,
        t.returnStatement(t.callExpression(t.cloneNode(addAdoptChildren(file)), [t.callExpression(id, [])])),
      ]),
    )

    const genPath = bodyPath.get('body.0')
    fnPath.scope.registerDeclaration(genPath)
    genPath.unwrapFunctionEnvironment()

    genPath.traverse({
      Function: path => path.skip(),
      CallExpression(path) {
        if (!isAdoptingCall(path)) {
          return
        }

        path.replaceWith(t.yieldExpression(path.get('arguments.0').node))
      },
    })
  }

  return {
    inherits: jsx,
    visitor: {
      CallExpression(path, { file }) {
        if (!isAdoptingCall(path)) {
          return
        }

        const stmt = path.findParent(p => p.isStatement())
        const stmtKey = stmt.key

        if (!stmt.parentPath.isBlockStatement() || !stmt.parentPath.parentPath.isFunction()) {
          convertToGenerator(file, path.findParent(p => p.isFunction()))
          return
        }

        const { success, nodes, index, id } = tryUnnesting(path)

        if (success === false) {
          convertToGenerator(file, path.findParent(p => p.isFunction()))
          return
        }

        if (nodes.length > 1) {
          stmt.replaceWithMultiple(nodes.map(node => (t.isStatement(node) ? node : t.expressionStatement(node))))
        }

        const updatedStmt = stmt.getSibling(stmtKey + index)
        const nextSiblings = updatedStmt.getAllNextSiblings()

        updatedStmt.replaceWith(
          t.returnStatement(
            buildAdopted({
              TAG: path.get('arguments.0.openingElement').node,
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
