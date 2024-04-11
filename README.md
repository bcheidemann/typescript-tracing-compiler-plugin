# TypeScript Tracing Compiler Plugin

## Example input

```ts
instrument: function log(timestamp: string, message: string) {
  console.log(timestamp, message);
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
