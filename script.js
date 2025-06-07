const canvas =document.getElementById("graphCanvas");  
const ctx =canvas.getContext("2d");                    


let nodes=[];        // object { x, y, id }
let edges=[];        // Each edge as a tuple [fromNodeId, toNodeId]
let selected=[];     // this is the temporary array for selecting two nodes to form an edge
const radius=20;     

//click to get the node
canvas.addEventListener("click",(e) =>{
  const x= e.offsetX;  
  const y= e.offsetY;  

  
  for (const node of nodes) {
    const dist = Math.sqrt((node.x - x)**2 + (node.y - y)** 2);
    if (dist <radius) return;
  }

  
  nodes.push({x, y,id: nodes.length.toString()});

  drawGraph();
});


canvas.addEventListener("mousedown", (e) =>{
  const x = e.offsetX;
  const y = e.offsetY;

  
  for (const node of nodes){
    const dist = Math.sqrt((node.x - x) ** 2 + (node.y -y) ** 2);
    if (dist < radius) {
      if (selected.length === 0) {
        selected.push(node);  
      } else if (selected.length === 1 && node.id !== selected[0].id) {
        edges.push([selected[0].id, node.id]);  // here we create edge from first to second
        selected = [];
      }
      drawGraph();
      return;
    }
  }
});

//the superimportant fn to draw the graph with nodes and edges and required parameters goes here
function drawGraph(colors = {}, visitedTime = {}, finishedTime = {}) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // to draw edge
  for (const [a, b] of edges) {
    const na = nodes.find(n => n.id === a);  
    const nb = nodes.find(n => n.id === b);  
    drawArrow(na.x,na.y,nb.x,nb.y);      
  }

  const labelYOffset = 35; 

  // draw nodes
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI); 

    if (colors[node.id]) {
      ctx.fillStyle = colors[node.id];  // orange or green
    } else if (selected.some(n => n.id === node.id)) {
      ctx.fillStyle = "blue";
    } else {
      ctx.fillStyle = "lightgray";
    }

    ctx.fill();
    ctx.stroke(); 

    //node id label
    ctx.fillStyle = "black";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(node.id, node.x - 5, node.y + 5);

    //DFS timestamps
    const start = visitedTime[node.id];
    const finish = finishedTime[node.id];
    if (start !== undefined && finish !== undefined) {
      ctx.fillStyle = "red";
      ctx.font = "10px sans-serif";
      ctx.fillText(`(${start}, ${finish})`, node.x - radius, node.y + labelYOffset);
    }
  }
}

//fn to draw arrows
function drawArrow(x1, y1, x2, y2) {
  const headlen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  
  const tx = x2 - radius * Math.cos(angle);
  const ty = y2 - radius * Math.sin(angle);

  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  //only for a.head
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - headlen * Math.cos(angle - Math.PI / 6),
             ty - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tx - headlen * Math.cos(angle + Math.PI / 6),
             ty - headlen * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(tx, ty);
  ctx.fill();
}


// Build adjacency list from edges
// Optionally reverse edges (for Kosaraju)

function getAdjList(reversed = false) {
  const adj = {};
  for (const node of nodes) adj[node.id] = [];

  for (const [a, b] of edges) {
    if (!reversed) {
      adj[a].push(b);  // Normal direction
    } else {
      adj[b].push(a);  // Transposed direction
    }
  }

  return adj;
}


//this is a delay function for animation timing
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve,ms));
}


// -----DFS-----
async function DFS() {
  const start = document.getElementById("startNode").value;
  const visited = {};
  const adj = getAdjList();  // Adjacency list

  const visitedTime = {};    // Discovery times
  const finishedTime = {};   // Finishing times
  let time = 0;

  // Recursive DFS helper function
  async function dfsVisit(u) {
    time++;
    visitedTime[u] = time;  // Record discovery time
    visited[u] = "orange";  // Mark node as being explored
    drawGraph(visited, visitedTime, finishedTime);
    await sleep(500);

    for (const v of adj[u]) {
      if (!visited[v]) await dfsVisit(v);
    }

    time++;
    finishedTime[u] = time;  // Record finishing time
    visited[u] = "green";    // Node fully explored
    drawGraph(visited, visitedTime, finishedTime);
    await sleep(300);
  }

  // Start DFS at selected node
  if (adj[start]) {
    await dfsVisit(start);
  }

  // Visit remaining disconnected nodes
  for (const node of nodes) {
    if (!visited[node.id]) {
      await dfsVisit(node.id);
    }
  }

  console.log("Visited Times:", visitedTime);
  console.log("Finished Times:", finishedTime);
}


//----BFS----
async function BFS() {
  const start = document.getElementById("startNode").value;
  const visited = {};
  const adj = getAdjList();

  // BFS from one component
  async function bfs(u) {
    const queue = [u];
    visited[u] = "orange";  // Discovered
    drawGraph(visited);
    await sleep(500);

    while (queue.length) {
      const curr = queue.shift();
      visited[curr] = "green";  // Finished
      drawGraph(visited);
      await sleep(500);

      for (const neighbor of adj[curr]) {
        if (!visited[neighbor]) {
          visited[neighbor] = "orange";
          queue.push(neighbor);
        }
      }
    }
  }

  if (adj[start]) {
    await bfs(start);
  }

  // Run BFS for disconnected parts of graph
  for (const node of nodes) {
    if (!visited[node.id]) {
      await bfs(node.id);
    }
  }

  drawGraph(visited);
}


// -----Kosaraju’s Algorithm for Strongly Connected Components-----

async function runKosaraju() {
  const stack = [];             // Finishing order stack
  const visited = {};           // Track visited in first pass
  const adj = getAdjList();     // Original graph

  // First pass: order vertices by finish time
  async function fillOrder(u) {
    visited[u] = true;
    for (const v of adj[u]) {
      if (!visited[v]) await fillOrder(v);
    }
    stack.push(u);  // Record finish
  }

  for (const node of nodes) {
    if (!visited[node.id]) await fillOrder(node.id);
  }

  const transpose = getAdjList(true); // Transposed graph (by putting reversed=true in adjlist)
  const componentColors = {};         // Final color per SCC
  const colors = ["#ff9999", "#99ff99", "#9999ff", "#ffcc99", "#cccccc", "#ff99cc", "#66ccff"];
  let colorIndex = 0;
  const visitedT = {};                // to track visited in second pass

  // Second pass: DFS on transposed graph, using finish order
  async function dfsT(u, color) {
    visitedT[u] = true;
    componentColors[u] = colors[color % colors.length];
    drawGraph(componentColors);
    await sleep(500);

    for (const v of transpose[u]) {
      if (!visitedT[v]) await dfsT(v, color);
    }
  }

  // Process all nodes by finishing order
  while (stack.length) {
    const node = stack.pop();
    if (!visitedT[node]) {
      await dfsT(node, colorIndex);  // Assign new color to SCC
      colorIndex++;
    }
  }
}


// Reset-Clear everything and redraw
function resetGraph() {
  nodes = [];
  edges = [];
  selected = [];
  drawGraph();
}
