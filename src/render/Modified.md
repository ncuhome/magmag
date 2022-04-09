# Custom Render from Matter.js

## Render Text

From <https://github.com/liabru/matter-js/issues/321#issuecomment-393062469>

Example:

```js
// an example using a circle
Bodies.circle(x, y, circleSize, {
  restitution:0.95,
  friction:0.05,
  density:0.0005,
  render:{
    fillStyle:"#C44D58",
    text:{
    content:"Test",
    color:"blue",
    size:16,
    family:"Papyrus",
    },
  },
});
```
