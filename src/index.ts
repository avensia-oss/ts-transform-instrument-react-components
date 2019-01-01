import * as ts from 'typescript';

const globalName = '__globalInstrumentationObject';
const definedComponentsName = 'reactInstrumentationDefinedComponents';
const renderedComponentsName = 'reactInstrumentationRenderedComponents';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  if (!program) {
    throw new Error('No ts.Program was passed to the transformer factory');
  }
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitSourceFile(file, program, context);
}

function visitSourceFile(
  sourceFile: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.SourceFile {
  const hasReactImport = !!sourceFile.statements.find(
    s => ts.isImportDeclaration(s) && (s.moduleSpecifier as ts.StringLiteral).text === 'react',
  );

  if (hasReactImport && sourceFile.fileName.indexOf('.d.ts') === -1) {
    const exportedComponentNames = findExportedReactComponentNames(sourceFile, program.getTypeChecker());

    if (exportedComponentNames.length) {
      const transformedSourceFile = ts.visitEachChild(
        visitNode(sourceFile, exportedComponentNames, sourceFile, program),
        childNode => visitNodeAndChildren(childNode, exportedComponentNames, sourceFile, program, context),
        context,
      );
      return transformedSourceFile;
    }
  }
  return sourceFile;
}

function flatMap<T>(arr: (T | null | undefined | (T | null | undefined)[])[]): T[] {
  const flattened: T[] = [];
  for (const t of arr) {
    if (t) {
      if (Array.isArray(t)) {
        flattened.push(...(t.filter(x => !!x) as T[]));
      } else {
        flattened.push(t);
      }
    }
  }
  return flattened;
}

function visitNodeAndChildren(
  node: ts.Node,
  exportedComponentNames: string[],
  sourceFile: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | ts.Node[];
function visitNodeAndChildren(
  node: ts.Node,
  exportedComponentNames: string[],
  sourceFile: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | ts.Node[] {
  const visitedNode = visitNode(node, exportedComponentNames, sourceFile, program);

  const visitedChildNode = ts.visitEachChild(
    visitedNode,
    childNode => visitNodeAndChildren(childNode, exportedComponentNames, sourceFile, program, context),
    context,
  );
  return visitedChildNode;
}

function findExportedReactComponentNames(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
  const exportedVariables = sourceFile.statements.filter(
    s => ts.isVariableStatement(s) && s.modifiers && s.modifiers.find(m => m.kind === ts.SyntaxKind.ExportKeyword),
  ) as ts.VariableStatement[];
  const exportedFunctions = sourceFile.statements.filter(
    s => ts.isFunctionDeclaration(s) && s.modifiers && s.modifiers.find(m => m.kind === ts.SyntaxKind.ExportKeyword),
  ) as ts.FunctionDeclaration[];

  return [...exportedVariables, ...exportedFunctions]
    .map(s => getExportedComponentName(s, typeChecker))
    .filter(n => !!n) as string[];
}

function getFunction(node: ts.VariableStatement) {
  if (!node.modifiers || !node.modifiers.find(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
    return null;
  }
  const declaration = node.declarationList.declarations[0];
  if (
    declaration.initializer &&
    (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
  ) {
    return declaration.initializer;
  }
  return null;
}

function getExportedComponentName(node: ts.FunctionDeclaration | ts.VariableStatement, typeChecker: ts.TypeChecker) {
  const func = ts.isFunctionDeclaration(node) ? node : getFunction(node);
  const exportedName = ts.isFunctionDeclaration(node)
    ? node.modifiers && !!node.modifiers.find(m => m.kind === ts.SyntaxKind.DefaultKeyword)
      ? 'default'
      : node.name && node.name.text
    : (node.declarationList.declarations[0].name as ts.Identifier).text;

  if (func && exportedName) {
    const type = typeChecker.getTypeAtLocation(node);
    const callSignatures = type.getCallSignatures();
    if (callSignatures.length) {
      const callSignature = callSignatures[0];
      const returnType = typeChecker.getReturnTypeOfSignature(callSignature).getSymbol();

      if (
        // props and context
        (func.parameters.length === 1 || func.parameters.length === 2) &&
        returnType &&
        returnType.escapedName === 'Element'
      ) {
        return exportedName;
      }
    }
  }
  return null;
}

function visitNode(
  node: ts.Node,
  exportedComponentNames: string[],
  sourceFile: ts.SourceFile,
  program: ts.Program,
): any /* TODO */ {
  const typeChecker = program.getTypeChecker();
  const nodes = [node];

  if (node.pos === 0 && node.kind !== ts.SyntaxKind.SourceFile) {
    nodes.unshift(
      ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
          [
            ts.createVariableDeclaration(
              globalName,
              undefined,
              ts.createCall(
                ts.createCall(ts.createIdentifier('Function'), undefined, [ts.createStringLiteral('return this')]),
                undefined,
                undefined,
              ),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
      ts.createAssignment(
        ts.createPropertyAccess(ts.createIdentifier(globalName), definedComponentsName),
        ts.createLogicalOr(
          ts.createPropertyAccess(ts.createIdentifier(globalName), definedComponentsName),
          ts.createObjectLiteral(),
        ),
      ),
      ts.createAssignment(
        ts.createElementAccess(
          ts.createPropertyAccess(ts.createIdentifier(globalName), definedComponentsName),
          ts.createStringLiteral(sourceFile.fileName),
        ),
        ts.createArrayLiteral(exportedComponentNames.map(ts.createStringLiteral)),
      ),
    );
    return nodes;
  }

  let func: ts.FunctionExpression | ts.FunctionDeclaration | ts.ArrowFunction | null = null;
  let exported: ts.VariableStatement | ts.FunctionDeclaration | null = null;

  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    func = node;
    if (ts.isVariableDeclarationList(node.parent) && ts.isVariableStatement(node.parent.parent)) {
      exported = node.parent.parent;
    }
  }

  if (ts.isFunctionDeclaration(node)) {
    func = node;
    exported = node;
  }

  if (func !== null && exported !== null) {
    const exportedComponentName = getExportedComponentName(exported, program.getTypeChecker());

    if (exportedComponentName !== null && func.body) {
      const renderStatements = [
        ts.createStatement(
          ts.createAssignment(
            ts.createPropertyAccess(ts.createIdentifier(globalName), renderedComponentsName),
            ts.createLogicalOr(
              ts.createPropertyAccess(ts.createIdentifier(globalName), renderedComponentsName),
              ts.createObjectLiteral(),
            ),
          ),
        ),
        ts.createStatement(
          ts.createAssignment(
            ts.createElementAccess(
              ts.createPropertyAccess(ts.createIdentifier(globalName), renderedComponentsName),
              ts.createStringLiteral(sourceFile.fileName),
            ),
            ts.createLogicalOr(
              ts.createElementAccess(
                ts.createPropertyAccess(ts.createIdentifier(globalName), renderedComponentsName),
                ts.createStringLiteral(sourceFile.fileName),
              ),
              ts.createArrayLiteral(),
            ),
          ),
        ),
        ts.createStatement(
          ts.createCall(
            ts.createPropertyAccess(
              ts.createElementAccess(
                ts.createPropertyAccess(ts.createIdentifier(globalName), renderedComponentsName),
                ts.createStringLiteral(sourceFile.fileName),
              ),
              ts.createIdentifier('push'),
            ),
            undefined,
            [ts.createStringLiteral(exportedComponentName)],
          ),
        ),
      ];

      if (ts.isFunctionDeclaration(node)) {
        return ts.createFunctionDeclaration(
          node.decorators,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          ts.createBlock([...renderStatements, ...node.body!.statements], true),
        );
      }
    }
  }
  return node;
}