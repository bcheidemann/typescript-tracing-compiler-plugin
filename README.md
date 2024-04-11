# TypeScript Tracing Compiler Plugin

## Example input

```ts
instrument: function add(a: number, b: number) {
  return a + b;
}
```

## Example output

```js
/*instrument:*/ function add(a, b) {
  console.log(
    JSON.stringify({
      severity: "TRACE",
      message: "Entering function",
      functionName: "add",
      arguments: { a, b },
    }),
  );
  {
    return a + b;
  }
}
```

## Running the example

```sh
$ npm run build -w example
$ npm start -w example
{"severity":"TRACE","message":"Entering function","functionName":"add","arguments":{"a":1,"b":2}}
```
