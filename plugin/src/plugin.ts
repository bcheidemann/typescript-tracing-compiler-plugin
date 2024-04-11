import type * as ts from "typescript";
import type { PluginConfig, TransformerExtras } from "ts-patch";

type Context = {
  extras: TransformerExtras;
  tsContext: ts.TransformationContext;
  program: ts.Program;
};

export default function (
  program: ts.Program,
  _pluginConfig: PluginConfig,
  extras: TransformerExtras,
) {
  removeUnusedLabelDiagnostic(extras);
  return (tsContext: ts.TransformationContext) => {
    return createNodeAndChildrenVisitor(
      defaultVisitNode,
      {
        extras,
        tsContext,
        program,
      },
    );
  };
}

function removeUnusedLabelDiagnostic(
  extras: TransformerExtras,
) {
  let toRemove: number[] = [];
  extras.diagnostics.forEach((diagnostic, index) => {
    if (diagnostic.code === 1344) {
      toRemove.push(index);
    }
  });
  toRemove.reverse().forEach((index) => {
    extras.removeDiagnostic(index);
  });
}

function createNodeAndChildrenVisitor(
  visitor: (node: ts.Node, ctx: Context) => ts.Node,
  ctx: Context,
) {
  return (node: ts.Node) => {
    return visitNodeAndChildren(
      node,
      visitor,
      ctx,
    );
  };
}

function visitNodeAndChildren(
  node: ts.Node,
  visitor: (node: ts.Node, ctx: Context) => ts.Node,
  ctx: Context,
): ts.Node {
  return ctx.extras.ts.visitEachChild(
    visitor(node, ctx),
    (childNode) => visitNodeAndChildren(childNode, visitor, ctx),
    ctx.tsContext,
  );
}

function defaultVisitNode(node: ts.Node, ctx: Context) {
  if (ctx.extras.ts.isLabeledStatement(node)) {
    return labeledStatementVisitor(node, ctx);
  }
  return node;
}

function labeledStatementVisitor(
  node: ts.LabeledStatement,
  ctx: Context,
) {
  if (ctx.extras.ts.isFunctionDeclaration(node.statement)) {
    return labeledFunctionDeclarationVisitor(node.statement, ctx);
  }
  return node;
}

function labeledFunctionDeclarationVisitor(
  node: ts.FunctionDeclaration,
  ctx: Context,
) {
  if (!node.body) {
    return node;
  }
  const functionName = node.name?.getText();
  const parameters = getParameterNames(node.parameters, ctx);
  ctx.extras.ts.addSyntheticLeadingComment(
    node,
    ctx.extras.ts.SyntaxKind.MultiLineCommentTrivia,
    "instrument:",
  );
  return ctx.extras.ts.visitEachChild(
    node,
    (childNode) =>
      visitLabeledFunctionBody(childNode, ctx, functionName, parameters),
    ctx.tsContext,
  );
}

function getParameterNames(
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  ctx: Context,
) {
  return parameters
    .map((parameter) => parameter.name)
    .filter(ctx.extras.ts.isIdentifier);
}

function visitLabeledFunctionBody(
  node: ts.Node,
  ctx: Context,
  functionName: string | undefined,
  parameters: ts.Identifier[],
) {
  if (!ctx.extras.ts.isBlock(node)) {
    return node;
  }

  return ctx.extras.ts.factory.createBlock([
    ctx.extras.ts.factory.createExpressionStatement(
      ctx.extras.ts.factory.createCallExpression(
        ctx.extras.ts.factory.createPropertyAccessExpression(
          ctx.extras.ts.factory.createIdentifier("console"),
          ctx.extras.ts.factory.createIdentifier("log"),
        ),
        undefined,
        [
          ctx.extras.ts.factory.createCallExpression(
            ctx.extras.ts.factory.createPropertyAccessExpression(
              ctx.extras.ts.factory.createIdentifier("JSON"),
              ctx.extras.ts.factory.createIdentifier("stringify"),
            ),
            undefined,
            [
              ctx.extras.ts.factory.createObjectLiteralExpression(
                [
                  ctx.extras.ts.factory.createPropertyAssignment(
                    ctx.extras.ts.factory.createIdentifier("severity"),
                    ctx.extras.ts.factory.createStringLiteral(
                      "TRACE",
                    ),
                  ),
                  ctx.extras.ts.factory.createPropertyAssignment(
                    ctx.extras.ts.factory.createIdentifier("message"),
                    ctx.extras.ts.factory.createStringLiteral(
                      "Entering function",
                    ),
                  ),
                  ctx.extras.ts.factory.createPropertyAssignment(
                    ctx.extras.ts.factory.createIdentifier("functionName"),
                    functionName
                      ? ctx.extras.ts.factory.createStringLiteral(functionName)
                      : ctx.extras.ts.factory.createNull(),
                  ),
                  ctx.extras.ts.factory.createPropertyAssignment(
                    ctx.extras.ts.factory.createIdentifier("arguments"),
                    ctx.extras.ts.factory.createObjectLiteralExpression(
                      parameters.map(
                        (identifier) =>
                          ctx.extras.ts.factory
                            .createShorthandPropertyAssignment(identifier),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ),
    node,
  ]);
}
