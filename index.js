const {
  createDomain,
  createEvent,
  createStore,
  forward,
  sample,
} = require("effector");

const app = createDomain("app", { name: "app", sid: "d-1" });

const x100 = app.createEffect({
  name: "x100",
  sid: "f-1",
  handler: async (p) => p * 100,
});
const add = app.createEvent({ name: "add", sid: "e-1" });
const sub = app.createEvent({ name: "sub", sid: "e-2" });
const reset = app.createEvent({ name: "reset", sid: "e-3" });
const send = app.createEvent({ name: "send", sid: "e-4" });

const another = createStore(0, { name: "another", sid: "s-1" });

const counter = app
  .createStore(0, { name: "counter", sid: "s-2" })
  .on(add, (count, num) => count + num)
  .on(sub, (count, num) => count - num)
  .reset(reset);

forward({ from: counter, to: another });

sample({ source: counter, clock: send, target: x100 });

counter.watch((n) => console.log("counter: ", n));
// counter: 0
add.watch(() => console.log("add"));
sub.watch(() => console.log("subtract"));
reset.watch(() => console.log("reset counter"));

// =========================================================================== //

const nodes = new Map();
const domains = new Set();
const events = new Set();
const stores = new Set();
const effects = new Set();

function visitNodes(node) {
  const toVisit = [];

  function addNode(node) {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
      toVisit.push(node);

      if (node.family.type === "domain") domains.add(node);

      if (node.family.type === "regular") {
        if (node.meta.unit === "event") events.add(node);
        if (node.meta.unit === "store") stores.add(node);
        if (node.meta.unit === "effect") effects.add(node);
      }
    }
  }

  const current = node.graphite ? node.graphite : node;
  if (!current) {
    console.log(node);
    process.exit(-1);
  }

  current.next.forEach(addNode);
  current.family.links.forEach(addNode);
  current.family.owners.forEach(addNode);
  toVisit.forEach((node) => visitNodes(node));
}

visitNodes(app);
console.log(Object.fromEntries(nodes.entries()));
console.log(nodes.size);
// console.log("[domains] >>", Array.from(domains));
// console.log("[events] >>", Array.from(events));
// console.log("[stores] >>", Array.from(stores));
console.log("[effects] >>", Array.from(effects));

const printed = new Map();

function print(node) {
  const printer = getNodePrinter(node);
  // console.log(node.meta.name, node.family.type);
  // if (printed.has(node.id)) return;
  if (node.meta.named) return;

  printed.set(node.id, node);
  printer(node, ({ next }) => {
    next.forEach((e) => {
      print(e);
    });
  });
}

function getNodePrinter(node) {
  if (node.meta.unit) return printUnit;
  if (node.meta.op) return printOperator;

  return (node, cb) => cb(node);
}

function printOperator(node, cb) {
  console.group(`(${node.meta.op})`); //, node.meta, node.scope);
  cb(node);
  console.groupEnd();
}

function printUnit(node, cb) {
  const ext = {
    sid: node.meta.sid,
    named: node.meta.named,
  };
  console.group(`[${node.meta.unit}]`, node.meta.name); //, ext);
  cb(node);
  console.groupEnd();
}

Array.from(stores).forEach(print);
Array.from(events).forEach(print);
Array.from(effects).forEach(print);

debugger;

// console.log(counter.graphite);
// // console.log("next", counter.graphite.next);
// // console.log("family.links", counter.graphite.family.links);
// // console.log("family.owners", counter.graphite.family.owners);
// counter.graphite.next.forEach((e) =>
//   console.log(">> next", e, e.family.owners)
// );
// console.log("another.id", another.graphite.id);
