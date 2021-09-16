import * as ts from 'typescript';

console.log('Compiling component.');

const generateElementId = (() => {
    let count = 0;
    return () => `$$element${count++}`;
})();

interface PropertyAccess {
    elementId: string;
    attribute: string;
    properties: string[];
    expression: ts.Expression;
}
const accesses: Array<PropertyAccess> = [];

function analyzeComponentClass(component: ts.ClassDeclaration, context: ts.TransformationContext): ts.VisitResult<ts.Node> {

    let jsxPath: Array<string | number> = [];
    let memberUsages: string[] = [];
    let currentAttribute: null | string;
    let pendingAccesses: Array<PropertyAccess> = [];

    function jsxAttributeVisitor(node: ts.Node): ts.VisitResult<ts.Node> {
        if (ts.isPropertyAccessExpression(node) &&
            ts.isToken(node.expression) && node.expression.kind === ts.SyntaxKind.ThisKeyword) {
            console.log(`Render function is using member ${node.name.getText()}.`);
            memberUsages.push(node.name.getText());
            return node;
        }
        return ts.visitEachChild(node, jsxAttributeVisitor, context);
    }

    function jsxAttributesVisitor(node: ts.Node): ts.VisitResult<ts.Node> {
        if (ts.isJsxAttribute(node) && node.initializer?.kind === ts.SyntaxKind.JsxExpression) {
            currentAttribute = node.name.getText();
            const ret = ts.visitNode(node.initializer, jsxAttributeVisitor);

            if (memberUsages.length > 0 && node.initializer.expression != null) {
                pendingAccesses.push({
                    elementId: '',
                    attribute: currentAttribute,
                    expression: node.initializer.expression,
                    properties: [...memberUsages]
                });
            }
            memberUsages = [];
            currentAttribute = null;
            return ret;
        }
        return node;
    }

    function createElementSaveExpression(wrapped: ts.Expression, factory: ts.NodeFactory): ts.Expression {
        const id = generateElementId();
        accesses.push(...pendingAccesses.map(m => { m.elementId = id; return m}));
        pendingAccesses = [];

        return factory.createJsxExpression(undefined, factory.createParenthesizedExpression(
            factory.createBinaryExpression(
                factory.createElementAccessExpression(factory.createToken(ts.SyntaxKind.ThisKeyword), factory.createStringLiteral(id)),
                factory.createToken(ts.SyntaxKind.EqualsToken),
                wrapped
            )
        ));
    }

    function visitJsxOpeningElement(node: ts.JsxOpeningLikeElement): boolean {
        ts.visitEachChild(node.attributes, jsxAttributesVisitor, context);
        return pendingAccesses.length > 0;
    }

    const renderVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isJsxElement(node)) {
            if (visitJsxOpeningElement(node.openingElement)) {
                return createElementSaveExpression(node, context.factory);
            }
        } else if (ts.isJsxSelfClosingElement(node)) {
            if(visitJsxOpeningElement(node)) {
                return createElementSaveExpression(node, context.factory);
            }
        }
        return ts.visitEachChild(node, renderVisitor, context);
    };

    const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isMethodDeclaration(node)) {
            if (node.name.getText() === 'render') {
                console.log('found render');
                return ts.visitEachChild(node, renderVisitor, context);
            }
        }
        return node;
    };
    return ts.visitEachChild(component, visitor, context);
}

const analyze: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (ts.isClassDeclaration(node)) {
                return analyzeComponentClass(node, context);
            }

            return ts.visitEachChild(node, visitor, context);
        }
        if (/\.svelte\.tsx$/.test(sourceFile.fileName)) {
            return context.factory.updateSourceFile(sourceFile, [
                context.factory.createImportDeclaration(
                    /* decorators */ undefined,
                    /* modifiers */ undefined,
                    context.factory.createImportClause(
                        false,
                        undefined,
                        context.factory.createNamedImports([
                            context.factory.createImportSpecifier(undefined, context.factory.createIdentifier('$$markDirty')),
                        ])
                    ),
                    context.factory.createStringLiteral('./framework')
                ),
                ...sourceFile.statements.map(s => ts.visitNode(s, visitor))
            ]);
        } else {
            return sourceFile;
        }
    }
};

function isThisPropertyAccessExpression(node: ts.Node): node is ts.PropertyAccessExpression {
    return ts.isPropertyAccessExpression(node) &&
    ts.isToken(node.expression) && node.expression.kind === ts.SyntaxKind.ThisKeyword;
}

function createMarkDirtyCall({factory}: ts.TransformationContext) {
    return factory.createExpressionStatement(
        factory.createCallExpression(
            factory.createIdentifier('$$markDirty'),
            [],
            [factory.createToken(ts.SyntaxKind.ThisKeyword)]
        )
    )
}

function createGenericStyleMutationStatement(mutation: PropertyAccess, factory: ts.NodeFactory): ts.Statement {
    return factory.createExpressionStatement(
        factory.createCallExpression(
            factory.createPropertyAccessExpression(
                factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier('Object'),
                        factory.createIdentifier('entries')
                    ),
                    [], [
                        mutation.expression
                    ]
                ),
                factory.createIdentifier('forEach')
            ),
            [], [
                factory.createArrowFunction(
                    [], [], [
                        factory.createParameterDeclaration(
                            undefined, undefined, undefined,
                            factory.createArrayBindingPattern([
                                factory.createBindingElement(undefined, undefined, 'key'),
                                factory.createBindingElement(undefined, undefined, 'value')
                            ])
                        ),
                    ],
                    undefined,
                    undefined,
                    factory.createBlock([
                        factory.createExpressionStatement(
                            factory.createCallExpression(
                                factory.createPropertyAccessExpression(
                                    factory.createPropertyAccessExpression(
                                        factory.createElementAccessExpression(
                                            factory.createToken(ts.SyntaxKind.ThisKeyword),
                                            factory.createStringLiteral(mutation.elementId)
                                        ),
                                        factory.createIdentifier('style')
                                    ),
                                    factory.createIdentifier('setProperty')
                                ),
                                [], [
                                    factory.createIdentifier('key'),
                                    factory.createIdentifier('value')
                                ]
                            )
                        )
                    ])
                )
            ]
        )
    );
}

function createStylePropertyName(name: ts.PropertyName, factory: ts.NodeFactory): ts.Expression {
    if (ts.isLiteralExpression(name)) {
        return name;
    } else if (ts.isIdentifier(name)) {
        return factory.createStringLiteral(name.text);
    }
    throw new Error('Unsupported style key');
}

function createStyleMutationStatement(mutation: PropertyAccess, factory: ts.NodeFactory): ts.Statement {
    if (ts.isObjectLiteralExpression(mutation.expression)) {
        return factory.createBlock(mutation.expression.properties.map(property => {
            if (!ts.isPropertyAssignment(property)) {
                throw new Error('Does not support style with something other than property assignments')
            }
            return factory.createExpressionStatement(
                factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createPropertyAccessExpression(
                            factory.createElementAccessExpression(
                                factory.createToken(ts.SyntaxKind.ThisKeyword),
                                factory.createStringLiteral(mutation.elementId)
                            ),
                            factory.createIdentifier('style')
                        ),
                        factory.createIdentifier('setProperty')
                    ),
                    [], [
                        createStylePropertyName(property.name, factory),
                        property.initializer
                    ]
                )
            );
        }));
    } else {
        return createGenericStyleMutationStatement(mutation, factory);
    }
}

function createAttributeMutationStatement(mutation: PropertyAccess, factory: ts.NodeFactory): ts.Statement {
    return factory.createExpressionStatement(
        factory.createCallExpression(
            factory.createPropertyAccessExpression(
                factory.createElementAccessExpression(
                    factory.createToken(ts.SyntaxKind.ThisKeyword),
                    factory.createStringLiteral(mutation.elementId)
                ),
                factory.createIdentifier('setAttribute')
            ),
            [], [
                factory.createStringLiteral(mutation.attribute),
                mutation.expression
            ]
        )
    );
}

function createMutationStatement(mutation: PropertyAccess, factory: ts.NodeFactory): ts.Statement {
    if (mutation.attribute === 'style') {
        return createStyleMutationStatement(mutation, factory);
    } else {
        return createAttributeMutationStatement(mutation, factory);
    }
    
}

function createRefreshMethod(factory: ts.NodeFactory): ts.MethodDeclaration {

    return factory.createMethodDeclaration(
        /* decorators */ [],
        /* modifiers */ [ factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
        /* asterisk */ undefined,
        '$$refresh',
        /* questionToken */ undefined,
        /* typeParameters */ [],
        /* parameters */ [],
        factory.createToken(ts.SyntaxKind.VoidKeyword),
        factory.createBlock(accesses.map(mutation => createMutationStatement(mutation, factory)))
    );
}

function transformComponentClass(component: ts.ClassDeclaration, context: ts.TransformationContext): ts.VisitResult<ts.Node> {

    let functionContext: string[] = [];
    const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isMethodDeclaration(node)) {
            functionContext.push(node.name.getText());
            const ret = ts.visitEachChild(node, visitor, context);
            functionContext.pop();
            return ret;
        }
        if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) && isThisPropertyAccessExpression(node.expression.left)) {
            const memberName = node.expression.left.name.getText();
            if (accesses.some(m => m.properties.includes(memberName))) {
                console.log(`Detected a mutation of render property ${memberName} in ${functionContext.join('.')}`);
                return [node, createMarkDirtyCall(context)];
            }
        }
        return ts.visitEachChild(node, visitor, context);
    };
    return context.factory.updateClassDeclaration(
        component,
        component.decorators,
        component.modifiers,
        component.name,
        component.typeParameters,
        component.heritageClauses,
        [
            ...component.members.map(member => ts.visitNode(member, visitor)),
            createRefreshMethod(context.factory)
        ]);
}

const transform: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (ts.isClassDeclaration(node)) {
                return transformComponentClass(node, context);
            }

            return ts.visitEachChild(node, visitor, context);
        }
        if (/\.svelte\.tsx$/.test(sourceFile.fileName)) {
            return ts.visitNode(sourceFile, visitor);
        } else {
            return sourceFile;
        }
    }
};

function compile(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit(undefined, undefined, undefined, undefined, {
        before: [analyze, transform]
    });
  
    let allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);
  
    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });
  
    let exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log(`Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}

compile(process.argv.slice(2), {
    noEmitOnError: true,
    noImplicitAny: true,
    jsx: ts.JsxEmit.React,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2018,
    module: ts.ModuleKind.ES2015
});


