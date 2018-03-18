function getSuperPropBinding(t, thisEnvFn, isAssignment, propName) {
  const op = isAssignment ? 'set' : 'get'

  return getBinding(thisEnvFn, `superprop_${op}:${propName || ''}`, () => {
    const argsList = []

    let fnBody
    if (propName) {
      // () => super.foo
      fnBody = t.memberExpression(t.super(), t.identifier(propName))
    } else {
      const method = thisEnvFn.scope.generateUidIdentifier('prop')
      // (method) => super[method]
      argsList.unshift(method)
      fnBody = t.memberExpression(t.super(), t.identifier(method.name), true /* computed */)
    }

    if (isAssignment) {
      const valueIdent = thisEnvFn.scope.generateUidIdentifier('value')
      argsList.push(valueIdent)

      fnBody = t.assignmentExpression('=', fnBody, t.identifier(valueIdent.name))
    }

    return t.arrowFunctionExpression(argsList, fnBody)
  })
}

function getSuperPropCallBinding(t, thisEnvFn, propName) {
  return getBinding(thisEnvFn, `superprop_call:${propName || ''}`, () => {
    const argsBinding = thisEnvFn.scope.generateUidIdentifier('args')
    const argsList = [t.restElement(argsBinding)]

    let fnBody
    if (propName) {
      // (...args) => super.foo(...args)
      fnBody = t.callExpression(t.memberExpression(t.super(), t.identifier(propName)), [
        t.spreadElement(t.identifier(argsBinding.name)),
      ])
    } else {
      const method = thisEnvFn.scope.generateUidIdentifier('prop')
      // (method, ...args) => super[method](...args)
      argsList.unshift(method)
      fnBody = t.callExpression(t.memberExpression(t.super(), t.identifier(method.name), true /* computed */), [
        t.spreadElement(t.identifier(argsBinding.name)),
      ])
    }

    return t.arrowFunctionExpression(argsList, fnBody)
  })
}

function standardizeSuperProperty(t, superProp) {
  if (superProp.parentPath.isAssignmentExpression() && superProp.parentPath.node.operator !== '=') {
    const assignmentPath = superProp.parentPath

    const op = assignmentPath.node.operator.slice(0, -1)
    const value = assignmentPath.node.right

    assignmentPath.node.operator = '='
    if (superProp.node.computed) {
      const tmp = superProp.scope.generateDeclaredUidIdentifier('tmp')

      assignmentPath
        .get('left')
        .replaceWith(
          t.memberExpression(
            superProp.node.object,
            t.assignmentExpression('=', tmp, superProp.node.property),
            true /* computed */,
          ),
        )

      assignmentPath
        .get('right')
        .replaceWith(
          t.binaryExpression(
            op,
            t.memberExpression(superProp.node.object, t.identifier(tmp.name), true /* computed */),
            value,
          ),
        )
    } else {
      assignmentPath.get('left').replaceWith(t.memberExpression(superProp.node.object, superProp.node.property))

      assignmentPath
        .get('right')
        .replaceWith(
          t.binaryExpression(
            op,
            t.memberExpression(superProp.node.object, t.identifier(superProp.node.property.name)),
            value,
          ),
        )
    }
    return [assignmentPath.get('left'), assignmentPath.get('right').get('left')]
  } else if (superProp.parentPath.isUpdateExpression()) {
    const updateExpr = superProp.parentPath

    const tmp = superProp.scope.generateDeclaredUidIdentifier('tmp')
    const computedKey = superProp.node.computed ? superProp.scope.generateDeclaredUidIdentifier('prop') : null

    const parts = [
      t.assignmentExpression(
        '=',
        tmp,
        t.memberExpression(
          superProp.node.object,
          computedKey ? t.assignmentExpression('=', computedKey, superProp.node.property) : superProp.node.property,
          superProp.node.computed,
        ),
      ),
      t.assignmentExpression(
        '=',
        t.memberExpression(
          superProp.node.object,
          computedKey ? t.identifier(computedKey.name) : superProp.node.property,
          superProp.node.computed,
        ),
        t.binaryExpression('+', t.identifier(tmp.name), t.numericLiteral(1)),
      ),
    ]

    if (!superProp.parentPath.node.prefix) {
      parts.push(t.identifier(tmp.name))
    }

    updateExpr.replaceWith(t.sequenceExpression(parts))

    const left = updateExpr.get('expressions.0.right')
    const right = updateExpr.get('expressions.1.left')
    return [left, right]
  }

  return [superProp]
}

function hasSuperClass(thisEnvFn) {
  return thisEnvFn.isClassMethod() && !!thisEnvFn.parentPath.parentPath.node.superClass
}

function getBinding(thisEnvFn, key, init) {
  const cacheKey = 'binding:' + key
  let data = thisEnvFn.getData(cacheKey)
  if (!data) {
    const id = thisEnvFn.scope.generateUidIdentifier(key)
    data = id.name
    thisEnvFn.setData(cacheKey, data)

    thisEnvFn.scope.push({
      id: id,
      init: init(data),
    })
  }

  return data
}

function getThisBinding(t, thisEnvFn, inConstructor) {
  return getBinding(thisEnvFn, 'this', thisBinding => {
    if (!inConstructor || !hasSuperClass(thisEnvFn)) return t.thisExpression()

    const supers = new WeakSet()
    thisEnvFn.traverse({
      Function(child) {
        if (child.isArrowFunctionExpression()) return
        child.skip()
      },
      ClassProperty(child) {
        if (child.node.static) return
        child.skip()
      },
      CallExpression(child) {
        if (!child.get('callee').isSuper()) return
        if (supers.has(child.node)) return
        supers.add(child.node)

        child.replaceWith(t.assignmentExpression('=', t.identifier(thisBinding), child.node))
      },
    })
  })
}

function getSuperBinding(t, thisEnvFn) {
  return getBinding(thisEnvFn, 'supercall', () => {
    const argsBinding = thisEnvFn.scope.generateUidIdentifier('args')
    return t.arrowFunctionExpression(
      [t.restElement(argsBinding)],
      t.callExpression(t.super(), [t.spreadElement(t.identifier(argsBinding.name))]),
    )
  })
}

function getScopeInformation(fnPath) {
  const thisPaths = []
  const argumentsPaths = []
  const newTargetPaths = []
  const superProps = []
  const superCalls = []

  fnPath.traverse({
    ClassProperty(child) {
      if (child.node.static) return
      child.skip()
    },
    Function(child) {
      if (child.isArrowFunctionExpression()) return
      child.skip()
    },
    ThisExpression(child) {
      thisPaths.push(child)
    },
    JSXIdentifier(child) {
      if (child.node.name !== 'this') return
      if (
        !child.parentPath.isJSXMemberExpression({ object: child.node }) &&
        !child.parentPath.isJSXOpeningElement({ name: child.node })
      ) {
        return
      }

      thisPaths.push(child)
    },
    CallExpression(child) {
      if (child.get('callee').isSuper()) superCalls.push(child)
    },
    MemberExpression(child) {
      if (child.get('object').isSuper()) superProps.push(child)
    },
    ReferencedIdentifier(child) {
      if (child.node.name !== 'arguments') return

      argumentsPaths.push(child)
    },
    MetaProperty(child) {
      if (!child.get('meta').isIdentifier({ name: 'new' })) return
      if (!child.get('property').isIdentifier({ name: 'target' })) return

      newTargetPaths.push(child)
    },
  })

  return {
    thisPaths,
    argumentsPaths,
    newTargetPaths,
    superProps,
    superCalls,
  }
}

function hoistFunctionEnvironment(t, fnPath, specCompliant = false, allowInsertArrow = true) {
  const thisEnvFn = fnPath.findParent(
    p => (p.isFunction() && !p.isArrowFunctionExpression()) || p.isProgram() || p.isClassProperty({ static: false }),
  )
  const inConstructor = thisEnvFn && thisEnvFn.node.kind === 'constructor'

  if (thisEnvFn.isClassProperty()) {
    throw fnPath.buildCodeFrameError('Unable to transform arrow inside class property')
  }

  const { thisPaths, argumentsPaths, newTargetPaths, superProps, superCalls } = getScopeInformation(fnPath)

  // Convert all super() calls in the constructor, if super is used in an arrow.
  if (inConstructor && superCalls.length > 0) {
    if (!allowInsertArrow) {
      throw superCalls[0].buildCodeFrameError('Unable to handle nested super() usage in arrow')
    }
    const allSuperCalls = []
    thisEnvFn.traverse({
      Function(child) {
        if (child.isArrowFunctionExpression()) return
        child.skip()
      },
      ClassProperty(child) {
        if (child.node.static) return
        child.skip()
      },
      CallExpression(child) {
        if (!child.get('callee').isSuper()) return
        allSuperCalls.push(child)
      },
    })
    const superBinding = getSuperBinding(t, thisEnvFn)
    allSuperCalls.forEach(superCall => {
      const callee = t.identifier(superBinding)
      callee.loc = superCall.node.callee.loc

      superCall.get('callee').replaceWith(callee)
    })
  }

  // Convert all "this" references in the arrow to point at the alias.
  let thisBinding
  if (thisPaths.length > 0 || specCompliant) {
    thisBinding = getThisBinding(t, thisEnvFn, inConstructor)

    if (
      !specCompliant ||
      // In subclass constructors, still need to rewrite because "this" can't be bound in spec mode
      // because it might not have been initialized yet.
      (inConstructor && hasSuperClass(thisEnvFn))
    ) {
      thisPaths.forEach(thisChild => {
        const thisRef = thisChild.isJSX() ? t.jsxIdentifier(thisBinding) : t.identifier(thisBinding)

        thisRef.loc = thisChild.node.loc
        thisChild.replaceWith(thisRef)
      })

      if (specCompliant) thisBinding = null
    }
  }

  // Convert all "arguments" references in the arrow to point at the alias.
  if (argumentsPaths.length > 0) {
    const argumentsBinding = getBinding(thisEnvFn, 'arguments', () => t.identifier('arguments'))

    argumentsPaths.forEach(argumentsChild => {
      const argsRef = t.identifier(argumentsBinding)
      argsRef.loc = argumentsChild.node.loc

      argumentsChild.replaceWith(argsRef)
    })
  }

  // Convert all "new.target" references in the arrow to point at the alias.
  if (newTargetPaths.length > 0) {
    const newTargetBinding = getBinding(thisEnvFn, 'newtarget', () =>
      t.metaProperty(t.identifier('new'), t.identifier('target')),
    )

    newTargetPaths.forEach(targetChild => {
      const targetRef = t.identifier(newTargetBinding)
      targetRef.loc = targetChild.node.loc

      targetChild.replaceWith(targetRef)
    })
  }

  // Convert all "super.prop" references to point at aliases.
  if (superProps.length > 0) {
    if (!allowInsertArrow) {
      throw superProps[0].buildCodeFrameError('Unable to handle nested super.prop usage')
    }

    const flatSuperProps = superProps.reduce((acc, superProp) => acc.concat(standardizeSuperProperty(t, superProp)), [])

    flatSuperProps.forEach(superProp => {
      const key = superProp.node.computed ? '' : superProp.get('property').node.name

      if (superProp.parentPath.isCallExpression({ callee: superProp.node })) {
        const superBinding = getSuperPropCallBinding(t, thisEnvFn, key)

        if (superProp.node.computed) {
          const prop = superProp.get('property').node
          superProp.replaceWith(t.identifier(superBinding))
          superProp.parentPath.node.arguments.unshift(prop)
        } else {
          superProp.replaceWith(t.identifier(superBinding))
        }
      } else {
        const isAssignment = superProp.parentPath.isAssignmentExpression({
          left: superProp.node,
        })
        const superBinding = getSuperPropBinding(t, thisEnvFn, isAssignment, key)

        const args = []
        if (superProp.node.computed) {
          args.push(superProp.get('property').node)
        }

        if (isAssignment) {
          const value = superProp.parentPath.node.right
          args.push(value)
          superProp.parentPath.replaceWith(t.callExpression(t.identifier(superBinding), args))
        } else {
          superProp.replaceWith(t.callExpression(t.identifier(superBinding), args))
        }
      }
    })
  }

  return thisBinding
}

// https://github.com/babel/babel/blob/8eee435cd6227587e20c9d1235ba4cca4b05e6fc/packages/babel-traverse/src/path/conversion.js#L87
export default (t, fnPath) => {
  if (typeof fnPath.unwrapFunctionEnvironment === 'function') {
    fnPath.unwrapFunctionEnvironment()
    return
  }

  if (!fnPath.isArrowFunctionExpression() && !fnPath.isFunctionExpression() && !fnPath.isFunctionDeclaration()) {
    throw fnPath.buildCodeFrameError('Can only unwrap the environment of a function.')
  }

  hoistFunctionEnvironment(t, fnPath)
}
